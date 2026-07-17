// Read-only structural validator for a Hindi translation batch before merge-hindi.mjs.
// Usage: node tools/validate-hindi-batch.mjs <source-chunk.json> <translation-batch.json>
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [sourceArg, batchArg] = process.argv.slice(2);
if (!sourceArg || !batchArg) {
  console.error('usage: node tools/validate-hindi-batch.mjs <source-chunk.json> <translation-batch.json>');
  process.exit(1);
}

const source = JSON.parse(readFileSync(resolve(ROOT, sourceArg), 'utf8'));
const batch = JSON.parse(readFileSync(resolve(ROOT, batchArg), 'utf8'));
const contract = readFileSync(resolve(ROOT, '_handoff/tool-link-contract.txt'), 'utf8');
const errors = [];
const placeholders = value => (String(value).match(/\[[^\]\n]{1,80}\]/g) || []).sort().join('|');
const urls = value => (String(value).match(/https?:\/\/[^\s]+/g) || []).map(url => url.replace(/[.,;:!?।]+$/u, '')).sort().join('|');
const numbers = value => (String(value).match(/\d+(?:\.\d+)?/g) || []).sort().join('|');
const blankLines = value => String(value).split('\n').map((line, index) => line === '' ? index : null).filter(index => index !== null).join('|');
const devanagari = value => (String(value).match(/[ऀ-ॿ]/g) || []).length;
const forbiddenName = String.fromCharCode(73, 110, 100, 114, 97, 106, 101, 101, 116, 32, 89, 97, 100, 97, 118);
const structuralLabels = [
  'ROLE',
  'CONTEXT',
  'INPUTS — FILL EVERY PLACEHOLDER',
  'SOURCE-BOUND TOOL FACTS AND EXACT URL WHITELIST',
  'DO THIS',
  'WORKED LINK EXAMPLE — COPY THIS EXACT ENCODING PATTERN',
  'OUTPUT FORMAT',
  'QUALITY AND TOOL GUARDRAILS',
];
const workedLabels = ['Example task', 'Expected result or check target', 'Encoding note'];

function validateBilingualLabels(englishText, hindiText, prefix) {
  const englishLines = String(englishText).split('\n');
  const hindiLines = String(hindiText).split('\n');
  let inOutput = false;
  for (let line = 0; line < englishLines.length; line++) {
    const englishLine = englishLines[line];
    const hindiLine = hindiLines[line] || '';
    for (const label of structuralLabels) {
      if (englishLine === `${label}:` && !hindiLine.includes(`(${label})`)) {
        errors.push(`${prefix}: line ${line + 1} missing bilingual label ${label}`);
      }
    }
    for (const label of workedLabels) {
      if (englishLine.startsWith(`${label}:`) && !hindiLine.includes(`(${label})`)) {
        errors.push(`${prefix}: line ${line + 1} missing bilingual label ${label}`);
      }
    }
    if (englishLine === 'OUTPUT FORMAT:') inOutput = true;
    else if (inOutput && englishLine === '') inOutput = false;
    if (inOutput) {
      const match = englishLine.match(/^\d+\. ([^—]+?) —/);
      const embeddedEnglish = match?.[1].match(/\(([^()]+)\)\s*$/)?.[1];
      const requiredLabel = embeddedEnglish || match?.[1];
      const normalizedHindiLine = hindiLine.toLowerCase();
      const normalizedRequiredLabel = requiredLabel?.toLowerCase();
      const hasRequiredLabel = normalizedRequiredLabel && (
        normalizedHindiLine.includes(`(${normalizedRequiredLabel})`) ||
        normalizedHindiLine.includes(`(${normalizedRequiredLabel} —`)
      );
      if (requiredLabel && !hasRequiredLabel) {
        errors.push(`${prefix}: line ${line + 1} missing output label ${requiredLabel}`);
      }
    }
    if (englishLine === 'check this yourself' && hindiLine !== englishLine) errors.push(`${prefix}: line ${line + 1} changed check sentinel`);
    if ((englishLine.startsWith('CHECK → ') || englishLine.startsWith('(paste-fallback: ')) && hindiLine !== englishLine) {
      errors.push(`${prefix}: line ${line + 1} changed worked-link line`);
    }
  }
}

if (!Array.isArray(source) || !Array.isArray(batch)) errors.push('source and batch roots must be arrays');
if (batch.length !== source.length) errors.push(`entry count ${batch.length} != ${source.length}`);

for (let index = 0; index < source.length; index++) {
  const english = source[index];
  const translated = batch[index] || {};
  const hi = translated.hi || {};
  const prefix = `${index}:${english.title}`;
  if (translated.title !== english.title) errors.push(`${prefix}: exact title/order mismatch`);
  for (const field of ['title', 'whatYouGet', 'howToUse', 'commonFix', 'promptText']) {
    if (typeof hi[field] !== 'string' || !hi[field]) errors.push(`${prefix}: missing hi.${field}`);
  }
  if (!Array.isArray(hi.effectiveUsage) || hi.effectiveUsage.length !== english.effectiveUsage.length) {
    errors.push(`${prefix}: effectiveUsage count mismatch`);
  }
  for (const field of ['whatYouGet', 'howToUse', 'commonFix', 'promptText']) {
    if (placeholders(english[field]) !== placeholders(hi[field])) errors.push(`${prefix}: ${field} placeholder mismatch`);
    if (urls(english[field]) !== urls(hi[field])) errors.push(`${prefix}: ${field} URL mismatch`);
    if (numbers(english[field]) !== numbers(hi[field])) errors.push(`${prefix}: ${field} ASCII-number mismatch`);
  }
  for (let item = 0; item < english.effectiveUsage.length; item++) {
    const enItem = english.effectiveUsage[item];
    const hiItem = hi.effectiveUsage?.[item] || '';
    if (placeholders(enItem) !== placeholders(hiItem)) errors.push(`${prefix}: effectiveUsage ${item + 1} placeholder mismatch`);
    if (urls(enItem) !== urls(hiItem)) errors.push(`${prefix}: effectiveUsage ${item + 1} URL mismatch`);
    if (numbers(enItem) !== numbers(hiItem)) errors.push(`${prefix}: effectiveUsage ${item + 1} ASCII-number mismatch`);
  }
  if (String(english.promptText).split('\n').length !== String(hi.promptText).split('\n').length) errors.push(`${prefix}: promptText line-count mismatch`);
  if (blankLines(english.promptText) !== blankLines(hi.promptText)) errors.push(`${prefix}: promptText blank-line mismatch`);
  validateBilingualLabels(english.promptText, hi.promptText, prefix);
  if (!String(hi.promptText).endsWith(contract)) errors.push(`${prefix}: contract is not verbatim at end`);
  if (String(hi.promptText).indexOf(contract) !== String(hi.promptText).lastIndexOf(contract)) errors.push(`${prefix}: contract appears more than once`);
  if (devanagari(hi.title) < 2 || devanagari(hi.promptText) < 50) errors.push(`${prefix}: insufficient Devanagari`);
  if (JSON.stringify(hi).includes(forbiddenName)) errors.push(`${prefix}: forbidden owner name`);
}

console.log(`Hindi batch validation: ${batch.length}/${source.length} entries | errors: ${errors.length}`);
if (errors.length) {
  errors.forEach(error => console.error(`ERROR: ${error}`));
  process.exit(1);
}
