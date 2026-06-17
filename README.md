# Maths Prompt Studio

### 136+ ready-to-use AI prompts for mathematics teachers — by **Indrajeet Yadav**

A free, no-coding-required library of copy-paste prompts that turn any maths problem into
**beautiful handwritten solutions, full question papers, worksheets, DPPs, formula sheets,
mind maps, quizzes and more** — using free AI tools like ChatGPT, Gemini, Claude or Copilot.

Every prompt politely asks the AI to **sign the work in the author's name**, so a little
piece of Indrajeet Yadav travels with everything you create.

> **Live site:** https://yosoyun.github.io/math-prompt-studio/

---

## What's inside

- **136 prompts** across **13 categories**
- **18 handwritten "5-method solution" art styles** (the flagship collection)
- A crystal-clear, non-technical **how-to** built for busy teachers
- Search + filter + one-tap **Copy** for every prompt
- **Downloads:** the complete Prompt Book (PDF, 176 pages), a 1-page Quick-Start Guide (PDF),
  and an editable Word document (DOCX)

### The 13 categories
Handwritten 5-Method Solution Art · Single Perfect Solution · Multiple Methods (Notes) ·
Formula Sheets & Cheat Sheets · Question Paper & Exam Generators · Assignments & Worksheets ·
Daily Practice Problems (DPP) · Concept Explainers & Mind Maps · Diagrams, Graphs & Figures ·
Slides, Video Scripts & Reels · Doubt Solving & Error Analysis · Quiz, MCQ & Flashcards ·
Real-World, Projects & Engagement

---

## How a teacher uses it (4 steps)

1. **Pick a prompt** and tap **Copy**.
2. **Open a free AI chat** — ChatGPT, Gemini, Claude or Copilot.
3. **Attach a photo** of the question (only if the prompt asks), then **paste**.
4. **Fill the `[BRACKETS]`** with your details and **press Enter**. Download, print, teach.

---

## Run it locally

```bash
python3 -m http.server 8911 --directory .
# then open http://localhost:8911
```

## Rebuild the content & documents (optional, for maintainers)

```bash
cd tools
npm install                       # installs puppeteer-core
node assemble.mjs <workflow.json> # regenerate data/prompts.js
node build-docs.mjs               # rebuild the two PDFs (headless Chrome)
python3 build-docx.py             # rebuild the Word document
```

---

## Credits

**Created, authored and signed by Indrajeet Yadav.**
Free forever. If it helps you, please share it — and keep the signature on the outputs.

The original five flagship style prompts were authored by Indrajeet Yadav; the wider library
was expanded from that foundation.
