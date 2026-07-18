// Merge Bengali, Marathi or Telugu translations into generated prompt data.
// Usage: node tools/merge-lang.mjs --lang bn|mr|te <translations.json>
// Input: [{title:"Exact English title", bn|mr|te:{title,whatYouGet,
//         howToUse,effectiveUsage,commonFix,promptText}}]
import {
  closeSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { languageConfig, validateTranslation } from './lang-qa.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const langIndex = args.indexOf('--lang');
const lang = langIndex >= 0 ? args[langIndex + 1] : '';
const infile = args.find((value, index) => value !== '--lang' && index !== langIndex + 1);
if (!lang || !infile) {
  console.error('usage: node tools/merge-lang.mjs --lang bn|mr|te <translations.json>');
  process.exit(1);
}
const config = languageConfig(lang);
const DATA_FILE = resolve(ROOT, 'data/prompts.js');
const CONTRACT_FILE = resolve(ROOT, '_handoff/tool-link-contract.txt');
const MARKER = 'window.PROMPT_DATA =';
function parsePromptData(source, label) {
  const markerIndex = source.indexOf(MARKER);
  const end = source.lastIndexOf(';');
  if (markerIndex < 0 || end < markerIndex + MARKER.length) throw new Error(`${label}: prompt-data marker or terminator missing`);
  return JSON.parse(source.slice(markerIndex + MARKER.length, end));
}

function writePromptDataAtomically(output, expected) {
  const directory = dirname(DATA_FILE);
  const temporary = resolve(directory, `.${basename(DATA_FILE)}.${process.pid}.${Date.now()}.tmp`);
  let descriptor;
  try {
    descriptor = openSync(temporary, 'wx', 0o644);
    writeFileSync(descriptor, output, 'utf8');
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;

    // Parse the fully flushed candidate before publication, then parse the
    // renamed file again so a successful CLI run always leaves readable data.
    const staged = parsePromptData(readFileSync(temporary, 'utf8'), 'staged data/prompts.js');
    if (JSON.stringify(staged) !== JSON.stringify(expected)) throw new Error('staged data/prompts.js differs from the merge result');
    renameSync(temporary, DATA_FILE);
    const persisted = parsePromptData(readFileSync(DATA_FILE, 'utf8'), 'persisted data/prompts.js');
    if (JSON.stringify(persisted) !== JSON.stringify(expected)) throw new Error('persisted data/prompts.js differs from the merge result');
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

const source = readFileSync(DATA_FILE, 'utf8');
const DATA = parsePromptData(source, 'data/prompts.js');
const contract = readFileSync(CONTRACT_FILE, 'utf8').trim();
const byTitle = new Map();
for (const category of DATA.categories) for (const prompt of category.prompts) byTitle.set(prompt.title, prompt);

const input = JSON.parse(readFileSync(resolve(process.cwd(), infile), 'utf8'));
if (!Array.isArray(input)) throw new Error('translation input must be a JSON array');
let added = 0;
let replaced = 0;
const rejected = [];
const seen = new Set();
for (const record of input) {
  const title = record && record.title;
  if (seen.has(title)) {
    rejected.push({ title, reason: 'duplicate English title in input' });
    continue;
  }
  seen.add(title);
  const prompt = byTitle.get(title);
  if (!prompt) {
    rejected.push({ title, reason: 'title not found (must match exactly)' });
    continue;
  }
  const translation = record[lang];
  const errors = validateTranslation(prompt, translation, config, contract);
  if (errors.length) {
    rejected.push({ title, reason: errors.join('; ') });
    continue;
  }
  if (prompt[lang]) replaced += 1;
  else added += 1;
  prompt[lang] = translation;
}

const grand = DATA.categories.reduce((count, category) => count + category.prompts.length, 0);
let total = 0;
for (const category of DATA.categories) for (const prompt of category.prompts) {
  if (prompt[lang] && !validateTranslation(prompt, prompt[lang], config, contract).length) total += 1;
}
const phase3Configs = Object.fromEntries(['bn', 'mr', 'te'].map(code => [code, languageConfig(code)]));
const phase3Complete = DATA.categories.every(category => category.prompts.every(prompt =>
  ['bn', 'mr', 'te'].every(code => prompt[code] && !validateTranslation(prompt, prompt[code], phase3Configs[code], contract).length)));
if (phase3Complete && !String(DATA.version || '').includes('phase3-five-languages')) DATA.version = `${DATA.version || '2026-07-17'}-phase3-five-languages`;
const banner = `/* Maths Prompt Studio data - ${grand} prompts across ${DATA.categories.length} categories. v${DATA.version || ''}. Auto-generated; do not edit by hand. */\n`;
writePromptDataAtomically(`${banner}${MARKER} ${JSON.stringify(DATA)};\n`, DATA);
console.log(`merged: ${added} new + ${replaced} replaced | ${config.label} total: ${total}/${grand} | rejected: ${rejected.length}`);
for (const item of rejected) console.log(`  REJECTED: ${item.title || '(missing title)'} -> ${item.reason}`);
if (rejected.length) process.exitCode = 1;
