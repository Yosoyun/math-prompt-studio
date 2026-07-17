// Builds merge-ready Wave-1 Hindi batches with exact bilingual structural labels.
// The merge QA remains the only writer of translations into data/prompts.js.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = resolve(ROOT, 'data/prompts.js');
const TODO_DIR = resolve(ROOT, '_handoff/hindi-todo');
const OUT_DIR = resolve(ROOT, '_handoff/hindi-normalized-wave1');

function parseData(source) {
  const marker = 'window.PROMPT_DATA =';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('window.PROMPT_DATA marker not found');
  return JSON.parse(source.slice(start + marker.length, source.lastIndexOf(';')));
}

const exactLines = new Map([
  ['ROLE:', 'भूमिका (ROLE):'],
  ['CONTEXT:', 'संदर्भ (CONTEXT):'],
  ['INPUTS — FILL EVERY PLACEHOLDER:', 'इनपुट—हर स्थानधारक भरें (INPUTS — FILL EVERY PLACEHOLDER):'],
  ['DO THIS:', 'यह करें (DO THIS):'],
  ['WORKED LINK EXAMPLE — COPY THIS EXACT ENCODING PATTERN:', 'हल किया हुआ लिंक उदाहरण—इस कूटबद्धता ढाँचे को ठीक-ठीक कॉपी करें (WORKED LINK EXAMPLE — COPY THIS EXACT ENCODING PATTERN):'],
  ['OUTPUT FORMAT:', 'आउटपुट प्रारूप (OUTPUT FORMAT):'],
  ['QUALITY AND TOOL GUARDRAILS:', 'गुणवत्ता और टूल सुरक्षा-नियम (QUALITY AND TOOL GUARDRAILS):'],
]);
const prefixedLines = new Map([
  ['Example task:', 'उदाहरण कार्य (Example task):'],
  ['Expected result or check target:', 'अपेक्षित परिणाम या जाँच लक्ष्य (Expected result or check target):'],
  ['Encoding note:', 'कूटबद्धता टिप्पणी (Encoding note):'],
]);

function suffixAfterLabel(line, label) {
  if (line.startsWith(label)) return line.slice(label.length).trimStart();
  const colon = line.indexOf(':');
  if (colon < 0) throw new Error(`cannot find translated label separator in: ${line}`);
  return line.slice(colon + 1).trimStart();
}

function normalizePromptText(english, hindi, title) {
  const sourceLines = english.split('\n');
  const lines = hindi.split('\n');
  if (sourceLines.length !== lines.length) throw new Error(`${title}: line-count mismatch`);
  for (let index = 0; index < sourceLines.length; index++) {
    const sourceLine = sourceLines[index];
    if (exactLines.has(sourceLine)) {
      lines[index] = exactLines.get(sourceLine);
      continue;
    }
    for (const [sourcePrefix, translatedPrefix] of prefixedLines) {
      if (!sourceLine.startsWith(sourcePrefix)) continue;
      lines[index] = `${translatedPrefix} ${suffixAfterLabel(lines[index], sourcePrefix)}`.trimEnd();
      break;
    }
  }
  return lines.join('\n');
}

const data = parseData(readFileSync(DATA_FILE, 'utf8'));
const byTitle = new Map(data.categories.flatMap(category => category.prompts).map(prompt => [prompt.title, prompt]));
mkdirSync(OUT_DIR, { recursive: true });

const chunkFiles = readdirSync(TODO_DIR).filter(name => /^chunk-\d+\.json$/.test(name)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
let total = 0;
for (const file of chunkFiles) {
  const items = JSON.parse(readFileSync(resolve(TODO_DIR, file), 'utf8'));
  const batch = items.map(item => {
    const prompt = byTitle.get(item.title);
    if (!prompt?.hi) throw new Error(`${item.title}: final Hindi translation missing`);
    if (prompt.promptText !== item.promptText) throw new Error(`${item.title}: source chunk is stale`);
    const hi = structuredClone(prompt.hi);
    hi.promptText = normalizePromptText(prompt.promptText, hi.promptText, prompt.title);
    total++;
    return { title: prompt.title, hi };
  });
  const number = String(Number(file.match(/\d+/)[0])).padStart(2, '0');
  writeFileSync(resolve(OUT_DIR, `batch-${number}.json`), `${JSON.stringify(batch, null, 2)}\n`);
}

console.log(`Built ${chunkFiles.length} normalized Hindi batches for ${total} Wave-1 prompts.`);
