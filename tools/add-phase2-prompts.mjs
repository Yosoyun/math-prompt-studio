// AUD-D/P2-D3 + AUD-F/P2-F4: append generated Phase 2 categories through code.
// Usage: node tools/add-phase2-prompts.mjs <pack.json> [more-pack.json ...]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = resolve(ROOT, 'data/prompts.js');
const MARKER = 'window.PROMPT_DATA =';
const PHASE_VERSION = '2026-07-17-phase2-formats-pyq-segments';
const REQUIRED_FIELDS = ['title', 'tag', 'whatYouGet', 'bestTool', 'worksOnFree', 'howToUse', 'effectiveUsage', 'commonFix', 'promptText', 'slug', 'exams', 'aud', 'fmt', 'added'];
const FORMATS = new Set(['pdf-print', 'doc', 'ppt', 'image', 'links', 'interactive', 'text']);
const EXAMS = new Set(['any', 'boards', 'jee-main', 'jee-advanced', 'olympiad', 'foundation']);
const AUDIENCES = new Set(['teacher', 'student', 'both']);

function readData() {
  const source = readFileSync(DATA_FILE, 'utf8');
  const start = source.indexOf(MARKER);
  if (start < 0) throw new Error('window.PROMPT_DATA marker missing');
  return JSON.parse(source.slice(start + MARKER.length, source.lastIndexOf(';')));
}

function categoriesFromPack(file) {
  const value = JSON.parse(readFileSync(file, 'utf8'));
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.categories)) return value.categories;
  if (value.category && Array.isArray(value.prompts)) return [value];
  throw new Error(`${file}: expected a category, category array, or {categories:[...]}`);
}

function placeholders(text) {
  return [...String(text).matchAll(/\[[^\]\n]{1,100}\]/g)].map(match => match[0]).sort();
}

function assertPrompt(prompt, label) {
  for (const field of REQUIRED_FIELDS) {
    if (prompt[field] == null || prompt[field] === '' || (Array.isArray(prompt[field]) && !prompt[field].length)) throw new Error(`${label}: missing ${field}`);
  }
  if (!FORMATS.has(prompt.fmt)) throw new Error(`${label}: invalid fmt ${prompt.fmt}`);
  if (!Array.isArray(prompt.exams) || prompt.exams.some(exam => !EXAMS.has(exam))) throw new Error(`${label}: invalid exams`);
  if (!AUDIENCES.has(prompt.aud)) throw new Error(`${label}: invalid aud ${prompt.aud}`);
  if (prompt.added !== '2026-07-17') throw new Error(`${label}: added must be 2026-07-17`);
  if (prompt.hi || prompt.bn || prompt.mr || prompt.te) throw new Error(`${label}: translations must be merged through their QA pipeline, not embedded in the English pack`);
  if (!Array.isArray(prompt.effectiveUsage) || prompt.effectiveUsage.length < 3) throw new Error(`${label}: effectiveUsage needs at least 3 steps`);
  const inputTokens = placeholders(prompt.promptText).filter(token => /^\[[A-Z]/.test(token));
  if (inputTokens.some(token => !/^\[[ -~]+\]$/.test(token))) throw new Error(`${label}: placeholder must stay English ASCII`);
}

const checkOnly = process.argv.includes('--check');
const inputFiles = process.argv.slice(2).filter(file => file !== '--check').map(file => resolve(process.cwd(), file));
if (!inputFiles.length) throw new Error('Pass at least one generated Phase 2 prompt pack JSON file.');

const data = readData();
const existingCategories = new Map(data.categories.map(category => [category.category, category]));
const existingPrompts = data.categories.flatMap(category => category.prompts || []);
const existingSlugs = new Set(existingPrompts.map(prompt => prompt.slug));
const existingTitles = new Set(existingPrompts.map(prompt => prompt.title.toLowerCase()));
const incomingCategories = inputFiles.flatMap(categoriesFromPack);
const incomingSlugs = new Set();
const incomingTitles = new Set();
let added = 0;

for (const category of incomingCategories) {
  if (!category.category || !category.categoryTitle || !category.categoryIcon || !category.group || !category.categoryBlurb || !Array.isArray(category.prompts)) throw new Error(`invalid category pack: ${category.category || 'unnamed'}`);
  if (existingCategories.has(category.category)) {
    const current = existingCategories.get(category.category);
    const desired = category.prompts.map(prompt => prompt.slug).sort();
    const present = (current.prompts || []).filter(prompt => desired.includes(prompt.slug)).map(prompt => prompt.slug).sort();
    if (JSON.stringify(present) === JSON.stringify(desired)) continue;
    throw new Error(`category already exists partially: ${category.category}`);
  }
  for (const prompt of category.prompts) {
    assertPrompt(prompt, prompt.title || prompt.slug || category.category);
    if (existingSlugs.has(prompt.slug) || incomingSlugs.has(prompt.slug)) throw new Error(`duplicate slug: ${prompt.slug}`);
    const titleKey = prompt.title.toLowerCase();
    if (existingTitles.has(titleKey) || incomingTitles.has(titleKey)) throw new Error(`duplicate title: ${prompt.title}`);
    incomingSlugs.add(prompt.slug);
    incomingTitles.add(titleKey);
  }
  data.categories.push(category);
  existingCategories.set(category.category, category);
  added += category.prompts.length;
}

const versionChanged = data.version !== PHASE_VERSION;
data.version = PHASE_VERSION;
if (!checkOnly && (added || versionChanged)) writeFileSync(DATA_FILE, `${MARKER} ${JSON.stringify(data)};\n`);
const total = data.categories.reduce((sum, category) => sum + (category.prompts || []).length, 0);
console.log(`Phase 2 prompt add${checkOnly ? ' check' : ''}: ${added ? `${checkOnly ? 'would add' : 'added'} ${added}` : 'already applied'} | total ${total} | categories ${data.categories.length} | version ${data.version}`);
