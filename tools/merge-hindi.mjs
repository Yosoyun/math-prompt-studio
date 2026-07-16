// Merges Hindi translations into data/prompts.js WITH the mandatory QA gate.
// Input file format: JSON array of {title: "<exact English title>", hi: {title, whatYouGet, howToUse, effectiveUsage[], commonFix, promptText}}
// Usage: node tools/merge-hindi.mjs <translations.json>
//
// QA gate (a translation is REJECTED unless all pass):
//   1. The English title exists in the data (exact match).
//   2. hi.promptText contains the EXACT same set of [PLACEHOLDER] tokens as the English promptText.
//   3. hi.promptText has at least 50 Devanagari characters and hi.title at least 2.
// Rejected items are listed; fix and re-run. NEVER edit data/prompts.js by hand.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const infile = process.argv[2];
if (!infile) { console.error('usage: node tools/merge-hindi.mjs <translations.json>'); process.exit(1); }

const src = readFileSync(ROOT + '/data/prompts.js', 'utf8');
const DATA = JSON.parse(src.slice(src.indexOf('window.PROMPT_DATA =') + 'window.PROMPT_DATA ='.length, src.lastIndexOf(';')));
const byTitle = new Map();
for (const c of DATA.categories) for (const p of c.prompts) byTitle.set(p.title, p);

const toks = s => ((String(s).match(/\[[^\]\n]{1,80}\]/g)) || []).sort().join('|');
const dev = s => { const m = String(s).match(/[ऀ-ॿ]/g); return m ? m.length : 0; };

const input = JSON.parse(readFileSync(infile, 'utf8'));
let added = 0, replaced = 0; const rejected = [];
for (const t of input) {
  const p = byTitle.get(t.title);
  if (!p) { rejected.push({ title: t.title, reason: 'title not found (must match exactly)' }); continue; }
  if (!t.hi || dev(t.hi.promptText) < 50 || dev(t.hi.title || '') < 2) { rejected.push({ title: t.title, reason: 'too little Devanagari' }); continue; }
  if (toks(p.promptText) !== toks(t.hi.promptText)) { rejected.push({ title: t.title, reason: 'placeholder tokens damaged - [BRACKET] set must match English exactly' }); continue; }
  if (p.hi) replaced++; else added++;
  p.hi = t.hi;
}

const grand = DATA.categories.reduce((n, c) => n + c.prompts.length, 0);
let total = 0; DATA.categories.forEach(c => c.prompts.forEach(p => { if (p.hi) total++; }));
const banner = '/* Maths Prompt Studio data - ' + grand + ' prompts across ' + DATA.categories.length + ' categories. v' + (DATA.version || '') + '. Auto-generated; do not edit by hand. */\n';
writeFileSync(ROOT + '/data/prompts.js', banner + 'window.PROMPT_DATA = ' + JSON.stringify(DATA) + ';\n');
console.log(`merged: ${added} new + ${replaced} replaced | Hindi total: ${total}/${grand} | rejected: ${rejected.length}`);
rejected.forEach(r => console.log('  REJECTED:', r.title, '->', r.reason));
console.log('\nNow run: node tools/build-pages.mjs   (rebakes /p pages + sitemap)');
console.log('Then bump ?v= on prompts.js and app.js in index.html.');
