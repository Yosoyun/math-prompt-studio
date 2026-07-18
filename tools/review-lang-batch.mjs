#!/usr/bin/env node
// Surface source/target polarity lines for independent semantic review.
// This is evidence, not an automatic semantic pass: every candidate must be
// read by the working frontier LLM before a batch is merged.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const valueAfter = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : '';
};
const lang = valueAfter('--lang');
const sourceName = valueAfter('--source');
const inputName = valueAfter('--input');
if (!['bn', 'mr', 'te'].includes(lang) || !sourceName || !inputName) {
  console.error('usage: node tools/review-lang-batch.mjs --lang bn|mr|te --source <chunk.json> --input <batch.json>');
  process.exit(2);
}

const source = JSON.parse(readFileSync(resolve(process.cwd(), sourceName), 'utf8'));
const batch = JSON.parse(readFileSync(resolve(process.cwd(), inputName), 'utf8'));
const translatedByTitle = new Map(batch.map(record => [record.title, record[lang]]));
const fields = ['title', 'whatYouGet', 'howToUse', 'commonFix', 'promptText'];
const sourcePolarity = /\b(?:no|not|never|without|only|cannot|can't|do not|does not|don't|doesn't|must not|mustn't|nothing|none|neither|nor|except|unless)\b/i;
const targetCues = {
  bn: /(?:না|নয়|নেই|কখনো|শুধু|কেবল|ছাড়া|ব্যতীত|নিষেধ|নইলে|নয়তো|বাদে|বিনা)/u,
  mr: /(?:नाही|नका|कधीही|फक्त|केवळ|शिवाय|विना|नव्हे|नसले|नसेल|नको|न देता|न करता|वगळता|खेरीज)/u,
  te: /(?:కాదు|వద్దు|లేదు|లేకుండా|లేకపోతే|ఎప్పుడూ|మాత్రమే|కేవలం|చేయకండి|చేయరాదు|వేయవద్దు|కుదరదు|కాక|పరిగణించబడవు|ఉండకూడదు|మినహా)/u,
};
const candidates = [];
let polarityLines = 0;

for (const prompt of source) {
  const translation = translatedByTitle.get(prompt.title);
  if (!translation) throw new Error(`batch translation missing: ${prompt.title}`);
  const pairs = fields.map(field => [field, prompt[field], translation[field]]);
  (prompt.effectiveUsage || []).forEach((value, index) => pairs.push([
    `effectiveUsage[${index}]`,
    value,
    translation.effectiveUsage?.[index],
  ]));
  for (const [field, english, target] of pairs) {
    const sourceLines = String(english || '').split('\n');
    const targetLines = String(target || '').split('\n');
    sourceLines.forEach((line, index) => {
      if (!sourcePolarity.test(line)) return;
      polarityLines += 1;
      const translatedLine = targetLines[index] || '';
      if (!targetCues[lang].test(translatedLine)) candidates.push({
        title: prompt.title,
        field,
        line: index + 1,
        english: line,
        target: translatedLine,
      });
    });
  }
}

process.stdout.write(`${JSON.stringify({
  language: lang,
  records: batch.length,
  polarityLines,
  candidates,
  note: 'Candidates are review prompts, not automatic rejects; semantic approval still requires reading them.',
}, null, 2)}\n`);
