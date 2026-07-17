// Generates the complete English category and merge-hindi input from reviewed specs.
// It deliberately does not read or write data/prompts.js.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORY, ITEMS } from './pyq-workflows.spec.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(DIR, '../..');
const contract = readFileSync(resolve(ROOT, '_handoff/tool-link-contract.txt'), 'utf8');

const slugify = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72).replace(/-+$/g, '');

const sourceFactsEn = [
  '- [PROBLEM_ATLAS] Source-discovery page supplied by the teacher: https://yosoyun.github.io/problem-atlas/ . It is a place to locate material for human inspection, not proof that a pasted question or label is authentic. Use only exact question text the teacher pastes.',
  '- [WOLFRAMALPHA] Whitelist: https://www.wolframalpha.com/input?i={ENCODED_PLAIN_CALCULATOR_QUERY}. It can recompute a mathematical result but cannot authenticate a PYQ, prove the surrounding reasoning or establish an exam trend. Detailed steps may require Pro.',
];

const sourceFactsHi = [
  '- [PROBLEM_ATLAS] शिक्षक द्वारा दिया स्रोत-खोज पृष्ठ: https://yosoyun.github.io/problem-atlas/ । यह मानवीय जाँच के लिए सामग्री खोजने का स्थान है, किसी पेस्ट प्रश्न या चिह्न की प्रामाणिकता का प्रमाण नहीं। केवल शिक्षक द्वारा पेस्ट किया ठीक प्रश्न-पाठ उपयोग करें।',
  '- [WOLFRAMALPHA] अनुमत प्रारूप: https://www.wolframalpha.com/input?i={ENCODED_PLAIN_CALCULATOR_QUERY}। यह गणितीय परिणाम की फिर गणना कर सकता है, पर PYQ की प्रामाणिकता, आसपास के तर्क का प्रमाण या परीक्षा का रुझान स्थापित नहीं कर सकता। विस्तृत चरणों के लिए Pro आवश्यक हो सकता है।',
];

const commonInputs = [
  '[EXACT TEACHER-PASTED QUESTION OR SET]',
  '[TEACHER-SUPPLIED EXAM AND YEAR LABEL]',
  '[TEACHER-SUPPLIED ANSWER OR MARKING SCHEME]',
  '[CLASSROOM GOAL]',
];

const effectiveUsage = [
  '1. Paste the exact complete question or set; never ask the AI to recall it.',
  '2. Keep every exam, year and source label explicitly teacher-supplied.',
  '3. Check the mathematics and every generated link before classroom use.',
  '4. Keep pasted source questions separate from all ORIGINAL PRACTICE material.',
];

const effectiveUsageHi = [
  '1. ठीक पूरा प्रश्न या समूह पेस्ट करें; AI से उसे याद करके लिखने को कभी न कहें।',
  '2. परीक्षा, वर्ष और स्रोत का हर चिह्न स्पष्ट रूप से शिक्षक द्वारा दिया हुआ रखें।',
  '3. कक्षा में उपयोग से पहले गणित और हर बनी लिंक जाँचें।',
  '4. पेस्ट स्रोत-प्रश्नों को सभी ORIGINAL PRACTICE सामग्री से अलग रखें।',
];

function promptTextEn(item) {
  return [
    `ROLE: ${item.role}`,
    '',
    `CONTEXT: A teacher has pasted real past-question text and wants to ${item.focus}. Work only from the exact pasted material and supplied records.`,
    '',
    'INPUTS — FILL EVERY PLACEHOLDER:',
    ...commonInputs.map(value => `- ${value}`),
    `- ${item.extraInput}`,
    '',
    'SOURCE-BOUND TOOL FACTS AND EXACT URL WHITELIST:',
    ...sourceFactsEn,
    '',
    'DO THIS:',
    '1. Copy and number the exact teacher-pasted question text; do not retrieve, reconstruct, complete or paraphrase any missing past question.',
    '2. Put [TEACHER-SUPPLIED EXAM AND YEAR LABEL] in a source ledger marked TEACHER-SUPPLIED — NOT AUTHENTICATED BY AI.',
    ...item.steps.map((value, index) => `${index + 3}. ${value}`),
    '7. Label every generated question, variant, response or extension ORIGINAL PRACTICE and keep it visually separate from pasted source text.',
    '8. Never call anything the latest or current pattern unless the teacher supplies dated official pattern evidence; otherwise state CURRENT PATTERN NOT ASSESSED.',
    '',
    'WORKED LINK EXAMPLE — COPY THIS EXACT ENCODING PATTERN:',
    'Example task: Recompute the roots of the model expression x^2-5x+6=0 after the teacher has checked its transcription.',
    'Expected result or check target: The calculation returns roots 2 and 3; it does not authenticate the question, its exam label or any trend claim.',
    'check this yourself',
    'CHECK → https://www.wolframalpha.com/input?i=solve%20x%5E2-5x%2B6%3D0',
    '(paste-fallback: solve x^2-5x+6=0)',
    'Encoding note: The space, caret, plus sign and equals sign decode to the exact plain-calculator query.',
    '',
    'OUTPUT FORMAT:',
    '1. Pasted Source Ledger — exact item numbers, teacher-supplied labels and unknown fields',
    `2. ${item.outputName} — ${item.outputDescription}`,
    '3. ORIGINAL PRACTICE Boundary — every generated element listed separately',
    '4. Answer and Check Record — solution, assumptions, independent check and link fallbacks',
    '5. Teacher Release Queue — source, maths, wording, accessibility and link checks still requiring a human',
    '',
    'QUALITY AND TOOL GUARDRAILS:',
    '- Refuse to fabricate, reconstruct, retrieve from memory or authenticate any PYQ. If [EXACT TEACHER-PASTED QUESTION OR SET] is absent or incomplete, ask for it and stop.',
    '- Treat every exam, year, session and source label as teacher-supplied and unverified unless the teacher records an independent human check; never authenticate it yourself.',
    '- Never claim a latest or current pattern, frequency, weightage, trend or prediction unless the teacher supplied the exact dated official evidence; a pasted set supports observations about that set only.',
    '- Label every AI-generated question, variant, distractor, response, hint or extension ORIGINAL PRACTICE; never present it as a PYQ, official item or recalled past question.',
    '- Point teachers to https://yosoyun.github.io/problem-atlas/ only as a source-discovery route; never say the page verifies a question or metadata.',
    '- Use WolframAlpha only for a teacher-inspected computation check labelled check this yourself; it does not prove reasoning, provenance or exam relevance.',
    '- Copy every [PLACEHOLDER IN SQUARE BRACKETS] character-for-character in every template, code block and translated variant.',
    '- Never output a desmos.com URL with parameters, a mathsolver.microsoft.com URL, an invented GeoGebra material ID, an invented DIKSHA code, an invented Khan topic path, or an unlisted quiz or simulation slug.',
    '- Never describe an AI answer as verified. Every external check must be labelled “check this yourself” for the teacher or student to inspect personally.',
    '- Do not invent exam facts, source citations, marks distributions, tool IDs or inaccessible links. Separate mathematical proof from computational checking.',
    '',
    contract,
  ].join('\n');
}

function promptTextHi(item) {
  return [
    `भूमिका (ROLE): ${item.roleHi}`,
    '',
    `संदर्भ (CONTEXT): शिक्षक ने वास्तविक पिछले प्रश्न का पाठ पेस्ट किया है और ${item.focusHi} चाहते हैं। केवल ठीक पेस्ट सामग्री और दिए अभिलेखों से काम करें।`,
    '',
    'इनपुट—हर स्थानधारक भरें (INPUTS — FILL EVERY PLACEHOLDER):',
    ...commonInputs.map(value => `- ${value}`),
    `- ${item.extraInput}`,
    '',
    'स्रोत-आधारित टूल तथ्य और ठीक-ठीक URL अनुमत-सूची (SOURCE-BOUND TOOL FACTS AND EXACT URL WHITELIST):',
    ...sourceFactsHi,
    '',
    'यह करें (DO THIS):',
    '1. शिक्षक द्वारा पेस्ट किए ठीक प्रश्न-पाठ को कॉपी करके क्रमांक दें; किसी गायब पिछले प्रश्न को खोजें, स्मृति से बनाएँ, पूरा करें या पुनर्लेखित न करें।',
    '2. [TEACHER-SUPPLIED EXAM AND YEAR LABEL] को स्रोत-विवरण में TEACHER-SUPPLIED — NOT AUTHENTICATED BY AI चिह्न के साथ रखें।',
    ...item.stepsHi.map((value, index) => `${index + 3}. ${value}`),
    '7. हर बनाए गए प्रश्न, रूपांतर, उत्तर या विस्तार को ORIGINAL PRACTICE लिखें और पेस्ट स्रोत-पाठ से साफ अलग रखें।',
    '8. जब तक शिक्षक दिनांकित आधिकारिक पैटर्न-प्रमाण न दें, किसी चीज़ को नवीनतम या मौजूदा पैटर्न न कहें; अन्यथा CURRENT PATTERN NOT ASSESSED लिखें।',
    '',
    'हल किया हुआ लिंक उदाहरण—इस कूटबद्धता ढाँचे को ठीक-ठीक कॉपी करें (WORKED LINK EXAMPLE — COPY THIS EXACT ENCODING PATTERN):',
    'उदाहरण कार्य (Example task): शिक्षक द्वारा प्रतिलिपि जाँचने के बाद नमूना व्यंजक x^2-5x+6=0 के मूल फिर गणना करें।',
    'अपेक्षित परिणाम या जाँच लक्ष्य (Expected result or check target): गणना से मूल 2 और 3 मिलते हैं; यह प्रश्न, परीक्षा-चिह्न या किसी रुझान-दावे की प्रामाणिकता तय नहीं करती।',
    'check this yourself',
    'CHECK → https://www.wolframalpha.com/input?i=solve%20x%5E2-5x%2B6%3D0',
    '(paste-fallback: solve x^2-5x+6=0)',
    'कूटबद्धता टिप्पणी (Encoding note): खाली स्थान, घात-चिह्न, जोड़-चिह्न और बराबर-चिह्न डिकोड होकर ठीक साधारण कैलकुलेटर क्वेरी बनाते हैं।',
    '',
    'आउटपुट प्रारूप (OUTPUT FORMAT):',
    '1. पेस्ट स्रोत-विवरण (Pasted Source Ledger) — ठीक प्रश्न-क्रमांक, शिक्षक द्वारा दिए चिह्न और अज्ञात खाने',
    `2. ${item.outputNameHi} (${item.outputName}) — ${item.outputDescriptionHi}`,
    '3. ORIGINAL PRACTICE सीमा (ORIGINAL PRACTICE Boundary) — हर बनाया गया तत्व अलग सूची में',
    '4. उत्तर और जाँच अभिलेख (Answer and Check Record) — समाधान, मान्यताएँ, स्वतंत्र जाँच और लिंक विकल्प',
    '5. शिक्षक जारी-जाँच सूची (Teacher Release Queue) — स्रोत, गणित, भाषा, सुगम्यता और लिंक की शेष मानवीय जाँच',
    '',
    'गुणवत्ता और टूल सुरक्षा-नियम (QUALITY AND TOOL GUARDRAILS):',
    '- किसी PYQ को गढ़ने, फिर बनाने, स्मृति से निकालने या प्रमाणित करने से इनकार करें। यदि [EXACT TEACHER-PASTED QUESTION OR SET] अनुपस्थित या अधूरा हो, तो उसे माँगें और रुक जाएँ।',
    '- परीक्षा, वर्ष, सत्र और स्रोत का हर चिह्न शिक्षक द्वारा दिया और अप्रमाणित मानें, जब तक शिक्षक स्वतंत्र मानवीय जाँच दर्ज न करें; उसकी प्रामाणिकता स्वयं कभी तय न करें।',
    '- जब तक शिक्षक ठीक दिनांकित आधिकारिक प्रमाण न दें, नवीनतम या मौजूदा पैटर्न, आवृत्ति, अंक-भार, रुझान या भविष्यवाणी का दावा न करें; पेस्ट समूह केवल उसी समूह के अवलोकन का समर्थन करता है।',
    '- AI द्वारा बनाए हर प्रश्न, रूपांतर, गलत विकल्प, उत्तर, संकेत या विस्तार को ORIGINAL PRACTICE लिखें; उसे PYQ, आधिकारिक प्रश्न या स्मृति से निकला पिछला प्रश्न कभी न बताएँ।',
    '- शिक्षकों को https://yosoyun.github.io/problem-atlas/ केवल स्रोत खोजने के मार्ग के रूप में बताएँ; कभी न कहें कि वह पृष्ठ प्रश्न या मेटाडेटा प्रमाणित करता है।',
    '- WolframAlpha का उपयोग केवल शिक्षक द्वारा जाँची, check this yourself चिह्न वाली संगणना-जाँच के लिए करें; यह तर्क, स्रोत या परीक्षा-प्रासंगिकता सिद्ध नहीं करता।',
    '- हर टेम्पलेट, कोड-खंड और अनूदित रूप में प्रत्येक [PLACEHOLDER IN SQUARE BRACKETS] को अक्षरशः कॉपी करें।',
    '- पैरामीटर वाला desmos.com URL, mathsolver.microsoft.com URL, गढ़ी हुई GeoGebra सामग्री ID, गढ़ा हुआ DIKSHA कोड, गढ़ा हुआ Khan विषय पथ या सूची से बाहर का प्रश्नोत्तरी अथवा सिमुलेशन स्लग कभी न दें।',
    '- AI के किसी उत्तर को सत्यापित न बताएँ। हर बाहरी जाँच पर “स्वयं जाँचें” का चिह्न हो, ताकि शिक्षक या विद्यार्थी उसे स्वयं परख सके।',
    '- परीक्षा-संबंधी तथ्य, स्रोत-उद्धरण, अंक-वितरण, उपकरण ID या ऐसी लिंक न गढ़ें जिसे खोला न जा सके। गणितीय प्रमाण और संगणकीय जाँच को अलग रखें।',
    '',
    contract,
  ].join('\n');
}

const prompts = ITEMS.map(item => ({
  title: item.title,
  tag: item.tag,
  needsImage: false,
  makesImage: false,
  whatYouGet: item.whatYouGet,
  bestTool: 'Any AI chat + browser checks',
  worksOnFree: 'Works with free AI and browser tools',
  howToUse: item.howToUse,
  effectiveUsage,
  commonFix: item.commonFix,
  promptText: promptTextEn(item),
  slug: slugify(item.title),
  exams: ['jee-main', 'jee-advanced'],
  aud: item.aud,
  fmt: item.fmt,
  added: '2026-07-17',
}));

const hindi = ITEMS.map((item, index) => ({
  title: prompts[index].title,
  hi: {
    title: item.titleHi,
    whatYouGet: item.whatYouGetHi,
    howToUse: item.howToUseHi,
    effectiveUsage: effectiveUsageHi,
    commonFix: item.commonFixHi,
    promptText: promptTextHi(item),
  },
}));

writeFileSync(resolve(DIR, 'pyq-workflows.json'), `${JSON.stringify({ ...CATEGORY, prompts }, null, 2)}\n`);
writeFileSync(resolve(DIR, 'pyq-workflows-hi.json'), `${JSON.stringify(hindi, null, 2)}\n`);
console.log(`Generated PYQ workflows: ${prompts.length} English + ${hindi.length} Hindi`);
