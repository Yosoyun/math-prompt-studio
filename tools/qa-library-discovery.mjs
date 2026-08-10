#!/usr/bin/env node
/**
 * Read-only regression QA for the prompt-library discovery renderer.
 *
 * This gate protects the contract that discovery shelves only reserve cards
 * they actually display. It also proves that progressive rendering can reach
 * every unique catalog prompt, including records beyond shelf caps.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_TOTAL = 961;
const INITIAL_LIMIT = 60;
const errors = [];
let assertions = 0;

function check(condition, message) {
  assertions += 1;
  if (!condition) errors.push(message);
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function parseCatalog(source) {
  const marker = 'window.PROMPT_CATALOG =';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('window.PROMPT_CATALOG assignment missing');
  const payloadStart = source.indexOf('{', start + marker.length);
  const payloadEnd = source.lastIndexOf('};');
  if (payloadStart < 0 || payloadEnd < payloadStart) throw new Error('catalog JSON payload is not balanced');
  return JSON.parse(source.slice(payloadStart, payloadEnd + 1));
}

function uniqueSlugs(prompts) {
  return new Set(prompts.map(prompt => prompt.slug));
}

/**
 * Select at most `max` unique cards without reserving unshown candidates.
 * `used` represents cards already displayed by earlier shelves.
 */
function selectShelf(items, max, used) {
  const selected = [];
  const selectedHere = new Set();
  for (const prompt of items) {
    if (!prompt || !prompt.slug || used.has(prompt.slug) || selectedHere.has(prompt.slug)) continue;
    selected.push(prompt);
    selectedHere.add(prompt.slug);
    if (selected.length === max) break;
  }
  selected.forEach(prompt => used.add(prompt.slug));
  return selected;
}

/** Exact historical failure, retained only to prove the fixtures detect it. */
function preSliceBug(items, max, used) {
  return items.filter(prompt => {
    if (!prompt || used.has(prompt.slug)) return false;
    used.add(prompt.slug);
    return true;
  }).slice(0, max);
}

function makePrompts(prefix, count) {
  return Array.from({ length: count }, (_, index) => ({ slug: `${prefix}-${index}` }));
}

function runShelfFixture(label, count, max) {
  const candidates = makePrompts(label, count);
  const used = new Set();
  const shown = selectShelf(candidates, max, used);
  check(shown.length === max, `${label}: expected ${max} shown, found ${shown.length}`);
  check(used.size === shown.length, `${label}: used set reserved unshown candidates`);
  check(candidates.slice(max).every(prompt => !used.has(prompt.slug)), `${label}: candidates beyond the shelf cap were reserved`);
}

runShelfFixture('fresh', 10, 6);
runShelfFixture('saved', 7, 4);
runShelfFixture('recent', 8, 4);

// Duplicate records within one shelf must not consume multiple slots.
{
  const candidates = makePrompts('duplicate', 5);
  const used = new Set();
  const shown = selectShelf([
    candidates[0], candidates[0], candidates[1], candidates[1], candidates[2], candidates[3], candidates[4],
  ], 4, used);
  check(shown.length === 4, `duplicates: expected 4 unique cards, found ${shown.length}`);
  check(uniqueSlugs(shown).size === shown.length, 'duplicates: one slug appeared more than once in a shelf');
  check(same(shown.map(prompt => prompt.slug), candidates.slice(0, 4).map(prompt => prompt.slug)), 'duplicates: selection order changed');
  check(used.size === shown.length, 'duplicates: used set does not equal displayed unique cards');
}

// Duplicate candidates across shelves must be skipped and replaced, not shown twice.
{
  const candidates = makePrompts('cross-shelf', 12);
  const used = new Set();
  const daily = selectShelf([candidates[0]], 1, used);
  const saved = selectShelf([candidates[0], candidates[1], candidates[2], candidates[3], candidates[4], candidates[5]], 4, used);
  const recent = selectShelf([candidates[1], candidates[4], candidates[5], candidates[6], candidates[7], candidates[8]], 4, used);
  const shown = [...daily, ...saved, ...recent];
  check(shown.length === 9, `cross-shelf duplicates: expected 9 displayed cards, found ${shown.length}`);
  check(uniqueSlugs(shown).size === shown.length, 'cross-shelf duplicates: a slug was displayed in more than one shelf');
  check(used.size === shown.length, 'cross-shelf duplicates: used set contains an unshown slug');
}

// Demonstrate that the regression fixture distinguishes the historical bug.
{
  const candidates = makePrompts('bad-fixture', 10);
  const used = new Set();
  const shown = preSliceBug(candidates, 6, used);
  check(shown.length === 6 && used.size === 10, 'pre-slice fixture no longer exposes the historical used-set bug');
}

const catalogSource = readFileSync(resolve(ROOT, 'data/catalog.js'), 'utf8');
const catalog = parseCatalog(catalogSource);
const prompts = (catalog.categories || []).flatMap(category => (category.prompts || []).map(prompt => ({
  ...prompt,
  _category: category.category,
})));
const catalogSlugs = uniqueSlugs(prompts);

check(catalog.total === EXPECTED_TOTAL, `catalog declares ${catalog.total}; expected ${EXPECTED_TOTAL}`);
check(prompts.length === EXPECTED_TOTAL, `catalog contains ${prompts.length} prompt records; expected ${EXPECTED_TOTAL}`);
check(catalogSlugs.size === EXPECTED_TOTAL, `catalog has ${catalogSlugs.size} unique slugs; expected ${EXPECTED_TOTAL}`);
check(prompts.every(prompt => typeof prompt.slug === 'string' && prompt.slug), 'catalog contains a prompt without a slug');

const featured = prompts.filter(prompt => prompt.featured);
const fresh = prompts.filter(prompt => prompt.added);
check(featured.length > 6, `production fixture requires featured > 6, found ${featured.length}`);
check(fresh.length > 6, `production fixture requires fresh > 6, found ${fresh.length}`);

function buildDiscovery({ saved = [], recent = [] } = {}) {
  const used = new Set();
  const rows = [];
  const add = (name, items, max) => {
    const selected = selectShelf(items, max, used);
    rows.push({ name, selected });
  };
  add('daily', [prompts[0]], 1);
  add('saved', saved, 4);
  add('recent', recent, 4);
  add('featured', featured, 6);
  add('fresh', fresh, 6);
  return { rows, used, displayed: rows.flatMap(row => row.selected) };
}

function validateProgressiveReachability(discovery, label) {
  const ordinary = prompts.filter(prompt => !discovery.used.has(prompt.slug));
  const ordinaryBudget = Math.max(0, INITIAL_LIMIT - discovery.displayed.length);
  const initialOrdinary = ordinary.slice(0, ordinaryBudget);
  const initial = [...discovery.displayed, ...initialOrdinary];
  check(initial.length === Math.min(INITIAL_LIMIT, prompts.length), `${label}: initial accounting showed ${initial.length}, expected ${INITIAL_LIMIT}`);
  check(uniqueSlugs(initial).size === initial.length, `${label}: initial discovery + ordinary cards contain duplicate slugs`);
  check(discovery.used.size === discovery.displayed.length, `${label}: discovery used set contains unshown records`);

  let visibleOrdinary = [];
  for (let renderLimit = INITIAL_LIMIT; renderLimit < prompts.length + INITIAL_LIMIT; renderLimit += INITIAL_LIMIT) {
    const budget = Math.max(0, renderLimit - discovery.displayed.length);
    visibleOrdinary = ordinary.slice(0, budget);
  }
  const final = [...discovery.displayed, ...visibleOrdinary];
  const finalSlugs = uniqueSlugs(final);
  check(final.length === EXPECTED_TOTAL, `${label}: progressive rendering reached ${final.length}/${EXPECTED_TOTAL} cards`);
  check(finalSlugs.size === EXPECTED_TOTAL, `${label}: progressive rendering reached ${finalSlugs.size}/${EXPECTED_TOTAL} unique slugs`);
  check([...catalogSlugs].every(slug => finalSlugs.has(slug)), `${label}: progressive slug union does not equal the catalog slug union`);
  check(ordinary.length - visibleOrdinary.length === 0, `${label}: progressive rendering left ordinary cards hidden`);
  return { discovery: discovery.displayed.length, initialOrdinary: initialOrdinary.length, initial: initial.length, final: finalSlugs.size };
}

const defaultSummary = validateProgressiveReachability(buildDiscovery(), 'default');

// Production-scale saved/recent lists, deliberately overlapping each other and
// the featured/fresh shelves, exercise caps and replacement behavior together.
const overlapSaved = [prompts[0], ...featured.slice(0, 4), ...fresh.slice(0, 4), ...prompts.slice(100, 106)];
const overlapRecent = [...overlapSaved.slice(0, 5), ...featured.slice(2, 9), ...fresh.slice(2, 9), ...prompts.slice(200, 208)];
const populatedSummary = validateProgressiveReachability(buildDiscovery({ saved: overlapSaved, recent: overlapRecent }), 'saved/recent populated');

// Static guard against the exact source-level regression: mutating `used`
// inside items.filter(...) before the shelf cap is sliced.
const appSource = readFileSync(resolve(ROOT, 'app.js'), 'utf8');
const discoveryStart = appSource.indexOf('function discoveryHTML');
const renderStart = appSource.indexOf('function render', discoveryStart);
check(discoveryStart >= 0 && renderStart > discoveryStart, 'app.js discoveryHTML/render functions could not be located');
if (discoveryStart >= 0 && renderStart > discoveryStart) {
  const discoverySource = appSource.slice(discoveryStart, renderStart);
  const historicalPattern = /items\s*\.\s*filter\s*\(\s*function\s*\([^)]*\)\s*\{[\s\S]{0,800}?used\s*\.\s*add\s*\([\s\S]{0,300}?\}\s*\)\s*\.\s*slice\s*\(/;
  check(!historicalPattern.test(discoverySource), 'app.js still mutates the discovery used set before applying the shelf slice cap');

  const rowStart = discoverySource.indexOf('function row');
  const rowEnd = discoverySource.indexOf("row('&#9728", rowStart);
  if (rowStart >= 0 && rowEnd > rowStart) {
    const rowSource = discoverySource.slice(rowStart, rowEnd);
    const sliceIndex = rowSource.indexOf('.slice');
    const addIndex = rowSource.indexOf('used.add');
    check(sliceIndex >= 0, 'app.js discovery row no longer exposes a shelf slice cap for regression review');
    check(addIndex >= 0, 'app.js discovery row no longer records displayed slugs in the used set');
    if (sliceIndex >= 0 && addIndex >= 0) check(sliceIndex < addIndex, 'app.js discovery row records used slugs before slicing the displayed shelf');
  }
}

const report = {
  ok: errors.length === 0,
  assertions,
  catalog: { declared: catalog.total, records: prompts.length, uniqueSlugs: catalogSlugs.size },
  production: { featured: featured.length, fresh: fresh.length, default: defaultSummary, populated: populatedSummary },
  errors,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (errors.length) process.exitCode = 1;
