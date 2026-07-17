// Adds the 95 Wave-1 tool-linked prompts from reviewed JSON specifications.
// data/prompts.js is generated; never edit it by hand.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = resolve(ROOT, 'data/prompts.js');
const CONTRACT_FILE = resolve(ROOT, '_handoff/tool-link-contract.txt');
const SPEC_DIR = resolve(ROOT, 'tools/wave1-prompts');

const categoryDefs = [
  {
    category: 'verified-answers',
    categoryTitle: 'Verified Answers (One-Tap Check)',
    categoryIcon: '🔗',
    group: 'Solving & Checking',
    categoryBlurb: 'Solve, audit and check the riskiest mathematical steps with teacher-clickable links.',
    file: 'verified-answers.json',
    firstBrief: 1,
    lastBrief: 8,
    expected: 40,
  },
  {
    category: 'board-projection',
    categoryTitle: 'Project It on the Board',
    categoryIcon: '📽️',
    group: 'Teaching Materials',
    categoryBlurb: 'Open classroom-ready graphs, constructions and visual explorations with reliable fallbacks.',
    file: 'board-projection.json',
    firstBrief: 9,
    lastBrief: 14,
    expected: 30,
  },
  {
    category: 'phone-quizzes',
    categoryTitle: 'Quiz Them on Their Phones',
    categoryIcon: '📱',
    group: 'Practice & Assessment',
    categoryBlurb: 'Build import-ready phone quizzes, auto-marked Forms scripts and verified review copies.',
    file: 'phone-quizzes.json',
    firstBrief: 15,
    lastBrief: 19,
    expected: 25,
  },
];

const allowedExams = new Set(['any', 'boards', 'jee-main', 'jee-advanced', 'olympiad', 'foundation']);
const allowedAud = new Set(['teacher', 'student', 'both']);
const requiredStringFields = [
  'title', 'tag', 'whatYouGet', 'howToUse', 'commonFix', 'role', 'context',
  'exampleTask', 'exampleResult', 'exampleUrl', 'exampleFallback', 'exampleEncodingNote',
];
const requiredArrayFields = ['effectiveUsage', 'exams', 'inputs', 'doThis', 'outputFormat', 'guardrails'];
const allowedUrlPrefixes = [
  'https://www.wolframalpha.com/input?i=',
  'https://www.symbolab.com/solver?query=',
  'https://www.geogebra.org/graphing?command=',
  'https://www.geogebra.org/geometry?command=',
  'https://www.geogebra.org/3d?command=',
  'https://www.geogebra.org/cas?command=',
  'https://math.stackexchange.com/search?q=',
  'https://oeis.org/search?q=',
  'https://artofproblemsolving.com/community/q1_',
  'https://www.khanacademy.org/search?page_search_query=',
  'https://www.overleaf.com/docs?encoded_snip=',
  'https://latex.codecogs.com/png.image?',
];

function parseData(source) {
  const marker = 'window.PROMPT_DATA =';
  const start = source.indexOf(marker);
  if (start < 0) throw new Error('window.PROMPT_DATA marker not found');
  return JSON.parse(source.slice(start + marker.length, source.lastIndexOf(';')));
}

function payloadFromUrl(url) {
  const prefixes = [
    ...allowedUrlPrefixes.filter(prefix => !prefix.includes('artofproblemsolving.com')),
  ];
  const prefix = prefixes.find(candidate => url.startsWith(candidate));
  if (!prefix) return null;
  return decodeURIComponent(url.slice(prefix.length));
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64).replace(/-+$/, '');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readSpecs(def) {
  const path = resolve(SPEC_DIR, def.file);
  const specs = JSON.parse(readFileSync(path, 'utf8'));
  assert(Array.isArray(specs), `${def.file}: root must be an array`);
  assert(specs.length === def.expected, `${def.file}: expected ${def.expected}, found ${specs.length}`);
  const seenBriefSlots = new Set();
  for (const [index, spec] of specs.entries()) {
    const label = `${def.file}[${index}]`;
    assert(spec && typeof spec === 'object' && !Array.isArray(spec), `${label}: object required`);
    assert(spec.category === def.category, `${label}: wrong category`);
    assert(Number.isInteger(spec.brief) && spec.brief >= def.firstBrief && spec.brief <= def.lastBrief, `${label}: invalid brief`);
    assert(Number.isInteger(spec.slot) && spec.slot >= 1 && spec.slot <= 5, `${label}: invalid slot`);
    const briefSlot = `${spec.brief}:${spec.slot}`;
    assert(!seenBriefSlots.has(briefSlot), `${label}: duplicate brief/slot ${briefSlot}`);
    seenBriefSlots.add(briefSlot);
    for (const field of requiredStringFields) assert(typeof spec[field] === 'string' && spec[field].trim(), `${label}: missing ${field}`);
    for (const field of requiredArrayFields) assert(Array.isArray(spec[field]) && spec[field].length, `${label}: missing ${field}`);
    assert(typeof spec.needsImage === 'boolean' && spec.makesImage === false, `${label}: invalid image flags`);
    assert(spec.effectiveUsage.length >= 4 && spec.effectiveUsage.length <= 5, `${label}: effectiveUsage must have 4-5 items`);
    spec.effectiveUsage.forEach((item, itemIndex) => assert(String(item).startsWith(`${itemIndex + 1}.`), `${label}: effectiveUsage numbering`));
    assert(spec.doThis.length >= 5, `${label}: at least five DO THIS instructions required`);
    assert(spec.outputFormat.length >= 4, `${label}: at least four output sections required`);
    assert(spec.inputs.some(item => /\[[A-Z][A-Z0-9 /&'().,:+-]{1,80}\]/.test(item)), `${label}: at least one CAPS placeholder required`);
    assert(spec.exams.every(exam => allowedExams.has(exam)), `${label}: invalid exams facet`);
    assert(allowedAud.has(spec.aud), `${label}: invalid audience facet`);
    const tagWords = spec.tag.trim().split(/\s+/).length;
    assert(tagWords >= 2 && tagWords <= 4, `${label}: tag must contain 2-4 words`);
    assert(allowedUrlPrefixes.some(prefix => spec.exampleUrl.startsWith(prefix)), `${label}: example URL is not allowed`);
    assert(!/\s/.test(spec.exampleUrl), `${label}: example URL contains whitespace`);
    assert(!spec.exampleUrl.includes('+'), `${label}: raw + must be encoded as %2B`);
    assert(!/https?:\/\/(?:www\.)?desmos\.com\/[^\s]*\?/i.test(spec.exampleUrl), `${label}: Desmos URL query is forbidden`);
    assert(!/mathsolver\.microsoft\.com/i.test(spec.exampleUrl), `${label}: dead Math Solver URL is forbidden`);
    assert(!/geogebra\.org\/m\//i.test(spec.exampleUrl), `${label}: invented GeoGebra material IDs are forbidden`);
    const payload = payloadFromUrl(spec.exampleUrl);
    if (payload !== null) assert(payload === spec.exampleFallback, `${label}: URL payload does not decode to exampleFallback`);
  }
  for (let brief = def.firstBrief; brief <= def.lastBrief; brief++) {
    for (let slot = 1; slot <= 5; slot++) assert(seenBriefSlots.has(`${brief}:${slot}`), `${def.file}: missing brief ${brief} slot ${slot}`);
  }
  return specs;
}

function buildPromptText(spec, contract) {
  const lines = [
    `ROLE: ${spec.role}`,
    '',
    `CONTEXT: ${spec.context}`,
    '',
    'INPUTS — FILL EVERY PLACEHOLDER:',
    ...spec.inputs.map(item => `- ${item}`),
    '',
    'DO THIS:',
    ...spec.doThis.map((item, index) => `${index + 1}. ${item}`),
    '',
    'WORKED LINK EXAMPLE — COPY THIS EXACT ENCODING PATTERN:',
    `Example task: ${spec.exampleTask}`,
    `Expected result or check target: ${spec.exampleResult}`,
    'check this yourself',
    `CHECK → ${spec.exampleUrl}`,
    `(paste-fallback: ${spec.exampleFallback})`,
    `Encoding note: ${spec.exampleEncodingNote}`,
    '',
    'OUTPUT FORMAT:',
    ...spec.outputFormat.map((item, index) => `${index + 1}. ${item}`),
    '',
    'QUALITY AND TOOL GUARDRAILS:',
    ...spec.guardrails.map(item => `- ${item}`),
    '- Never describe an AI answer as verified. Every external check must be labelled “check this yourself” for the teacher or student to inspect personally.',
    '- Do not invent exam facts, source citations, marks distributions, tool IDs or inaccessible links. Separate mathematical proof from computational checking.',
    '',
    contract,
  ];
  return lines.join('\n');
}

const source = readFileSync(DATA_FILE, 'utf8');
const data = parseData(source);
const contract = readFileSync(CONTRACT_FILE, 'utf8');
assert(!contract.endsWith('\n'), 'contract file unexpectedly ends with a newline');

const specsByCategory = new Map(categoryDefs.map(def => [def.category, readSpecs(def)]));
const allSpecs = categoryDefs.flatMap(def => specsByCategory.get(def.category));
assert(allSpecs.length === 95, `expected 95 specs, found ${allSpecs.length}`);

const forbiddenName = String.fromCharCode(73, 110, 100, 114, 97, 106, 101, 101, 116, 32, 89, 97, 100, 97, 118);
assert(!JSON.stringify(allSpecs).includes(forbiddenName), 'forbidden owner name found in Wave-1 specs');

const replacing = new Set(categoryDefs.map(def => def.category));
const existingTargetCategories = data.categories.filter(category => replacing.has(category.category));
for (const category of existingTargetCategories) {
  assert(category.prompts.every(prompt => !prompt.hi), `refusing to replace translated category ${category.category}`);
}
data.categories = data.categories.filter(category => !replacing.has(category.category));

const existingTitles = new Set();
const usedSlugs = new Set();
for (const category of data.categories) {
  for (const prompt of category.prompts) {
    existingTitles.add(prompt.title.trim().toLowerCase());
    if (prompt.slug) usedSlugs.add(prompt.slug);
  }
}

for (const spec of allSpecs) {
  const key = spec.title.trim().toLowerCase();
  assert(!existingTitles.has(key), `duplicate title: ${spec.title}`);
  existingTitles.add(key);
}

for (const def of categoryDefs) {
  const prompts = specsByCategory.get(def.category).map(spec => {
    let base = slugify(spec.title) || slugify(def.category);
    let slug = base;
    let suffix = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${suffix++}`;
    usedSlugs.add(slug);
    const promptText = buildPromptText(spec, contract);
    assert(promptText.endsWith(contract), `${spec.title}: contract is not verbatim at end`);
    return {
      title: spec.title,
      tag: spec.tag,
      needsImage: spec.needsImage,
      makesImage: false,
      whatYouGet: spec.whatYouGet,
      bestTool: 'Any AI chat (ChatGPT, Claude, Gemini)',
      worksOnFree: 'Works on any free AI',
      howToUse: spec.howToUse,
      effectiveUsage: spec.effectiveUsage,
      commonFix: spec.commonFix,
      promptText,
      slug,
      exams: spec.exams,
      aud: spec.aud,
      added: '2026-07-17',
    };
  });
  data.categories.push({
    category: def.category,
    categoryTitle: def.categoryTitle,
    categoryIcon: def.categoryIcon,
    group: def.group,
    categoryBlurb: def.categoryBlurb,
    prompts,
  });
}

data.version = '2026-07-17-wave1-tool-links';
const total = data.categories.reduce((sum, category) => sum + category.prompts.length, 0);
const banner = `/* Maths Prompt Studio data - ${total} prompts across ${data.categories.length} categories. v${data.version}. Auto-generated; do not edit by hand. */\n`;
writeFileSync(DATA_FILE, `${banner}window.PROMPT_DATA = ${JSON.stringify(data)};\n`);
console.log(`Added Wave-1: 95 prompts across 3 categories | total ${total}/${data.categories.length} categories`);
