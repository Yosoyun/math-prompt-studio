// Build the PDF prompt book + quick-start guide from data/prompts.js using headless Chrome.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIG = 'Indrajeet Yadav';
const CHROME = process.env.PUPPETEER_EXECUTABLE_PATH ||
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
   '/Applications/Chromium.app/Contents/MacOS/Chromium',
   '/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser']
  .find(p => { try { return readFileSync(p) && true; } catch (e) { return false; } })
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// ---- load data ----
const src = readFileSync(ROOT + '/data/prompts.js', 'utf8');
const json = src.slice(src.indexOf('window.PROMPT_DATA =') + 'window.PROMPT_DATA ='.length, src.lastIndexOf(';'));
const DATA = JSON.parse(json);
const CATS = DATA.categories;
const TOTAL = CATS.reduce((t, c) => t + c.prompts.length, 0);

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,900&family=Inter:wght@400;500;600;700&family=Caveat:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap');`;

const BASE_CSS = `
${FONTS}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:'Inter',system-ui,sans-serif;color:#23262d;font-size:10pt;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1,h2,h3,h4{font-family:'Fraunces',Georgia,serif;margin:0;letter-spacing:-.01em}
code,pre{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace}
.sign{font-family:'Caveat',cursive}
`;

// ---------- PROMPT BOOK ----------
function bookHTML() {
  const catList = CATS.map((c, i) =>
    `<div class="toc-row"><span class="toc-ic">${c.categoryIcon}</span><span class="toc-name">${esc(c.categoryTitle)}</span><span class="toc-dots"></span><span class="toc-ct">${c.prompts.length}</span></div>`).join('');

  const body = CATS.map((c, ci) => {
    const cards = c.prompts.map((p, pi) => {
      const tags = `<span class="bp-tag ${p.needsImage ? 'img' : 'txt'}">${p.needsImage ? 'Photo needed' : 'Text only'}</span>` +
        `<span class="bp-tag tool">${esc(p.bestTool || 'Any AI chat')}</span>`;
      return `<section class="bp">
        <div class="bp-head"><span class="bp-no">${ci + 1}.${pi + 1}</span><h3>${esc(p.title)}</h3></div>
        <div class="bp-tags">${tags}</div>
        <p class="bp-what"><b>What you get:</b> ${esc(p.whatYouGet)}</p>
        <p class="bp-how"><b>How to use:</b> ${esc(p.howToUse)}</p>
        <div class="bp-label">COPY EVERYTHING BELOW</div>
        <pre class="bp-prompt">${esc(p.promptText)}</pre>
      </section>`;
    }).join('');
    return `<section class="cat" ${ci > 0 ? 'style="page-break-before:always"' : ''}>
      <div class="cat-banner"><span class="cat-ic">${c.categoryIcon}</span>
        <div><div class="cat-kicker">Section ${ci + 1} of ${CATS.length}</div><h2>${esc(c.categoryTitle)}</h2></div>
        <span class="cat-ct">${c.prompts.length} prompts</span></div>
      <p class="cat-blurb">${esc(c.categoryBlurb)}</p>
      ${cards}
    </section>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_CSS}
  @page{size:A4;margin:16mm 14mm 18mm}
  .cover{height:262mm;display:flex;flex-direction:column;justify-content:center;text-align:center;page-break-after:always;position:relative}
  .cover .glyph{font-family:'Fraunces';font-size:120pt;font-weight:900;background:linear-gradient(150deg,#2b3f6b,#6b4aa0);-webkit-background-clip:text;background-clip:text;color:transparent;line-height:.9}
  .cover .ey{letter-spacing:.22em;text-transform:uppercase;font-size:10pt;color:#b1822c;font-weight:700;margin:26px 0 8px}
  .cover h1{font-size:40pt;font-weight:900;letter-spacing:-.02em;line-height:1.05}
  .cover .tag{font-size:13pt;color:#55524b;margin:18px auto 0;max-width:150mm}
  .cover .by{margin-top:40px;font-size:11pt;color:#8a857c;letter-spacing:.1em;text-transform:uppercase}
  .cover .sign{font-size:40pt;color:#b1822c;transform:rotate(-3deg);margin-top:2px}
  .cover .stats{display:flex;justify-content:center;gap:18mm;margin-top:34px}
  .cover .stat b{font-family:'Fraunces';font-size:24pt;color:#2b3f6b;display:block;line-height:1}
  .cover .stat span{font-size:8.5pt;color:#8a857c;text-transform:uppercase;letter-spacing:.08em}
  .cover .rule{width:60mm;height:1.5px;background:linear-gradient(90deg,transparent,#b1822c,transparent);margin:0 auto}

  .intro{page-break-after:always;padding-top:4mm}
  .intro h2{font-size:22pt;color:#2b3f6b;margin-bottom:10px}
  .intro .step{display:flex;gap:12px;margin:14px 0}
  .intro .step b{font-family:'Fraunces';font-size:18pt;color:#b1822c;min-width:26px}
  .intro .step p{margin:0;font-size:11pt}
  .intro .note{background:#ece4f7;border-radius:8px;padding:12px 16px;margin-top:18px;font-size:10pt}

  .toc{page-break-after:always}
  .toc h2{font-size:22pt;color:#2b3f6b;margin-bottom:16px}
  .toc-row{display:flex;align-items:baseline;gap:8px;padding:7px 0;border-bottom:1px dotted #d9cfb8;font-size:11pt}
  .toc-ic{font-size:14pt}.toc-name{font-weight:600}.toc-dots{flex:1}.toc-ct{color:#8a857c;font-weight:700}

  .cat-banner{display:flex;align-items:center;gap:12px;padding:10px 14px;background:linear-gradient(150deg,#2b3f6b,#6b4aa0);color:#fff;border-radius:10px;margin-bottom:8px}
  .cat-banner h2{font-size:18pt;color:#fff}
  .cat-ic{font-size:26pt}
  .cat-kicker{font-size:8pt;text-transform:uppercase;letter-spacing:.12em;opacity:.85}
  .cat-ct{margin-left:auto;font-size:9pt;font-weight:700;background:rgba(255,255,255,.2);padding:4px 10px;border-radius:20px}
  .cat-blurb{color:#55524b;font-size:9.5pt;margin:0 0 12px;font-style:italic}

  .bp{break-inside:avoid;border:1px solid #e4dcc9;border-radius:10px;padding:12px 14px;margin:0 0 12px;background:#fffdf8}
  .bp-head{display:flex;align-items:baseline;gap:8px}
  .bp-no{font-family:'Fraunces';font-weight:900;color:#b1822c;font-size:12pt}
  .bp-head h3{font-size:13pt}
  .bp-tags{margin:6px 0 8px}
  .bp-tag{font-size:7.5pt;font-weight:700;padding:2px 8px;border-radius:20px;margin-right:5px}
  .bp-tag.img{background:#dcefe0;color:#2f7d56}.bp-tag.txt{background:#ece4f7;color:#6b4aa0}.bp-tag.tool{background:#f3ecdd;color:#55524b}
  .bp-what,.bp-how{margin:2px 0;font-size:9pt;color:#55524b}
  .bp-what b,.bp-how b{color:#23262d}
  .bp-label{font-size:7.5pt;font-weight:800;letter-spacing:.1em;color:#b1822c;margin:8px 0 2px}
  .bp-prompt{white-space:pre-wrap;word-wrap:break-word;font-size:7.6pt;line-height:1.5;background:#f3ecdd;border:1px solid #e4dcc9;border-radius:8px;padding:10px 12px;margin:0;color:#2b2a26}
  </style></head><body>

  <div class="cover">
    <div class="glyph">&#8721;</div>
    <div class="ey">The Maths Prompt Studio</div>
    <h1>${TOTAL} AI Prompts<br>for Mathematics Teachers</h1>
    <div class="tag">Copy-paste prompts that turn any maths problem into beautiful handwritten solutions, question papers, worksheets, DPPs, formula sheets and more.</div>
    <div class="stats">
      <div class="stat"><b>${TOTAL}</b><span>Prompts</span></div>
      <div class="stat"><b>${CATS.length}</b><span>Categories</span></div>
      <div class="stat"><b>${CATS[0].prompts.length}</b><span>Art styles</span></div>
      <div class="stat"><b>Free</b><span>Forever</span></div>
    </div>
    <div class="by">Created and authored by</div>
    <div class="sign">${SIG}</div>
    <div class="rule"></div>
  </div>

  <div class="intro">
    <h2>How to use this book (4 steps)</h2>
    <div class="step"><b>1</b><p><b>Pick a prompt.</b> Find what you need in the Contents. Each prompt is printed in full inside a shaded box.</p></div>
    <div class="step"><b>2</b><p><b>Copy everything in the shaded box.</b> If reading on screen, select the whole box. If on paper, type it once and save it.</p></div>
    <div class="step"><b>3</b><p><b>Open a free AI chat</b> - ChatGPT, Google Gemini, Claude or Copilot. If the prompt says "Photo needed", attach a clear photo of the question first.</p></div>
    <div class="step"><b>4</b><p><b>Paste, fill the [BRACKETS] with your details, and send.</b> Download or print the result. Your name appears on every output automatically.</p></div>
    <div class="note"><b>The 5-page art styles:</b> if your AI makes only one image at a time, just reply "now generate Page 2", then Page 3, and so on. The prompt already tells the AI to keep the same look across all five pages.</div>
    <div class="note" style="background:#dcefe0">Every prompt politely asks the AI to sign the work - "${SIG}" - so your name travels with everything you create. Please keep it when you share.</div>
  </div>

  <div class="toc">
    <h2>Contents</h2>
    ${catList}
  </div>

  ${body}
  </body></html>`;
}

// ---------- QUICK START ----------
function guideHTML() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_CSS}
  @page{size:A4;margin:16mm 16mm 18mm}
  h1{font-size:30pt;font-weight:900;color:#2b3f6b;letter-spacing:-.02em;line-height:1.05}
  .ey{letter-spacing:.2em;text-transform:uppercase;font-size:9pt;color:#b1822c;font-weight:700;margin-bottom:6px}
  .lead{font-size:12pt;color:#55524b;margin:12px 0 22px;max-width:160mm}
  .step{display:flex;gap:14px;margin:0 0 16px;break-inside:avoid}
  .step .n{width:34px;height:34px;border-radius:9px;background:linear-gradient(150deg,#b1822c,#d9a84a);color:#fff;font-family:'Fraunces';font-weight:900;font-size:16pt;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .step h3{font-size:14pt;margin:2px 0 3px}
  .step p{margin:0;font-size:10.5pt;color:#55524b}
  .tools{display:flex;gap:10px;margin:18px 0}
  .tool{flex:1;border:1px solid #e4dcc9;border-radius:9px;padding:10px;text-align:center;background:#fffdf8}
  .tool b{display:block;font-size:11pt;color:#2b3f6b}.tool span{font-size:8pt;color:#8a857c}
  .tips{background:#fffdf8;border:1px solid #e4dcc9;border-radius:10px;padding:14px 18px;margin-top:8px}
  .tips h3{font-size:13pt;color:#6b4aa0;margin-bottom:8px}
  .tips li{font-size:10pt;color:#55524b;margin:5px 0}
  .foot{margin-top:26px;text-align:center;border-top:1px solid #e4dcc9;padding-top:14px}
  .foot .sign{font-size:30pt;color:#b1822c;transform:rotate(-3deg)}
  .foot .sub{font-size:8.5pt;color:#8a857c;text-transform:uppercase;letter-spacing:.1em}
  </style></head><body>
  <div class="ey">Maths Prompt Studio &middot; Quick-Start Guide</div>
  <h1>AI for your maths class<br>in 4 simple steps</h1>
  <p class="lead">No coding. No cost. If you can send a WhatsApp message, you can do this. Keep this page in your staff room.</p>

  <div class="step"><div class="n">1</div><div><h3>Pick a prompt and copy it</h3><p>Open the Maths Prompt Studio website (or the prompt book PDF). Choose what you need - a solution, a question paper, a worksheet - and tap "Copy prompt".</p></div></div>
  <div class="step"><div class="n">2</div><div><h3>Open a free AI chat</h3><p>Use any of these in your browser. Sign in once (free): ChatGPT, Google Gemini, Claude, or Microsoft Copilot.</p></div></div>
  <div class="tools">
    <div class="tool"><b>ChatGPT</b><span>chatgpt.com</span></div>
    <div class="tool"><b>Gemini</b><span>gemini.google.com</span></div>
    <div class="tool"><b>Claude</b><span>claude.ai</span></div>
    <div class="tool"><b>Copilot</b><span>copilot.microsoft.com</span></div>
  </div>
  <div class="step"><div class="n">3</div><div><h3>Attach a photo (only if asked), then paste</h3><p>If the prompt says "Photo needed", tap the + / image button and add a clear photo of the question. Then paste the prompt (Ctrl/Cmd + V, or long-press then Paste).</p></div></div>
  <div class="step"><div class="n">4</div><div><h3>Fill the [BRACKETS] and send</h3><p>Replace things like [CLASS/GRADE] and [BOARD] with your details, press Enter, then download or screenshot the result. Your name is signed on it automatically.</p></div></div>

  <div class="tips"><h3>5 quick tips</h3><ul>
    <li>One question per photo - crop out the rest.</li>
    <li>Good light and a flat, straight page help the AI read the maths.</li>
    <li>Not happy? Reply "make it simpler", "add one more method", or "make the writing bigger".</li>
    <li>For 5-page art styles that come one at a time, say "now generate Page 2", then 3, 4, 5.</li>
    <li>Always glance over the answer before class - AI is great but not perfect.</li>
  </ul></div>

  <div class="foot"><div class="sign">${SIG}</div><div class="sub">Created &amp; authored by &middot; Free forever</div></div>
  </body></html>`;
}

async function render(browser, html, file, title) {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400)); // let webfonts settle
  const footer = `<div style="width:100%;font-family:Inter,sans-serif;font-size:7pt;color:#8a857c;padding:0 14mm;display:flex;justify-content:space-between;">
    <span>${title}</span><span>by ${SIG}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`;
  await page.pdf({
    path: file, format: 'A4', printBackground: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footer,
    margin: { top: '16mm', bottom: '18mm', left: '0', right: '0' },
  });
  await page.close();
  console.log('  wrote', file);
}

(async () => {
  mkdirSync(ROOT + '/downloads', { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  console.log('Building PDFs...');
  await render(browser, bookHTML(), ROOT + '/downloads/Maths-Prompt-Studio-by-Indrajeet-Yadav.pdf', 'Maths Prompt Studio - The Complete Prompt Book');
  await render(browser, guideHTML(), ROOT + '/downloads/Quick-Start-Guide-by-Indrajeet-Yadav.pdf', 'Maths Prompt Studio - Quick-Start Guide');
  await browser.close();
  console.log('Done.');
})();
