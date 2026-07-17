// Keep public totals and cache versions in sync after generated corpus changes.
// Usage: node tools/sync-site-metadata.mjs --cache 23
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = resolve(ROOT, 'data/prompts.js');
const INDEX_FILE = resolve(ROOT, 'index.html');
const APP_FILE = resolve(ROOT, 'app.js');
const MARKER = 'window.PROMPT_DATA =';
const cacheIndex = process.argv.indexOf('--cache');
const cache = cacheIndex >= 0 ? process.argv[cacheIndex + 1] : '';
if (!/^\d+$/.test(cache)) throw new Error('Pass an integer cache version: --cache 23');

const dataSource = readFileSync(DATA_FILE, 'utf8');
const data = JSON.parse(dataSource.slice(dataSource.indexOf(MARKER) + MARKER.length, dataSource.lastIndexOf(';')));
const total = data.categories.reduce((sum, category) => sum + (category.prompts || []).length, 0);
const categories = data.categories.length;

let index = readFileSync(INDEX_FILE, 'utf8');
const oldTotal = Number((index.match(/<title>[^<]*\((\d+)\)/) || [])[1]);
if (!Number.isInteger(oldTotal)) throw new Error('Could not read the existing title count');
index = index.replaceAll(String(oldTotal), String(total));
index = index.replace(/(data-stat=["']cats["'][^>]*>)\d+/, `$1${categories}`);
index = index
  .replace(/styles\.css\?v=\d+/g, `styles.css?v=${cache}`)
  .replace(/data\/prompts\.js\?v=\d+/g, `data/prompts.js?v=${cache}`)
  .replace(/data\/catalog\.js\?v=\d+/g, `data/catalog.js?v=${cache}`)
  .replace(/app\.js\?v=\d+/g, `app.js?v=${cache}`);

let app = readFileSync(APP_FILE, 'utf8');
app = app
  .replace(/data\/prompts\.js\?v=\d+/g, `data/prompts.js?v=${cache}`)
  .replace(/data\/catalog-' \+ lang \+ '\.js\?v=\d+/g, `data/catalog-' + lang + '.js?v=${cache}`);

writeFileSync(INDEX_FILE, index);
writeFileSync(APP_FILE, app);
console.log(`Synced ${total} prompts, ${categories} categories, cache v${cache}`);
