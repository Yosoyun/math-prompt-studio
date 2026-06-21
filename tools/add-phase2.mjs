// Phase 2 (Trust): add the Double-Check verifier + deterministic-diagram prompts,
// and bake a two-step answer-key step into exam-paper prompts.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIG = 'Indrajeet Yadav';

const src = readFileSync(ROOT + '/data/prompts.js', 'utf8');
const DATA = JSON.parse(src.slice(src.indexOf('window.PROMPT_DATA =') + 'window.PROMPT_DATA ='.length, src.lastIndexOf(';')));
const bySlug = {}; DATA.categories.forEach(c => bySlug[c.category] = c);

const MATHS = 'MATHS FORMATTING: write all maths in readable plain text (a/b for fractions, x^2 for powers, sqrt(x) for roots, and <=, >=, !=, +-, pi, theta, integral, sum) - do NOT output raw LaTeX such as \\frac{}{} or $...$.';

const VERIFIER = {
  title: 'Double-Check Any AI Maths Answer',
  tag: 'Trust check', needsImage: false, makesImage: false,
  whatYouGet: 'An independent re-check of any AI or student answer, with a clear GREEN / AMBER / RED trust verdict and the fix.',
  bestTool: 'Any AI chat (best on ChatGPT or Claude)',
  worksOnFree: 'Yes - works on any free AI',
  howToUse: 'In a FRESH chat, paste the question and the answer you want checked - get a verdict and the correction.',
  effectiveUsage: [
    'Open a FRESH AI chat (not the one that gave the answer).',
    'Copy this whole prompt into it.',
    'Paste the original question where shown.',
    'Paste the full answer/solution you want checked.',
    'Read the GREEN/AMBER/RED verdict and the flagged steps.'
  ],
  commonFix: "If you are still unsure, reply: 'Re-solve from scratch by a completely different method and a numeric test, and show every step.'",
  promptText:
`ROLE: Act as a meticulous, INDEPENDENT mathematics checker and examiner. You did NOT write the solution you are checking - treat it with healthy suspicion.

CONTEXT: A teacher or student has a maths answer (from another AI, a book, or a student) and must know if it is actually correct before trusting it for [CLASS/GRADE], [BOARD or EXAM e.g. CBSE / ICSE / JEE / NEET].

YOUR TASK:
1. First re-solve the problem yourself from scratch - by a DIFFERENT method than the one shown if possible. Do not be influenced by the given answer.
2. Compare your result with the answer being checked.
3. Independently TEST the answer and SHOW the actual arithmetic - for example: substitute the answer back into the original equation; plug in specific numbers or a special/limiting case; for an integral, differentiate the result back; for a derivative, test a point; always sanity-check units, sign and rough size.
4. Identify every error in the given solution: name the exact step and say why it is wrong.
5. Give a clear, honest trust verdict.

INPUT:
Original question: [PASTE THE QUESTION HERE]
Answer or full solution to check: [PASTE THE ANSWER / SOLUTION HERE]

HOW TO WORK IT OUT: Show your own solution in full and SHOW the real substitution/second-method numbers - do NOT merely claim "verified". If you are not fully certain, say so and flag the step you are least sure about. Never invent a value or formula. Stay strictly at the stated level.

OUTPUT FORMAT (use these exact headings, in order):
1. My independent solution - numbered steps, your own working.
2. Verification - the real check with numbers shown (substitution / second method).
3. VERDICT - exactly one of: GREEN = correct and reliable; AMBER = right idea but a slip or unclear step; RED = wrong. Add one line saying why.
4. Errors found - the exact step(s) and the mistake (or "none").
5. Corrected final answer - the right answer with units.

RULES: Be specific and honest - a confident wrong answer is worse than "I am not sure". If the question itself is ambiguous or unsolvable as written, say so instead of guessing.

${MATHS}

SIGNATURE: At the very end add a footer line: "Checked with Maths Prompt Studio - ${SIG}".`
};

function diag(title, what, how, eff, body) {
  return { title, tag: 'Exact figure', needsImage: false, makesImage: false, whatYouGet: what,
    bestTool: 'Any AI chat (paste the code into the tool named)', worksOnFree: 'Yes - works on any free AI',
    howToUse: how, effectiveUsage: eff,
    commonFix: "If the figure looks off, reply: 'Re-check the coordinates/values against my description and regenerate the exact commands - do not approximate.'",
    promptText: body };
}
const SIGT = `\n\nSIGNATURE: At the very end add a footer line: "Prepared by ${SIG}".`;
const DIAGRAMS = [
  diag('Exact Geometry Figure - GeoGebra Commands',
    'Exact, to-scale geometry figure as GeoGebra commands you paste into the free GeoGebra input bar.',
    'Describe the figure (lengths/angles/labels); paste the commands into geogebra.org.',
    ['Open geogebra.org/geometry (free).', 'Copy this prompt, describe your figure in the INPUT.', 'Send; copy the GeoGebra commands it gives.', 'Paste them one per line into the GeoGebra input bar.', 'Export the figure as an image for your paper.'],
`ROLE: Act as a geometry teacher and GeoGebra expert who produces EXACT, to-scale constructions (AI image generators cannot draw accurate maths figures, so we output precise commands instead).

CONTEXT: For [CLASS/GRADE], [BOARD or EXAM]. I need an accurate, correctly-labelled figure I can put in a worksheet or paper.

YOUR TASK: From my description, output a numbered list of GeoGebra input-bar commands that construct the figure EXACTLY (correct lengths, angles, right-angle marks, labels). Use real GeoGebra syntax (e.g. A=(0,0), B=(6,0), C=Point, Segment(A,B), Angle(A,B,C), Text(...)). After the commands, add a 2-line "What you will see" description.

INPUT: Figure to construct: [DESCRIBE THE FIGURE - lengths, angles, labels, e.g. "triangle ABC, right-angled at B, AB=6 cm, BC=8 cm; mark the right angle and label all sides"].

HOW TO WORK IT OUT: Compute exact coordinates so all stated lengths/angles are correct (show the quick calculation for any non-trivial point). Verify by re-checking each given length/angle from your coordinates. Never approximate a value that should be exact.

OUTPUT FORMAT: 1) GeoGebra commands (one per line, in order). 2) The exact coordinates of each labelled point. 3) "What you will see" (2 lines). 4) One line: "Paste these into the GeoGebra input bar (geogebra.org), one line at a time."

RULES: Stay at the stated level. Real GeoGebra syntax only.${SIGT}`),
  diag('Accurate Function Graph - Desmos',
    'A precise function graph as Desmos expressions (exact intercepts, asymptotes, key points) you paste into desmos.com.',
    'Give the function(s) and what to highlight; paste expressions into desmos.com/calculator.',
    ['Open desmos.com/calculator (free).', 'Copy this prompt; type your function(s) in INPUT.', 'Send; copy each Desmos expression line.', 'Paste them into Desmos (one per row).', 'Screenshot the graph for your notes/paper.'],
`ROLE: Act as a maths teacher and Desmos expert who produces EXACT graphs (AI image generators draw inaccurate graphs, so we output precise Desmos expressions instead).

CONTEXT: For [CLASS/GRADE], [BOARD or EXAM]. I need an accurate graph with the key features correct and labelled.

YOUR TASK: From my function(s), output Desmos-ready expression lines that plot the graph and mark the key features (x- and y-intercepts, turning points, asymptotes, points of interest) using exact values. Include label points and a sensible window.

INPUT: Function(s) and what to highlight: [e.g. "y = x^2 - 4x + 3; mark the roots, vertex and y-intercept"].

HOW TO WORK IT OUT: Compute the exact intercepts/vertex/asymptotes and SHOW the short working. Verify each feature by substitution. Do not round values that should be exact (give surds/fractions where needed).

OUTPUT FORMAT: 1) The exact key features with their working. 2) Desmos expression lines (one per row, ready to paste). 3) Suggested window (xmin..xmax, ymin..ymax). 4) One line: "Paste each line into desmos.com/calculator."

RULES: Real Desmos syntax. Stay at the stated level.
${MATHS}${SIGT}`),
  diag('Precise Diagram - TikZ for LaTeX',
    'Clean, exact figure as TikZ/LaTeX code for documents and books (compiles to a perfect vector figure).',
    'Describe the figure; paste the TikZ code into your LaTeX editor (e.g. Overleaf).',
    ['Copy this prompt; describe the figure in INPUT.', 'Send; copy the TikZ code block.', 'Paste into a LaTeX doc (Overleaf is free).', 'Compile to get a perfect vector figure.', 'Use it in your book/worksheet.'],
`ROLE: Act as a maths typesetting expert who writes correct, compilable TikZ code for exact figures.

CONTEXT: For [CLASS/GRADE] material / a book chapter. I need a clean vector figure.

YOUR TASK: From my description output a complete, compilable TikZ picture (inside \\begin{tikzpicture} ... \\end{tikzpicture}) with exact coordinates, labels, ticks, and angle/right-angle marks. List any required packages.

INPUT: Figure to draw: [DESCRIBE IT with exact lengths/angles/labels].

HOW TO WORK IT OUT: Compute exact coordinates from the given measurements (show the quick working). Double-check each stated length/angle from your coordinates. The code must compile as-is.

OUTPUT FORMAT: 1) Required packages. 2) The full tikzpicture code block. 3) Exact coordinates used. 4) One line on where to paste it (e.g. Overleaf).

RULES: Valid TikZ only. Stay at the stated level.${SIGT}`),
  diag('Data Chart - Clean Table + Build Steps',
    'A tidy data table plus exact steps to turn it into an accurate chart in Excel or Google Sheets.',
    'Give your data; get a clean table and click-by-click chart steps.',
    ['Copy this prompt; paste or describe your data in INPUT.', 'Send; copy the clean data table.', 'Paste it into Excel or Google Sheets.', 'Follow the steps to insert the chart.', 'Done - an exact, editable chart.'],
`ROLE: Act as a maths/statistics teacher who turns data into accurate, classroom-ready charts (using a real spreadsheet, not a fuzzy AI image).

CONTEXT: For [CLASS/GRADE], [BOARD or EXAM]. I need an accurate [CHART TYPE e.g. bar / pie / histogram / line] chart.

YOUR TASK: 1) Clean and lay out my data as a neat table. 2) If needed, compute derived values (percentages, class intervals, frequencies, cumulative frequency) and SHOW the working. 3) Give exact click-by-click steps to make the chart in BOTH Excel and Google Sheets. 4) Suggest titles and axis labels.

INPUT: My data: [PASTE OR DESCRIBE THE DATA]. Chart type: [CHART TYPE].

HOW TO WORK IT OUT: Verify totals (e.g. percentages sum to 100, frequencies sum to N). Never invent data points.

OUTPUT FORMAT: 1) Clean data table. 2) Any computed values with working. 3) Excel steps. 4) Google Sheets steps. 5) Suggested chart title + axis labels.

RULES: Stay at the stated level.
${MATHS}${SIGT}`),
  diag('Coordinate Geometry Plot - Desmos',
    'Exact points, lines and shapes plotted in Desmos (precise coordinates, intersections, distances).',
    'Give the points/lines; paste the Desmos expressions and see the exact plot.',
    ['Open desmos.com/calculator.', 'Copy this prompt; list points/lines in INPUT.', 'Send; copy the Desmos lines.', 'Paste them in; read the exact plot.', 'Screenshot for your worksheet.'],
`ROLE: Act as a coordinate-geometry teacher and Desmos expert producing EXACT plots.

CONTEXT: For [CLASS/GRADE], [BOARD or EXAM].

YOUR TASK: From my points/lines/shapes, output Desmos expression lines that plot them exactly, plus compute and mark any asked quantities (midpoints, distances, slopes, intersection points, area) with exact values and short working.

INPUT: Plot this: [e.g. "A(1,2), B(5,6); line AB; its midpoint; the perpendicular bisector"].

HOW TO WORK IT OUT: Compute each asked quantity exactly and SHOW the working; verify (e.g. midpoint lies on the segment, intersection satisfies both lines). No rounding of exact values.

OUTPUT FORMAT: 1) Computed quantities with working. 2) Desmos expression lines (paste-ready). 3) One line: "Paste each line into desmos.com/calculator."

RULES: Real Desmos syntax. Stay at the stated level.
${MATHS}${SIGT}`),
  diag('Function Value Table + Quick Board Sketch',
    'An exact table of values plus a labelled rough sketch description you can draw on the board in seconds.',
    'Give the function and range; get an exact value table and a clear sketch guide.',
    ['Copy this prompt; type the function and x-range in INPUT.', 'Send; read the exact value table.', 'Use the points to plot accurately.', 'Follow the sketch guide for the board.', 'Done - no fuzzy image needed.'],
`ROLE: Act as a maths teacher producing an EXACT table of values and a precise, labelled sketch description (no inaccurate AI image).

CONTEXT: For [CLASS/GRADE], [BOARD or EXAM].

YOUR TASK: 1) Build a table of (x, y) values for the function across the given range at sensible steps, with exact values shown (surds/fractions where needed). 2) State the key features: intercepts, turning points, asymptotes, symmetry, behaviour at the ends. 3) Give a clear step-by-step "how to sketch it on the board" guide. 4) Optionally a simple ASCII outline.

INPUT: Function and range: [e.g. "y = 1/x for x from -3 to 3"].

HOW TO WORK IT OUT: Compute each table value exactly and SHOW any non-trivial step; verify the key features by substitution. Note where the function is undefined.

OUTPUT FORMAT: 1) Value table. 2) Key features with working. 3) Board-sketch steps. 4) (Optional) ASCII outline.

RULES: Stay at the stated level.
${MATHS}${SIGT}`),
];

// --- apply ---
let added = 0;
if (bySlug['error-analysis']) { bySlug['error-analysis'].prompts.push(VERIFIER); added++; }
else if (bySlug['doubt-error']) { bySlug['doubt-error'].prompts.push(VERIFIER); added++; }
if (bySlug['diagrams-graphs']) { DIAGRAMS.forEach(d => bySlug['diagrams-graphs'].prompts.push(d)); added += DIAGRAMS.length; }

// two-step answer-key step into exam-paper categories
const KEY_STEP = 'For a trustworthy answer key: paste the finished paper into a FRESH chat and ask it to solve and grade it as an unseen exam (it catches its own slips).';
let keyed = 0;
for (const slug of ['question-papers', 'mock-sample-papers', 'competitive-exams']) {
  const c = bySlug[slug]; if (!c) continue;
  for (const p of c.prompts) {
    if (p.makesImage) continue;
    p.effectiveUsage = Array.isArray(p.effectiveUsage) ? p.effectiveUsage : [];
    if (!p.effectiveUsage.some(s => /fresh chat|unseen exam/i.test(s))) { p.effectiveUsage.push(KEY_STEP); keyed++; }
  }
}

DATA.version = '2026-06-22-p2';
const grand = DATA.categories.reduce((t, c) => t + c.prompts.length, 0);
const banner = '/* Maths Prompt Studio data - ' + grand + ' prompts across ' + DATA.categories.length + ' categories. v' + DATA.version + '. Authored by ' + SIG + '. Auto-generated; do not edit by hand. */\n';
writeFileSync(ROOT + '/data/prompts.js', banner + 'window.PROMPT_DATA = ' + JSON.stringify(DATA) + ';\n');
console.log('Phase 2: added', added, 'prompts (1 verifier + ' + DIAGRAMS.length + ' deterministic diagrams); two-step answer-key step added to', keyed, 'paper prompts.');
console.log('GRAND TOTAL now', grand, '| version', DATA.version);
