// v3 quality upgrade: add 5 flagship analytical prompts + give every TEXT prompt the pro-grade
// CONTEXT CHECK + GROUND RULES + branded footer (link = this site).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIG = 'Indrajeet Yadav';
const LINK = 'https://yosoyun.github.io/math-prompt-studio/';

const CONTEXT_CHECK = 'CONTEXT CHECK: Before you begin, if any [SQUARE-BRACKET] above is still empty, or I have not given you the question / photo / data you need, ask me for exactly those and wait - never guess, and never answer with the placeholder text still in brackets.';
const GROUND_RULES = 'GROUND RULES (always follow): Do not invent statistics, percentages, marks distributions you were not given, exam cut-offs, solve-time figures, NCERT or textbook page/line numbers, citations, or historical exam data. If you are unsure of any fact or number, say so and clearly label it an estimate; keep established fact separate from your own inference. Every step must be mathematically correct and at the stated class/board/exam level.';
const FOOTER = 'SIGNATURE: End your ENTIRE response with exactly this footer block (keep the lines and symbols):\n' +
  '━━━━━━━━━━━━━━━━\n' +
  '✍️ Crafted with prompts by ' + SIG + ' · Maths Faculty\n' +
  '🔗 Free tools & to reach me: ' + LINK + '\n' +
  'Questions, feedback or appreciation are always welcome.\n' +
  '━━━━━━━━━━━━━━━━';
const TAIL = '\n\n' + CONTEXT_CHECK + '\n\n' + GROUND_RULES + '\n\n' + FOOTER;

// truncate any existing trailing instruction region so the upgrade is idempotent
const MARKERS = [/\n[ \t]*CONTEXT CHECK\b/i, /\n[ \t]*GROUND RULES\b/i, /\n[ \t]*SIGNATURE\b/i,
  /\nPrepared by Indrajeet Yadav/i, /\nCompiled by Indrajeet Yadav/i, /\nChecked with Maths Prompt Studio/i,
  /\nCreated with the prompt collection/i];
function upgradeTail(text) {
  let cut = text.length;
  for (const re of MARKERS) { const m = text.search(re); if (m !== -1 && m < cut) cut = m; }
  return text.slice(0, cut).replace(/\s+$/, '') + TAIL;
}

const ex = s => s; // bodies authored clean already
const flagship = [
  { title: '10-Year Trend Analysis & Forecast (by Chapter)', tag: 'Exam analysis', needsImage: false, makesImage: false,
    whatYouGet: 'A 10-year weightage + sub-topic + question-archetype trend report for a chapter, with an honest, confidence-rated forecast.',
    bestTool: 'ChatGPT or Claude (turn on the free "thinking" mode if you have it)', worksOnFree: 'Yes - works on any free AI',
    howToUse: 'Name the chapter and the exam (JEE Main / Advanced) - get a full trend report and forecast.',
    effectiveUsage: ['Open ChatGPT or Claude.', 'Copy this prompt; set [CHAPTER] and [EXAM].', 'Send and read the 7-part report.', 'Use the Smart-Prep Verdict to plan revision.', 'Ask follow-ups like "show 3 more model Qs of archetype 2".'],
    commonFix: "If it states a count too confidently, reply: 'Mark every year-count as approximate and clearly separate established fact from your inference.'",
    promptText: ex(`ROLE: You are a JEE question-bank analyst who has dissected every JEE Main and Advanced paper for the last decade. You see the patterns setters return to, the archetypes that recur, and the slow drift in difficulty most students miss.

CONTEXT: Give me a 10-year trend analysis of [CHAPTER] for [EXAM: JEE Main or JEE Advanced] and a reasoned forecast for the next attempt.

IMPORTANT - be honest about certainty: where you reason from well-known historical patterns, say so; where a specific year's count is from memory and could be off, flag it as approximate. Frame predictions as probabilities, not promises.

DO THIS:
1. WEIGHTAGE TREND - typical number of questions/marks from this chapter per year, and whether it is rising, steady or falling. Note any syllabus-change years that shifted it.
2. SUB-TOPIC FREQUENCY - rank the chapter's sub-topics by how often they are tested; mark the perennial favourites vs the rare visitors.
3. QUESTION ARCHETYPES - the 4-6 recurring shapes of question (e.g. "find the value of k for which...", "number of solutions of...", "area bounded by..."). For each, give one representative model question, fully solved.
4. DIFFICULTY DRIFT - has it become harder, more application-based, more multi-concept? State the trend.
5. TRAP EVOLUTION - the classic traps setters keep reusing here.
6. FORECAST - 3-4 sub-topics most likely to appear next, each with a one-line REASON (cycle / recent emphasis / syllabus weight) and a confidence level (high / medium / low).
7. SMART-PREP VERDICT - the single highest-ROI thing to drill, and what is safe to deprioritise.

OUTPUT FORMAT: Weightage Trend -> Sub-topic Frequency (ranked) -> Archetypes (with solved model Qs) -> Difficulty Drift -> Trap Evolution -> Forecast (reasons + confidence) -> Smart-Prep Verdict.

QUALITY BAR: Clearly separate fact from inference. Model questions must be genuinely chapter-authentic and fully solved. Forecasts must carry reasons and honest confidence - no false precision.`) },

  { title: 'Most-Expected Questions This Year (by Chapter)', tag: 'Exam analysis', needsImage: false, makesImage: false,
    whatYouGet: 'A ranked set of the most likely exam questions for a chapter this year - each with a reason, a confidence level, and a full solution.',
    bestTool: 'ChatGPT or Claude', worksOnFree: 'Yes - works on any free AI',
    howToUse: 'Give the chapter, class and exam; get the most-probable questions with solved answers.',
    effectiveUsage: ['Open ChatGPT or Claude.', 'Copy this prompt; set [CHAPTER], [CLASS], [EXAM].', 'Send and review the ranked questions.', 'Each comes with a reason + confidence + full solution.', 'Ask "give 5 more of the high-confidence type".'],
    commonFix: "If a prediction feels like a guess, reply: 'For each, give the concrete reason it is likely and an honest confidence - drop any you cannot justify.'",
    promptText: ex(`ROLE: You are a veteran [EXAM: board / JEE / NEET] question setter and analyst who can tell which questions are most likely to appear this year and why.

CONTEXT: Predict the most-expected questions from [CHAPTER] for [CLASS/GRADE], [EXAM] this year.

IMPORTANT - honesty: base predictions on well-known patterns and the current syllabus, not invented data. Give each a confidence level and a real reason. Never claim false precision.

DO THIS:
1. List the 8-10 MOST LIKELY questions from this chapter, ranked by probability.
2. For each: (a) the question itself (exam-authentic wording), (b) a one-line REASON it is likely (recurring favourite / recent emphasis / high syllabus weight / pattern), (c) a confidence level (high / medium / low), and (d) a complete, correct solution.
3. Add a short "also revise" list of 3-4 outside-bet topics.
4. End with the single must-not-skip question for this chapter.

OUTPUT FORMAT: Ranked list (Question -> Reason -> Confidence -> Full Solution) -> Also revise -> Must-not-skip.

QUALITY BAR: Questions must be genuinely chapter-authentic and fully, correctly solved. Reasons must be concrete; confidence must be honest.`) },

  { title: 'Question Archetype Masterclass (by Chapter)', tag: 'Teaching gold', needsImage: false, makesImage: false,
    whatYouGet: 'The 5-7 recurring "shapes" of question in a chapter, each explained, with a fully solved model and a one-line how-to-spot-it.',
    bestTool: 'ChatGPT or Claude', worksOnFree: 'Yes - works on any free AI',
    howToUse: 'Name the chapter and exam; get every recurring question type with a solved model and method.',
    effectiveUsage: ['Open ChatGPT or Claude.', 'Copy this prompt; set [CHAPTER], [EXAM].', 'Send and study the archetypes.', 'Teach each "shape" + its go-to method.', 'Ask for "2 more practice Qs per archetype with answers".'],
    commonFix: "If a model answer skips steps, reply: 'Re-solve that one in full, numbered steps, and state the method name clearly.'",
    promptText: ex(`ROLE: You are a master [EXAM] teacher who teaches by ARCHETYPE - the recurring shapes of question - so students recognise and crack any variant instantly.

CONTEXT: Build an archetype masterclass for [CHAPTER] at [CLASS/GRADE] for [EXAM].

DO THIS:
1. Identify the 5-7 recurring question ARCHETYPES in this chapter (e.g. "find k such that...", "number of real roots of...", "area / length / locus of...").
2. For EACH archetype give: (a) a clear name, (b) "how to spot it" in one line, (c) the standard method / go-to approach, (d) ONE representative model question, fully and correctly solved with numbered steps, (e) the one trap students fall into for this shape.
3. End with a one-page "recognise -> method" cheat list mapping each archetype to its method.

OUTPUT FORMAT: For each archetype: Name -> How to spot it -> Method -> Solved model -> Trap. Then the cheat list.

QUALITY BAR: Archetypes must be genuinely the ones that recur in this chapter; every model question fully and correctly solved at the stated level.`) },

  { title: "Topper's Final-45-Days Strategy (by Exam)", tag: 'Strategy', needsImage: false, makesImage: false,
    whatYouGet: 'A realistic, high-ROI day-wise revision and mock plan for the last 45 days before an exam.',
    bestTool: 'ChatGPT or Claude', worksOnFree: 'Yes - works on any free AI',
    howToUse: 'Give the exam, the subjects and the weak areas; get a week-by-week final-stretch plan.',
    effectiveUsage: ['Open ChatGPT or Claude.', 'Copy this prompt; set [EXAM], [SUBJECTS], weak areas.', 'Send and follow the week-by-week plan.', 'Adjust hours to your student\'s reality.', 'Ask "make a printable daily checklist for week 1".'],
    commonFix: "If the plan is unrealistic, reply: 'Re-do it for [X] study-hours a day and prioritise the highest-weight, highest-return topics only.'",
    promptText: ex(`ROLE: You are a results-focused mentor who has guided toppers through the final stretch of [EXAM: JEE / NEET / board].

CONTEXT: Build a final-45-days strategy for a student taking [EXAM] in [SUBJECTS], with about [HOURS] study-hours per day. Weak areas: [LIST WEAK AREAS]. Strong areas: [LIST STRONG AREAS].

IMPORTANT - be realistic and honest: do not promise ranks or marks; design for highest return on the time available. Flag anything that depends on the student's pace.

DO THIS:
1. A week-by-week plan (Weeks 1-6 + the last 3 days) balancing revision, practice and full mocks.
2. For each week: focus topics (prioritise high-weight, high-return), how many practice sets / mocks, and what to consciously deprioritise.
3. A mock-test + error-log routine (how to analyse mistakes so they are not repeated).
4. A short exam-day and night-before checklist.
5. A one-line stress / sleep / health note.

OUTPUT FORMAT: Week-by-week plan -> Mock + error-log routine -> Exam-day checklist -> Wellbeing note.

QUALITY BAR: Realistic for the stated hours; prioritise by return; no false promises.`) },

  { title: 'Trap & Misconception Atlas (by Chapter)', tag: 'Teaching gold', needsImage: false, makesImage: false,
    whatYouGet: 'A map of every classic trap and misconception in a chapter - the wrong idea, why students fall for it, the correct idea, and a catch-it example.',
    bestTool: 'ChatGPT or Claude', worksOnFree: 'Yes - works on any free AI',
    howToUse: 'Name the chapter and class; get the full list of traps to warn your students about.',
    effectiveUsage: ['Open ChatGPT or Claude.', 'Copy this prompt; set [CHAPTER], [CLASS].', 'Send and read the trap atlas.', 'Warn students about each before the test.', 'Ask "make a 1-page do/dont card from this".'],
    commonFix: "If an example is weak, reply: 'Give a sharper example for trap [n] - show the tempting wrong step and the correct fix side by side.'",
    promptText: ex(`ROLE: You are an examiner and master teacher who knows exactly where students lose marks in [CHAPTER] - the traps setters reuse and the misconceptions that never die.

CONTEXT: Build a trap-and-misconception atlas for [CHAPTER] at [CLASS/GRADE], [BOARD or EXAM].

DO THIS:
1. List the 8-12 classic traps and misconceptions in this chapter.
2. For EACH: (a) the WRONG idea / tempting mistake in plain words, (b) WHY students fall for it, (c) the CORRECT idea, (d) a short worked example showing the tempting wrong step beside the correct step, (e) a one-line "say this to students" warning.
3. End with a one-page "Do / Do NOT" card for this chapter.

OUTPUT FORMAT: For each trap: Wrong idea -> Why it happens -> Correct idea -> Worked example (wrong vs right) -> Say-this warning. Then the Do/Do-NOT card.

QUALITY BAR: Traps must be the genuine, recurring ones; every correction mathematically correct at the stated level.`) },
];

const src = readFileSync(ROOT + '/data/prompts.js', 'utf8');
const DATA = JSON.parse(src.slice(src.indexOf('window.PROMPT_DATA =') + 'window.PROMPT_DATA ='.length, src.lastIndexOf(';')));
const bySlug = {}; DATA.categories.forEach(c => bySlug[c.category] = c);

// add flagship prompts (skip any already present by title)
let addedF = 0;
const target = bySlug['competitive-exams'] || bySlug['exam-strategy-motivation'] || DATA.categories[1];
const have = new Set(target.prompts.map(p => p.title.toLowerCase()));
for (const f of flagship) { if (!have.has(f.title.toLowerCase())) { target.prompts.push(f); addedF++; } }

// upgrade every TEXT prompt's tail
let up = 0, skip = 0;
for (const c of DATA.categories) for (const p of c.prompts) {
  if (p.makesImage) { skip++; continue; } // image prompts keep their handwritten signature
  p.promptText = upgradeTail(p.promptText); up++;
}

DATA.version = '2026-06-22-p3';
const grand = DATA.categories.reduce((t, c) => t + c.prompts.length, 0);
const banner = '/* Maths Prompt Studio data - ' + grand + ' prompts across ' + DATA.categories.length + ' categories. v' + DATA.version + '. Authored by ' + SIG + '. Auto-generated; do not edit by hand. */\n';
writeFileSync(ROOT + '/data/prompts.js', banner + 'window.PROMPT_DATA = ' + JSON.stringify(DATA) + ';\n');
console.log('Added', addedF, 'flagship analytical prompts; upgraded', up, 'text prompts (ground rules + context check + branded footer); skipped', skip, 'image prompts.');
console.log('GRAND TOTAL', grand, '| version', DATA.version);
