#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_FILE = resolve(ROOT, 'data/surprise-pools.json');
const SOURCE_FILE = resolve(ROOT, 'data/prompts.js');
const CATALOG_FILE = resolve(ROOT, 'data/catalog.js');
const CONTRACT_FILE = resolve(ROOT, '_handoff/tool-link-contract.txt');
const SOURCE_MARKER = 'window.PROMPT_DATA =';

const EXPECTED_SCHEMA_VERSION = 1;
const EXPECTED_SECTION_COUNT = 8;
const MIN_SECTION_SIZE = 6;
const MIN_BODY_CHARS = 2400;
const MIN_NONEMPTY_LINES = 20;
const MIN_DISTINCT_PLACEHOLDERS = 2;
const MIN_ORDERED_STEPS = 4;
const MIN_STRUCTURE_SIGNALS = 3;
const EXAMS = new Set(['any', 'boards', 'jee-main', 'jee-advanced', 'olympiad', 'foundation']);
const AUDIENCES = new Set(['teacher', 'student', 'both']);
const FORMATS = new Set(['pdf-print', 'doc', 'ppt', 'image', 'links', 'interactive', 'text']);
const REQUIRED_FIELDS = ['title', 'whatYouGet', 'howToUse', 'commonFix', 'promptText'];
const PRINT_DIGEST = process.argv.includes('--print-digest');
const UNKNOWN_ARGS = process.argv.slice(2).filter(value => value !== '--print-digest');

const errors = [];
function error(message) { errors.push(message); }
function isObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

function readJson(file, label) {
  try { return JSON.parse(readFileSync(file, 'utf8')); }
  catch (cause) { throw new Error(`${label} is not valid JSON: ${cause.message}`); }
}

function parsePromptData(source) {
  const start = source.indexOf(SOURCE_MARKER);
  const end = source.lastIndexOf(';');
  if (start < 0 || end <= start) throw new Error('data/prompts.js does not contain the expected PROMPT_DATA assignment');
  return JSON.parse(source.slice(start + SOURCE_MARKER.length, end));
}

function parseCatalog(source) {
  const context = { window: {} };
  createContext(context);
  runInContext(source, context, { filename: CATALOG_FILE, timeout: 1000 });
  if (!context.window.PROMPT_CATALOG) throw new Error('data/catalog.js did not initialise PROMPT_CATALOG');
  return context.window.PROMPT_CATALOG;
}

function flatten(data) {
  return (data.categories || []).flatMap(category => (category.prompts || []).map(prompt => ({
    ...prompt,
    _category: category.category,
    _group: category.group,
  })));
}

function indexUnique(prompts, label) {
  const index = new Map();
  for (const prompt of prompts) {
    if (!prompt.slug) { error(`${label} contains a prompt without a slug`); continue; }
    if (index.has(prompt.slug)) error(`${label} contains duplicate slug: ${prompt.slug}`);
    else index.set(prompt.slug, prompt);
  }
  return index;
}

function stripFrozenContract(prompt, contract) {
  const text = prompt.promptText || '';
  const marker = '=== TOOL-LINK OUTPUT CONTRACT';
  if (text.endsWith(contract)) return text.slice(0, -contract.length).trimEnd();
  if (text.includes(marker)) error(`${prompt.slug}: tool-link contract is present but is not the exact frozen suffix`);
  return text;
}

function placeholderTokens(text) { return text.match(/\[[^\]\n]+\]/g) || []; }
function placeholderSet(text) {
  return new Set(placeholderTokens(text));
}

function validateSourceMetadata(prompt) {
  const prefix = prompt.slug || '(missing slug)';
  for (const field of REQUIRED_FIELDS) {
    if (typeof prompt[field] !== 'string' || !prompt[field].trim()) error(`${prefix}: source field ${field} is missing`);
  }
  if (!Array.isArray(prompt.effectiveUsage) || !prompt.effectiveUsage.length || prompt.effectiveUsage.some(value => typeof value !== 'string' || !value.trim())) {
    error(`${prefix}: effectiveUsage must be a non-empty string array`);
  }
  if (!Array.isArray(prompt.exams) || !prompt.exams.length) error(`${prefix}: exams must be a non-empty array`);
  else {
    if (new Set(prompt.exams).size !== prompt.exams.length) error(`${prefix}: exams contains duplicates`);
    for (const exam of prompt.exams) if (!EXAMS.has(exam)) error(`${prefix}: unsupported exam facet ${JSON.stringify(exam)}`);
  }
  if (!AUDIENCES.has(prompt.aud)) error(`${prefix}: unsupported audience facet ${JSON.stringify(prompt.aud)}`);
  if (!FORMATS.has(prompt.fmt)) error(`${prefix}: unsupported format facet ${JSON.stringify(prompt.fmt)}`);
}

function validateCatalogParity(sourcePrompt, catalogPrompt) {
  const slug = sourcePrompt.slug;
  if (!catalogPrompt) { error(`${slug}: missing from data/catalog.js`); return; }
  for (const field of ['title', 'whatYouGet', 'aud', 'fmt']) {
    if (!same(sourcePrompt[field], catalogPrompt[field])) error(`${slug}: catalog ${field} differs from source`);
  }
  if (!same(sourcePrompt.exams, catalogPrompt.exams)) error(`${slug}: catalog exams differ from source`);
  if (sourcePrompt._category !== catalogPrompt._category) error(`${slug}: catalog category differs from source`);
  if (sourcePrompt._group !== catalogPrompt._group) error(`${slug}: catalog group differs from source`);
}

function validateLiveLanguages(prompt, languageStatus) {
  for (const [code, status] of Object.entries(languageStatus || {})) {
    if (code === 'en' || !status || !status.live) continue;
    const translation = prompt[code];
    if (!isObject(translation)) { error(`${prompt.slug}: missing complete ${code} translation while that language is live`); continue; }
    for (const field of REQUIRED_FIELDS) {
      if (typeof translation[field] !== 'string' || !translation[field].trim()) error(`${prompt.slug}: live ${code}.${field} is missing`);
    }
    if (!Array.isArray(translation.effectiveUsage) || translation.effectiveUsage.length !== prompt.effectiveUsage.length) {
      error(`${prompt.slug}: live ${code}.effectiveUsage does not match source length`);
    }
    for (const field of REQUIRED_FIELDS) {
      if (!same(placeholderTokens(prompt[field] || '').sort(), placeholderTokens(translation[field] || '').sort())) {
        error(`${prompt.slug}: live ${code}.${field} placeholder parity failed`);
      }
    }
  }
}

function validateRichness(prompt, contract) {
  const body = stripFrozenContract(prompt, contract);
  const lines = body.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const placeholders = placeholderSet(body);
  const orderedSteps = lines.filter(line => /^(?:\d+[.)]\s+|PHASE\s+\d+\b|STEP\s+\d+\b)/i.test(line)).length;
  const structureSignals = lines.filter(line =>
    /^(?:ROLE|CONTEXT|INPUTS?|INPUT|TASK|YOUR TASK|DO THIS|HOW TO WORK IT OUT|OUTPUT FORMAT|RULES|PHASE(?: SEQUENCE|\s+\d+)?|EDGE CASES|SOURCE-BOUND TOOL FACTS|STEP\s+\d+)(?::|\s*$|\s+[—-])/i.test(line)
    || /^[A-Z][A-Z0-9 &/+()'’.-]{2,}(?::.*)?$/.test(line)
  ).length;
  const qualitySignals = body.match(/\b(?:verify|verification|check|audit|rubric|answer key|misconception|human review|parity|privacy|proof|validate|quality control|self-check|test)\b/gi) || [];
  const distinctiveSignals = body.match(/(?:independent check|different method|proof critic|solve-and-prove|decision table|geometry figure|prerequisite gap|diagnos|misconception|error pattern|mastery tutor|mini-lesson|bite-size daily|catch-up plan|blueprint|scaffold|differentiat|DPP|cross-platform|ready-to-run formats|dual-lane|pattern paper architect|simulation|unit circle|predict before|treasure hunt|cricket|codebreaker|practice variants|PYQ-style drill|multi-correct|hint ladder|motif bank|expected-value coach|re-teach priorities|exception queue|anonymised class error|mastery heatmap|forms results|handwritten|solution poster|overleaf|speaker notes|storyboard|notation lock|textbook chapter|common mistakes|stepwise tutor|socratic proof|bilingual doubt|translate a complete paper|low-vision|screen-reader)/gi) || [];

  if ([...body].length < MIN_BODY_CHARS) error(`${prompt.slug}: curated body has ${[...body].length} characters; minimum is ${MIN_BODY_CHARS} after removing the frozen contract`);
  if (lines.length < MIN_NONEMPTY_LINES) error(`${prompt.slug}: curated body has ${lines.length} non-empty lines; minimum is ${MIN_NONEMPTY_LINES}`);
  if (placeholders.size < MIN_DISTINCT_PLACEHOLDERS) error(`${prompt.slug}: curated body has ${placeholders.size} distinct placeholders; minimum is ${MIN_DISTINCT_PLACEHOLDERS}`);
  if (orderedSteps < MIN_ORDERED_STEPS) error(`${prompt.slug}: curated body has ${orderedSteps} ordered steps/phases; minimum is ${MIN_ORDERED_STEPS}`);
  if (structureSignals < MIN_STRUCTURE_SIGNALS) error(`${prompt.slug}: curated body has ${structureSignals} structural signals; minimum is ${MIN_STRUCTURE_SIGNALS}`);
  if (!qualitySignals.length) error(`${prompt.slug}: curated body lacks a genuine checking/audit/quality-control signal`);
  if (!distinctiveSignals.length) error(`${prompt.slug}: curated body lacks a distinctive pedagogical or production mechanism`);
  if (/latest exam pattern/i.test(`${prompt.title}\n${body}`)) error(`${prompt.slug}: forbidden unsourced “latest exam pattern” claim`);
  if (/verified\s*[✓✔]/i.test(body)) error(`${prompt.slug}: forbidden verification-theater mark`);
}

function reviewDigest(sections, sourceBySlug) {
  const records = sections.flatMap(section => section.slugs.map(slug => {
    const prompt = sourceBySlug.get(slug);
    if (!prompt) return { section: section.id, slug, missing: true };
    return {
      section: section.id,
      slug,
      title: prompt.title,
      tag: prompt.tag,
      whatYouGet: prompt.whatYouGet,
      bestTool: prompt.bestTool,
      worksOnFree: prompt.worksOnFree,
      howToUse: prompt.howToUse,
      effectiveUsage: prompt.effectiveUsage,
      commonFix: prompt.commonFix,
      promptText: prompt.promptText,
      exams: prompt.exams,
      aud: prompt.aud,
      fmt: prompt.fmt,
      featured: !!prompt.featured,
      added: prompt.added || null,
    };
  }));
  return `sha256:${createHash('sha256').update(JSON.stringify(records)).digest('hex')}`;
}

function validateManifest(manifest) {
  if (!isObject(manifest)) { error('manifest root must be an object'); return []; }
  if (manifest.schemaVersion !== EXPECTED_SCHEMA_VERSION) error(`schemaVersion must be ${EXPECTED_SCHEMA_VERSION}`);
  if (typeof manifest.reviewedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(manifest.reviewedAt)) error('reviewedAt must be YYYY-MM-DD');
  if (!PRINT_DIGEST && !/^sha256:[a-f0-9]{64}$/.test(manifest.reviewDigest || '')) error('reviewDigest must be a sha256 digest');
  if (!Array.isArray(manifest.sections)) { error('sections must be an array'); return []; }
  if (manifest.sections.length !== EXPECTED_SECTION_COUNT) error(`manifest must contain exactly ${EXPECTED_SECTION_COUNT} sections`);

  const sectionIds = new Set();
  const curatedSlugs = new Set();
  for (const [index, section] of manifest.sections.entries()) {
    const at = `sections[${index}]`;
    if (!isObject(section)) { error(`${at} must be an object`); continue; }
    if (typeof section.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(section.id)) error(`${at}.id must be a kebab-case string`);
    else if (sectionIds.has(section.id)) error(`duplicate section id: ${section.id}`);
    else sectionIds.add(section.id);
    if (typeof section.title !== 'string' || section.title.trim().length < 5) error(`${at}.title is too short`);
    if (typeof section.description !== 'string' || section.description.trim().length < 30) error(`${at}.description is too short`);
    if (!Array.isArray(section.slugs)) { error(`${at}.slugs must be an array`); continue; }
    if (section.slugs.length < MIN_SECTION_SIZE) error(`${at} needs at least ${MIN_SECTION_SIZE} curated prompts`);
    const local = new Set();
    for (const slug of section.slugs) {
      if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) { error(`${at} contains invalid slug ${JSON.stringify(slug)}`); continue; }
      if (local.has(slug)) error(`${at} repeats slug: ${slug}`); else local.add(slug);
      if (curatedSlugs.has(slug)) error(`slug appears in more than one surprise section: ${slug}`); else curatedSlugs.add(slug);
    }
  }
  return [...curatedSlugs];
}

function main() {
  if (UNKNOWN_ARGS.length) throw new Error(`unknown argument(s): ${UNKNOWN_ARGS.join(', ')}`);
  const manifest = readJson(MANIFEST_FILE, 'data/surprise-pools.json');
  const sourceData = parsePromptData(readFileSync(SOURCE_FILE, 'utf8'));
  const catalogData = parseCatalog(readFileSync(CATALOG_FILE, 'utf8'));
  const contract = readFileSync(CONTRACT_FILE, 'utf8').trim();
  const sourceBySlug = indexUnique(flatten(sourceData), 'data/prompts.js');
  const catalogBySlug = indexUnique(flatten(catalogData), 'data/catalog.js');
  const curatedSlugs = validateManifest(manifest);

  for (const slug of curatedSlugs) {
    const prompt = sourceBySlug.get(slug);
    if (!prompt) { error(`curated slug is missing from data/prompts.js: ${slug}`); continue; }
    validateSourceMetadata(prompt);
    validateCatalogParity(prompt, catalogBySlug.get(slug));
    validateLiveLanguages(prompt, catalogData.languageStatus);
    validateRichness(prompt, contract);
  }

  const digest = reviewDigest(Array.isArray(manifest.sections) ? manifest.sections : [], sourceBySlug);
  if (!PRINT_DIGEST && manifest.reviewDigest !== digest) error(`reviewDigest is stale; re-review the curated prompts, then set it to ${digest}`);
  if (errors.length) {
    console.error(`Surprise QA failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:`);
    for (const message of errors) console.error(`- ${message}`);
    process.exitCode = 1;
    return;
  }
  if (PRINT_DIGEST) console.log(digest);
  else console.log(`Surprise QA passed: ${manifest.sections.length} sections | ${curatedSlugs.length} unique curated prompts | ${digest}`);
}

try { main(); }
catch (cause) {
  console.error(`Surprise QA could not run: ${cause.message}`);
  process.exitCode = 1;
}
