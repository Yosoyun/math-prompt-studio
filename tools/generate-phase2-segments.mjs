// AUD-D P2/D3 + AUD-F P2/F4: build the reviewed, genuinely segment-specific
// workflow pack without editing data/prompts.js. The generated English pack is
// merged structurally by the parent integration script; the Hindi companion is
// intentionally shaped for tools/merge-hindi.mjs after that merge.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC_FILE = resolve(ROOT, 'tools/phase2-segments/specs.json');
const DATA_FILE = resolve(ROOT, 'data/prompts.js');
const PROMPTS_OUT = resolve(ROOT, '_handoff/phase2-segment-prompts.json');
const HINDI_OUT = resolve(ROOT, '_handoff/phase2-segment-hindi.json');
const MANIFEST_OUT = resolve(ROOT, '_handoff/phase2-segment-manifest.json');
const QA_OUT = resolve(ROOT, '_handoff/phase2-segment-qa.json');

const ADDED = '2026-07-17';
const allowedFormats = new Set(['pdf-print', 'doc', 'ppt', 'image', 'links', 'interactive', 'text']);
const allowedAudiences = new Set(['teacher', 'student', 'both']);
const familyCounts = {
  'board-foundation': 16,
  'foundation-olympiad': 36,
  'foundation-only': 4,
  'jee-dual': 37,
};
const categoryDefs = {
  'board-foundation': {
    category: 'board-foundation-workflows',
    categoryTitle: 'Boards + Foundation Workflows',
    categoryIcon: '🧭',
    group: 'Practice & Assessment',
    categoryBlurb: 'Class 6–8 workflows whose board alignment comes only from teacher-supplied rules, paired with visible Foundation support.',
  },
  'foundation-olympiad': {
    category: 'foundation-olympiad-bridges',
    categoryTitle: 'Foundation → Olympiad Bridges',
    categoryIcon: '🌉',
    group: 'Practice & Assessment',
    categoryBlurb: 'Purpose-built Class 6–8 bridges from secure Foundation skills to non-routine Olympiad reasoning, with every generated item labelled ORIGINAL PRACTICE.',
  },
  'foundation-only': {
    category: 'foundation-mastery-workflows',
    categoryTitle: 'Foundation Mastery Workflows',
    categoryIcon: '🧱',
    group: 'Teaching Materials',
    categoryBlurb: 'Diagnostic, representation and recovery workflows written specifically for Foundation learners in Classes 6–8.',
  },
  'jee-dual': {
    category: 'jee-main-advanced-dual-lane',
    categoryTitle: 'JEE Main + Advanced Dual-Lane Workflows',
    categoryIcon: '↗️',
    group: 'Practice & Assessment',
    categoryBlurb: 'One mathematical core, two honest lanes: JEE Main consolidation and JEE Advanced reasoning, never invented exam rules or fabricated PYQs.',
  },
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseData(source) {
  const marker = 'window.PROMPT_DATA =';
  const start = source.indexOf(marker);
  assert(start >= 0, 'data marker missing');
  return JSON.parse(source.slice(start + marker.length, source.lastIndexOf(';')));
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64).replace(/-+$/, '');
}

function placeholders(value) {
  return (String(value).match(/\[[^\]\n]{1,80}\]/g) || []).sort();
}

function devanagariCount(value) {
  return (String(value).match(/[ऀ-ॿ]/g) || []).length;
}

function inputsFor(spec) {
  const common = spec.family === 'board-foundation' ? [
    ['Class', 'कक्षा', '[CLASS 6, 7 OR 8]'],
    ['Board or school context', 'बोर्ड या स्कूल संदर्भ', '[BOARD OR SCHOOL CONTEXT]'],
    ['Chapter and topic scope', 'अध्याय और विषय-सीमा', '[CHAPTER AND TOPIC SCOPE]'],
    ['Teacher-supplied pattern or workflow rules', 'शिक्षक के दिए पैटर्न या कार्य-नियम', '[TEACHER-SUPPLIED PAPER PATTERN OR WORKFLOW RULES]'],
    ['Total marks or item count', 'कुल अंक या प्रश्न-संख्या', '[TOTAL MARKS OR ITEM COUNT]'],
    ['Time available', 'उपलब्ध समय', '[TIME AVAILABLE]'],
    ['Learner evidence or constraints', 'विद्यार्थी प्रमाण या सीमाएँ', '[LEARNER EVIDENCE OR CONSTRAINTS]'],
  ] : spec.family === 'foundation-olympiad' ? [
    ['Class', 'कक्षा', '[CLASS 6, 7 OR 8]'],
    ['Topic scope', 'विषय-सीमा', '[TOPIC SCOPE]'],
    ['Foundation starting skill', 'फ़ाउंडेशन की शुरुआती कुशलता', '[FOUNDATION STARTING SKILL]'],
    ['Olympiad reasoning target', 'ओलंपियाड तर्क-लक्ष्य', '[OLYMPIAD REASONING TARGET]'],
    ['Question count', 'प्रश्न-संख्या', '[QUESTION COUNT]'],
    ['Difficulty ladder', 'कठिनाई-सीढ़ी', '[DIFFICULTY LADDER]'],
    ['Time available', 'उपलब्ध समय', '[TIME AVAILABLE]'],
    ['Learner needs', 'विद्यार्थी की ज़रूरतें', '[LEARNER NEEDS]'],
  ] : spec.family === 'foundation-only' ? [
    ['Class', 'कक्षा', '[CLASS 6, 7 OR 8]'],
    ['Foundation topic', 'फ़ाउंडेशन विषय', '[FOUNDATION TOPIC]'],
    ['Observed evidence or error', 'देखा गया प्रमाण या त्रुटि', '[OBSERVED EVIDENCE OR ERROR]'],
    ['Lesson time', 'पाठ का समय', '[LESSON TIME]'],
    ['Learner needs', 'विद्यार्थी की ज़रूरतें', '[LEARNER NEEDS]'],
    ['Success criterion', 'सफलता का मानदंड', '[SUCCESS CRITERION]'],
  ] : [
    ['Mathematics topic or chapters', 'गणित विषय या अध्याय', '[MATHEMATICS TOPIC OR CHAPTERS]'],
    ['Teacher-supplied question types and marking rules', 'शिक्षक के दिए प्रश्न-प्रकार और अंकन नियम', '[TEACHER-SUPPLIED QUESTION TYPES AND MARKING RULES]'],
    ['Total items or time', 'कुल प्रश्न या समय', '[TOTAL ITEMS OR TIME]'],
    ['Student evidence or goal', 'विद्यार्थी का प्रमाण या लक्ष्य', '[STUDENT EVIDENCE OR GOAL]'],
    ['Difficulty range', 'कठिनाई-सीमा', '[DIFFICULTY RANGE]'],
  ];
  if (spec.id === 'jj-02') common.push(['Anonymised shift-wise data', 'गुमनाम शिफ्ट-वार डेटा', '[PASTED ANONYMISED SHIFT-WISE DATA]']);
  if (spec.id === 'jj-03') common.push(['Rank-band goal', 'रैंक-बैंड लक्ष्य', '[RANK-BAND GOAL]']);
  if (spec.id === 'jj-04') common.push(['Partial-marking rule', 'आंशिक-अंकन नियम', '[TEACHER-SUPPLIED PARTIAL-MARKING RULE]']);
  if (spec.id === 'jj-09' || spec.id === 'jj-37') common.push(['Anonymised attempt or error data', 'गुमनाम प्रयास या त्रुटि डेटा', '[PASTED ANONYMISED ATTEMPT OR ERROR DATA]']);
  return common;
}

function formatDirections(spec) {
  const directions = {
    'pdf-print': [
      'PRINT/PDF ASSEMBLY — use clear page headings, sensible page breaks, answer-writing space and a separate teacher key.',
      'प्रिंट/PDF संयोजन (PRINT/PDF ASSEMBLY) — स्पष्ट पृष्ठ-शीर्षक, सही पृष्ठ-विराम, उत्तर लिखने की जगह और अलग शिक्षक-कुंजी दें।',
    ],
    doc: [
      'EDITABLE DOCUMENT — use heading levels, compact tables and copy-ready sections that remain usable in Word or Google Docs.',
      'संपादन योग्य दस्तावेज़ (EDITABLE DOCUMENT) — शीर्षक-स्तर, सघन तालिकाएँ और Word या Google Docs में उपयोग योग्य कॉपी-तैयार खंड दें।',
    ],
    ppt: [
      'PPT STORYBOARD — give one slide title, visible content, teacher note and reveal cue per slide; keep each slide classroom-readable.',
      'PPT स्टोरीबोर्ड (PPT STORYBOARD) — हर स्लाइड के लिए शीर्षक, दिखाई देने वाली सामग्री, शिक्षक-टिप्पणी और खुलने का संकेत दें; स्लाइड कक्षा में पढ़ने योग्य रखें।',
    ],
    interactive: [
      'INTERACTIVE SESSION — script one teacher move and one learner response per turn, with a stop-and-check point before the next level.',
      'इंटरैक्टिव सत्र (INTERACTIVE SESSION) — हर दौर में एक शिक्षक-कदम और एक विद्यार्थी-उत्तर रखें तथा अगले स्तर से पहले रुककर जाँच का बिंदु दें।',
    ],
  };
  return directions[spec.fmt];
}

function familyCopy(spec) {
  if (spec.family === 'board-foundation') return {
    roleEn: 'Act as a Class 6–8 Boards assessment designer and Foundation pedagogy specialist. Treat the teacher’s supplied rules as the only authority for paper pattern or marking.',
    roleHi: 'कक्षा 6–8 बोर्ड मूल्यांकन-निर्माता और फ़ाउंडेशन (Foundation) शिक्षण-विशेषज्ञ की भूमिका निभाएँ। पेपर पैटर्न या अंकन के लिए केवल शिक्षक के दिए नियमों को आधार मानें।',
    contextEn: `Build ${spec.focus}. The distinctive workflow is to ${spec.mechanic}. Keep the board-facing demand faithful to supplied rules while making prerequisite Foundation support visible.`,
    contextHi: `${spec.focusHi} (${spec.focus}) तैयार करें। इस कार्य की खास विधि है: ${spec.mechanicHi}। बोर्ड-स्तर की माँग को दिए नियमों के अनुरूप रखें और फ़ाउंडेशन सहायता स्पष्ट दिखाएँ।`,
    taskEn: [
      'Read every supplied field. If the class, scope or governing rules are missing, ask for them and wait.',
      `Design ${spec.artifact}; do not substitute a generic worksheet or lesson plan.`,
      `Apply this exact mechanic: ${spec.mechanic}. Show where each part of the artifact satisfies it.`,
      'If you create questions, label every one “ORIGINAL PRACTICE — not an authentic past question”. Solve each question independently before finalising the key.',
      'Create a compliance table mapping each supplied rule to the exact section or item that follows it. Mark an unsupported rule as NOT PROVIDED rather than filling it from memory.',
      'Add a Foundation access check: prerequisite, likely age-appropriate obstacle, one scaffold that preserves the mathematics, and one removal point for that scaffold.',
    ],
    taskHi: [
      'दी गई हर जानकारी पढ़ें। कक्षा, विषय-सीमा या लागू नियम न हों तो ठीक वही माँगें और रुकें।',
      `${spec.artifactHi} तैयार करें; इसकी जगह सामान्य वर्कशीट या पाठ-योजना न दें।`,
      `ठीक यह विधि अपनाएँ: ${spec.mechanicHi}। दिखाएँ कि सामग्री का कौन-सा भाग इसे पूरा करता है।`,
      'यदि प्रश्न बनाएँ, तो हर प्रश्न पर “ORIGINAL PRACTICE — not an authentic past question” लिखें। उत्तर-कुंजी तय करने से पहले हर प्रश्न स्वतंत्र रूप से हल करें।',
      'हर दिए नियम को उसका पालन करने वाले ठीक खंड या प्रश्न से जोड़ती अनुपालन तालिका बनाएँ। जो नियम नहीं दिया गया उसे याद से भरने के बजाय NOT PROVIDED लिखें।',
      'फ़ाउंडेशन पहुँच-जाँच जोड़ें: पूर्वज्ञान, उम्र के अनुसार संभावित बाधा, गणित को बनाए रखने वाला एक सहारा और उस सहारे को हटाने का एक बिंदु।',
    ],
    outputEn: ['Teacher-supplied constraints used', 'Blueprint or workflow map', spec.artifact, 'Complete worked key or model responses', 'Boards + Foundation compliance audit'],
    outputHi: ['इस्तेमाल की गई शिक्षक-दत्त सीमाएँ', 'ब्लूप्रिंट या कार्य-मानचित्र', spec.artifactHi, 'पूर्ण हल-कुंजी या आदर्श उत्तर', 'बोर्ड + फ़ाउंडेशन अनुपालन-जाँच'],
    evidence: `Title and card copy explicitly name Class 6–8 Boards and Foundation; the workflow requires teacher-supplied rules and specifically ${spec.mechanic}.`,
  };
  if (spec.family === 'foundation-olympiad') return {
    roleEn: 'Act as a Class 6–8 Foundation teacher and Olympiad reasoning coach. Build a genuine bridge: secure the entry skill first, then increase reasoning depth without pretending generated items are past questions.',
    roleHi: 'कक्षा 6–8 फ़ाउंडेशन (Foundation) शिक्षक और ओलंपियाड (Olympiad) तर्क-प्रशिक्षक की भूमिका निभाएँ। वास्तविक सेतु बनाएँ: पहले शुरुआती कुशलता पक्की करें, फिर बनाए प्रश्नों को पुराना प्रश्न बताए बिना तर्क की गहराई बढ़ाएँ।',
    contextEn: `Teach ${spec.focus}. The bridge mechanic is to ${spec.mechanic}. The final rung must require an Olympiad-style insight, not merely larger numbers or longer arithmetic.`,
    contextHi: `${spec.focusHi} (${spec.focus}) सिखाएँ। सेतु की विधि है: ${spec.mechanicHi}। अंतिम पायदान में ओलंपियाड-शैली की सूझ चाहिए, केवल बड़ी संख्याएँ या लंबी गणना नहीं।`,
    taskEn: [
      'Start with a one-item Foundation check that reveals whether the stated entry skill is secure. Do not move ahead when the response shows a prerequisite gap.',
      `Build ${spec.artifact}; every rung must have a named reasoning change, not just a difficulty adjective.`,
      `Apply this exact bridge mechanic: ${spec.mechanic}. Explain why each transition is appropriate for Classes 6–8.`,
      'Label every generated question “ORIGINAL PRACTICE — not an authentic past question”. Never imitate or attribute an item to a named contest, year or source.',
      'Provide a four-level hint path: notice, represent, connect and finish. The first two hints must not reveal the decisive step.',
      'Give a complete teacher solution, a short student self-check and one transfer question that changes the surface while preserving the key idea.',
    ],
    taskHi: [
      'एक प्रश्न की फ़ाउंडेशन जाँच से शुरू करें जो बताए कि शुरुआती कुशलता पक्की है या नहीं। उत्तर में पूर्वज्ञान की कमी दिखे तो आगे न बढ़ें।',
      `${spec.artifactHi} तैयार करें; हर पायदान पर केवल कठिनाई का विशेषण नहीं, तर्क में स्पष्ट बदलाव हो।`,
      `ठीक यह सेतु-विधि अपनाएँ: ${spec.mechanicHi}। बताएँ कि हर संक्रमण कक्षा 6–8 के लिए क्यों उचित है।`,
      'हर बनाए प्रश्न पर “ORIGINAL PRACTICE — not an authentic past question” लिखें। किसी प्रश्न को किसी नामित प्रतियोगिता, वर्ष या स्रोत का न बताएँ, न उसकी नकल करें।',
      'चार-स्तरीय संकेत-पथ दें: ध्यान दें, निरूपित करें, संबंध जोड़ें और पूरा करें। पहले दो संकेत निर्णायक चरण न खोलें।',
      'पूरा शिक्षक-हल, छोटी विद्यार्थी स्व-जाँच और ऐसा एक स्थानांतरण प्रश्न दें जिसमें बाहरी रूप बदले पर मुख्य विचार बना रहे।',
    ],
    outputEn: ['Foundation entry check', 'Named reasoning ladder', spec.artifact, 'Four-level hint path', 'Olympiad transfer solution and self-check'],
    outputHi: ['फ़ाउंडेशन शुरुआती जाँच', 'नामित तर्क-सीढ़ी', spec.artifactHi, 'चार-स्तरीय संकेत-पथ', 'ओलंपियाड स्थानांतरण हल और स्व-जाँच'],
    evidence: `Title and card copy explicitly name Foundation, Olympiad and Classes 6–8; the non-routine bridge specifically ${spec.mechanic}.`,
  };
  if (spec.family === 'foundation-only') return {
    roleEn: 'Act as a Foundation mathematics intervention teacher for Classes 6–8. Use learner evidence to rebuild one prerequisite or representation at a time without lowering the mathematical goal.',
    roleHi: 'कक्षा 6–8 के फ़ाउंडेशन (Foundation) गणित सुधार-शिक्षक की भूमिका निभाएँ। गणितीय लक्ष्य घटाए बिना विद्यार्थी के प्रमाण से एक समय में एक पूर्वज्ञान या निरूपण फिर बनाएँ।',
    contextEn: `Build ${spec.focus}. The defining mechanic is to ${spec.mechanic}. Base decisions on the observed evidence supplied by the teacher, not on a guessed learner profile.`,
    contextHi: `${spec.focusHi} (${spec.focus}) तैयार करें। इसकी मुख्य विधि है: ${spec.mechanicHi}। निर्णय शिक्षक के दिए देखे प्रमाण पर लें, अनुमानित विद्यार्थी-प्रोफ़ाइल पर नहीं।`,
    taskEn: [
      'Check that the class, Foundation topic, observed evidence and success criterion are present. Ask only for missing inputs and wait.',
      `Build ${spec.artifact}; keep it focused on one observable learning bottleneck.`,
      `Apply this exact mechanic: ${spec.mechanic}. Tie every intervention move to a piece of supplied evidence.`,
      'If you create questions, label every one “ORIGINAL PRACTICE — not an authentic past question” and solve it before use.',
      'Separate a conceptual gap, a representation gap and a one-off execution slip; do not prescribe the same response for all three.',
      'End with a measurable check, a decision rule for the next lesson and one way to remove support after success.',
    ],
    taskHi: [
      'जाँचें कि कक्षा, फ़ाउंडेशन विषय, देखा प्रमाण और सफलता का मानदंड मौजूद हैं। केवल कम जानकारी माँगें और रुकें।',
      `${spec.artifactHi} तैयार करें; इसे सीखने की एक दिखाई देने वाली बाधा पर केंद्रित रखें।`,
      `ठीक यह विधि अपनाएँ: ${spec.mechanicHi}। हर सुधार-कदम को दिए प्रमाण के किसी हिस्से से जोड़ें।`,
      'यदि प्रश्न बनाएँ, तो हर प्रश्न पर “ORIGINAL PRACTICE — not an authentic past question” लिखें और उपयोग से पहले हल करें।',
      'अवधारणा की कमी, निरूपण की कमी और एक बार की क्रियान्वयन चूक को अलग करें; तीनों के लिए एक ही उपाय न दें।',
      'मापने योग्य जाँच, अगले पाठ का निर्णय-नियम और सफलता के बाद सहारा हटाने का एक तरीका देकर समाप्त करें।',
    ],
    outputEn: ['Evidence summary', 'Foundation bottleneck diagnosis', spec.artifact, 'Mastery check with worked key', 'Next-lesson decision rule'],
    outputHi: ['प्रमाण-सार', 'फ़ाउंडेशन बाधा निदान', spec.artifactHi, 'हल-कुंजी सहित दक्षता-जाँच', 'अगले पाठ का निर्णय-नियम'],
    evidence: `Title and card copy explicitly name Foundation and Classes 6–8; the intervention is evidence-bound and specifically ${spec.mechanic}.`,
  };
  return {
    roleEn: 'Act as a JEE mathematics faculty member designing two honest lanes: JEE Main consolidation and JEE Advanced reasoning. Use only question types, timing and marking rules supplied by the teacher.',
    roleHi: 'JEE गणित शिक्षक की भूमिका निभाएँ और दो स्पष्ट स्तर बनाएँ: JEE Main सुदृढ़ीकरण और JEE Advanced तर्क। केवल शिक्षक द्वारा दिए प्रश्न-प्रकार, समय और अंकन नियम इस्तेमाल करें।',
    contextEn: `Build ${spec.focus}. The dual-lane mechanic is to ${spec.mechanic}. The Advanced lane must deepen mathematical dependency or proof, not merely add calculation.`,
    contextHi: `${spec.focusHi} (${spec.focus}) तैयार करें। दो-स्तरीय विधि है: ${spec.mechanicHi}। Advanced स्तर में केवल गणना न बढ़ाएँ, गणितीय निर्भरता या प्रमाण गहरा करें।`,
    taskEn: [
      'Read the supplied topic, question types, marking rules, time and learner evidence. Ask for a missing governing rule instead of recalling an exam scheme.',
      `Build ${spec.artifact}; label the two lanes JEE MAIN CONSOLIDATION and JEE ADVANCED REASONING.`,
      `Apply this exact dual-lane mechanic: ${spec.mechanic}. State the concept dependency added in the Advanced lane.`,
      'Label every generated question “ORIGINAL PRACTICE — not an authentic past question”. Never attach a year, shift, paper code or claimed provenance.',
      'Solve every item independently, check domain and boundary cases, and separate mathematical proof from any quick computational check.',
      'End with an evidence-based review: what the learner demonstrated, what remains uncertain and the next controllable practice action. Do not promise marks, percentile or rank.',
    ],
    taskHi: [
      'दिया विषय, प्रश्न-प्रकार, अंकन नियम, समय और विद्यार्थी प्रमाण पढ़ें। लागू नियम कम हो तो परीक्षा योजना याद से बताने के बजाय वही नियम माँगें।',
      `${spec.artifactHi} तैयार करें; दोनों स्तरों पर JEE MAIN CONSOLIDATION और JEE ADVANCED REASONING लेबल लगाएँ।`,
      `ठीक यह दो-स्तरीय विधि अपनाएँ: ${spec.mechanicHi}। Advanced स्तर में जोड़ी गई अवधारणा-निर्भरता बताएँ।`,
      'हर बनाए प्रश्न पर “ORIGINAL PRACTICE — not an authentic past question” लिखें। कोई वर्ष, शिफ्ट, पेपर कोड या दावा किया स्रोत न जोड़ें।',
      'हर प्रश्न स्वतंत्र रूप से हल करें, परिभाषा-क्षेत्र और सीमा-स्थितियाँ जाँचें तथा गणितीय प्रमाण को त्वरित संगणकीय जाँच से अलग रखें।',
      'प्रमाण-आधारित समीक्षा से समाप्त करें: विद्यार्थी ने क्या दिखाया, क्या अनिश्चित है और अगला नियंत्रित अभ्यास-कदम क्या है। अंक, पर्सेंटाइल या रैंक का वादा न करें।',
    ],
    outputEn: ['Teacher-supplied rules used', 'JEE Main consolidation lane', 'JEE Advanced reasoning lane', spec.artifact, 'Worked key, checks and next-action review'],
    outputHi: ['इस्तेमाल किए गए शिक्षक-दत्त नियम', 'JEE Main सुदृढ़ीकरण स्तर', 'JEE Advanced तर्क स्तर', spec.artifactHi, 'हल-कुंजी, जाँच और अगला-कदम समीक्षा'],
    evidence: `Title and card copy explicitly name JEE Main and JEE Advanced; the two lanes specifically ${spec.mechanic}.`,
  };
}

function specialInstruction(spec) {
  if (spec.id === 'jj-02') return [
    'SHIFT-DATA HARD STOP: Use only [PASTED ANONYMISED SHIFT-WISE DATA]. If it is absent or columns are ambiguous, ask for corrected data and stop. Do not supplement it with remembered shifts, web trends or assumed distributions.',
    'शिफ्ट-डेटा अनिवार्य रोक (SHIFT-DATA HARD STOP): केवल [PASTED ANONYMISED SHIFT-WISE DATA] इस्तेमाल करें। डेटा न हो या स्तंभ अस्पष्ट हों तो सुधरा डेटा माँगें और रुकें। याद की शिफ्ट, वेब रुझान या माने हुए वितरण न जोड़ें।',
  ];
  if (spec.id === 'jj-03') return [
    'RANK-GOAL HARD STOP: Treat [RANK-BAND GOAL] only as a planning goal, never as a prediction, probability or guarantee. State that outcomes depend on factors beyond this plan.',
    'रैंक-लक्ष्य अनिवार्य रोक (RANK-GOAL HARD STOP): [RANK-BAND GOAL] को केवल योजना-लक्ष्य मानें, भविष्यवाणी, संभावना या गारंटी नहीं। साफ़ लिखें कि परिणाम इस योजना से बाहर के कारकों पर भी निर्भर हैं।',
  ];
  if (spec.id === 'jj-04') return [
    'PARTIAL-MARKING HARD STOP: Score the multi-correct drill only with [TEACHER-SUPPLIED PARTIAL-MARKING RULE]. If it is blank, do not score or infer a rule; ask the teacher and wait.',
    'आंशिक-अंकन अनिवार्य रोक (PARTIAL-MARKING HARD STOP): बहु-सही अभ्यास का अंकन केवल [TEACHER-SUPPLIED PARTIAL-MARKING RULE] से करें। यह खाली हो तो अंक न दें, नियम न मानें; शिक्षक से पूछकर रुकें।',
  ];
  if (spec.id === 'jj-09' || spec.id === 'jj-37') return [
    'ATTEMPT-DATA HARD STOP: Analyse only [PASTED ANONYMISED ATTEMPT OR ERROR DATA]. Do not infer class-wide prevalence, trends or likely scores from missing records.',
    'प्रयास-डेटा अनिवार्य रोक (ATTEMPT-DATA HARD STOP): केवल [PASTED ANONYMISED ATTEMPT OR ERROR DATA] का विश्लेषण करें। अधूरे रिकॉर्ड से पूरी कक्षा की व्यापकता, रुझान या संभावित अंक न निकालें।',
  ];
  return [
    'EVIDENCE HARD STOP: Do not invent exam rules, source history, learner data, scores or trends. Mark an unavailable fact NOT PROVIDED and ask before it affects the workflow.',
    'प्रमाण अनिवार्य रोक (EVIDENCE HARD STOP): परीक्षा नियम, स्रोत-इतिहास, विद्यार्थी डेटा, अंक या रुझान न गढ़ें। अनुपलब्ध तथ्य पर NOT PROVIDED लिखें और कार्य पर असर पड़ने से पहले पूछें।',
  ];
}

function buildPromptPair(spec) {
  const copy = familyCopy(spec);
  const inputs = inputsFor(spec);
  const format = formatDirections(spec);
  assert(format, `${spec.id}: no format direction for ${spec.fmt}`);
  const special = specialInstruction(spec);
  const en = [
    'ROLE:',
    copy.roleEn,
    '',
    'CONTEXT:',
    copy.contextEn,
    '',
    'INPUTS — FILL EVERY FIELD:',
    ...inputs.map(([enLabel, , token]) => `- ${enLabel}: ${token}`),
    '',
    'TASK:',
    ...copy.taskEn.map((line, index) => `${index + 1}. ${line}`),
    '',
    'WORKFLOW-SPECIFIC HARD STOP:',
    special[0],
    '',
    'OUTPUT FORMAT — USE THESE HEADINGS IN ORDER:',
    ...copy.outputEn.map((line, index) => `${index + 1}. ${line}`),
    '',
    'PRIMARY DELIVERABLE FORMAT:',
    format[0],
    '',
    'QUALITY GATE:',
    '- Segment fit is explicit in the content, not just a label.',
    '- Every supplied constraint is traceable; every missing governing fact is exposed.',
    '- Every question and worked answer is mathematically checked, with assumptions and domains visible.',
    '- Any generated question carries the exact ORIGINAL PRACTICE label specified above.',
    '',
    'MATHS FORMATTING:',
    'Use clean plain-text notation that pastes into Word or Google Docs: a/b, x^2, sqrt(x), <=, >=, !=, pi, theta, integral and sum. Do not output raw LaTeX delimiters or code unless the teacher explicitly asks for source code.',
    '',
    'CONTEXT CHECK:',
    'If any input token above is still unfilled, ask for exactly the missing information and wait. Never answer with an unfilled token or guess a teacher-controlled rule.',
    '',
    'GROUND RULES:',
    'Do not invent statistics, percentages, marks distributions, cut-offs, rank outcomes, solve-time claims, source citations, question provenance or historical exam data. Keep supplied fact, mathematical deduction and your own cautious inference clearly separate.',
  ];
  const hi = [
    'भूमिका (ROLE):',
    copy.roleHi,
    '',
    'संदर्भ (CONTEXT):',
    copy.contextHi,
    '',
    'इनपुट (INPUTS) — हर जानकारी भरें:',
    ...inputs.map(([, hiLabel, token]) => `- ${hiLabel}: ${token}`),
    '',
    'कार्य (TASK):',
    ...copy.taskHi.map((line, index) => `${index + 1}. ${line}`),
    '',
    'कार्य-विशेष अनिवार्य रोक (WORKFLOW-SPECIFIC HARD STOP):',
    special[1],
    '',
    'आउटपुट प्रारूप (OUTPUT FORMAT) — ये शीर्षक इसी क्रम में दें:',
    ...copy.outputHi.map((line, index) => `${index + 1}. ${line}`),
    '',
    'मुख्य सामग्री का प्रारूप (PRIMARY DELIVERABLE FORMAT):',
    format[1],
    '',
    'गुणवत्ता जाँच (QUALITY GATE):',
    '- वर्ग या परीक्षा की उपयुक्तता केवल लेबल में नहीं, सामग्री में स्पष्ट हो।',
    '- हर दी सीमा का संबंध दिखे; हर कम लागू तथ्य साफ़ बताया जाए।',
    '- हर प्रश्न और हल गणितीय रूप से जाँचा हो तथा मान्यताएँ और परिभाषा-क्षेत्र स्पष्ट हों।',
    '- हर बनाया प्रश्न ऊपर बताया ठीक ORIGINAL PRACTICE लेबल रखे।',
    '',
    'गणित प्रारूपण (MATHS FORMATTING):',
    'ऐसा साफ़ सामान्य-पाठ संकेतन लिखें जो Word या Google Docs में सही paste हो: a/b, x^2, sqrt(x), <=, >=, !=, pi, theta, integral और sum। शिक्षक स्रोत-कोड न माँगें तो कच्चे LaTeX सीमाचिह्न या कोड न दें।',
    '',
    'संदर्भ जाँच (CONTEXT CHECK):',
    'ऊपर का कोई इनपुट टोकन खाली हो तो ठीक वही जानकारी माँगें और रुकें। खाली टोकन के साथ उत्तर न दें और शिक्षक-नियंत्रित नियम का अनुमान न लगाएँ।',
    '',
    'बुनियादी नियम (GROUND RULES):',
    'आँकड़े, प्रतिशत, अंक-वितरण, cut-off, रैंक परिणाम, हल-समय के दावे, स्रोत-उद्धरण, प्रश्न की उत्पत्ति या पुरानी परीक्षा का डेटा न गढ़ें। दिए तथ्य, गणितीय निष्कर्ष और अपना सावधान अनुमान साफ़ अलग रखें।',
  ];
  assert(en.length === hi.length, `${spec.id}: translated line count differs`);
  en.forEach((line, index) => assert((line === '') === (hi[index] === ''), `${spec.id}: paragraph break differs at line ${index + 1}`));
  return { en: en.join('\n'), hi: hi.join('\n'), evidence: copy.evidence };
}

function cardCopy(spec) {
  if (spec.family === 'board-foundation') return {
    whatEn: `For Class 6–8 Boards and Foundation, ${spec.artifact}; it is built around ${spec.focus} and only teacher-supplied rules.`,
    whatHi: `कक्षा 6–8 बोर्ड और फ़ाउंडेशन के लिए ${spec.artifactHi}; विषय: ${spec.focusHi} (${spec.focus}), और आधार केवल शिक्षक के दिए नियम।`,
    howEn: 'Fill the class, context, scope, supplied rules, size, time and learner evidence. Paste the prompt into any AI chat, then review its compliance table before using the deliverable.',
    howHi: 'कक्षा, संदर्भ, विषय-सीमा, दिए नियम, आकार, समय और विद्यार्थी प्रमाण भरें। प्रॉम्प्ट किसी AI chat में paste करें, फिर सामग्री इस्तेमाल करने से पहले अनुपालन तालिका जाँचें।',
    usageEn: ['1. Collect the teacher-controlled paper or workflow rules.', '2. Fill every input without replacing evidence with memory.', '3. Paste the prompt into any AI chat.', '4. Check the compliance map and solve the questions yourself.', '5. Export the reviewed artifact in the stated format.'],
    usageHi: ['1. शिक्षक-नियंत्रित पेपर या कार्य-नियम इकट्ठे करें।', '2. प्रमाण की जगह याददाश्त लगाए बिना हर इनपुट भरें।', '3. प्रॉम्प्ट किसी AI chat में paste करें।', '4. अनुपालन मानचित्र जाँचें और प्रश्न स्वयं हल करें।', '5. समीक्षा की गई सामग्री बताए प्रारूप में export करें।'],
    fixEn: `If the result feels generic, reply: “Rebuild it around this exact mechanic: ${spec.mechanic}. Show the teacher-supplied rule beside every affected section.”`,
    fixHi: `परिणाम सामान्य लगे तो लिखें: “ठीक इस विधि पर फिर बनाएँ: ${spec.mechanicHi}। हर प्रभावित खंड के पास शिक्षक का दिया नियम दिखाएँ।”`,
    tag: 'Boards + Foundation',
  };
  if (spec.family === 'foundation-olympiad') return {
    whatEn: `A Classes 6–8 Foundation-to-Olympiad bridge for ${spec.focus}, delivered as ${spec.artifact}.`,
    whatHi: `कक्षा 6–8 के लिए ${spec.focusHi} (${spec.focus}) पर फ़ाउंडेशन-से-ओलंपियाड सेतु; परिणाम: ${spec.artifactHi}।`,
    howEn: 'Fill the entry skill, Olympiad reasoning target, question count, ladder, time and learner needs. Run the entry check before releasing later rungs.',
    howHi: 'शुरुआती कुशलता, ओलंपियाड तर्क-लक्ष्य, प्रश्न-संख्या, सीढ़ी, समय और विद्यार्थी की ज़रूरत भरें। आगे के पायदान देने से पहले शुरुआती जाँच चलाएँ।',
    usageEn: ['1. Name one secure Foundation starting skill.', '2. Choose one non-routine Olympiad reasoning target.', '3. Paste the completed prompt into any AI chat.', '4. Check every ORIGINAL PRACTICE question and hint.', '5. Release the ladder one rung at a time.'],
    usageHi: ['1. फ़ाउंडेशन की एक पक्की शुरुआती कुशलता बताएँ।', '2. ओलंपियाड का एक गैर-रूटीन तर्क-लक्ष्य चुनें।', '3. पूरा प्रॉम्प्ट किसी AI chat में paste करें।', '4. हर ORIGINAL PRACTICE प्रश्न और संकेत जाँचें।', '5. सीढ़ी एक बार में एक पायदान दें।'],
    fixEn: `If it only makes arithmetic harder, reply: “Keep the numbers age-appropriate and use this reasoning change instead: ${spec.mechanic}.”`,
    fixHi: `यदि केवल गणना कठिन हुई हो, तो लिखें: “संख्याएँ उम्र-अनुरूप रखें और इसकी जगह यह तर्क-बदलाव लें: ${spec.mechanicHi}।”`,
    tag: 'Foundation → Olympiad',
  };
  if (spec.family === 'foundation-only') return {
    whatEn: `A Foundation (Classes 6–8) intervention for ${spec.focus}, delivered as ${spec.artifact}.`,
    whatHi: `कक्षा 6–8 फ़ाउंडेशन के लिए ${spec.focusHi} (${spec.focus}) पर सुधार-कार्य; परिणाम: ${spec.artifactHi}।`,
    howEn: 'Fill the class, topic, observed evidence, time, learner needs and measurable success criterion. Use the output only after checking that each response follows the supplied evidence.',
    howHi: 'कक्षा, विषय, देखा प्रमाण, समय, विद्यार्थी की ज़रूरत और मापने योग्य सफलता-मानदंड भरें। हर उपाय के दिए प्रमाण से जुड़ने की जाँच के बाद ही सामग्री इस्तेमाल करें।',
    usageEn: ['1. Paste one anonymised observation or error.', '2. Define an observable success criterion.', '3. Paste the completed prompt into any AI chat.', '4. Check the diagnosis against the original evidence.', '5. Use the next-lesson decision rule after the mastery check.'],
    usageHi: ['1. एक गुमनाम अवलोकन या त्रुटि paste करें।', '2. दिखाई देने योग्य सफलता-मानदंड तय करें।', '3. पूरा प्रॉम्प्ट किसी AI chat में paste करें।', '4. मूल प्रमाण से निदान मिलाएँ।', '5. दक्षता-जाँच के बाद अगले पाठ का निर्णय-नियम अपनाएँ।'],
    fixEn: `If the intervention treats every error alike, reply: “Re-diagnose it using this exact mechanic: ${spec.mechanic}. Cite the supplied evidence for each move.”`,
    fixHi: `यदि हर त्रुटि का एक जैसा उपाय मिले, तो लिखें: “ठीक इस विधि से फिर निदान करें: ${spec.mechanicHi}। हर कदम के लिए दिया प्रमाण बताएँ।”`,
    tag: 'Foundation workflow',
  };
  return {
    whatEn: `A genuine JEE Main + JEE Advanced dual-lane workflow for ${spec.focus}, delivered as ${spec.artifact}.`,
    whatHi: `${spec.focusHi} (${spec.focus}) पर वास्तविक JEE Main + JEE Advanced दो-स्तरीय कार्य; परिणाम: ${spec.artifactHi}।`,
    howEn: 'Fill the mathematics scope, teacher-supplied question and marking rules, time, evidence and difficulty range. Provide any special pasted data the prompt requests; never let the AI infer it.',
    howHi: 'गणित विषय-सीमा, शिक्षक के दिए प्रश्न और अंकन नियम, समय, प्रमाण और कठिनाई-सीमा भरें। माँगा गया विशेष डेटा paste करें; AI को उसका अनुमान न लगाने दें।',
    usageEn: ['1. Supply the governing question and marking rules.', '2. Add anonymised evidence or the stated planning goal.', '3. Paste the completed prompt into any AI chat.', '4. Solve and audit every ORIGINAL PRACTICE item.', '5. Use the review to choose one controllable next action.'],
    usageHi: ['1. लागू प्रश्न और अंकन नियम दें।', '2. गुमनाम प्रमाण या बताया योजना-लक्ष्य जोड़ें।', '3. पूरा प्रॉम्प्ट किसी AI chat में paste करें।', '4. हर ORIGINAL PRACTICE प्रश्न हल करके जाँचें।', '5. समीक्षा से अगला एक नियंत्रित कदम चुनें।'],
    fixEn: `If the lanes differ only by longer calculation, reply: “Rebuild the Advanced lane with this dependency change: ${spec.mechanic}. Preserve the Main concept core.”`,
    fixHi: `यदि दोनों स्तरों में केवल लंबी गणना का अंतर हो, तो लिखें: “Advanced स्तर को इस निर्भरता-बदलाव से फिर बनाएँ: ${spec.mechanicHi}। Main का मुख्य विचार बनाए रखें।”`,
    tag: 'Main + Advanced',
  };
}

const specs = JSON.parse(readFileSync(SPEC_FILE, 'utf8'));
const live = parseData(readFileSync(DATA_FILE, 'utf8'));
assert(Array.isArray(specs) && specs.length === 93, `expected 93 specs, found ${specs.length}`);
for (const [family, expected] of Object.entries(familyCounts)) {
  assert(specs.filter(spec => spec.family === family).length === expected, `${family}: expected ${expected}`);
}

const liveTitles = new Set();
const liveSlugs = new Set();
const expectedBySlug = new Map(specs.map(spec => [slugify(spec.title), spec.title.trim().toLowerCase()]));
for (const category of live.categories) for (const prompt of category.prompts) {
  if (expectedBySlug.has(prompt.slug)) {
    assert(prompt.title.trim().toLowerCase() === expectedBySlug.get(prompt.slug), `integrated segment slug/title mismatch: ${prompt.slug}`);
    continue;
  }
  liveTitles.add(prompt.title.trim().toLowerCase());
  if (prompt.slug) liveSlugs.add(prompt.slug);
}
const generatedTitles = new Set();
const generatedSlugs = new Set();
const byFamily = new Map(Object.keys(familyCounts).map(family => [family, []]));
const hindi = [];
const entries = [];

for (const spec of specs) {
  assert(categoryDefs[spec.family], `${spec.id}: unknown family`);
  for (const field of ['id', 'title', 'titleHi', 'focus', 'focusHi', 'mechanic', 'mechanicHi', 'artifact', 'artifactHi', 'fmt', 'aud']) {
    assert(typeof spec[field] === 'string' && spec[field].trim(), `${spec.id || 'spec'}: missing ${field}`);
  }
  assert(allowedFormats.has(spec.fmt) && spec.fmt !== 'image' && spec.fmt !== 'links' && spec.fmt !== 'text', `${spec.id}: unsuitable output format`);
  assert(allowedAudiences.has(spec.aud), `${spec.id}: invalid audience`);
  const titleKey = spec.title.trim().toLowerCase();
  assert(!liveTitles.has(titleKey), `${spec.id}: title duplicates live data: ${spec.title}`);
  assert(!generatedTitles.has(titleKey), `${spec.id}: duplicate generated title`);
  generatedTitles.add(titleKey);
  const slug = slugify(spec.title);
  assert(slug && !liveSlugs.has(slug) && !generatedSlugs.has(slug), `${spec.id}: duplicate slug ${slug}`);
  generatedSlugs.add(slug);

  const pair = buildPromptPair(spec);
  const card = cardCopy(spec);
  const exams = spec.family === 'board-foundation' ? ['boards', 'foundation']
    : spec.family === 'foundation-olympiad' ? ['foundation', 'olympiad']
      : spec.family === 'foundation-only' ? ['foundation'] : ['jee-main', 'jee-advanced'];
  const prompt = {
    title: spec.title,
    tag: card.tag,
    needsImage: false,
    makesImage: false,
    whatYouGet: card.whatEn,
    bestTool: 'Any AI chat (ChatGPT, Claude, Gemini)',
    worksOnFree: 'Yes — works on any free AI chat',
    howToUse: card.howEn,
    effectiveUsage: card.usageEn,
    commonFix: card.fixEn,
    promptText: pair.en,
    slug,
    exams,
    aud: spec.aud,
    added: ADDED,
    fmt: spec.fmt,
  };
  const hi = {
    title: spec.titleHi,
    whatYouGet: card.whatHi,
    howToUse: card.howHi,
    effectiveUsage: card.usageHi,
    commonFix: card.fixHi,
    promptText: pair.hi,
  };
  byFamily.get(spec.family).push(prompt);
  hindi.push({ title: spec.title, hi });
  entries.push({ slug, segments: exams, evidence: pair.evidence });

  assert(JSON.stringify(placeholders(pair.en)) === JSON.stringify(placeholders(pair.hi)), `${spec.id}: placeholder drift`);
  assert(devanagariCount(pair.hi) >= 500, `${spec.id}: Hindi prompt too thin`);
  assert(devanagariCount(hi.title) >= 2, `${spec.id}: Hindi title too thin`);
  assert(pair.en.includes('ORIGINAL PRACTICE — not an authentic past question'), `${spec.id}: ORIGINAL PRACTICE rule missing`);
  assert(pair.hi.includes('ORIGINAL PRACTICE — not an authentic past question'), `${spec.id}: Hindi ORIGINAL PRACTICE rule missing`);
  assert(!/https?:\/\//i.test(JSON.stringify({ prompt, hi })), `${spec.id}: unexpected URL; these are deliberately non-tool-linked`);
  assert(!/\bPYQ\b/i.test(JSON.stringify({ prompt, hi })), `${spec.id}: PYQ claim found`);
  assert(!/latest exam pattern|current exam pattern|guaranteed rank|rank guarantee|predict(?:ed|ion)? rank/i.test(JSON.stringify({ prompt, hi })), `${spec.id}: fabrication-bait wording found`);
  assert(exams.every(segment => entries.at(-1).segments.includes(segment)), `${spec.id}: manifest facet mismatch`);
  if (exams.includes('boards')) assert(/Boards/.test(prompt.title + prompt.whatYouGet), `${spec.id}: Boards evidence missing`);
  if (exams.includes('foundation')) assert(/Foundation/.test(prompt.title + prompt.whatYouGet), `${spec.id}: Foundation evidence missing`);
  if (exams.includes('olympiad')) assert(/Olympiad/.test(prompt.title + prompt.whatYouGet), `${spec.id}: Olympiad evidence missing`);
  if (exams.includes('jee-main')) assert(/JEE Main/.test(prompt.title + prompt.whatYouGet), `${spec.id}: JEE Main evidence missing`);
  if (exams.includes('jee-advanced')) assert(/JEE Advanced/.test(prompt.title + prompt.whatYouGet), `${spec.id}: JEE Advanced evidence missing`);
}

assert(byFamily.get('board-foundation').every(prompt => prompt.exams.join('|') === 'boards|foundation'), 'Boards + Foundation family facet drift');
assert(byFamily.get('foundation-olympiad').every(prompt => prompt.exams.join('|') === 'foundation|olympiad'), 'Foundation + Olympiad family facet drift');
assert(byFamily.get('foundation-only').every(prompt => prompt.exams.join('|') === 'foundation'), 'Foundation-only family facet drift');
assert(byFamily.get('jee-dual').every(prompt => prompt.exams.join('|') === 'jee-main|jee-advanced'), 'JEE dual family facet drift');
assert(byFamily.get('jee-dual').find(prompt => prompt.slug.includes('pasted-shift-data-analysis')).promptText.includes('[PASTED ANONYMISED SHIFT-WISE DATA]'), 'shift analysis is not pasted-data bound');
assert(byFamily.get('jee-dual').find(prompt => prompt.slug.includes('rank-band-goal-planner')).promptText.includes('never as a prediction, probability or guarantee'), 'rank goal is not safely framed');
assert(byFamily.get('jee-dual').find(prompt => prompt.slug.includes('multi-correct-partial-marking')).promptText.includes('[TEACHER-SUPPLIED PARTIAL-MARKING RULE]'), 'partial marking is not teacher-rule bound');
assert(byFamily.get('jee-dual').find(prompt => prompt.slug.includes('teacher-supplied-pattern-paper')).promptText.includes('Use only question types, timing and marking rules supplied by the teacher'), 'paper pattern is not teacher-rule bound');

const protectedIdentity = String.fromCharCode(73, 110, 100, 114, 97, 106, 101, 101, 116, 32, 89, 97, 100, 97, 118);
const allGenerated = JSON.stringify({ specs, byFamily: [...byFamily], hindi, entries });
assert(!allGenerated.includes(protectedIdentity), 'protected identity found');

const categories = Object.entries(categoryDefs).map(([family, def]) => ({ ...def, prompts: byFamily.get(family) }));
const segmentCounts = entries.reduce((counts, entry) => {
  entry.segments.forEach(segment => { counts[segment] = (counts[segment] || 0) + 1; });
  return counts;
}, {});
assert(segmentCounts.boards === 16, `Boards manifest count ${segmentCounts.boards}`);
assert(segmentCounts.foundation === 56, `Foundation manifest count ${segmentCounts.foundation}`);
assert(segmentCounts['jee-main'] === 37, `JEE Main manifest count ${segmentCounts['jee-main']}`);
assert(segmentCounts['jee-advanced'] === 37, `JEE Advanced manifest count ${segmentCounts['jee-advanced']}`);
assert(segmentCounts.olympiad === 36, `Olympiad manifest count ${segmentCounts.olympiad}`);

const output = { version: '2026-07-17-phase2-segments', count: 93, categories };
const manifest = { entries };
const qa = {
  pass: true,
  generatedAt: ADDED,
  counts: { prompts: 93, hindi: hindi.length, families: familyCounts, segments: segmentCounts },
  checks: [
    '93 unique titles and slugs; no collision with the live 848-prompt corpus',
    'complete production schema including fmt, exams, aud and added',
    'exact English/Hindi placeholder parity and matching paragraph breaks',
    'full Hindi prompt text with natural teacher register and structural labels',
    'every generated question requires the exact ORIGINAL PRACTICE label',
    'teacher-supplied pattern rules; pasted-only shift and attempt data',
    'rank band framed as a goal, never a prediction or guarantee',
    'Advanced multi-correct scoring bound to a teacher-supplied partial-marking rule',
    'no URLs or tool contracts; no authentic-PYQ, year, shift or source claims',
    'manifest counts Boards 16, Foundation 56, JEE Main 37, JEE Advanced 37, Olympiad 36',
  ],
};

writeFileSync(PROMPTS_OUT, `${JSON.stringify(output, null, 2)}\n`);
writeFileSync(HINDI_OUT, `${JSON.stringify(hindi, null, 2)}\n`);
writeFileSync(MANIFEST_OUT, `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(QA_OUT, `${JSON.stringify(qa, null, 2)}\n`);
console.log(`PASS: generated ${output.count} segment prompts and ${hindi.length} Hindi merge records`);
console.log(`families: ${Object.entries(familyCounts).map(([key, value]) => `${key}=${value}`).join(' | ')}`);
console.log(`segments: ${Object.entries(segmentCounts).map(([key, value]) => `${key}=${value}`).join(' | ')}`);
