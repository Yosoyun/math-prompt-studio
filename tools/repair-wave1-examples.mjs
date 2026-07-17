// Repairs reviewed Wave-1 worked examples in generated data/prompts.js.
// The dataset is generated; never edit it by hand.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = resolve(ROOT, 'data/prompts.js');
const SPEC_FILE = resolve(ROOT, 'tools/wave1-prompts/board-projection.json');
const TODO_DIR = resolve(ROOT, '_handoff/hindi-todo');
const titles = new Set([
  'Piecewise and Modulus Without Guesswork',
  'Binomial Bars With Live Parameters',
  'Argand Operations as Moving Vectors',
]);

function parseData(source) {
  const marker = 'window.PROMPT_DATA =';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('window.PROMPT_DATA marker not found');
  return JSON.parse(source.slice(start + marker.length, source.lastIndexOf(';')));
}

function replaceExample(text, spec, label) {
  const lines = text.split('\n');
  const checkIndexes = lines.flatMap((line, index) => line.startsWith('CHECK → ') ? [index] : []);
  if (checkIndexes.length !== 1) throw new Error(`${label}: expected one CHECK line`);
  const index = checkIndexes[0];
  if (!lines[index + 1]?.startsWith('(paste-fallback: ')) throw new Error(`${label}: fallback is not adjacent`);
  lines[index] = `CHECK → ${spec.exampleUrl}`;
  lines[index + 1] = `(paste-fallback: ${spec.exampleFallback})`;
  return lines.join('\n');
}

const source = readFileSync(DATA_FILE, 'utf8');
const data = parseData(source);
const specs = JSON.parse(readFileSync(SPEC_FILE, 'utf8'));
const selected = new Map(specs.filter(spec => titles.has(spec.title)).map(spec => [spec.title, spec]));
if (selected.size !== titles.size) throw new Error(`expected ${titles.size} repair specs, found ${selected.size}`);

let repaired = 0;
for (const category of data.categories) {
  for (const prompt of category.prompts) {
    const spec = selected.get(prompt.title);
    if (!spec) continue;
    prompt.promptText = replaceExample(prompt.promptText, spec, `${prompt.title}/English`);
    if (!prompt.hi) throw new Error(`${prompt.title}: Hindi translation missing`);
    prompt.hi.promptText = replaceExample(prompt.hi.promptText, spec, `${prompt.title}/Hindi`);
    repaired++;
  }
}
if (repaired !== titles.size) throw new Error(`expected ${titles.size} prompts, repaired ${repaired}`);

const total = data.categories.reduce((sum, category) => sum + category.prompts.length, 0);
const banner = `/* Maths Prompt Studio data - ${total} prompts across ${data.categories.length} categories. v${data.version}. Auto-generated; do not edit by hand. */\n`;
writeFileSync(DATA_FILE, `${banner}window.PROMPT_DATA = ${JSON.stringify(data)};\n`);

let repairedChunks = 0;
for (const file of readdirSync(TODO_DIR).filter(name => /^chunk-\d+\.json$/.test(name))) {
  const path = resolve(TODO_DIR, file);
  const items = JSON.parse(readFileSync(path, 'utf8'));
  let changed = false;
  for (const item of items) {
    const spec = selected.get(item.title);
    if (!spec) continue;
    item.promptText = replaceExample(item.promptText, spec, `${file}/${item.title}`);
    changed = true;
    repairedChunks++;
  }
  if (changed) writeFileSync(path, `${JSON.stringify(items, null, 1)}\n`);
}

console.log(`Repaired ${repaired} reviewed Wave-1 GeoGebra examples in data and ${repairedChunks} source-chunk entries.`);
