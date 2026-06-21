// Append premium prompts (from a quality-prompts workflow output) into existing categories in data/prompts.js
// Usage: node tools/merge-extra.mjs <workflow-output-file>
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIG = 'Indrajeet Yadav';
const OUT = process.argv[2];
if (!OUT) { console.error('pass workflow output file'); process.exit(1); }

function sanitize(t) {
  if (t == null) return '';
  return String(t)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/[‘’‚‛]/g, "'").replace(/[“”„‟]/g, '"').replace(/[–—―]/g, '-').replace(/…/g, '...').replace(/ /g, ' ').replace(/[•]/g, '-').replace(/→/g, '->')
    .replace(/\r\n/g, '\n').trim();
}
function ensureSig(t, img) { const s = sanitize(t); return s.includes(SIG) ? s : s + (img ? `\n\nSIGNATURE: sign the bottom-right of every page with an elegant handwritten signature "${SIG}".` : `\n\nPrepared by ${SIG}`); }

// load existing data
const src = readFileSync(ROOT + '/data/prompts.js', 'utf8');
const head = src.slice(0, src.indexOf('window.PROMPT_DATA ='));
const DATA = JSON.parse(src.slice(src.indexOf('window.PROMPT_DATA =') + 'window.PROMPT_DATA ='.length, src.lastIndexOf(';')));
const byslug = {}; DATA.categories.forEach(c => byslug[c.category] = c);

// load extras
const raw = JSON.parse(readFileSync(OUT, 'utf8'));
const R = typeof raw.result === 'string' ? JSON.parse(raw.result) : raw.result;
let added = 0, skippedDup = 0;
for (const cat of (R.categories || [])) {
  const target = byslug[cat.category];
  if (!target) { console.warn('no matching category for', cat.category, '- skipping'); continue; }
  const existingTitles = new Set(target.prompts.map(p => p.title.toLowerCase().trim()));
  for (const p of (cat.prompts || [])) {
    const title = sanitize(p.title);
    if (existingTitles.has(title.toLowerCase().trim())) { skippedDup++; continue; }
    target.prompts.push({
      title, tag: sanitize(p.tag), needsImage: !!p.needsImage, makesImage: !!p.makesImage,
      whatYouGet: sanitize(p.whatYouGet), bestTool: sanitize(p.bestTool), worksOnFree: sanitize(p.worksOnFree),
      howToUse: sanitize(p.howToUse), commonFix: sanitize(p.commonFix),
      effectiveUsage: Array.isArray(p.effectiveUsage) ? p.effectiveUsage.map(sanitize).filter(Boolean) : [],
      promptText: ensureSig(p.promptText, !!p.needsImage || !!p.makesImage),
    });
    existingTitles.add(title.toLowerCase().trim()); added++;
  }
}

const grand = DATA.categories.reduce((t, c) => t + c.prompts.length, 0);
const banner = '/* Maths Prompt Studio data - ' + grand + ' prompts across ' + DATA.categories.length + ' categories. Authored by ' + SIG + '. Auto-generated; do not edit by hand. */\n';
writeFileSync(ROOT + '/data/prompts.js', banner + 'window.PROMPT_DATA = ' + JSON.stringify(DATA) + ';\n');
console.log('added', added, 'premium prompts (' + skippedDup + ' dupes skipped). GRAND TOTAL now', grand);
