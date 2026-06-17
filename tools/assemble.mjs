// Assemble data/prompts.js (v2) from the content-workflow output + the 18 flagship art styles.
// Usage: node tools/assemble.mjs <workflow-output-file>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIG = 'Indrajeet Yadav';
const OUTFILE = process.argv[2];
if (!OUTFILE) { console.error('pass workflow output file path'); process.exit(1); }

const raw = JSON.parse(readFileSync(OUTFILE, 'utf8'));
const R = typeof raw.result === 'string' ? JSON.parse(raw.result) : raw.result;
const categories = R.categories || [];

function sanitize(t) {
  if (t == null) return '';
  return String(t)
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—―]/g, '-')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    .replace(/[•]/g, '-')
    .replace(/→/g, '->')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\r\n/g, '\n').trim();
}
function ensureSig(t, isImage) {
  const s = sanitize(t);
  if (s.includes(SIG)) return s;
  return s + (isImage
    ? `\n\nSIGNATURE: sign the bottom-right of every page with an elegant handwritten signature "${SIG}" with a small underline flourish.`
    : `\n\nPrepared by ${SIG}`);
}

function buildStylePrompt(s) {
  const NAME = s.name, U = NAME.toUpperCase();
  return `ROLE
Act as an expert mathematics educator, proof-checker, handwriting art director and premium editorial illustrator.

TASK
Transform the mathematics problem in the attached image into a coordinated five-image handwritten solution collection in the style: ${NAME}.

USE THE ATTACHED MATHEMATICS-PROBLEM IMAGE AS THE SOLE SOURCE OF THE QUESTION.
(No image handy? Then add this line: "Here is the question instead: [PASTE THE FULL QUESTION HERE]".)

NON-NEGOTIABLE OUTPUT CONTRACT
1. Produce EXACTLY FIVE SEPARATE portrait images/files.
2. These are five independent full-page outputs, not five panels on one canvas.
3. Never create a collage, contact sheet, grid, montage, carousel sheet, split canvas or combined poster.
4. Each image must show the SAME complete question at the top.
5. Each image must contain ONLY ONE solution method:
   - Image 1: Method 1 only
   - Image 2: Method 2 only
   - Image 3: Method 3 only
   - Image 4: Method 4 only
   - Image 5: Method 5 only
6. Never place two methods on one image. Never continue one method onto another image.
7. Return the five outputs as five distinct image attachments/files.
8. Before finalising, count the files: the correct count is 5.

CRITICAL SINGLE-IMAGE FALLBACK
If your interface can generate only one image in a single response, DO NOT compress all five pages into that image. Generate PAGE 1 ONLY as one complete portrait image. Then, in the next message, create PAGE 2 ONLY; continue separately until PAGE 5. Preserve the same paper family, handwriting personality and signature across all five generations. Under no circumstances solve the limitation by making a collage.

MATHEMATICAL RECONSTRUCTION AND VERIFICATION
- Read the attached image carefully and transcribe the exact selected problem, including question number, symbols, powers, roots, factorials, limits, inequalities, diagrams, labels, units, answer choices and restrictions.
- When handwritten work is visible, treat it only as reference. Independently verify it and silently correct errors.
- If several questions appear, select the clearly marked or most prominent one and do not mix problems.
- Solve the problem internally first. Verify the final result by at least two independent checks.
- Choose five genuinely different mathematical viewpoints. Cosmetic rearrangements do not count as different methods.
- If five standard methods are unavailable, use valid alternatives such as direct derivation, structural identity, graphical/geometric interpretation, theorem-based route, reverse verification, invariant, generalisation or computational pattern followed by proof.
- Never invent a theorem, assumption, value or diagram detail.
- Every page must reach the same verified final answer.

REQUIRED PAGE STRUCTURE - REPEAT ON ALL FIVE IMAGES
A. Top question area: write the exact question number and instruction (e.g. "Q1. Evaluate"), reproduce the full question, add a thin hand-drawn divider below it.
B. Method heading: "Method [page number] : [precise method name]" as a large handwritten title with an elegant underline.
C. One complete method only: circled handwritten step numbers (1)(2)(3)..., all essential reasoning, identities, conditions and intermediate steps, aligned and readable, with only mathematically useful mini-sketches/arrows/braces.
D. Final answer: a centred double-line handwritten box with the exact verified final answer (units, solution set, equality case or correct option). Identical on all five images.
E. Signature: bottom right of every image must carry the elegant handwritten signature "${SIG}" with a natural underline flourish.

HANDWRITING REALISM
Everything must look genuinely handwritten (headings, mathematics, labels, signature) by one consistent master-teacher personality, with natural stroke-pressure variation and slight baseline irregularity. Mathematics must remain fully legible. Do not use a rigid typed script font.

COMPOSITION AND LEGIBILITY
Portrait full-page composition, approximately A4 ratio. Keep safe margins so nothing is cropped. Use generous spacing; do not shrink writing to cram content. Keep decoration in empty corners. No watermarks, logos, extra names, motivational quotes or unrelated objects.

FINAL PRE-OUTPUT CHECK
File count = 5; each portrait and readable; same full question on all five; one method per file; five genuinely different methods; same verified final answer; "${SIG}" bottom right on every file; no collage/grid/combined canvas/cropped content/typed-poster look.

STYLE DIRECTION - ${U}
Concept: ${s.concept}
Surface: ${s.surface}
Handwriting and colour: ${s.handwriting}
Decorative language: ${s.decorative}
Composition: ${s.composition}
Premium-quality test: ${s.premiumTest}

STYLE-SPECIFIC NEGATIVE RULES
- Do not substitute a generic white worksheet background.
- Do not use flat digital gradients, stock textures or clip-art decoration.
- Do not make all strokes perfectly uniform.
- Do not let visual styling reduce equation accuracy or readability.
- Do not repeat identical corner decoration on every page; vary it subtly while preserving the same visual family.

FINAL COMMAND
Generate five separate portrait image files under the output contract above. If only one image can be generated at a time, generate Page 1 only now and keep Pages 2-5 for separate subsequent messages. Never combine them.

Created with the prompt collection by ${SIG}.`;
}

const ORIGINALS = [
  { name:'Vintage Parchment Masterclass', icon:'📜', whatYouGet:'Five antique parchment pages with multicolour fountain-pen working and botanical flourishes.', concept:'Antique scholarly notebook with torn edges, multicolour fountain-pen notes and restrained botanical flourishes.', surface:'Warm antique parchment, tactile fibres, faint ruled lines, faded red left margin, uneven torn edges, darkened corners, subtle folds, tiny stains and soft natural shadows.', handwriting:'Confident royal-blue fountain-pen handwriting; violet headings; green observations; muted maroon emphasis; light graphite rough notes.', decorative:'Small hand-drawn leaves, miniature flowers, restrained vines and one delicate divider ornament.', composition:'Classic teacher notebook: generous margins, aligned derivations, spacious circled steps, balanced visual rhythm.', premiumTest:'Museum-quality physical-paper realism, nuanced ink pressure, slightly imperfect baselines, no sterile digital symmetry.' },
  { name:'Dark Academia Mathematical Manuscript', icon:'🕯️', whatYouGet:'Five moody old-library manuscript pages with oxblood titles and refined marginalia.', concept:'Moody old-library scholar aesthetic with sepia paper, oxblood accents and refined marginalia.', surface:'Deep ivory handmade paper, aged sepia wash, soft foxing, worn book-page edges, faint ledger ruling and subtle binding shadow.', handwriting:'Midnight-blue ink, oxblood method titles, forest-green marginal notes and graphite construction marks.', decorative:'Tiny classical scrollwork, laurel sprigs, small stars and discreet archival annotation marks.', composition:'Formal manuscript composition with disciplined spacing, narrow side annotations and elegant theorem callouts.', premiumTest:'Rich tonal depth, realistic ink absorption, antique-library atmosphere, sophisticated rather than gloomy.' },
  { name:'Indian Heritage Gurukul Journal', icon:'🪔', whatYouGet:'Five warm handmade-paper pages with indigo ink and restrained Indian manuscript motifs.', concept:'Premium handmade-paper mathematics notes inspired by Indian manuscript craft, without ornamental excess.', surface:'Warm khadi-style handmade sheet, visible fibres, soft saffron-beige tone, faint ruling, muted red margin and gently weathered deckled edges.', handwriting:'Deep indigo main derivation, aubergine headings, leaf-green hints, muted kumkum-red emphasis and pencil-grey sketches.', decorative:'Subtle lotus-line motifs, fine mango-leaf curves, tiny diya-like flourishes and restrained geometric borders.', composition:'Teacher-led gurukul notebook with clear hierarchy, airy equations and dignified hand-drawn separators.', premiumTest:'Authentic craft texture, elegant cultural restraint, no festival-poster appearance and no loud ornamental frame.' },
  { name:'Japanese Washi Zen Mathematics', icon:'🌸', whatYouGet:'Five calm washi pages with brush-pen ink, sakura accents and abundant breathing space.', concept:'Minimal, tactile washi paper with expressive ink rhythm, calm spacing and delicate botanical marks.', surface:'Cream washi sheet with visible natural fibres, feathered edges, faint grey ruling, a muted vermilion margin and soft folded-paper texture.', handwriting:'Indigo-blue handwriting with varied brush-pen pressure, plum-purple headings, moss-green notes and pale graphite guides.', decorative:'Tiny sakura petals, one bamboo-leaf sketch, small enso-inspired divider and sparse red seal-like accent.', composition:'Calm asymmetrical balance, abundant breathing space, precise equations and minimal but meaningful marginal notes.', premiumTest:'Quiet luxury, tactile realism, natural ink pooling and no cartoon/anime styling.' },
  { name:'Renaissance Inventor Codex', icon:'⚙️', whatYouGet:'Five inventor-folio pages with analytical sketches, compass arcs and master-teacher side notes.', concept:'Inventive old-world mathematics folio with analytical sketches, arrows and master-teacher marginalia.', surface:'Aged cream folio, deckled perimeter, fine grain, subtle watermarks, light folds, brown edge wear and pale ruling.', handwriting:'Cobalt-blue handwritten derivation, violet section headings, olive-green insight notes, burgundy callouts and graphite diagrams.', decorative:'Small gear-like geometry doodles, compass arcs, proportional sketches, arrows and restrained leaf scrolls.', composition:'Codex composition with central derivation, intelligent side sketches and carefully grouped formula blocks.', premiumTest:'Scholarly invention-book realism, hand-measured imperfections, fine linework and no theatrical fantasy props.' },
  { name:'Celestial Observatory Notebook', icon:'🔭', whatYouGet:'Five dusk-toned astronomy-journal pages with constellations and a luminous answer box.', concept:'Elegant astronomical study journal with subtle constellations, orbit lines and luminous mathematical order.', surface:'Warm dusk-beige notebook paper, faint blue-grey ruling, red margin, weathered edges, soft crease texture and delicate speckling.', handwriting:'Deep blue main ink, violet headings, emerald notes, muted rose emphasis and graphite orbital sketches.', decorative:'Tiny constellations, orbit arcs, miniature stars, crescent marks and one fine celestial divider.', composition:'Clean vertical flow with balanced side diagrams and a strong luminous final-answer box.', premiumTest:'Refined observatory-journal mood, restrained wonder, realistic pen texture and no children space-poster look.' },
  { name:'Botanical Watercolour Mathematics Journal', icon:'🌿', whatYouGet:'Five soft ivory journal pages with delicate watercolour botanical corner studies.', concept:'Soft heirloom study page with botanical corner studies and controlled watercolour accents.', surface:'Warm ivory cotton paper, subtle tooth, faint horizontal ruling, dusty rose margin, soft deckled edges and gentle age patina.', handwriting:'Royal-blue ink, violet headings, botanical green notes, muted berry emphasis and graphite underdrawing.', decorative:'Fine hand-sketched herbs, tiny wildflowers, leaves and faint translucent watercolour touches only in empty corners.', composition:'Spacious premium journal page with centred equation groups, graceful step spacing and uncluttered margins.', premiumTest:'Delicate handcrafted depth, realistic pigment bleed, elegant restraint and no stock-clip-art flowers.' },
  { name:'Architectural Blueprint Study Sheet', icon:'📘', whatYouGet:'Five pale-blue drafting pages with technical linework, dimension arrows and construction marks.', concept:'Precision-driven mathematical drafting page with technical linework, construction marks and handwritten authority.', surface:'Aged pale-blue drafting paper with faint grid and ruling, worn edges, subtle fold lines and a restrained red margin.', handwriting:'Dark navy handwritten equations, violet titles, green dimensional notes, maroon checkpoints and graphite construction lines.', decorative:'Tiny ruler ticks, compass arcs, section markers, dimension arrows and minimal geometric corner motifs.', composition:'Architectural hierarchy: exact alignment, generous annotation lanes, clean equation blocks and structured visual logic.', premiumTest:'Real drafting-table tactility, authentic pencil overlays, measured irregularity and no computer-CAD typography.' },
  { name:'Midnight Black-and-Gold Atelier', icon:'🌑', whatYouGet:'Five charcoal-black pages with luminous ivory ink and antique-gold headings.', concept:'Luxurious dark handmade sheet with luminous ink hierarchy and exceptionally controlled ornament.', surface:'Matte charcoal-black handmade paper with subtle fibres, soft worn edges, faint grey ruling and a muted burgundy margin.', handwriting:'Opaque ivory or pale-blue main handwriting, antique-gold headings, sage-green notes, muted rose highlights and silver-grey pencil marks.', decorative:'Fine gold-line flourishes, tiny stars, restrained corner vines and one elegant metallic divider.', composition:'High-contrast luxury composition with ample negative space, large readable equations and a commanding answer box.', premiumTest:'Realistic metallic ink, matte paper depth, sophisticated atelier finish and no neon/glowing digital effects.' },
  { name:'Master Chalkboard Classroom', icon:'🧑‍🏫', whatYouGet:'Five slate-chalkboard pages with white-chalk working and a double-chalk final-answer box.', concept:'Collector-quality blackboard solution sheet that feels genuinely hand-rendered by an exceptional mathematics teacher.', surface:'Deep slate chalkboard surface with subtle grain, erased ghost marks, faint ruling guides and natural edge wear.', handwriting:'Soft white and pale-blue chalk for derivation, violet chalk headings, green hints, muted pink emphasis and grey construction marks.', decorative:'Small chalk stars, leafy corner curls, arrows, underlines and one restrained classroom flourish.', composition:'Large readable classroom handwriting, clean vertical sequencing, spacious steps and a double-chalk final box.', premiumTest:'Authentic chalk dust, pressure variation, smudged edges in moderation and no flat digital black background.' },
];

let newStyles = [];
try { newStyles = JSON.parse(readFileSync(ROOT + '/tools/new-styles.json', 'utf8')); } catch (e) { console.warn('no new-styles.json; using originals only'); }

const allStyles = ORIGINALS.concat(newStyles.map(s => ({
  name: s.name, icon: s.icon || '✨',
  whatYouGet: s.whatYouGet || ('Five ' + s.name + ' solution pages, one method each.'),
  concept: s.concept, surface: s.surface, handwriting: s.handwriting, decorative: s.decorative, composition: s.composition, premiumTest: s.premiumTest,
})));

const STYLE_EFF = [
  'Open ChatGPT or Gemini (these can make images).',
  'Tap + / paperclip and attach a clear photo of ONE question.',
  'Paste this whole prompt, then press Send.',
  "If it makes one page, reply: 'now generate Page 2', then Page 3, 4, 5.",
  'Download each page and give the maths a quick check.',
];
const STYLE_FIX = "If a page is unclear, reply: 'Redo that page in the same style, make the handwriting larger and re-check the maths.' If it replies with text instead of a picture, say: 'Please generate this as an actual image.'";

const flagship = {
  category: 'handwritten-styles',
  categoryTitle: 'Handwritten 5-Method Solution Art',
  categoryIcon: '🎨',
  group: 'Solving & Checking',
  categoryBlurb: 'The flagship. Photograph one problem and get five separate, gallery-grade handwritten solution pages - five different methods, one stunning paper-and-ink style. ' + allStyles.length + ' styles, every page signed in your name. (Needs an image-making AI; free tiers limit images per day.)',
  prompts: allStyles.map(s => ({
    title: s.name, tag: '5 image pages', needsImage: true, makesImage: true,
    whatYouGet: s.whatYouGet,
    bestTool: 'ChatGPT or Gemini (image)',
    worksOnFree: 'Needs an image-making AI; free tiers limit images/day',
    howToUse: 'Attach a photo of one problem, paste this, then ask for Page 2..5 one at a time.',
    effectiveUsage: STYLE_EFF, commonFix: STYLE_FIX,
    promptText: buildStylePrompt(s),
  })),
};

// sanitize generated categories + guarantee signature + normalise fields
let total = 0, fixedSig = 0;
for (const c of categories) {
  c.categoryTitle = sanitize(c.categoryTitle); c.categoryBlurb = sanitize(c.categoryBlurb); c.group = sanitize(c.group);
  for (const p of (c.prompts || [])) {
    total++;
    p.title = sanitize(p.title); p.tag = sanitize(p.tag);
    p.whatYouGet = sanitize(p.whatYouGet); p.bestTool = sanitize(p.bestTool);
    p.worksOnFree = sanitize(p.worksOnFree); p.howToUse = sanitize(p.howToUse); p.commonFix = sanitize(p.commonFix);
    p.effectiveUsage = Array.isArray(p.effectiveUsage) ? p.effectiveUsage.map(sanitize).filter(Boolean) : [];
    p.needsImage = !!p.needsImage; p.makesImage = !!p.makesImage;
    const before = sanitize(p.promptText);
    p.promptText = ensureSig(p.promptText, p.needsImage || p.makesImage);
    if (!before.includes(SIG)) fixedSig++;
  }
}

const finalData = { categories: [flagship].concat(categories) };
const grand = finalData.categories.reduce((t, c) => t + c.prompts.length, 0);

mkdirSync(ROOT + '/data', { recursive: true });
const banner = '/* Maths Prompt Studio v2 data - ' + grand + ' prompts across ' + finalData.categories.length + ' categories. Authored by ' + SIG + '. Auto-generated; do not edit by hand. */\n';
writeFileSync(ROOT + '/data/prompts.js', banner + 'window.PROMPT_DATA = ' + JSON.stringify(finalData) + ';\n');

console.log('Wrote data/prompts.js (v2)');
console.log('  flagship styles :', flagship.prompts.length, '(' + ORIGINALS.length + ' original + ' + newStyles.length + ' new)');
console.log('  other categories:', categories.length);
console.log('  GRAND TOTAL     :', grand, 'prompts');
console.log('  signatures auto-added to', fixedSig, 'of', total, 'generated prompts');
