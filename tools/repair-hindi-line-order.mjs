// Prepare the Phase 3 Hindi line-order repair batch. This never writes prompt
// data directly: the generated JSON must pass through merge-hindi.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = resolve(ROOT, 'data/prompts.js');
const OUTPUT_FILE = resolve(ROOT, process.argv[2] || '_handoff/phase3-hindi-line-order-repair.json');
const MARKER = 'window.PROMPT_DATA =';
const source = readFileSync(DATA_FILE, 'utf8');
const data = JSON.parse(source.slice(source.indexOf(MARKER) + MARKER.length, source.lastIndexOf(';')));

const FORMAT_LABEL = 'FORMAT THE OUTPUT — PRIMARY DELIVERABLE';
const lineShape = value => String(value || '').split('\n').map(line => line.trim() ? 1 : 0);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const placeholders = value => (String(value || '').match(/\[[^\]\n]{1,80}\]/g) || []).sort();

function uniqueLineIndex(lines, label, title) {
  const matches = [];
  lines.forEach((line, index) => { if (line.includes(label)) matches.push(index); });
  if (matches.length !== 1) throw new Error(`${title}: expected one ${label} line, found ${matches.length}`);
  return matches[0];
}

function nonblankRunEnd(lines, start) {
  let end = start;
  while (end < lines.length && lines[end].trim()) end += 1;
  return end;
}

function repairPromptText(prompt) {
  const english = String(prompt.promptText || '').split('\n');
  const hindi = String(prompt.hi.promptText || '').split('\n');
  if (english.length !== hindi.length) throw new Error(`${prompt.title}: line count differs before repair`);

  const englishFormat = uniqueLineIndex(english, FORMAT_LABEL, prompt.title);
  const hindiFormat = uniqueLineIndex(hindi, FORMAT_LABEL, prompt.title);
  const englishFormatEnd = nonblankRunEnd(english, englishFormat);
  const hindiFormatEnd = nonblankRunEnd(hindi, hindiFormat);
  const formatLength = englishFormatEnd - englishFormat;
  if (!(englishFormat < hindiFormat) || hindiFormatEnd - hindiFormat !== formatLength) {
    throw new Error(`${prompt.title}: unexpected translated FORMAT block position or length`);
  }

  // Move only the exact translated FORMAT content within the ordered nonblank
  // lines, then lay those untouched lines onto the English blank-line shape.
  // This also restores the few records where the old insertion shifted a blank
  // from before MATHS FORMATTING to after the moved FORMAT block.
  const englishOrdinal = english.slice(0, englishFormat).filter(line => line.trim()).length;
  const hindiOrdinal = hindi.slice(0, hindiFormat).filter(line => line.trim()).length;
  const nonblank = hindi.filter(line => line.trim());
  const formatSlice = nonblank.splice(hindiOrdinal, formatLength);
  nonblank.splice(englishOrdinal, 0, ...formatSlice);
  let nonblankIndex = 0;
  const repairedLines = english.map(line => line.trim() ? nonblank[nonblankIndex++] : '');
  if (nonblankIndex !== nonblank.length) throw new Error(`${prompt.title}: nonblank-line reconstruction did not consume every line`);
  const repaired = repairedLines.join('\n');
  if (repairedLines.length !== english.length || !same(lineShape(english.join('\n')), lineShape(repaired))) {
    throw new Error(`${prompt.title}: repair did not restore the English line/blank shape`);
  }
  const originalNonblank = hindi.filter(line => line.trim()).sort();
  const repairedNonblank = repairedLines.filter(line => line.trim()).sort();
  if (!same(originalNonblank, repairedNonblank)) throw new Error(`${prompt.title}: repair changed translated line content`);
  if (!same(placeholders(prompt.promptText), placeholders(repaired))) throw new Error(`${prompt.title}: repair damaged placeholders`);
  return repaired;
}

const batch = [];
for (const category of data.categories) for (const prompt of category.prompts) {
  if (!prompt.hi) continue;
  if (same(lineShape(prompt.promptText), lineShape(prompt.hi.promptText))) continue;
  batch.push({
    title: prompt.title,
    hi: { ...prompt.hi, promptText: repairPromptText(prompt) },
  });
}

if (batch.length !== 231) throw new Error(`expected 231 Hindi repairs, found ${batch.length}`);
writeFileSync(OUTPUT_FILE, `${JSON.stringify(batch, null, 2)}\n`);
console.log(`prepared ${batch.length} Hindi line-order repairs: ${OUTPUT_FILE}`);
