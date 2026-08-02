# HANDOFF — Maths Prompt Studio program

Current verified checkpoint: **2026-08-02**, local branch `main`.

This is the durable resume document for the whole program. Read it completely together with `AGENTS.md` and `CONTINUITY.md` before changing code or content. The older totals in `README.md` and `FINAL-REPORT.md` describe historical checkpoints; they are not the current state.

## The full aim of this project

Maths Prompt Studio is being built as a trustworthy, teacher-first production platform, not as a loose collection of AI prompts.

The product should let a mathematics teacher or student quickly find a dependable workflow, fill in a few details, and produce useful classroom or study material: worked solutions, verified answers, question papers, worksheets, DPPs, quizzes, presentations, visual material, documents, feedback, planning, and exam-preparation resources. Discovery, search, exam/audience/output-format filters, tool guidance, per-prompt pages, redirects, and multilingual use are all part of the product.

The quality goal is equally important: every prompt must be complete, practical, mathematically responsible, honest about verification, safe from fabricated exam claims, and usable by teachers who are not technical. No language may be exposed with lower-quality or partial translations.

The wider program is to grow this foundation into a connected education suite:

1. Finish the multilingual Maths Prompt Studio at the established Hindi quality bar.
2. Complete the governed Problem Bank milestones without inventing missing acceptance criteria.
3. Build the Physics, Chemistry, and Biology Prompt Studios to the same standard.
4. Run a final cross-studio quality, continuity, redirect, and browser-verification sweep.

The governing principle is simple: **never ship below the bar**.

## Sources of truth and conflict rule

- `HANDOFF.md` records the current repository state and exact resume point.
- `AGENTS.md` contains the non-negotiable repository, data, translation, safety, cache, and push rules.
- `CONTINUITY.md` contains the Quality Constitution and full program composition order.
- The active phase brief supplies phase-specific acceptance criteria. The detailed Problem Bank M1–M5 brief is not present in this checkout.
- If an old report conflicts with these files, use this handoff and the current code/status tools.
- If a governing acceptance criterion is missing, do not invent it and do not claim the milestone complete.
- Preserve existing data and stop below-bar work instead of weakening a gate.

## Current verified product state

| Area | Verified state |
|---|---|
| Repository | `/Users/vanindra/Desktop/Code/automate x/math-prompt-studio` |
| Branch | `main`, tracking `origin/main`; local work is ahead and must not be pushed without explicit approval |
| Last completed production milestone | `3f43a0df` — `Translate Marathi batch 008` |
| Corpus | **961 prompts / 50 categories** in `data/prompts.js` |
| Generated site | 961 canonical prompt pages + 71 redirect stubs = 1,032 `/p/` directories; sitemap has 962 URLs |
| Cache | `data/prompts.js?v=50`, `data/catalog.js?v=50`, and `app.js?v=50` |
| English | 961/961 valid, live |
| Hindi | **961/961 valid, remaining 0, live** |
| Bengali | **80/961 valid, remaining 881, invalid 0, not live** |
| Marathi | **72/961 valid, remaining 889, invalid 0, not live** |
| Telugu | **56/961 valid, remaining 905, invalid 0, not live** |
| Main program | Phases 0, 1, and 2 committed; Phase 3 multilingual completion is active |
| Translation method | Frontier LLM authored only; local/offline MT is forbidden |
| Unresolved gate failures | None at this checkpoint |

`data/catalog.js` is the current language-availability authority. `app.js` reads its `languageStatus`; incomplete Bengali, Marathi, and Telugu data is present only for production work and remains blocked from users.

## Current uncommitted work — preserve it

Only these two untracked draft files existed at the checkpoint:

- `_handoff/phase3-batches/bn/batch-010.json`
  - Contains the first 4 of 8 records from `_handoff/bn-todo/chunk-10.json`.
  - The four present records pass `qa-lang-batch`.
  - Finish these titles: `Quick Class Test (20 Marks, 30 Minutes)`; `Half-Yearly Examination Paper with Full Coverage`; `Pre-Board Paper at Final-Exam Difficulty`; `Assertion-Reason Question Paper`.
- `_handoff/phase3-batches/te/batch-007.json`
  - Contains the first 4 of 8 records from `_handoff/te-todo/chunk-7.json`.
  - The four present records pass `qa-lang-batch` after the `VERIFY` anchors were corrected.
  - Finish these titles: `Careless Slip or Real Misconception? (diagnose the cause)`; `Rewrite the Corrected Solution (full marks model)`; `Turn a Wrong Answer into a Teaching Moment`; `Rank 3 Student Answers (best to weakest)`.
- Marathi batch 009 has not been started. Its source is `_handoff/mr-todo/chunk-9.json`; translate all 8 records into `_handoff/phase3-batches/mr/batch-009.json`.

Do not discard, overwrite, or accidentally stage one language's partial draft in another language's commit.

## Immediate work: finish Phase 3 translations

There are 121 source chunks per language: 120 chunks of 8 prompts and a final one-record chunk. Continue in batches of about 8, using the working frontier LLM itself.

### Start every shell session

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

Expected branch is `main`. At this checkpoint Hindi prints `961 | remaining: 0`; Bengali 80, Marathi 72, and Telugu 56 complete.

### Translation quality rules

- Author every translation directly. NLLB, MADLAD, Marian, IndicTrans, or any other local/offline translation model is forbidden.
- Translate the full title, `whatYouGet`, `howToUse`, every `effectiveUsage` item, `commonFix`, and full `promptText`. Never summarise.
- Preserve every `[PLACEHOLDER]` character-for-character, including brackets, spelling, case, spaces, and English text.
- Preserve URLs, tool names, filenames, code, numbers, and protected English product/file terms.
- Use a natural respectful teacher register: Bengali `আপনি`, Marathi `आपण`, Telugu `మీరు`.
- Put the English technical anchor on first use where required.
- Keep structural labels in the required form, such as `ভূমিকা (ROLE):`, `भूमिका (ROLE):`, or `పాత్ర (ROLE):`.
- Use the natural language equivalent of `Prepared by`, while preserving `[YOUR NAME]` exactly.
- Preserve paragraph and line structure closely enough for semantic and mechanical review.

### Gate and merge one complete batch

Replace the language and batch numbers in these commands:

```bash
node tools/qa-lang-batch.mjs --lang bn --input _handoff/phase3-batches/bn/batch-010.json
node tools/review-lang-batch.mjs --lang bn --source _handoff/bn-todo/chunk-10.json --input _handoff/phase3-batches/bn/batch-010.json
node tools/merge-lang.mjs --lang bn _handoff/phase3-batches/bn/batch-010.json
```

Before the merge, the working LLM must also read the English source and translation semantically. The QA and review scripts are necessary gates, not substitutes for that read. Fix every reject and re-run. Never edit, bypass, or weaken a QA script.

After a zero-reject merge:

```bash
node tools/lang-status.mjs --lang bn
node tools/bump-cache.mjs
node tools/build-pages.mjs
node tools/build-catalog.mjs
node tools/build-catalog.mjs --check
node tools/hindi-status.mjs
node tools/lang-status.mjs --lang bn
node tools/lang-status.mjs --lang mr
node tools/lang-status.mjs --lang te
node tools/repair-hindi-invariants.mjs --check
node -e "new Function(require('fs').readFileSync('app.js','utf8'))"
git diff --check
git status --short
```

Stage the exact accepted batch and only its generated product changes. The usual generated set is `data/prompts.js`, `data/catalog.js`, `app.js`, `index.html`, and `p/`. Inspect before staging, then commit one accepted language batch with a clear message such as `Translate Bengali batch 010`. Never push.

## Phase 3 completion and language activation

For each of Bengali, Marathi, and Telugu, continue until its status prints `remaining: 0` and `invalid: 0` across all 961 prompts.

Activate one completed language at a time. The current implementation derives `live` from the validated `data/catalog.js` language status; do not add a manual override that exposes partial data. Rebuild the catalog and pages, then verify in a real local browser that:

- the header language chip is enabled and flips cards;
- search uses that language's searchable text;
- the modal is fully translated;
- style-picker text and dropdown remain correct;
- copy text contains the full selected translation;
- ChatGPT/Claude open actions use that translated text;
- English, Hindi, and previously activated languages still work;
- the browser console has no errors.

Commit each language activation separately. A language is not complete merely because its data exists; it is complete only after the full status, build, and browser gate passes.

## Program roadmap after the current translation phase

The canonical composition order remains:

1. Main Phase 0 — professional product audit. **Committed.**
2. Main Phase 1 — design and UX overhaul. **Committed.**
3. Main Phase 2 — categorization, output formats, and segment coverage. **Committed.**
4. Problem Bank M1–M4, in order.
5. Main Phase 3 — Bengali, Marathi, and Telugu completion. **In progress.**
6. Problem Bank M5.
7. Main Phase 4 — Physics Prompt Studio.
8. Main Phase 5 — Chemistry Prompt Studio.
9. Main Phase 6 — Biology Prompt Studio.
10. Main Phase 7 — final sweep and report.

The detailed Problem Bank M1–M5 acceptance criteria are absent from this checkout, so their completion cannot currently be verified. Do not invent them, silently skip them, or claim them done. Obtain the governing Problem Bank brief and audit M1–M4 before advancing to M5 or the science studios.

## Known checkpoint discrepancies — not waived

- `node tools/qa-phase3.mjs` currently fails, as it should while Bengali, Marathi, and Telugu are incomplete and the data version still identifies Phase 2. Use the per-batch gates during production, but do not report the full Phase 3 gate as clean until all three languages are complete.
- The full Phase 3 gate also reports `index cache versions differ: 50, 15` because its parity scan sees the older `config.js?v=15` reference while the content/application bundles are on v50. This is a real Phase 3 exit item: investigate and resolve it deliberately before final activation; do not suppress or weaken the assertion.
- Legacy baseline references to the protected owner identity still exist outside the About section in historical documentation and maintenance-source files. They pre-date this checkpoint. Do not copy, regenerate, or add any such reference, and include a deliberate baseline cleanup/audit before the final sweep rather than assuming the repository is already clean.

## Hard stops

- Never place the protected owner identity outside the existing About section of `index.html`.
- Never push without explicit approval in the current conversation.
- Never hand-edit `data/prompts.js`.
- Never delete a prompt without adding its old slug to `data/redirects.json`.
- Never weaken or bypass translation, content, catalog, syntax, or browser gates.
- Never ship partial or machine-translated language data.
- Never merge or mention the separately governed institutional properties in this platform.
- Never fabricate exam patterns, marks distributions, trends, PYQ authenticity, or tool capabilities.
- If the same gate item fails three genuine attempts, record the evidence under `UNRESOLVED` in `NEXT-REPORT.md` and proceed only as the governing brief allows.

## Important implementation map

- `index.html` — static shell and sections.
- `app.js` — rendering, discovery, search, filters, languages, modal, copy/open flows.
- `data/prompts.js` — complete generated prompt corpus; never hand-edit.
- `data/catalog.js` — compact runtime catalog and language availability.
- `data/redirects.json` — permanent old-slug protection.
- `p/` — generated canonical prompt pages and redirect stubs.
- `tools/build-pages.mjs` — rebuilds prompt pages, redirects, and sitemap.
- `tools/build-catalog.mjs` — validates/builds the compact catalog and language status.
- `tools/lang-status.mjs` — reports Bengali/Marathi/Telugu completeness.
- `tools/qa-lang-batch.mjs` — per-batch mechanical/script/placeholder gate.
- `tools/review-lang-batch.mjs` — source-to-translation semantic review aid.
- `tools/merge-lang.mjs` — the only production merge path for Bengali/Marathi/Telugu.
- `tools/repair-hindi-invariants.mjs --check` — proves completed Hindi has not regressed.
- `_handoff/bn-todo`, `_handoff/mr-todo`, `_handoff/te-todo` — immutable source chunks.
- `_handoff/phase3-batches/<lang>` — reviewed translation batch files and current work.

## Known clean checkpoint

- Hindi invariant check is clean at 961/961.
- Bengali, Marathi, and Telugu report zero invalid production records.
- Accepted production batches are Bengali 000–009, Marathi 000–008, and Telugu 000–006.
- No translation reject remains unresolved.
- Prohibited local/offline MT tooling and experimental outputs were removed; none may re-enter production.
- The full `tools/qa-phase3.mjs` gate is not yet clean; its expected coverage/version failures and the cache-parity exit item are recorded above.
- The task remains intentionally local. **Do not push.**
