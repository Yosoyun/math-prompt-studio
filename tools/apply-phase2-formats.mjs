// AUD-F / P2/F1 + P2/F3: classify every prompt by its primary deliverable and
// add a real output instruction before moving a convertible workflow out of text.
//
// Dry run (no files written):
//   node tools/apply-phase2-formats.mjs --dry-run
// Apply the generated-data migration and emit the Hindi merge input + manifest:
//   node tools/apply-phase2-formats.mjs
//
// data/prompts.js is generated data. Never edit it by hand.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = resolve(ROOT, 'data/prompts.js');
const CONTRACT_FILE = resolve(ROOT, '_handoff/tool-link-contract.txt');
const HINDI_FILE = resolve(ROOT, '_handoff/phase2-format-hindi.json');
const MANIFEST_FILE = resolve(ROOT, '_handoff/phase2-format-manifest.json');
const DATA_MARKER = 'window.PROMPT_DATA =';
const FORMAT_MARKER = 'FORMAT THE OUTPUT — PRIMARY DELIVERABLE:';
const HINDI_FORMAT_MARKER = 'आउटपुट का प्रारूप — मुख्य सामग्री (FORMAT THE OUTPUT — PRIMARY DELIVERABLE):';
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const ALLOWED_FORMATS = new Set(['pdf-print', 'doc', 'ppt', 'image', 'links', 'interactive', 'text']);
const CONTRACT = readFileSync(CONTRACT_FILE, 'utf8');

const BLOCKS = {
  'pdf-print': {
    en: `${FORMAT_MARKER}\nReturn the complete material as a clean, print-ready A4 handout that can be pasted into Word or Google Docs and saved as PDF. Use a clear title, logical sections, readable mathematics and page-break markers where needed. Keep student material separate from the answer key or teacher notes.`,
    hi: `${HINDI_FORMAT_MARKER}\nपूरी सामग्री को साफ़, प्रिंट के लिए तैयार A4 handout के रूप में दें, जिसे Word या Google Docs में paste करके PDF के रूप में सहेजा जा सके। स्पष्ट शीर्षक, क्रमबद्ध खंड, पढ़ने योग्य गणित और जहाँ ज़रूरी हो वहाँ page-break चिह्न रखें। छात्र सामग्री को उत्तर-कुंजी या शिक्षक टिप्पणियों से अलग रखें।`,
  },
  doc: {
    en: `${FORMAT_MARKER}\nReturn one complete, editable document ready to paste into Word or Google Docs. Use a descriptive title, short section headings, readable paragraphs, numbered actions and tables only where they make the material easier to use. Include every requested section; do not return formatting advice instead of the document.`,
    hi: `${HINDI_FORMAT_MARKER}\nएक पूरा, संपादन योग्य दस्तावेज़ (editable document) दें, जिसे सीधे Word या Google Docs में paste किया जा सके। वर्णनात्मक शीर्षक, छोटे खंड-शीर्षक, पढ़ने योग्य अनुच्छेद, क्रमांकित कार्य और केवल उपयोगी होने पर तालिकाएँ रखें। माँगा गया हर खंड शामिल करें; दस्तावेज़ की जगह केवल formatting की सलाह न दें।`,
  },
  ppt: {
    en: `${FORMAT_MARKER}\nReturn a complete slide-by-slide deck ready for PowerPoint, Google Slides, Canva or Gamma. For every slide write “Slide N — Title”, three to five concise on-slide points and a separate speaker-notes line. Begin with a title slide and finish with a recap or action slide.`,
    hi: `${HINDI_FORMAT_MARKER}\nPowerPoint, Google Slides, Canva या Gamma के लिए तैयार, स्लाइड-दर-स्लाइड (slide-by-slide) पूरा deck दें। हर slide के लिए “Slide N — Title”, slide पर रखने योग्य तीन से पाँच संक्षिप्त बिंदु और अलग speaker-notes पंक्ति लिखें। शुरुआत title slide से और अंत पुनरावलोकन या कार्य slide से करें।`,
  },
  interactive: {
    en: `${FORMAT_MARKER}\nRun this as an interactive classroom or tutoring session, not as one static answer. Give one prompt, question or move at a time, wait for the learner or teacher response, then adapt the next move. Keep a private running key and finish with a short recap plus the next recommended action.`,
    hi: `${HINDI_FORMAT_MARKER}\nइसे एक स्थिर उत्तर की बजाय इंटरैक्टिव कक्षा या मार्गदर्शन सत्र (interactive classroom or tutoring session) के रूप में चलाएँ। एक समय में केवल एक prompt, प्रश्न या कदम दें, छात्र या शिक्षक के जवाब की प्रतीक्षा करें, फिर अगला कदम उसी के अनुसार बदलें। एक निजी चलती उत्तर-कुंजी रखें और अंत में छोटा पुनरावलोकन तथा अगला सुझाया गया कार्य दें।`,
  },
};

const BASE_PDF_CATEGORIES = new Set([
  'question-papers', 'worksheets', 'dpp', 'mock-sample-papers', 'formula-sheets',
  'notes-handouts', 'latex-pdf-sets',
]);
const BASE_DOC_CATEGORIES = new Set(['lesson-plans', 'book-writing', 'classroom-admin']);

const UPGRADE_PDF_CATEGORIES = new Set([
  'quiz-mcq', 'competitive-exams', 'gifted-enrichment', 'grading-rubrics-feedback',
]);
const UPGRADE_DOC_CATEGORIES = new Set([
  'error-analysis', 'concept-explainers', 'history-stories', 'real-world-applications',
  'projects-activities', 'remedial-support', 'exam-strategy-motivation',
  'parent-student-comms', 'grading-rubrics-feedback', 'classroom-admin', 'video-scripts',
]);

function fail(message) {
  throw new Error(message);
}

function parseData(source) {
  const index = source.indexOf(DATA_MARKER);
  if (index < 0) fail('window.PROMPT_DATA marker not found');
  return JSON.parse(source.slice(index + DATA_MARKER.length, source.lastIndexOf(';')));
}

function cardEvidence(category, prompt) {
  return [category.category, category.categoryTitle, prompt.title, prompt.tag, prompt.whatYouGet]
    .filter(Boolean).join(' ').toLowerCase();
}

function classifyBase(category, prompt) {
  const evidence = cardEvidence(category, prompt);

  // needsImage describes an input. Only makesImage proves that the deliverable is an image.
  if (prompt.makesImage === true) return { fmt: 'image', reason: 'makesImage=true' };
  if (String(prompt.promptText).includes(CONTRACT)) return { fmt: 'links', reason: 'verbatim tool-link contract' };

  if (category.category === 'presentations' || /\b(?:slide deck|slides?|presentation|powerpoint|ppt)\b/.test(evidence)) {
    return { fmt: 'ppt', reason: 'explicit deck/slide deliverable' };
  }

  if (BASE_PDF_CATEGORIES.has(category.category) || /\b(?:print-ready|printable|a4|question paper|exam paper|worksheet|handout|booklet|pdf)\b/.test(evidence)) {
    return { fmt: 'pdf-print', reason: 'explicit paper/worksheet/print deliverable' };
  }

  if (BASE_DOC_CATEGORIES.has(category.category) || /\b(?:editable document|word document|google docs|formal letter|written report)\b/.test(evidence)) {
    return { fmt: 'doc', reason: 'explicit editable document deliverable' };
  }

  if (/\b(?:interactive session|live session|socratic tutor|tutoring session|one question at a time|role-play|classroom game|oral viva|simulation-led)\b/.test(evidence)) {
    return { fmt: 'interactive', reason: 'explicit turn-by-turn session' };
  }

  return { fmt: 'text', reason: 'no stronger primary-output evidence' };
}

function upgradeTarget(category, prompt) {
  const evidence = cardEvidence(category, prompt);

  if (/\b(?:one question at a time|interactive|socratic|tutor|role-play|debate|oral viva|quick-fire|classroom game|escape room|live drill|practice session)\b/.test(evidence) ||
      (category.category === 'games-gamification' && /\b(?:game|challenge|battle|bingo|relay|hunt|tournament)\b/.test(evidence))) {
    return { fmt: 'interactive', reason: 'workflow can genuinely run turn by turn' };
  }

  if (UPGRADE_PDF_CATEGORIES.has(category.category) ||
      /\b(?:questions?|exercise|practice set|problem set|quiz|mcq|flashcards?|test|paper|worksheet|dpp|rubric|checklist|revision sheet|answer key|formula sheet|cheat sheet)\b/.test(evidence)) {
    return { fmt: 'pdf-print', reason: 'structured learner material can be delivered as an A4 handout' };
  }

  if (UPGRADE_DOC_CATEGORIES.has(category.category) ||
      /\b(?:plan|analysis|feedback|report|notes?|guide|script|story|letter|message|email|summary|record|register|logbook|table|rubric|blueprint|schedule|tracker|policy|brief)\b/.test(evidence)) {
    return { fmt: 'doc', reason: 'structured teacher material can be delivered as an editable document' };
  }

  if (/\b(?:explain|concept|intuition|visualise|visualize|mind map|timeline)\b/.test(evidence)) {
    return { fmt: 'ppt', reason: 'explanatory sequence can be delivered as a slide deck' };
  }

  return null;
}

function insertBeforeContractOrSafety(text, block) {
  if (text.includes(FORMAT_MARKER) || text.includes(HINDI_FORMAT_MARKER)) return text;

  if (text.endsWith(CONTRACT)) {
    return `${text.slice(0, -CONTRACT.length).trimEnd()}\n\n${block}\n\n${CONTRACT}`;
  }

  const safetyLabels = ['MATHS FORMATTING:', 'CONTEXT CHECK:', 'GROUND RULES', 'SIGNATURE:'];
  const lines = text.split('\n');
  let boundary = lines.findIndex(line => safetyLabels.some(label => line.includes(label)));
  if (boundary < 0) return `${text.trimEnd()}\n\n${block}`;
  while (boundary > 0 && lines[boundary - 1] === '') boundary--;
  return [...lines.slice(0, boundary), '', ...block.split('\n'), '', ...lines.slice(boundary)].join('\n');
}

function placeholders(text) {
  return (String(text).match(/\[[^\]\n]{1,80}\]/g) || []).sort().join('|');
}

function countFormats(entries) {
  return Object.fromEntries([...ALLOWED_FORMATS].map(fmt => [fmt, entries.filter(entry => entry.fmt === fmt).length]));
}

function serializeData(data, source) {
  const markerIndex = source.indexOf(DATA_MARKER);
  const existingBanner = source.slice(0, markerIndex);
  const total = data.categories.reduce((sum, category) => sum + category.prompts.length, 0);
  const banner = existingBanner.startsWith('/* Maths Prompt Studio data')
    ? `/* Maths Prompt Studio data - ${total} prompts across ${data.categories.length} categories. v${data.version || ''}. Auto-generated; do not edit by hand. */\n`
    : existingBanner;
  return `${banner}${DATA_MARKER} ${JSON.stringify(data)};\n`;
}

function transform(input) {
  const data = structuredClone(input);
  const manifest = [];
  const hindiBatch = [];

  for (const category of data.categories) {
    for (const prompt of category.prompts) {
      const beforePromptText = prompt.promptText;
      const hasReviewedFormat = ALLOWED_FORMATS.has(prompt.fmt);
      const base = hasReviewedFormat
        ? { fmt: prompt.fmt, reason: 'existing reviewed format' }
        : classifyBase(category, prompt);
      let selected = base;
      let upgraded = false;

      if (!hasReviewedFormat && base.fmt === 'text') {
        const target = upgradeTarget(category, prompt);
        if (target) {
          selected = target;
          upgraded = true;
        }
      }

      if (!ALLOWED_FORMATS.has(selected.fmt)) fail(`${prompt.title}: invalid format ${selected.fmt}`);
      prompt.fmt = selected.fmt;

      if (upgraded) {
        if (!BLOCKS[selected.fmt]) fail(`${prompt.title}: missing output block for ${selected.fmt}`);
        if (!prompt.hi || typeof prompt.hi.promptText !== 'string') fail(`${prompt.title}: complete Hindi translation required before format upgrade`);
        prompt.promptText = insertBeforeContractOrSafety(prompt.promptText, BLOCKS[selected.fmt].en);
        const hindiPromptText = insertBeforeContractOrSafety(prompt.hi.promptText, BLOCKS[selected.fmt].hi);
        if (placeholders(prompt.promptText) !== placeholders(hindiPromptText)) fail(`${prompt.title}: placeholder mismatch after format upgrade`);
        const englishLineDelta = prompt.promptText.split('\n').length - beforePromptText.split('\n').length;
        const hindiLineDelta = hindiPromptText.split('\n').length - prompt.hi.promptText.split('\n').length;
        if (englishLineDelta !== 0 && englishLineDelta !== hindiLineDelta) fail(`${prompt.title}: English/Hindi line structure diverged during format upgrade`);
        if (!prompt.promptText.endsWith(CONTRACT) && beforePromptText.endsWith(CONTRACT)) fail(`${prompt.title}: tool-link contract moved or damaged`);

        // Leave prompt.hi untouched here. Only the unchanged merge-hindi.mjs QA gate
        // may write this proposed translation into generated prompt data.
        if (!prompt.hi.promptText.includes(HINDI_FORMAT_MARKER)) {
          hindiBatch.push({
            title: prompt.title,
            hi: {
              title: prompt.hi.title,
              whatYouGet: prompt.hi.whatYouGet,
              howToUse: prompt.hi.howToUse,
              effectiveUsage: prompt.hi.effectiveUsage,
              commonFix: prompt.hi.commonFix,
              promptText: hindiPromptText,
            },
          });
        }
      }

      manifest.push({
        title: prompt.title,
        slug: prompt.slug,
        category: category.category,
        fmt: prompt.fmt,
        upgraded,
        reason: upgraded ? `AUD-F content upgrade: ${selected.reason}` : `AUD-F classification: ${selected.reason}`,
      });
    }
  }

  if (!String(data.version).includes('phase2-formats')) data.version = `${data.version || '2026-07-18'}-phase2-formats`;
  return { data, manifest, hindiBatch };
}

function validateResult(sourceData, result) {
  const sourcePrompts = sourceData.categories.flatMap(category => category.prompts);
  const outputPrompts = result.data.categories.flatMap(category => category.prompts);
  if (sourcePrompts.length !== outputPrompts.length) fail('prompt count changed');
  if (result.manifest.length !== outputPrompts.length) fail('manifest coverage mismatch');
  if (new Set(result.manifest.map(item => item.slug)).size !== outputPrompts.length) fail('manifest slugs are not unique');
  if (outputPrompts.some(prompt => !ALLOWED_FORMATS.has(prompt.fmt))) fail('format coverage is incomplete');

  const changedBodies = outputPrompts.filter((prompt, index) => prompt.promptText !== sourcePrompts[index].promptText);
  const pendingHindi = outputPrompts.filter((prompt, index) =>
    prompt.promptText.includes(FORMAT_MARKER) && !sourcePrompts[index].hi?.promptText?.includes(HINDI_FORMAT_MARKER));
  if (pendingHindi.length !== result.hindiBatch.length) fail('Hindi merge payload does not cover every pending format translation');
  const batchTitles = new Set(result.hindiBatch.map(item => item.title));
  if (changedBodies.some(prompt => !batchTitles.has(prompt.title))) fail('Hindi merge payload misses a changed English body');
  if (changedBodies.some(prompt => !prompt.promptText.includes(FORMAT_MARKER))) fail('changed body lacks the reviewed output block');
  const contractBefore = sourcePrompts.filter(prompt => prompt.promptText.endsWith(CONTRACT)).length;
  const contractAfter = outputPrompts.filter(prompt => prompt.promptText.endsWith(CONTRACT)).length;
  if (contractBefore !== contractAfter) fail(`tool-link contract endings changed: ${contractBefore} -> ${contractAfter}`);

  const counts = countFormats(result.manifest);
  const textShare = counts.text / outputPrompts.length;
  if (textShare > 0.20) fail(`text remains ${(textShare * 100).toFixed(1)}%; AUD-F requires <=20%`);

  const rerun = transform(result.data);
  if (!isDeepStrictEqual(rerun.data, result.data)) fail('migration is not idempotent');
  if (rerun.hindiBatch.length !== result.hindiBatch.length) fail('Hindi payload is not idempotent');
  return { counts, textShare, changedBodies: changedBodies.length, pendingHindi: pendingHindi.length, contractCount: contractAfter };
}

const source = readFileSync(DATA_FILE, 'utf8');
const sourceData = parseData(source);
const result = transform(sourceData);
const stats = validateResult(sourceData, result);
const baseManifest = sourceData.categories.flatMap(category => category.prompts.map(prompt => {
  const base = classifyBase(category, prompt);
  return { fmt: base.fmt };
}));
const baseCounts = countFormats(baseManifest);

console.log(`AUD-F format migration ${DRY_RUN ? 'DRY RUN' : 'APPLIED'}: ${result.manifest.length} prompts`);
console.log(`Conservative classification: ${JSON.stringify(baseCounts)}`);
console.log(`After content upgrades:       ${JSON.stringify(stats.counts)}`);
console.log(`English bodies upgraded this run: ${stats.changedBodies} | pending Hindi merge entries: ${stats.pendingHindi}`);
console.log(`Final text share: ${(stats.textShare * 100).toFixed(1)}% | exact tool-link endings preserved: ${stats.contractCount}`);

for (const fmt of ALLOWED_FORMATS) {
  const sample = result.manifest.filter(item => item.fmt === fmt).slice(0, 3)
    .map(item => `${item.title}${item.upgraded ? ' [upgraded]' : ''}`);
  console.log(`${fmt}: ${sample.join(' | ') || '(none)'}`);
}

const riskSamples = result.manifest.filter(item => item.upgraded && ['ppt', 'interactive'].includes(item.fmt)).slice(0, 12);
console.log(`Review-sensitive upgrades (ppt/interactive): ${riskSamples.length ? riskSamples.map(item => item.title).join(' | ') : '(none)'}`);

const upgradesByCategory = Object.entries(result.manifest.filter(item => item.upgraded).reduce((summary, item) => {
  summary[item.category] ||= {};
  summary[item.category][item.fmt] = (summary[item.category][item.fmt] || 0) + 1;
  return summary;
}, {}));
console.log(`Upgrade distribution: ${upgradesByCategory.map(([category, counts]) => `${category}=${Object.entries(counts).map(([fmt, count]) => `${fmt}:${count}`).join(',')}`).join(' | ')}`);
if (VERBOSE) {
  for (const item of result.manifest.filter(entry => entry.upgraded)) {
    console.log(`UPGRADE\t${item.fmt}\t${item.category}\t${item.title}\t${item.reason}`);
  }
}

if (DRY_RUN) {
  console.log(`No files written. Apply mode would write ${DATA_FILE}, ${HINDI_FILE}, and ${MANIFEST_FILE}.`);
} else {
  writeFileSync(DATA_FILE, serializeData(result.data, source));
  writeFileSync(HINDI_FILE, `${JSON.stringify(result.hindiBatch, null, 2)}\n`);
  writeFileSync(MANIFEST_FILE, `${JSON.stringify({
    audit: 'AUD-F',
    generated: new Date().toISOString(),
    total: result.manifest.length,
    conservativeCounts: baseCounts,
    finalCounts: stats.counts,
    textShare: Number(stats.textShare.toFixed(4)),
    upgradedBodies: stats.changedBodies,
    prompts: result.manifest,
  }, null, 2)}\n`);
  console.log(`Wrote generated prompt data, Hindi merge input, and ${MANIFEST_FILE}.`);
  console.log(`Next: node tools/merge-hindi.mjs ${HINDI_FILE}`);
}
