// Reformat data/prompts.js with one complete prompt object per physical line.
// This preserves every value while making line-oriented audits count prompt records.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = resolve(ROOT, 'data/prompts.js');
const MARKER = 'window.PROMPT_DATA =';
const CONTRACT_MARKER = 'TOOL-LINK OUTPUT CONTRACT';

const source = readFileSync(DATA_FILE, 'utf8');
const markerIndex = source.indexOf(MARKER);
if (markerIndex < 0) throw new Error('window.PROMPT_DATA marker not found');

const banner = source.slice(0, markerIndex);
const data = JSON.parse(source.slice(markerIndex + MARKER.length, source.lastIndexOf(';')));
const { categories, ...topLevel } = data;
if (!Array.isArray(categories)) throw new Error('categories must be an array');

const topEntries = Object.entries(topLevel).map(([key, value]) => `${JSON.stringify(key)}:${JSON.stringify(value)}`);
const lines = [`{${topEntries.length ? `${topEntries.join(',')},` : ''}"categories":[`];

categories.forEach((category, categoryIndex) => {
  const { prompts, ...categoryMeta } = category;
  if (!Array.isArray(prompts)) throw new Error(`${category.category || categoryIndex}: prompts must be an array`);
  const meta = Object.entries(categoryMeta).map(([key, value]) => `${JSON.stringify(key)}:${JSON.stringify(value)}`).join(',');
  lines.push(`  {${meta ? `${meta},` : ''}"prompts":[`);
  prompts.forEach((prompt, promptIndex) => {
    const comma = promptIndex === prompts.length - 1 ? '' : ',';
    lines.push(`    ${JSON.stringify(prompt)}${comma}`);
  });
  const comma = categoryIndex === categories.length - 1 ? '' : ',';
  lines.push(`  ]}${comma}`);
});
lines.push(']}');

const formattedJson = lines.join('\n');
const reparsed = JSON.parse(formattedJson);
if (!isDeepStrictEqual(reparsed, data)) throw new Error('formatting changed prompt data');

const output = `${banner}${MARKER} ${formattedJson};\n`;
const contractLines = output.split('\n').filter(line => line.includes(CONTRACT_MARKER)).length;
if (contractLines !== 275) throw new Error(`expected 275 contract-bearing prompt lines, found ${contractLines}`);

writeFileSync(DATA_FILE, output);
console.log(`Formatted ${categories.reduce((sum, category) => sum + category.prompts.length, 0)} prompts; contract-bearing lines: ${contractLines}.`);
