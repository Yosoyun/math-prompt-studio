// Mandatory QA gate for the 95 Wave-1 tool-linked prompts.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataSource = readFileSync(resolve(ROOT, 'data/prompts.js'), 'utf8');
const marker = 'window.PROMPT_DATA =';
const data = JSON.parse(dataSource.slice(dataSource.indexOf(marker) + marker.length, dataSource.lastIndexOf(';')));
const contract = readFileSync(resolve(ROOT, '_handoff/tool-link-contract.txt'), 'utf8');
const specs = [
  ...JSON.parse(readFileSync(resolve(ROOT, 'tools/wave1-prompts/verified-answers.json'), 'utf8')),
  ...JSON.parse(readFileSync(resolve(ROOT, 'tools/wave1-prompts/board-projection.json'), 'utf8')),
  ...JSON.parse(readFileSync(resolve(ROOT, 'tools/wave1-prompts/phone-quizzes.json'), 'utf8')),
];

const expectedCounts = new Map([
  ['verified-answers', 40],
  ['board-projection', 30],
  ['phone-quizzes', 25],
]);
const expectedMeta = new Map([
  ['verified-answers', ['Verified Answers (One-Tap Check)', 'Solving & Checking', '🔗']],
  ['board-projection', ['Project It on the Board', 'Teaching Materials', '📽️']],
  ['phone-quizzes', ['Quiz Them on Their Phones', 'Practice & Assessment', '📱']],
]);
const allowedExams = new Set(['any', 'boards', 'jee-main', 'jee-advanced', 'olympiad', 'foundation']);
const allowedAud = new Set(['teacher', 'student', 'both']);
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };

const categories = new Map(data.categories.map(category => [category.category, category]));
const wavePrompts = [];
for (const [categoryId, expected] of expectedCounts) {
  const category = categories.get(categoryId);
  check(Boolean(category), `missing category ${categoryId}`);
  if (!category) continue;
  check(category.prompts.length === expected, `${categoryId}: expected ${expected}, found ${category.prompts.length}`);
  const [title, group, icon] = expectedMeta.get(categoryId);
  check(category.categoryTitle === title, `${categoryId}: wrong categoryTitle`);
  check(category.group === group, `${categoryId}: wrong group`);
  check(category.categoryIcon === icon, `${categoryId}: wrong icon`);
  wavePrompts.push(...category.prompts.map(prompt => ({ ...prompt, categoryId })));
}
check(wavePrompts.length === 95, `expected 95 Wave-1 prompts, found ${wavePrompts.length}`);
check(specs.length === 95, `expected 95 source specs, found ${specs.length}`);

const specByTitle = new Map(specs.map(spec => [spec.title, spec]));
check(specByTitle.size === 95, 'spec titles are not unique');
const allTitles = new Set();
for (const category of data.categories) {
  for (const prompt of category.prompts) {
    const key = prompt.title.trim().toLowerCase();
    check(!allTitles.has(key), `duplicate library title: ${prompt.title}`);
    allTitles.add(key);
  }
}

const forbiddenName = String.fromCharCode(73, 110, 100, 114, 97, 106, 101, 101, 116, 32, 89, 97, 100, 97, 118);
check(!dataSource.includes(forbiddenName), 'forbidden owner name found in data/prompts.js');
let formBuilderCount = 0;

for (const prompt of wavePrompts) {
  const prefix = `${prompt.categoryId}/${prompt.title}`;
  const spec = specByTitle.get(prompt.title);
  check(Boolean(spec), `${prefix}: no matching source spec`);
  check(prompt.promptText.endsWith(contract), `${prefix}: contract is not verbatim at end`);
  check(prompt.promptText.indexOf(contract) === prompt.promptText.lastIndexOf(contract), `${prefix}: contract appears more than once`);
  check(prompt.promptText.includes(`CHECK → ${spec?.exampleUrl}`), `${prefix}: worked example URL missing`);
  check(prompt.promptText.includes(`(paste-fallback: ${spec?.exampleFallback})`), `${prefix}: paste fallback missing`);
  const exampleLine = `CHECK → ${spec?.exampleUrl}`;
  const lines = prompt.promptText.split('\n');
  const exampleIndex = lines.indexOf(exampleLine);
  check(exampleIndex > 0 && lines[exampleIndex - 1] === 'check this yourself', `${prefix}: example link label is wrong`);
  check(exampleIndex >= 0 && lines[exampleIndex + 1] === `(paste-fallback: ${spec?.exampleFallback})`, `${prefix}: fallback must be directly below link`);
  for (const section of ['ROLE:', 'CONTEXT:', 'DO THIS:', 'WORKED LINK EXAMPLE', 'OUTPUT FORMAT:', 'QUALITY AND TOOL GUARDRAILS:']) {
    check(prompt.promptText.includes(section), `${prefix}: missing section ${section}`);
  }
  check(prompt.added === '2026-07-17', `${prefix}: wrong added date`);
  check(Array.isArray(prompt.exams) && prompt.exams.length > 0 && prompt.exams.every(exam => allowedExams.has(exam)), `${prefix}: invalid exams facets`);
  check(allowedAud.has(prompt.aud), `${prefix}: invalid audience facet`);
  check(prompt.bestTool === 'Any AI chat (ChatGPT, Claude, Gemini)', `${prefix}: wrong bestTool`);
  check(prompt.worksOnFree === 'Works on any free AI', `${prefix}: wrong worksOnFree`);

  const bodyWithoutContract = prompt.promptText.slice(0, -contract.length);
  check(!/https?:\/\/(?:www\.)?desmos\.com\/[^\s]*\?/i.test(bodyWithoutContract), `${prefix}: forbidden Desmos query URL`);
  check(!/https?:\/\/mathsolver\.microsoft\.com/i.test(bodyWithoutContract), `${prefix}: dead Math Solver URL`);
  check(!/https?:\/\/www\.geogebra\.org\/m\//i.test(bodyWithoutContract), `${prefix}: invented GeoGebra material ID`);
  if (prompt.title === 'Piecewise and Modulus Without Guesswork') {
    check(!bodyWithoutContract.includes('Extremum(f);Extremum(g)'), `${prefix}: one-argument Extremum cannot mark abs() vertices`);
  }
  check(!bodyWithoutContract.includes('BinomialDist(n,p,k)'), `${prefix}: point probability needs BinomialDist(n,p,k,false)`);
  check(!/[?;]command=z=|[?&]command=z=/i.test(bodyWithoutContract), `${prefix}: z is a reserved GeoGebra assignment label`);
  const geogebraUrls = bodyWithoutContract.match(/https:\/\/www\.geogebra\.org\/(?:graphing|geometry|3d|cas)\?command=[^\s)]+/g) || [];
  for (const url of geogebraUrls) {
    check(!url.includes('+'), `${prefix}: GeoGebra raw + was not encoded`);
    const commands = url.slice(url.indexOf('?command=') + 9).split(';');
    check(commands.length <= 12, `${prefix}: GeoGebra example exceeds 12 commands`);
  }

  if (/FormApp/.test(bodyWithoutContract)) {
    formBuilderCount++;
    check(/complete|executable/i.test(bodyWithoutContract) && /FormApp/.test(bodyWithoutContract) && /code block/i.test(bodyWithoutContract), `${prefix}: Forms workflow must require complete FormApp code`);
    check(bodyWithoutContract.includes('script.google.com') && bodyWithoutContract.includes('New project') && bodyWithoutContract.includes('View') && bodyWithoutContract.includes('Logs'), `${prefix}: Forms click path incomplete`);
  }
  if (/Wayground/i.test(bodyWithoutContract)) {
    check(/Create/.test(bodyWithoutContract) && /Import/.test(bodyWithoutContract) && /Paste questions/i.test(bodyWithoutContract), `${prefix}: Wayground paste-import path incomplete`);
    check(/10,?000/.test(bodyWithoutContract), `${prefix}: Wayground 10,000-character limit missing`);
  }
  if (/Kahoot/i.test(bodyWithoutContract)) {
    check(/xlsx/i.test(bodyWithoutContract) && /95/.test(bodyWithoutContract) && /60/.test(bodyWithoutContract), `${prefix}: Kahoot xlsx limits missing`);
  }
  if (/Blooket/i.test(bodyWithoutContract)) {
    check(/CSV/i.test(bodyWithoutContract) && /1[–-]4/.test(bodyWithoutContract), `${prefix}: Blooket CSV answer-number rule missing`);
  }
}
check(formBuilderCount === 19, `expected 19 FormApp creator prompts, found ${formBuilderCount}`);

// Count and scan the 95 English source prompts only. Hindi translations repeat the
// verbatim contract by design, while older library prompts are outside this gate.
const waveSource = wavePrompts.map(prompt => prompt.promptText).join('\n');
const contractOccurrences = (waveSource.match(/TOOL-LINK OUTPUT CONTRACT/g) || []).length;
check(contractOccurrences === 95, `expected 95 contract occurrences, found ${contractOccurrences}`);
const desmosQueryOccurrences = (waveSource.match(/https?:\\?\/\\?\/(?:www\.)?desmos\.com\/[^"'\s]*\?/gi) || []).length;
check(desmosQueryOccurrences === 0, `found ${desmosQueryOccurrences} forbidden Desmos query URLs`);
const deadUrlOccurrences = (waveSource.match(/https?:\\?\/\\?\/mathsolver\.microsoft\.com/gi) || []).length;
check(deadUrlOccurrences === 0, `found ${deadUrlOccurrences} dead Math Solver URLs`);
const inventedMaterialOccurrences = (waveSource.match(/https?:\\?\/\\?\/www\.geogebra\.org\/m\//gi) || []).length;
check(inventedMaterialOccurrences === 0, `found ${inventedMaterialOccurrences} GeoGebra material URLs`);

console.log(`Wave-1 QA: ${wavePrompts.length} prompts | contract occurrences: ${contractOccurrences} | errors: ${errors.length}`);
if (errors.length) {
  errors.forEach(error => console.error(`ERROR: ${error}`));
  process.exit(1);
}
