# AGENTS.md — non-negotiable operating rules

Read `HANDOFF.md` and `CONTINUITY.md` completely before changing this repository. This file is the binding rulebook; the current phase brief supplies any additional phase-specific acceptance criteria.

## Absolute rules

1. **Do not write or display the protected owner identity anywhere.** The public About/founder section has been removed. Use `[YOUR NAME]` inside prompt templates and neutral product language everywhere else. Do not copy legacy identity text from old reports.
2. **Never hand-edit `data/prompts.js`.** It is generated production data. Translation changes enter through the approved merge scripts. Structural prompt/category changes must be performed by a purpose-built Node script and then rebuilt.
3. **Never delete a prompt without a permanent redirect.** Add the deleted slug to `data/redirects.json` and point it to the surviving canonical slug before rebuilding.
4. **Placeholders are sacred.** Every `[PLACEHOLDER IN SQUARE BRACKETS]` must remain character-for-character identical, including brackets, spelling, case, spaces, punctuation, and repeated occurrences.
5. **Gates are law.** Fix rejects and rerun. Never bypass, weaken, edit, or special-case a QA gate merely to admit failing content.
6. **No verification theater.** A prompt must not ask an AI to award itself a “verified” mark. Real checking means independent mathematics plus an honest teacher-checkable tool link or manual check.
7. **No fabrication bait.** Do not ask for invented PYQs, “latest exam pattern” claims, unsupported trends, mark distributions, cut-offs, ranks, shifts, years, or sources. Generated practice must be labelled as original practice.
8. **Hard tool facts stay frozen until re-verified in a live browser.**
   - Never construct a Desmos URL with expression parameters; provide typed-line instructions instead.
   - Never use `mathsolver.microsoft.com`.
   - Google Forms may be generated only through Google Apps Script code blocks.
   - Wayground, Kahoot, and Blooket use paste/file-import workflows only.
   - Preserve the frozen tool-link contract where a prompt requires it.
9. **Keep separately governed institutional properties separate.** Do not merge, link, or cross-brand their content into this platform.
10. **No local/offline machine translation.** NLLB, MADLAD, Marian, IndicTrans, and similar MT systems are forbidden for every current and future language/studio. Translation is authored by the working frontier LLM.
11. **No personal promotion or solicitation UI.** Keep feedback neutral and functional. Do not restore founder biography, personal-name fields, payment/support appeals, share-pressure sections, personal social links, or promotional credits.
12. **Never push without explicit approval in the current conversation.** Local commits are required at accepted milestones. Never infer push permission from an earlier conversation.

## Prompt quality rules

- Prompts must be complete production workflows, not generic “make/explain X” requests.
- A strong prompt states the job and audience, requires concrete inputs, uses ordered phases, names the output blocks, includes a real pedagogical or production mechanism, and finishes with a genuine quality-control step.
- Preserve level/exam/context adaptation, mathematical domain restrictions, notation, and human-review boundaries.
- Never shorten a rich prompt to make translation or maintenance easier.
- Every tool-linked prompt must obey the hard tool facts and any frozen contract suffix exactly.
- `data/surprise-pools.json` is a human-curated allowlist, not an automatic popularity list. Do not add a prompt because it is merely long or featured. A candidate needs distinctive value and must pass `tools/qa-surprise.mjs`.
- The Surprise Studio must always intersect its allowlist with the active search, category, group, exam, audience, output-format, and live-language state. It must never silently escape a user's filters.

## Translation rules

These rules apply to Hindi, Bengali, Marathi, Telugu, and future languages.

- Translate the full `title`, `whatYouGet`, `howToUse`, every `effectiveUsage` item, `commonFix`, and the complete `promptText`. Never summarise.
- Preserve every placeholder exactly and preserve its full occurrence multiset.
- Preserve URLs, filenames, code, numbers, tool/product names, and protected English terms such as Worksheet, DPP, MCQ, PDF, WhatsApp, and ChatGPT where the language convention requires them.
- Use a natural respectful teacher register:
  - Hindi: `आप`
  - Bengali: `আপনি`
  - Marathi: `आपण`
  - Telugu: `మీరు`
- Give a natural local-language technical term with its English anchor on first use where required.
- Keep structural labels in the established form, for example:
  - Hindi/Marathi: `भूमिका (ROLE):`
  - Bengali: `ভূমিকা (ROLE):`
  - Telugu: `పాత్ర (ROLE):`
- Translate “Prepared by” naturally, but keep `[YOUR NAME]` unchanged.
- Preserve paragraph, heading, list, code-block, and line structure closely. Do not collapse the workflow into prose.
- QA scripts provide mechanical protection; the working LLM must still read source and translation semantically before merging.

## Approved translation pipeline

Hindi is complete. Its invariant remains protected by:

```bash
/opt/homebrew/bin/node tools/hindi-status.mjs
/opt/homebrew/bin/node tools/repair-hindi-invariants.mjs --check
```

Bengali, Marathi, and Telugu batches are merged only through:

```bash
/opt/homebrew/bin/node tools/qa-lang-batch.mjs --lang <bn|mr|te> --input <batch.json>
/opt/homebrew/bin/node tools/review-lang-batch.mjs --lang <bn|mr|te> --source <chunk.json> --input <batch.json>
/opt/homebrew/bin/node tools/merge-lang.mjs --lang <bn|mr|te> <batch.json>
```

The input is an array of records keyed by the exact English title and containing every translated field expected by the gate. Merge one complete batch, rebuild, verify, and commit it before treating that batch as accepted.

## Data and generated-file rules

- `data/prompts.js` — canonical generated corpus; never hand-edit.
- `data/catalog.js` — compact browser catalog plus language status and curated Surprise sections.
- `data/surprise-pools.json` — reviewed Surprise allowlist and review digest.
- `data/redirects.json` — permanent old-slug map.
- `p/` — generated canonical prompt pages and redirect stubs.
- `sitemap.xml` — generated.
- `_handoff/*-todo/` — source translation chunks; do not rewrite them.
- `_handoff/phase3-batches/<lang>/` — authored translation batches.

Rebuild generated files through the scripts. Do not make one-off repairs inside `p/`.

## Cache discipline

All first-party browser assets use one shared version:

- `styles.css`
- `data/prompts.js`
- `data/catalog.js`
- `config.js`
- `app.js`

Run `/opt/homebrew/bin/node tools/bump-cache.mjs`; do not bump a subset by hand. Afterward, verify that every `?v=` reference in `index.html` is identical.

## Build and verification loop

After any accepted content or application change:

```bash
export PATH="/opt/homebrew/bin:$PATH"
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
```

For a read-only page gate, use `node tools/build-pages.mjs --dry-run`.

Serve locally:

```bash
python3 -m http.server 8911 --directory .
```

Browser acceptance includes:

- title/count is current;
- default Browse All starts with 60 unique cards and can reach all 961 unique prompts;
- search for `wolfram` returns related prompts;
- Category, Group, Exam, Audience, and Format filters work together and Clear all resets them;
- curated Surprise sections honor the active selection and never show an ineligible prompt;
- Hindi changes cards, Surprise chrome, modal content, copy/open text, and style-picker text;
- Handwritten 5-Method has one placeholder option plus 18 selectable styles;
- JEE Advanced returns well above the historical 34-prompt floor;
- `/p/vintage-parchment-masterclass/` redirects to `/p/handwritten-5-method-solution-art/`;
- feedback stays neutral and contains only role plus message;
- browser console has no errors.

## Commit discipline

- Inspect `git status` before staging.
- Stage only the accepted batch and its intended generated/product files.
- Never stage another language's partial draft.
- Commit one translation batch per commit and one product milestone per commit.
- Do not rewrite or discard unrelated work in a dirty tree.
- Never run destructive reset/checkout commands against user work.
- Never push.

## Current architecture

This is a static site with no framework:

- `index.html` — public shell, guide, builder, learning area, library, neutral feedback, and modal.
- `app.js` — discovery, search, exact-category and facet filtering, languages, curated Surprise selection, modal/copy/open flows.
- `styles.css` — responsive visual system.
- `config.js` — feedback destination and optional privacy-friendly analytics.
- `tools/build-pages.mjs` — canonical pages, redirect stubs, sitemap.
- `tools/build-catalog.mjs` — compact catalog, validated language availability, Surprise embedding.

The current verified corpus is 961 prompts across 50 categories. English and Hindi are live. Bengali, Marathi, and Telugu remain blocked until each reaches 961/961 with zero invalid records and passes browser activation.
