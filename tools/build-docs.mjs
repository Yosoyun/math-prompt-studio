// Build the PDF prompt book + beginner quick-start guide from data/prompts.js using headless Chrome.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIG = 'Indrajeet Yadav';
const CHROME = process.env.PUPPETEER_EXECUTABLE_PATH ||
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Chromium.app/Contents/MacOS/Chromium','/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser']
  .find(p => { try { return readFileSync(p) && true; } catch (e) { return false; } })
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const src = readFileSync(ROOT + '/data/prompts.js', 'utf8');
const DATA = JSON.parse(src.slice(src.indexOf('window.PROMPT_DATA =') + 'window.PROMPT_DATA ='.length, src.lastIndexOf(';')));
const CATS = DATA.categories;
const TOTAL = CATS.reduce((t, c) => t + c.prompts.length, 0);
const GROUP_ORDER = ['Solving & Checking','Practice & Assessment','Teaching Materials','Writing & Content','Engagement','Support','Teacher Productivity'];
const GROUPS = GROUP_ORDER.filter(g => CATS.some(c => c.group === g));
CATS.forEach(c => { if (GROUPS.indexOf(c.group) === -1) GROUPS.push(c.group || 'More'); });

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,900&family=Inter:wght@400;500;600;700&family=Caveat:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap');`;
const BASE_CSS = `${FONTS}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{font-family:'Inter',system-ui,sans-serif;color:#23262d;font-size:10pt;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1,h2,h3,h4{font-family:'Fraunces',Georgia,serif;margin:0;letter-spacing:-.01em}
code,pre{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace}.sign{font-family:'Caveat',cursive}`;

function relLabel(p){ return p.makesImage ? 'Makes images (needs an image AI)' : (p.needsImage ? 'Attach a photo first' : 'Works on any free AI'); }
function relColor(p){ return p.makesImage ? '#b1822c' : (p.needsImage ? '#3a5288' : '#2f7d56'); }

function bookHTML() {
  let secNo = 0;
  const toc = GROUPS.map(g => {
    const rows = CATS.filter(c => c.group === g).map(c => { secNo++; return `<div class="toc-row"><span class="toc-ic">${c.categoryIcon}</span><span class="toc-name">${secNo}. ${esc(c.categoryTitle)}</span><span class="toc-dots"></span><span class="toc-ct">${c.prompts.length}</span></div>`; }).join('');
    return `<div class="toc-grp">${esc(g)}</div>${rows}`;
  }).join('');

  let n = 0;
  const body = GROUPS.map(g => {
    const cats = CATS.filter(c => c.group === g).map(c => {
      n++;
      const cards = c.prompts.map((p, pi) => `<section class="bp">
        <div class="bp-head"><span class="bp-no">${n}.${pi + 1}</span><h3>${esc(p.title)}</h3></div>
        <div class="bp-rel" style="color:${relColor(p)}">&#9679; ${esc(p.worksOnFree || relLabel(p))} &nbsp;|&nbsp; Best tool: ${esc(p.bestTool || 'Any AI chat')}</div>
        <p class="bp-what"><b>What you get:</b> ${esc(p.whatYouGet)}</p>
        ${(p.effectiveUsage && p.effectiveUsage.length) ? `<div class="bp-eff"><b>How to use:</b><ol>${p.effectiveUsage.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>` : ''}
        ${p.commonFix ? `<p class="bp-fix"><b>If it is wrong, reply:</b> ${esc(p.commonFix)}</p>` : ''}
        <div class="bp-label">COPY EVERYTHING BELOW</div>
        <pre class="bp-prompt">${esc(p.promptText)}</pre>
      </section>`).join('');
      return `<section class="cat"><div class="cat-banner"><span class="cat-ic">${c.categoryIcon}</span><div><div class="cat-kicker">Section ${n}</div><h2>${esc(c.categoryTitle)}</h2></div><span class="cat-ct">${c.prompts.length} prompts</span></div><p class="cat-blurb">${esc(c.categoryBlurb)}</p>${cards}</section>`;
    }).join('');
    return `<section class="grp" style="page-break-before:always"><div class="grp-divider"><span>${esc(g)}</span></div>${cats}</section>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_CSS}
  @page{size:A4;margin:16mm 14mm 18mm}
  .cover{height:262mm;display:flex;flex-direction:column;justify-content:center;text-align:center;page-break-after:always}
  .cover .glyph{font-family:'Fraunces';font-size:120pt;font-weight:900;background:linear-gradient(150deg,#2b3f6b,#6b4aa0);-webkit-background-clip:text;background-clip:text;color:transparent;line-height:.9}
  .cover .ey{letter-spacing:.22em;text-transform:uppercase;font-size:10pt;color:#b1822c;font-weight:700;margin:26px 0 8px}
  .cover h1{font-size:38pt;font-weight:900;letter-spacing:-.02em;line-height:1.05}
  .cover .tag{font-size:13pt;color:#55524b;margin:18px auto 0;max-width:150mm}
  .cover .by{margin-top:40px;font-size:11pt;color:#8a857c;letter-spacing:.1em;text-transform:uppercase}
  .cover .sign{font-size:40pt;color:#b1822c;transform:rotate(-3deg);margin-top:2px}
  .cover .stats{display:flex;justify-content:center;gap:16mm;margin-top:32px}
  .cover .stat b{font-family:'Fraunces';font-size:24pt;color:#2b3f6b;display:block;line-height:1}
  .cover .stat span{font-size:8.5pt;color:#8a857c;text-transform:uppercase;letter-spacing:.08em}
  .cover .rule{width:60mm;height:1.5px;background:linear-gradient(90deg,transparent,#b1822c,transparent);margin:18px auto 0}
  .intro{page-break-after:always;padding-top:4mm}
  .intro h2{font-size:22pt;color:#2b3f6b;margin-bottom:12px}
  .intro h3{font-size:13pt;color:#6b4aa0;margin:16px 0 6px}
  .intro .step{display:flex;gap:12px;margin:10px 0}
  .intro .step b{font-family:'Fraunces';font-size:16pt;color:#b1822c;min-width:24px}
  .intro .step p{margin:0;font-size:10.5pt}
  .intro .note{background:#ece4f7;border-radius:8px;padding:11px 15px;margin-top:14px;font-size:9.5pt}
  .intro .note.g{background:#dcefe0}
  .toc{page-break-after:always}.toc h2{font-size:22pt;color:#2b3f6b;margin-bottom:14px}
  .toc-grp{font-family:'Fraunces';font-weight:800;color:#6b4aa0;font-size:13pt;margin:14px 0 4px}
  .toc-row{display:flex;align-items:baseline;gap:8px;padding:5px 0;border-bottom:1px dotted #d9cfb8;font-size:10.5pt}
  .toc-ic{font-size:13pt}.toc-name{font-weight:600}.toc-dots{flex:1}.toc-ct{color:#8a857c;font-weight:700}
  .grp-divider{text-align:center;margin:0 0 14px}.grp-divider span{font-family:'Fraunces';font-weight:900;font-size:26pt;color:#6b4aa0;border-bottom:3px solid #e9d6a8;padding-bottom:6px}
  .cat-banner{display:flex;align-items:center;gap:12px;padding:10px 14px;background:linear-gradient(150deg,#2b3f6b,#6b4aa0);color:#fff;border-radius:10px;margin-bottom:8px;page-break-before:always}
  .grp .cat:first-child .cat-banner{page-break-before:avoid}
  .cat-banner h2{font-size:17pt;color:#fff}.cat-ic{font-size:24pt}
  .cat-kicker{font-size:8pt;text-transform:uppercase;letter-spacing:.12em;opacity:.85}
  .cat-ct{margin-left:auto;font-size:9pt;font-weight:700;background:rgba(255,255,255,.2);padding:4px 10px;border-radius:20px}
  .cat-blurb{color:#55524b;font-size:9.5pt;margin:0 0 12px;font-style:italic}
  .bp{break-inside:avoid;border:1px solid #e4dcc9;border-radius:10px;padding:11px 13px;margin:0 0 11px;background:#fffdf8}
  .bp-head{display:flex;align-items:baseline;gap:8px}.bp-no{font-family:'Fraunces';font-weight:900;color:#b1822c;font-size:12pt}.bp-head h3{font-size:12.5pt}
  .bp-rel{font-size:8pt;font-weight:700;margin:4px 0}
  .bp-what{margin:2px 0;font-size:9pt;color:#55524b}.bp-what b{color:#23262d}
  .bp-eff{font-size:8.5pt;color:#2f7d56;margin:4px 0}.bp-eff b{color:#23262d}.bp-eff ol{margin:2px 0 0;padding-left:16px}.bp-eff li{margin:1px 0}
  .bp-fix{font-size:8.5pt;color:#9a6a14;margin:4px 0}.bp-fix b{color:#23262d}
  .bp-label{font-size:7.5pt;font-weight:800;letter-spacing:.1em;color:#b1822c;margin:7px 0 2px}
  .bp-prompt{white-space:pre-wrap;word-wrap:break-word;font-size:7.4pt;line-height:1.48;background:#f3ecdd;border:1px solid #e4dcc9;border-radius:8px;padding:9px 11px;margin:0;color:#2b2a26}
  </style></head><body>
  <div class="cover"><div class="glyph">&#8721;</div><div class="ey">The Maths Prompt Studio</div>
    <h1>${TOTAL} AI Prompts<br>for Mathematics Teachers</h1>
    <div class="tag">Copy-paste prompts that turn any maths problem into handwritten solutions, question papers, worksheets, DPPs, formula sheets, books and more - with a complete beginner's guide.</div>
    <div class="stats"><div class="stat"><b>${TOTAL}</b><span>Prompts</span></div><div class="stat"><b>${CATS.length}</b><span>Categories</span></div><div class="stat"><b>${CATS[0].prompts.length}</b><span>Art styles</span></div><div class="stat"><b>Free</b><span>Forever</span></div></div>
    <div class="by">Created and authored by</div><div class="sign">${SIG}</div><div class="rule"></div></div>

  <div class="intro"><h2>Brand new to AI? Start here.</h2>
    <p style="font-size:11pt;color:#55524b">AI tools (ChatGPT, Gemini, Claude, Copilot) are free websites where you type a request - or attach a photo - and get a written answer back, like texting a brilliant assistant. No installing, no coding.</p>
    <h3>The 4 steps</h3>
    <div class="step"><b>1</b><p><b>Open a free AI tool.</b> ChatGPT (chatgpt.com) or Gemini (gemini.google.com) are easiest. Sign in with Google - it's free.</p></div>
    <div class="step"><b>2</b><p><b>Attach a photo (if the prompt needs one).</b> In the typing bar, tap the + or paperclip on the left, choose Camera or Photos, and pick a clear picture of ONE question.</p></div>
    <div class="step"><b>3</b><p><b>Copy a prompt from this book and paste it.</b> Long-press the typing bar and tap Paste (phone), or Ctrl/Cmd + V (computer).</p></div>
    <div class="step"><b>4</b><p><b>Fill the [BRACKETS] and send.</b> Replace [CLASS], [BOARD] etc. with your details, then press Send. Download or print the result.</p></div>
    <h3>What works on a free plan?</h3>
    <p style="font-size:10pt;color:#55524b"><b>Text tasks</b> (solutions, papers, worksheets, notes, books) work on ANY free AI. <b>Picture tasks</b> (the handwritten art pages) need an image-making AI and free plans limit how many images per day - each prompt tells you which it is.</p>
    <div class="note"><b>One image at a time?</b> Reply "now generate Page 2", then Page 3, 4, 5. The prompt keeps the same look across pages.</div>
    <div class="note g">Every prompt asks the AI to sign the work as "${SIG}", so your name travels with everything you make. Please keep it when you share.</div>
  </div>

  <div class="toc"><h2>Contents</h2>${toc}</div>
  ${body}</body></html>`;
}

function guideHTML() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_CSS}
  @page{size:A4;margin:14mm 14mm 16mm}
  h1{font-size:27pt;font-weight:900;color:#2b3f6b;letter-spacing:-.02em;line-height:1.05}
  .ey{letter-spacing:.2em;text-transform:uppercase;font-size:9pt;color:#b1822c;font-weight:700;margin-bottom:6px}
  .lead{font-size:11pt;color:#55524b;margin:10px 0 16px}
  .step{display:flex;gap:12px;margin:0 0 12px;break-inside:avoid}
  .step .n{width:30px;height:30px;border-radius:8px;background:linear-gradient(150deg,#b1822c,#d9a84a);color:#fff;font-family:'Fraunces';font-weight:900;font-size:14pt;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .step h3{font-size:13pt;margin:1px 0 3px}.step p{margin:0;font-size:10pt;color:#55524b}
  .tools{display:flex;gap:8px;margin:14px 0}
  .tool{flex:1;border:1px solid #e4dcc9;border-radius:8px;padding:8px;text-align:center;background:#fffdf8}
  .tool b{display:block;font-size:10.5pt;color:#2b3f6b}.tool span{font-size:7.5pt;color:#8a857c}
  .box{background:#fffdf8;border:1px solid #e4dcc9;border-radius:9px;padding:11px 15px;margin-top:6px}
  .box h3{font-size:12pt;color:#6b4aa0;margin-bottom:6px}.box li{font-size:9.5pt;color:#55524b;margin:4px 0}
  .foot{margin-top:18px;text-align:center;border-top:1px solid #e4dcc9;padding-top:10px}
  .foot .sign{font-size:26pt;color:#b1822c;transform:rotate(-3deg)}.foot .sub{font-size:8pt;color:#8a857c;text-transform:uppercase;letter-spacing:.1em}
  </style></head><body>
  <div class="ey">Maths Prompt Studio &middot; Beginner's Quick-Start</div>
  <h1>AI for your maths class, step by step</h1>
  <p class="lead">No coding, no cost. If you can send a WhatsApp message, you can do this. Keep this sheet handy.</p>
  <div class="step"><div class="n">1</div><div><h3>Open a free AI tool</h3><p>Use ChatGPT or Gemini (easiest). Sign in with Google - free.</p>
    <div class="tools"><div class="tool"><b>ChatGPT</b><span>chatgpt.com</span></div><div class="tool"><b>Gemini</b><span>gemini.google.com</span></div><div class="tool"><b>Claude</b><span>claude.ai</span></div><div class="tool"><b>Copilot</b><span>copilot.microsoft.com</span></div></div></div></div>
  <div class="step"><div class="n">2</div><div><h3>How to attach a photo of a question</h3><p><b>Phone:</b> in the typing bar tap the <b>+</b> (or paperclip), choose <b>Camera</b> to click it now or <b>Photos</b> to pick one, then select it - a small picture appears = attached. <b>Computer:</b> click the <b>paperclip</b> and Upload, OR just drag the image onto the box, OR copy it and press Ctrl/Cmd + V.</p></div></div>
  <div class="step"><div class="n">3</div><div><h3>Copy a prompt and paste it</h3><p>Tap "Copy prompt" on the website. Back in the chat, long-press and Paste (phone) or Ctrl/Cmd + V (computer). Attach the photo FIRST if the prompt needs one.</p></div></div>
  <div class="step"><div class="n">4</div><div><h3>Fill the [BRACKETS] and send</h3><p>Replace [CLASS], [BOARD], [TOPIC] with your details, press Send/Enter, then download or screenshot. Your name is signed on it automatically.</p></div></div>
  <div class="box"><h3>If something doesn't work</h3><ul>
    <li><b>No + button?</b> Tap "New chat" first; sign in. Gemini/Claude show upload free; ChatGPT shows + on the left of the bar.</li>
    <li><b>Got text, wanted a picture?</b> Use a "Makes images" prompt in ChatGPT/Gemini and say "generate this as an actual image". Free plans limit images per day.</li>
    <li><b>Only one page made?</b> Reply "now generate Page 2", then 3, 4, 5.</li>
    <li><b>Mistake?</b> Reply "re-check step 3 and verify the answer a second way", or send a clearer photo.</li>
    <li><b>Want Hindi?</b> Add "write everything in Hindi" to any prompt.</li>
  </ul></div>
  <div class="foot"><div class="sign">${SIG}</div><div class="sub">Created &amp; authored by &middot; Free forever</div></div>
  </body></html>`;
}

async function render(browser, html, file, title) {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));
  const footer = `<div style="width:100%;font-family:Inter,sans-serif;font-size:7pt;color:#8a857c;padding:0 14mm;display:flex;justify-content:space-between;"><span>${title}</span><span>by ${SIG}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`;
  await page.pdf({ path: file, format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footer, margin: { top: '16mm', bottom: '18mm', left: '0', right: '0' } });
  await page.close(); console.log('  wrote', file);
}

(async () => {
  mkdirSync(ROOT + '/downloads', { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  console.log('Building PDFs for', TOTAL, 'prompts...');
  await render(browser, bookHTML(), ROOT + '/downloads/Maths-Prompt-Studio-by-Indrajeet-Yadav.pdf', 'Maths Prompt Studio - The Complete Prompt Book');
  await render(browser, guideHTML(), ROOT + '/downloads/Quick-Start-Guide-by-Indrajeet-Yadav.pdf', 'Maths Prompt Studio - Beginner Quick-Start');
  await browser.close(); console.log('Done.');
})();
