#!/usr/bin/env node
// Adversarial regression tests for the *mechanical* Phase 3 translation gate.
// These checks cannot establish semantic equivalence. In particular, polarity,
// placeholder-role swaps within one line, and fluent but irrelevant filler need
// independent bilingual reviewer evidence before a language pack can go live.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { languageConfig, validateTranslation } from './lang-qa.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contract = readFileSync(resolve(ROOT, '_handoff/tool-link-contract.txt'), 'utf8').trim();
const bn = languageConfig('bn');
const mr = languageConfig('mr');

const promptPrefix = [
  'Use [TOPIC] to prepare a careful response for 42 learners at https://example.com/check?value=42.',
  'Preserve report.pdf, `x+1`, $$x^2+1=0$$, and the reference.example.org domain exactly.',
  'Keep this exact code block unchanged:',
  '```js',
  'const value = 42;',
  '```',
  'Explain every instruction fully and keep the requested order and level of detail.',
].join('\n');

const bengaliPrefix = [
  'https://example.com/check?value=42 ঠিকানায় 42 জন শিক্ষার্থীর জন্য [TOPIC] ব্যবহার করে একটি যত্নশীল উত্তর প্রস্তুত করুন।',
  'report.pdf, `x+1`, $$x^2+1=0$$ এবং reference.example.org ডোমেনটি ঠিক একইভাবে সংরক্ষণ করুন।',
  'এই নির্ভুল কোড ব্লকটি অপরিবর্তিত রাখুন:',
  '```js',
  'const value = 42;',
  '```',
  'প্রতিটি নির্দেশ সম্পূর্ণভাবে ব্যাখ্যা করুন এবং অনুরোধ করা ক্রম ও বিশদের মাত্রা বজায় রাখুন।',
].join('\n');

const prompt = {
  title: 'Translation invariant regression fixture',
  whatYouGet: 'A complete, carefully organized response that preserves every requested detail and gives the reader enough context to use the result without guessing or reconstructing omitted instructions.',
  howToUse: 'Replace the requested input, read every instruction, and retain all details when preparing the final response for the intended reader.',
  effectiveUsage: [
    'Use the result when a complete response must preserve all supplied constraints.',
    'Review the result against the source before sharing it with the intended reader.',
  ],
  commonFix: 'If any requested detail is missing, restore it from the source instead of shortening the response.',
  promptText: `${promptPrefix}\n${contract}`,
};

const translation = {
  title: 'অনুবাদ নিয়মের পরীক্ষামূলক নমুনা',
  whatYouGet: 'একটি সম্পূর্ণ ও যত্নসহকারে সাজানো উত্তর পাবেন, যা অনুরোধ করা প্রতিটি বিশদ সংরক্ষণ করে এবং বাদ পড়া নির্দেশ অনুমান বা নতুন করে গঠন না করেই ফলটি ব্যবহার করার জন্য পাঠককে যথেষ্ট প্রেক্ষাপট দেয়।',
  howToUse: 'অনুরোধ করা ইনপুট প্রতিস্থাপন করুন, প্রতিটি নির্দেশ পড়ুন এবং নির্দিষ্ট পাঠকের জন্য চূড়ান্ত উত্তর প্রস্তুত করার সময় সব বিশদ বজায় রাখুন।',
  effectiveUsage: [
    'যখন একটি সম্পূর্ণ উত্তরে দেওয়া সব সীমাবদ্ধতা সংরক্ষণ করতে হবে, তখন ফলটি ব্যবহার করুন।',
    'নির্দিষ্ট পাঠকের সঙ্গে ভাগ করার আগে উৎসের সঙ্গে ফলটি মিলিয়ে পর্যালোচনা করুন।',
  ],
  commonFix: 'অনুরোধ করা কোনো বিশদ বাদ পড়লে উত্তর ছোট না করে উৎস থেকে সেই বিশদ পুনরুদ্ধার করুন।',
  promptText: `${bengaliPrefix}\n${contract}`,
};

const clone = value => structuredClone(value);
const errorsFor = (candidate, source = prompt, config = bn) => validateTranslation(source, candidate, config, contract);
const expectReject = (name, mutate, expectedFragments) => {
  const candidate = clone(translation);
  mutate(candidate);
  const errors = errorsFor(candidate);
  for (const fragment of expectedFragments) {
    assert(errors.some(error => error.includes(fragment)), `${name}: expected an error containing ${JSON.stringify(fragment)}; got ${JSON.stringify(errors)}`);
  }
};

assert.deepEqual(errorsFor(translation), [], 'the valid control translation must pass');

expectReject('wrong script', value => {
  value.title = 'అనువాద నియమ పరీక్ష నమూనా';
}, ['title has fewer than 2 Bengali script characters']);

expectReject('missing placeholder', value => {
  value.promptText = value.promptText.replace('[TOPIC]', 'বিষয়');
}, ['promptText placeholder tokens damaged']);

expectReject('placeholder moved to another line', value => {
  const lines = value.promptText.split('\n');
  lines[0] = lines[0].replace('[TOPIC]', 'বিষয়');
  lines[1] = `[TOPIC] ${lines[1]}`;
  value.promptText = lines.join('\n');
}, ['promptText line 1 placeholder tokens moved or changed', 'promptText line 2 placeholder tokens moved or changed']);

expectReject('altered number', value => {
  value.promptText = value.promptText.replace('42 জন', '43 জন');
}, ['promptText numbers changed']);

expectReject('altered URL', value => {
  value.promptText = value.promptText.replace('https://example.com/check?value=42', 'https://example.com/check?value=43');
}, ['promptText URLs changed']);

expectReject('altered bare domain', value => {
  value.promptText = value.promptText.replace('reference.example.org', 'reference.example.net');
}, ['promptText domain names changed']);

expectReject('altered file name', value => {
  value.promptText = value.promptText.replace('report.pdf', 'report.docx');
}, ['promptText file names changed']);

expectReject('altered inline code', value => {
  value.promptText = value.promptText.replace('`x+1`', '`x+2`');
}, ['promptText inline code changed']);

expectReject('altered fenced code', value => {
  value.promptText = value.promptText.replace('const value = 42;', 'const value = 43;');
}, ['promptText fenced code changed']);

expectReject('altered displayed maths', value => {
  value.promptText = value.promptText.replace('$$x^2+1=0$$', '$$x^2+2=0$$');
}, ['promptText displayed math changed']);

expectReject('altered tool-link contract', value => {
  value.promptText = `${value.promptText.slice(0, -1)}!`;
}, ['tool-link contract is not the exact final suffix']);

expectReject('short summary', value => {
  value.whatYouGet = 'একটি ছোট সারাংশ।';
}, ['whatYouGet appears truncated']);

expectReject('repetitive filler', value => {
  value.whatYouGet = 'একই কথা '.repeat(60).trim();
}, ['whatYouGet is implausibly repetitive instead of a full translation']);

expectReject('generic looping filler', value => {
  value.whatYouGet = 'এই বিষয়টি গুরুত্বপূর্ণ তাই আরও সাধারণ আলোচনা এখানে যোগ করা হলো '.repeat(18).trim();
}, ['whatYouGet is implausibly repetitive instead of a full translation']);

const hindiPrefix = [
  'https://example.com/check?value=42 पते पर 42 विद्यार्थियों के लिए [TOPIC] का उपयोग करके सावधानीपूर्वक उत्तर तैयार करें।',
  'report.pdf, `x+1`, $$x^2+1=0$$ और reference.example.org डोमेन को बिल्कुल उसी रूप में सुरक्षित रखें।',
  'इस सटीक कोड ब्लॉक को बिना बदलाव के रखें:',
  '```js',
  'const value = 42;',
  '```',
  'हर निर्देश को पूरी तरह समझाएँ और माँगा गया क्रम तथा विवरण का स्तर बनाए रखें।',
].join('\n');
const hindi = {
  title: 'अनुवाद नियम परीक्षण नमूना',
  whatYouGet: 'एक पूर्ण और सावधानी से व्यवस्थित उत्तर मिलेगा, जो माँगी गई हर जानकारी सुरक्षित रखता है और पाठक को छोड़े गए निर्देशों का अनुमान लगाए बिना परिणाम उपयोग करने के लिए पर्याप्त संदर्भ देता है।',
  howToUse: 'माँगा गया इनपुट बदलें, हर निर्देश पढ़ें और लक्षित पाठक के लिए अंतिम उत्तर तैयार करते समय सभी विवरण सुरक्षित रखें।',
  effectiveUsage: [
    'जब पूर्ण उत्तर में दी गई सभी सीमाएँ सुरक्षित रखनी हों, तब परिणाम का उपयोग करें।',
    'लक्षित पाठक के साथ साझा करने से पहले स्रोत से मिलाकर परिणाम की समीक्षा करें।',
  ],
  commonFix: 'यदि माँगी गई कोई जानकारी छूट जाए तो उत्तर छोटा करने के बजाय उसे स्रोत से वापस जोड़ें।',
  promptText: `${hindiPrefix}\n${contract}`,
};
const marathiSource = { ...prompt, hi: hindi };
const marathiErrors = errorsFor(hindi, marathiSource, mr);
assert(
  marathiErrors.some(error => error.includes('near-duplicate of Hindi instead of Marathi')),
  `Hindi-as-Marathi: expected a near-duplicate rejection; got ${JSON.stringify(marathiErrors)}`,
);

console.log('lang-qa adversarial regressions: PASS | valid control 1 | rejected mutations 15');
console.log('semantic-review boundary: polarity, same-line role swaps, and fluent irrelevant filler require independent bilingual reviewer evidence');
