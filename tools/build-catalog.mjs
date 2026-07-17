// AUD-A P1/A3: build a compact, searchable card catalog so the 12 MB prompt
// corpus is fetched only when a visitor opens or copies a full prompt.
// Usage: node tools/build-catalog.mjs [--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_FILE = resolve(ROOT, 'data/prompts.js');
const OUTPUT_FILE = resolve(ROOT, 'data/catalog.js');
const INDEX_FILE = resolve(ROOT, 'index.html');
const CHECK_ONLY = process.argv.includes('--check');
const MARKER = 'window.PROMPT_DATA =';

function parsePromptData(source) {
  const start = source.indexOf(MARKER);
  if (start < 0) throw new Error('window.PROMPT_DATA marker not found');
  return JSON.parse(source.slice(start + MARKER.length, source.lastIndexOf(';')));
}

const SEARCH_KEYWORDS = [
  'wolframalpha', 'wolfram', 'symbolab', 'desmos', 'geogebra', 'overleaf', 'codecogs',
  'stackexchange', 'mathoverflow', 'oeis', 'aops', 'khan', 'phet', 'colab', 'python',
  'kahoot', 'wayground', 'quizizz', 'blooket', 'google forms', 'apps script', 'excel',
  'google sheets', 'powerpoint', 'google slides', 'gamma', 'canva', 'youtube', 'instagram',
  'whatsapp', 'telegram', 'latex', 'tikz', 'pdf', 'docx', 'word', 'image', 'interactive',
  'worksheet', 'quiz', 'question paper', 'mock paper', 'presentation', 'slide deck',
  'verify', 'verification', 'graph', 'diagram', 'pyq', 'previous year', 'olympiad',
  'jee main', 'jee advanced', 'foundation', 'boards', 'ncert', 'cbse', 'student', 'teacher',
];

function compactSearchBits(prompt) {
  const languageBodies = ['hi', 'bn', 'mr', 'te'].flatMap(code => {
    const value = prompt[code];
    return value && typeof value === 'object' ? Object.values(value) : [];
  });
  const omittedBody = [prompt.bestTool, prompt.worksOnFree, prompt.howToUse, ...(prompt.effectiveUsage || []), prompt.commonFix, prompt.promptText, ...languageBodies]
    .filter(value => typeof value === 'string').join(' ').toLowerCase().normalize('NFKC');
  const bytes = Buffer.alloc(Math.ceil(SEARCH_KEYWORDS.length / 8));
  SEARCH_KEYWORDS.forEach((keyword, index) => {
    if (omittedBody.includes(keyword)) bytes[index >> 3] |= 1 << (index & 7);
  });
  return bytes.some(Boolean) ? bytes.toString('base64').replace(/=+$/, '') : '';
}

function cardPrompt(category, prompt) {
  const card = {
    title: prompt.title,
    tag: prompt.tag,
    needsImage: !!prompt.needsImage,
    makesImage: !!prompt.makesImage,
    whatYouGet: prompt.whatYouGet,
    slug: prompt.slug,
    exams: prompt.exams,
    aud: prompt.aud,
  };
  const searchBits = compactSearchBits(prompt);
  if (searchBits) card.sk = searchBits;
  if (prompt.featured) card.featured = true;
  if (prompt.added) card.added = prompt.added;
  if (prompt.fmt) card.fmt = prompt.fmt;
  if (prompt.styles) card.styles = prompt.styles;
  return card;
}

function buildLanguagePack(data, code) {
  return Object.fromEntries(data.categories.flatMap(category => category.prompts)
    .filter(prompt => prompt[code])
    .map(prompt => [prompt.slug, { title: prompt[code].title, whatYouGet: prompt[code].whatYouGet }]));
}

function buildCatalog(data) {
  return {
    version: data.version,
    total: data.categories.reduce((sum, category) => sum + category.prompts.length, 0),
    searchKeywords: SEARCH_KEYWORDS,
    categories: data.categories.map(category => ({
      category: category.category,
      categoryTitle: category.categoryTitle,
      categoryIcon: category.categoryIcon,
      group: category.group,
      categoryBlurb: category.categoryBlurb,
      prompts: category.prompts.map(prompt => cardPrompt(category, prompt)),
    })),
  };
}

function assertCatalog(sourceData, catalog, languagePacks) {
  const sourcePrompts = sourceData.categories.flatMap(category => category.prompts);
  const cards = catalog.categories.flatMap(category => category.prompts);
  if (cards.length !== sourcePrompts.length || catalog.total !== sourcePrompts.length) throw new Error('catalog prompt total mismatch');
  if (new Set(cards.map(prompt => prompt.slug)).size !== cards.length) throw new Error('catalog slugs are not unique');
  for (const card of cards) {
    if (!card.slug || !card.title || !card.whatYouGet) throw new Error(`incomplete catalog card: ${card.slug || card.title || 'unknown'}`);
    if (!Array.isArray(card.exams) || !card.exams.length || !card.aud) throw new Error(`facet metadata missing: ${card.slug}`);
  }
  for (const code of ['hi', 'bn', 'mr', 'te']) {
    const sourceCount = sourcePrompts.filter(prompt => prompt[code]).length;
    const pack = languagePacks[code];
    const packCount = pack ? Object.keys(pack).length : 0;
    if (sourceCount !== packCount) throw new Error(`${code} card-pack coverage mismatch: ${packCount}/${sourceCount}`);
  }
}

const sourceText = readFileSync(SOURCE_FILE, 'utf8');
const sourceData = parsePromptData(sourceText);
const catalog = buildCatalog(sourceData);
const languagePacks = Object.fromEntries(['hi', 'bn', 'mr', 'te'].map(code => [code, buildLanguagePack(sourceData, code)]));
assertCatalog(sourceData, catalog, languagePacks);

const indexText = readFileSync(INDEX_FILE, 'utf8');
const versionMatch = indexText.match(/data\/prompts\.js\?v=(\d+)/);
const dataUrl = `data/prompts.js?v=${versionMatch ? versionMatch[1] : '21'}`;
const output = [
  `/* Maths Prompt Studio compact catalog - ${catalog.total} prompt cards. Generated; do not edit by hand. */`,
  `window.MPS_DATA_URL = window.MPS_DATA_URL || ${JSON.stringify(dataUrl)};`,
  `window.PROMPT_CATALOG = ${JSON.stringify(catalog)};`,
  '',
].join('\n');

const packOutputs = Object.fromEntries(Object.entries(languagePacks)
  .filter(([, pack]) => Object.keys(pack).length)
  .map(([code, pack]) => [code, [
    `/* Maths Prompt Studio ${code} card translations. Generated; do not edit by hand. */`,
    'window.PROMPT_CATALOG_LANG = window.PROMPT_CATALOG_LANG || {};',
    `window.PROMPT_CATALOG_LANG[${JSON.stringify(code)}] = ${JSON.stringify(pack)};`,
    '',
  ].join('\n')]));

if (CHECK_ONLY) {
  const current = readFileSync(OUTPUT_FILE, 'utf8');
  if (current !== output) throw new Error('data/catalog.js is stale; run node tools/build-catalog.mjs');
  for (const [code, packOutput] of Object.entries(packOutputs)) {
    const packFile = resolve(ROOT, `data/catalog-${code}.js`);
    if (readFileSync(packFile, 'utf8') !== packOutput) throw new Error(`data/catalog-${code}.js is stale; run node tools/build-catalog.mjs`);
  }
} else {
  writeFileSync(OUTPUT_FILE, output);
  for (const [code, packOutput] of Object.entries(packOutputs)) writeFileSync(resolve(ROOT, `data/catalog-${code}.js`), packOutput);
}

const sourceBytes = Buffer.byteLength(sourceText);
const outputBytes = Buffer.byteLength(output);
const gzipBytes = gzipSync(output).byteLength;
if (outputBytes > 450 * 1024) throw new Error(`catalog exceeds 450 KiB raw budget: ${outputBytes} bytes`);
const packSummary = Object.entries(packOutputs).map(([code, value]) => `${code} ${Buffer.byteLength(value)} bytes`).join(' | ');
console.log(`Catalog ${CHECK_ONLY ? 'check' : 'build'} passed: ${catalog.total} prompts | raw ${outputBytes} bytes | gzip ${gzipBytes} bytes | ${(100 * outputBytes / sourceBytes).toFixed(1)}% of full data${packSummary ? ` | packs: ${packSummary}` : ''}`);
