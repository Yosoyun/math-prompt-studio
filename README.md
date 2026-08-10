# Maths Prompt Studio

Maths Prompt Studio is a free, teacher-first library of **961 rich AI workflows across 50 categories**.

It helps mathematics teachers and learners create classroom-ready solutions, independently checked answers, papers, worksheets, DPPs, quizzes, presentations, visuals, documents, lesson plans, feedback, and revision resources. Each card explains what it creates, how to use it, which tool fits, and how to recover when an AI answer is weak.

## Current product

- 961 canonical prompts with permanent slugs
- 50 exact categories and 7 broad teaching groups
- Search plus Category, Group, Exam, Audience, and Output Format filters
- Complete progressive browsing: all 961 prompts are reachable
- Curated Surprise Studio: 8 outcome sections and 50 audited, highly structured prompts
- English and Hindi live
- Bengali, Marathi, and Telugu held back until every prompt meets the same quality bar
- 18-style Handwritten 5-Method solution workflow
- Beginner guide, paper builder, learning techniques, and neutral issue/suggestion feedback
- 961 generated prompt pages plus permanent redirect stubs

Live site: [Maths Prompt Studio](https://yosoyun.github.io/math-prompt-studio/)

## Run locally

Node is installed at `/opt/homebrew/bin/node` on the primary development Mac.

```bash
cd "/Users/vanindra/Desktop/Code/automate x/math-prompt-studio"
export PATH="/opt/homebrew/bin:$PATH"
python3 -m http.server 8911 --directory .
```

Open [http://localhost:8911/](http://localhost:8911/).

## Core files

- `index.html` — static application shell
- `app.js` — library rendering, search, filters, languages, Surprise, modal/copy/open flows
- `styles.css` — responsive design
- `config.js` — feedback destination and optional privacy-friendly analytics
- `data/prompts.js` — generated canonical corpus; never hand-edit
- `data/catalog.js` — compact runtime catalog and language availability
- `data/surprise-pools.json` — reviewed Surprise allowlist
- `data/redirects.json` — permanent redirects
- `p/` — generated prompt pages

## Build and QA

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

Use `node tools/build-pages.mjs --dry-run` for a read-only generated-page check.

## Configuration

```js
window.MPS_CONFIG = {
  email: "feedback@example.com",
  googleFormUrl: "",
  analyticsSrc: "",
  analyticsDomain: ""
};
```

The public interface intentionally avoids founder promotion, personal-name collection, payment requests, and support solicitation.

## Contributing safely

Read `HANDOFF.md`, `AGENTS.md`, and `CONTINUITY.md` completely before editing.

Important rules:

- never hand-edit `data/prompts.js`;
- never change or translate placeholders;
- never delete a prompt without a redirect;
- never weaken a QA gate;
- never use local/offline machine translation;
- never add generic prompts to the curated Surprise pool;
- never push without explicit approval.

The exact current resume point, translation coverage, untracked drafts, browser results, known historical-gate discrepancies, and next commands are in `HANDOFF.md`.
