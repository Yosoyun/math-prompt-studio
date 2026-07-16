# Verified tool deep-link research (2026-07-16)

prefill_works: verified = confirmed against live URLs/docs this week; documented = official docs only; unsupported = NO URL prefill exists (paste-into only).

## WolframAlpha
- prefill: **verified** | login: false
- template: https://www.wolframalpha.com/input?i={URL-encoded query}  (spaces as + or %20; encode ^ as %5E, = as %3D, + as %2B)
- example: https://www.wolframalpha.com/input?i=solve+x%5E2-5x%2B6%3D0
- best for: Instant verified computation and exact graphs — a trustworthy answer key the teacher can click to double-check any AI-produced answer (roots, integrals, plots) without trusting the chatbot's arithmetic.
- integration: Instruct the AI to append a 'Verify on WolframAlpha' link (https://www.wolframalpha.com/input?i=...) after every final answer, URL-encoding the exact expression it solved; Wolfram's own LLM API docs use this same link pattern.
- caveats: Verified this session: the URL cold-loads and computes the query with no login (tested solve x^2-5x+6=0). Results render via JavaScript, so the link must be opened in a browser, not previewed. Step-by-step button is a Pro paywall. Keep queries in WolframAlpha's math syntax (not LaTeX) — LaTeX like \frac{}{} often misparses. Practical URL length limit ~2000 chars (fine for school maths). No India-specific blocks; site and Pro pricing available in India. On phones the link opens the mobile website fine; the separate WolframAlpha mobile app is a one-time paid app and links open in browser, not the app.

## Wolfram Problem Generator
- prefill: **verified** | login: false
- template: https://www.wolframalpha.com/problem-generator/quiz/?category={Category}&topic={TopicSlug}  (e.g. category=Algebra|Arithmetic|Calculus|LinearAlgebra|NumberTheory|Statistics; topic slugs are internal CamelCase names like QuadraticEquationIntegerSolution)
- example: https://www.wolframalpha.com/problem-generator/quiz/?category=Algebra&topic=QuadraticEquationIntegerSolution
- best for: Infinite fresh drill problems with instant answer-checking — students each get different numbers, so it beats an AI chat for no-repeat homework practice and self-checking.
- integration: Have the AI map the lesson topic to a known quiz slug from a curated whitelist (embed the slug table in the prompt) and output 'Practice this topic' links, e.g. after teaching factoring output the Algebra/QuadraticEquationIntegerSolution quiz link.
- caveats: Verified this session: the example URL cold-loads a live Question 1 at Beginner difficulty, no login. BUT topic slugs are undocumented — I extracted the working slug by clicking through the site UI; an invalid slug (e.g. topic=SolveQuadratic1) silently falls back to the generic topic-browser page with no error, so an AI inventing slugs will produce links that 'work' but land on the wrong page. Ship a hard-coded slug whitelist in prompts. No URL parameter found for difficulty (defaults to Beginner; user changes it in-page). Printable worksheets (what many Indian teachers actually want) are Pro-only. Topics cover arithmetic through intro calculus/linear algebra — fine for CBSE 6-12 basics, too shallow for JEE-level problems.

## Wolfram Demonstrations Project
- prefill: **verified** | login: false
- template: https://demonstrations.wolfram.com/{DemonstrationNameCamelCase}/  (permalink to one specific interactive demo; there is NO working search/query prefill URL)
- example: https://demonstrations.wolfram.com/QuadraticEquation/
- best for: Ready-made interactive classroom visualisations (drag a slider, watch the parabola move) that an AI chat cannot produce — ideal for projector demos of parameters, loci, and geometry.
- integration: Because there is no search-URL prefill and slugs are guessable-but-hallucinatable, curate a mapping of syllabus topics to verified demonstration URLs and have the AI suggest links only from that list ('For visualising roots, open .../QuadraticEquation/').
- caveats: Verified this session: the per-demo permalink cold-loads the interactive demo with no login. However, the site's own search is currently broken — the search box submits nowhere, the old /search.html?query= redirects to the homepage, and /search.php returns 'Failed to fetch'; topic listing pages (/topic/high-school-algebra-i, '59 demonstrations') load their header but the demo tiles failed to render in testing. So AI-generated links MUST be exact known slugs; a hallucinated slug 404s. The live interactive version takes several seconds to initialise and is bandwidth-heavy — an issue on slow school connections; works in mobile browsers but sliders are fiddly on small screens. No India blocks. Project is in maintenance mode (little new content since ~2020), but existing demos remain up.

## Desmos (Graphing Calculator, Geometry, 3D)
- prefill: **unsupported** | login: false
- template: none — tested this session: https://www.desmos.com/calculator?expressions=... and ?latex=... are silently ignored (calculator opens empty). The only working deep links are saved-graph URLs: https://www.desmos.com/calculator/{10-char-id} (same pattern for /geometry/{id} and /3d/{id}), which require a human to build the graph and click Share first.
- example: https://www.desmos.com/calculator
- best for: Live interactive exploration in class — sliders, draggable points, and animation for 'what happens to y=a(x-h)^2+k when a changes' moments that a static AI answer cannot replicate.
- integration: Do NOT have the AI emit Desmos query-string links (they dead-end at a blank calculator); instead have the prompt output a numbered 'type these lines into Desmos' list (Desmos accepts plain text like y=x^2+2x-3 and a~slider notation), or have the AI generate a self-contained HTML file using the Desmos API (calculator.setExpression) that the teacher opens locally.
- caveats: Verified negative in this session via live state inspection (Calc.getState() showed an empty expression list after loading ?expressions= and ?latex= URLs). Desmos API embedding needs an API key (a public demo key exists but is for evaluation only). Saved-graph links open fine in India and in mobile browsers; the Desmos iOS/Android apps may intercept desmos.com links. Desmos Classroom activities (teacher.desmos.com / student.desmos.com) are also free but are a separate product with join codes, not deep links.

## GeoGebra Calculator apps (Graphing, Geometry, 3D, CAS, Suite)
- prefill: **verified** | login: false
- template: https://www.geogebra.org/{app}?command={cmd1};{cmd2};... where {app} is calculator | graphing | geometry | 3d | cas. Multiple commands separated by semicolons; each command is anything valid in the GeoGebra input bar (equations, Root(), Polygon(), Solve(), Integral(), Sequence()...). URL-encode + as %2B (a raw + decodes to a space and breaks the expression); parentheses, =, ^ and ; work unencoded.
- example: https://www.geogebra.org/graphing?command=f(x)=x^2%2B2x-3;Root(f)
- best for: One-click pre-built constructions: the AI can hand a teacher a link that opens with the parabola already drawn and its roots already marked, or a triangle already constructed, or Solve() already evaluated in CAS — geometry constructions and 3D surfaces especially, which chat AIs can only describe.
- integration: Have the prompt instruct the AI to append, after every graphing/geometry answer, a 'Open this in GeoGebra' markdown link built as geogebra.org/graphing?command=... with semicolon-chained commands and %2B-encoded plus signs (e.g. define the function, then Root/Extremum/Intersect commands so the picture is annotated on arrival).
- caveats: Verified live this session on all five apps by inspecting ggbApplet object state after load (e.g. Solve(x^2+2x-3=0) in /cas returned {x=-3, x=1}; Polygon((0,0),(4,0),(2,3)) built in /geometry). The ?command= parameter is NOT in GeoGebra's official App Parameters docs (those cover applet embedding: material_id, filename, ggbBase64) — it works today but is undocumented, so include a plain-text fallback of the commands in the AI output. Keep URLs under ~2,000 chars (fine for ~15-20 commands). On phones with the GeoGebra app installed, geogebra.org links may open the native app and can drop the query string — advise 'open in browser' for mobile. No blocks in India; site is snappy on low bandwidth once the ~3-5 MB app loads.

## GeoGebra Materials (geogebra.org/m/...)
- prefill: **verified** | login: false
- template: https://www.geogebra.org/m/{materialId} opens a published community applet/worksheet; https://www.geogebra.org/search/{urlencoded-topic} opens a search over ~1M free materials. This is content lookup, not content prefill — the AI cannot create a material via URL.
- example: https://www.geogebra.org/search/quadratic%20equation
- best for: Ready-made interactive simulations (unit-circle explorers, theorem visualizers, transformation games) that would take hours to build — a curated human-made applet beats anything an AI generates on the fly.
- integration: Do not let the AI invent /m/{id} links (IDs are opaque and hallucination-prone); instead have the prompt emit geogebra.org/search/{topic} links, or maintain a small vetted id-list inside the prompt library for staple topics (e.g. verified classics like geogebra.org/m/XUv5mXTm for learning GeoGebra Classic).
- caveats: Material IDs are random strings — an AI will confidently fabricate dead /m/ links, so only ship IDs you have clicked yourself. Material quality varies wildly (community-contributed); many are in non-English languages. Materials pages load the full applet, heavier than the bare calculator on low-end devices.

## GeoGebra Classroom
- prefill: **unsupported** | login: true
- template: none for content prefill. Flow is UI-driven: teacher opens any material or calculator activity and clicks ASSIGN to create a class, which generates a join code; students enter it at https://www.geogebra.org/classroom (or use the direct class link the teacher gets). No URL pattern lets an AI pre-create a classroom.
- example: https://www.geogebra.org/classroom
- best for: Live formative assessment — the teacher watches all 40 students manipulate the same applet in real time and spots who is stuck, something no AI chat workflow offers.
- integration: Chain it after a GeoGebra deep link: the prompt has the AI produce the ?command= construction link plus 2-3 discussion questions, and the teacher's one manual step is opening the link and pressing the ASSIGN button (visible on every geogebra.org calculator page) to turn it into a Classroom activity.
- caveats: The ASSIGN button was confirmed present on the live calculator pages this session, but classroom creation itself was not exercised (requires login). Teacher account creation is free but is a login wall your non-technical users must cross once. Student join codes expire per GeoGebra's class lifecycle. Works in India; used widely there. The AI's role ends at the construction link — Classroom setup is always a manual click.

## Symbolab
- prefill: **verified** | login: false
- template: https://www.symbolab.com/solver?query={URL-ENCODED_PROBLEM}
- example: https://www.symbolab.com/solver?query=x%5E2-5x%2B6%3D0
- best for: Instant symbolic verification with graph — a teacher clicks the link and sees the equation already solved with a plotted answer, useful for checking an AI-generated answer key in one click.
- integration: Instruct the AI to append a 'Verify on Symbolab' markdown link after every final answer, URL-encoding the expression into ?query= (encode ^ as %5E, + as %2B, = as %3D); works for equations, derivatives, integrals, limits.
- caveats: Prefill is undocumented but confirmed working live this session (mid-2026); keep queries under ~2000 chars to be safe; steps are paywalled so pitch it as a checker not a steps source; on mobile the site pushes the Symbolab app but the web link still resolves; no known India blocks; use plain calculator syntax (x^2), not LaTeX.

## Mathway
- prefill: **unsupported** | login: false
- template: none (legacy ?asciimath= parameter no longer works — verified in a live browser this session: https://www.mathway.com/Algebra?asciimath=... redirects to https://mathway.com and drops the parameter; the solver loads empty)
- example: https://www.mathway.com/Algebra
- best for: Subject-scoped chat solving with photo input on a phone — a student or teacher can snap a textbook problem; but as of 2026 an AI chat does this job as well or better.
- integration: Do not generate problem deep links; at most have the AI link the subject page (e.g. mathway.com/Calculus) as a 'try it yourself' pointer, and rely on Symbolab/WolframAlpha for actual prefilled verification links.
- caveats: Owned by Chegg; heavy cookie-consent and sign-up dialogs on first load; steps fully paywalled; it is a reCAPTCHA-protected SPA so any future scripted prefill is fragile; low value for the clickable-deep-link vision — recommend excluding it from prompt templates.

## Microsoft Math Solver
- prefill: **unsupported** | login: false
- template: none (service retired July 7, 2025; the old pattern https://mathsolver.microsoft.com/en/solve-problem/{latex} now returns HTTP 404, and the site root serves a raw Azure 'BlobNotFound' XML error — both verified live this session)
- example: https://support.microsoft.com/en-us/office/solve-math-equations-with-math-assistant-in-onenote-1b37bb8d-ecd1-40d7-8d0f-5e6e46547441
- best for: Nothing anymore; historically it was the free step-by-step solver with Hindi UI support, which mattered for Indian teachers — that niche is now best covered by Symbolab (answers) or an AI chat (steps).
- integration: Remove any mathsolver.microsoft.com links from existing prompts — they produce broken 404/BlobNotFound pages that will confuse non-technical teachers; substitute Symbolab or WolframAlpha links.
- caveats: Retirement announced by @MicrosoftMath (July 7, 2025); old solve-problem URLs still circulating in blog posts and prompt libraries are dead; the OneNote Math Assistant replacement is app-internal and cannot be deep-linked with a problem.

## Photomath
- prefill: **unsupported** | login: false
- template: none (app-only product — the website is a marketing page with no web solver, no input box, and no documented URL scheme or app link that carries a problem; verified this session)
- example: https://play.google.com/store/apps/details?id=com.microblink.photomath
- best for: Camera-scanning handwritten or textbook problems on a phone — the one input mode a text deep link can never carry, and the tool students in India most likely already have installed.
- integration: Never emit Photomath problem links (they cannot exist); instead have the AI add a one-line teacher tip like 'students can scan this printed worksheet with the free Photomath app to self-check' and link the Play Store page at most.
- caveats: No web version means the deep-link vision is structurally impossible here; the only clickable URL is the app-store listing; content is camera-driven so it suits printed/handwritten worksheets, not AI chat output; free tier widely used in India, Plus features paywalled.

## Math StackExchange
- prefill: **verified** | login: false
- template: https://math.stackexchange.com/search?q={URL-encoded query; supports advanced operators: [tag] for tags, "exact phrase", answers:1, isaccepted:yes, score:2, title:word}
- example: https://math.stackexchange.com/search?q=%5Bquadratics%5D+solve+quadratic+by+completing+the+square
- best for: Citable, peer-vetted worked solutions and conceptual explanations at school-to-undergraduate level, with multiple alternative approaches per question and community-voted quality signals an AI chat cannot provide.
- integration: Have the AI append a 'See how others solved this' link after each solution, building the search URL from the topic tag plus 3-6 keywords (e.g. q=%5Btrigonometry%5D+prove+identity) so teachers can cite human-verified answers to sceptical students.
- caveats: This session: WebFetch was blocked by Stack Exchange's bot protection but the URL loaded fine via a normal browser user-agent (255 results, query echoed in page title) — real teachers in a browser are unaffected, though Cloudflare may occasionally show a challenge page. Encode [ ] as %5B %5D and ^ as %5E or tag filtering silently fails in some chat apps' link parsers. Keep queries under ~10 keywords; SE search is keyword-based, so pasting a full LaTeX equation returns poor matches — tell the AI to extract keywords instead. No regional blocks in India; works on mobile browser (SE's native apps are discontinued, so links always open in browser).

## MathOverflow
- prefill: **verified** | login: false
- template: https://mathoverflow.net/search?q={URL-encoded query; same Stack Exchange operator syntax, tags use arXiv-style prefixes e.g. [nt.number-theory], [co.combinatorics]}
- example: https://mathoverflow.net/search?q=%5Bnt.number-theory%5D+quadratic+reciprocity
- best for: Research-level mathematics answered by professional mathematicians — history of theorems, whether a result is known, references to papers — depth no AI chat can match on frontier maths.
- integration: Use sparingly: have the AI offer a MathOverflow search link only when a teacher asks 'who proved this / is this an open problem / where can I read more', since MO moderators close school-level questions and its content is aimed at researchers.
- caveats: Verified live this session (240 result summaries, query in title). Wrong audience for routine classroom questions — school-level content lives on Math StackExchange instead; sending teachers here for homework-type queries returns nothing useful. Tag names differ from MSE (nt.number-theory, ag.algebraic-geometry). Same Cloudflare/bot-check and URL-encoding notes as MSE; no India blocks; mobile browser fine.

## Art of Problem Solving (AoPS) Community Search
- prefill: **verified** | login: false
- template: https://artofproblemsolving.com/community/q1_{URL-encoded query, spaces as %20} — the q1_ prefix means results page 1; the documented-looking /community/search?query=... form does NOT prefill (verified: search box stays empty)
- example: https://artofproblemsolving.com/community/q1_quadratic%20inequality
- best for: Real competition problems with source attribution (e.g. 'St. Petersburg MO 2001', 'City Zhautykov Olympiad 2015') plus community solution threads — ideal for JEE-Advanced/Olympiad teachers who need provably genuine contest problems, not AI-invented ones.
- integration: Have the AI end every olympiad-topic worksheet with an AoPS deep link (q1_ pattern) on the topic keywords so the teacher can pull sourced past contest problems and compare community solutions against the AI's.
- caveats: Biggest caveat: the q1_ URL pattern is undocumented and reverse-engineered (observed this session by running a live search); it works today but AoPS could change it without notice — the safe fallback is linking to /community/search and telling the teacher to paste the term. Use %20 for spaces, not +. AoPS sits behind Cloudflare and returned 403 to curl this session, but loads normally in a real browser; no India-specific block observed. It is a JavaScript single-page app — slow on low-end phones and the deep link briefly shows a loading state. Content skews olympiad/competition, thin for routine CBSE board-exam material. Alcumus and For the Win forums are excluded from search.

## OEIS (On-Line Encyclopedia of Integer Sequences)
- prefill: **verified** | login: false
- template: https://oeis.org/search?q={comma-separated terms or keywords; supports author:name, keyword:nice, id:A000045; append &fmt=text or &fmt=json for machine-readable output; direct entry link: https://oeis.org/A000045}
- example: https://oeis.org/search?q=1,1,2,3,5,8,13
- best for: Identifying an integer sequence from its first few terms and getting verified closed forms, recurrences, generating functions, and literature references — a lookup task where AI chats routinely hallucinate.
- integration: Whenever a puzzle or pattern-recognition question involves an integer sequence, have the AI compute the first 6-8 terms and append an oeis.org/search?q=term1,term2,... link so the teacher can confirm the intended pattern (and discover the sequence often has multiple valid continuations).
- caveats: Verified live this session (returned A000045 Fibonacci with full entry links), but note the 403 to non-browser user-agents — OEIS blocks scrapers/naive fetchers, so the AI must output the link for the human to click rather than fetch it itself. Comma-separated terms match consecutively; too few terms (under ~5) returns hundreds of hits. Interface is English-only and text-dense — fine for teachers, dry for students. No login, no paywall, no India block; page is plain HTML so it loads fast on any phone.

## Overleaf (Open in Overleaf API)
- prefill: **verified** | login: true
- template: https://www.overleaf.com/docs?encoded_snip={urlencoded LaTeX} | https://www.overleaf.com/docs?snip_uri={url-to-.tex-or-.zip} | https://www.overleaf.com/docs?snip_uri=data:application/x-tex;base64,{base64 LaTeX} — optional &engine=pdflatex|xelatex|lualatex|latex_dvipdf, &main_document=..., &visual_editor=true, multiple files via snip_uri[]= and snip_name[]=
- example: https://www.overleaf.com/docs?encoded_snip=%5Cdocumentclass%7Barticle%7D%0A%5Cbegin%7Bdocument%7D%0A%5Csection*%7BQuadratic%20practice%7D%0ASolve%20%24x%5E2-5x%2B6%3D0%24.%20Roots%3A%20%24x%3D%5Cfrac%7B5%5Cpm%5Csqrt%7B25-24%7D%7D%7B2%7D%3D2%2C3%24.%0A%5Cend%7Bdocument%7D&engine=pdflatex
- best for: Turning AI-generated LaTeX into a print-ready PDF worksheet or question paper the teacher can edit, compile, and download — an AI chat can write LaTeX but cannot compile it to a polished PDF.
- integration: Have the prompt instruct the AI to output the complete worksheet as a LaTeX document, URL-encode it, and append one 'Open this worksheet in Overleaf' link of the form https://www.overleaf.com/docs?encoded_snip=... (use the data:application/x-tex;base64 snip_uri form for long documents, since nothing needs to be hosted).
- caveats: Clicking the link lands anonymous users on a sign-in/registration wall before the project is created, so teachers need a (free) Overleaf account. Long worksheets can exceed practical URL limits (~2K chars is safe for old browsers/WhatsApp link unfurling; browsers themselves handle ~8-32K) — base64 data-URIs inflate length ~33%, so for multi-page papers prefer hosting the .tex and using snip_uri. Percent-encoding must be exact ({, }, \, %, #, & all encoded) or the import silently mangles the source. Works fine from India; the Overleaf mobile web editor is usable but cramped on phones.

## CodeCogs Equation Renderer
- prefill: **verified** | login: false
- template: https://latex.codecogs.com/{svg|png|gif}.image?{urlencoded LaTeX} — resolution via a leading \dpi{N} directive (N ∈ 50/80/100/110/120/150/200/300), e.g. https://latex.codecogs.com/png.image?%5Cdpi%7B150%7D{latex}; JSON+base64 variants at /png.json?... and /svg.json?...
- example: https://latex.codecogs.com/svg.image?x%3D%5Cfrac%7B-b%5Cpm%5Csqrt%7Bb%5E2-4ac%7D%7D%7B2a%7D
- best for: Instant equation images the teacher can paste into WhatsApp, Google Forms, PowerPoint, or a school LMS that has no math support — AI chats output text/LaTeX, not embeddable image URLs.
- integration: Instruct the AI to emit, under every formula it produces, a ready-to-embed image link https://latex.codecogs.com/png.image?\dpi{150}<urlencoded-latex> so the teacher can right-click-save or hotlink the equation anywhere.
- caveats: Confirmed live this session (SVG of the quadratic formula rendered correctly). Single equations only — not full documents; \dpi values are restricted to the listed set. URLs must be percent-encoded (^, {, }, \, spaces) or some chat apps truncate at the first special character; keep under ~2K chars. It is a hotlinked third-party server: if CodeCogs is down or slow (occasional 500s — their docs page returned one during this research), embedded images break, so teachers should download PNGs for anything permanent. No India-specific blocks known. GIF endpoint is legacy; prefer svg/png.

## QuickLaTeX
- prefill: **unsupported** | login: false
- template: none — rendering requires an HTTP POST to https://quicklatex.com/latex3.f (fields: formula, fsize, fcolor, mode, out) which returns a hosted image URL; there is no GET/URL pattern that embeds LaTeX, so a clickable prefill link cannot be constructed
- example: https://quicklatex.com/
- best for: Rendering multi-line LaTeX with custom preambles (TikZ pictures, xy diagrams, aligned proofs) to a hosted image — beyond what CodeCogs' single-expression URLs handle.
- integration: Not suitable for the clickable-deep-link pattern; at most, a prompt can tell the teacher to copy the AI's LaTeX block and paste it at quicklatex.com to get an image URL (a two-step manual flow, so prefer CodeCogs for link-based workflows).
- caveats: Checked the official site this session: it explicitly describes a paste-and-render workflow and CMS plugins, with no documented GET image API — the POST-only latex3.f endpoint is community-documented, not official. Returned image URLs are cached server-side but not guaranteed permanent. Site is a small single-maintainer service with occasional downtime. For this prompt-library vision, treat it as a fallback the teacher visits manually, not a deep-link target.

## Typst (typst.app web editor)
- prefill: **unsupported** | login: true
- template: none — the official docs (Web App section, 'Creating a Project') describe no URL parameter for prefilling content or importing a snippet/file from a link; projects are created inside the app or shared via per-project invite links after the fact
- example: https://typst.app/
- best for: Fast, modern typesetting of worksheets with far simpler syntax than LaTeX and instant live preview — compiles in milliseconds, so iterating on a question paper's layout is much quicker than Overleaf.
- integration: Since no prefill link exists, the prompt should have the AI output a complete .typ source block plus the instruction 'create a new empty project at typst.app and paste this' — a copy-paste flow rather than a clickable deep link.
- caveats: Verified this session via typst.app/docs/web-app: account required ('only an account is required' for free features) and no import-from-URL mechanism is documented, so it cannot fulfill the one-click vision today. Teachers must also learn that Typst syntax is NOT LaTeX ($x^2$ math is similar but document markup differs), so prompts must explicitly ask the AI for Typst, not LaTeX. Works in India; the web app is desktop-oriented and weak on mobile browsers. Watch this space — snippet-sharing (e.g. community 'Snippyst') exists but is unofficial and third-party.

## Google Colab
- prefill: **verified** | login: false
- template: https://colab.research.google.com/github/{user}/{repo}/blob/{branch}/{path}.ipynb — or for gists: https://colab.research.google.com/gist/{user}/{gist_id}/{notebook}.ipynb
- example: https://colab.research.google.com/github/googlecolab/colabtools/blob/master/notebooks/colab-github-demo.ipynb
- best for: Actually executing longer Python/SymPy/matplotlib code — e.g. generating a full worksheet of plotted graphs or checking 50 answers numerically — which a chat AI can only claim to have done.
- integration: The AI cannot encode code into the URL itself — it must reference a notebook that already exists on GitHub, so the prompt library should maintain a small public GitHub repo of teacher notebooks (graph plotter, marks analyser, worksheet generator) and have the AI output the colab.research.google.com/github/ link to the right one plus the code cell for the teacher to paste in.
- caveats: Verified this session in a logged-out browser: viewing loads with no auth, but running any cell forces Google sign-in. There is NO parameter to prefill arbitrary code — the notebook must pre-exist on GitHub/Gist, which is the big limitation vs SageMathCell. Only public repos work without OAuth. Works fine in India; mobile browsers open it (clunky UI, no official app). No practical URL length issue since it is path-based.

## SageMathCell
- prefill: **verified** | login: false
- template: https://sagecell.sagemath.org/?z={base64url(zlib.compress(code))}&lang={sage|python|octave|r|maxima|gap} — the z parameter is the code, zlib-compressed then URL-safe-base64 encoded
- example: https://sagecell.sagemath.org/?z=eJyrULBVKEss0lCqUNK0VijOzylL1aiIM1LQVTDVqlDQVjBTsLVVMNBRqNAEAPmZCrw=&lang=sage
- best for: One-click verified exact symbolic computation (solve, factor, integrate, plot) with zero login friction — the closest thing to WolframAlpha-style deep links but with full programmable Sage/Python power and no paywall.
- integration: The z parameter is zlib+base64 — a chat LLM cannot compute it in its head, so this only works reliably from ChatGPT with Code Interpreter / Claude with code execution enabled: instruct the AI to run a 3-line Python snippet (zlib.compress + urlsafe_b64encode) to mint the permalink after every answer it wants the teacher to verify.
- caveats: The permalink is self-contained (no server storage) but long code makes very long URLs that some browsers/messengers truncate — keep snippets under roughly 1500 characters of code; the shorter ?q={id} form is server-stored and 'temporary'. The z value must be generated by real zlib compression — an LLM hallucinating the base64 produces a broken cell. Internet access from within cells is blocked. No app; works in mobile browsers. No known India blocks. Verified links auto-evaluate on load, which is ideal for teachers.

## CoCalc
- prefill: **unsupported** | login: true
- template: none — the historical share-server GitHub proxy (cocalc.com/github/{user}/{repo}/blob/{branch}/{file}) was tested this session and returns 'Cannot GET'; no code-in-URL or launch parameter is documented on the current site
- example: https://cocalc.com/github/googlecolab/colabtools/blob/master/notebooks/colab-github-demo.ipynb (tested this session — now returns an error page on cocalc.ai)
- best for: Running a whole class: persistent projects, real-time collaborative notebooks, assignment distribution and grading (its course-management tooling is unique among the three) — but that is a semester commitment, not a click-from-a-prompt tool.
- integration: Do not use CoCalc for deep links — there is nothing to prefill; if the library mentions it at all, it should be as a 'set up once for your whole class' recommendation with the AI generating the notebook/worksheet files for the teacher to upload manually.
- caveats: Tested live this session: cocalc.com redirects to cocalc.ai; the /github/... deep link errors ('Cannot GET'), and cocalc.app times out (Cloudflare 522). The product pivot toward Codex-agent research workspaces makes it a poor fit for non-technical Indian schoolteachers: account required, pricing oriented to teams, and no URL prefill of any kind. Documentation (doc.cocalc.com) still describes share/vanity URLs for published files, but those are for content someone already published, not AI-generated prefill. Recommend dropping it from the deep-link prompt patterns in favour of SageMathCell (instant) and Colab (notebooks).

## Google Forms
- prefill: **verified** | login: false
- template: https://docs.google.com/forms/d/e/{FORM_PUBLISH_ID}/viewform?usp=pp_url&entry.{FIELD_ID}={URL_ENCODED_VALUE}&entry.{FIELD_ID_2}={VALUE_2}
- example: https://docs.google.com/forms/d/e/1FAIpQLSe_EXAMPLE_FORM_ID/viewform?usp=pp_url&entry.1335037241=Solve%20x%5E2%20-%205x%20%2B%206%20%3D%200&entry.1277095329=x%20%3D%202%20or%20x%20%3D%203
- best for: Collecting graded, auto-marked responses from students with results in a spreadsheet the teacher owns — an AI chat cannot collect or grade student submissions.
- integration: Teacher pastes their form's 'Get pre-filled link' (which exposes the entry.N field IDs) into the prompt, and the AI outputs one pre-filled URL per student/variant with question values substituted; for creating whole quizzes, have the AI output Apps Script code (FormApp) the teacher pastes into script.google.com instead, since no URL can create form questions.
- caveats: Prefill only fills answers on an EXISTING form — it cannot create questions or a new form via URL. Entry IDs are per-form and unguessable, so the AI must be given them. Email, file-upload, and quiz-locked fields can't be prefilled. Values must be URL-encoded (%20 for spaces; math symbols like ^ and + are easy to break). Keep URLs under ~2,000 chars for old browsers/WhatsApp. Works fine in India; works in the mobile browser but the prefill link opens the web form, not the Forms app.

## Quizizz (rebranded Wayground)
- prefill: **unsupported** | login: true
- template: none — no URL prefill or URL-based import; nearest entry point is https://wayground.com/admin (Create > Import worksheets/questions > Paste questions)
- example: https://wayground.com/admin?source=ai-paste-import (entry point only; the quiz text itself must be pasted from clipboard — no URL can carry it)
- best for: Turning a pasted block of AI-generated MCQs into a live, gamified class quiz with per-student reports in under a minute (10,000-char paste limit, verified on official help docs).
- integration: Have the AI output the quiz as a clean plain-text block (Question / options / marked answer) with a 'copy this, then open wayground.com > Create > Import > Paste questions' instruction and a plain link to the create page — clipboard hand-off, not a deep link.
- caveats: Domain rebrand from quizizz.com to wayground.com (mid-2025) breaks old bookmarks/prompt instructions — links in your prompt library should say Wayground. Paste import capped at 10,000 characters; document upload processes only first 16,000 characters, one file at a time. AI import can misparse LaTeX/math notation — tell the AI to use plain ASCII math (x^2, sqrt). No regional blocks in India (Quizizz is India-founded, well used there).

## Kahoot!
- prefill: **unsupported** | login: true
- template: none — no URL prefill; import is a manual .xlsx upload inside the creator (https://create.kahoot.it > Create > Add question > Import spreadsheet) using the official template https://kahoot.com/files/2018/08/KahootQuizTemplate-3.xlsx
- example: https://create.kahoot.it/creator (creator entry point; questions travel as an .xlsx file the AI generates, not as a URL)
- best for: High-energy whole-class live competition with music/podium — the strongest engagement format of the four, worth the friction for revision games.
- integration: Have the AI output a table matching Kahoot's template columns (Question, Answer 1-4, Time limit, Correct answer number) that the teacher pastes into the template xlsx and uploads via Add question > Import spreadsheet — and have the prompt warn the AI to keep questions <=95 chars and answers <=60 chars.
- caveats: Hard character limits: 95 chars per question, 60 per answer (silently truncates math problems — biggest failure mode for maths content). .xlsx only, max 1MB, quiz-type questions only. Spreadsheet importer is subscription-gated per Kahoot's own blog (support article returned 403 this session, so current gating unconfirmed). Free plan's ~10-player live cap makes it impractical for typical 40-60 student Indian classrooms without a paid plan. No India-specific blocks.

## Blooket
- prefill: **unsupported** | login: true
- template: none — no URL prefill; import is 'CSV Import' on the Set Creator page (https://dashboard.blooket.com/create) or 'Spreadsheet Import' on an existing set's edit page, using Blooket's template
- example: https://dashboard.blooket.com/create (creator entry point; the AI's output travels as a downloaded .csv, not a URL)
- best for: Low-stakes repeated-practice arcade games (Gold Quest, Tower Defense) where the same MCQ set gets replayed for drilling — better retention-through-repetition than any chat or the other three tools.
- integration: Have the AI output CSV rows matching Blooket's template (Question, Answer 1-4, Time Limit, Correct Answer(s) as the option NUMBER 1-4) as a downloadable/copyable code block, with instructions: save as .csv, then dashboard.blooket.com > Create > CSV Import.
- caveats: Multiple-choice only — no typed-answer or numeric-entry maths. Correct answer column must contain option numbers (1-4), not the answer text — most common AI-generated-CSV failure; bake this into the prompt. No merged cells, blank rows, or extra headers or the import fails silently. Help-center pages blocked automated fetching (403) this session, so column details are from secondary sources ('documented'). No LaTeX rendering — plain-text math only. No known India blocks; site is Cloudflare-fronted so school firewalls occasionally challenge it.

## ChatGPT
- prefill: **documented** | login: false
- template: https://chatgpt.com/?q={URL_ENCODED_PROMPT} (optional: &hints=search to bias web search, &temporary-chat=true to keep it out of history; ?prompt= works as an alias for ?q=)
- example: https://chatgpt.com/?q=Solve%20x%5E2%20-%205x%20%2B%206%20%3D%200%20step%20by%20step%20for%20a%20Class%2010%20CBSE%20student%2C%20then%20give%203%20similar%20practice%20questions
- best for: The default AI chat most Indian teachers already have installed — best for generating worksheets, lesson plans, and step-by-step solutions in Hindi/English mix.
- integration: Use ?q= links to hand a teacher a ready-made prompt (e.g. from your library page) that opens ChatGPT with the full worksheet-prompt pre-typed — the teacher just presses Enter.
- caveats: ?q= only PREFILLS the input, it does NOT auto-submit (community threads confirm; auto-submit needs a browser extension). There is no official OpenAI documentation for these params, so they can break without notice. &model= is reported NOT to work in community testing (users tried it 'with no success'). On Android/iOS the link often opens the ChatGPT app via deep-link interception and the q param is frequently dropped — advise 'open in browser'. Keep prompts under ~2,000 chars URL-encoded for WhatsApp/browser safety. No India-specific blocks.

## Claude
- prefill: **verified** | login: true
- template: https://claude.ai/new?q={URL_ENCODED_PROMPT} (web); claude://claude.ai/new?q= (desktop app, officially documented); https://claude.ai/code/new?q=&mode=&repo= for Claude Code (q has alias 'prompt')
- example: https://claude.ai/new?q=Create%20a%2010-question%20quiz%20on%20quadratic%20equations%20%28x%5E2%20-%205x%20%2B%206%20%3D%200%20style%29%20for%20Class%2010%2C%20with%20answer%20key%20and%20common-mistake%20notes
- best for: Long structured outputs — full lesson plans, multi-section worksheets, and Artifacts (interactive HTML quizzes/graphs the teacher can share as a link).
- integration: Publish each library prompt as a claude.ai/new?q= button; instruct the AI in the prompt to end its answer with WolframAlpha/Desmos verification links so the teacher gets clickable checks.
- caveats: Verified caveat on scope: Anthropic's official Help Center articles (fetched this session) document the q param for the claude:// desktop scheme (claude://claude.ai/new?q=) and for claude.ai/code web links; the plain https://claude.ai/new?q= web route uses the same param and is widely used, but is not in the official article. Official docs are explicit that q PREFILLS 'so you can review and send' — no auto-submit anywhere. Login wall is the biggest friction for first-time teachers. Available in India; free-tier limits reset daily. Keep URLs under ~2,000 chars.

## Gemini
- prefill: **unsupported** | login: true
- template: none (gemini.google.com has NO native prompt-prefill URL param as of mid-2026; workaround: Google AI Mode https://www.google.com/search?udm=50&q={QUERY} auto-runs a Gemini-powered answer and works in India)
- example: https://www.google.com/search?udm=50&q=Solve%20x%5E2%20-%205x%20%2B%206%20%3D%200%20step%20by%20step%20and%20explain%20the%20factorisation%20method
- best for: Anything tied to the Google ecosystem — exporting output straight to Google Docs/Sheets, and free multimodal input (photograph a textbook page and ask about it).
- integration: Do not emit gemini.google.com links from prompts — they will open a blank chat; if you want a Google-powered clickable answer link, emit the google.com/search?udm=50&q= AI Mode URL instead.
- caveats: Multiple sources (Chrome Web Store extensions, dev.to, community threads) confirm Gemini ignores ?q= / ?prompt= — the only way to make such links work is a browser extension ('Gemini URL Prompt', 'Send to Gemini'), which is a non-starter for non-technical teachers. The udm=50 AI Mode workaround auto-runs (good) but Google has been shuffling it (udm=50&aep=11 redirects observed), so it may change; AI Mode is confirmed available in India. On mobile, google.com links open reliably in any browser — better mobile behavior than the chat apps.

## Perplexity
- prefill: **documented** | login: false
- template: https://www.perplexity.ai/search?q={URL_ENCODED_QUERY} (also accepts https://www.perplexity.ai/?q= ; extra params seen in the wild: &focus=internet, &copilot=true for Pro search) — this endpoint AUTO-RUNS the query, it is the browser-search-engine URL
- example: https://www.perplexity.ai/search?q=Latest%20CBSE%20Class%2010%20maths%20exam%20pattern%202026%20and%20weightage%20of%20quadratic%20equations%2C%20with%20sources
- best for: Citable, current-events Q&A — syllabus changes, exam-pattern updates, NEP circulars, 'what changed in the 2026 CBSE datesheet' — every answer comes with source links a teacher can verify.
- integration: Ask ChatGPT/Claude to append a perplexity.ai/search?q= link whenever a claim depends on current data (exam dates, syllabus, board notifications) so the teacher one-clicks a sourced answer.
- caveats: This is the ONLY chat-AI in the list where the link both prefills AND auto-executes by design (it is the documented default-search-engine endpoint, %s -> q). Because it auto-runs, never put anything sensitive in the query. No official Perplexity docs page for the param was fetched this session — pattern confirmed via multiple browser-setup guides — hence 'documented' not 'verified'. Works fine in India; free tier answers may use a weaker model; mobile links may open the Perplexity app, which does honor search deep links better than ChatGPT's app.

## Grok
- prefill: **documented** | login: true
- template: https://grok.com/?q={URL_ENCODED_PROMPT} (reported to prefill AND auto-submit on page load in most flows)
- example: https://grok.com/?q=Explain%20why%20x%5E2%20-%205x%20%2B%206%20%3D%200%20has%20roots%202%20and%203%2C%20then%20write%20a%20fun%2060-second%20classroom%20hook%20about%20factoring
- best for: Real-time X/Twitter-grounded answers — 'what are teachers discussing about the new NCERT textbooks this week' style discourse queries; least useful of the five for core maths-teaching jobs.
- integration: Use sparingly: emit grok.com/?q= links only for social-pulse prompts (education-policy chatter, trending exam news), not for worksheet generation.
- caveats: Only third-party link-generator tools (u2l.ai, folge.me) document the param — no official xAI docs — so treat as fragile. Reports say it AUTO-SUBMITS without confirmation: the prompt runs immediately in whoever's account clicks it, so never encode anything sensitive. Login wall (X/Google) is friction for teachers without X accounts. grok.com is accessible in India (X itself has periodic Indian regulatory friction). Keep URLs short; the X mobile app may hijack links into its own Grok tab.

## PhET Interactive Simulations
- prefill: **verified** | login: false
- template: https://phet.colorado.edu/sims/html/{sim-name}/latest/{sim-name}_all.html?locale={xx}&screens={comma-separated-screen-numbers}
- example: https://phet.colorado.edu/sims/html/graphing-quadratics/latest/graphing-quadratics_all.html?locale=en&screens=1
- best for: Interactive manipulable visualisations (drag a coefficient, watch the parabola move) that no chat AI can render
- integration: Give the AI a whitelist of exact sim slugs (graphing-quadratics, area-model-algebra, fractions-intro, arithmetic, trig-tour, etc.) and have it append the matching sim URL with ?screens=N to jump straight to the relevant screen of each lesson plan section.
- caveats: URL params only select sim, screen and language — they CANNOT preload sim state (e.g. set a=2,b=3) without PhET-iO, which is a paid partner product. AI models hallucinate sim slugs, so ship a curated slug list in the prompt. 'latest' URLs are stable; sims are heavy (2-10 MB) on low-end phones but work offline once cached. No India blocks. Verified this session: URL with locale+screens params returned HTTP 200, and PhET Help Center officially documents both parameters.

## Mathigon Polypad (now Amplify Polypad)
- prefill: **unsupported** | login: true
- template: none (content prefill impossible via URL; only blank canvas https://polypad.amplify.com/p or a human-saved canvas https://polypad.amplify.com/p/{id})
- example: https://polypad.amplify.com/p
- best for: Virtual manipulatives — algebra tiles, fraction bars, pattern blocks, balance scales — that students physically drag around
- integration: The AI should NOT emit Polypad links with content; instead have it output step-by-step 'build this on Polypad' instructions (which tiles, what arrangement) plus the plain https://polypad.amplify.com/p link, and let the teacher save/share the canvas herself.
- caveats: Verified this session via mathigon.io API docs + Amplify FAQ: old URL query-string customisation was explicitly DEPRECATED; canvas state is only settable via the JavaScript embed API (serialize/unSerialize JSON), which requires hosting your own page — not usable from a chat link. Saving/sharing a canvas requires sign-in (free account). mathigon.org/polypad now 302-redirects to polypad.amplify.com. Works fine in India; mobile browser is fully supported.

## Khan Academy
- prefill: **verified** | login: false
- template: https://www.khanacademy.org/search?page_search_query={query+with+plus+signs} (search); https://www.khanacademy.org/math/{course}/{unit} for stable topic paths, e.g. /math/algebra/x2f8bb11595b61c86:quadratic-functions-equations
- example: https://www.khanacademy.org/search?page_search_query=solving+quadratic+equations+by+factoring
- best for: Curated practice exercises with instant grading and mastery tracking, plus vetted video explanations to assign as homework
- integration: Have the AI append a Khan search link after each worksheet section ('extra practice: <search link>') — use search links, never topic paths, because AI-invented topic slugs (those x-prefixed hash IDs) are unguessable and 404.
- caveats: Search URL verified HTTP 200 this session and the page_search_query param is documented in Khan's own help community. Search links land on a results page, not directly on an exercise — one extra click. Topic/exercise URLs contain opaque hash segments that AIs reliably hallucinate; only use them from a curated list. CBSE-aligned Indian content lives under /math/in-in-grade-X-ncert paths. No regional blocks; the Android app intercepts khanacademy.org links correctly.

## NCERT textbooks + DIKSHA portal
- prefill: **verified** | login: false
- template: NCERT chapter PDF: https://ncert.nic.in/textbook.php?{bookcode}={chapter}-{totalChapters} (e.g. lemh1 = Class 12 Maths Part I, 0 = prelims). DIKSHA energized-textbook: https://diksha.gov.in/get/dial/{6-CHAR-DIAL-CODE}. DIKSHA search: https://diksha.gov.in/explore/1?key={query}
- example: https://diksha.gov.in/get/dial/CXDBFA (live dial-code link; NCERT example: https://ncert.nic.in/textbook.php?lemh1=1-6 opens Class 12 Maths Part I Ch.1 Relations and Functions)
- best for: The citable source of truth — exact NCERT chapter text/exercises the CBSE syllabus is defined against, which an AI can misquote
- integration: Have the AI cite chapter references as clickable ncert.nic.in/textbook.php links using a bookcode table embedded in the prompt (lemh1/lemh2 = Class 12 Maths I/II, jemh1 = Class 10 Maths, iemh1 = Class 9, hemh1 = Class 8, gemh1 = Class 7, femh1 = Class 6), and pass through DIKSHA dial codes printed in the textbook rather than inventing them.
- caveats: DIKSHA dial URL verified HTTP 200 this session; the get/dial/{code} pattern is officially documented in DIKSHA help. BUT dial codes are arbitrary 6-char IDs printed in physical textbooks — an AI cannot generate them, only relay codes the teacher supplies. ncert.nic.in was unreachable from a US IP this session (connection timeout — apparent geo-restriction), so the textbook.php pattern is documented-only from here, though it loads normally inside India; the bookcode+chapter format is confirmed from official ncert.nic.in URLs. diksha.gov.in/explore/1?key= returned 200 but is a JS single-page app and the key param is not officially documented — treat DIKSHA search links as best-effort. DIKSHA remains active in 2026 (no shutdown found; PM e-Vidya lists it as current). Both sites are slow at Indian school peak hours; DIKSHA links on mobile push users toward installing the DIKSHA app.

