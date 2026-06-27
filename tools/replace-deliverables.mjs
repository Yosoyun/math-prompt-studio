// Replace the 10 deliverable prompts (by EXACT title) with the deeper multi-format rewrites.
// Keeps titles/slugs/links stable. Renames the category to reflect PDF/Word/PPT. Usage: node tools/replace-deliverables.mjs <workflow-output>
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2];
if (!OUT) { console.error('pass workflow output file'); process.exit(1); }

function clean(t) {
  if (t == null) return '';
  return String(t)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[‘’‚‛]/g, "'").replace(/[“”„‟]/g, '"').replace(/[–—―]/g, '-').replace(/…/g, '...').replace(/ /g, ' ')
    .replace(/\r\n/g, '\n').trim();
}
const norm = s => clean(s).toLowerCase().replace(/\s+/g, ' ').trim();

const raw = JSON.parse(readFileSync(OUT, 'utf8'));
const R = typeof raw.result === 'string' ? JSON.parse(raw.result) : raw.result;
const byTitle = {};
(R.prompts || []).forEach(p => { byTitle[norm(p.title)] = p; });

const src = readFileSync(ROOT + '/data/prompts.js', 'utf8');
const DATA = JSON.parse(src.slice(src.indexOf('window.PROMPT_DATA =') + 'window.PROMPT_DATA ='.length, src.lastIndexOf(';')));
const cat = DATA.categories.find(c => c.category === 'latex-pdf-sets');
if (!cat) { console.error('latex-pdf-sets category not found'); process.exit(1); }

let replaced = 0; const matchedTitles = new Set(); const unmatchedExisting = [];
for (const p of cat.prompts) {
  const nw = byTitle[norm(p.title)];
  if (!nw) { if (!/proofread|whiteboard/i.test(p.title)) unmatchedExisting.push(p.title); continue; } // user's 2 are intentionally untouched
  p.promptText = clean(nw.promptText);
  p.tag = clean(nw.tag) || 'PDF / Word / PPT';
  p.whatYouGet = clean(nw.whatYouGet);
  p.bestTool = clean(nw.bestTool) || 'ChatGPT (with code tools) or Claude';
  p.worksOnFree = clean(nw.worksOnFree) || 'Needs an AI that can run code and return files; a copy-paste fallback is built in';
  p.howToUse = clean(nw.howToUse);
  p.commonFix = clean(nw.commonFix);
  p.effectiveUsage = Array.isArray(nw.effectiveUsage) ? nw.effectiveUsage.map(clean).filter(Boolean) : p.effectiveUsage;
  p.needsImage = !!nw.needsImage; p.makesImage = false; p.noTail = true;
  replaced++; matchedTitles.add(norm(p.title));
}

const unmatchedNew = Object.keys(byTitle).filter(t => !matchedTitles.has(t));

// refresh the category framing for multi-format
cat.categoryTitle = 'Ready Documents - PDF, Word & PPT';
cat.categoryIcon = '🧾';
cat.categoryBlurb = 'Senior-grade prompts that make ChatGPT or Claude PRODUCE a finished, deeply useful document a teacher or student actually learns from - typeset Olympiad/exam problem sets, worksheets, DPP booklets, formula handbooks, papers, lecture handouts and solutions. Choose your format: PDF, Word (.docx) or PowerPoint (.pptx). Best on an AI that can run code and return files (a copy-paste fallback is built in).';

DATA.version = '2026-06-22-deliv2';
const grand = DATA.categories.reduce((t, c) => t + c.prompts.length, 0);
const banner = '/* Maths Prompt Studio data - ' + grand + ' prompts across ' + DATA.categories.length + ' categories. v' + DATA.version + '. Authored by Indrajeet Yadav. Auto-generated; do not edit by hand. */\n';
writeFileSync(ROOT + '/data/prompts.js', banner + 'window.PROMPT_DATA = ' + JSON.stringify(DATA) + ';\n');

console.log('Replaced', replaced, 'deliverable prompts with deeper multi-format versions.');
if (unmatchedExisting.length) console.log('WARN existing not matched (kept old):', unmatchedExisting);
if (unmatchedNew.length) console.log('WARN new not matched to any existing title:', unmatchedNew);
console.log('GRAND TOTAL', grand, '| version', DATA.version);
