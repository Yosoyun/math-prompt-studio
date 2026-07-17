// Builds merge-ready Hindi batches for Wave 2 from reviewed Hindi specification files.
// This script never edits data/prompts.js; merge-hindi.mjs remains the only translation writer.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = resolve(ROOT, 'data/prompts.js');
const CONTRACT_FILE = resolve(ROOT, '_handoff/tool-link-contract.txt');
const TODO_DIR = resolve(ROOT, '_handoff/hindi-todo');
const SPEC_DIR = resolve(ROOT, 'tools/wave2-prompts');
const OUT_DIR = resolve(ROOT, '_handoff/hindi-wave2-batches');

const defs = [
  ['print-beautifully', 'print-beautifully.json', 'print-beautifully-hi.json', 25],
  ['doubt-research', 'doubt-research.json', 'doubt-research-hi.json', 20],
  ['endless-practice', 'endless-practice.json', 'endless-practice-hi.json', 20],
  ['marks-insight', 'marks-insight.json', 'marks-insight-hi.json', 25],
  ['grade-the-stack', 'grade-the-stack.json', 'grade-the-stack-hi.json', 20],
  ['nep-paperwork', 'nep-paperwork.json', 'nep-paperwork-hi.json', 20],
  ['student-ai-links', 'student-ai-links.json', 'student-ai-links-hi.json', 15],
  ['translation-inclusion', 'translation-inclusion.json', 'translation-inclusion-hi.json', 20],
  ['teacher-upskilling', 'teacher-upskilling.json', 'teacher-upskilling-hi.json', 15],
];

const SOURCE_FACTS_HI = {
  OVERLEAF: 'अनुमत प्रारूप: https://www.overleaf.com/docs?encoded_snip={PERCENT_ENCODED_LATEX}। आयात किया हुआ प्रोजेक्ट खुलने से पहले Overleaf पर मुफ़्त खाता और साइन-इन आवश्यक है। बताए गए स्कूल-सुरक्षित पैकेज-समूह के लिए pdflatex इस्तेमाल करें; बहुभाषी दस्तावेज़ों के लिए ही fontspec के साथ xelatex इस्तेमाल करें। यदि कूटबद्ध URL 6,000 अक्षरों से लंबा हो, तो टूटी हुई लिंक देने के बजाय पूरा स्रोत और हाथ से पेस्ट करने के चरण दें।',
  CODECOGS: 'अनुमत प्रारूप: https://latex.codecogs.com/png.image?{PERCENT_ENCODED_LATEX}। CodeCogs एक समीकरण की छवि बनाता है, पूरा दस्तावेज़ नहीं। स्थायी कक्षा PNG को \\dpi{150} के कूटबद्ध रूप से शुरू करें, URL छोटा रखें और शिक्षक से हॉटलिंक करने के बजाय उसे डाउनलोड करने को कहें।',
  TYPST: 'केवल-पेस्ट तथ्य: Typst में सामग्री पहले से भरने वाला URL नहीं है। पूरा Typst स्रोत दें, उसे NON-LATEX चिह्नित करें और शिक्षक को साइन-इन करने के बाद https://typst.app/ पर खाली प्रोजेक्ट बनाकर स्रोत पेस्ट करने का निर्देश दें।',
  MATH_STACKEXCHANGE: 'अनुमत प्रारूप: https://math.stackexchange.com/search?q={ENCODED_KEYWORDS}। एक वास्तविक टैग और 3–6 मुख्य शब्दों से खोजें; पूरा समीकरण पेस्ट न करें और मतों या स्वीकृति को गणितीय प्रमाण न बताएँ।',
  MATHOVERFLOW: 'अनुमत प्रारूप: https://mathoverflow.net/search?q={ENCODED_RESEARCH_QUERY}। इसका इस्तेमाल केवल प्रमेय के इतिहास, संदर्भों, खुली-समस्या की स्थिति या शोध-स्तर के प्रश्नों के लिए करें, सामान्य स्कूल गृहकार्य के लिए कभी नहीं।',
  AOPS: 'अनुमत प्रारूप: https://artofproblemsolving.com/community/q1_{ENCODED_KEYWORDS}। q1_ प्रारूप एक गैर-दस्तावेजीकृत खोज मार्ग है, इसलिए वही मुख्य शब्द पेस्ट-विकल्प के रूप में भी दें और कभी न कहें कि खोज-परिणाम प्रतियोगिता के स्रोत को सिद्ध करता है।',
  OEIS: 'अनुमत प्रारूप: https://oeis.org/search?q={COMMA_SEPARATED_TERMS}। कम से कम 6–8 सही निकाले हुए पद दें और चेतावनी दें कि सीमित पद कई अलग अनुक्रमों में फिट हो सकते हैं।',
  PERPLEXITY: 'अनुमत प्रारूप: https://www.perplexity.ai/search?q={ENCODED_CURRENT_FACT_QUERY}। यह दस्तावेजीकृत खोज मार्ग अपने-आप चलता है और बदल सकता है; संवेदनशील डेटा कभी कूटबद्ध न करें और शिक्षक से उद्धृत प्राथमिक स्रोत स्वयं जाँचने को कहें।',
  KHAN_ACADEMY: 'अनुमत प्रारूप: https://www.khanacademy.org/search?page_search_query={ENCODED_KEYWORDS}। केवल खोज इस्तेमाल करें; अपारदर्शी Khan विषय या अभ्यास पथ कभी न गढ़ें।',
  WOLFRAM_PROBLEM_GENERATOR: 'ठीक-ठीक सत्यापित अनुमत प्रविष्टि: https://www.wolframalpha.com/problem-generator/quiz/?category=Algebra&topic=QuadraticEquationIntegerSolution। इसे केवल पूर्णांक-हल वाले द्विघात समीकरण अभ्यास के लिए इस्तेमाल करें। किसी भी दूसरे विषय के लिए जनरेटर लिंक छोड़ दें, जब तक शिक्षक स्वयं खोला और जाँचा हुआ URL न दे।',
  NCERT_DIKSHA: 'स्रोत-आधारित NCERT पुस्तक-कोड: femh1 कक्षा 6, gemh1 कक्षा 7, hemh1 कक्षा 8, iemh1 कक्षा 9, jemh1 कक्षा 10, lemh1/lemh2 कक्षा 12 भाग I/II। शिक्षक से पुस्तक, अध्याय और कुल संख्या की पुष्टि मिलने के बाद ही https://ncert.nic.in/textbook.php?{BOOKCODE}={CHAPTER}-{TOTAL_CHAPTERS} इस्तेमाल करें। DIKSHA डायल कोड कभी न गढ़ें; केवल शिक्षक का पेस्ट किया हुआ कोड जस का तस दें।',
  WOLFRAMALPHA: 'अनुमत प्रारूप: https://www.wolframalpha.com/input?i={ENCODED_PLAIN_CALCULATOR_QUERY}। यह किसी दावे की फिर से गणना करता है, उसके आसपास के तर्क को सिद्ध नहीं करता; चरणों के लिए Pro आवश्यक हो सकता है।',
  SYMBOLAB: 'अनुमत प्रारूप: https://www.symbolab.com/solver?query={ENCODED_PLAIN_CALCULATOR_QUERY}। इसे प्रतीकात्मक दूसरी राय की तरह इस्तेमाल करें, प्रमाण-स्रोत की तरह नहीं; विस्तृत चरण सशुल्क हो सकते हैं।',
  PACK_GOOGLE_SHEETS: 'पैक-डिज़ाइन का केवल-पेस्ट तथ्य: आयताकार CSV और स्तंभ-अक्षरों तथा पहली/अंतिम पंक्ति संदर्भों वाले स्पष्ट Google Sheets सूत्र दें। कभी दावा न करें कि कोई लिंक शीट बनाती या अपलोड करती है, और खाली खाने, गैर-सांख्यिक अंक तथा दोहराए हुए ID के लिए सत्यापन पंक्तियाँ शामिल करें।',
  GOOGLE_COLAB: 'केवल वह सार्वजनिक नोटबुक URL अनुमत है जो शिक्षक दे या क्यूरेट की गई तालिका में अक्षरशः मौजूद हो: https://colab.research.google.com/github/{USER}/{REPO}/blob/{BRANCH}/{PATH}। मनमाना कोड URL में नहीं रखा जा सकता और सेल चलाने के लिए Google साइन-इन आवश्यक है।',
  SAGEMATHCELL: 'SageMathCell स्थायी लिंक वास्तविक zlib संपीड़न और कोड में URL-सुरक्षित base64 से बननी चाहिए। z मान कभी न गढ़ें; यदि कोड निष्पादन उपलब्ध न हो, तो छोटा Sage/Python कोड केवल पेस्ट-विकल्प के रूप में दें।',
  CHATGPT: 'अनुमत टेम्पलेट: https://chatgpt.com/?q={ENCODED_PROMPT}। यह पाठ पहले से भरता है, अपने-आप भेजता नहीं, फोन ऐप में क्वेरी खो सकती है और इसे 1,800 अक्षरों से छोटा रहना चाहिए; विद्यार्थियों से इसे ब्राउज़र में खोलने को कहें और व्यक्तिगत डेटा कभी शामिल न करें।',
  CLAUDE: 'अनुमत टेम्पलेट: https://claude.ai/new?q={ENCODED_PROMPT}। यह समीक्षा के लिए पाठ पहले से भरता है और अपने-आप भेजता नहीं; सामान्यतः लॉगिन आवश्यक है, इसलिए ठीक वही प्रॉम्प्ट पेस्ट-विकल्प में दें और व्यक्तिगत डेटा कभी कूटबद्ध न करें।',
  GOOGLE_AI_MODE: 'अनुमत टेम्पलेट: https://www.google.com/search?udm=50&q={ENCODED_QUERY}। Google AI Mode का यह मार्ग अपने-आप चलता है, बदल सकता है और इसमें व्यक्तिगत या संवेदनशील विद्यार्थी जानकारी कभी नहीं होनी चाहिए। gemini.google.com की पहले से भरी लिंक कभी न दें।',
  PHET: 'ठीक-ठीक सत्यापित अनुमत प्रविष्टि: https://phet.colorado.edu/sims/html/graphing-quadratics/latest/graphing-quadratics_all.html?locale=en&screens=1। यह सिमुलेशन और स्क्रीन चुनता है, लेकिन गुणांक के मान पहले से नहीं भर सकता। दूसरे सिमुलेशन स्लग कभी न गढ़ें।',
  GEOGEBRA: 'अनुमत प्रारूप: https://www.geogebra.org/graphing|geometry|3d|cas?command={COMMANDS}। टिप्पणियों से पहले वस्तुएँ परिभाषित करें, आदेशों को सेमीकोलन से अलग करें, केवल वास्तविक जोड़-चिह्न को %2B के रूप में कूटबद्ध करें, आदेश पेस्ट-विकल्प में दें और /m/ सामग्री ID कभी न गढ़ें।',
  WOLFRAM_DEMONSTRATIONS: 'ठीक-ठीक सत्यापित अनुमत प्रविष्टि: https://demonstrations.wolfram.com/QuadraticEquation/। किसी दूसरे Demonstrations स्लग का इस्तेमाल तभी करें जब वह शिक्षक की दी हुई या क्यूरेट की गई, क्लिक करके जाँची तालिका में अक्षरशः मौजूद हो।',
};

function parseData(source) {
  const marker = 'window.PROMPT_DATA =';
  return JSON.parse(source.slice(source.indexOf(marker) + marker.length, source.lastIndexOf(';')));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const placeholders = value => (String(value).match(/\[[^\]\n]{1,80}\]/g) || []).sort().join('|');
const urls = value => (String(value).match(/https?:\/\/[^\s]+/g) || []).map(url => url.replace(/[.,;:!?।]+$/u, '')).sort().join('|');
const numbers = value => (String(value).match(/\d+(?:\.\d+)?/g) || []).sort().join('|');
const devanagari = value => (String(value).match(/[ऀ-ॿ]/g) || []).length;

function assertParity(english, hindi, label) {
  assert(placeholders(english) === placeholders(hindi), `${label}: placeholder mismatch`);
  assert(urls(english) === urls(hindi), `${label}: URL mismatch`);
  assert(numbers(english) === numbers(hindi), `${label}: ASCII-number mismatch`);
}

function buildHindiPrompt(spec, hi, contract) {
  return [
    `भूमिका (ROLE): ${hi.role}`,
    '',
    `संदर्भ (CONTEXT): ${hi.context}`,
    '',
    'इनपुट—हर स्थानधारक भरें (INPUTS — FILL EVERY PLACEHOLDER):',
    ...hi.inputs.map(item => `- ${item}`),
    '',
    'स्रोत-आधारित टूल तथ्य और ठीक-ठीक URL अनुमत-सूची (SOURCE-BOUND TOOL FACTS AND EXACT URL WHITELIST):',
    ...spec.sourceIds.map(id => `- [${id}] ${SOURCE_FACTS_HI[id]}`),
    '',
    'यह करें (DO THIS):',
    ...hi.doThis.map((item, index) => `${index + 1}. ${item}`),
    '',
    'हल किया हुआ लिंक उदाहरण—इस कूटबद्धता ढाँचे को ठीक-ठीक कॉपी करें (WORKED LINK EXAMPLE — COPY THIS EXACT ENCODING PATTERN):',
    `उदाहरण कार्य (Example task): ${hi.exampleTask}`,
    `अपेक्षित परिणाम या जाँच लक्ष्य (Expected result or check target): ${hi.exampleResult}`,
    'check this yourself',
    `CHECK → ${spec.exampleUrl}`,
    `(paste-fallback: ${spec.exampleFallback})`,
    `कूटबद्धता टिप्पणी (Encoding note): ${hi.exampleEncodingNote}`,
    '',
    'आउटपुट प्रारूप (OUTPUT FORMAT):',
    ...hi.outputFormat.map((item, index) => `${index + 1}. ${item}`),
    '',
    'गुणवत्ता और टूल सुरक्षा-नियम (QUALITY AND TOOL GUARDRAILS):',
    ...hi.guardrails.map(item => `- ${item}`),
    '- हर टेम्पलेट, कोड-खंड और अनूदित रूप में प्रत्येक [PLACEHOLDER IN SQUARE BRACKETS] को अक्षरशः कॉपी करें।',
    '- पैरामीटर वाला desmos.com URL, mathsolver.microsoft.com URL, गढ़ी हुई GeoGebra सामग्री ID, गढ़ा हुआ DIKSHA कोड, गढ़ा हुआ Khan विषय पथ या सूची से बाहर का प्रश्नोत्तरी अथवा सिमुलेशन स्लग कभी न दें।',
    '- AI के किसी उत्तर को सत्यापित न बताएँ। हर बाहरी जाँच पर “स्वयं जाँचें” का चिह्न हो, ताकि शिक्षक या विद्यार्थी उसे स्वयं परख सके।',
    '- परीक्षा-संबंधी तथ्य, स्रोत-उद्धरण, अंक-वितरण, उपकरण ID या ऐसी लिंक न गढ़ें जिसे खोला न जा सके। गणितीय प्रमाण और संगणकीय जाँच को अलग रखें।',
    '',
    contract,
  ].join('\n');
}

const data = parseData(readFileSync(DATA_FILE, 'utf8'));
const contract = readFileSync(CONTRACT_FILE, 'utf8');
const promptByTitle = new Map(data.categories.flatMap(category => category.prompts).map(prompt => [prompt.title, prompt]));
const hiByTitle = new Map();
const forbiddenName = String.fromCharCode(73, 110, 100, 114, 97, 106, 101, 101, 116, 32, 89, 97, 100, 97, 118);

for (const [categoryId, englishFile, hindiFile, expected] of defs) {
  const specs = JSON.parse(readFileSync(resolve(SPEC_DIR, englishFile), 'utf8'));
  const translations = JSON.parse(readFileSync(resolve(SPEC_DIR, hindiFile), 'utf8'));
  assert(specs.length === expected && translations.length === expected, `${categoryId}: expected ${expected} English and Hindi specs`);
  const translatedBySequence = new Map(translations.map(item => [item.sequence, item]));
  for (const spec of specs) {
    const hi = translatedBySequence.get(spec.sequence);
    const label = `${categoryId}#${spec.sequence} ${spec.title}`;
    assert(hi && hi.category === categoryId && hi.englishTitle === spec.title, `${label}: Hindi identity mismatch`);
    for (const field of ['title', 'whatYouGet', 'howToUse', 'commonFix', 'role', 'context', 'exampleTask', 'exampleResult', 'exampleEncodingNote']) {
      assert(typeof hi[field] === 'string' && devanagari(hi[field]) >= (field === 'title' ? 2 : 1), `${label}: missing Hindi ${field}`);
      const english = ['title', 'whatYouGet', 'howToUse', 'commonFix'].includes(field) ? (field === 'title' ? spec.title : spec[field]) : spec[field];
      assertParity(english, hi[field], `${label}.${field}`);
    }
    for (const field of ['effectiveUsage', 'inputs', 'doThis', 'outputFormat', 'guardrails']) {
      assert(Array.isArray(hi[field]) && hi[field].length === spec[field].length, `${label}: ${field} count mismatch`);
      hi[field].forEach((item, index) => {
        const placeholderOnlyInput = field === 'inputs' && /^(?:\[[^\]\n]{1,80}\])(?:\s*[,;/]\s*\[[^\]\n]{1,80}\])*$/u.test(item);
        assert(devanagari(item) >= 1 || placeholderOnlyInput, `${label}.${field}[${index}]: too little Devanagari`);
        assertParity(spec[field][index], item, `${label}.${field}[${index}]`);
      });
    }
    hi.effectiveUsage.forEach((item, index) => assert(item.startsWith(`${index + 1}.`), `${label}: effectiveUsage numbering`));
    spec.outputFormat.forEach((item, index) => {
      const englishLabel = item.split(' — ')[0];
      assert(hi.outputFormat[index].includes(`(${englishLabel})`), `${label}: outputFormat ${index + 1} must preserve (${englishLabel})`);
    });
    const prompt = promptByTitle.get(spec.title);
    assert(prompt, `${label}: English prompt missing from data`);
    const promptText = buildHindiPrompt(spec, hi, contract);
    assertParity(prompt.promptText, promptText, `${label}.promptText`);
    assert(prompt.promptText.split('\n').length === promptText.split('\n').length, `${label}: promptText line count mismatch`);
    assert(promptText.endsWith(contract), `${label}: contract is not verbatim at end`);
    const translated = {
      title: hi.title,
      whatYouGet: hi.whatYouGet,
      howToUse: hi.howToUse,
      effectiveUsage: hi.effectiveUsage,
      commonFix: hi.commonFix,
      promptText,
    };
    assert(!JSON.stringify(translated).includes(forbiddenName), `${label}: protected owner name`);
    hiByTitle.set(spec.title, translated);
  }
}

assert(hiByTitle.size === 180, `expected 180 Hindi specifications, found ${hiByTitle.size}`);
const chunks = readdirSync(TODO_DIR).filter(name => /^chunk-\d+\.json$/.test(name)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
const todo = chunks.flatMap(file => JSON.parse(readFileSync(resolve(TODO_DIR, file), 'utf8')));
assert(todo.length === 180, `expected 180 Wave-2 todo prompts, found ${todo.length}`);
assert(todo.every(item => hiByTitle.has(item.title)), 'Hindi todo contains a title outside Wave 2');

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });
let written = 0;
for (const file of chunks) {
  const items = JSON.parse(readFileSync(resolve(TODO_DIR, file), 'utf8'));
  const batch = items.map(item => {
    const prompt = promptByTitle.get(item.title);
    assert(prompt.promptText === item.promptText, `${item.title}: stale source chunk`);
    written++;
    return { title: item.title, hi: hiByTitle.get(item.title) };
  });
  const number = String(Number(file.match(/\d+/)[0])).padStart(2, '0');
  writeFileSync(resolve(OUT_DIR, `batch-${number}.json`), `${JSON.stringify(batch, null, 2)}\n`);
}

console.log(`Built ${chunks.length} Wave-2 Hindi batches for ${written} prompts.`);
