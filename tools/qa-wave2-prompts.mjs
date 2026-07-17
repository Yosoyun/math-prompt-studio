// Read-only QA gate for the 180 Wave-2 click-to-tool prompts.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = resolve(ROOT, 'data/prompts.js');
const CONTRACT_FILE = resolve(ROOT, '_handoff/tool-link-contract.txt');
const SPEC_DIR = resolve(ROOT, 'tools/wave2-prompts');

const defs = [
  ['print-beautifully', 'print-beautifully.json', 25],
  ['doubt-research', 'doubt-research.json', 20],
  ['endless-practice', 'endless-practice.json', 20],
  ['marks-insight', 'marks-insight.json', 25],
  ['grade-the-stack', 'grade-the-stack.json', 20],
  ['nep-paperwork', 'nep-paperwork.json', 20],
  ['student-ai-links', 'student-ai-links.json', 15],
  ['translation-inclusion', 'translation-inclusion.json', 20],
  ['teacher-upskilling', 'teacher-upskilling.json', 15],
];

const allowedExams = new Set(['any', 'boards', 'jee-main', 'jee-advanced', 'olympiad', 'foundation']);
const allowedAud = new Set(['teacher', 'student', 'both']);
const allowedPrefixes = [
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
  return JSON.parse(source.slice(source.indexOf(marker) + marker.length, source.lastIndexOf(';')));
}

const data = parseData(readFileSync(DATA_FILE, 'utf8'));
const contract = readFileSync(CONTRACT_FILE, 'utf8');
const errors = [];
const fail = message => errors.push(message);
const target = new Map();
const specs = [];

for (const [categoryId, filename, expected] of defs) {
  const rows = JSON.parse(readFileSync(resolve(SPEC_DIR, filename), 'utf8'));
  if (!Array.isArray(rows) || rows.length !== expected) fail(`${filename}: expected ${expected} specifications`);
  const sequences = new Set(rows.map(row => row.sequence));
  for (let sequence = 1; sequence <= expected; sequence++) if (!sequences.has(sequence)) fail(`${filename}: missing sequence ${sequence}`);
  for (const row of rows) {
    if (row.category !== categoryId) fail(`${filename}: wrong category on ${row.title || row.sequence}`);
    const prefix = allowedPrefixes.find(candidate => String(row.exampleUrl || '').startsWith(candidate));
    if (!prefix) fail(`${row.title}: disallowed worked-example URL`);
    else {
      let decoded = '';
      try { decoded = decodeURIComponent(row.exampleUrl.slice(prefix.length)); } catch { fail(`${row.title}: malformed URL encoding`); }
      if (decoded !== row.exampleFallback) fail(`${row.title}: worked URL does not decode exactly to fallback`);
    }
    if (/\s/.test(row.exampleUrl || '')) fail(`${row.title}: whitespace in worked URL`);
    if (String(row.exampleUrl || '').includes('+')) fail(`${row.title}: raw plus in worked URL`);
    specs.push(row);
  }
  target.set(categoryId, { expected, specs: rows });
}

if (specs.length !== 180) fail(`expected 180 specs, found ${specs.length}`);
const specTitles = new Set();
for (const spec of specs) {
  const key = String(spec.title || '').trim().toLowerCase();
  if (specTitles.has(key)) fail(`duplicate Wave-2 title: ${spec.title}`);
  specTitles.add(key);
}

let promptCount = 0;
let contractCount = 0;
for (const [categoryId, { expected, specs: categorySpecs }] of target) {
  const categories = data.categories.filter(category => category.category === categoryId);
  if (categories.length !== 1) {
    fail(`${categoryId}: expected one data category, found ${categories.length}`);
    continue;
  }
  const category = categories[0];
  if (category.prompts.length !== expected) fail(`${categoryId}: expected ${expected} prompts, found ${category.prompts.length}`);
  const specByTitle = new Map(categorySpecs.map(spec => [spec.title, spec]));
  for (const prompt of category.prompts) {
    promptCount++;
    const spec = specByTitle.get(prompt.title);
    if (!spec) { fail(`${categoryId}: unexpected title ${prompt.title}`); continue; }
    if (prompt.added !== '2026-07-17') fail(`${prompt.title}: wrong added date`);
    if (!Array.isArray(prompt.exams) || !prompt.exams.length || prompt.exams.some(exam => !allowedExams.has(exam))) fail(`${prompt.title}: invalid exams facet`);
    if (!allowedAud.has(prompt.aud)) fail(`${prompt.title}: invalid audience facet`);
    if (prompt.needsImage !== spec.needsImage || prompt.makesImage !== false) fail(`${prompt.title}: wrong image flags`);
    if (prompt.whatYouGet !== spec.whatYouGet || prompt.howToUse !== spec.howToUse || prompt.commonFix !== spec.commonFix) fail(`${prompt.title}: metadata differs from reviewed spec`);
    if (!Array.isArray(prompt.effectiveUsage) || prompt.effectiveUsage.join('\n') !== spec.effectiveUsage.join('\n')) fail(`${prompt.title}: effectiveUsage differs from reviewed spec`);
    if (!prompt.promptText.endsWith(contract)) fail(`${prompt.title}: contract is not verbatim at end`);
    const occurrences = prompt.promptText.split(contract).length - 1;
    contractCount += occurrences;
    if (occurrences !== 1) fail(`${prompt.title}: expected one contract occurrence, found ${occurrences}`);
    const body = prompt.promptText.slice(0, -contract.length);
    for (const header of ['ROLE:', 'CONTEXT:', 'INPUTS — FILL EVERY PLACEHOLDER:', 'SOURCE-BOUND TOOL FACTS AND EXACT URL WHITELIST:', 'DO THIS:', 'WORKED LINK EXAMPLE — COPY THIS EXACT ENCODING PATTERN:', 'OUTPUT FORMAT:', 'QUALITY AND TOOL GUARDRAILS:']) {
      if (!body.includes(header)) fail(`${prompt.title}: missing header ${header}`);
    }
    for (const sourceId of spec.sourceIds) if (!body.includes(`[${sourceId}]`)) fail(`${prompt.title}: missing source fact ${sourceId}`);
    if (!body.includes(`CHECK → ${spec.exampleUrl}`) || !body.includes(`(paste-fallback: ${spec.exampleFallback})`)) fail(`${prompt.title}: worked example mismatch`);
    if ((body.match(/CHECK → https:\/\//g) || []).length !== 1) fail(`${prompt.title}: expected exactly one concrete worked CHECK URL`);
    if (!/\[[A-Z][A-Z0-9 /&'().,:+\-]{1,80}\]/.test(body)) fail(`${prompt.title}: missing CAPS placeholder`);
    if (/https?:\/\/(?:www\.)?desmos\.com\/[^\s)]*\?/i.test(body)) fail(`${prompt.title}: forbidden Desmos parameter URL`);
    if (/https?:\/\/mathsolver\.microsoft\.com/i.test(body)) fail(`${prompt.title}: retired Math Solver URL`);
    if (/https?:\/\/gemini\.google\.com[^\s]*[?&](?:q|prompt)=/i.test(body)) fail(`${prompt.title}: unsupported Gemini prefill URL`);
    if (/https?:\/\/(?:www\.)?geogebra\.org\/m\//i.test(body)) fail(`${prompt.title}: unapproved GeoGebra material ID`);
    if (/https?:\/\/(?:www\.)?khanacademy\.org\/math\//i.test(body)) fail(`${prompt.title}: opaque Khan topic path`);
    if (spec.sourceIds.includes('OVERLEAF') && (!/free account/i.test(body) || !/(?:sign-in|sign in|login)/i.test(body))) fail(`${prompt.title}: Overleaf free-login fact missing`);
    if (spec.sourceIds.includes('CHATGPT') && !/prefills but does not auto-submit/i.test(body)) fail(`${prompt.title}: ChatGPT prefill limitation missing`);
    if (spec.sourceIds.includes('CLAUDE') && !/does not auto-submit/i.test(body)) fail(`${prompt.title}: Claude prefill limitation missing`);
    if (spec.sourceIds.includes('GOOGLE_AI_MODE') && !/auto-runs/i.test(body)) fail(`${prompt.title}: AI Mode auto-run privacy warning missing`);
  }
}

const total = data.categories.reduce((sum, category) => sum + category.prompts.length, 0);
if (promptCount !== 180) fail(`expected 180 Wave-2 prompts, found ${promptCount}`);
if (contractCount !== 180) fail(`expected 180 contract occurrences, found ${contractCount}`);
if (total < 848) fail(`prompt corpus regressed below the Wave-2 baseline of 848 (found ${total})`);
if (!/^2026-07-17/.test(data.version || '')) fail(`unexpected data version ${data.version}`);

const forbiddenName = String.fromCharCode(73, 110, 100, 114, 97, 106, 101, 101, 116, 32, 89, 97, 100, 97, 118);
if (JSON.stringify(specs).includes(forbiddenName)) fail('protected owner name found in Wave-2 specs');
for (const categoryId of target.keys()) {
  const category = data.categories.find(item => item.category === categoryId);
  if (category && JSON.stringify(category).includes(forbiddenName)) fail(`${categoryId}: protected owner name found in data`);
}

console.log(`Wave-2 QA: ${promptCount} prompts | contract occurrences: ${contractCount} | total: ${total} | errors: ${errors.length}`);
for (const error of errors) console.error(`- ${error}`);
if (errors.length) process.exit(1);
