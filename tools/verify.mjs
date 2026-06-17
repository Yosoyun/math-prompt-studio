import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Chromium.app/Contents/MacOS/Chromium'].find(p=>{try{return readFileSync(p)&&true}catch(e){return false}});
const URL = process.argv[2] || 'http://localhost:8911/';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args:['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERR: '+e.message));
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1.5 });
await page.goto(URL, { waitUntil: 'networkidle0' });
await new Promise(r=>setTimeout(r,700));
const info = await page.evaluate(() => ({
  title: document.title,
  cards: document.querySelectorAll('.card').length,
  cats: document.querySelectorAll('.cat-block').length,
  chips: document.querySelectorAll('.fchip').length,
  stat: (document.querySelector('[data-stat=prompts]')||{}).textContent,
  styleCount: (document.querySelector('[data-stat=styles]')||{}).textContent,
}));
console.log('INFO', JSON.stringify(info));
console.log('CONSOLE ERRORS:', errors.length ? errors.join(' | ') : 'none');
await page.screenshot({ path: 'tools/_hero.png' });
// full-page screenshot of the library area
await page.evaluate(()=>document.getElementById('library').scrollIntoView());
await new Promise(r=>setTimeout(r,400));
await page.screenshot({ path: 'tools/_library.png' });
// test copy + a filter
await page.evaluate(()=>{ const b=document.querySelector('[data-filter=question-papers]'); if(b) b.click(); });
await new Promise(r=>setTimeout(r,500));
const filtered = await page.evaluate(()=>document.querySelectorAll('.card').length);
console.log('AfterFilter(question-papers) cards:', filtered);
await page.screenshot({ path: 'tools/_filtered.png' });
// open a modal
await page.evaluate(()=>{ const b=document.querySelector('[data-view]'); if(b) b.click(); });
await new Promise(r=>setTimeout(r,400));
const modalOpen = await page.evaluate(()=>document.getElementById('modal').classList.contains('open'));
console.log('Modal opens:', modalOpen);
await page.screenshot({ path: 'tools/_modal.png' });
await browser.close();
