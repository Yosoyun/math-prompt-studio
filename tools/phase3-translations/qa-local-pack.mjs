#!/usr/bin/env node
/**
 * Read-only QA adapter for a partial or complete local IndicTrans2 pack.
 *
 * Input uses the exact merge-lang.mjs shape:
 *   [{ title: "Exact English title", bn|mr|te: { ...translation fields } }]
 *
 * This script deliberately imports the shared Phase 3 validator. It never
 * writes data/prompts.js and is safe to call at every resumable checkpoint.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { languageConfig, validateTranslation } from '../lang-qa.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const MARKER = 'window.PROMPT_DATA =';
const args = process.argv.slice(2);
const valueAfter = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : '';
};
const lang = valueAfter('--lang');
const inputName = valueAfter('--input');
if (!lang || !inputName) {
  console.error('usage: node tools/phase3-translations/qa-local-pack.mjs --lang bn|mr|te --input <partial-pack.json>');
  process.exit(2);
}

const config = languageConfig(lang);
const dataSource = readFileSync(resolve(ROOT, 'data/prompts.js'), 'utf8');
const data = JSON.parse(dataSource.slice(dataSource.indexOf(MARKER) + MARKER.length, dataSource.lastIndexOf(';')));
const prompts = data.categories.flatMap(category => category.prompts);
const byTitle = new Map(prompts.map(prompt => [prompt.title, prompt]));
const contract = readFileSync(resolve(ROOT, '_handoff/tool-link-contract.txt'), 'utf8').trim();
const input = JSON.parse(readFileSync(resolve(process.cwd(), inputName), 'utf8'));
const errors = [];
const seen = new Set();

if (!Array.isArray(input)) {
  errors.push('pack root must be an array');
} else if (input.length === 0) {
  errors.push('pack must contain at least one translation record');
} else {
  for (const [index, record] of input.entries()) {
    const title = record && record.title;
    if (typeof title !== 'string' || !title) {
      errors.push(`record ${index}: exact English title missing`);
      continue;
    }
    if (seen.has(title)) {
      errors.push(`${title}: duplicate English title`);
      continue;
    }
    seen.add(title);
    const prompt = byTitle.get(title);
    if (!prompt) {
      errors.push(`${title}: exact English title not found`);
      continue;
    }
    for (const error of validateTranslation(prompt, record[lang], config, contract)) {
      errors.push(`${title}: ${error}`);
    }
  }
}

const report = {
  ok: errors.length === 0,
  language: lang,
  checked: Array.isArray(input) ? input.length : 0,
  corpus: prompts.length,
  errors,
};
process.stdout.write(`${JSON.stringify(report)}\n`);
if (errors.length) process.exitCode = 1;
