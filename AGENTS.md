# AGENTS.md — strict operating rules for any agent working in this repo

Read `HANDOFF.md` first for state + remaining work. These rules are NON-NEGOTIABLE; the owner's teachers trust this site.

## Absolute rules

1. **Never write "Indrajeet Yadav" anywhere** except the existing About section of index.html. Prompt signatures are `[YOUR NAME]`. No promo footers, no site URLs inside prompt outputs.
2. **Never edit `data/prompts.js` by hand.** It is one generated line. All changes go through scripts: `tools/merge-hindi.mjs` for translations, a Node script for structural changes, then `node tools/build-pages.mjs` (which regenerates all `/p/*` pages, redirect stubs from `data/redirects.json`, sitemap.xml, and rewrites data with slugs).
3. **Never delete a prompt without adding its slug → survivor slug to `data/redirects.json`.** Old URLs must keep working forever.
4. **Placeholders are sacred.** `[LIKE THIS]` tokens must survive every transformation character-for-character, including in translations. The merge script enforces this; do not weaken it.
5. **No verification theater.** Never write prompts that make the AI print "verified ✓" for its own work. Real verification = a clickable WolframAlpha/Symbolab link the teacher checks personally, labelled "check this yourself".
6. **No fabrication bait.** Prompts must not ask AIs for "the latest exam pattern", invented mark distributions, trend statistics, or PYQs presented as authentic. GROUND RULES blocks stay.
7. **Tool-link facts are frozen** unless re-verified in a live browser: Desmos has NO URL prefill (typed-lines fallback only); Google Forms is created by Apps Script, never URL; Wayground/Kahoot/Blooket are paste/file-import only; mathsolver.microsoft.com is dead. Full table: `_handoff/tools-research.md`.
8. **ALLEN properties stay separate.** Never link, merge, or mention allen-educator-studio / allen-resource-hub here.
9. **Cache-busting**: any change to app.js or data/prompts.js requires bumping BOTH `?v=` params in index.html (keep them equal).
10. **Do not push without the owner's explicit OK in the current conversation.** Committing locally is fine and encouraged.

## Translation rules (Hindi — and later bn/mr/te, same rules)

- Register: natural, respectful teacher-Hindi (आप form) — not Sanskritised, not Hinglish slang.
- Maths terms: Hindi term with English in brackets on first use — "द्विघात समीकरण (quadratic equation)" — then Hindi alone. Worksheet, DPP, MCQ, PDF, WhatsApp, ChatGPT stay English.
- `[PLACEHOLDERS]` copied unchanged, in English, brackets included.
- Structural labels: "भूमिका (ROLE):" style — Hindi first, English label in brackets, same line structure.
- URLs, tool names, file names, numbers unchanged. "Prepared by [YOUR NAME]" → "तैयारकर्ता: [YOUR NAME]".
- Full text, same paragraph/line breaks — never summarise.
- Every batch goes through `node tools/merge-hindi.mjs` (QA gate). Rejects get fixed, not force-merged.

## Data model (per prompt in data/prompts.js)

```
{ title, tag, needsImage, makesImage, whatYouGet, bestTool, worksOnFree,
  howToUse, effectiveUsage[], commonFix, promptText, slug,
  hi?: {title, whatYouGet, howToUse, effectiveUsage[], commonFix, promptText},
  exams?: ["any"|"boards"|"jee-main"|"jee-advanced"|"olympiad"|"foundation", ...],
  aud?: "teacher"|"student"|"both",
  featured?: true,            // 🔥 Most important row (owner-curated, keep ~12)
  added?: "YYYY-MM-DD",       // ✨ Recently added row
  styles?: [{name, direction}] // style-picker prompts only; modal renders a <select> for the [STYLE] token
}
```

## Build & verify loop (after ANY content change)

```bash
node tools/build-pages.mjs          # rebakes 573 pages + redirects + sitemap, writes slugs
# bump ?v= on prompts.js AND app.js in index.html
node -e "new Function(require('fs').readFileSync('app.js','utf8'))"   # syntax gate
python3 -m http.server 8911 --directory .    # then check http://localhost:8911
```
Manual checks: search "wolfram" (must show related prompts), हिंदी header chip (cards flip language), a style-picker modal (dropdown fills the prompt), one redirect stub URL, facet chips (JEE Advanced currently 34).

## Site architecture (30-second orientation)

Static site, no build framework. `index.html` (single-page app: guide/builder/learn/library/platform/about) + `app.js` (rendering, search+synonyms, facets, language switch, modal) + `data/prompts.js` (`window.PROMPT_DATA`, generated) + `tools/build-pages.mjs` (bakes `/p/<slug>/` SEO pages) + `styles.css`. Hosting: GitHub Pages at yosoyun.github.io/math-prompt-studio. The other platform modules are separate repos on the same domain, linked from the `#more` hub.
