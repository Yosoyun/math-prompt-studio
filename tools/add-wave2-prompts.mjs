// Adds the 180 Wave-2 click-to-tool prompts from reviewed JSON specifications.
// data/prompts.js is generated; never edit it by hand.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = resolve(ROOT, 'data/prompts.js');
const CONTRACT_FILE = resolve(ROOT, '_handoff/tool-link-contract.txt');
const SPEC_DIR = resolve(ROOT, 'tools/wave2-prompts');

const categoryDefs = [
  {
    category: 'print-beautifully',
    categoryTitle: 'Print It Beautifully',
    categoryIcon: '🖨️',
    group: 'Teaching Materials',
    categoryBlurb: 'Turn checked mathematics into press-quality papers, worksheets and equation images with honest one-click or paste fallbacks.',
    file: 'print-beautifully.json',
    expected: 25,
  },
  {
    category: 'doubt-research',
    categoryTitle: 'Settle the Doubt with Sources',
    categoryIcon: '🔎',
    group: 'Solving & Checking',
    categoryBlurb: 'Answer difficult doubts with human-written sources, contest provenance and clear limits on what a link can establish.',
    file: 'doubt-research.json',
    expected: 20,
  },
  {
    category: 'endless-practice',
    categoryTitle: 'Endless Practice Without Repeats',
    categoryIcon: '♾️',
    group: 'Practice & Assessment',
    categoryBlurb: 'Build varied practice trails with self-checking routes while refusing invented exercise IDs and quiz slugs.',
    file: 'endless-practice.json',
    expected: 20,
  },
  {
    category: 'marks-insight',
    categoryTitle: 'Marks → Insight',
    categoryIcon: '📊',
    group: 'Teacher Productivity',
    categoryBlurb: 'Convert pasted marks into transparent re-teach priorities, item analysis and class-ready spreadsheet blocks.',
    file: 'marks-insight.json',
    expected: 25,
  },
  {
    category: 'grade-the-stack',
    categoryTitle: 'Grade the Stack',
    categoryIcon: '✅',
    group: 'Teacher Productivity',
    categoryBlurb: 'Mark batches consistently from a separately checked key, with auditable rubrics, error queues and privacy safeguards.',
    file: 'grade-the-stack.json',
    expected: 20,
  },
  {
    category: 'nep-paperwork',
    categoryTitle: 'Paperwork on Autopilot',
    categoryIcon: '🗂️',
    group: 'Teacher Productivity',
    categoryBlurb: 'Draft evidence-based school records from teacher-supplied documents without inventing current rules, codes or circulars.',
    file: 'nep-paperwork.json',
    expected: 20,
  },
  {
    category: 'student-ai-links',
    categoryTitle: 'Hand AI to Students Safely',
    categoryIcon: '🛡️',
    group: 'Support',
    categoryBlurb: 'Share privacy-conscious tutor links and student workflows that preserve teacher review and never auto-submit hidden instructions.',
    file: 'student-ai-links.json',
    expected: 15,
  },
  {
    category: 'translation-inclusion',
    categoryTitle: 'Every Language, Every Learner',
    categoryIcon: '🌐',
    group: 'Support',
    categoryBlurb: 'Preserve notation, marks and structure while adapting mathematics for languages, access needs and inclusive print.',
    file: 'translation-inclusion.json',
    expected: 20,
  },
  {
    category: 'teacher-upskilling',
    categoryTitle: 'Level Yourself Up',
    categoryIcon: '🎓',
    group: 'Support',
    categoryBlurb: 'Build subject knowledge, demonstrations and career evidence from sources that teachers can inspect themselves.',
    file: 'teacher-upskilling.json',
    expected: 15,
  },
];

const SOURCE_FACTS = {
  OVERLEAF: 'Whitelist: https://www.overleaf.com/docs?encoded_snip={PERCENT_ENCODED_LATEX}. Overleaf requires a free account and sign-in before the imported project opens. Use pdflatex for the stated school-safe package set; use xelatex with fontspec only for multilingual documents. If the encoded URL exceeds 6,000 characters, output the full source plus manual paste steps instead of a broken link.',
  CODECOGS: 'Whitelist: https://latex.codecogs.com/png.image?{PERCENT_ENCODED_LATEX}. CodeCogs renders one equation image, not a document. Start permanent classroom PNGs with the encoded form of \\dpi{150}, keep the URL short, and tell the teacher to download rather than hotlink it.',
  TYPST: 'Paste-only fact: Typst has no content-prefill URL. Output complete Typst source, label it NON-LATEX, and instruct the teacher to create an empty project at https://typst.app/ and paste it after signing in.',
  MATH_STACKEXCHANGE: 'Whitelist: https://math.stackexchange.com/search?q={ENCODED_KEYWORDS}. Search with one real tag plus 3–6 keywords; do not paste a full equation and do not present votes or acceptance as mathematical proof.',
  MATHOVERFLOW: 'Whitelist: https://mathoverflow.net/search?q={ENCODED_RESEARCH_QUERY}. Use only for theorem history, references, open-problem status or research-level questions, never routine school homework.',
  AOPS: 'Whitelist: https://artofproblemsolving.com/community/q1_{ENCODED_KEYWORDS}. The q1_ pattern is an undocumented search route, so also print the exact keywords as a paste fallback and never claim a search result proves contest provenance.',
  OEIS: 'Whitelist: https://oeis.org/search?q={COMMA_SEPARATED_TERMS}. Supply at least 6–8 correctly computed terms and warn that finitely many terms can fit multiple sequences.',
  PERPLEXITY: 'Whitelist: https://www.perplexity.ai/search?q={ENCODED_CURRENT_FACT_QUERY}. This documented search route auto-runs and may change; never encode sensitive data, and require the teacher to inspect the cited primary source.',
  KHAN_ACADEMY: 'Whitelist: https://www.khanacademy.org/search?page_search_query={ENCODED_KEYWORDS}. Use search only; never invent opaque Khan topic or exercise paths.',
  WOLFRAM_PROBLEM_GENERATOR: 'Exact verified whitelist entry: https://www.wolframalpha.com/problem-generator/quiz/?category=Algebra&topic=QuadraticEquationIntegerSolution. Use it only for integer-solution quadratic-equation practice. For every other topic, omit the generator link unless the teacher supplies a clicked-and-verified URL.',
  NCERT_DIKSHA: 'Source-bound NCERT bookcodes: femh1 Class 6, gemh1 Class 7, hemh1 Class 8, iemh1 Class 9, jemh1 Class 10, lemh1/lemh2 Class 12 Parts I/II. Use https://ncert.nic.in/textbook.php?{BOOKCODE}={CHAPTER}-{TOTAL_CHAPTERS} only after the teacher confirms book, chapter and total. Never invent a DIKSHA dial code; relay only a code the teacher pasted.',
  WOLFRAMALPHA: 'Whitelist: https://www.wolframalpha.com/input?i={ENCODED_PLAIN_CALCULATOR_QUERY}. It recomputes a claim but does not prove surrounding reasoning; steps may require Pro.',
  SYMBOLAB: 'Whitelist: https://www.symbolab.com/solver?query={ENCODED_PLAIN_CALCULATOR_QUERY}. Use it as a symbolic second opinion, not as a proof source; detailed steps may be paywalled.',
  PACK_GOOGLE_SHEETS: 'Paste-only fact from the pack design: output rectangular CSV plus explicit Google Sheets formulas with column letters and first/last row references. Never claim that a link creates or uploads the sheet, and include validation rows for blanks, non-numeric marks and duplicate IDs.',
  GOOGLE_COLAB: 'Whitelist only a public notebook URL that the teacher supplies or that appears verbatim in a curated table: https://colab.research.google.com/github/{USER}/{REPO}/blob/{BRANCH}/{PATH}. Arbitrary code cannot be placed in the URL, and running cells requires Google sign-in.',
  SAGEMATHCELL: 'A SageMathCell permalink must be created by real zlib compression plus URL-safe base64 in code execution. Never hallucinate the z value; if code execution is unavailable, output the short Sage/Python block as a paste fallback only.',
  CHATGPT: 'Whitelist template: https://chatgpt.com/?q={ENCODED_PROMPT}. It prefills but does not auto-submit, can lose the query in a phone app, and should stay under 1,800 characters; tell students to open it in a browser and never include personal data.',
  CLAUDE: 'Whitelist template: https://claude.ai/new?q={ENCODED_PROMPT}. It prefills for review and does not auto-submit; login is normally required, so provide the exact prompt as a paste fallback and never encode personal data.',
  GOOGLE_AI_MODE: 'Whitelist template: https://www.google.com/search?udm=50&q={ENCODED_QUERY}. This Google AI Mode route auto-runs, may change, and must never contain personal or sensitive student information. Never emit a gemini.google.com prefill URL.',
  PHET: 'Exact verified whitelist entry: https://phet.colorado.edu/sims/html/graphing-quadratics/latest/graphing-quadratics_all.html?locale=en&screens=1. It selects the simulation and screen but cannot preload coefficient values. Do not invent other simulation slugs.',
  GEOGEBRA: 'Whitelist: https://www.geogebra.org/graphing|geometry|3d|cas?command={COMMANDS}. Define objects before annotations, separate commands with semicolons, encode only literal plus as %2B, print the commands as a fallback, and never invent /m/ material IDs.',
  WOLFRAM_DEMONSTRATIONS: 'Exact verified whitelist entry: https://demonstrations.wolfram.com/QuadraticEquation/. Use no other Demonstrations slug unless it appears verbatim in a teacher-supplied or curated clicked table.',
};

const allowedExams = new Set(['any', 'boards', 'jee-main', 'jee-advanced', 'olympiad', 'foundation']);
const allowedAud = new Set(['teacher', 'student', 'both']);
const requiredStringFields = [
  'title', 'tag', 'whatYouGet', 'howToUse', 'commonFix', 'role', 'context',
  'exampleTask', 'exampleResult', 'exampleUrl', 'exampleFallback', 'exampleEncodingNote',
];
const requiredArrayFields = ['effectiveUsage', 'exams', 'inputs', 'doThis', 'outputFormat', 'guardrails', 'sourceIds'];
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64).replace(/-+$/, '');
}

function decodedPayload(url) {
  const prefix = allowedUrlPrefixes.find(candidate => url.startsWith(candidate));
  if (!prefix) return null;
  return decodeURIComponent(url.slice(prefix.length));
}

function readSpecs(def) {
  const path = resolve(SPEC_DIR, def.file);
  const specs = JSON.parse(readFileSync(path, 'utf8'));
  assert(Array.isArray(specs), `${def.file}: root must be an array`);
  assert(specs.length === def.expected, `${def.file}: expected ${def.expected}, found ${specs.length}`);
  const sequences = new Set();
  for (const [index, spec] of specs.entries()) {
    const label = `${def.file}[${index}]`;
    assert(spec && typeof spec === 'object' && !Array.isArray(spec), `${label}: object required`);
    assert(spec.category === def.category, `${label}: wrong category`);
    assert(Number.isInteger(spec.sequence) && spec.sequence >= 1 && spec.sequence <= def.expected, `${label}: invalid sequence`);
    assert(!sequences.has(spec.sequence), `${label}: duplicate sequence ${spec.sequence}`);
    sequences.add(spec.sequence);
    for (const field of requiredStringFields) assert(typeof spec[field] === 'string' && spec[field].trim(), `${label}: missing ${field}`);
    for (const field of requiredArrayFields) assert(Array.isArray(spec[field]) && spec[field].length, `${label}: missing ${field}`);
    assert(typeof spec.needsImage === 'boolean' && spec.makesImage === false, `${label}: invalid image flags`);
    assert(spec.effectiveUsage.length >= 4 && spec.effectiveUsage.length <= 5, `${label}: effectiveUsage must have 4-5 items`);
    spec.effectiveUsage.forEach((item, itemIndex) => assert(String(item).startsWith(`${itemIndex + 1}.`), `${label}: effectiveUsage numbering`));
    assert(spec.doThis.length >= 5, `${label}: at least five DO THIS instructions required`);
    assert(spec.outputFormat.length >= 4, `${label}: at least four output sections required`);
    assert(spec.outputFormat.every(item => String(item).includes(' — ')), `${label}: every output section needs an English label followed by an em dash`);
    assert(spec.guardrails.length >= 4, `${label}: at least four guardrails required`);
    assert(spec.inputs.some(item => /\[[A-Z][A-Z0-9 /&'().,:+\-]{1,80}\]/.test(item)), `${label}: at least one CAPS placeholder required`);
    assert(spec.exams.every(exam => allowedExams.has(exam)), `${label}: invalid exams facet`);
    assert(allowedAud.has(spec.aud), `${label}: invalid audience facet`);
    assert(spec.sourceIds.every(id => Object.hasOwn(SOURCE_FACTS, id)), `${label}: invalid source ID`);
    const tagWords = spec.tag.trim().split(/\s+/).length;
    assert(tagWords >= 2 && tagWords <= 4, `${label}: tag must contain 2-4 words`);
    assert(allowedUrlPrefixes.some(prefix => spec.exampleUrl.startsWith(prefix)), `${label}: example URL is not allowed`);
    assert(!/\s/.test(spec.exampleUrl), `${label}: example URL contains whitespace`);
    assert(!spec.exampleUrl.includes('+'), `${label}: raw plus must be encoded as %2B`);
    assert(!/desmos\.com\/[^\s]*\?/i.test(spec.exampleUrl), `${label}: Desmos query URL is forbidden`);
    assert(!/mathsolver\.microsoft\.com/i.test(spec.exampleUrl), `${label}: retired Math Solver URL is forbidden`);
    assert(!/geogebra\.org\/m\//i.test(spec.exampleUrl), `${label}: GeoGebra material ID is forbidden`);
    const payload = decodedPayload(spec.exampleUrl);
    assert(payload === spec.exampleFallback, `${label}: URL payload does not decode exactly to exampleFallback`);
  }
  for (let sequence = 1; sequence <= def.expected; sequence++) assert(sequences.has(sequence), `${def.file}: missing sequence ${sequence}`);
  return specs.sort((a, b) => a.sequence - b.sequence);
}

function buildPromptText(spec, contract) {
  return [
    `ROLE: ${spec.role}`,
    '',
    `CONTEXT: ${spec.context}`,
    '',
    'INPUTS — FILL EVERY PLACEHOLDER:',
    ...spec.inputs.map(item => `- ${item}`),
    '',
    'SOURCE-BOUND TOOL FACTS AND EXACT URL WHITELIST:',
    ...spec.sourceIds.map(id => `- [${id}] ${SOURCE_FACTS[id]}`),
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
    '- Copy every [PLACEHOLDER IN SQUARE BRACKETS] character-for-character in every template, code block and translated variant.',
    '- Never output a desmos.com URL with parameters, a mathsolver.microsoft.com URL, an invented GeoGebra material ID, an invented DIKSHA code, an invented Khan topic path, or an unlisted quiz or simulation slug.',
    '- Never describe an AI answer as verified. Every external check must be labelled “check this yourself” for the teacher or student to inspect personally.',
    '- Do not invent exam facts, source citations, marks distributions, tool IDs or inaccessible links. Separate mathematical proof from computational checking.',
    '',
    contract,
  ].join('\n');
}

const source = readFileSync(DATA_FILE, 'utf8');
const data = parseData(source);
const contract = readFileSync(CONTRACT_FILE, 'utf8');
assert(!contract.endsWith('\n'), 'contract file unexpectedly ends with a newline');

const specsByCategory = new Map(categoryDefs.map(def => [def.category, readSpecs(def)]));
const allSpecs = categoryDefs.flatMap(def => specsByCategory.get(def.category));
assert(allSpecs.length === 180, `expected 180 specs, found ${allSpecs.length}`);

const forbiddenName = String.fromCharCode(73, 110, 100, 114, 97, 106, 101, 101, 116, 32, 89, 97, 100, 97, 118);
assert(!JSON.stringify(allSpecs).includes(forbiddenName), 'protected owner name found in Wave-2 specs');

const replacing = new Set(categoryDefs.map(def => def.category));
for (const category of data.categories.filter(item => replacing.has(item.category))) {
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

data.version = '2026-07-17-wave2-tool-links';
const total = data.categories.reduce((sum, category) => sum + category.prompts.length, 0);
assert(total === 848, `expected final Wave-2 total 848, found ${total}`);
const banner = `/* Maths Prompt Studio data - ${total} prompts across ${data.categories.length} categories. v${data.version}. Auto-generated; do not edit by hand. */\n`;
writeFileSync(DATA_FILE, `${banner}window.PROMPT_DATA = ${JSON.stringify(data)};\n`);
console.log(`Added Wave-2: 180 prompts across 9 categories | total ${total}/${data.categories.length} categories`);
