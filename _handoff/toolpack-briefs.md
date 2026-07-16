# Wave-1 "Click-to-Tool" pack — 95 prompts to generate (NOT yet built)

These are the first prompts on the site whose OUTPUT contains clickable deep links that open external tools pre-loaded. Generate 5 prompts per brief below (19 briefs = 95 prompts), then run the QA gate at the bottom.

## Three NEW categories to add to data/prompts.js

| category id | categoryTitle | group | categoryIcon |
|---|---|---|---|
| `verified-answers` | Verified Answers (One-Tap Check) | Solving & Checking | 🔗 |
| `board-projection` | Project It on the Board | Teaching Materials | 📽️ |
| `phone-quizzes` | Quiz Them on Their Phones | Practice & Assessment | 📱 |

Every new prompt gets `added: "<today's date>"` so it appears in the ✨ Recently added row, plus `exams` (array) and `aud` facet fields (see AGENTS.md).

## HARD TOOL FACTS (verified 2026-07-16 — violating any of these is an automatic reject)

- **WolframAlpha**: `https://www.wolframalpha.com/input?i={percent-encoded query}` — works, no login. Plain calculator syntax in queries (x^2, sqrt(x)), NEVER LaTeX.
- **Symbolab**: `https://www.symbolab.com/solver?query={encoded}` — works.
- **GeoGebra**: `https://www.geogebra.org/{graphing|geometry|3d|cas}?command={cmd1};{cmd2}` — works; encode ONLY `+` as `%2B`, leave `( ) = ^ ;` literal. Max ~12 chained commands.
- **Desmos: NO URL prefill exists.** Desmos appears ONLY as a numbered list of lines the teacher types manually. Never output a desmos.com URL with parameters — it opens a blank calculator.
- **Google Forms: cannot be created by URL.** Auto-marked quiz = complete Google Apps Script (FormApp) code block + exact click path (script.google.com → New project → paste → Run → View → Logs).
- **Wayground (ex-Quizizz)**: paste-import only (Create → Import → Paste questions), block < 10,000 chars. **Kahoot**: xlsx table (95-char questions / 60-char answers). **Blooket**: CSV, answer as number 1–4. Never claim URL import for these.
- **Math StackExchange**: `https://math.stackexchange.com/search?q=` — keywords + `%5Btag%5D`, never full equations. **OEIS**: `https://oeis.org/search?q=term1,term2,...`
- **Overleaf**: `https://www.overleaf.com/docs?encoded_snip={percent-encoded LaTeX}` (free login needed; if URL would exceed 6,000 chars, print manual paste steps instead). **CodeCogs**: `https://latex.codecogs.com/png.image?%5Cdpi%7B150%7D{encoded latex}`.
- **Dead / banned**: mathsolver.microsoft.com (service dead since Jul 2025), Photomath web, Mathway URL params, Gemini prefill URLs.

## The contract

Every generated promptText MUST end with the block in `_handoff/tool-link-contract.txt`, copied VERBATIM. Include one fully worked example URL inside each promptText so the AI sees the exact encoding pattern.

## Prompt format (identical to every existing prompt in data/prompts.js)

`title` (Title Case, distinct from all existing — check with the titles in data/prompts.js), `tag` (2–4 words), `needsImage`/`makesImage` (false unless the job needs an attached photo → needsImage true), `whatYouGet` (one concrete sentence), `bestTool` ("Any AI chat (ChatGPT, Claude, Gemini)"), `worksOnFree` ("Works on any free AI"), `howToUse` (one sentence), `effectiveUsage` (4–5 plain numbered steps for a non-technical teacher), `commonFix` (one "if wrong, reply with…" line), `promptText` (ROLE / CONTEXT / numbered DO THIS / OUTPUT FORMAT sections, [PLACEHOLDERS] in caps square brackets, links labelled "check this yourself" — never "this proves I'm right", NO signature demands, ends with the contract).

## The 19 briefs (5 prompts each)

**verified-answers (8 briefs = 40):**
1. Solve + WolframAlpha verify-link for final answer AND 2–3 riskiest steps · audit a pasted answer key · verify a formula symbolically (Symbolab + WA test values) · student homework self-check sheet (link per question) · MCQ elimination with proof link.
2. Definite/indefinite integral verified end-to-end · limit two ways + link · derivative/tangent slope verified at a point · system of equations verified · inequality with solution-set link.
3. Word problem (model→solve, links for computable parts + honest NOT-MACHINE-CHECKABLE section) · OEIS sequence identification · probability/combinatorics verified · matrix ops (det/inverse/rank) each linked · complex numbers verified in both forms.
4. Trig general solution + sample-value checks · quadratic/cubic roots + discriminant links · coordinate geometry verified · statistics of pasted data verified · full paper answer key with a link per computational answer.
5. "Is my student's answer right?" verdict + proof link · second-opinion protocol on another AI's answer · JEE Advanced multi-correct checker (each option independently linked) · integer-type verification · board stepwise solution with mini-links per key step.
6. Formula sheet with verify link per formula · solution→marking scheme with verified checkpoints · estimate-first then exact + link · dimensional/sanity analysis + link · catch-the-error with a link proving the break point.
7. DPP set with fully link-verified key · pre-exam mock key audit · parent "check your child's homework" protocol · olympiad answer plausibility (honest about proofs) · flashcards with pocket verify links.
8. FLAGSHIPS: the universal "Solve It, Then Prove It" (restate → solve → FINAL ANSWER → verify links → NOT-MACHINE-CHECKABLE) — make it the best verified-solving prompt on the internet · photo twin (needsImage) · Hindi-medium-class twin · Socratic student twin (hints first, links last) · whole-worksheet twin.

**board-projection (6 briefs = 30):**
9. GeoGebra graph link with roots/extrema/intersections labelled + Desmos typed fallback · geometry construction matching MY proof labels · rotatable 3D solid · two-curves misconception buster (2^x vs x^2) · transformation family f(x), f(x)+k, f(x+k).
10. Conics with focus/directrix · tangent-and-normal drawn · area-under-curve via Integral() · partial sums visual · vectors in 3D.
11. Trig graphs with exploration · unit circle · derivative-as-slope dynamic point · inverse reflection across y=x · piecewise/modulus board graphs.
12. Statistics chart from class data · binomial distribution bars · locus demonstration · matrix transformation of the plane · Argand plane operations.
13. PhET sim lesson wrapper (official maths sims only) · 5-visual projector lesson for one chapter · predict-then-reveal routine · homework link pack + worksheet · exam-figure recreation from pasted question.
14. FLAGSHIPS: the universal "Graph Link That Opens Already Drawn" (WHAT THE CLASS WILL SEE with expected values → one-click link → Desmos fallback → 2 discussion questions → classroom tip) · geometry twin · 3D twin · photo exam-figure twin (needsImage) · student-homework exploration twin.

**phone-quizzes (5 briefs = 25):**
15. Exit ticket → complete Apps Script auto-marked Form + run instructions · chapter test → Wayground paste block + link-verified review copy · same quiz in THREE formats at once · Kahoot xlsx (95/60 limits) · Blooket CSV (answer 1–4).
16. Negative-marking JEE mock as Form · assertion-reason digital pack · integer-answer quiz (exact-match key) · daily 5-question phone DPP + leaderboard sheet formula · error-hunting quiz (pick the wrong line).
17. Concept-check poll with misconception options + teach notes · pre-class flipped quiz · parent-shareable practice protocol · revision quiz from a pasted formula sheet · mental-maths speed round.
18. Quiz from a PHOTO of a textbook page (needsImage) · recycle last year's paper into a phone mock · Set A/B/C difficulty-split scripts · bilingual maths vocabulary quiz · 3-2-1 reflection form script.
19. Full unit test as Form with sections + verified key · olympiad weekly challenge form · homework submission form with self-check links · Forms CSV results → item analysis + re-teach list · anonymous chapter feedback pulse.

## QA gate (mandatory, after generation)

1. Every promptText ends with the contract verbatim (`grep -c 'TOOL-LINK OUTPUT CONTRACT'` must equal the prompt count).
2. No `desmos.com` URL with a query string anywhere. No `mathsolver.microsoft.com`. No invented `geogebra.org/m/` IDs.
3. Click-test at least 3 example URLs per category in a real browser (one with `+`, one with `^`/`=`, one long).
4. No title duplicates an existing title in data/prompts.js.
5. After merging: `node tools/build-pages.mjs`, bump `?v=` in index.html, verify locally.
6. New prompts then need Hindi via the translation pipeline (tools/hindi-status.mjs → translate → tools/merge-hindi.mjs).
