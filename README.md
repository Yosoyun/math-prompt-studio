# Maths Prompt Studio

### 500+ free AI prompts for mathematics teachers & students — by **Indrajeet Yadav**

A free, no‑coding‑required website of copy‑paste prompts that turn any maths problem into
**handwritten solutions, full question papers, worksheets, DPPs, formula sheets, books and more** —
using free AI tools like **ChatGPT** and **Claude** (also AI Studio, Gemini, Grok).

Built for brilliant teachers who are new to computers: it includes a **complete, illustrated
beginner's guide** (including exactly how to attach a photo) and a **Learn 10× guide** for studying
smarter. Every prompt asks the AI to **sign the work in the author's name**.

> **Live site:** https://yosoyun.github.io/math-prompt-studio/

There is **no bulk download** — use prompts one at a time on the site, and please **share it**
with one more teacher or student. That's the only "payment" asked.

---

## What's inside
- **505 prompts** across **31 categories / 7 groups** (incl. **Book & Study‑Material Writing**)
- **18 handwritten "5‑method solution" art styles** (the flagship collection)
- **Beginner's Guide**: what AI is, pick a tool, *how to attach a photo* (phone/computer, illustrated), copy‑paste, a 60‑second walkthrough
- **Learn 10×**: the highest‑leverage ways to study with ChatGPT/Claude (Feynman loop, active recall, Socratic tutor, exam simulator…)
- **About** the author, a **Feedback** box (rating + suggestion → email; optional Google Form / WhatsApp), and a **Share** section
- Every prompt: a colour reliability dot (🟢 any free AI · 🟡 makes images · 🔵 attach a photo), a "how to use effectively" list, and a "what to say if it's wrong" line

## Owner settings — `config.js`
Edit three lines to switch on extra contact buttons:
```js
window.MPS_CONFIG = {
  email: "you@example.com",   // where the feedback form sends
  googleFormUrl: "",          // paste a Google Form link → shows "Open suggestions form"
  whatsapp: "",               // digits incl. country code → shows the WhatsApp button
  photoUrl: ""                // optional photo for the About section
};
```

## Run it locally
```bash
python3 -m http.server 8911 --directory .
# open http://localhost:8911
```

## Regenerate / expand content (maintainers)
```bash
cd tools && npm install          # puppeteer-core (only needed if rebuilding the optional PDFs)
node assemble.mjs <workflow.json>  # rebuild data/prompts.js from a content-workflow output
```

---

## Credits
**Created, authored and signed by Indrajeet Yadav.** Free forever. If it helps you, please share it
and keep the signature on the outputs. Prompt structure follows the best practices of the top
prompt‑engineering resources (f/awesome‑chatgpt‑prompts, promptslab, ai‑boost, Anthropic & OpenAI guides).
