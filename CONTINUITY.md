# CONTINUITY — quality constitution and program map

This file preserves the long-horizon rules for Maths Prompt Studio and its future sibling studios. Read it with `HANDOFF.md`, `AGENTS.md`, and the active phase brief before resuming.

## Product constitution

- Build a trustworthy teacher-production platform, not a generic prompt directory.
- Every prompt must solve a specific teaching or learning job with rich inputs, ordered work, named output blocks, real quality control, and an immediately usable artifact.
- Complete discovery is a product invariant: every canonical prompt must be reachable through normal browsing and exact filters.
- Surprise discovery is curated. It must use reviewed, distinctive prompts and honor the user's current selection. Random generic prompts are below the bar.
- Mathematical checking must be honest. Never substitute self-awarded “verified” language for independent reasoning or a teacher-checkable external tool.
- Exam claims, trends, authentic-PYQ labels, distributions, ranks, and tool capabilities must never be fabricated.
- The public experience remains product-focused: no founder identity, personal promotion, payment/support appeal, or share-pressure section.
- Stable slugs and redirects are permanent user contracts.

## Translation quality constitution

- Never ship below the established Hindi-corpus quality bar.
- All translations are produced by the working frontier LLM itself, exactly like the Hindi corpus.
- Local/offline MT models such as NLLB, MADLAD, Marian, and IndicTrans are forbidden. They cannot meet the register, structure, terminology, and placeholder rules. This applies to every current and future language and studio.
- Translate complete fields and complete prompt bodies. Summaries, mechanical paraphrases, untranslated filler, and structure loss are rejects.
- Preserve the full placeholder multiset character-for-character.
- Preserve URLs, tools, code, filenames, numbers, protected English terms, structural-label anchors, and required line structure.
- Use respectful teacher register: Bengali `আপনি`, Marathi `आपण`, Telugu `మీరు`.
- Batches contain about eight prompts and enter production only through the approved QA, semantic review, and merge path.
- A language becomes live only after 961/961 completion, zero invalid records, fresh catalog/pages/cache, and a real browser check of cards, search, modal, copy/open text, and style-picker behavior.

## Engineering constitution

- Never hand-edit `data/prompts.js`.
- Never delete a prompt without adding its slug to `data/redirects.json`.
- Never bypass or weaken a gate.
- Keep all five first-party asset cache versions equal by using `tools/bump-cache.mjs`.
- Keep curated Surprise assignments in `data/surprise-pools.json`; a digest change requires deliberate human/LLM re-review.
- Protect complete library reachability with `tools/qa-library-discovery.mjs`.
- Protect Surprise richness and source integrity with `tools/qa-surprise.mjs`.
- Commit accepted milestones locally and never push without explicit current approval.
- Preserve partial drafts and unrelated dirty-tree work.
- After three genuine failures of the same blocking item, record evidence under `UNRESOLVED` in `NEXT-REPORT.md`.

## Program composition order

1. Main Phase 0 — professional product audit.
2. Main Phase 1 — design and UX overhaul.
3. Main Phase 2 — categorization, output formats, and segment coverage.
4. Problem Bank M1, M2, M3, and M4, in order.
5. Main Phase 3 — Bengali, Marathi, and Telugu completion.
6. Problem Bank M5.
7. Main Phase 4 — Physics Studio.
8. Main Phase 5 — Chemistry Studio.
9. Main Phase 6 — Biology Studio.
10. Main Phase 7 — final cross-studio sweep and report.

The detailed Problem Bank M1–M5 acceptance criteria are not present in this checkout. Do not invent, silently skip, or claim them complete.

## Current checkpoint — 2026-08-10

- Branch: `main`; local-only work, never push without approval.
- Product milestone: `efb95124` — complete library reachability, curated Surprise Studio, exact category/facet selection improvements, neutral feedback, personal/solicitation section removal, accessibility fixes.
- Corpus: 961 prompts, 50 categories, 961 unique slugs.
- Generated site: 961 canonical prompt pages, 71 redirect stubs, sitemap 962 URLs.
- Cache: v51 across styles, prompts, catalog, config, and app.
- English: 961/961, live.
- Hindi: 961/961, live, invariant clean.
- Bengali: 80/961, invalid 0, blocked.
- Marathi: 72/961, invalid 0, blocked.
- Telugu: 56/961, invalid 0, blocked.
- Accepted batches: Bengali 000–009, Marathi 000–008, Telugu 000–006.
- Partial drafts to preserve: Bengali batch 010 has four records; Telugu batch 007 has four records. Marathi batch 009 is not started.
- Curated Surprise: eight sections, 50 unique reviewed prompts, current digest recorded in `HANDOFF.md`.
- Library regression gate: 42 assertions; 60 initial unique cards; all 961 reachable.
- No unresolved translation reject.
- Full Phase 3 remains incomplete by design. Its older monolithic gate also carries obsolete About expectations; do not claim it is green.

## Immediate continuation

Finish and merge one complete Bengali, Marathi, or Telugu batch using only the frontier LLM and the untouched language gates. Rebuild, run the incremental catalog/page/library/Surprise/Hindi/language/syntax gates, stage only that language's accepted work, commit locally, and repeat until all three languages are complete.
