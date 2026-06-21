// Bake an output-format requirement INTO the prompts (no separate Word/PDF/PPT buttons).
// Document categories -> Word/Docs + print-to-PDF ready. Presentations -> slide deck.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const DOC_CATS = ['question-papers', 'mock-sample-papers', 'worksheets', 'dpp', 'formula-sheets', 'book-writing', 'notes-handouts', 'lesson-plans', 'classroom-admin', 'grading-rubrics-feedback', 'competitive-exams'];
const PPT_CATS = ['presentations'];

const DOC = 'OUTPUT FILE FORMAT: present the complete result as a clean, ready-to-use document I can paste straight into Microsoft Word or Google Docs - a clear bold title, section headings, neatly numbered items, comfortable spacing, and simple tables only where helpful (avoid heavy formatting that breaks on paste). It must also print cleanly to PDF on A4 (File > Print > Save as PDF). Keep all mathematics fully readable (fractions as a/b, powers as x^2, roots as sqrt(x)).';
const PPT = 'OUTPUT FILE FORMAT: present the complete result as a slide-by-slide presentation ready for PowerPoint, Google Slides, Canva or Gamma. For each slide give "Slide N - Title", then 3 to 5 short bullet points, then a "Speaker notes:" line. Begin with a title slide and end with a summary slide. Keep any mathematics fully readable.';

// already format-aware? then skip to avoid duplication
const DOC_RE = /word|google docs|google doc|print[- ]?ready|save as pdf|print to pdf|a4 pdf|paste.{0,20}(word|docs)/i;
const PPT_RE = /slide-by-slide|powerpoint|google slides|\bslides?\b|speaker notes|carousel|deck/i;

function inject(text, directive) {
  // insert just before the signature instruction so the signature stays last
  var idx = text.search(/\n[ \t]*SIGNATURE\b/i);
  if (idx === -1) idx = text.search(/At the very end add a footer|Prepared by Indrajeet Yadav|Compiled by Indrajeet Yadav|Created with the prompt collection/i);
  if (idx !== -1) { var ls = text.lastIndexOf('\n', idx - 1); var pos = ls === -1 ? idx : ls; return text.slice(0, pos) + '\n\n' + directive + text.slice(pos); }
  return text.trim() + '\n\n' + directive;
}

const src = readFileSync(ROOT + '/data/prompts.js', 'utf8');
const head = src.slice(0, src.indexOf('window.PROMPT_DATA ='));
const DATA = JSON.parse(src.slice(src.indexOf('window.PROMPT_DATA =') + 'window.PROMPT_DATA ='.length, src.lastIndexOf(';')));

let doc = 0, ppt = 0, skipped = 0, marker = 'FMT'; // unused; clarity
for (const c of DATA.categories) {
  const isDoc = DOC_CATS.includes(c.category), isPpt = PPT_CATS.includes(c.category);
  if (!isDoc && !isPpt) continue;
  for (const p of c.prompts) {
    if (p.makesImage || p.needsImage) { skipped++; continue; } // image prompts keep their own format
    if (p.promptText.includes('OUTPUT FILE FORMAT')) { skipped++; continue; } // already baked
    if (isPpt) { if (PPT_RE.test(p.promptText)) { skipped++; continue; } p.promptText = inject(p.promptText, PPT); ppt++; }
    else { if (DOC_RE.test(p.promptText)) { skipped++; continue; } p.promptText = inject(p.promptText, DOC); doc++; }
  }
}

const grand = DATA.categories.reduce((t, c) => t + c.prompts.length, 0);
const banner = '/* Maths Prompt Studio data - ' + grand + ' prompts across ' + DATA.categories.length + ' categories. Authored by Indrajeet Yadav. Auto-generated; do not edit by hand. */\n';
writeFileSync(ROOT + '/data/prompts.js', banner + 'window.PROMPT_DATA = ' + JSON.stringify(DATA) + ';\n');
console.log('Baked DOC format into', doc, 'prompts; PPT format into', ppt, 'prompts; skipped (already aware / image)', skipped + '.');
console.log('GRAND TOTAL prompts:', grand);
