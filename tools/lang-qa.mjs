// Shared Phase 3 translation QA. merge-lang.mjs and lang-status.mjs both use
// this module so a language cannot be counted complete under a weaker gate.
export const LANGUAGE_CONFIG = {
  bn: { label: 'Bengali', min: 0x0980, max: 0x09ff },
  mr: { label: 'Marathi', min: 0x0900, max: 0x097f },
  te: { label: 'Telugu', min: 0x0c00, max: 0x0c7f },
};

const TEXT_FIELDS = ['title', 'whatYouGet', 'howToUse', 'commonFix', 'promptText'];
export const FROZEN_TERMS = [
  'WolframAlpha', 'Wolfram Problem Generator', 'Wolfram Demonstrations Project', 'Wolfram',
  'Symbolab', 'GeoGebra Classroom', 'GeoGebra', 'Desmos', 'Math StackExchange', 'MathOverflow',
  'Art of Problem Solving', 'AoPS', 'OEIS', 'Khan Academy', 'Khan', 'Overleaf',
  'CodeCogs', 'SageMathCell', 'Google Forms', 'Google Form', 'Google Apps Script', 'Apps Script',
  'Google Sheets', 'Google Docs', 'Google Slides', 'Google Drive', 'Google Colab',
  'Wayground', 'Quizizz', 'Kahoot', 'Blooket', 'Photomath', 'Mathway', 'PhET', 'DIKSHA',
  'Anki', 'Quizlet', 'Tome',
  'WhatsApp', 'ChatGPT', 'Claude', 'Gemini', 'Perplexity', 'Copilot', 'Grok',
  'Microsoft Word', 'Microsoft Excel', 'PowerPoint', 'Excel', 'Canva', 'Gamma',
  'python-docx', 'python-pptx', 'pdflatex', 'xelatex', 'XeLaTeX', 'TeX engine', '.typ',
  'LaTeX', 'TikZ', 'Typst', 'JavaScript', 'FormApp',
  'Google AI Mode', 'Telegram', 'Instagram', 'YouTube Shorts', 'YouTube',
  'PDF', 'DOCX', 'PPTX', 'PPT', 'DPP', 'MCQ', 'CSV', 'XLSX', 'PNG', 'JSON', 'HTML', 'SVG', 'UTF-8', 'Worksheet', 'URL', 'QR',
  'JEE Main', 'JEE Advanced', 'CBSE', 'ICSE', 'NCERT', 'NEET', 'NSEP', 'NSEC', 'IMO', 'AMC', 'AIME', 'Olympiad',
  'QUERY', 'SUMIFS', 'COUNTIFS', 'RANK', 'Correct Answer(s)',
];

// Machine-facing strings are kept separate from ordinary product/tool names:
// some of them overlap URLs or appear only in particular source-line contexts.
// These exports keep batch preparation and QA from silently drifting apart.
export const MACHINE_ROUTES = [
  'script.google.com → New project → paste → Run → View → Logs',
  'Create → Import → Paste questions',
];

export const MACHINE_QUERY_TOKENS = [
  '?page_search_query=', '?encoded_snip=', '?command=', '?category=', '?prompt=', '?query=', '?locale=',
  '?udm=', '?i=', '?q=', '&screens=', '&topic=', '&q=',
];

export const MACHINE_EXACT_LITERALS = [
  'C=concept, S=silly slip, T=ran out of time / failed to abandon, I=no idea',
  'C=Point',
];

export const MATH_EXACT_LITERALS = ['<=', '>=', '!=', '+-'];

export const MACHINE_CALL_NAMES = [
  'Integral', 'binomial', 'arctan', 'If', 'Binomial', 'lcm',
  'Responses', 'Students', 'Questions',
  'abs', 'sin', 'cos', 'sqrt', 'log', 'tan', 'min', 'real', 'imaginary',
  'Angle', 'ApplyMatrix', 'BarChart', 'BinomialDist', 'BoxPlot', 'Circle', 'Directrix',
  'Extremum', 'Focus', 'Intersect', 'Locus', 'Mean', 'Median', 'Midpoint',
  'PerpendicularLine', 'Point', 'Polygon', 'Pyramid', 'Root', 'Segment', 'Sequence',
  'Slope', 'Tangent', 'Text', 'Vector',
  'f', 'g', 's', 'a',
];

export const MACHINE_HEADER_LABELS = [
  'Correct answer number', 'Correct Answer(s)',
  'Answer 1', 'Answer 2', 'Answer 3', 'Answer 4',
  'Time limit', 'Time Limit', 'Question',
];

// A capitalized `Word` names the Microsoft product only in these contexts;
// freezing it globally would corrupt ordinary phrases such as "word problem".
export const CONTEXTUAL_FROZEN_TERMS = [
  {
    term: 'Word',
    include: [
      '\\bWord\\s+or\\s+Google Docs\\b',
      '\\b(?:paste|pastes|pasted|pasting|copy|copies|copied|export|open|save)[^.\\n]{0,100}\\bWord\\b',
      '\\bWord\\b[^.\\n]{0,60}\\b(?:Google Docs|DOCX|PDF|document|file)\\b',
      '\\bWord\\s*\\(\\.docx\\)',
      '\\bWord\\s*/\\s*PDF\\b',
    ],
  },
];

// These English words have both mathematical and ordinary meanings. The same
// These include rules ensure first-use maths anchors are required only in an
// audited mathematical context.
export const TECHNICAL_CONTEXT_RULES = {
  function: [
    '\\b(?:quadratic|linear|trigonometric|exponential|logarithmic|inverse|composite|piecewise|even|odd|modulus|rational|polynomial|mathematical) functions?\\b',
    '\\bfunctions?\\s+(?:graph|notation|value|domain|range|of)\\b',
    '\\b(?:domain|range|graph)\\s+(?:of\\s+)?(?:a\\s+)?functions?\\b',
    '\\b[fg]\\s*\\([A-Za-z]\\s*\\)', '\\by\\s*=\\s*[A-Za-z0-9(]',
  ],
  root: [
    '\\b(?:square|cube|nth|real|complex|positive|negative|repeated|distinct) roots?\\b',
    '\\broots?\\s+(?:of|for)\\b', '\\b(?:equation|polynomial|quadratic)[^.\\n]{0,100}\\broots?\\b',
    '\\bsqrt\\b',
  ],
  limit: [
    '\\b(?:left-hand|right-hand|two-sided|infinite|finite) limits?\\b',
    '\\blimits?\\s+(?:rule|law|problem|question|concept|evaluation|of)\\b',
    '\\blimits?\\s+and\\s+continuity\\b', '\\bcalculus[^.\\n]{0,100}\\blimits?\\b', '\\blim\\s*[_<(]',
  ],
  series: [
    '\\b(?:arithmetic|geometric|power|Taylor|Maclaurin|infinite|convergent|divergent) series\\b',
    '\\bseries\\s+(?:expansion|sum|term|convergence|divergence)\\b',
  ],
  domain: [
    '\\bdomain\\s+and\\s+range\\b', '\\bdomain\\s+of\\s+(?:the\\s+|a\\s+)?function\\b',
    '\\bfunction[^.\\n]{0,100}\\bdomain\\b',
  ],
  range: [
    '\\bdomain\\s+and\\s+range\\b', '\\brange\\s+of\\s+(?:the\\s+|a\\s+)?function\\b',
    '\\bfunction[^.\\n]{0,100}\\brange\\b', '\\b[xy]-range\\b',
  ],
  angle: [
    '\\b(?:acute|obtuse|right|reflex|central|inscribed|exterior|interior) angles?\\b',
    '\\b(?:triangle|geometry|trigonometry|degree|radian|vertex|parallel lines?)[^.\\n]{0,100}\\bangles?\\b',
    '\\bangles?\\s+(?:of|in|between)\\b',
  ],
  variable: [
    '\\b(?:algebra|equation|polynomial|function|coefficient|unknown)[^.\\n]{0,100}\\bvariables?\\b',
    '\\bvariables?\\s+[xyz]\\b', '\\b(?:dependent|independent) variables?\\b',
  ],
  integration: [
    '\\b(?:definite|indefinite|numerical) integration\\b', '\\bintegration\\s+by\\b',
    '\\b(?:calculus|integral|differentiation)[^.\\n]{0,100}\\bintegration\\b',
  ],
  sequence: [
    '\\b(?:arithmetic|geometric|Fibonacci|recursive|finite|infinite) sequences?\\b',
    '\\bsequences?\\s+(?:of\\s+)?(?:numbers|terms)\\b', '\\bnth[- ]term[^.\\n]{0,100}\\bsequences?\\b',
  ],
};

export const TECHNICAL_GLOSSARIES = {
  bn: [
    ['VERIFY', 'যাচাই করুন'],
    ['differential equation', 'অবকল সমীকরণ'], ['quadratic equation', 'দ্বিঘাত সমীকরণ'],
    ['linear equation', 'রৈখিক সমীকরণ'], ['coordinate geometry', 'স্থানাঙ্ক জ্যামিতি'],
    ['number theory', 'সংখ্যাতত্ত্ব'], ['marking scheme', 'নম্বরদানের পরিকল্পনা'],
    ['distractor analysis', 'বিভ্রান্তিকর বিকল্প বিশ্লেষণ'], ['lesson plan', 'পাঠ পরিকল্পনা'],
    ['mind map', 'ধারণা-মানচিত্র'], ['probability', 'সম্ভাবনা'], ['trigonometry', 'ত্রিকোণমিতি'],
    ['geometry', 'জ্যামিতি'], ['calculus', 'ক্যালকুলাস'], ['discriminant', 'নিরূপক'],
    ['substitution', 'প্রতিস্থাপন'], ['derivative', 'অন্তরক'], ['integral', 'সমাকল'],
    ['polynomial', 'বহুপদী'], ['matrix', 'ম্যাট্রিক্স'], ['vector', 'ভেক্টর'],
    ['theorem', 'উপপাদ্য'], ['rubric', 'মূল্যায়ন মানদণ্ড'], ['root', 'মূল'],
    ['multiple choice question', 'বহুনির্বাচনী প্রশ্ন'], ['mathematical induction', 'গাণিতিক আরোহ'],
    ['complex number', 'জটিল সংখ্যা'], ['arithmetic progression', 'সমান্তর ধারা'],
    ['geometric progression', 'গুণোত্তর ধারা'], ['inequality', 'অসমতা'],
    ['integration', 'সমাকলন'], ['differentiation', 'অন্তরকলন'], ['continuity', 'ধারাবাহিকতা'],
    ['permutation', 'বিন্যাস'], ['combination', 'সমাবেশ'], ['statistics', 'পরিসংখ্যান'],
    ['sequence', 'অনুক্রম'], ['proof', 'প্রমাণ'], ['equation', 'সমীকরণ'],
    ['function', 'ফাংশন'], ['fraction', 'ভগ্নাংশ'], ['variable', 'চলক'],
    ['determinant', 'নির্ণায়ক'], ['graph', 'লেখচিত্র'], ['algebra', 'বীজগণিত'],
    ['slope', 'ঢাল'], ['coefficient', 'সহগ'], ['intercept', 'অক্ষছেদ'],
    ['angle', 'কোণ'], ['triangle', 'ত্রিভুজ'], ['ratio', 'অনুপাত'],
    ['proportion', 'সমানুপাত'], ['exponent', 'সূচক'], ['logarithm', 'লগারিদম'],
    ['limit', 'সীমা'], ['series', 'ধারা'], ['domain', 'ডোমেন'], ['range', 'রেঞ্জ'],
  ],
  mr: [
    ['VERIFY', 'सत्यापित करा'],
    ['differential equation', 'अवकल समीकरण'], ['quadratic equation', 'द्विघात समीकरण'],
    ['linear equation', 'रेषीय समीकरण'], ['coordinate geometry', 'निर्देशांक भूमिती'],
    ['number theory', 'संख्या सिद्धांत'], ['multiple choice question', 'बहुपर्यायी प्रश्न'],
    ['mathematical induction', 'गणितीय आगमन'], ['complex number', 'संमिश्र संख्या'],
    ['arithmetic progression', 'अंकगणितीय श्रेढी'], ['geometric progression', 'भूमितीय श्रेढी'],
    ['probability', 'संभाव्यता'], ['permutation', 'क्रमचय'], ['combination', 'संचय'],
    ['inequality', 'असमिका'], ['derivative', 'अवकलज'], ['integration', 'समाकलन'],
    ['integral', 'समाकल'], ['trigonometry', 'त्रिकोणमिती'], ['geometry', 'भूमिती'],
    ['algebra', 'बीजगणित'], ['calculus', 'कलन'], ['discriminant', 'डिस्क्रिमिनंट'],
    ['substitution', 'प्रतिस्थापन'], ['statistics', 'सांख्यिकी'], ['sequence', 'अनुक्रम'],
    ['theorem', 'प्रमेय'], ['proof', 'पुरावा'], ['equation', 'समीकरण'], ['function', 'फलन'],
    ['fraction', 'अपूर्णांक'], ['variable', 'चल'], ['matrix', 'आव्यूह'],
    ['determinant', 'निर्धारक'], ['vector', 'सदिश'], ['graph', 'आलेख'], ['root', 'मूळ'],
    ['marking scheme', 'गुणांकन योजना'], ['distractor analysis', 'चुकीच्या पर्यायांचे विश्लेषण'],
    ['lesson plan', 'पाठ योजना'], ['mind map', 'संकल्पना नकाशा'], ['polynomial', 'बहुपदी'],
    ['rubric', 'मूल्यांकन निकष'], ['differentiation', 'अवकलन'], ['continuity', 'सातत्य'],
    ['slope', 'उतार'], ['coefficient', 'गुणांक'], ['intercept', 'अक्षछेद'],
    ['angle', 'कोन'], ['triangle', 'त्रिकोण'], ['ratio', 'गुणोत्तर'],
    ['proportion', 'प्रमाण'], ['exponent', 'घातांक'], ['logarithm', 'लघुगणक'],
    ['limit', 'सीमा'], ['series', 'श्रेणी'], ['domain', 'व्याख्याक्षेत्र'], ['range', 'मूल्यक्षेत्र'],
  ],
  te: [
    ['VERIFY', 'ధృవీకరించండి'],
    ['differential equation', 'అవకలన సమీకరణం'], ['quadratic equation', 'ద్విఘాత సమీకరణం'],
    ['linear equation', 'రేఖీయ సమీకరణం'], ['coordinate geometry', 'నిర్దేశాంక జ్యామితి'],
    ['number theory', 'సంఖ్యా సిద్ధాంతం'], ['marking scheme', 'మార్కింగ్ పథకం'],
    ['probability', 'సంభావ్యత'], ['inequality', 'అసమానత'], ['derivative', 'అవకలనం'],
    ['integration', 'సమాకలనం'], ['integral', 'సమాకలనం'], ['calculus', 'కలన గణితం'],
    ['discriminant', 'విచక్షణి'], ['substitution', 'ప్రతిక్షేపణ'], ['geometry', 'జ్యామితి'],
    ['algebra', 'బీజగణితం'], ['theorem', 'సిద్ధాంతం'], ['proof', 'నిరూపణ'],
    ['equation', 'సమీకరణం'], ['function', 'ప్రమేయం'], ['root', 'మూలం'],
    ['multiple choice question', 'బహుళ ఎంపిక ప్రశ్న'], ['mathematical induction', 'గణిత ఆగమనం'],
    ['complex number', 'సంకీర్ణ సంఖ్య'], ['arithmetic progression', 'అంకగణిత శ్రేణి'],
    ['geometric progression', 'గుణోత్తర శ్రేణి'], ['trigonometry', 'త్రికోణమితి'],
    ['differentiation', 'అవకలన'], ['continuity', 'సాతత్యం'], ['permutation', 'క్రమచయం'],
    ['combination', 'సంయోగం'], ['statistics', 'గణాంకశాస్త్రం'], ['sequence', 'అనుక్రమం'],
    ['polynomial', 'బహుపది'], ['matrix', 'మాత్రిక'], ['vector', 'సదిశం'],
    ['determinant', 'నిర్ధారకం'], ['graph', 'గ్రాఫ్'], ['fraction', 'భిన్నం'],
    ['variable', 'చరరాశి'], ['lesson plan', 'పాఠ ప్రణాళిక'], ['rubric', 'మూల్యాంకన ప్రమాణం'],
    ['slope', 'వాలు'], ['coefficient', 'గుణకం'], ['intercept', 'అక్షఖండం'],
    ['angle', 'కోణం'], ['triangle', 'త్రిభుజం'], ['ratio', 'నిష్పత్తి'],
    ['proportion', 'అనుపాతం'], ['exponent', 'ఘాతాంకం'], ['logarithm', 'లఘుగణకం'],
    ['limit', 'పరిమితి'], ['series', 'శ్రేణి'], ['domain', 'నిర్వచన ప్రాంతం'], ['range', 'విలువల సమితి'],
  ],
};

export function languageConfig(code) {
  const config = LANGUAGE_CONFIG[code];
  if (!config) throw new Error(`Unsupported language ${code || '(missing)'}; use bn, mr or te.`);
  return { code, ...config };
}

export function bracketTokens(value) {
  // The contract requires an identical multiset. Natural target-language word
  // order can legitimately move a named placeholder within the same line;
  // semantic review separately guards against role reversals.
  return (String(value || '').match(/\[\[[^\]\n]+\]\]|\[[^\]\n]+\]/g) || []).sort();
}

export function scriptCount(value, config) {
  let count = 0;
  for (const character of String(value || '')) {
    const point = character.codePointAt(0);
    if (point >= config.min && point <= config.max) count += 1;
  }
  return count;
}

function scriptWords(value, config) {
  const pattern = new RegExp(`[\\u{${config.min.toString(16)}}-\\u{${config.max.toString(16)}}]{2,}`, 'gu');
  return String(value || '').match(pattern) || [];
}

function repetitiveNativeText(value, config) {
  const words = scriptWords(value, config);
  if (words.length < 16) return false;
  const counts = new Map();
  for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);
  const mostFrequent = Math.max(...counts.values());
  const diversity = counts.size / words.length;
  if (diversity < 0.10 || (mostFrequent / words.length > 0.30 && diversity < 0.22)) return true;
  if (words.length < 20) return false;
  const ngramSize = 5;
  const starts = new Map();
  for (let index = 0; index <= words.length - ngramSize; index += 1) {
    const key = words.slice(index, index + ngramSize).join('\u0000');
    if (!starts.has(key)) starts.set(key, []);
    starts.get(key).push(index);
  }
  const covered = Array(words.length).fill(false);
  for (const indexes of starts.values()) {
    if (indexes.length < 2) continue;
    for (const start of indexes) covered.fill(true, start, start + ngramSize);
  }
  return covered.filter(Boolean).length / words.length >= 0.35;
}

function comparableUrls(value) {
  return (String(value || '').match(/https?:\/\/[^\s<>"']+/g) || [])
    .map(url => url.replace(/[.,;:!?।॥]+$/u, ''))
    .sort();
}

function domainNames(value) {
  return (String(value || '').match(/\b(?:[A-Za-z0-9-]+\.)+(?:com|org|net|edu|in|io|ai|app|dev)(?:\/[^\s<>"']*)?/gi) || [])
    .map(domain => domain.replace(/[.,;:!?।॥]+$/u, ''))
    .sort();
}

function numbers(value) {
  // Compare the multiset: target-language syntax can reorder quantities while
  // every exact numeral remains on its source line.
  return (String(value || '').match(/\d+(?:\.\d+)?/g) || []).sort();
}

function fileNames(value) {
  return (String(value || '').match(/\b[\w.-]+\.(?:pdf|docx?|pptx?|xlsx?|csv|tsv|tex|typ|png|jpe?g|svg|html?|js|mjs|json)\b/gi) || []).sort();
}

function codeBlocks(value) {
  return (String(value || '').match(/```[\s\S]*?```/g) || []).sort();
}

function inlineCode(value) {
  return (String(value || '').match(/`[^`\n]+`/g) || []).sort();
}

function displayMath(value) {
  return (String(value || '').match(/\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g) || []).sort();
}

const MATH_ATOM_WORDS = new Set([
  'abs', 'am', 'ap', 'arg', 'cm', 'cos', 'cot', 'csc', 'deg', 'det', 'dx', 'dy', 'dz',
  'exp', 'gcd', 'gm', 'gp', 'hcf', 'hr', 'kg', 'km', 'lcm', 'lim', 'ln', 'log', 'max',
  'min', 'ml', 'mm', 'mod', 'ncr', 'npr', 'rad', 're', 'rhs', 'rpm', 'sec', 'sin', 'sqrt',
  'tan', 'lhs',
]);
const COMPACT_PROSE_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'day', 'did', 'do', 'for',
  'go', 'has', 'how', 'if', 'in', 'is', 'it', 'key', 'link', 'map', 'no', 'not', 'of',
  'on', 'one', 'or', 'page', 'ran', 'run', 'say', 'set', 'the', 'to', 'top', 'use', 'via',
  'was', 'why', 'yes',
]);
const COEFFICIENT_SUFFIX_EXCLUSIONS = new Set(['am', 'cm', 'hr', 'kg', 'km', 'mm', 'nd', 'pm', 'pt', 'rd', 'st', 'th']);

function simpleMathAtom(value, allowUppercase = false, allowCompactIdentifiers = false, allowMultiLetterCoefficients = false) {
  const atom = String(value || '').trim();
  if (!atom) return false;
  if (/^[+-]?\d+(?:\.\d+)?$/.test(atom)) return true;
  const coefficient = atom.match(/^[+-]?\d+(?:\.\d+)?([A-Za-zθπ]{1,2})$/);
  if (coefficient && (coefficient[1].length === 1 || (allowMultiLetterCoefficients && !COEFFICIENT_SUFFIX_EXCLUSIONS.has(coefficient[1].toLowerCase())))) return true;
  if (/^[A-Za-zθπ](?:_[A-Za-z0-9]+|\d*)$/.test(atom)) return true;
  if (allowUppercase && /^[A-Z]{2,3}\d*$/.test(atom)) return true;
  if (allowCompactIdentifiers && /^[a-z]{2,4}$/.test(atom) && !COMPACT_PROSE_WORDS.has(atom)) return true;
  return MATH_ATOM_WORDS.has(atom.toLowerCase());
}

function plausibleMathOperand(value, allowUppercase = false, allowCompactIdentifiers = false, allowMultiLetterCoefficients = false) {
  const operand = String(value || '').trim();
  if (simpleMathAtom(operand, allowUppercase, allowCompactIdentifiers, allowMultiLetterCoefficients)) return true;
  const functionMatch = operand.match(/^([A-Za-z]{1,8})\(([^()]*)\)$/);
  if (functionMatch) {
    const name = functionMatch[1];
    const atoms = functionMatch[2].split(/[,\s=+*/^<>≤≥≠±×÷-]+/).filter(Boolean);
    return (simpleMathAtom(name, allowUppercase, allowCompactIdentifiers, allowMultiLetterCoefficients) || MATH_ATOM_WORDS.has(name.toLowerCase())) && atoms.length > 0 && atoms.every(atom => simpleMathAtom(atom, allowUppercase, allowCompactIdentifiers, allowMultiLetterCoefficients));
  }
  const parenthetical = operand.match(/^\(([^()]*)\)$/);
  if (!parenthetical) return false;
  const atoms = parenthetical[1].split(/[,\s=+*/^<>≤≥≠±×÷-]+/).filter(Boolean);
  return atoms.length > 0 && atoms.every(atom => simpleMathAtom(atom, allowUppercase, allowCompactIdentifiers, allowMultiLetterCoefficients));
}

function meaningfulExpression(candidate, allowCompactIdentifiers = false) {
  let expression = String(candidate || '').trim();
  const wrapped = value => {
    if (!value.startsWith('(') || !value.endsWith(')')) return false;
    let depth = 0;
    for (let index = 0; index < value.length; index += 1) {
      if (value[index] === '(') depth += 1;
      else if (value[index] === ')') depth -= 1;
      if (depth === 0 && index < value.length - 1) return false;
      if (depth < 0) return false;
    }
    return depth === 0;
  };
  while (wrapped(expression)) expression = expression.slice(1, -1).trim();
  const operands = [];
  let current = '';
  let depth = 0;
  for (const character of expression) {
    if (character === '(') depth += 1;
    if (character === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && /[=+*/^<>≤≥≠±×÷-]/.test(character)) {
      if (current.trim()) operands.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }
  if (current.trim()) operands.push(current.trim());
  const allowUppercase = /[=<>≤≥≠]/.test(expression);
  const allowLowercaseIdentifiers = allowCompactIdentifiers && allowUppercase;
  return operands.length > 1 && operands.every(operand => plausibleMathOperand(operand, allowUppercase, allowLowercaseIdentifiers, allowCompactIdentifiers));
}

function bareMath(value) {
  // Algebra tokens are line-local. Using \s here incorrectly joins ordinary
  // prose across a newline when one line ends with `/` (for example a URL).
  const text = String(value || '');
  const pattern = /\b(?:[A-Za-z][A-Za-z0-9_.]*|\d+(?:\.\d+)?|\([^\n()]{1,80}\))(?:(?:[ \t]*[=+*/^<>≤≥≠±×÷-][ \t]*)(?:[A-Za-z][A-Za-z0-9_.]*|\d+(?:\.\d+)?|\([^\n()]{1,80}\)))+/g;
  return Array.from(text.matchAll(pattern))
    // Do not reinterpret the tail of a contraction such as I'm-14 as algebra.
    .filter(match => !/[\p{L}'’]/u.test(text[match.index - 1] || ''))
    .map(match => match[0])
    .filter(candidate => meaningfulExpression(candidate, false))
    .map(candidate => candidate.replace(/\s+/g, ''))
    .sort();
}

function signedNumbers(value) {
  // Whitespace after a dash overwhelmingly denotes a list/separator in prose
  // ("PRACTICE - 3 questions"), not a negative number. Exact compact signs
  // remain protected, while the independent number inventory still preserves
  // the numeral in spaced prose.
  return (String(value || '').match(/(?<![\p{L}\p{M}\p{N}_.])[+-]\d+(?:\.\d+)?/gu) || []).sort();
}

function compactMath(value) {
  const trimTerminalPunctuation = candidate => {
    let result = candidate.replace(/\.+$/g, '');
    while (result.endsWith(')')) {
      const opens = (result.match(/\(/g) || []).length;
      const closes = (result.match(/\)/g) || []).length;
      if (closes <= opens) break;
      result = result.slice(0, -1);
    }
    return result;
  };
  const text = String(value || '');
  return Array.from(text.matchAll(/[A-Za-z0-9θπ√().]+(?:[=+*/^<>≤≥≠±×÷-][A-Za-z0-9θπ√().]+)+/g))
    .filter(match => !/[\p{L}'’]/u.test(text[match.index - 1] || ''))
    .map(match => trimTerminalPunctuation(match[0]))
    .filter(candidate => candidate && meaningfulExpression(candidate, true))
    .sort();
}

function monomials(value) {
  return (String(value || '').match(/\b\d+(?:\.\d+)?(?:pi|[A-Za-zθπ]{1,2})\b/g) || [])
    .filter(item => {
      const suffix = item.match(/[A-Za-zθπ]+$/)?.[0]?.toLowerCase() || '';
      return !COEFFICIENT_SUFFIX_EXCLUSIONS.has(suffix);
    })
    .sort();
}

function implicitProducts(value) {
  return (String(value || '').match(/(?:\([^()\n]{1,80}\)){2,}/g) || [])
    .filter(candidate => {
      const factors = Array.from(candidate.matchAll(/\(([^()\n]{1,80})\)/g), match => match[1]);
      return factors.length > 1 && factors.every(factor => simpleMathAtom(factor, true, true, true) || meaningfulExpression(factor, true));
    })
    .sort();
}

function singleSymbolCalls(value) {
  return (String(value || '').match(/\b(?:[A-Za-z]|\d+(?:\.\d+)?)\([^()\n]{1,80}\)/g) || []).sort();
}

function mathFunctions(value) {
  return (String(value || '').match(/\b(?:sqrt|sin|cos|tan|log|ln|exp|abs)\([^()\n]{1,120}\)/gi) || []).sort();
}

function latexCommands(value) {
  return (String(value || '').match(/\\[A-Za-z]+(?:\{[^{}\n]*\})*/g) || []).sort();
}

function texScripts(value) {
  return (String(value || '').match(/\b[A-Za-z][A-Za-z0-9]*(?:[_^]\{[^{}\n]*\})+/g) || []).sort();
}

function toolSyntaxBlocks(value) {
  const lines = String(value || '').split('\n');
  const blocks = [];
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed === 'check this yourself' || trimmed.startsWith('CHECK →')) {
      blocks.push(lines[index]);
      continue;
    }
    if (!trimmed.startsWith('(paste-fallback:')) continue;
    const block = [lines[index]];
    while (!lines[index].trimEnd().endsWith(')') && index + 1 < lines.length) {
      index += 1;
      block.push(lines[index]);
    }
    blocks.push(block.join('\n'));
  }
  return blocks.sort();
}

const MACHINE_CALL_NAME_SET = new Set(MACHINE_CALL_NAMES);

function closingParenIndex(value, openIndex) {
  let depth = 0;
  for (let index = openIndex; index < value.length && value[index] !== '\n'; index += 1) {
    if (value[index] === '(') depth += 1;
    else if (value[index] === ')') {
      depth -= 1;
      if (depth === 0) return index;
      if (depth < 0) return -1;
    }
  }
  return -1;
}

function machineCalls(value) {
  const text = String(value || '');
  const calls = [];
  const starts = /\b([A-Za-z][A-Za-z0-9]*)\(/g;
  for (const match of text.matchAll(starts)) {
    if (!MACHINE_CALL_NAME_SET.has(match[1])) continue;
    const openIndex = match.index + match[0].length - 1;
    const closeIndex = closingParenIndex(text, openIndex);
    if (closeIndex >= 0) calls.push(text.slice(match.index, closeIndex + 1));
  }
  return calls.sort();
}

function machineSchemaIdentifiersByLine(value) {
  return String(value || '').split('\n').map(line => {
    const identifiers = [];
    for (const clause of line.matchAll(/\bschemas?\b([^.;\n]*)/gi)) {
      identifiers.push(...(clause[1].match(/\b[A-Z][A-Za-z0-9]*\b/g) || []).filter(value => !FROZEN_TERMS.includes(value)));
    }
    return identifiers.sort();
  });
}

function machineSchemaRuns(value) {
  return (String(value || '').match(/\b[A-Z][A-Za-z0-9]*(?:,[A-Z][A-Za-z0-9]*)+\b/g) || []).sort();
}

function machineSchemaRunsByLine(value) {
  return String(value || '').split('\n').map(line => {
    const runs = [];
    for (const clause of line.matchAll(/\bschemas?\b([^.;\n]*)/gi)) runs.push(...machineSchemaRuns(clause[1]));
    return runs.sort();
  });
}

function machineHeaderLabelsByLine(value) {
  return String(value || '').split('\n').map(line => {
    if (!(/\bKahoot\b.*\bXLSX\b.*\bcolumns\b/i.test(line) || /\bBlooket\b.*\bcolumns\b/i.test(line))) return [];
    const labels = [];
    for (const label of MACHINE_HEADER_LABELS) {
      for (let count = occurrenceCount(line, label); count > 0; count -= 1) labels.push(label);
    }
    return labels.sort();
  });
}

function occurrenceCount(value, needle) {
  return String(value || '').split(needle).length - 1;
}

function contextualFrozenTerms(line) {
  return CONTEXTUAL_FROZEN_TERMS
    .filter(item => item.include.some(pattern => new RegExp(pattern).test(String(line || ''))))
    .map(item => item.term);
}

function blankProtected(value, contract) {
  let text = String(value || '');
  const blank = match => match.replace(/[^\n]/g, ' ');
  const exactContract = String(contract || '').trim();
  if (exactContract && text.endsWith(exactContract)) text = text.slice(0, -exactContract.length) + blank(exactContract);
  for (const route of MACHINE_ROUTES) text = text.split(route).join(blank(route));
  for (const literal of MACHINE_EXACT_LITERALS) text = text.split(literal).join(blank(literal));
  for (const literal of MATH_EXACT_LITERALS) text = text.split(literal).join(blank(literal));
  text = text.replace(/```[\s\S]*?```/g, blank);
  text = text.replace(/\[\[[^\]\n]+\]\]|\[[^\]\n]+\]/g, ' ');
  text = text.replace(/https?:\/\/[^\s<>"']+/g, ' ');
  text = text.replace(/\b(?:[A-Za-z0-9-]+\.)+(?:com|org|net|edu|in|io|ai|app|dev)(?:\/[^\s<>"']*)?/gi, ' ');
  for (const token of MACHINE_QUERY_TOKENS) text = text.split(token).join(blank(token));
  text = text.replace(/`[^`\n]+`/g, ' ');
  text = text.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g, blank);
  for (const call of machineCalls(text)) text = text.replace(call, blank(call));
  text = text.replace(/\b(?:sqrt|sin|cos|tan|log|ln|exp|abs)\([^()\n]{1,120}\)/gi, ' ');
  text = text.replace(/\\[A-Za-z]+(?:\{[^{}\n]*\})*/g, ' ');
  text = text.replace(/\b[A-Za-z][A-Za-z0-9]*(?:[_^]\{[^{}\n]*\})+/g, ' ');
  text = text.replace(/\b[\w.-]+\.(?:pdf|docx?|pptx?|xlsx?|csv|tsv|tex|typ|png|jpe?g|svg|html?|js|mjs|json)\b/gi, ' ');
  for (const term of FROZEN_TERMS) text = text.split(term).join(' ');
  text = text.split('\n').map(line => {
    for (const term of contextualFrozenTerms(line)) line = line.split(term).join(' ');
    return line;
  }).join('\n');
  for (const run of machineSchemaRuns(text)) text = text.replace(run, blank(run));
  for (const label of MACHINE_HEADER_LABELS) text = text.split(label).join(blank(label));
  for (const item of implicitProducts(text)) text = text.replace(item, blank(item));
  for (const item of singleSymbolCalls(text)) text = text.replace(item, blank(item));
  for (const item of monomials(text)) text = text.replace(item, blank(item));
  for (const block of toolSyntaxBlocks(text)) text = text.replace(block, blank(block));
  return text;
}

function technicalTermPattern(term) {
  const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const irregular = {
    inequality: 'inequalit(?:y|ies)', probability: 'probabilit(?:y|ies)',
    geometry: 'geometr(?:y|ies)', matrix: '(?:matrix|matrices)',
    'distractor analysis': 'distractor analys(?:is|es)',
  };
  return irregular[term] || `${escaped(term)}s?`;
}

function technicalContextAllows(line, term) {
  const sourceLine = String(line || '');
  const rules = TECHNICAL_CONTEXT_RULES[term];
  return !rules || rules.some(pattern => new RegExp(pattern, 'i').test(sourceLine));
}

function requiredTechnicalAnchors(value, config, contract) {
  const text = blankProtected(value, contract);
  const occupied = Array(text.length).fill(false);
  const requirements = [];
  const glossary = TECHNICAL_GLOSSARIES[config.code] || [];
  for (const [english, target] of [...glossary].sort((left, right) => right[0].length - left[0].length)) {
    const matches = [...text.matchAll(new RegExp(`\\b${technicalTermPattern(english)}\\b`, 'gi'))];
    let firstLine = -1;
    for (const match of matches) {
      const start = match.index;
      const end = start + match[0].length;
      if (occupied.slice(start, end).some(Boolean)) continue;
      const line = text.slice(0, start).split('\n').length - 1;
      if (!technicalContextAllows(text.split('\n')[line], english)) continue;
      occupied.fill(true, start, end);
      if (firstLine < 0) firstLine = line;
    }
    if (firstLine >= 0) requirements.push({ english, target, line: firstLine });
  }
  return requirements;
}

function asciiLetterCount(value) {
  return (String(value || '').match(/[A-Za-z]/g) || []).length;
}

function sameList(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function devanagariAggregate(values, contract) {
  return values.map(value => blankProtected(value, contract)
    .normalize('NFC')
    .replace(/[^\u0900-\u097f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()).join(' ').trim();
}

function trigramDice(left, right) {
  const counts = value => {
    const map = new Map();
    for (let index = 0; index <= value.length - 3; index += 1) {
      const gram = value.slice(index, index + 3);
      map.set(gram, (map.get(gram) || 0) + 1);
    }
    return map;
  };
  const leftCounts = counts(left);
  const rightCounts = counts(right);
  let overlap = 0;
  for (const [gram, count] of leftCounts) overlap += Math.min(count, rightCounts.get(gram) || 0);
  return (2 * overlap) / Math.max(1, Math.max(0, left.length - 2) + Math.max(0, right.length - 2));
}

const MARATHI_EVIDENCE = new Set(['आणि', 'आहे', 'आहेत', 'करा', 'करावे', 'हे', 'मध्ये', 'साठी', 'द्या', 'सांगा', 'ठेवा', 'नाही', 'आपल्या', 'तुम्ही', 'किंवा', 'होईल', 'असल्यास']);
const HINDI_EVIDENCE = new Set(['और', 'है', 'हैं', 'करें', 'यह', 'ये', 'को', 'का', 'की', 'के', 'में', 'से', 'लिए', 'चाहिए', 'दें', 'बताएँ', 'बनाएँ', 'रखें', 'नहीं']);

function markerEvidence(value, inventory) {
  return (String(value || '').match(/[\u0900-\u097f]+/g) || []).reduce((count, word) => count + (inventory.has(word) ? 1 : 0), 0);
}

function lineShape(value) {
  return String(value || '').split('\n').map(line => line.trim() === '' ? 0 : 1);
}

const STRUCTURAL_LABEL_RE = /^[ \t]*(?:(?:[-*•]|(?:\d+|[A-Z])[.)])[ \t]+)?([A-Z](?:[A-Z0-9 &/+.\'’\-–—]*[A-Z0-9])?)(?:[ \t]+\([^()\n:]{1,120}\))?(?=:)/;
const STANDALONE_HEADING_RE = /^[ \t]*([A-Z][A-Z0-9 &/+.\'’\-–—]{1,160})[ \t]*$/;
const MARKDOWN_HEADING_RE = /^[ \t]*#{1,6}[ \t]+([A-Z][A-Z0-9 &/+.\'’\-–—]{1,160})[ \t]*$/;

function standaloneStructuralLabel(line) {
  const markdown = line.match(MARKDOWN_HEADING_RE);
  if (markdown) return markdown[1].trim();
  const plain = line.match(STANDALONE_HEADING_RE);
  if (!plain) return '';
  const label = plain[1].trim();
  if (/^[A-Z]\. SECTION [A-Z0-9 &/+.'’\-–—]+\.$/.test(label)) return label;
  return /[.!?]$/.test(label) ? '' : label;
}

function structuralLabelLines(value, contract) {
  let text = String(value || '');
  const exactContract = String(contract || '').trim();
  if (exactContract && text.endsWith(exactContract)) {
    text = text.slice(0, -exactContract.length) + exactContract.replace(/[^\n]/g, ' ');
  }
  let inFence = false;
  return text.split('\n').map(line => {
    const fenceCount = (line.match(/```/g) || []).length;
    const skip = inFence || fenceCount > 0;
    if (fenceCount % 2 === 1) inFence = !inFence;
    if (skip) return '';
    const match = line.match(STRUCTURAL_LABEL_RE);
    return match ? match[1].trim() : standaloneStructuralLabel(line);
  });
}

export function validateTranslation(prompt, translation, config, contract) {
  const errors = [];
  if (!translation || typeof translation !== 'object' || Array.isArray(translation)) {
    return ['translation object missing'];
  }

  for (const field of TEXT_FIELDS) {
    if (typeof translation[field] !== 'string' || !translation[field].trim()) errors.push(`${field} missing`);
  }
  if (!Array.isArray(translation.effectiveUsage) || translation.effectiveUsage.length !== prompt.effectiveUsage.length || translation.effectiveUsage.some(item => typeof item !== 'string' || !item.trim())) {
    errors.push('effectiveUsage missing or length differs');
  }
  if (scriptCount(translation.title, config) < 2) errors.push(`title has fewer than 2 ${config.label} script characters`);
  if (scriptCount(translation.promptText, config) < 50) errors.push(`promptText has fewer than 50 ${config.label} script characters`);
  for (const field of ['whatYouGet', 'howToUse', 'commonFix']) {
    if (typeof translation[field] === 'string' && scriptCount(translation[field], config) < 2) errors.push(`${field} lacks ${config.label} script`);
  }
  if (Array.isArray(translation.effectiveUsage)) translation.effectiveUsage.forEach((value, index) => {
    if (scriptCount(value, config) < 2) errors.push(`effectiveUsage[${index}] lacks ${config.label} script`);
  });

  const pairs = TEXT_FIELDS.map(field => [field, prompt[field], translation[field], prompt.hi && prompt.hi[field]]);
  if (Array.isArray(prompt.effectiveUsage) && Array.isArray(translation.effectiveUsage)) {
    prompt.effectiveUsage.forEach((value, index) => pairs.push([`effectiveUsage[${index}]`, value, translation.effectiveUsage[index], prompt.hi && prompt.hi.effectiveUsage && prompt.hi.effectiveUsage[index]]));
  }
  for (const [field, english, translated, hindi] of pairs) {
    if (!sameList(bracketTokens(english), bracketTokens(translated))) errors.push(`${field} placeholder tokens damaged`);
    if (!sameList(comparableUrls(english), comparableUrls(translated))) errors.push(`${field} URLs changed`);
    if (!sameList(domainNames(english), domainNames(translated))) errors.push(`${field} domain names changed`);
    if (!sameList(numbers(english), numbers(translated))) errors.push(`${field} numbers changed`);
    if (!sameList(fileNames(english), fileNames(translated))) errors.push(`${field} file names changed`);
    if (!sameList(codeBlocks(english), codeBlocks(translated))) errors.push(`${field} fenced code changed`);
    if (!sameList(inlineCode(english), inlineCode(translated))) errors.push(`${field} inline code changed`);
    if (!sameList(displayMath(english), displayMath(translated))) errors.push(`${field} displayed math changed`);
    if (!sameList(bareMath(english), bareMath(translated))) errors.push(`${field} bare math changed`);
    if (!sameList(signedNumbers(english), signedNumbers(translated))) errors.push(`${field} signed numbers changed`);
    if (!sameList(compactMath(english), compactMath(translated))) errors.push(`${field} compact math changed`);
    if (!sameList(mathFunctions(english), mathFunctions(translated))) errors.push(`${field} function notation changed`);
    if (!sameList(latexCommands(english), latexCommands(translated))) errors.push(`${field} LaTeX command changed`);
    if (!sameList(texScripts(english), texScripts(translated))) errors.push(`${field} TeX subscript/superscript changed`);
    if (!sameList(monomials(english), monomials(translated))) errors.push(`${field} monomial notation changed`);
    if (!sameList(implicitProducts(english), implicitProducts(translated))) errors.push(`${field} implicit-product notation changed`);
    if (!sameList(singleSymbolCalls(english), singleSymbolCalls(translated))) errors.push(`${field} single-symbol function notation changed`);
    if (!sameList(machineCalls(english), machineCalls(translated))) errors.push(`${field} machine function-call syntax changed`);
    if (!sameList(toolSyntaxBlocks(english), toolSyntaxBlocks(translated))) errors.push(`${field} tool example syntax changed`);
    for (const token of MACHINE_QUERY_TOKENS) {
      if (occurrenceCount(english, token) !== occurrenceCount(translated, token)) errors.push(`${field} machine query token changed: ${token}`);
    }
    for (const literal of MACHINE_EXACT_LITERALS) {
      if (occurrenceCount(english, literal) !== occurrenceCount(translated, literal)) errors.push(`${field} machine literal changed: ${literal}`);
    }
    for (const literal of MATH_EXACT_LITERALS) {
      if (occurrenceCount(english, literal) !== occurrenceCount(translated, literal)) errors.push(`${field} exact maths literal changed: ${literal}`);
    }
    for (const route of MACHINE_ROUTES) {
      const expected = occurrenceCount(english, route);
      if (expected > 0 && occurrenceCount(translated, route) < expected) errors.push(`${field} machine UI route changed: ${route}`);
    }
    for (const term of FROZEN_TERMS) {
      if (occurrenceCount(english, term) !== occurrenceCount(translated, term)) errors.push(`${field} frozen term changed: ${term}`);
    }
    const englishLines = String(english || '').split('\n');
    const translatedLines = String(translated || '').split('\n');
    if (englishLines.length !== translatedLines.length) errors.push(`${field} line count differs (${englishLines.length} vs ${translatedLines.length})`);
    else if (!sameList(lineShape(english), lineShape(translated))) errors.push(`${field} blank-line structure differs`);
    if (englishLines.length === translatedLines.length) {
      let inCodeFence = false;
      englishLines.forEach((line, index) => {
        const targetLine = translatedLines[index];
        const perLineInventories = [
          ['placeholder tokens', bracketTokens], ['URLs', comparableUrls], ['domain names', domainNames],
          ['numbers', numbers], ['file names', fileNames], ['inline code', inlineCode],
          ['displayed math', displayMath], ['bare math', bareMath], ['signed numbers', signedNumbers],
          ['compact math', compactMath], ['function notation', mathFunctions], ['LaTeX commands', latexCommands],
          ['TeX subscript/superscript', texScripts],
          ['monomials', monomials], ['implicit products', implicitProducts],
          ['single-symbol function notation', singleSymbolCalls], ['machine function calls', machineCalls],
        ];
        for (const [label, inventory] of perLineInventories) if (!sameList(inventory(line), inventory(targetLine))) {
          errors.push(`${field} line ${index + 1} ${label} moved or changed`);
        }
        for (const token of MACHINE_QUERY_TOKENS) if (occurrenceCount(line, token) !== occurrenceCount(targetLine, token)) {
          errors.push(`${field} line ${index + 1} machine query token moved or changed: ${token}`);
        }
        for (const literal of MACHINE_EXACT_LITERALS) if (occurrenceCount(line, literal) !== occurrenceCount(targetLine, literal)) {
          errors.push(`${field} line ${index + 1} machine literal moved or changed: ${literal}`);
        }
        for (const literal of MATH_EXACT_LITERALS) if (occurrenceCount(line, literal) !== occurrenceCount(targetLine, literal)) {
          errors.push(`${field} line ${index + 1} exact maths literal moved or changed: ${literal}`);
        }
        for (const route of MACHINE_ROUTES) if (occurrenceCount(line, route) !== occurrenceCount(targetLine, route)) {
          errors.push(`${field} line ${index + 1} machine UI route moved or changed: ${route}`);
        }
        for (const term of FROZEN_TERMS) if (occurrenceCount(line, term) !== occurrenceCount(targetLine, term)) {
          errors.push(`${field} line ${index + 1} frozen term moved or changed: ${term}`);
        }
        for (const term of contextualFrozenTerms(line)) if (occurrenceCount(line, term) !== occurrenceCount(targetLine, term)) {
          errors.push(`${field} line ${index + 1} contextual frozen term moved or changed: ${term}`);
        }
        const fenceCount = (line.match(/```/g) || []).length;
        if ((inCodeFence || fenceCount > 0) && line !== targetLine) {
          errors.push(`${field} line ${index + 1} fenced code line changed`);
        }
        if (fenceCount % 2 === 1) inCodeFence = !inCodeFence;
      });
      machineSchemaIdentifiersByLine(english).forEach((identifiers, index) => {
        if (!identifiers.length) return;
        const targetIdentifiers = translatedLines[index].match(/\b[A-Z][A-Za-z0-9]*\b/g) || [];
        for (const identifier of new Set(identifiers)) {
          const expected = identifiers.filter(value => value === identifier).length;
          const actual = targetIdentifiers.filter(value => value === identifier).length;
          if (actual !== expected) errors.push(`${field} line ${index + 1} machine schema identifier changed: ${identifier}`);
        }
      });
      machineSchemaRunsByLine(english).forEach((runs, index) => {
        for (const run of new Set(runs)) {
          const expected = runs.filter(value => value === run).length;
          const actual = occurrenceCount(translatedLines[index], run);
          if (actual !== expected) errors.push(`${field} line ${index + 1} machine schema run changed: ${run}`);
        }
      });
      machineHeaderLabelsByLine(english).forEach((labels, index) => {
        if (!labels.length) return;
        for (const label of new Set(labels)) {
          const expected = labels.filter(value => value === label).length;
          const actual = occurrenceCount(translatedLines[index], label);
          if (actual !== expected) errors.push(`${field} line ${index + 1} import header label changed: ${label}`);
        }
      });
      structuralLabelLines(english, contract).forEach((label, index) => {
        if (!label) return;
        const anchor = `(${label})`;
        const anchorIndex = translatedLines[index].indexOf(anchor);
        if (anchorIndex < 0) {
          errors.push(`${field} line ${index + 1} lost structural label (${label})`);
        } else if (asciiLetterCount(label) >= 4 && scriptCount(translatedLines[index].slice(0, anchorIndex), config) < 2) {
          errors.push(`${field} line ${index + 1} structural label (${label}) lacks a ${config.label} label`);
        }
      });
    }

    const sourceForCoverage = blankProtected(english, contract);
    const targetForCoverage = blankProtected(translated, contract);
    for (const requirement of requiredTechnicalAnchors(english, config, contract)) {
      const pairedAnchor = `${requirement.target} (${requirement.english})`;
      if (!String(translatedLines[requirement.line] || '').includes(pairedAnchor)) {
        errors.push(`${field} line ${requirement.line + 1} missing first-use technical pair ${pairedAnchor}`);
      }
    }
    const sourceLetters = asciiLetterCount(sourceForCoverage);
    const targetScript = scriptCount(targetForCoverage, config);
    const targetLatin = asciiLetterCount(targetForCoverage);
    const targetLetters = targetScript + targetLatin;
    if (sourceLetters >= 120 && repetitiveNativeText(targetForCoverage, config)) errors.push(`${field} is implausibly repetitive instead of a full translation`);
    if (sourceLetters >= 6) {
      if (targetScript < 2) errors.push(`${field} has no meaningful ${config.label} translation`);
      else if (targetScript / Math.max(1, targetScript + targetLatin) < 0.28) errors.push(`${field} remains mostly English`);
    }
    // Script presence alone cannot prove that the full source survived. Keep a
    // deliberately conservative length floor so a long field or line cannot be
    // replaced by a short target-language summary while still passing QA.
    if (sourceLetters >= 24 && targetLetters < Math.ceil(sourceLetters * 0.40)) {
      errors.push(`${field} appears truncated (${targetLetters} translated letters for ${sourceLetters} source letters)`);
    }
    if (englishLines.length === translatedLines.length) {
      const sourceCoverageLines = sourceForCoverage.split('\n');
      const targetCoverageLines = targetForCoverage.split('\n');
      const untranslatedLine = sourceCoverageLines.findIndex((line, index) => asciiLetterCount(line) >= 8 && scriptCount(targetCoverageLines[index], config) < 2);
      if (untranslatedLine >= 0) errors.push(`${field} line ${untranslatedLine + 1} lacks ${config.label} translation`);
      const truncatedLine = sourceCoverageLines.findIndex((line, index) => {
        const sourceLineLetters = asciiLetterCount(line);
        if (sourceLineLetters < 24) return false;
        const targetLine = targetCoverageLines[index];
        const targetLineLetters = scriptCount(targetLine, config) + asciiLetterCount(targetLine);
        return targetLineLetters < Math.ceil(sourceLineLetters * 0.40);
      });
      if (truncatedLine >= 0) errors.push(`${field} line ${truncatedLine + 1} appears truncated`);
    }
    if (sourceLetters >= 6 && sourceForCoverage.trim() === targetForCoverage.trim()) errors.push(`${field} is unchanged English`);
    if (config.code === 'mr' && typeof hindi === 'string') {
      if (scriptCount(translated, config) >= 160 && String(translated).trim() === hindi.trim()) errors.push(`${field} duplicates Hindi instead of Marathi`);
    }
  }

  if (config.code === 'mr' && prompt.hi) {
    const marathiValues = pairs.map(pair => pair[2]);
    const hindiValues = pairs.map(pair => pair[3]).filter(value => typeof value === 'string');
    if (hindiValues.length === marathiValues.length) {
      const marathiAggregate = devanagariAggregate(marathiValues, contract);
      const hindiAggregate = devanagariAggregate(hindiValues, contract);
      const shorter = Math.min(marathiAggregate.length, hindiAggregate.length);
      const longer = Math.max(marathiAggregate.length, hindiAggregate.length);
      const marathiEvidence = markerEvidence(marathiAggregate, MARATHI_EVIDENCE);
      const hindiEvidence = markerEvidence(marathiAggregate, HINDI_EVIDENCE);
      if (marathiAggregate.length >= 200 && (marathiEvidence < 5 || marathiEvidence <= hindiEvidence)) {
        errors.push('translation lacks Marathi language evidence');
      }
      if (shorter >= 200 && shorter / Math.max(1, longer) >= 0.80 && trigramDice(marathiAggregate, hindiAggregate) >= 0.90) {
        errors.push('translation is a near-duplicate of Hindi instead of Marathi');
      }
    }
  }

  const exactContract = String(contract || '').trim();
  if (exactContract && String(prompt.promptText || '').endsWith(exactContract) && !String(translation.promptText || '').endsWith(exactContract)) {
    errors.push('tool-link contract is not the exact final suffix');
  }
  return errors;
}
