// Report valid Bengali, Marathi or Telugu coverage and optionally write chunks.
// Usage: node tools/lang-status.mjs --lang bn|mr|te [--chunks] [--force]
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { languageConfig, validateTranslation } from './lang-qa.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const langIndex = args.indexOf('--lang');
const lang = langIndex >= 0 ? args[langIndex + 1] : '';
if (!lang) {
  console.error('usage: node tools/lang-status.mjs --lang bn|mr|te [--chunks] [--force]');
  process.exit(1);
}
const config = languageConfig(lang);
const source = readFileSync(resolve(ROOT, 'data/prompts.js'), 'utf8');
const marker = 'window.PROMPT_DATA =';
const DATA = JSON.parse(source.slice(source.indexOf(marker) + marker.length, source.lastIndexOf(';')));
const contract = readFileSync(resolve(ROOT, '_handoff/tool-link-contract.txt'), 'utf8').trim();
const todo = [];
const invalid = [];
let done = 0;
for (const category of DATA.categories) for (const prompt of category.prompts) {
  const translation = prompt[lang];
  const errors = translation ? validateTranslation(prompt, translation, config, contract) : ['translation missing'];
  if (!errors.length) {
    done += 1;
    continue;
  }
  if (translation) invalid.push({ title: prompt.title, errors });
  todo.push({
    cat: category.category, title: prompt.title, whatYouGet: prompt.whatYouGet,
    howToUse: prompt.howToUse, effectiveUsage: prompt.effectiveUsage,
    commonFix: prompt.commonFix, promptText: prompt.promptText,
  });
}
console.log(`${config.label} done: ${done} | remaining: ${todo.length} | invalid: ${invalid.length}`);
for (const item of invalid.slice(0, 30)) console.log(`  INVALID: ${item.title} -> ${item.errors.join('; ')}`);
if (invalid.length > 30) console.log(`  ...and ${invalid.length - 30} more invalid translations`);

if (args.includes('--chunks')) {
  const directory = resolve(ROOT, `_handoff/${lang}-todo`);
  if (existsSync(directory) && readdirSync(directory).length && !args.includes('--force')) {
    console.error(`refusing to replace non-empty _handoff/${lang}-todo/; preserve in-progress work or rerun with --force`);
    process.exit(1);
  }
  if (existsSync(directory)) rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  let count = 0;
  for (let index = 0; index < todo.length; index += 8) {
    writeFileSync(resolve(directory, `chunk-${count++}.json`), JSON.stringify(todo.slice(index, index + 8), null, 1));
  }
  console.log(`wrote ${count} chunk files to _handoff/${lang}-todo/`);
}
if (invalid.length) process.exitCode = 1;
