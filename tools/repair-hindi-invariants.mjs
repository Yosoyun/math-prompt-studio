// Generate a merge-hindi batch that repairs legacy Hindi protected-token
// drift. This script never writes data/prompts.js; the untouched
// tools/merge-hindi.mjs remains the only writer for Hindi translations.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import {
  FROZEN_TERMS,
  MACHINE_EXACT_LITERALS,
  MACHINE_QUERY_TOKENS,
  MACHINE_ROUTES,
  MATH_EXACT_LITERALS,
} from './lang-qa.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RECONSTRUCT = process.argv.includes('--reconstruct-pre-invariant');
const CHECK = process.argv.includes('--check');
const PRE_PHASE3_BASELINE = 'b4ff314';
const outputArgument = process.argv.slice(2).find(argument => !argument.startsWith('--'));
const OUTPUT = resolve(ROOT, outputArgument || '_handoff/phase3-hindi-invariant-repair.json');
const MARKER = 'window.PROMPT_DATA =';
const source = RECONSTRUCT
  ? execFileSync('git', ['show', `${PRE_PHASE3_BASELINE}:data/prompts.js`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 })
  : readFileSync(resolve(ROOT, 'data/prompts.js'), 'utf8');
const data = JSON.parse(source.slice(source.indexOf(MARKER) + MARKER.length, source.lastIndexOf(';')));
if (RECONSTRUCT) {
  const lineOrderBatch = JSON.parse(readFileSync(resolve(ROOT, '_handoff/phase3-hindi-line-order-repair.json'), 'utf8'));
  const byTitle = new Map(data.categories.flatMap(category => category.prompts).map(prompt => [prompt.title, prompt]));
  for (const item of lineOrderBatch) {
    const prompt = byTitle.get(item.title);
    if (!prompt) throw new Error(`Line-order reconstruction title missing: ${item.title}`);
    prompt.hi = item.hi;
  }
}

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const count = (value, needle) => String(value || '').split(needle).length - 1;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sorted = values => [...values].sort();
const brackets = value => sorted(String(value || '').match(/\[\[[^\]\n]+\]\]|\[[^\]\n]+\]/g) || []);
const numbers = value => sorted(String(value || '').match(/\d+(?:\.\d+)?/g) || []);
const urls = value => sorted((String(value || '').match(/https?:\/\/[^\s<>"']+/g) || []).map(item => item.replace(/[.,;:!?।॥]+$/u, '')));
const domains = value => sorted((String(value || '').match(/\b(?:[A-Za-z0-9-]+\.)+(?:com|org|net|edu|in|io|ai|app|dev)(?:\/[^\s<>"']*)?/gi) || []).map(item => item.replace(/[.,;:!?।॥]+$/u, '')));
const files = value => sorted(String(value || '').match(/\b[\w.-]+\.(?:pdf|docx?|pptx?|xlsx?|csv|tsv|tex|typ|png|jpe?g|svg|html?|js|mjs|json)\b/gi) || []);
const inlineCode = value => sorted(String(value || '').match(/`[^`\n]+`/g) || []);
const codeBlocks = value => sorted(String(value || '').match(/```[\s\S]*?```/g) || []);
const displayMath = value => sorted(String(value || '').match(/\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g) || []);
const lineShape = value => String(value || '').split('\n').map(line => line.trim() ? 1 : 0);

const NUMBER_WORDS = new Map([
  ['0', 'शून्य'], ['1', 'एक'], ['2', 'दो'], ['3', 'तीन'], ['4', 'चार'], ['5', 'पाँच'],
  ['6', 'छह'], ['7', 'सात'], ['8', 'आठ'], ['10', 'दस'], ['12', 'बारह'], ['15', 'पंद्रह'],
  ['20', 'बीस'], ['30', 'तीस'], ['45', 'पैंतालीस'], ['48', 'अड़तालीस'], ['60', 'साठ'],
]);

const SPECIAL_VARIANTS = new Map([
  ['Olympiad', ['ओलंपियाड', 'ओलम्पियाड']],
  ['Worksheet', ['वर्कशीट', 'कार्यपत्रिका', 'कार्यपत्रक', 'worksheet']],
  ['URL', ['वेब पता', 'वेब पते', 'वेब-पता', 'वेब-पते', 'वेब एड्रेस']],
  ['TeX engine', ['TeX इंजन']],
]);

const FALLBACKS = new Map([
  ['WolframAlpha', 'यह टूल'], ['Wolfram', 'यह टूल'], ['Symbolab', 'यह टूल'],
  ['GeoGebra Classroom', 'कक्षा टूल'], ['GeoGebra', ''], ['Desmos', 'ग्राफ़ टूल'],
  ['OEIS', 'अनुक्रम डेटाबेस'], ['Overleaf', 'यह प्लेटफ़ॉर्म'],
  ['Google Forms', 'प्रपत्र'], ['Google Form', 'प्रपत्र'], ['Google Apps Script', 'कोड'], ['Apps Script', 'कोड'],
  ['Google Sheets', 'शीट'], ['Wayground', 'यह मंच'], ['Kahoot', 'यह मंच'], ['Blooket', 'यह मंच'],
  ['XeLaTeX', 'टाइपसेटिंग इंजन'], ['LaTeX', 'टाइपसेटिंग भाषा'], ['TeX engine', 'टाइपसेटिंग इंजन'],
  ['DPP', ''], ['MCQ', 'बहुविकल्पी प्रश्न'], ['CSV', 'सारणीबद्ध डेटा'],
  ['XLSX', 'स्प्रेडशीट'], ['PDF', 'दस्तावेज़'], ['PPT', 'प्रस्तुति'], ['PNG', 'चित्र'],
  ['Worksheet', 'कार्यपत्रक'], ['URL', 'वेब पता'], ['NCERT', 'पाठ्यपुस्तक'], ['Olympiad', 'ओलंपियाड'],
  ['JEE Advanced', 'JEE-Advanced'], ['FormApp', 'प्रपत्र'], ['Typst', 'टाइपसेटिंग टूल'],
]);

const LINE_REWRITES = new Map([
  ['adaptive-3-difficulty-paper-set-set-a-set-b-set-c|title|1', ['तीन कठिनाई स्तरों', '3 कठिनाई स्तरों']],
  ['exit-ticket-5-quick-questions-to-end-class|promptText|13', ['पहले पाँचों प्रश्न', 'पहले सभी 5 प्रश्न']],
  ['exit-ticket-5-quick-questions-to-end-class|promptText|18', ['पाँचों अंतिम उत्तर', 'सभी 5 अंतिम उत्तर']],
  ['quiz-of-the-day-daily-3-question-set|effectiveUsage[2]|1', ['तीनों प्रश्न', 'सभी 3 प्रश्न']],
  ['olympiad-inequality-arsenal-recall-drill|promptText|8', ['(जो छात्र सबसे पहले भूलते हैं)', '(वह #1 बात जो छात्र भूलते हैं)']],
  ['common-misconceptions-and-how-to-fix-them|promptText|16', ['(पाँचों में से हर एक के लिए', '(सभी 5 में से हर एक के लिए']],
  ['jee-main-jee-advanced-3d-line-plane-case-split|title|1', ['त्रिविम रेखा', '3D रेखा']],
  ['large-print-accessible-maths-paper|promptText|39', ['कि मुफ़्त खाता', 'कि Overleaf के लिए मुफ़्त खाता']],
  ['algebra-worksheet-with-method-sized-space|promptText|39', ['Overleaf परियोजना के लिए मुफ़्त खाता', 'Overleaf परियोजना के लिए Overleaf पर मुफ़्त खाता']],
  ['typst-speed-typeset-practice-sheet|promptText|42', ['कि मुफ़्त खाता', 'कि Overleaf के लिए मुफ़्त खाता']],
  ['map-a-lesson-register-to-supplied-outcomes|promptText|43', ['केवल femh1', 'केवल NCERT पुस्तक-कोड femh1']],
  ['multiple-sequence-continuations-explainer|promptText|29', ['कूट खोलने पर', 'URL कूट खोलने पर']],
  ['send-a-study-reflection-coach-link|promptText|12', ['पहले से भरी लिंक कभी न दें', 'पहले से भरा URL कभी न दें']],
  ['full-length-timed-mock-with-time-per-section-plan|promptText|18', ['अनुभाग ए/बी/सी/डी', 'अनुभाग A/B/C/D']],
  ['mock-plus-performance-analysis-template|promptText|21', ['(हाँ/नहीं)', '(Y/N)']],
  ['graph-intuition-trainer-learn-to-sketch-any-function|promptText|8', ['अधिकतम/न्यूनतम', 'max/min']],
  ['three-level-set-a-b-c-quiz-scripts|promptText|36', ['पूर्ण A/B/C FormApp', 'पूर्ण FormApp', 'पूर्ण प्रपत्र']],
]);

function mustReplace(line, from, to, context, done = to) {
  if (line.includes(done)) return line;
  if (!line.includes(from)) {
    throw new Error(`${context}: expected repair source not found: ${from}`);
  }
  return line.replace(from, to);
}

function protectedSpan(line, index) {
  const spans = [
    ...Array.from(line.matchAll(/\[\[[^\]\n]+\]\]|\[[^\]\n]+\]/g), match => [match.index, match.index + match[0].length]),
    ...Array.from(line.matchAll(/https?:\/\/[^\s<>"']+/g), match => [match.index, match.index + match[0].length]),
    ...Array.from(line.matchAll(/`[^`\n]+`/g), match => [match.index, match.index + match[0].length]),
  ];
  return spans.some(([start, end]) => index >= start && index < end);
}

function asciiAnchorSpan(line, index) {
  for (const match of line.matchAll(/\([^()]*\)/g)) {
    if (index >= match.index && index < match.index + match[0].length && /[A-Za-z]{2}/.test(match[0])) return true;
  }
  return false;
}

function fallbackFor(term, englishLine) {
  if (term === 'Google Forms' || term === 'Google Form') {
    if (englishLine.includes('Google Form')) return 'Google Form';
    if (/\bForms\b/.test(englishLine)) return 'Forms';
    if (/\bForm\b/.test(englishLine)) return 'Form';
  }
  if (term === 'Google Sheets') {
    if (/\bSheets\b/.test(englishLine)) return 'Sheets';
    if (/\bSheet\b/.test(englishLine)) return 'Sheet';
    if (/\bsheet\b/.test(englishLine)) return 'sheet';
  }
  if (term === 'JEE Advanced' && englishLine.includes('JEE-Advanced')) return 'JEE-Advanced';
  return FALLBACKS.get(term) || '';
}

function keptSurface(term, matched, desired) {
  if (term === 'Worksheet' && /[\u0900-\u097f]/u.test(matched)) return `${matched} (${desired})`;
  return desired;
}

function synchronizeTerm(englishLine, hindiLine, term, context) {
  if (count(englishLine, term) === count(hindiLine, term)) return hindiLine;
  const variants = [term, ...(SPECIAL_VARIANTS.get(term) || [])]
    .filter((item, index, values) => values.indexOf(item) === index)
    .sort((left, right) => right.length - left.length);
  const sourceMatches = Array.from(englishLine.matchAll(new RegExp(escapeRegExp(term), 'gi')));
  const targetPattern = new RegExp(variants.map(escapeRegExp).join('|'), 'giu');
  const targetMatches = Array.from(hindiLine.matchAll(targetPattern));
  if (targetMatches.length < sourceMatches.length) {
    throw new Error(`${context}: cannot safely restore ${term} (${sourceMatches.length} source surfaces, ${targetMatches.length} Hindi surfaces)`);
  }

  const ranked = targetMatches.map((match, index) => {
    let score = 0;
    if (protectedSpan(hindiLine, match.index)) score += 1000;
    if (asciiAnchorSpan(hindiLine, match.index)) score += 200;
    if (sourceMatches.some(sourceMatch => sourceMatch[0] === match[0])) score += 20;
    score -= match.index / Math.max(1, hindiLine.length);
    return { index, score };
  }).sort((left, right) => right.score - left.score || left.index - right.index);
  const keptIndexes = new Set(ranked.slice(0, sourceMatches.length).map(item => item.index));
  const selected = targetMatches
    .map((match, index) => ({ match, index }))
    .filter(item => keptIndexes.has(item.index))
    .sort((left, right) => left.match.index - right.match.index);
  const desiredByIndex = new Map(selected.map((item, index) => [item.index, sourceMatches[index][0]]));

  let repaired = hindiLine;
  for (let index = targetMatches.length - 1; index >= 0; index -= 1) {
    const match = targetMatches[index];
    const replacement = keptIndexes.has(index)
      ? keptSurface(term, match[0], desiredByIndex.get(index))
      : fallbackFor(term, englishLine);
    repaired = repaired.slice(0, match.index) + replacement + repaired.slice(match.index + match[0].length);
  }
  repaired = repaired.replace(/[ \t]{2,}/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  if (count(englishLine, term) !== count(repaired, term)) {
    throw new Error(`${context}: ${term} count remains ${count(repaired, term)}; expected ${count(englishLine, term)}`);
  }
  return repaired;
}

function numberCandidates(line, token) {
  const pattern = new RegExp(`\\d+(?:\\.\\d+)?`, 'g');
  return Array.from(line.matchAll(pattern))
    .filter(match => match[0] === token && !protectedSpan(line, match.index))
    .map(match => {
      const before = line.slice(0, match.index);
      const after = line.slice(match.index + match[0].length);
      let score = 0;
      if (/^\s*$/.test(before) && /^[.)]/.test(after)) score -= 1000;
      if (asciiAnchorSpan(line, match.index)) score -= 100;
      if (new RegExp(`^\\s*\\([^)]*\\b${escapeRegExp(token)}\\b`).test(after)) score += 300;
      if (new RegExp(`^\\s*[/–—-][^()]*\\b${escapeRegExp(token)}\\b`).test(after)) score += 250;
      score -= match.index / Math.max(1, line.length);
      return { index: match.index, length: match[0].length, score };
    }).sort((left, right) => right.score - left.score || left.index - right.index);
}

function synchronizeNumbers(englishLine, hindiLine, context) {
  let repaired = hindiLine;
  if (count(englishLine, '10') + 1 === count(repaired, '10') && repaired.includes('10-10')) {
    repaired = repaired.replace('10-10', '10 प्रत्येक');
  }
  const rangeSurfaces = new Set(Array.from(repaired.matchAll(/\b\d+(?:\.\d+)?[-–]\d+(?:\.\d+)?\b/g), match => match[0]));
  for (const surface of rangeSurfaces) {
    const [left, right] = surface.split(/[-–]/);
    const targetNumbers = numbers(repaired);
    const sourceNumbers = numbers(englishLine);
    let surplus = Math.min(
      targetNumbers.filter(item => item === left).length - sourceNumbers.filter(item => item === left).length,
      targetNumbers.filter(item => item === right).length - sourceNumbers.filter(item => item === right).length,
    );
    while (surplus > 0) {
      const matches = Array.from(repaired.matchAll(new RegExp(escapeRegExp(surface), 'g')))
        .filter(match => !protectedSpan(repaired, match.index))
        .sort((left, right) => Number(asciiAnchorSpan(repaired, left.index)) - Number(asciiAnchorSpan(repaired, right.index)) || left.index - right.index);
      const match = matches[0];
      const separator = surface.slice(left.length, surface.length - right.length);
      if (!match || !NUMBER_WORDS.has(left) || !NUMBER_WORDS.has(right)) {
        throw new Error(`${context}: cannot safely remove surplus range ${surface}`);
      }
      const replacement = `${NUMBER_WORDS.get(left)}${separator}${NUMBER_WORDS.get(right)}`;
      repaired = repaired.slice(0, match.index) + replacement + repaired.slice(match.index + match[0].length);
      surplus -= 1;
    }
  }
  const expected = new Map(numbers(englishLine).map(token => [token, (numbers(englishLine).filter(item => item === token).length)]));
  const actualTokens = new Set(numbers(repaired));
  for (const token of actualTokens) {
    const surplus = numbers(repaired).filter(item => item === token).length - (expected.get(token) || 0);
    if (surplus <= 0) continue;
    const word = NUMBER_WORDS.get(token);
    if (!word) throw new Error(`${context}: no audited Hindi word for surplus number ${token}`);
    for (let iteration = 0; iteration < surplus; iteration += 1) {
      const candidate = numberCandidates(repaired, token)[0];
      if (!candidate || candidate.score <= -500) throw new Error(`${context}: cannot safely remove surplus number ${token}`);
      repaired = repaired.slice(0, candidate.index) + word + repaired.slice(candidate.index + candidate.length);
    }
  }
  if (!same(numbers(englishLine), numbers(repaired))) {
    throw new Error(`${context}: number inventory remains EN=${JSON.stringify(numbers(englishLine))} HI=${JSON.stringify(numbers(repaired))}`);
  }
  return repaired;
}

function assertUnchanged(label, inventory, before, after, context) {
  if (!same(inventory(before), inventory(after))) throw new Error(`${context}: ${label} changed during repair`);
}

const frozen = [...FROZEN_TERMS].sort((left, right) => right.length - left.length);
const changedSlugs = new Set();
let changedLines = 0;

function repairField(prompt, field, englishValue, hindiValue) {
  const englishLines = String(englishValue || '').split('\n');
  const hindiLines = String(hindiValue || '').split('\n');
  if (englishLines.length !== hindiLines.length || !same(lineShape(englishValue), lineShape(hindiValue))) {
    throw new Error(`${prompt.slug}|${field}: line/blank shape differs before invariant repair`);
  }
  let inFence = false;
  const repairedLines = hindiLines.map((original, index) => {
    const englishLine = englishLines[index];
    const context = `${prompt.slug}|${field}|${index + 1}`;
    const fenceCount = (englishLine.match(/```/g) || []).length;
    if (inFence || fenceCount) {
      for (const term of frozen) if (count(englishLine, term) !== count(original, term)) {
        throw new Error(`${context}: frozen mismatch inside fenced code requires manual review (${term})`);
      }
      if (!same(numbers(englishLine), numbers(original))) throw new Error(`${context}: number mismatch inside fenced code requires manual review`);
      if (fenceCount % 2) inFence = !inFence;
      return original;
    }

    let repaired = original;
    const explicit = LINE_REWRITES.get(context);
    if (explicit) repaired = mustReplace(repaired, explicit[0], explicit[1], context, explicit[2]);

    // A legacy escape bug doubled the closing delimiter in the shared maths
    // formatting sentence. Restoring one slash is exact and prose-neutral.
    if (!same(displayMath(englishLine), displayMath(repaired))) {
      repaired = repaired.replaceAll('\\\\(', '\\(').replaceAll('\\\\)', '\\)');
    }

    for (const term of frozen) repaired = synchronizeTerm(englishLine, repaired, term, context);
    repaired = synchronizeNumbers(englishLine, repaired, context);

    assertUnchanged('placeholders', brackets, original, repaired, context);
    assertUnchanged('URLs', urls, original, repaired, context);
    assertUnchanged('domains', domains, original, repaired, context);
    assertUnchanged('file names', files, original, repaired, context);
    assertUnchanged('inline code', inlineCode, original, repaired, context);
    if (!same(displayMath(englishLine), displayMath(repaired))) throw new Error(`${context}: displayed maths still differs`);
    for (const literal of [...MACHINE_QUERY_TOKENS, ...MACHINE_EXACT_LITERALS, ...MATH_EXACT_LITERALS]) {
      if (count(englishLine, literal) !== count(repaired, literal)) throw new Error(`${context}: exact literal differs: ${literal}`);
    }
    for (const route of MACHINE_ROUTES) {
      if (count(englishLine, route) !== count(repaired, route)) {
        if (route === 'Create → Import → Paste questions' && count(englishLine, route) === 0 && count(repaired, route) === 1) {
          repaired = repaired.replace(route, 'Create, Import और Paste questions');
        } else {
          throw new Error(`${context}: machine route differs: ${route}`);
        }
      }
    }
    for (const term of frozen) if (count(englishLine, term) !== count(repaired, term)) {
      throw new Error(`${context}: final frozen mismatch: ${term}`);
    }
    if (!same(numbers(englishLine), numbers(repaired))) throw new Error(`${context}: final number mismatch`);
    for (const [label, inventory] of [
      ['placeholders', brackets], ['URLs', urls], ['domains', domains], ['file names', files], ['inline code', inlineCode],
    ]) {
      if (!same(inventory(englishLine), inventory(repaired))) throw new Error(`${context}: final ${label} mismatch`);
    }
    if (repaired !== original) {
      changedLines += 1;
      changedSlugs.add(prompt.slug);
    }
    return repaired;
  });
  return repairedLines.join('\n');
}

const batch = [];
for (const category of data.categories) {
  for (const prompt of category.prompts) {
    if (!prompt.hi) throw new Error(`Hindi missing: ${prompt.slug}`);
    const before = JSON.stringify(prompt.hi);
    const hi = structuredClone(prompt.hi);
    for (const field of ['title', 'whatYouGet', 'howToUse', 'commonFix', 'promptText']) {
      hi[field] = repairField(prompt, field, prompt[field], hi[field]);
    }
    hi.effectiveUsage = (prompt.effectiveUsage || []).map((value, index) => repairField(
      prompt,
      `effectiveUsage[${index}]`,
      value,
      hi.effectiveUsage && hi.effectiveUsage[index],
    ));
    if (!same(codeBlocks(prompt.promptText), codeBlocks(hi.promptText))) {
      throw new Error(`${prompt.slug}: fenced code blocks differ after repair`);
    }
    if (JSON.stringify(hi) !== before) batch.push({ title: prompt.title, hi });
  }
}

if (batch.length && CHECK) {
  console.error(`Hindi invariant audit found ${batch.length} records needing repair (${changedLines} changed lines).`);
  process.exitCode = 1;
} else if (batch.length) {
  writeFileSync(OUTPUT, `${JSON.stringify(batch, null, 2)}\n`);
  console.log(`wrote ${batch.length} repaired Hindi records (${changedLines} changed lines) to ${OUTPUT}`);
  console.log(`changed slugs: ${changedSlugs.size}`);
} else {
  console.log('Hindi invariant audit is already clean; existing repair batch was not overwritten.');
}
