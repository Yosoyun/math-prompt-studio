// AUD-B/P1-B2 + AUD-E/P1-E2: keep the social preview current, branded, and credible when a teacher shares a link.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'og-cover.png');
const BRAND_MARK = readFileSync(resolve(ROOT, 'assets/brand-mark.svg'), 'utf8').trim();
const DATA_SOURCE = readFileSync(resolve(ROOT, 'data/prompts.js'), 'utf8');
const DATA_MARKER = 'window.PROMPT_DATA =';
const PROMPT_DATA = JSON.parse(DATA_SOURCE.slice(DATA_SOURCE.indexOf(DATA_MARKER) + DATA_MARKER.length, DATA_SOURCE.lastIndexOf(';')));
const TOTAL = PROMPT_DATA.categories.reduce((sum, category) => sum + category.prompts.length, 0);
const CHROME = process.env.PUPPETEER_EXECUTABLE_PATH || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find(path => {
  try { readFileSync(path); return true; } catch { return false; }
});

if (!CHROME) throw new Error('Chrome/Chromium not found; set PUPPETEER_EXECUTABLE_PATH.');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Inter:wght@500;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  html,body{width:1200px;height:630px;margin:0;overflow:hidden}
  body{font-family:Inter,system-ui,sans-serif;color:#22202d;background:#f7f3ea}
  body::before{content:"";position:absolute;inset:0;background:linear-gradient(125deg,rgba(108,92,231,.12),transparent 45%),radial-gradient(circle at 87% 16%,rgba(72,52,212,.16),transparent 25%)}
  body::after{content:"";position:absolute;right:-90px;bottom:-120px;width:470px;height:470px;border:1px solid rgba(72,52,212,.13);border-radius:50%;box-shadow:0 0 0 46px rgba(108,92,231,.035),0 0 0 94px rgba(108,92,231,.025)}
  main{position:relative;width:100%;height:100%;padding:104px 96px 82px;display:flex;flex-direction:column;justify-content:space-between}
  .lockup{display:flex;align-items:center;gap:44px;min-width:0}
  .tile{width:180px;height:180px;flex:none;filter:drop-shadow(0 20px 28px rgba(72,52,212,.2))}
  h1{font-family:Fraunces,Georgia,serif;font-size:82px;line-height:.98;letter-spacing:-.035em;font-weight:700;margin:0;color:#211e31;white-space:nowrap}
  .rule{width:108px;height:5px;border-radius:999px;background:linear-gradient(90deg,#6C5CE7,#4834D4);margin:31px 0 0 224px}
  .promise{margin:0;font-size:31px;line-height:1.2;letter-spacing:-.015em;font-weight:600;color:#514d61}
  .promise strong{color:#4834D4;font-weight:700}
</style></head><body>
<main aria-label="Maths Prompt Studio social preview">
  <div>
    <div class="lockup"><div class="tile">${BRAND_MARK}</div><h1>Maths Prompt Studio</h1></div>
    <div class="rule" aria-hidden="true"></div>
  </div>
  <p class="promise"><strong>${TOTAL} prompts</strong> · English + हिंदी · free forever</p>
</main></body></html>`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  const frauncesReady = await page.evaluate(() => document.fonts.check('700 82px Fraunces'));
  if (!frauncesReady) throw new Error('Fraunces 700 did not load; refusing to render a fallback-font cover.');
  await page.screenshot({ path: OUTPUT, type: 'png', captureBeyondViewport: false });
  await page.close();
} finally {
  await browser.close();
}

console.log(`Wrote ${OUTPUT} at 1200x630.`);
