# HANDOFF — Maths Prompt Studio platform build (state as of 2026-07-16 evening)

This file is the single source of truth for continuing this project with ANY agent/LLM (Codex, Claude, etc.). Read this + `AGENTS.md` completely before touching anything. Everything below was verified working locally on 2026-07-16.

## What this project is now

One bilingual platform for mathematics teachers/students (JEE Main, JEE Advanced, Olympiad, Boards, Foundation): a 573-prompt AI-prompt library with language toggle, discovery rows, exam/audience filters, a tools directory, and a hub linking the owner's other maths properties (all on the same `yosoyun.github.io` domain). Owner: uses ALLEN-related properties separately — NEVER merge or reference ALLEN here.

## Current state — DONE and verified locally (uncommitted work is now committed on `main`, NOT pushed)

| Area | State |
|---|---|
| Corpus | **573 prompts / 33 categories** in `data/prompts.js` (was 589: −23 verified duplicates, −48 art prompts → 2 style-picker masters, +53 absorbed from the owner's old libraries). 71 redirect stubs protect removed URLs (`data/redirects.json`). |
| Owner's name | Removed from ALL pages and ALL prompt outputs per owner instruction. Signatures are `[YOUR NAME]` placeholders. Name appears ONLY in the About section (+ invisible `meta name="author"` / JSON-LD). **Never reintroduce it.** |
| Bilingual | Header one-tap switch: English (default) / हिंदी live; বাংলা / मराठी / తెలుగు shown as "coming soon". **238/573 prompts have verified Hindi** (`hi` object per prompt). Baked pages have a per-page Hindi button when `hi` exists. |
| Facets | All 573 prompts tagged: `exams` (any 374 / boards 163 / foundation 57 / jee-main 44 / olympiad 39 / jee-advanced 34) and `aud` (teacher 438 / both 106 / student 29). Filter chips row live (verified counts: students 135, teachers 544). |
| Discovery | 🔥 Most important (12 `featured`) + ✨ Recently added (53 `added`) rows + 🎲 random-prompt button. |
| Search | Synonym fallback for ~30 tool names (wolfram→67 related etc.), Hindi text searchable, suggestion chips on zero results. |
| Platform hub | `#more` section: 5 bilingual module cards (Prompts / Problem Atlas / Masterbooks / Olympiad Corner / Teacher Tools) + `#toolbox`: 16 verified external tool cards. "Platform" in header nav. |
| Style pickers | `handwritten-styles` and `solution-posters` categories each = 1 master prompt with a `styles` array (18/30 styles); the modal renders a `<select>` for the `[STYLE]` token. |
| Deployed live | ONLY the synonym search + count fixes (commits `ed6a649`, `b1121a3`). Everything else is local. |

## REMAINING WORK — in priority order, with exact instructions

### 1. Finish Hindi translations (335 remaining)
- `node tools/hindi-status.mjs --chunks` → writes `_handoff/hindi-todo/chunk-*.json` (8 prompts each, 42 chunks currently).
- Translate each chunk following the RULES in `AGENTS.md` §Translation (placeholders untouched is rule #1).
- Produce JSON per the input format of `tools/merge-hindi.mjs`, then run `node tools/merge-hindi.mjs <file>` — it enforces the QA gate and reports rejects. Fix rejects, re-run.
- When total shows 573/573: `node tools/build-pages.mjs`, bump `?v=` on `prompts.js` and `app.js` in index.html (current: v=19 → v=20).

### 2. Generate the 95 tool-linked prompts
- Full spec: `_handoff/toolpack-briefs.md` (19 briefs × 5 prompts, 3 new categories, hard tool facts, QA gate). Contract text: `_handoff/tool-link-contract.txt`. Broader context: `_handoff/pack-design.md` and `_handoff/tools-research.md`.
- After merging into `data/prompts.js`: add facet tags + `added` date, rebake, then translate the new prompts to Hindi (pipeline in step 1).

### 3. Deploy (needs the owner's explicit OK)
- `git push origin main` on this repo → GitHub Pages live in ~2 min.
- Verify live: title shows current count, search "wolfram" returns related prompts, हिंदी chip works, one redirect stub (e.g. `/p/vintage-parchment-masterclass/`) forwards.

### 4. Retire the merged-away sites (each push needs the owner's OK, one by one)
- `ai-prompt-library-for-teachers`: its 132 maths prompts were absorbed (53 kept after dedupe). Replace the site with a redirect page to this platform; keep non-maths content decision with the owner.
- `limits-masterbook` repo: duplicate of the limits book inside `ranker-masterbooks` → redirect. The Vercel deployment (`limits-masterbook.vercel.app`) must be retired from the owner's Vercel dashboard (manual).
- `jee-problem-atlas`: already a redirect; leave.

### 5. Later waves (designed, not started)
- Remaining 180 tool-linked prompts (categories 4–12 in `_handoff/pack-design.md`).
- বাংলা / मराठी / తెలుగు translations (same pipeline as Hindi; flip `live: true` in the `LANGS` array in app.js; the `hi` data model generalises — add `bn`/`mr`/`te` objects and extend `T()` in app.js).
- Module-site unification: shared header on ranker-masterbooks / problem-atlas maths pages.
- amc8-math-app and ranker-os: merge ONLY after ranker-os content passes independent verification (owner decision).

## Key numbers the owner cares about
- The audit that started all this: 44-agent deep audit, 267 problems, full report at https://claude.ai/code/artifact/de124fcb-d202-4c36-9168-27ac06034214 (owner's private artifact).
- Verified-only quality bar: every deletion was adversarially verified (23 true duplicates of 164 suspected); every Hindi translation passes a mechanical placeholder gate; every tool deep-link pattern was live-verified (see `_handoff/tools-research.md` — Desmos has NO URL prefill; Microsoft Math Solver is dead).
