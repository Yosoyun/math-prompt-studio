# HANDOFF — Maths Prompt Studio

Verified checkpoint: **2026-08-10**
Repository: `/Users/vanindra/Desktop/Code/automate x/math-prompt-studio`
Branch: `main`
Latest completed product milestone: **`efb95124` — Fix prompt discovery and add curated Surprise Studio**

This is the durable resume document for the project. Read it completely with `AGENTS.md` and `CONTINUITY.md` before changing code or content. Historical totals in `FINAL-REPORT.md` and old reports are not current product truth.

## The aim of the project

Maths Prompt Studio is a teacher-first production platform for turning a real teaching or study job into a dependable, fill-ready AI workflow.

It is not meant to be a pile of generic prompts. A teacher or learner should be able to:

- find the right job by search, category, group, exam, audience, or output format;
- understand what the prompt creates and how to use it;
- open a full, highly structured prompt instead of a vague summary;
- copy it or open it in an AI tool without losing the selected language;
- create solutions, independently checked answers, papers, worksheets, DPPs, quizzes, presentations, visuals, documents, feedback, plans, and revision resources;
- reach stable per-prompt pages through permanent URLs and redirects;
- use the platform in a complete, natural language experience only when that language meets the established quality bar.

The governing product promise is:

> Rich, classroom-ready workflows; honest mathematics; complete discovery; no fabricated exam claims; no partial languages; no generic Surprise results; no personal promotion or money solicitation.

The wider program is to finish multilingual Maths Prompt Studio, complete the governed Problem Bank milestones, build Physics, Chemistry, and Biology studios to the same standard, and run a final cross-studio quality sweep.

## Current verified state

| Area | State |
|---|---|
| Corpus | **961 prompts / 50 categories / 961 unique slugs** |
| Generated pages | **961 canonical pages + 71 redirect stubs = 1,032 `/p/` directories** |
| Sitemap | **962 URLs** |
| Cache | **v51** for styles, prompts, catalog, config, and app |
| English | **961/961, live** |
| Hindi | **961/961, remaining 0, live** |
| Bengali | **80/961, remaining 881, invalid 0, not live** |
| Marathi | **72/961, remaining 889, invalid 0, not live** |
| Telugu | **56/961, remaining 905, invalid 0, not live** |
| Curated Surprise | **8 outcome sections / 50 unique audited prompts** |
| Surprise digest | `sha256:e9cde8e4ba46ec2b39a8ff9faa851ac1251ad09d867401add8633ac254d4abd4` |
| Translation method | Working frontier LLM only; offline/local MT forbidden |
| Push state | Local only; **never push without explicit current approval** |

`data/catalog.js` is the runtime authority for language availability. Bengali, Marathi, and Telugu data remains intentionally inaccessible to users until complete.

## Product milestone completed in `efb95124`

### 1. All prompts are reachable

The default Browse All renderer had a real deduplication bug. It added every fresh/saved/recent candidate to the used set before applying the visible shelf limit. The page looked like it had 60 cards, but 438 unshown prompts were permanently excluded from the ordinary category stream. A user could reach at most 523 of 961 prompts.

The corrected renderer filters first, slices the visible shelf, and only then marks those displayed slugs as used.

Verified default accounting:

- 13 discovery cards + 47 ordinary cards = 60 initial cards;
- 60 unique initial slugs;
- 901 prompts remaining;
- Show more progresses in batches of 60;
- Show all produces exactly 961 cards and 961 unique slugs.

`tools/qa-library-discovery.mjs` protects this with 42 assertions, including fresh > 6, saved > 4, recent > 4, duplicate shelves, initial accounting, and full slug-union parity.

### 2. Prompt selection is now understandable

The library now has:

- a current `Showing X of Y` count;
- Show 60 more and Show all controls;
- an exact Category selector in addition to broad groups;
- explicit Exam, Audience, and Format labels;
- a visible Clear all action;
- accessible group semantics;
- clearer mobile chip overflow;
- a prominent `View full prompt + instructions` action;
- richer four-line card previews.

### 3. Surprise Studio is curated, rich, and selection-aware

The old implementation selected one random prompt from all 961. It ignored search and filters and had no quality bar.

The new Surprise Studio has eight outcome-led sections:

1. Solve with confidence
2. Unlock a stuck learner
3. Build a serious assessment
4. Make class memorable
5. Train for the exam
6. Save teacher hours
7. Create a standout resource
8. Give every learner agency

Its 50 prompts are manually allowlisted in `data/surprise-pools.json`. Each audited prompt is a long, structured workflow with concrete inputs, ordered phases, named output blocks, a genuine quality-control mechanism, complete facets, and a distinctive payoff. The gate strips any frozen tool contract before measuring richness and fails on missing/stale slugs, digest drift, weak structure, language gaps, placeholder drift, unsafe tool facts, fabrication bait, or verification theater.

Runtime selection:

- intersects the curated pool with the exact current search/category/group/exam/audience/format match set;
- excludes recent Surprise history and immediate repeats;
- uses deterministic seeded selection rather than uncontrolled `Math.random()`;
- keeps one rich preview outside the ordinary 60-card budget;
- disables sections with no eligible prompt;
- says so honestly when no curated prompt matches;
- uses Hindi content and chrome when Hindi is active;
- never silently broadens outside the user's selection.

### 4. Public UI is product-focused

Removed:

- founder/About biography;
- personal identity presentation;
- standalone Share/request section;
- payment/support solicitation copy;
- promotional Credits block;
- support/payment FAQ;
- personal WhatsApp, Instagram, and photo configuration;
- rating stars, visitor-name field, and personal contact side panel.

The remaining feedback form is neutral and contains only role plus message. Generated prompt-page footers now use neutral product navigation.

### 5. Accessibility and behavior

- Modal focus moves to the close button and restores the prior focus on close.
- Filter controls use group semantics rather than an incorrect tablist.
- The former sticky filter bar no longer covers controls/cards.
- Search retains an accessible label and live result count.

## Browser verification completed

Served at `http://127.0.0.1:8911/`:

- page title reports 961 prompts;
- default library: 60 cards, 60 unique, 901 remaining;
- Show all: 961 cards, 961 unique;
- search `wolfram`: 297 related matches in the current corpus;
- exact `verified-answers` category: 40 prompts;
- Hindi changes the library, cards, Surprise Studio, modal title/body, and copy action;
- Surprise opens a full Hindi prompt and focuses the modal close button;
- Handwritten 5-Method modal has one placeholder option plus 18 styles;
- JEE Advanced filter reports 194 prompts and selection-aware Surprise results;
- eight consecutive Surprise rerolls produced no immediate repeat;
- `/p/vintage-parchment-masterclass/` redirects to `/p/handwritten-5-method-solution-art/`;
- About and standalone Share sections are absent;
- feedback contains only `fbRole` and `fbMsg`;
- browser console: no errors.

## Passed gates at this checkpoint

```bash
/opt/homebrew/bin/node --check app.js
/opt/homebrew/bin/node -e "new Function(require('fs').readFileSync('app.js','utf8'))"
/opt/homebrew/bin/node tools/qa-library-discovery.mjs
/opt/homebrew/bin/node tools/qa-surprise.mjs
/opt/homebrew/bin/node tools/build-catalog.mjs --check
/opt/homebrew/bin/node tools/build-pages.mjs --dry-run
/opt/homebrew/bin/node tools/hindi-status.mjs
/opt/homebrew/bin/node tools/lang-status.mjs --lang bn
/opt/homebrew/bin/node tools/lang-status.mjs --lang mr
/opt/homebrew/bin/node tools/lang-status.mjs --lang te
/opt/homebrew/bin/node tools/repair-hindi-invariants.mjs --check
git diff --check
```

Key outputs:

- library discovery QA: `ok:true`, 42 assertions, final 961;
- Surprise QA: 8 sections, 50 unique curated prompts, current digest;
- compact catalog: 961 prompts, English/Hindi live, incomplete languages blocked;
- baked-page dry run: 961 canonical pages;
- Hindi invariant: clean;
- all incomplete languages: invalid 0.

## Historical full-phase gates that are not current green gates

Do not claim all full-phase scripts pass.

- `tools/qa-phase1.mjs` is a historical gate hardcoded for 848 prompts, 45 categories, cache v22, the old About section, and the old sticky-filter behavior. It fails against the intentionally evolved product.
- `tools/qa-phase2.mjs` is hardcoded to cache v23. It currently fails only its obsolete cache-reference expectations.
- `tools/qa-phase3.mjs` correctly fails while Bengali, Marathi, and Telugu are incomplete and while the data version remains `2026-07-17-phase2-formats-pyq-segments`. It also still expects the removed About/identity baseline, which conflicts with the owner's explicit product-removal instruction.
- The earlier Phase 3 cache-parity defect (`50,15`) is fixed. `tools/bump-cache.mjs` now bumps all five first-party assets together, and the current index uses v51 everywhere.

Do not weaken the historical gates to make them green. At the relevant exit milestone, either replace them with a newly governed consolidated gate or update them only under an explicit accepted specification.

## Uncommitted translation drafts — preserve exactly

The working tree intentionally contains only these two untracked translation drafts after the product commit:

### Bengali batch 010

Path: `_handoff/phase3-batches/bn/batch-010.json`

- Contains records 1–4 of `_handoff/bn-todo/chunk-10.json`.
- Those four records pass `qa-lang-batch`.
- Complete the remaining four:
  - `Quick Class Test (20 Marks, 30 Minutes)`
  - `Half-Yearly Examination Paper with Full Coverage`
  - `Pre-Board Paper at Final-Exam Difficulty`
  - `Assertion-Reason Question Paper`

### Telugu batch 007

Path: `_handoff/phase3-batches/te/batch-007.json`

- Contains records 1–4 of `_handoff/te-todo/chunk-7.json`.
- Those four records pass `qa-lang-batch`.
- Complete the remaining four:
  - `Careless Slip or Real Misconception? (diagnose the cause)`
  - `Rewrite the Corrected Solution (full marks model)`
  - `Turn a Wrong Answer into a Teaching Moment`
  - `Rank 3 Student Answers (best to weakest)`

### Marathi batch 009

No draft exists. Translate all eight records from `_handoff/mr-todo/chunk-9.json` into `_handoff/phase3-batches/mr/batch-009.json`.

Never stage one of the partial drafts in another language's commit.

## Exact next work: Phase 3 translations

### Start each shell

```bash
cd "/Users/vanindra/Desktop/Code/automate x/math-prompt-studio"
export PATH="/opt/homebrew/bin:$PATH"
git branch --show-current
git status -sb
node tools/hindi-status.mjs
node tools/lang-status.mjs --lang bn
node tools/lang-status.mjs --lang mr
node tools/lang-status.mjs --lang te
```

Expected starting state:

- branch `main`;
- Hindi 961/961;
- Bengali 80/961;
- Marathi 72/961;
- Telugu 56/961;
- two untracked partial drafts above.

### Complete and gate one batch

Example for Bengali batch 010:

```bash
node tools/qa-lang-batch.mjs --lang bn --input _handoff/phase3-batches/bn/batch-010.json
node tools/review-lang-batch.mjs --lang bn --source _handoff/bn-todo/chunk-10.json --input _handoff/phase3-batches/bn/batch-010.json
node tools/merge-lang.mjs --lang bn _handoff/phase3-batches/bn/batch-010.json
```

Equivalent language paths apply to Marathi and Telugu. The review script is a candidate report; the working frontier LLM must still compare all eight records semantically. A partial batch may pass mechanical QA but must not be merged until the source chunk is fully represented.

### Post-merge loop

```bash
node tools/lang-status.mjs --lang <bn|mr|te>
node tools/bump-cache.mjs
node tools/build-pages.mjs
node tools/build-catalog.mjs
node tools/build-catalog.mjs --check
node tools/qa-library-discovery.mjs
node tools/qa-surprise.mjs
node tools/hindi-status.mjs
node tools/lang-status.mjs --lang bn
node tools/lang-status.mjs --lang mr
node tools/lang-status.mjs --lang te
node tools/repair-hindi-invariants.mjs --check
node -e "new Function(require('fs').readFileSync('app.js','utf8'))"
git diff --check
git status --short
```

Stage the exact accepted batch plus the generated corpus/catalog/pages/cache changes. Keep the other partial draft unstaged. Commit one language batch with a clear local message. Never push.

There are 121 source chunks per language: 120 eight-record chunks and chunk 120 with one record. Continue until every language reports `remaining: 0 | invalid: 0`.

## Language activation

Activate Bengali, Marathi, and Telugu one at a time only after that language is 961/961. Rebuild and verify:

- its chip becomes live;
- cards and Surprise chrome change language;
- search uses translated text;
- modal, instructions, copy text, and AI-open text are complete;
- style-picker dropdown remains correct;
- placeholders are unchanged;
- English, Hindi, and earlier activated languages do not regress;
- browser console has no errors.

Commit each activation separately.

## Program order after translation work

The durable composition order is:

1. Main Phase 0 — professional product audit. Committed.
2. Main Phase 1 — design and UX overhaul. Committed.
3. Main Phase 2 — categorization, output formats, and segment coverage. Committed.
4. Problem Bank M1–M4, in order.
5. Main Phase 3 — Bengali, Marathi, Telugu. In progress.
6. Problem Bank M5.
7. Main Phase 4 — Physics Studio.
8. Main Phase 5 — Chemistry Studio.
9. Main Phase 6 — Biology Studio.
10. Main Phase 7 — final sweep and report.

The detailed M1–M5 acceptance brief is absent from this checkout. This is a known composition debt: do not invent it, do not mark M1–M4 complete, and do not start M5 without the governing brief.

## Hard stops

- Never expose the protected owner identity.
- Never restore personal promotion or solicitation UI.
- Never push without explicit current approval.
- Never hand-edit `data/prompts.js`.
- Never delete a prompt without a redirect.
- Never change placeholders.
- Never ship partial or offline-MT language data.
- Never weaken a gate.
- Never fabricate exam/tool facts.
- If the same real blocker fails three genuine attempts, document it under `UNRESOLVED` in `NEXT-REPORT.md`.

## Resume summary

The public library/Surprise/feedback milestone is complete and locally committed. No prompt was deleted. No redirect was removed. Hindi is complete. The next production action is to finish one of the three pending frontier-authored translation batches, merge it through `merge-lang.mjs`, run the full incremental loop, and commit only that language batch.
