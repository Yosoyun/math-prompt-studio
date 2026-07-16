// Lists prompts still missing Hindi (`hi`) translations, in translation-ready chunks.
// Usage:
//   node tools/hindi-status.mjs           -> summary counts
//   node tools/hindi-status.mjs --chunks  -> writes _handoff/hindi-todo/chunk-N.json (8 prompts each)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(ROOT + '/data/prompts.js', 'utf8');
const DATA = JSON.parse(src.slice(src.indexOf('window.PROMPT_DATA =') + 'window.PROMPT_DATA ='.length, src.lastIndexOf(';')));

const todo = [];
let done = 0;
for (const c of DATA.categories) for (const p of c.prompts) {
  if (p.hi) { done++; continue; }
  todo.push({ cat: c.category, title: p.title, whatYouGet: p.whatYouGet, howToUse: p.howToUse, effectiveUsage: p.effectiveUsage, commonFix: p.commonFix, promptText: p.promptText });
}
console.log(`Hindi done: ${done} | remaining: ${todo.length}`);

if (process.argv.includes('--chunks')) {
  mkdirSync(ROOT + '/_handoff/hindi-todo', { recursive: true });
  let n = 0;
  for (let i = 0; i < todo.length; i += 8) {
    writeFileSync(ROOT + `/_handoff/hindi-todo/chunk-${n++}.json`, JSON.stringify(todo.slice(i, i + 8), null, 1));
  }
  console.log(`wrote ${n} chunk files to _handoff/hindi-todo/`);
}
