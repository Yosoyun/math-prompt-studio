// Build the compact searchable catalog and complete language card packs.
// Usage: node tools/build-catalog.mjs [--check|--dry-run]
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { bracketTokens, languageConfig, scriptCount, validateTranslation } from './lang-qa.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_FILE = resolve(ROOT, 'data/prompts.js');
const OUTPUT_FILE = resolve(ROOT, 'data/catalog.js');
const INDEX_FILE = resolve(ROOT, 'index.html');
const CONTRACT_FILE = resolve(ROOT, '_handoff/tool-link-contract.txt');
const MARKER = 'window.PROMPT_DATA =';

export const LANGUAGE_DEFINITIONS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'mr', label: 'मराठी' },
  { code: 'te', label: 'తెలుగు' },
];

export const GROUP_I18N = {
  'Solving & Checking': { en: 'Solving & Checking', hi: 'हल और जाँच', bn: 'সমাধান ও যাচাই', mr: 'सोडवणे आणि तपासणी', te: 'పరిష్కారం మరియు తనిఖీ' },
  'Practice & Assessment': { en: 'Practice & Assessment', hi: 'अभ्यास और मूल्यांकन', bn: 'অনুশীলন ও মূল্যায়ন', mr: 'सराव आणि मूल्यांकन', te: 'అభ్యాసం మరియు మూల్యాంకనం' },
  'Teaching Materials': { en: 'Teaching Materials', hi: 'शिक्षण सामग्री', bn: 'শিক্ষণ সামগ্রী', mr: 'अध्यापन साहित्य', te: 'బోధనా సామగ్రి' },
  'Writing & Content': { en: 'Writing & Content', hi: 'लेखन और सामग्री', bn: 'লেখা ও বিষয়বস্তু', mr: 'लेखन आणि आशय', te: 'రచన మరియు కంటెంట్' },
  Engagement: { en: 'Engagement', hi: 'सहभागिता', bn: 'অংশগ্রহণ', mr: 'सहभाग', te: 'పాల్గొనడం' },
  Support: { en: 'Support', hi: 'सहायता', bn: 'সহায়তা', mr: 'सहाय्य', te: 'సహాయం' },
  'Teacher Productivity': { en: 'Teacher Productivity', hi: 'शिक्षक उत्पादकता', bn: 'শিক্ষকের উৎপাদনশীলতা', mr: 'शिक्षक उत्पादकता', te: 'ఉపాధ్యాయ ఉత్పాదకత' },
};

// Category labels are product chrome, not prompt translations. Keeping the
// five labels together makes missing UI coverage a build-time error.
export const CATEGORY_I18N = {
  'handwritten-styles': { hi: 'हस्तलिखित 5-विधि समाधान कला', bn: 'হাতে লেখা ৫-পদ্ধতির সমাধান', mr: 'हस्तलिखित 5-पद्धती उपाय कला', te: 'చేతిరాత 5-పద్ధతుల పరిష్కార కళ' },
  'single-solution': { hi: 'एक संपूर्ण समाधान', bn: 'একটি নিখুঁত সমাধান', mr: 'एक परिपूर्ण उपाय', te: 'ఒక సంపూర్ణ పరిష్కారం' },
  'multi-method': { hi: 'अनेक विधियाँ', bn: 'একাধিক পদ্ধতি', mr: 'अनेक पद्धती', te: 'అనేక పద్ధతులు' },
  'photo-doubt-solving': { hi: 'फोटो से शंका समाधान', bn: 'ছবি থেকে সন্দেহ সমাধান', mr: 'फोटोवरून शंका निरसन', te: 'ఫోటో నుంచి సందేహ పరిష్కారం' },
  'error-analysis': { hi: 'विद्यार्थी का काम जाँचें और सुधारें', bn: 'শিক্ষার্থীর কাজ যাচাই ও সংশোধন', mr: 'विद्यार्थ्याचे काम तपासा आणि सुधारा', te: 'విద్యార్థి పనిని తనిఖీ చేసి సరిచేయండి' },
  'question-papers': { hi: 'प्रश्नपत्र और परीक्षाएँ', bn: 'প্রশ্নপত্র ও পরীক্ষা', mr: 'प्रश्नपत्रिका आणि परीक्षा', te: 'ప్రశ్నపత్రాలు మరియు పరీక్షలు' },
  worksheets: { hi: 'वर्कशीट और असाइनमेंट', bn: 'ওয়ার্কশিট ও অ্যাসাইনমেন্ট', mr: 'वर्कशीट आणि असाइनमेंट', te: 'వర్క్‌షీట్‌లు మరియు అసైన్‌మెంట్‌లు' },
  dpp: { hi: 'दैनिक अभ्यास प्रश्न (DPP)', bn: 'দৈনিক অনুশীলন সমস্যা (DPP)', mr: 'दैनिक सराव प्रश्न (DPP)', te: 'రోజువారీ అభ్యాస సమస్యలు (DPP)' },
  'quiz-mcq': { hi: 'क्विज़, MCQ और फ्लैशकार्ड', bn: 'কুইজ, MCQ ও ফ্ল্যাশকার্ড', mr: 'क्विझ, MCQ आणि फ्लॅशकार्ड', te: 'క్విజ్, MCQ మరియు ఫ్లాష్‌కార్డ్‌లు' },
  'competitive-exams': { hi: 'JEE / NEET / बोर्ड तैयारी', bn: 'JEE / NEET / বোর্ড প্রস্তুতি', mr: 'JEE / NEET / बोर्ड तयारी', te: 'JEE / NEET / బోర్డు సన్నాహం' },
  'mock-sample-papers': { hi: 'मॉक टेस्ट और नमूना प्रश्नपत्र', bn: 'মক টেস্ট ও নমুনা প্রশ্নপত্র', mr: 'मॉक टेस्ट आणि नमुना प्रश्नपत्रिका', te: 'మాక్ టెస్ట్‌లు మరియు నమూనా పత్రాలు' },
  'formula-sheets': { hi: 'सूत्र और चीट शीट', bn: 'সূত্র ও চিট শিট', mr: 'सूत्रे आणि चीट शीट', te: 'సూత్రాలు మరియు చీట్ షీట్‌లు' },
  'concept-explainers': { hi: 'अवधारणा और सहज समझ', bn: 'ধারণা ও সহজবোধ্য ব্যাখ্যা', mr: 'संकल्पना आणि सहज आकलन', te: 'భావనలు మరియు సహజ అవగాహన' },
  'mind-maps': { hi: 'माइंड मैप और दृश्य नोट्स', bn: 'মাইন্ড ম্যাপ ও দৃশ্যমান নোট', mr: 'माइंड मॅप आणि दृश्य नोंदी', te: 'మైండ్ మ్యాప్‌లు మరియు దృశ్య నోట్స్' },
  'lesson-plans': { hi: 'पाठ योजना और व्याख्यान नोट्स', bn: 'পাঠ পরিকল্পনা ও লেকচার নোট', mr: 'पाठ योजना आणि व्याख्यान नोंदी', te: 'పాఠ ప్రణాళికలు మరియు లెక్చర్ నోట్స్' },
  'diagrams-graphs': { hi: 'आरेख, ग्राफ और आकृतियाँ', bn: 'চিত্র, গ্রাফ ও আকৃতি', mr: 'आकृत्या, आलेख आणि चित्रे', te: 'రేఖాచిత్రాలు, గ్రాఫ్‌లు మరియు ఆకృతులు' },
  presentations: { hi: 'स्लाइड और प्रस्तुतियाँ', bn: 'স্লাইড ও উপস্থাপনা', mr: 'स्लाइड आणि सादरीकरणे', te: 'స్లైడ్‌లు మరియు ప్రెజెంటేషన్‌లు' },
  'book-writing': { hi: 'पुस्तक और अध्ययन-सामग्री लेखन', bn: 'বই ও অধ্যয়ন-সামগ্রী লেখা', mr: 'पुस्तक आणि अध्ययन-साहित्य लेखन', te: 'పుస్తకం మరియు అధ్యయన సామగ్రి రచన' },
  'notes-handouts': { hi: 'नोट्स और हैंडआउट', bn: 'নোট ও হ্যান্ডআউট', mr: 'नोंदी आणि हँडआउट', te: 'నోట్స్ మరియు హ్యాండ్‌అవుట్‌లు' },
  'video-scripts': { hi: 'वीडियो, रील और YouTube स्क्रिप्ट', bn: 'ভিডিও, রিল ও YouTube স্ক্রিপ্ট', mr: 'व्हिडिओ, रील आणि YouTube स्क्रिप्ट', te: 'వీడియో, రీల్స్ మరియు YouTube స్క్రిప్ట్‌లు' },
  'social-media': { hi: 'सोशल मीडिया और कैरौसेल', bn: 'সোশ্যাল মিডিয়া ও ক্যারোসেল', mr: 'सोशल मीडिया आणि कॅरुसेल', te: 'సోషల్ మీడియా మరియు క్యారసెల్‌లు' },
  'real-world-applications': { hi: 'वास्तविक जीवन में उपयोग', bn: 'বাস্তব জীবনে প্রয়োগ', mr: 'वास्तविक जीवनातील उपयोग', te: 'వాస్తవ ప్రపంచ అనువర్తనాలు' },
  'projects-activities': { hi: 'परियोजनाएँ और गतिविधियाँ', bn: 'প্রকল্প ও কার্যক্রম', mr: 'प्रकल्प आणि उपक्रम', te: 'ప్రాజెక్ట్‌లు మరియు కార్యకలాపాలు' },
  'games-gamification': { hi: 'खेल और गेमिफिकेशन', bn: 'খেলা ও গেমিফিকেশন', mr: 'खेळ आणि गेमिफिकेशन', te: 'ఆటలు మరియు గేమిఫికేషన్' },
  'history-stories': { hi: 'गणित का इतिहास और कहानियाँ', bn: 'গণিতের ইতিহাস ও গল্প', mr: 'गणिताचा इतिहास आणि कथा', te: 'గణిత చరిత్ర మరియు కథలు' },
  'remedial-support': { hi: 'कमज़ोर विद्यार्थियों के लिए सहायता', bn: 'দুর্বল শিক্ষার্থীদের সহায়তা', mr: 'कमकुवत विद्यार्थ्यांसाठी सहाय्य', te: 'వెనుకబడిన విద్యార్థులకు సహాయం' },
  'gifted-enrichment': { hi: 'प्रतिभाशाली और ओलंपियाड संवर्धन', bn: 'মেধাবী ও অলিম্পিয়াড সমৃদ্ধি', mr: 'प्रतिभावान आणि ऑलिम्पियाड समृद्धी', te: 'ప్రతిభావంతులు మరియు ఒలింపియాడ్ అభివృద్ధి' },
  'exam-strategy-motivation': { hi: 'परीक्षा रणनीति और प्रेरणा', bn: 'পরীক্ষার কৌশল ও প্রেরণা', mr: 'परीक्षा रणनीती आणि प्रेरणा', te: 'పరీక్ష వ్యూహం మరియు ప్రేరణ' },
  'parent-student-comms': { hi: 'अभिभावक और विद्यार्थी संवाद', bn: 'অভিভাবক ও শিক্ষার্থী যোগাযোগ', mr: 'पालक आणि विद्यार्थी संवाद', te: 'తల్లిదండ్రులు మరియు విద్యార్థుల సంభాషణ' },
  'grading-rubrics-feedback': { hi: 'ग्रेडिंग, रूब्रिक और फीडबैक', bn: 'গ্রেডিং, রুব্রিক ও প্রতিক্রিয়া', mr: 'ग्रेडिंग, रूब्रिक आणि अभिप्राय', te: 'గ్రేడింగ్, రూబ్రిక్‌లు మరియు అభిప్రాయం' },
  'classroom-admin': { hi: 'कक्षा और प्रशासन सहायता', bn: 'শ্রেণিকক্ষ ও প্রশাসনিক সহায়তা', mr: 'वर्ग आणि प्रशासकीय मदत', te: 'తరగతి మరియు పరిపాలనా సహాయం' },
  'latex-pdf-sets': { hi: 'तैयार दस्तावेज़ — PDF, Word और PPT', bn: 'প্রস্তুত নথি — PDF, Word ও PPT', mr: 'तयार दस्तऐवज — PDF, Word आणि PPT', te: 'సిద్ధమైన పత్రాలు — PDF, Word మరియు PPT' },
  'solution-posters': { hi: 'एक-चित्र समाधान पोस्टर', bn: 'এক-ছবির সমাধান পোস্টার', mr: 'एक-प्रतिमा उपाय पोस्टर', te: 'ఒకే-చిత్ర పరిష్కార పోస్టర్లు' },
  'verified-answers': { hi: 'सत्यापित उत्तर (एक-टैप जाँच)', bn: 'যাচাইকৃত উত্তর (এক-ট্যাপ পরীক্ষা)', mr: 'सत्यापित उत्तरे (एक-टॅप तपासणी)', te: 'ధృవీకరించిన సమాధానాలు (ఒక-ట్యాప్ తనిఖీ)' },
  'board-projection': { hi: 'बोर्ड पर प्रोजेक्ट करें', bn: 'বোর্ডে প্রজেক্ট করুন', mr: 'फळ्यावर प्रोजेक्ट करा', te: 'బోర్డుపై ప్రొజెక్ట్ చేయండి' },
  'phone-quizzes': { hi: 'फोन पर क्विज़ कराएँ', bn: 'ফোনে কুইজ নিন', mr: 'फोनवर क्विझ घ्या', te: 'ఫోన్‌లలో క్విజ్ చేయించండి' },
  'print-beautifully': { hi: 'सुंदर प्रिंट तैयार करें', bn: 'সুন্দরভাবে প্রিন্ট করুন', mr: 'सुंदर प्रिंट तयार करा', te: 'అందంగా ముద్రించండి' },
  'doubt-research': { hi: 'स्रोतों से शंका सुलझाएँ', bn: 'সূত্র দিয়ে সন্দেহ মেটান', mr: 'स्रोतांसह शंका सोडवा', te: 'మూలాలతో సందేహాన్ని పరిష్కరించండి' },
  'endless-practice': { hi: 'बिना दोहराव अनंत अभ्यास', bn: 'পুনরাবৃত্তি ছাড়া অসীম অনুশীলন', mr: 'पुनरावृत्तीशिवाय अखंड सराव', te: 'పునరావృతం లేని అంతులేని అభ్యాసం' },
  'marks-insight': { hi: 'अंक → समझ', bn: 'নম্বর → অন্তর্দৃষ্টি', mr: 'गुण → अंतर्दृष्टी', te: 'మార్కులు → అవగాహన' },
  'grade-the-stack': { hi: 'पूरी कॉपियाँ जाँचें', bn: 'সব খাতা মূল্যায়ন করুন', mr: 'सर्व उत्तरपत्रिका तपासा', te: 'మొత్తం జవాబు పత్రాలు గ్రేడ్ చేయండి' },
  'nep-paperwork': { hi: 'कागज़ी काम स्वचालित करें', bn: 'কাগজপত্র স্বয়ংক্রিয় করুন', mr: 'कागदपत्रे स्वयंचलित करा', te: 'పత్రపనిని స్వయంచాలకం చేయండి' },
  'student-ai-links': { hi: 'विद्यार्थियों को सुरक्षित AI दें', bn: 'শিক্ষার্থীদের নিরাপদে AI দিন', mr: 'विद्यार्थ्यांना सुरक्षितपणे AI द्या', te: 'విద్యార్థులకు AIని సురక్షితంగా అందించండి' },
  'translation-inclusion': { hi: 'हर भाषा, हर विद्यार्थी', bn: 'প্রতিটি ভাষা, প্রতিটি শিক্ষার্থী', mr: 'प्रत्येक भाषा, प्रत्येक विद्यार्थी', te: 'ప్రతి భాష, ప్రతి అభ్యాసకుడు' },
  'teacher-upskilling': { hi: 'अपना कौशल बढ़ाएँ', bn: 'নিজের দক্ষতা বাড়ান', mr: 'स्वतःचे कौशल्य वाढवा', te: 'మీ నైపుణ్యాన్ని పెంచుకోండి' },
  'pyq-workflows': { hi: 'PYQ शक्तिशाली वर्कफ़्लो', bn: 'PYQ শক্তিশালী কর্মপ্রবাহ', mr: 'PYQ प्रभावी कार्यप्रवाह', te: 'PYQ శక్తివంతమైన వర్క్‌ఫ్లోలు' },
  'board-foundation-workflows': { hi: 'बोर्ड + फ़ाउंडेशन वर्कफ़्लो', bn: 'বোর্ড + ফাউন্ডেশন কর্মপ্রবাহ', mr: 'बोर्ड + फाउंडेशन कार्यप्रवाह', te: 'బోర్డు + ఫౌండేషన్ వర్క్‌ఫ్లోలు' },
  'foundation-olympiad-bridges': { hi: 'फ़ाउंडेशन → ओलंपियाड सेतु', bn: 'ফাউন্ডেশন → অলিম্পিয়াড সেতু', mr: 'फाउंडेशन → ऑलिम्पियाड पूल', te: 'ఫౌండేషన్ → ఒలింపియాడ్ వారధులు' },
  'foundation-mastery-workflows': { hi: 'फ़ाउंडेशन निपुणता वर्कफ़्लो', bn: 'ফাউন্ডেশন দক্ষতার কর্মপ্রবাহ', mr: 'फाउंडेशन प्रभुत्व कार्यप्रवाह', te: 'ఫౌండేషన్ నైపుణ్య వర్క్‌ఫ్లోలు' },
  'jee-main-advanced-dual-lane': { hi: 'JEE Main + Advanced दोहरी राह', bn: 'JEE Main + Advanced দ্বৈত পথ', mr: 'JEE Main + Advanced दुहेरी मार्ग', te: 'JEE Main + Advanced ద్వంద్వ మార్గాలు' },
};

const SEARCH_KEYWORDS = [
  'wolframalpha', 'wolfram', 'symbolab', 'desmos', 'geogebra', 'overleaf', 'codecogs',
  'stackexchange', 'mathoverflow', 'oeis', 'aops', 'khan', 'phet', 'colab', 'python',
  'kahoot', 'wayground', 'quizizz', 'blooket', 'google forms', 'apps script', 'excel',
  'google sheets', 'powerpoint', 'google slides', 'gamma', 'canva', 'youtube', 'instagram',
  'whatsapp', 'telegram', 'latex', 'tikz', 'pdf', 'docx', 'word', 'image', 'interactive',
  'worksheet', 'quiz', 'question paper', 'mock paper', 'presentation', 'slide deck',
  'verify', 'verification', 'graph', 'diagram', 'pyq', 'previous year', 'olympiad',
  'jee main', 'jee advanced', 'foundation', 'boards', 'ncert', 'cbse', 'student', 'teacher',
];

export function parsePromptData(source) {
  const start = source.indexOf(MARKER);
  if (start < 0) throw new Error('window.PROMPT_DATA marker not found');
  return JSON.parse(source.slice(start + MARKER.length, source.lastIndexOf(';')));
}

function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

function validateEnglish(prompt) {
  const errors = [];
  for (const field of ['title', 'whatYouGet', 'howToUse', 'commonFix', 'promptText']) {
    if (typeof prompt[field] !== 'string' || !prompt[field].trim()) errors.push(`${field} missing`);
  }
  if (!Array.isArray(prompt.effectiveUsage) || !prompt.effectiveUsage.length || prompt.effectiveUsage.some(value => typeof value !== 'string' || !value.trim())) errors.push('effectiveUsage missing');
  return errors;
}

function validateHindi(prompt, contract) {
  const translation = prompt.hi;
  if (!translation || typeof translation !== 'object') return ['translation missing'];
  const errors = [];
  for (const field of ['title', 'whatYouGet', 'howToUse', 'commonFix', 'promptText']) {
    if (typeof translation[field] !== 'string' || !translation[field].trim()) errors.push(`${field} missing`);
  }
  if (!Array.isArray(translation.effectiveUsage) || translation.effectiveUsage.length !== prompt.effectiveUsage.length || translation.effectiveUsage.some(value => typeof value !== 'string' || !value.trim())) errors.push('effectiveUsage missing or length differs');
  if (scriptCount(translation.title, { min: 0x0900, max: 0x097f }) < 2) errors.push('title lacks Devanagari');
  if (scriptCount(translation.promptText, { min: 0x0900, max: 0x097f }) < 50) errors.push('promptText lacks Devanagari');
  const pairs = ['title', 'whatYouGet', 'howToUse', 'commonFix', 'promptText'].map(field => [field, prompt[field], translation[field]]);
  prompt.effectiveUsage.forEach((value, index) => pairs.push([`effectiveUsage[${index}]`, value, translation.effectiveUsage && translation.effectiveUsage[index]]));
  for (const [field, english, hindi] of pairs) if (!same(bracketTokens(english), bracketTokens(hindi))) errors.push(`${field} placeholder mismatch`);
  if (contract && prompt.promptText.endsWith(contract) && !translation.promptText.endsWith(contract)) errors.push('tool-link contract suffix changed');
  return errors;
}

export function validateLanguageCompleteness(data, contract = '') {
  const prompts = data.categories.flatMap(category => category.prompts || []);
  const status = {};
  for (const { code, label } of LANGUAGE_DEFINITIONS) {
    let valid = 0;
    let missing = 0;
    let invalid = 0;
    const samples = [];
    for (const prompt of prompts) {
      let errors;
      if (code === 'en') errors = validateEnglish(prompt);
      else if (code === 'hi') errors = validateHindi(prompt, contract);
      else errors = prompt[code] ? validateTranslation(prompt, prompt[code], languageConfig(code), contract) : ['translation missing'];
      if (!errors.length) valid += 1;
      else {
        if (!prompt[code] && code !== 'en') missing += 1;
        else invalid += 1;
        if (samples.length < 5) samples.push(`${prompt.slug || prompt.title}: ${errors.join('; ')}`);
      }
    }
    status[code] = { code, label, total: prompts.length, valid, missing, invalid, live: prompts.length > 0 && valid === prompts.length && missing === 0 && invalid === 0, samples };
  }
  if (!status.en.live) throw new Error(`English source corpus is incomplete: ${status.en.samples.join(' | ')}`);
  return status;
}

function categoryLabels(data, liveCodes) {
  const labels = {};
  for (const category of data.categories) {
    const translated = CATEGORY_I18N[category.category];
    if (!translated || ['hi', 'bn', 'mr', 'te'].some(code => !translated[code])) throw new Error(`category UI translations incomplete: ${category.category}`);
    const allLabels = { en: category.categoryTitle, ...translated };
    labels[category.category] = Object.fromEntries(liveCodes.map(code => [code, allLabels[code]]));
  }
  return labels;
}

function compactSearchBits(prompt) {
  const languageBodies = ['hi', 'bn', 'mr', 'te'].flatMap(code => {
    const value = prompt[code];
    return value && typeof value === 'object' ? Object.values(value) : [];
  });
  const omittedBody = [prompt.bestTool, prompt.worksOnFree, prompt.howToUse, ...(prompt.effectiveUsage || []), prompt.commonFix, prompt.promptText, ...languageBodies]
    .filter(value => typeof value === 'string').join(' ').toLowerCase().normalize('NFKC');
  const bytes = Buffer.alloc(Math.ceil(SEARCH_KEYWORDS.length / 8));
  SEARCH_KEYWORDS.forEach((keyword, index) => { if (omittedBody.includes(keyword)) bytes[index >> 3] |= 1 << (index & 7); });
  return bytes.some(Boolean) ? bytes.toString('base64').replace(/=+$/, '') : '';
}

function cardPrompt(prompt) {
  const card = { title: prompt.title, tag: prompt.tag, needsImage: !!prompt.needsImage, makesImage: !!prompt.makesImage, whatYouGet: prompt.whatYouGet, slug: prompt.slug, exams: prompt.exams, aud: prompt.aud };
  const searchBits = compactSearchBits(prompt);
  if (searchBits) card.sk = searchBits;
  if (prompt.featured) card.featured = true;
  if (prompt.added) card.added = prompt.added;
  if (prompt.fmt) card.fmt = prompt.fmt;
  if (prompt.styles) card.styles = prompt.styles;
  return card;
}

function translatedSearchText(prompt, code) {
  const translation = prompt[code];
  const text = [translation.title, translation.whatYouGet, translation.howToUse, ...(translation.effectiveUsage || []), translation.commonFix, translation.promptText]
    .filter(value => typeof value === 'string').join(' ').normalize('NFKC').toLowerCase();
  // Combining marks are part of native-script words. Dropping \p{M} makes a
  // stored Hindi/Bengali/Marathi/Telugu token differ from the user's query.
  return [...new Set(text.match(/[\p{L}\p{M}\p{N}]+/gu) || [])].filter(token => token.length > 1).join(' ');
}

function buildLanguagePack(data, code) {
  return Object.fromEntries(data.categories.flatMap(category => category.prompts).map(prompt => [prompt.slug, {
    title: prompt[code].title,
    whatYouGet: prompt[code].whatYouGet,
    searchText: translatedSearchText(prompt, code),
  }]));
}

function buildCatalog(data, languageStatus) {
  const liveCodes = LANGUAGE_DEFINITIONS.map(item => item.code).filter(code => languageStatus[code].live);
  const groupI18n = Object.fromEntries(Object.entries(GROUP_I18N).map(([group, labels]) => [group, Object.fromEntries(liveCodes.map(code => [code, labels[code]]))]));
  return {
    version: data.version,
    total: data.categories.reduce((sum, category) => sum + category.prompts.length, 0),
    searchKeywords: SEARCH_KEYWORDS,
    languageStatus: Object.fromEntries(Object.entries(languageStatus).map(([code, value]) => [code, { total: value.total, valid: value.valid, missing: value.missing, invalid: value.invalid, live: value.live }])),
    categoryI18n: categoryLabels(data, liveCodes),
    groupI18n,
    categories: data.categories.map(category => ({
      category: category.category, categoryTitle: category.categoryTitle, categoryIcon: category.categoryIcon, group: category.group, categoryBlurb: category.categoryBlurb,
      prompts: category.prompts.map(cardPrompt),
    })),
  };
}

function assertCatalog(sourceData, catalog, languagePacks) {
  const sourcePrompts = sourceData.categories.flatMap(category => category.prompts);
  const cards = catalog.categories.flatMap(category => category.prompts);
  const liveCodes = LANGUAGE_DEFINITIONS.map(item => item.code).filter(code => catalog.languageStatus[code].live).sort();
  if (cards.length !== sourcePrompts.length || catalog.total !== sourcePrompts.length) throw new Error('catalog prompt total mismatch');
  if (new Set(cards.map(prompt => prompt.slug)).size !== cards.length) throw new Error('catalog slugs are not unique');
  for (const card of cards) {
    if (!card.slug || !card.title || !card.whatYouGet) throw new Error(`incomplete catalog card: ${card.slug || card.title || 'unknown'}`);
    if (!Array.isArray(card.exams) || !card.exams.length || !card.aud) throw new Error(`facet metadata missing: ${card.slug}`);
  }
  for (const [code, pack] of Object.entries(languagePacks)) {
    if (!catalog.languageStatus[code].live) throw new Error(`${code} pack created for an incomplete language`);
    if (Object.keys(pack).length !== sourcePrompts.length) throw new Error(`${code} card-pack coverage mismatch`);
    for (const [slug, translation] of Object.entries(pack)) if (!translation.title || !translation.whatYouGet || !translation.searchText) throw new Error(`${code} card-pack search metadata missing: ${slug}`);
    let nativeQuerySample = null;
    for (const prompt of sourcePrompts) {
      const cardTokens = new Set(`${prompt[code].title} ${prompt[code].whatYouGet}`.normalize('NFKC').toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) || []);
      const bodyTokens = prompt[code].promptText.normalize('NFKC').toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) || [];
      const query = bodyTokens.find(token => token.length > 2 && /\p{M}/u.test(token) && !cardTokens.has(token));
      if (!query) continue;
      nativeQuerySample = { slug: prompt.slug, query };
      break;
    }
    if (!nativeQuerySample || !new Set(pack[nativeQuerySample.slug].searchText.split(' ')).has(nativeQuerySample.query)) throw new Error(`${code} combining-mark body search query was not preserved`);
  }
  for (const labels of [...Object.values(catalog.categoryI18n), ...Object.values(catalog.groupI18n)]) {
    if (!same(Object.keys(labels).sort(), liveCodes)) throw new Error('localized chrome does not match the live-language gate');
  }
}

export function buildArtifacts(sourceText, indexText, contract) {
  const sourceData = parsePromptData(sourceText);
  const languageStatus = validateLanguageCompleteness(sourceData, contract);
  const liveCodes = LANGUAGE_DEFINITIONS.map(item => item.code).filter(code => languageStatus[code].live);
  const catalog = buildCatalog(sourceData, languageStatus);
  const languagePacks = Object.fromEntries(liveCodes.filter(code => code !== 'en').map(code => [code, buildLanguagePack(sourceData, code)]));
  assertCatalog(sourceData, catalog, languagePacks);
  const versionMatch = indexText.match(/data\/prompts\.js\?v=(\d+)/);
  const dataUrl = `data/prompts.js?v=${versionMatch ? versionMatch[1] : '21'}`;
  const output = [`/* Maths Prompt Studio compact catalog - ${catalog.total} prompt cards. Generated; do not edit by hand. */`, `window.MPS_DATA_URL = window.MPS_DATA_URL || ${JSON.stringify(dataUrl)};`, `window.PROMPT_CATALOG = ${JSON.stringify(catalog)};`, ''].join('\n');
  const packOutputs = Object.fromEntries(Object.entries(languagePacks).map(([code, pack]) => [code, [`/* Maths Prompt Studio ${code} card translations. Generated; do not edit by hand. */`, 'window.PROMPT_CATALOG_LANG = window.PROMPT_CATALOG_LANG || {};', `window.PROMPT_CATALOG_LANG[${JSON.stringify(code)}] = ${JSON.stringify(pack)};`, ''].join('\n')]));
  return { sourceData, catalog, languageStatus, liveCodes, output, packOutputs };
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const dryRun = process.argv.includes('--dry-run');
  if (checkOnly && dryRun) throw new Error('use either --check or --dry-run, not both');
  const sourceText = readFileSync(SOURCE_FILE, 'utf8');
  const indexText = readFileSync(INDEX_FILE, 'utf8');
  const contract = readFileSync(CONTRACT_FILE, 'utf8').trim();
  const artifacts = buildArtifacts(sourceText, indexText, contract);
  const expectedPackCodes = new Set(Object.keys(artifacts.packOutputs));

  if (checkOnly) {
    if (readFileSync(OUTPUT_FILE, 'utf8') !== artifacts.output) throw new Error('data/catalog.js is stale; run node tools/build-catalog.mjs');
    for (const [code, packOutput] of Object.entries(artifacts.packOutputs)) {
      const packFile = resolve(ROOT, `data/catalog-${code}.js`);
      if (!existsSync(packFile) || readFileSync(packFile, 'utf8') !== packOutput) throw new Error(`data/catalog-${code}.js is stale; run node tools/build-catalog.mjs`);
    }
    for (const { code } of LANGUAGE_DEFINITIONS.slice(1)) if (!expectedPackCodes.has(code) && existsSync(resolve(ROOT, `data/catalog-${code}.js`))) throw new Error(`data/catalog-${code}.js must not exist while ${code} is incomplete`);
  } else if (!dryRun) {
    writeFileSync(OUTPUT_FILE, artifacts.output);
    for (const { code } of LANGUAGE_DEFINITIONS.slice(1)) {
      const packFile = resolve(ROOT, `data/catalog-${code}.js`);
      if (expectedPackCodes.has(code)) writeFileSync(packFile, artifacts.packOutputs[code]);
      else if (existsSync(packFile)) rmSync(packFile);
    }
  }

  const sourceBytes = Buffer.byteLength(sourceText);
  const outputBytes = Buffer.byteLength(artifacts.output);
  const gzipBytes = gzipSync(artifacts.output).byteLength;
  if (outputBytes > 450 * 1024) throw new Error(`catalog exceeds 450 KiB raw budget: ${outputBytes} bytes`);
  const statusSummary = LANGUAGE_DEFINITIONS.map(({ code }) => `${code} ${artifacts.languageStatus[code].valid}/${artifacts.languageStatus[code].total}${artifacts.languageStatus[code].live ? ' live' : ' blocked'}`).join(' | ');
  const packSummary = Object.entries(artifacts.packOutputs).map(([code, value]) => `${code} ${Buffer.byteLength(value)} bytes`).join(' | ');
  console.log(`Catalog ${dryRun ? 'dry run' : checkOnly ? 'check' : 'build'} passed: ${artifacts.catalog.total} prompts | raw ${outputBytes} bytes | gzip ${gzipBytes} bytes | ${(100 * outputBytes / sourceBytes).toFixed(1)}% of full data | ${statusSummary}${packSummary ? ` | packs: ${packSummary}` : ''}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
