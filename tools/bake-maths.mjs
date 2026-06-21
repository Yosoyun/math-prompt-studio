// Bake a "readable maths, no raw LaTeX" rule into text prompts (fixes broken \frac{} for non-technical teachers).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const MATHS = 'MATHS FORMATTING: Write ALL mathematics so it reads correctly in a normal chat and pastes cleanly into Word or Google Docs. Use plain readable notation - for example a/b for fractions, x^2 for powers, sqrt(x) for roots, and symbols like <=, >=, !=, +-, pi, theta, integral and sum. Do NOT output raw LaTeX or code such as \\frac{}{}, \\sqrt{}, x^{2}, $...$ or \\( ... \\) - these appear as broken symbols to a teacher in a free chat.';

function inject(text, directive) {
  var idx = text.search(/\n[ \t]*SIGNATURE\b/i);
  if (idx === -1) idx = text.search(/At the very end add a footer|Prepared by Indrajeet Yadav|Compiled by Indrajeet Yadav|Created with the prompt collection/i);
  if (idx !== -1) { var ls = text.lastIndexOf('\n', idx - 1); var pos = ls === -1 ? idx : ls; return text.slice(0, pos) + '\n\n' + directive + text.slice(pos); }
  return text.trim() + '\n\n' + directive;
}

const src = readFileSync(ROOT + '/data/prompts.js', 'utf8');
const DATA = JSON.parse(src.slice(src.indexOf('window.PROMPT_DATA =') + 'window.PROMPT_DATA ='.length, src.lastIndexOf(';')));

let done = 0, skipped = 0;
for (const c of DATA.categories) {
  for (const p of c.prompts) {
    if (p.makesImage) { skipped++; continue; }                 // image prompts: not text maths
    if (/MATHS FORMATTING|do not output raw LaTeX|no LaTeX|Unicode plain text/i.test(p.promptText)) { skipped++; continue; }
    p.promptText = inject(p.promptText, MATHS); done++;
  }
}

DATA.version = '2026-06-18-v8';
const grand = DATA.categories.reduce((t, c) => t + c.prompts.length, 0);
const banner = '/* Maths Prompt Studio data - ' + grand + ' prompts across ' + DATA.categories.length + ' categories. v' + DATA.version + '. Authored by Indrajeet Yadav. Auto-generated; do not edit by hand. */\n';
writeFileSync(ROOT + '/data/prompts.js', banner + 'window.PROMPT_DATA = ' + JSON.stringify(DATA) + ';\n');
console.log('Baked maths-formatting rule into', done, 'text prompts; skipped', skipped, '(image / already had it).');
console.log('GRAND TOTAL:', grand, '| version', DATA.version);
