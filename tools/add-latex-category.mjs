// Add a NEW category "LaTeX & Compiled-PDF Sets": the user's 2 Olympiad prompts + 10 inspired ones.
// Does not touch any existing category. Usage: node tools/add-latex-category.mjs <workflow-output>
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIG = 'Indrajeet Yadav';
const OUT = process.argv[2];
if (!OUT) { console.error('pass workflow output file'); process.exit(1); }

function clean(t) {
  if (t == null) return '';
  return String(t)
    .replace(/\$begin:math:text\$/g, '$').replace(/\$end:math:text\$/g, '$')
    .replace(/\$begin:math:display\$/g, '$$').replace(/\$end:math:display\$/g, '$$')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[‘’‚‛]/g, "'").replace(/[“”„‟]/g, '"')
    .replace(/[–—―]/g, '-').replace(/…/g, '...').replace(/ /g, ' ')
    .replace(/\r\n/g, '\n').trim();
}

// the user's two prompts (from files)
const up1 = clean(readFileSync(ROOT + '/tools/user-prompt-1.txt', 'utf8'));
const up2 = clean(readFileSync(ROOT + '/tools/user-prompt-2.txt', 'utf8'));

const userPrompts = [
  { title: 'Proofread & Recompile an Olympiad Problem Set (2 PDFs)', tag: 'Makes 2 PDFs', needsImage: true, makesImage: false,
    whatYouGet: 'Upload your problem-set files; get two corrected, mathematically verified, recompiled PDFs (problems; answer key + solutions).',
    bestTool: 'ChatGPT (with code tools) or Claude', worksOnFree: 'Needs an AI that can run code and return files - ChatGPT/Claude; free tiers may limit code or downloads',
    howToUse: 'Upload your questions/solutions PDF or LaTeX, paste this prompt, and download two corrected, compiled PDFs.',
    effectiveUsage: ['Use ChatGPT (with its code tools) or Claude.', 'Upload your files: questions PDF, solutions PDF and/or LaTeX source.', 'Paste this whole prompt and send.', 'Let it verify the maths, fix errors, and run pdflatex.', 'Download both corrected PDFs (problems; solutions).'],
    commonFix: "Reply: 'A file did not compile, or a solution looks wrong - show me the pdflatex error, fix every error and overfull line, recompile, and re-verify that solution from scratch; if any uploaded content is unreadable, ask me instead of guessing.'",
    promptText: up1, noTail: true },
  { title: 'Whiteboard Photo to Original Olympiad Problem Set (2 PDFs)', tag: 'Makes 2 PDFs', needsImage: true, makesImage: false,
    whatYouGet: 'Photograph your whiteboard; get an original, verified Olympiad problem set as two compiled PDFs (problems; answer key + solutions).',
    bestTool: 'ChatGPT (with code tools) or Claude', worksOnFree: 'Needs an AI that can run code and return files - ChatGPT/Claude; free tiers may limit code or downloads',
    howToUse: 'Snap clear photos of your whiteboard, paste this prompt, set the number and difficulty, and download two compiled PDFs.',
    effectiveUsage: ['Use ChatGPT (with code tools) or Claude.', 'Photograph the whiteboard clearly (good light, in focus).', 'Paste this prompt; set [NUMBER] and target difficulty.', 'Attach the whiteboard photo(s), then send.', 'Let it solve, verify and compile; download both PDFs.'],
    commonFix: "Reply: 'A PDF did not compile, or problem N is flawed - show me the pdflatex error, fix it and recompile, and re-check problem N (statement, all cases, and that the solution matches the key); if the board is unreadable anywhere, ask me for a sharper photo.'",
    promptText: up2, noTail: true },
];

// the 10 inspired from the workflow
const raw = JSON.parse(readFileSync(OUT, 'utf8'));
const R = typeof raw.result === 'string' ? JSON.parse(raw.result) : raw.result;
const gen = (R.prompts || []).map(p => ({
  title: clean(p.title), tag: clean(p.tag) || 'Makes 2 PDFs', needsImage: !!p.needsImage, makesImage: false,
  whatYouGet: clean(p.whatYouGet), bestTool: clean(p.bestTool) || 'ChatGPT (with code tools) or Claude',
  worksOnFree: clean(p.worksOnFree) || 'Needs an AI that can run code and return files',
  howToUse: clean(p.howToUse), commonFix: clean(p.commonFix),
  effectiveUsage: Array.isArray(p.effectiveUsage) ? p.effectiveUsage.map(clean).filter(Boolean) : [],
  promptText: clean(p.promptText), noTail: true,
}));

const category = {
  category: 'latex-pdf-sets',
  categoryTitle: 'LaTeX & Compiled-PDF Sets',
  categoryIcon: '🧾',
  group: 'Writing & Content',
  categoryBlurb: 'Senior-grade prompts that make ChatGPT or Claude PRODUCE finished, compiled PDF documents - typeset Olympiad/exam problem sets, worksheets, booklets, mock papers and solutions (minimalist black-and-white, signed Indrajeet Yadav). Best on an AI that can run code and return files.',
  prompts: userPrompts.concat(gen),
};

const src = readFileSync(ROOT + '/data/prompts.js', 'utf8');
const DATA = JSON.parse(src.slice(src.indexOf('window.PROMPT_DATA =') + 'window.PROMPT_DATA ='.length, src.lastIndexOf(';')));
if (DATA.categories.some(c => c.category === 'latex-pdf-sets')) { console.error('category already exists - aborting to avoid duplicate'); process.exit(1); }
DATA.categories.push(category);
DATA.version = '2026-06-22-latex';

const grand = DATA.categories.reduce((t, c) => t + c.prompts.length, 0);
const banner = '/* Maths Prompt Studio data - ' + grand + ' prompts across ' + DATA.categories.length + ' categories. v' + DATA.version + '. Authored by ' + SIG + '. Auto-generated; do not edit by hand. */\n';
writeFileSync(ROOT + '/data/prompts.js', banner + 'window.PROMPT_DATA = ' + JSON.stringify(DATA) + ';\n');
console.log('Added category "' + category.categoryTitle + '" with', category.prompts.length, 'prompts (2 yours + ' + gen.length + ' inspired).');
console.log('GRAND TOTAL', grand, 'across', DATA.categories.length, 'categories | version', DATA.version);
