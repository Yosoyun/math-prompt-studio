# Product Audit 2 — Activation, Retention, and Teacher Outcomes

Audit date: 2026-07-17

Audited surface: the live 848-prompt Maths Prompt Studio on desktop and mobile-emulated Chrome, supported by a source review of `index.html`, `app.js`, `styles.css`, and `data/prompts.js`.

This is the implementation contract for Phases 1–3. Every shipped fix must cite one or more audit IDs below in its code comment, generation script, commit message, or final fix map.

## Executive verdict

Maths Prompt Studio already has unusually deep content, trustworthy tool-link discipline, excellent bilingual coverage, and useful exam facets. The product problem is not supply; it is time-to-value. The landing page asks a novice to understand the library before it lets them experience it. A teacher can get a strong output, but the shortest route is not obvious, the intended beginner route is long, and the product under-signals its most concrete outcomes: a paper, a verified solution, a worksheet, a deck, or a phone quiz.

Composite product score: **3.8 / 10**.

The current product behaves like a large, carefully organized resource library. A 10/10 version behaves like a teacher's production console: choose who you teach, choose what you need, fill two or three details, and leave with a classroom-ready output.

## AUD-A — Activation: first WOW output

Score: **3 / 10**

### Evidence

- The primary beginner CTA lands on a five-minute guide, not an interactive first result.
- The displayed “first one, in 60 seconds” route is explanatory text. Its named prompt is not linked and it does not open a filled prompt modal.
- The intended novice/photo route takes roughly **8–11 taps plus typing**: enter the guide, open an AI tool, return, find the library/prompt, search, open the instructions, expand/fill fields, attach a photo through several chooser steps, open or paste into the AI, and send.
- A confident shortcut user can reach a featured card and open ChatGPT in about four taps, but must already know what to choose and how placeholders work.
- The fill-in form is collapsed on ordinary prompt modals, so the lowest-friction completion path is visually secondary.
- Mobile Lighthouse baseline: **55 performance**, FCP **14.1 s**, LCP **14.2 s**, total transfer **2,280 KiB**. All 848 cards are rendered into the initial DOM, which compounds the perceived wait on a throttled first visit.

### What a 10 looks like

A new teacher reaches a relevant, fill-ready modal in exactly **three in-product taps**: segment → job → prompt. Defaults are useful, the next action is obvious, and one further tap copies or opens the completed prompt. The landing shell becomes usable within 2.5 seconds on a throttled mobile connection.

### Contracted fixes

- **P1/A1:** Build the bilingual 60-second start strip: segment chip → five outcome tiles → matching modal already open.
- **P1/A2:** Make the fill fields open and outcome-first when launched from the strip.
- **P1/A3:** Defer/lazy-render the heavy library so hero and quick start paint before the full corpus.
- **P3/A4:** Make the same path fully usable in all five live languages.

## AUD-B — Value clarity

Score: **5 / 10**

### Evidence

- The hero communicates breadth (“848 prompts”) and speed (“10× faster”), but the dominant promise is abstract.
- Papers, worksheets, and handwritten solutions appear in a paragraph; verified answers, PPT/decks, phone quizzes, and ready-to-print outputs are not presented as the primary product promise.
- The two CTAs describe navigation (“Start here”, “Browse”) rather than the result the teacher will obtain.
- The visual hierarchy is calm and readable, but the crowded desktop header and same-weight card grid reduce the sense of a focused flagship workflow.
- Initial HTML still says 32 categories before JavaScript corrects it to 45, creating a needless credibility mismatch.
- The current social cover is stale: it advertises 535 prompts and 31 categories instead of the live 848-prompt product.

### What a 10 looks like

Within five seconds, a visitor understands: “I can make a paper, verify a solution, prepare a worksheet or PPT, and run a quiz—free, in my language.” The hero shows concrete outcome choices, one strong primary action, a credible verification promise, and a current branded preview.

### Contracted fixes

- **P1/B1:** Rewrite the hero around the five teacher outcomes and independent verification, with the 60-second start as the primary action.
- **P1/B2:** Install the unified subject-tile + Fraunces wordmark system, current favicon, and current 1200×630 social cover.
- **P1/B3:** Rebalance card and section hierarchy so featured workflows read as intentional recommendations rather than more inventory.
- **P2/B4:** Put a truthful output-format badge on every card.

## AUD-C — Retention loops

Score: **3 / 10**

### Evidence

- “Recently added” and “Surprise me” create discovery, but 328 items currently qualify as recent, so “recent” is not a meaningful return signal.
- The only persisted user preferences are language and theme.
- There is no saved/favorites shelf, recent-prompt history, deterministic prompt of the day, or return cue tied to a teacher's segment.
- A teacher who finds a useful prompt has to rediscover it through search, browser history, or a copied link.

### What a 10 looks like

Weekly return behavior is built into the product: saved prompts persist locally, recently used prompts are one tap away, a stable prompt-of-the-day offers a lightweight reason to return, and the chosen teaching segment is remembered without requiring an account.

### Contracted fixes

- **P1/C1:** Add local, privacy-preserving favorites and a visible Saved shelf/filter.
- **P1/C2:** Add a deterministic prompt-of-the-day and locally stored recent-prompt history without analytics or sign-in.
- **P1/C3:** Persist the teacher's last segment choice and use it as a shortcut, never as a hidden filter.

## AUD-D — Segment fit

Score: **6 / 10**

### Evidence

- Once at the library, JEE Advanced, Foundation, Olympiad, Boards, and student views are each reachable with one filter tap. Current facet counts are Boards 320, Foundation 165, JEE Main 161, JEE Advanced 137, Olympiad 91, and 213 student-usable prompts.
- From the hero, “Browse prompts” plus one facet is a two-tap shelf route, satisfying the mechanical ≤2-tap requirement for a visitor who already understands the filters.
- Segment counts are healthy at the facet level, but a first-time visitor sees no segment choice above the fold.
- “Foundation (6–8)” is useful but does not explicitly say “Class 6 teacher”; student needs are mixed into a teacher-first information architecture.
- Broad facet tagging can make a segment count look stronger than the number of prompts whose workflow is genuinely specific to that exam or learner.
- A reproducible strict scan—segment tag plus an explicit segment name or distinctive mechanic in the card-facing fields—finds only Boards 44, Foundation 4, JEE Main 3, JEE Advanced 6, and Olympiad 24. The corresponding gaps to 60 are 16, 56, 57, 54, and 36. Phase 2 must adjudicate these with a checked manifest rather than treating raw multi-tag counts as proof.

### What a 10 looks like

A JEE Advanced faculty member, Class 6 foundation teacher, olympiad coach, board teacher, or student identifies their shelf in one tap from the first screen and reaches a relevant job in the second. Counts reflect genuinely segment-specific workflows, not only broad compatibility tags.

### Contracted fixes

- **P1/D1:** Put the six requested segment choices in the 60-second strip and remember the last choice.
- **P1/D2:** Keep group, exam, format, audience, and language controls in a compact sticky filter row with mobile horizontal scrolling and 44 px targets.
- **P2/D3:** Audit genuine segment specificity, add the PYQ workflow category, and add targeted prompts wherever a non-`any` segment has fewer than 60 genuinely specific workflows.
- **P3/D4:** Translate UI chrome and search all five languages so language does not break segment discovery.

## AUD-E — Share loop

Score: **4 / 10**

### Evidence

- Prompt modals already provide “Share this prompt” and “Copy link”; supported phones use the native share sheet and other devices fall back to WhatsApp.
- The share action is hidden behind “How to use this”, and cards themselves expose no share control.
- The shared message contains the title and URL but not the concrete outcome or language context.
- The generic social preview is stale and does not make a staff-room link look like the current product.
- A separate site-level WhatsApp share block exists far below the library, after the user has passed the core moment of value.

### What a 10 looks like

Every card can be shared in one tap with a clean title, one-line outcome, canonical prompt URL, and current branded preview. WhatsApp is first-class, desktop fallback is clear, and sharing never copies the full proprietary prompt text unintentionally.

### Contracted fixes

- **P1/E1:** Add a compact per-card share action and improve modal share copy with title + outcome + canonical URL.
- **P1/E2:** Regenerate the branded social cover and ensure baked prompt pages expose correct per-prompt title/description metadata.
- **P1/E3:** Keep native share where available and a labelled WhatsApp fallback elsewhere.

## AUD-F — Output formats

Score: **2 / 10**

### Evidence

- Teachers cannot filter the 848 prompts by what they receive.
- No prompt currently has a `fmt` field.
- Format-appending logic for Word, PDF, and PPT already exists in `app.js`, but no reachable card or modal control renders it.
- Current small tags mix input requirements, category labels, and vague deliverables; they do not form a consistent output system.
- Many prompts can already produce papers, sheets, decks, images, or live links, but the interface presents the corpus primarily as text prompts.
- A conservative evidence-only classifier yields 30 image, 19 PPT, 25 interactive, 112 print/PDF, 55 document, 225 link, and 382 plain-text prompts. That is 45.0% text, so at least 213 existing prompts need a real output upgrade to reach the ≤20% target at the current count.

### What a 10 looks like

Every prompt truthfully declares one primary output: print/PDF, document, PPT/deck, image, tool links, interactive session, or text. Teachers can filter by it, cards show it instantly, and every modal prominently offers “Get this as: PDF · Word · PPT” where conversion is sensible. No more than 20% of the corpus remains plain text after a content-level audit.

### Contracted fixes

- **P2/F1:** Classify all prompts with one allowed `fmt` value through a Node script, never a manual data edit.
- **P2/F2:** Add the requested format chip row, card badges, and prominent modal export controls.
- **P2/F3:** Append reviewed output-format blocks to convertible text workflows and reduce true plain-text output to ≤20%.
- **P2/F4:** Give every new PYQ and segment prompt a truthful format, facets, Hindi, and tool-link QA where applicable.

## Cross-phase acceptance criteria

| Contract | Acceptance signal |
|---|---|
| `AUD-A` | Three in-product taps from segment to open fill-ready modal; mobile Lighthouse performance ≥85 |
| `AUD-B` | Outcome-led hero, unified brand assets, current 848+ social cover |
| `AUD-C` | Saved, recent, and prompt-of-the-day loops work locally without sign-in |
| `AUD-D` | Every requested persona reaches a genuine shelf in ≤2 taps; genuine segment counts ≥60 |
| `AUD-E` | Per-card and modal sharing produce a useful canonical WhatsApp/native-share payload |
| `AUD-F` | 100% `fmt` coverage; working format filter; ≤20% `text`; visible export actions |

The product must retain all existing QA guarantees: no fabricated authentic PYQs, no invented tool IDs, placeholders unchanged, real external verification labelled for the teacher to check, full Hindi coverage, protected identity restricted to its existing allowed location, and no remote push.
