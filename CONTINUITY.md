# Maths Prompt Studio Continuity

This file records the non-negotiable quality rules and execution order for the continuing studio program. `HANDOFF.md`, `AGENTS.md`, the active program brief, and this file must all be read before work resumes. When requirements conflict, preserve data and stop below-bar work rather than weakening a gate.

## Quality Constitution

- Never ship below the established Hindi-corpus quality bar. Full translations are required; summaries, fluent filler, and mechanical paraphrases are rejects.
- All translations are produced by the working frontier LLM itself, exactly like the Hindi corpus. Local/offline MT models (NLLB, MADLAD, Marian, etc.) are forbidden — they cannot meet the register and convention rules. This applies to every current and future language and studio.
- Translation batches contain about eight prompts and enter `data/prompts.js` only through the appropriate untouched or approved merge gate. Every reject is fixed and re-run; gates are never bypassed, weakened, or edited to admit bad text.
- Bengali uses a natural respectful teacher register (`আপনি`), Marathi uses `आपण`, and Telugu uses `మీరు`. Technical terms retain the required English first-use anchors, protected English product/file terms stay unchanged, every placeholder is copied exactly, structural labels retain their English anchor, and every field is translated in full.
- A language becomes live only after its status reports complete, its generated catalog/page data is fresh, and browser checks confirm cards, modal text, copy text, open text, and search behavior in that language.
- Never write the protected owner identity outside the existing About section. Never push. Commit locally at each required milestone. Never delete a prompt without a redirect for its slug.
- If the same gate item fails three genuine attempts, record the evidence under `UNRESOLVED` in `NEXT-REPORT.md` and continue only as the governing brief permits.

## Program composition order

The main studio phases and Problem Bank milestones compose in this order:

1. Main Phase 0 — professional product audit.
2. Main Phase 1 — design and UX overhaul.
3. Main Phase 2 — categorization, output formats, and segment coverage.
4. Problem Bank M1, M2, M3, and M4, in order.
5. Main Phase 3 — Bengali, Marathi, and Telugu completion.
6. Problem Bank M5.
7. Main Phase 4 — Physics Prompt Studio.
8. Main Phase 5 — Chemistry Prompt Studio.
9. Main Phase 6 — Biology Prompt Studio.
10. Main Phase 7 — final sweep and report.

The detailed M1–M5 acceptance criteria are not present in this checkout. They must be taken from the governing Problem Bank brief when it is supplied; do not invent or silently omit them.

## Current checkpoint

- Main Phases 0, 1, and 2 are locally committed.
- Main Phase 3 infrastructure and Hindi invariant repair are in progress and uncommitted.
- Bengali, Marathi, and Telugu production coverage remains zero until frontier-LLM batches pass the merge gate.
- No local/offline MT output is permitted in production data.
