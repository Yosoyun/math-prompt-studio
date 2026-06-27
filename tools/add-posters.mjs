// Add a NEW category "Single-Image Solution Posters": user's 5 style prompts + 25 inspired.
// Usage: node tools/add-posters.mjs <workflow-output>
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2];
if (!OUT) { console.error('pass workflow output'); process.exit(1); }

function clean(t) {
  if (t == null) return '';
  return String(t)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[‘’‚‛]/g, "'").replace(/[“”„‟]/g, '"').replace(/[–—―]/g, '-').replace(/…/g, '...').replace(/ /g, ' ')
    .replace(/\r\n/g, '\n').trim();
}
const PRE = 'Create the poster from the maths problem I provide. FIRST read the problem (pasted below or attached as a photo), SOLVE it correctly and verify the arithmetic by an independent check, then fill every [INSERT ...] slot with the verified content and render ONE image. Problem: [PASTE THE COMPLETE PROBLEM HERE, or attach a clear photo].\n\n';
const SIGN = "\n\nSIGNATURE: add a small, elegant handwritten signature 'Indrajeet Yadav' in a bottom corner, tasteful and not overlapping any mathematics.";
const EFF = ['Open ChatGPT (Plus, image) or Gemini.', 'Paste your problem or attach a clear photo of it.', 'Paste this whole prompt and send.', 'Let it solve, verify, then render the poster.', "Check the numbers; reply 'regenerate, larger cleaner text' if needed."];
const FIX = "If the maths is wrong, reply: 'Recompute step by step, verify the answer independently, then regenerate the poster.' If it looks cluttered, reply: 'Keep all decoration in the margins only, enlarge the text, and keep the centre purely the solution.'";
const mk = (title, file, what) => ({
  title, tag: '1 image poster', needsImage: true, makesImage: true, whatYouGet: what,
  bestTool: 'ChatGPT Plus (image) or Gemini', worksOnFree: 'Needs an image-making AI (e.g. ChatGPT Plus or Gemini); free tiers limit images per day',
  howToUse: 'Paste or attach your problem, paste this style prompt, and get one beautiful solved poster.',
  effectiveUsage: EFF, commonFix: FIX,
  promptText: PRE + clean(readFileSync(ROOT + '/tools/' + file, 'utf8')) + SIGN,
});

const userPrompts = [
  mk('Botanical Watercolour Solution Poster', 'poster-1.txt', 'A calm botanical-watercolour poster on ivory paper with floral corners and a purple answer box.'),
  mk('Engineering Blueprint Machine Solution Poster', 'poster-2.txt', 'A playful engineering-blueprint "counting machine" infographic on blue graph paper with case panels.'),
  mk("Vintage Mathematician's Notebook Solution Poster", 'poster-3.txt', 'A vintage navy-ink research-notebook sheet for derivations and telescoping, with margin insights.'),
  mk('Chalkboard Gold-Ledger Solution Poster', 'poster-4.txt', 'A dramatic black-chalkboard, gold-ledger board for rank / contribution-table problems.'),
  mk('Antique Parchment Manuscript Solution Poster', 'poster-5.txt', 'A rugged antique-parchment manuscript with circled numbered steps and an answer cartouche.'),
];

const raw = JSON.parse(readFileSync(OUT, 'utf8'));
const R = typeof raw.result === 'string' ? JSON.parse(raw.result) : raw.result;
const gen = (R.prompts || []).map(p => ({
  title: clean(p.title), tag: clean(p.tag) || '1 image poster', needsImage: true, makesImage: true,
  whatYouGet: clean(p.whatYouGet), bestTool: clean(p.bestTool) || 'ChatGPT Plus (image) or Gemini',
  worksOnFree: clean(p.worksOnFree) || 'Needs an image-making AI; free tiers limit images per day',
  howToUse: clean(p.howToUse), commonFix: clean(p.commonFix),
  effectiveUsage: Array.isArray(p.effectiveUsage) ? p.effectiveUsage.map(clean).filter(Boolean) : EFF,
  promptText: clean(p.promptText),
}));

const category = {
  category: 'solution-posters',
  categoryTitle: 'Single-Image Solution Posters',
  categoryIcon: '🖼️',
  group: 'Solving & Checking',
  categoryBlurb: 'Turn ONE problem into ONE stunning, fully-solved poster image - 30 premium styles (botanical, blueprint, chalkboard, parchment, sumi-e, art deco, neon, stained-glass, palm-leaf, storybook and more). The AI solves and verifies first, then renders it, signed Indrajeet Yadav. Needs an image-making AI (e.g. ChatGPT Plus or Gemini).',
  prompts: userPrompts.concat(gen),
};

const src = readFileSync(ROOT + '/data/prompts.js', 'utf8');
const DATA = JSON.parse(src.slice(src.indexOf('window.PROMPT_DATA =') + 'window.PROMPT_DATA ='.length, src.lastIndexOf(';')));
if (DATA.categories.some(c => c.category === 'solution-posters')) { console.error('category exists - aborting'); process.exit(1); }
DATA.categories.push(category);
DATA.version = '2026-06-22-posters';
const grand = DATA.categories.reduce((t, c) => t + c.prompts.length, 0);
const banner = '/* Maths Prompt Studio data - ' + grand + ' prompts across ' + DATA.categories.length + ' categories. v' + DATA.version + '. Authored by Indrajeet Yadav. Auto-generated; do not edit by hand. */\n';
writeFileSync(ROOT + '/data/prompts.js', banner + 'window.PROMPT_DATA = ' + JSON.stringify(DATA) + ';\n');
console.log('Added "Single-Image Solution Posters" with', category.prompts.length, 'prompts (5 yours + ' + gen.length + ' inspired).');
console.log('GRAND TOTAL', grand, '| categories', DATA.categories.length, '| version', DATA.version);
