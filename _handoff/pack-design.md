# Click-to-Tool pack design (from the 2026-07-16 audit)

# Maths Prompt Studio — "Click-to-Tool" Pack Design (275 prompts)

Design principle used throughout: **the teacher's job names the category; the tool is invisible plumbing.** Every load-bearing link uses only prefill patterns marked `verified` or `documented` in the research. `unsupported` tools (Desmos URL, Wayground, Kahoot, Blooket, Typst, Polypad, Quizizz) appear ONLY as paste-into destinations with copy-ready blocks. Microsoft Math Solver, Mathway and Photomath deep links are banned pack-wide (dead/nonexistent).

---

## 1. CATEGORY ARCHITECTURE — 12 categories, 275 prompts

| # | Category (teacher job) | Count | Load-bearing tools (all verified/documented) | Paste-into tools | Sample prompt titles |
|---|---|---|---|---|---|
| 1 | **Check It Before You Trust It** — verified answers & answer keys | 35 | WolframAlpha `?i=`, Symbolab `?query=`, SageMathCell `?z=` (only when the chat has code execution), OEIS | — | One-Tap Verified Solution; Answer Key With a Verify Link per Question; Audit This Answer Key I Already Have; Verify a Formula Derivation Symbolically |
| 2 | **Project It on the Board** — exact graphs, figures & constructions | 30 | GeoGebra `?command=` (graphing/geometry/3d/cas), PhET slug whitelist `?screens=`, Wolfram Demonstrations curated-permalink whitelist | Desmos (numbered type-these-lines list), Polypad (build instructions) | Graph Link That Opens Already Drawn; Geometry Figure That Matches My Proof Labels; Rotate-Able 3D Solid Link; Misconception Buster: See Both Curves Diverge |
| 3 | **Quiz Them on Their Phones** — auto-marked digital assessment | 30 | Google Forms prefill (teacher-supplied `entry.N` IDs), Google Apps Script (FormApp, copy-paste) | Wayground paste-import (≤10,000 chars), Kahoot xlsx table (95/60 char limits), Blooket CSV (answer as number 1–4) | Exit Ticket That Marks Itself; DPP → Wayground in 60 Seconds; Negative-Marking Mock as a Google Form; Per-Student Prefilled Revision Form |
| 4 | **Print It Beautifully** — press-quality papers & sheets | 25 | Overleaf `?encoded_snip=` / base64 `snip_uri`, CodeCogs `png.image?\dpi{150}` | Typst (paste flow, clearly labelled non-LaTeX) | Board Paper → Overleaf in One Click; Two-Column A4 Formula Sheet (Real Typesetting); Formula as a WhatsApp-Ready Image; Large-Print CWSN Paper |
| 5 | **Settle the Doubt with Sources** — research & citable explanations | 20 | Math StackExchange `search?q=`, OEIS, AoPS `q1_`, MathOverflow (rare), Perplexity `search?q=`, MacTutor (search instruction only) | — | Doubt → Three Human-Verified Solutions; What Sequence Is This? (OEIS); Find the Real Contest Source of This Problem; Is This Actually an Open Problem? |
| 6 | **Endless Practice Without Repeats** — drills & self-checking homework | 20 | Wolfram Problem Generator (hard-coded slug whitelist), Khan Academy `page_search_query=`, NCERT `textbook.php` bookcode table | — | Every Student Gets Different Numbers; Chapter → Khan Practice Trail; Mental-Maths Daily Ladder (Class 6–8); NCERT Exercise + Extension Link Pack |
| 7 | **Marks → Insight** — test analytics & item analysis | 25 | Google Sheets CSV+formula blocks, Colab (curated public notebook links), SageMathCell | — | Paste Marks, Get a Re-Teach Priority List; Question-Wise Difficulty & Discrimination; Topic Heatmap CSV for My Class; Rank List With Percentiles for My Test Series |
| 8 | **Grade the Stack** — bulk marking workflows | 20 | WolframAlpha (verify model answer first), Sheets CSV mark-sheet output | — | 30 Scripts, One Marking Scheme, One Mark Sheet; Step-Marking Rubric Locked to a Verified Key; Class Error Summary From a Marking Session |
| 9 | **Paperwork on Autopilot** — NEP/CBSE compliance | 20 | NCERT `textbook.php` citation links, Perplexity links for current circulars, Sheets CSV | — | HPC Remark Bank (Evidence-Based); Learning-Outcome Mapping for My Lesson Register; Audit My Paper Against a CBSE Blueprint; Annual Curriculum Plan in Submission Format |
| 10 | **Hand AI to Students Safely** — student/parent-facing links | 15 | ChatGPT `?q=`, Claude `/new?q=`, Google AI Mode `udm=50&q=` (never gemini.google.com) | — | Prefilled Tutor Prompt Button for My Class; Parent-Explainer Link (Rank vs Percentile); Safe Doubt-Solver Instructions (Custom GPT/Gem spec) |
| 11 | **Every Language, Every Learner** — translation & inclusion | 20 | Overleaf (Devanagari/Tamil via fontspec+xelatex engine param), CodeCogs (notation survives as images) | — | Translate This Whole Paper to [Tamil/Telugu/Marathi/Bengali], Notation Intact; Dyscalculia-Friendly Worksheet Variant; Exam Concession Documentation Pack |
| 12 | **Level Yourself Up** — teacher upskilling & career | 15 | Math SE, Khan search, NCERT links, Wolfram Demonstrations whitelist, Perplexity (current syllabus) | — | Teach ME the New Syllabus Unit; Demo Lecture for a Job Interview (With Projectable Links); Answer Appraisal Questions With Evidence |

**Total: 275.** Pack-wide plumbing shipped inside prompts as appendix tables: (a) Wolfram Problem Generator slug whitelist (~40 clicked-and-verified slugs), (b) PhET sim slug whitelist (~25), (c) NCERT bookcode table (femh1…lemh2), (d) curated GeoGebra `/m/` and Demonstrations permalinks (only IDs a human has clicked). AI is never allowed to mint slugs/IDs outside these tables.

---

## 2. THE TOOL-LINK OUTPUT CONTRACT (reusable block, paste verbatim at the end of every prompt)

```
=== TOOL-LINK OUTPUT CONTRACT — follow every rule exactly ===
1. You may output clickable links ONLY to: wolframalpha.com/input?i= · symbolab.com/solver?query= ·
   geogebra.org/graphing|geometry|3d|cas?command= · math.stackexchange.com/search?q= · oeis.org/search?q= ·
   artofproblemsolving.com/community/q1_ · khanacademy.org/search?page_search_query= ·
   overleaf.com/docs?encoded_snip= · latex.codecogs.com/png.image? · docs.google.com/forms/...viewform?usp=pp_url
   (Forms only with entry.N IDs I paste in) · plus any URL I give you or that appears in this prompt's whitelist table.
2. NEVER output: desmos.com links with query strings (they load blank), invented geogebra.org/m/ IDs, Khan topic
   URLs, DIKSHA dial codes, Wolfram quiz/demo slugs not in my table, or mathsolver.microsoft.com (dead site).
3. Write queries in plain calculator syntax (x^2, sqrt(x), pi, 3/4) — never LaTeX — EXCEPT Overleaf and CodeCogs
   payloads, which are LaTeX.
4. Percent-encode the query part: space→%20, +→%2B, ^→%5E, =→%3D, [→%5B, ]→%5D; in LaTeX payloads also
   \→%5C, {→%7B, }→%7D, %→%25, #→%23, &→%26, newline→%0A. GeoGebra ?command= exception: encode ONLY + as %2B;
   leave ( ) = ^ ; as typed.
5. One link per line, formatted exactly:  CHECK → <full raw URL>   (no markdown brackets, nothing after the URL).
6. Directly below every link, print:  (paste-fallback: <the un-encoded query or commands>)
7. Before printing any link, silently decode your own URL and confirm it reproduces the query character-for-character;
   rebuild it if not. If a URL would exceed 1,800 characters (Overleaf: 6,000), print only the paste-fallback.
8. Label every link "check this yourself" — never claim the link proves your answer is correct.
9. On phones these links must be opened in a browser, not an installed app — say this once at the end.
```

Why each line exists: (1)+(2) kill hallucinated deep links — the #1 failure found in research (Desmos silently ignores params, GeoGebra/Demonstrations IDs get fabricated, Microsoft Math is dead). (3) kills the LaTeX-into-WolframAlpha misparse. (4) is the exact per-tool encoding table, including the GeoGebra exception where over-encoding breaks links. (5)+(6) survive WhatsApp/chat-app link mangling and give a manual path. (7) forces a round-trip self-check and respects real URL limits. (8) keeps epistemic honesty. In the library build, store this once as `{{TOOL_LINK_CONTRACT}}` and inline it into every promptText at publish time.

---

## 3. FIVE FLAGSHIP PROMPTS (complete promptText; `{{TOOL_LINK_CONTRACT}}` = block above, inlined verbatim)

### (a) Category 1 — "Solve It, Then Prove It (One-Tap WolframAlpha Check)"

```
You are a meticulous maths solution-writer for a [BOARD: CBSE/ICSE/JEE/NEET] Class [CLASS] teacher in India.
I do not trust any AI's arithmetic, including yours. Your job is to solve my problem AND hand me independent,
clickable verification links so I never have to take your word for it.

MY PROBLEM: [PASTE THE FULL QUESTION HERE]

Produce exactly these sections:

1. RESTATED PROBLEM — retype the question in your own words so I can catch a misread before anything else.
2. SOLUTION — numbered steps, one operation per step, plain calculator notation only (x^2, sqrt(x), pi, 3/4).
   No LaTeX anywhere in this section.
3. FINAL ANSWER — one line, starting exactly with "FINAL ANSWER:", in exact form (fractions/surds, not decimals),
   plus the decimal approximation in brackets.
4. VERIFY LINKS (check these yourself) —
   a. One WolframAlpha link that recomputes the ORIGINAL problem end-to-end
      (e.g. for "solve x^2-5x+6=0" the link is https://www.wolframalpha.com/input?i=solve+x%5E2-5x%2B6%3D0).
   b. Up to 3 extra WolframAlpha links for the riskiest intermediate results (a discriminant, an integral,
      a limit) — pick the steps where a slip would poison everything after.
   c. One Symbolab second-opinion link (symbolab.com/solver?query=...) for the main computation.
5. NOT MACHINE-CHECKABLE — honestly list any part of your solution the links above do NOT verify
   (word-problem setup, a proof step, a modelling assumption) and tell me in one line each how to check it by hand.

If the problem is a pure proof with nothing to compute, say so in section 4 and give links only for any
computable sub-results (a specific identity at a test value, a claimed root).

{{TOOL_LINK_CONTRACT}}
```

### (b) Category 2 — "Graph Link That Opens Already Drawn (GeoGebra)"

```
You are a classroom-projection assistant for a Class [CLASS] maths teacher. I need to project an EXACT figure,
not a hand sketch and not an AI-generated image. You will build me one clickable GeoGebra link that opens with
everything already drawn and labelled.

WHAT TO DRAW: [PASTE THE FUNCTION(S), EQUATION, OR GEOMETRY DESCRIPTION — e.g. "y = x^2 - 4x + 3 with its
roots and vertex marked" or "triangle with vertices (0,0), (4,0), (2,3) with all angles shown"]

Produce exactly these sections:

1. WHAT THE CLASS WILL SEE — two lines describing the finished picture, including the specific values I should
   see on screen (e.g. "roots at x=1 and x=3, vertex at (2,-1)"). If the link opens and does NOT show these
   values, the link is wrong and I should use the fallback.
2. THE ONE-CLICK LINK — a single geogebra.org URL using ?command= with semicolon-chained commands.
   Choose the app: /graphing for functions, /geometry for constructions, /3d for solids, /cas for symbolic work.
   Chain the definition FIRST, then annotation commands so the picture arrives labelled:
   Root(f); Extremum(f); Intersect(f,g); Polygon(A,B,C); Angle(...); as appropriate. Maximum 12 commands.
   Worked example of a correct link (note: ONLY + is encoded, as %2B):
   https://www.geogebra.org/graphing?command=f(x)=x^2-4x%2B3;Root(f);Extremum(f)
3. DESMOS VERSION (fallback, no link) — a numbered list of lines for me to TYPE into desmos.com/calculator,
   in Desmos syntax, including a slider line (e.g. a=1) if a parameter is worth animating. Never output a
   Desmos URL with a query string — those open a blank calculator.
4. TWO DISCUSSION QUESTIONS — what to ask the class while dragging/zooming, one prediction question and one
   "why" question.
5. CLASSROOM MODE TIP — one line: "To watch every student manipulate this, open the link and press the ASSIGN
   button on the GeoGebra page to create a free GeoGebra Classroom."

{{TOOL_LINK_CONTRACT}}
```

### (c) Category 3 — "From Chat to Auto-Marked Quiz (Google Forms + Wayground)"

```
You are a digital-quiz builder for a Class [CLASS] [BOARD] maths teacher. Build me a quiz once, in THREE
formats, so I can run it as an auto-marked Google Form or a live Wayground game without retyping anything.

TOPIC: [TOPIC / CHAPTER]     QUESTIONS: [N, default 10]     MARKS: [e.g. +4/-1 or 1 mark each]
DIFFICULTY MIX: [e.g. 4 easy / 4 medium / 2 hard]

Use ONLY plain ASCII maths everywhere (x^2, sqrt(x), 1/2, pi) — quiz importers destroy LaTeX and unicode.

Produce exactly these sections:

1. THE QUIZ (my review copy) — each item as: question, options A–D, "ANSWER: <letter>", and a one-line
   solution. I will check these before importing; flag any answer you could not verify with a link per the
   contract below (attach a WolframAlpha CHECK link for every computational answer).
2. BLOCK A — GOOGLE FORMS SCRIPT: one complete Google Apps Script code block using FormApp that creates the
   form with quiz mode ON, every question as multiple choice, correct answers and points set from the marks
   scheme, and Logger.log of the form URL at the end. Below the block print these exact steps:
   "Open script.google.com > New project > delete everything > paste this > click Run > allow permissions
   (one time) > View > Logs > open the printed link." (No URL can create form questions — this script is the
   only reliable route.)
3. BLOCK B — WAYGROUND PASTE BLOCK: the same questions formatted for Wayground's "Paste questions" importer
   (wayground.com — formerly Quizizz), question then options then the correct answer marked, total block under
   10,000 characters. Below it: "Open wayground.com/admin > Create > Import > Paste questions > paste this."
4. BLOCK C — PREFILLED FORM LINKS (only if I paste one below): my form's "Get pre-filled link" URL is:
   [OPTIONAL: PASTE PREFILLED LINK WITH entry.N IDs, OR LEAVE BLANK]. If provided, generate one
   viewform?usp=pp_url link per variant with the entry values URL-encoded; if blank, skip this section silently.

{{TOOL_LINK_CONTRACT}}
```

### (d) Category 5 — "Settle the Doubt with Sources (Math StackExchange + OEIS + AoPS)"

```
You are a research librarian for a maths teacher facing a hard student doubt. Your answer alone is not enough —
a sceptical topper or a parent will ask "who says so?". Give me your answer PLUS clickable links to
human-written, community-vetted solutions I can cite.

THE DOUBT: [PASTE THE STUDENT'S QUESTION OR THE PROBLEM]
CONTEXT: Class [CLASS], [BOARD/EXAM], asked by [e.g. "a JEE aspirant" / "a confused average student"]

Produce exactly these sections:

1. MY ANSWER — your best explanation in under 200 words, at the student's level.
2. SEARCH KEYWORDS — extract 3–6 keywords plus ONE Math StackExchange tag for this doubt. Never put a full
   equation into a search query; search engines match keywords, not formulas.
3. SOURCE LINKS (check these yourself) — build only the ones that apply:
   a. Math StackExchange: https://math.stackexchange.com/search?q=%5Btag%5D+keyword+keyword
      (tag in %5B %5D, spaces as +). Always include this one.
   b. If the doubt involves an integer sequence or number pattern: compute the first 6–8 terms yourself, then
      link https://oeis.org/search?q=term1,term2,term3,... and warn me that patterns often have multiple valid
      continuations — OEIS will show them all.
   c. If it is an olympiad/competition problem: https://artofproblemsolving.com/community/q1_keyword%20keyword
      (spaces as %20) so I can find the original contest source and human solution threads.
   d. Only if the doubt is "who proved this / is this open / where is the original paper":
      https://mathoverflow.net/search?q=... — otherwise never send me to MathOverflow.
   e. If any part depends on CURRENT facts (syllabus, exam pattern, dates): a perplexity.ai/search?q= link.
4. EXTRA PRACTICE — one https://www.khanacademy.org/search?page_search_query=... link on the underlying skill.
5. HOW TO READ THE RESULTS — two lines: prefer accepted/high-vote answers; read the top 2–3, not just the first.

{{TOOL_LINK_CONTRACT}}
```

### (e) Category 4 — "Worksheet to Print: One-Click Overleaf PDF"

```
You are a LaTeX typesetter for a maths teacher who has never written LaTeX. Produce a print-perfect A4
worksheet I can turn into a PDF in one click on Overleaf (free account needed — the first click shows a
sign-in page, then the project opens with everything already in it).

WORKSHEET SPEC — Topic: [TOPIC]   Class: [CLASS] [BOARD]   Questions: [N] ([EASY/MEDIUM/HARD MIX])
Header: [SCHOOL/COACHING NAME], [DATE], "Time: [MINS] min", "Max Marks: [MARKS]"
Answer key: YES, on a separate final page.

Produce exactly these sections:

1. QUESTION LIST (plain text) — the questions and final answers in calculator notation first, so I can check
   the maths BEFORE anything is typeset. Attach one WolframAlpha CHECK link for each computational answer per
   the contract below. Wait — do not wait; continue, but I may regenerate if these are wrong.
2. THE LATEX DOCUMENT — one complete code block: \documentclass[a4paper,12pt]{article}, packages ONLY from
   {amsmath, amssymb, geometry, multicol, enumitem}, my header block, numbered questions with marks in the
   margin like [3], \newpage before the ANSWER KEY section. It must compile on pdflatex with zero errors and
   zero other packages.
3. THE ONE-CLICK LINK — https://www.overleaf.com/docs?encoded_snip=<the ENTIRE document percent-encoded using
   the LaTeX rules in the contract: \→%5C {→%7B }→%7D %→%25 #→%23 &→%26 space→%20 newline→%0A>.
   If the encoded URL exceeds 6,000 characters, do NOT print a broken link — instead print exactly:
   "Too long for a link. Do this instead: overleaf.com > Register/Log in > New Project > Blank Project >
   delete everything in the left panel > paste the code block from section 2 > click Recompile."
4. WHATSAPP FORMULA IMAGES — for the 2–3 heaviest formulas on the sheet, one CodeCogs image link each:
   https://latex.codecogs.com/png.image?%5Cdpi%7B150%7D<percent-encoded latex> — so I can share key formulas
   in the class WhatsApp group. Advise me to download the PNGs, not hotlink them.
5. IF IT WON'T COMPILE — one line: the usual culprit is a mangled % or & character; use the code block from
   section 2 with the manual paste steps, which always works.

{{TOOL_LINK_CONTRACT}}
```

---

## 4. BUILD ORDER — first 3 categories for maximum teacher wow

1. **Check It Before You Trust It (Cat 1, 35 prompts).** Build first. It attacks the #1 adoption blocker for non-technical teachers — "what if the AI is wrong?" — with a one-tap, non-LLM answer. It is also the cheapest 35 prompts you'll ever build (one link pattern × many jobs), works identically in ChatGPT and Claude with zero login, and its contract discipline becomes the QA foundation for every other category. Retro-fit bonus: the same block upgrades most of the existing 589 prompts' fake "verify two ways" sections.
2. **Project It on the Board (Cat 2, 30 prompts).** The demo-in-the-staff-room category: a teacher clicks a link and GeoGebra opens with the parabola drawn, roots marked, vertex labelled — visibly impossible in a plain chat, instantly shareable, and it directly replaces the pack's most embarrassing current failure (image-model-mangled diagrams). Requires the most careful QA (GeoGebra `?command=` is undocumented), so start it early while it's the wow engine.
3. **Quiz Them on Their Phones (Cat 3, 30 prompts).** Biggest recurring time saving: marking disappears. It converts existing DPP/exit-ticket/mock content into auto-graded delivery that lands where Indian students already are (phones/WhatsApp), and Wayground being India-founded removes the "foreign tool" friction. Slightly later than 1–2 because Google Apps Script needs a one-time hand-holding tutorial page.

Categories 7/8 (analytics, bulk grading) are the deepest unmet jobs but need multi-turn workflows — ship them in wave 2 once the contract pattern is proven. One migration action for the existing library: remove every `mathsolver.microsoft.com` reference (service dead since July 2025) and rename Quizizz → Wayground.

**QA gate before publishing any prompt:** click-test its link pattern with 3 real payloads (one with `+`, one with `^`/`=`, one near the length cap) on desktop and a mobile browser; any whitelist table entry ships only after a human has opened the URL.
