// Phase 2 acceptance gate: formats, source-bound PYQ workflows, segment balance,
// Hindi parity, cache/catalog freshness, and frozen tool-link safety.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MARKER = 'window.PROMPT_DATA =';
const EXPECTED_TOTAL = 961;
const EXPECTED_PYQ = 20;
const EXPECTED_SEGMENT_ADDITIONS = 93;
const CACHE = '23';
const FORMATS = new Set(['pdf-print', 'doc', 'ppt', 'image', 'links', 'interactive', 'text']);
const SEGMENTS = ['boards', 'foundation', 'jee-main', 'jee-advanced', 'olympiad'];
const BASELINE = { boards: 44, foundation: 4, 'jee-main': 3, 'jee-advanced': 6, olympiad: 24 };

const errors = [];
let assertions = 0;
function check(condition, message) { assertions += 1; if (!condition) errors.push(message); }
function read(relative) { return readFileSync(resolve(ROOT, relative), 'utf8'); }
function parseData(source) {
  const start = source.indexOf(MARKER);
  if (start < 0) throw new Error('window.PROMPT_DATA marker missing');
  return JSON.parse(source.slice(start + MARKER.length, source.lastIndexOf(';')));
}
function placeholders(value) { return [...String(value || '').matchAll(/\[[^\]\n]{1,100}\]/g)].map(match => match[0]).sort(); }
function samePlaceholders(a, b) { return JSON.stringify(placeholders(a)) === JSON.stringify(placeholders(b)); }
function countScript(value, min, max) { return [...String(value || '')].filter(char => { const code = char.codePointAt(0); return code >= min && code <= max; }).length; }
function listHtml(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? listHtml(path) : entry.isFile() && entry.name.endsWith('.html') ? [path] : [];
  });
}

const indexSource = read('index.html');
const appSource = read('app.js');
const cssSource = read('styles.css');
const configSource = read('config.js');
const promptSource = read('data/prompts.js');
const contract = read('_handoff/tool-link-contract.txt').trim();
const data = parseData(promptSource);
const prompts = data.categories.flatMap(category => (category.prompts || []).map(prompt => ({ ...prompt, _category: category.category })));
const bySlug = new Map(prompts.map(prompt => [prompt.slug, prompt]));
const pyqCategory = data.categories.find(category => category.category === 'pyq-workflows');

check(prompts.length === EXPECTED_TOTAL, `expected ${EXPECTED_TOTAL} prompts, found ${prompts.length}`);
check(bySlug.size === prompts.length, 'prompt slugs must be unique');
check(new Set(prompts.map(prompt => String(prompt.title).toLowerCase())).size === prompts.length, 'prompt titles must be unique case-insensitively');
check((pyqCategory?.prompts || []).length === EXPECTED_PYQ, `pyq-workflows must contain ${EXPECTED_PYQ} prompts`);
check(/<title>[^<]*\(961\)/.test(indexSource), 'home title count is not 961');
check(/data-stat=["']prompts["'][^>]*>961/.test(indexSource), 'hero prompt count is not 961');
check(/data-stat=["']cats["'][^>]*>\d+/.test(indexSource), 'hero category count is missing');

const formatCounts = Object.fromEntries([...FORMATS].map(format => [format, 0]));
for (const prompt of prompts) {
  check(FORMATS.has(prompt.fmt), `missing/invalid fmt: ${prompt.slug}`);
  if (FORMATS.has(prompt.fmt)) formatCounts[prompt.fmt] += 1;
  check(Array.isArray(prompt.exams) && prompt.exams.length > 0, `missing exams: ${prompt.slug}`);
  check(['teacher', 'student', 'both'].includes(prompt.aud), `missing/invalid aud: ${prompt.slug}`);
  check(Boolean(prompt.hi), `missing Hindi: ${prompt.slug}`);
  if (prompt.hi) {
    for (const field of ['title', 'whatYouGet', 'howToUse', 'commonFix', 'promptText']) check(typeof prompt.hi[field] === 'string' && prompt.hi[field].trim(), `Hindi ${field} missing: ${prompt.slug}`);
    check(Array.isArray(prompt.hi.effectiveUsage) && prompt.hi.effectiveUsage.length === prompt.effectiveUsage.length, `Hindi effectiveUsage mismatch: ${prompt.slug}`);
    check(samePlaceholders(prompt.promptText, prompt.hi.promptText), `Hindi placeholder mismatch: ${prompt.slug}`);
    check(countScript(prompt.hi.title, 0x0900, 0x097f) >= 2, `Hindi title lacks Devanagari: ${prompt.slug}`);
    check(countScript(prompt.hi.promptText, 0x0900, 0x097f) >= 50, `Hindi promptText lacks Devanagari: ${prompt.slug}`);
  }
  if (prompt.promptText.includes('=== TOOL-LINK OUTPUT CONTRACT')) {
    check(prompt.promptText.endsWith(contract), `English contract is not exact final suffix: ${prompt.slug}`);
    check(prompt.promptText.split(contract).length === 2, `English contract occurrence count is not one: ${prompt.slug}`);
    check(prompt.hi?.promptText.endsWith(contract), `Hindi contract is not exact final suffix: ${prompt.slug}`);
  }
}
check(formatCounts.text / prompts.length <= 0.20, `plain text is ${(100 * formatCounts.text / prompts.length).toFixed(1)}% (max 20%)`);
check(/var FORMATS\s*=/.test(appSource) && /id:\s*['"]pdf-print['"]/.test(appSource) && /id:\s*['"]interactive['"]/.test(appSource), 'app format definitions are incomplete');
check(/id=["']formatMount["']/.test(indexSource) && /function buildFormatFacets\(\)/.test(appSource), 'format filter row is missing');
check(/Get this as:/.test(appSource) && /id="mPdf"/.test(appSource) && /id="mWord"/.test(appSource) && /id="mPpt"/.test(appSource), 'prominent modal export controls are missing');
check(/\.tag-format/.test(cssSource), 'format badge styling is missing');

for (const prompt of pyqCategory?.prompts || []) {
  const text = prompt.promptText;
  check(prompt.exams.includes('jee-main') && prompt.exams.includes('jee-advanced'), `PYQ facets incomplete: ${prompt.slug}`);
  check(prompt.added === '2026-07-17', `PYQ added date wrong: ${prompt.slug}`);
  check(prompt.aud === 'teacher' || prompt.aud === 'both', `PYQ audience wrong: ${prompt.slug}`);
  check(text.includes('https://yosoyun.github.io/problem-atlas/'), `Problem Atlas source line missing: ${prompt.slug}`);
  check(/ORIGINAL PRACTICE/.test(text), `ORIGINAL PRACTICE label missing: ${prompt.slug}`);
  check(/paste|pasted/i.test(text), `pasted-source requirement missing: ${prompt.slug}`);
  check(/refuse|do not fabricate|never fabricate|must not fabricate/i.test(text), `anti-fabrication refusal missing: ${prompt.slug}`);
  check(/teacher-supplied|supplied by the teacher/i.test(text), `teacher-supplied pattern/rules guard missing: ${prompt.slug}`);
  check(text.endsWith(contract), `PYQ tool contract missing: ${prompt.slug}`);
}

const manifestRaw = JSON.parse(read('_handoff/phase2-segment-manifest.json'));
const manifestEntries = Array.isArray(manifestRaw) ? manifestRaw : (manifestRaw.entries || manifestRaw.prompts || manifestRaw.additions || []);
check(manifestEntries.length === EXPECTED_SEGMENT_ADDITIONS, `segment manifest must have ${EXPECTED_SEGMENT_ADDITIONS} additions (found ${manifestEntries.length})`);
check(new Set(manifestEntries.map(entry => entry.slug)).size === manifestEntries.length, 'segment manifest slugs must be unique');
const strictCounts = { ...BASELINE };
for (const entry of manifestEntries) {
  const prompt = bySlug.get(entry.slug);
  check(Boolean(prompt), `manifest prompt missing: ${entry.slug}`);
  check(Array.isArray(entry.segments) && entry.segments.length >= 1 && entry.segments.length <= 2, `manifest segments invalid: ${entry.slug}`);
  check(typeof entry.evidence === 'string' && entry.evidence.length >= 20, `manifest evidence missing: ${entry.slug}`);
  for (const segment of entry.segments || []) {
    check(SEGMENTS.includes(segment), `manifest segment invalid (${segment}): ${entry.slug}`);
    check(prompt?.exams.includes(segment), `manifest facet/evidence mismatch (${segment}): ${entry.slug}`);
    strictCounts[segment] += 1;
  }
}
for (const prompt of pyqCategory?.prompts || []) { strictCounts['jee-main'] += 1; strictCounts['jee-advanced'] += 1; }
for (const segment of SEGMENTS) check(strictCounts[segment] >= 60, `strict ${segment} coverage is ${strictCounts[segment]} (needs 60)`);

check(!/https?:\/\/(?:www\.)?mathsolver\.microsoft\.com/i.test(promptSource), 'dead Microsoft Math Solver URL present');
check(!/https?:\/\/(?:www\.)?desmos\.com\/[^\s"'`]*\?/i.test(promptSource), 'Desmos parameter URL present');
check(!/https?:\/\/(?:www\.)?(?:wayground|kahoot|blooket)\.[^\s"'`]+\?[^\s"'`]*/i.test(promptSource), 'quiz platform parameter URL present');
const contractPrompts = prompts.filter(prompt => prompt.promptText.includes('=== TOOL-LINK OUTPUT CONTRACT'));
check(contractPrompts.length === 295, `tool-contract prompt count must be 295 (found ${contractPrompts.length})`);

for (const file of ['tools/merge-hindi.mjs', 'tools/hindi-status.mjs', 'AGENTS.md']) {
  const diff = spawnSync('git', ['diff', '--exit-code', '--', file], { cwd: ROOT, encoding: 'utf8' });
  check(diff.status === 0, `protected file changed: ${file}`);
}
const catalogCheck = spawnSync(process.execPath, [resolve(ROOT, 'tools/build-catalog.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8' });
check(catalogCheck.status === 0, `catalog freshness failed: ${(catalogCheck.stderr || catalogCheck.stdout).trim().split('\n').at(-1) || 'unknown error'}`);
const hindiStatus = spawnSync(process.execPath, [resolve(ROOT, 'tools/hindi-status.mjs')], { cwd: ROOT, encoding: 'utf8' });
check(hindiStatus.status === 0 && /remaining:\s*0/.test(hindiStatus.stdout), `Hindi status failed: ${hindiStatus.stdout.trim()}`);
for (const asset of ['styles.css', 'data/prompts.js', 'data/catalog.js', 'app.js']) check(new RegExp(asset.replace('.', '\\.') + `\\?v=${CACHE}`).test(indexSource) || asset === 'data/catalog.js', `index cache v${CACHE} missing for ${asset}`);
check(appSource.includes(`data/prompts.js?v=${CACHE}`) && appSource.includes(`.js?v=${CACHE}`), `app cache fallbacks are not v${CACHE}`);

const about = indexSource.match(/<section\b[^>]*\bid=["']about["'][^>]*>[\s\S]*?<\/section>/i)?.[0] || '';
const identity = (about.match(/class=["'][^"']*about-name[^"']*["'][^>]*>([^<]+)</i)?.[1] || '').trim();
if (identity) {
  const first = identity.split(/\s+/)[0];
  const patterns = [identity, first].map(value => new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  const maskedIndex = indexSource.replace(about, about.replace(/[^\n]/g, ' '));
  for (const [name, source] of [['index.html', maskedIndex], ['app.js', appSource], ['styles.css', cssSource], ['config.js', configSource], ['data/prompts.js', promptSource]]) {
    check(!patterns.some(pattern => pattern.test(source)), `protected identity outside About: ${name}`);
  }
  for (const file of listHtml(resolve(ROOT, 'p'))) check(!patterns.some(pattern => pattern.test(readFileSync(file, 'utf8'))), `protected identity in generated page: ${file.slice(ROOT.length + 1)}`);
}

console.log(`Phase 2 QA: ${errors.length ? 'FAIL' : 'PASS'} | assertions ${assertions} | errors ${errors.length}`);
console.log(`Prompts ${prompts.length} | formats ${JSON.stringify(formatCounts)} | strict ${JSON.stringify(strictCounts)} | contracts ${contractPrompts.length}`);
for (const error of errors) console.error(`- ${error}`);
if (errors.length) process.exit(1);
