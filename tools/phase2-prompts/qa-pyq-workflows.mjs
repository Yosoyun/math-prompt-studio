// Self-QA for the generated PYQ workflow category and merge-hindi records.
// It never edits the corpus.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORY, ITEMS } from './pyq-workflows.spec.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(DIR, '../..');
const category = JSON.parse(readFileSync(resolve(DIR, 'pyq-workflows.json'), 'utf8'));
const hindi = JSON.parse(readFileSync(resolve(DIR, 'pyq-workflows-hi.json'), 'utf8'));
const contract = readFileSync(resolve(ROOT, '_handoff/tool-link-contract.txt'), 'utf8');
const allowedFmt = new Set(['pdf-print', 'doc', 'ppt', 'image', 'links', 'interactive', 'text']);
const errors = [];
const fail = message => errors.push(message);
const placeholders = value => (String(value).match(/\[[^\]\n]{1,80}\]/g) || []).sort().join('|');
const numbers = value => (String(value).match(/\d+(?:\.\d+)?/g) || []).sort().join('|');
const urls = value => (String(value).match(/https?:\/\/[^\s]+/g) || []).map(url => url.replace(/[.,;:!?।]+$/u, '')).sort().join('|');
const devanagari = value => (String(value).match(/[ऀ-ॿ]/g) || []).length;

if (ITEMS.length !== 20) fail(`spec expected 20 items, found ${ITEMS.length}`);
for (const key of ['category', 'categoryTitle', 'group', 'categoryBlurb']) {
  if (category[key] !== CATEGORY[key]) fail(`category ${key} mismatch`);
}
if (category.category !== 'pyq-workflows' || category.categoryTitle !== 'PYQ Power Workflows' || category.group !== 'Practice & Assessment') fail('category identity mismatch');
if (!Array.isArray(category.prompts) || category.prompts.length !== 20) fail(`English count is ${category.prompts?.length}`);
if (!Array.isArray(hindi) || hindi.length !== 20) fail(`Hindi count is ${hindi?.length}`);
const variantPrompt = category.prompts?.[0];
if (!variantPrompt?.promptText.includes('Generate exactly five distinct items') ||
    !variantPrompt?.promptText.includes('difficulty band') ||
    !variantPrompt?.promptText.includes('[ALLOWED VALUE RANGES AND EXCLUSIONS]')) {
  fail('five-variant workflow must require exactly five same-difficulty ORIGINAL PRACTICE items');
}

const titles = new Set();
const slugs = new Set();
const hiByTitle = new Map(hindi.map(record => [record.title, record.hi]));
const required = ['title', 'tag', 'whatYouGet', 'bestTool', 'worksOnFree', 'howToUse', 'commonFix', 'promptText', 'slug', 'aud', 'fmt', 'added'];

for (const [index, prompt] of (category.prompts || []).entries()) {
  const label = `prompt ${index + 1} ${prompt.title || ''}`;
  for (const field of required) if (typeof prompt[field] !== 'string' || !prompt[field].trim()) fail(`${label}: missing ${field}`);
  if (titles.has(prompt.title)) fail(`${label}: duplicate title`); else titles.add(prompt.title);
  if (slugs.has(prompt.slug)) fail(`${label}: duplicate slug`); else slugs.add(prompt.slug);
  if (prompt.needsImage !== false || prompt.makesImage !== false) fail(`${label}: image flags must be false`);
  if (JSON.stringify(prompt.exams) !== JSON.stringify(['jee-main', 'jee-advanced'])) fail(`${label}: exams must be JEE Main + Advanced`);
  if (!['teacher', 'both'].includes(prompt.aud)) fail(`${label}: invalid audience ${prompt.aud}`);
  if (!allowedFmt.has(prompt.fmt)) fail(`${label}: invalid fmt ${prompt.fmt}`);
  if (prompt.added !== '2026-07-17') fail(`${label}: wrong added date`);
  if (!Array.isArray(prompt.effectiveUsage) || prompt.effectiveUsage.length !== 4) fail(`${label}: effectiveUsage must contain four steps`);
  if (!prompt.promptText.endsWith(contract)) fail(`${label}: English contract is not verbatim at end`);
  if (prompt.promptText.split(contract).length - 1 !== 1) fail(`${label}: English contract occurrence count`);
  for (const header of ['ROLE:', 'CONTEXT:', 'INPUTS — FILL EVERY PLACEHOLDER:', 'SOURCE-BOUND TOOL FACTS AND EXACT URL WHITELIST:', 'DO THIS:', 'WORKED LINK EXAMPLE — COPY THIS EXACT ENCODING PATTERN:', 'OUTPUT FORMAT:', 'QUALITY AND TOOL GUARDRAILS:']) {
    if (!prompt.promptText.includes(header)) fail(`${label}: missing ${header}`);
  }
  for (const phrase of [
    'https://yosoyun.github.io/problem-atlas/',
    'Refuse to fabricate, reconstruct, retrieve from memory or authenticate any PYQ.',
    'ORIGINAL PRACTICE',
    'CURRENT PATTERN NOT ASSESSED',
    'TEACHER-SUPPLIED — NOT AUTHENTICATED BY AI',
    'check this yourself',
  ]) if (!prompt.promptText.includes(phrase)) fail(`${label}: missing safety phrase ${phrase}`);
  if (/https?:\/\/(?:www\.)?desmos\.com\/[^\s)]*\?/i.test(prompt.promptText)) fail(`${label}: forbidden Desmos parameter URL`);
  if (/https?:\/\/mathsolver\.microsoft\.com/i.test(prompt.promptText)) fail(`${label}: retired Math Solver URL`);
  if (/https?:\/\/(?:www\.)?geogebra\.org\/m\//i.test(prompt.promptText)) fail(`${label}: invented GeoGebra material path`);
  if ((prompt.promptText.match(/CHECK → https:\/\/www\.wolframalpha\.com\/input\?i=solve%20x%5E2-5x%2B6%3D0/g) || []).length !== 1) fail(`${label}: worked check mismatch`);
  if (decodeURIComponent('solve%20x%5E2-5x%2B6%3D0') !== 'solve x^2-5x+6=0') fail(`${label}: fixed link does not round-trip`);

  const hi = hiByTitle.get(prompt.title);
  if (!hi) { fail(`${label}: missing Hindi merge record`); continue; }
  for (const field of ['title', 'whatYouGet', 'howToUse', 'commonFix', 'promptText']) if (typeof hi[field] !== 'string' || devanagari(hi[field]) < (field === 'title' ? 2 : 10)) fail(`${label}: weak Hindi ${field}`);
  if (!Array.isArray(hi.effectiveUsage) || hi.effectiveUsage.length !== prompt.effectiveUsage.length) fail(`${label}: Hindi effectiveUsage mismatch`);
  if (!hi.promptText.endsWith(contract)) fail(`${label}: Hindi contract is not verbatim at end`);
  if (hi.promptText.split(contract).length - 1 !== 1) fail(`${label}: Hindi contract occurrence count`);
  if (placeholders(prompt.promptText) !== placeholders(hi.promptText)) fail(`${label}: placeholder mismatch`);
  if (urls(prompt.promptText) !== urls(hi.promptText)) fail(`${label}: URL mismatch`);
  if (numbers(prompt.promptText) !== numbers(hi.promptText)) fail(`${label}: number mismatch`);
  if (prompt.promptText.split('\n').length !== hi.promptText.split('\n').length) fail(`${label}: line-count mismatch`);
  if (!hi.promptText.includes('ORIGINAL PRACTICE') || !hi.promptText.includes('https://yosoyun.github.io/problem-atlas/')) fail(`${label}: Hindi safety boundary missing`);
  // AGENTS.md translation rule: these product/file terms stay in English.
  if (/वर्कशीट|पीडीएफ|डीपीपी|एमसीक्यू|चैटजीपीटी/.test(JSON.stringify(hi))) fail(`${label}: protected English term was transliterated`);
}

const orphanHindi = hindi.filter(record => !titles.has(record.title));
if (orphanHindi.length) fail(`orphan Hindi records: ${orphanHindi.map(record => record.title).join(', ')}`);
const forbiddenIdentity = String.fromCharCode(73, 110, 100, 114, 97, 106, 101, 101, 116, 32, 89, 97, 100, 97, 118);
if (JSON.stringify({ category, hindi, ITEMS }).includes(forbiddenIdentity)) fail('protected identity found in pack');

console.log(`PYQ workflow QA: ${category.prompts?.length || 0} English | ${hindi.length} Hindi | ${slugs.size} unique slugs | errors: ${errors.length}`);
for (const error of errors) console.error(`- ${error}`);
if (errors.length) process.exit(1);
