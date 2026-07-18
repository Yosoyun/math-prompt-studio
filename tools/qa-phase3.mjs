// Phase 3 acceptance gate: full five-language corpus, shared language QA,
// multilingual catalog/UI, baked-page switches, cache parity and protected files.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { bracketTokens, languageConfig, scriptCount, validateTranslation } from './lang-qa.mjs';
import { LANGUAGE_DEFINITIONS, validateLanguageCompleteness } from './build-catalog.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MARKER = 'window.PROMPT_DATA =';
const EXPECTED_TOTAL = 961;
const CACHE = '24';
const errors = [];
let assertions = 0;
const check = (condition, message) => { assertions += 1; if (!condition) errors.push(message); };
const read = relative => readFileSync(resolve(ROOT, relative), 'utf8');
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const lineShape = value => String(value || '').split('\n').map(line => line.trim() ? 1 : 0);
const normalizedTokens = value => String(value || '').normalize('NFKC').toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) || [];

function extractAssignedLiteral(source, variable, opener, closer) {
  const assignment = `var ${variable} =`;
  const assignmentIndex = source.indexOf(assignment);
  if (assignmentIndex < 0) throw new Error(`${variable} assignment missing`);
  const start = source.indexOf(opener, assignmentIndex + assignment.length);
  if (start < 0) throw new Error(`${variable} literal missing`);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; index += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; index += 1; continue; }
    if (char === '/' && next === '*') { blockComment = true; index += 1; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === opener) depth += 1;
    if (char === closer) {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`${variable} literal is not balanced`);
}

function parseWindowJson(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`${marker.trim()} marker missing`);
  const jsonStart = source.indexOf('{', start + marker.length);
  if (jsonStart < 0) throw new Error(`${marker.trim()} payload missing`);
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = jsonStart; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(source.slice(jsonStart, index + 1));
    }
  }
  throw new Error(`${marker.trim()} payload is not balanced`);
}

async function runBrowserSmoke(expectedLiveCodes, dictionaries, searchSamples) {
  const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
  const server = createServer((request, response) => {
    try {
      let pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const file = resolve(ROOT, `.${pathname}`);
      if (file !== ROOT && !file.startsWith(`${ROOT}${sep}`)) { response.writeHead(403); response.end('Forbidden'); return; }
      if (!existsSync(file) || !statSync(file).isFile()) { response.writeHead(404); response.end('Not found'); return; }
      response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(readFileSync(file));
    } catch (error) {
      response.writeHead(500); response.end('Server error');
    }
  });
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });

  const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].find(existsSync);
  let browser;
  try {
    check(Boolean(chrome), 'browser smoke could not find Chrome or Chromium');
    if (!chrome) return;
    const { default: puppeteer } = await import('puppeteer-core');
    browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const browserErrors = [];
    page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
    page.on('pageerror', error => browserErrors.push(error.message));
    const address = server.address();
    await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.lang-chip');

    const chipCodes = await page.$$eval('.lang-chip', nodes => nodes.map(node => node.getAttribute('data-lang')));
    check(same(chipCodes, expectedLiveCodes), `browser language chips ${JSON.stringify(chipCodes)} do not match live languages ${JSON.stringify(expectedLiveCodes)}`);
    for (const code of expectedLiveCodes) {
      await page.click(`.lang-chip[data-lang="${code}"]`);
      await page.waitForFunction(language => document.documentElement.lang === language, {}, code);
      const controls = await page.evaluate(() => ({
        heroStart: document.querySelector('[data-i18n="heroStart"]')?.textContent.trim(),
        heroBrowse: document.querySelector('[data-i18n="heroBrowse"]')?.textContent.trim(),
        devicePhone: document.querySelector('[data-i18n="devicePhone"]')?.textContent.trim(),
        deviceComputer: document.querySelector('[data-i18n="deviceComputer"]')?.textContent.trim(),
        verifyAnswer: document.querySelector('[data-i18n="verifyAnswer"]')?.textContent.trim(),
      }));
      for (const [key, value] of Object.entries(controls)) check(value === dictionaries[code][key], `browser ${code} control translation failed: ${key}`);
    }

    for (const { code, slug, query } of searchSamples) {
      await page.click(`.lang-chip[data-lang="${code}"]`);
      await page.waitForFunction(language => document.documentElement.lang === language, {}, code);
      await page.$eval('#search', (input, value) => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); }, query);
      try {
        await page.waitForFunction(promptSlug => Boolean(document.querySelector(`article[data-slug="${promptSlug}"]`)), { timeout: 6000 }, slug);
        check(true, `browser ${code} body-only search found ${slug}`);
      } catch (error) {
        check(false, `browser ${code} body-only search did not find ${slug}`);
      }
      await page.$eval('#search', input => { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.waitForFunction(() => !document.getElementById('search').value);
    }
    check(!browserErrors.length, `browser console errors: ${browserErrors.join(' | ')}`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolveClose => server.close(resolveClose));
  }
}

const dataSource = read('data/prompts.js');
const data = JSON.parse(dataSource.slice(dataSource.indexOf(MARKER) + MARKER.length, dataSource.lastIndexOf(';')));
const prompts = data.categories.flatMap(category => category.prompts);
const contract = read('_handoff/tool-link-contract.txt').trim();
const appSource = read('app.js');
const indexSource = read('index.html');
check(prompts.length === EXPECTED_TOTAL, `expected ${EXPECTED_TOTAL} prompts, found ${prompts.length}`);
const languageStatus = validateLanguageCompleteness(data, contract);
const languageCodes = LANGUAGE_DEFINITIONS.map(item => item.code);
const liveCodes = languageCodes.filter(code => languageStatus[code].live);
const translatedLiveCodes = liveCodes.filter(code => code !== 'en');

let ui = {};
try {
  const dynamicUi = new Function(`return (${extractAssignedLiteral(appSource, 'UI', '{', '}')});`)();
  const staticUi = new Function(`return (${extractAssignedLiteral(appSource, 'STATIC_UI', '{', '}')});`)();
  ui = Object.fromEntries(languageCodes.map(code => [code, { ...(dynamicUi[code] || {}), ...(staticUi[code] || {}) }]));
} catch (error) {
  check(false, `UI dictionaries cannot be parsed: ${error.message}`);
}

const englishUiKeys = Object.keys(ui.en || {}).sort();
for (const code of languageCodes) {
  const keys = Object.keys(ui[code] || {}).sort();
  check(same(keys, englishUiKeys), `${code} UI dictionary key parity failed`);
  for (const key of englishUiKeys) check(typeof ui[code]?.[key] === 'string' && ui[code][key].trim(), `${code} UI string is empty: ${key}`);
}

const bindingKeys = new Set([...indexSource.matchAll(/\bdata-i18n(?:-placeholder|-aria|-title|-count)?=["']([^"']+)["']/g)].map(match => match[1]));
for (const key of bindingKeys) check(englishUiKeys.includes(key), `index binding has no UI dictionary key: ${key}`);
const runtimeUiKeys = new Set([...appSource.matchAll(/\btrf?\(\s*["']([^"']+)["']/g)].map(match => match[1]));
for (const key of runtimeUiKeys) check(englishUiKeys.includes(key), `app translation call has no UI dictionary key: ${key}`);

const translatedControlInventory = [
  ['heroStart', /<a\b(?=[^>]*\bclass=["'][^"']*\bbtn-primary\b)(?=[^>]*\bhref=["']#quickStart["'])(?=[^>]*\bdata-i18n=["']heroStart["'])[^>]*>/i],
  ['heroBrowse', /<a\b(?=[^>]*\bclass=["'][^"']*\bbtn-ghost\b)(?=[^>]*\bhref=["']#library["'])(?=[^>]*\bdata-i18n=["']heroBrowse["'])[^>]*>/i],
  ['devicePhone', /<button\b(?=[^>]*\bdata-tab=["']phone["'])(?=[^>]*\bdata-i18n=["']devicePhone["'])[^>]*>/i],
  ['deviceComputer', /<button\b(?=[^>]*\bdata-tab=["']computer["'])(?=[^>]*\bdata-i18n=["']deviceComputer["'])[^>]*>/i],
  ['verifyAnswer', /<button\b(?=[^>]*\bid=["']verifyBtn["'])(?=[^>]*\bdata-i18n=["']verifyAnswer["'])[^>]*>/i],
];
for (const [key, pattern] of translatedControlInventory) {
  check(pattern.test(indexSource), `translated control binding missing: ${key}`);
  for (const code of languageCodes.filter(value => value !== 'en')) check(ui[code]?.[key] !== ui.en?.[key], `${code} control leaked English: ${key}`);
}

const coverage = { hi: 0, bn: 0, mr: 0, te: 0 };
for (const prompt of prompts) {
  check(Boolean(prompt.hi), `Hindi missing: ${prompt.slug}`);
  if (prompt.hi) {
    coverage.hi += 1;
    check(scriptCount(prompt.hi.title, { min: 0x0900, max: 0x097f }) >= 2, `Hindi title script failed: ${prompt.slug}`);
    check(scriptCount(prompt.hi.promptText, { min: 0x0900, max: 0x097f }) >= 50, `Hindi prompt script failed: ${prompt.slug}`);
    const hindiPairs = [['title', prompt.title, prompt.hi.title], ['whatYouGet', prompt.whatYouGet, prompt.hi.whatYouGet], ['howToUse', prompt.howToUse, prompt.hi.howToUse], ['commonFix', prompt.commonFix, prompt.hi.commonFix], ['promptText', prompt.promptText, prompt.hi.promptText]];
    (prompt.effectiveUsage || []).forEach((value, index) => hindiPairs.push([`effectiveUsage[${index}]`, value, prompt.hi.effectiveUsage && prompt.hi.effectiveUsage[index]]));
    for (const [field, english, hindi] of hindiPairs) {
      check(same(bracketTokens(english), bracketTokens(hindi)), `Hindi ${field} placeholder mismatch: ${prompt.slug}`);
      const englishLines = String(english || '').split('\n');
      const hindiLines = String(hindi || '').split('\n');
      check(englishLines.length === hindiLines.length, `Hindi ${field} line count mismatch: ${prompt.slug}`);
      if (englishLines.length === hindiLines.length) {
        check(same(lineShape(english), lineShape(hindi)), `Hindi ${field} blank-line structure mismatch: ${prompt.slug}`);
        englishLines.forEach((line, index) => check(
          same(bracketTokens(line), bracketTokens(hindiLines[index])),
          `Hindi ${field} line ${index + 1} placeholder moved or damaged: ${prompt.slug}`,
        ));
      }
    }
    if (prompt.promptText.endsWith(contract)) check(prompt.hi.promptText.endsWith(contract), `Hindi contract suffix failed: ${prompt.slug}`);
  }
  for (const code of ['bn', 'mr', 'te']) {
    const translation = prompt[code];
    check(Boolean(translation), `${code} missing: ${prompt.slug}`);
    if (!translation) continue;
    const translationErrors = validateTranslation(prompt, translation, languageConfig(code), contract);
    check(!translationErrors.length, `${code} invalid ${prompt.slug}: ${translationErrors.join('; ')}`);
    if (!translationErrors.length) coverage[code] += 1;
  }
}
for (const code of Object.keys(coverage)) check(coverage[code] === EXPECTED_TOTAL, `${code} coverage ${coverage[code]}/${EXPECTED_TOTAL}`);
check(String(data.version || '').includes('phase3-five-languages'), `data version does not mark Phase 3 complete: ${data.version}`);

for (const { code, label } of LANGUAGE_DEFINITIONS) {
  const status = languageStatus[code];
  check(status.live === (status.total > 0 && status.valid === status.total && status.missing === 0 && status.invalid === 0), `${label} live status is not derived from complete valid coverage`);
  check(status.live, `${label} is blocked by incomplete or invalid translations (${status.valid}/${status.total})`);
  check(new RegExp(`\\n\\s*${code}:\\s*\\{`).test(appSource), `${code} UI dictionary missing`);
  if (code !== 'en') check(existsSync(resolve(ROOT, `data/catalog-${code}.js`)) === status.live, `${code} catalog pack presence does not match dynamic language completeness`);
}
check(appSource.includes('var LANGUAGE_STATUS = CATALOG.languageStatus'), 'SPA does not consume generated language completeness');
check(appSource.includes('function isLanguageLive(code)'), 'dynamic language completeness gate is missing');
check(appSource.includes('LANGS.filter(function (l) { return isLanguageLive(l.code); })'), 'language chips are not filtered by dynamic completeness');
check(appSource.includes("LANGS.filter(function (item) { return item.code !== 'en' && isLanguageLive(item.code); })"), 'search does not load every dynamically live language pack');
check(appSource.includes(`data/catalog-' + lang + '.js?v=${CACHE}`), `language catalog cache is not v${CACHE}`);
let appLanguages = [];
try { appLanguages = new Function(`return (${extractAssignedLiteral(appSource, 'LANGS', '[', ']')});`)(); }
catch (error) { check(false, `LANGS cannot be parsed: ${error.message}`); }
check(same(appLanguages.map(item => item.code), languageCodes), 'LANGS inventory differs from the validated language definitions');
check(same(appLanguages.map(item => item.label), LANGUAGE_DEFINITIONS.map(item => item.label)), 'LANGS labels differ from the validated language definitions');
check(/function T\(p, field\)/.test(appSource), 'T() translation resolver missing');
check(appSource.includes("p[code].searchText || ''"), 'translated body searchText is not included in search hay');
check(appSource.includes('document.documentElement.lang = lang'), 'SPA does not update the document language');

for (const asset of ['styles.css', 'data/prompts.js', 'data/catalog.js', 'app.js']) {
  check(new RegExp(asset.replace('.', '\\.') + `\\?v=${CACHE}`).test(indexSource), `index cache v${CACHE} missing for ${asset}`);
}
check(appSource.includes(`data/prompts.js?v=${CACHE}`), `full-data fallback cache is not v${CACHE}`);

let builtCatalog = null;
try { builtCatalog = parseWindowJson(read('data/catalog.js'), 'window.PROMPT_CATALOG = '); }
catch (error) { check(false, `built catalog cannot be parsed: ${error.message}`); }
if (builtCatalog) {
  for (const code of languageCodes) {
    const expected = languageStatus[code];
    const actual = builtCatalog.languageStatus?.[code];
    check(Boolean(actual), `built catalog language status missing: ${code}`);
    if (actual) check(same(actual, { total: expected.total, valid: expected.valid, missing: expected.missing, invalid: expected.invalid, live: expected.live }), `built catalog language status is stale: ${code}`);
  }
  for (const labels of [...Object.values(builtCatalog.categoryI18n || {}), ...Object.values(builtCatalog.groupI18n || {})]) {
    check(same(Object.keys(labels).sort(), [...liveCodes].sort()), 'built catalog localized chrome does not match live languages');
  }
}

const pageFields = ['title', 'whatYouGet', 'howToUse', 'effectiveUsage', 'commonFix', 'promptText'];
for (const prompt of prompts) {
  const file = resolve(ROOT, 'p', prompt.slug, 'index.html');
  check(existsSync(file), `baked page missing: ${prompt.slug}`);
  if (!existsSync(file)) continue;
  const page = readFileSync(file, 'utf8');
  for (const code of liveCodes) check(page.includes(`data-page-lang="${code}"`), `baked ${code} switch missing: ${prompt.slug}`);
  check(page.includes('var L10N='), `baked locale payload missing: ${prompt.slug}`);
  const localeMatch = page.match(/var L10N=([\s\S]*?);var UI=/);
  check(Boolean(localeMatch), `baked locale payload cannot be parsed: ${prompt.slug}`);
  if (localeMatch) {
    try {
      const locales = JSON.parse(localeMatch[1]);
      for (const code of liveCodes) {
        check(Boolean(locales[code]), `baked ${code} locale missing: ${prompt.slug}`);
        if (!locales[code]) continue;
        const expected = code === 'en' ? prompt : prompt[code];
        check(Boolean(expected), `source ${code} locale missing while checking baked page: ${prompt.slug}`);
        if (!expected) continue;
        for (const field of pageFields) check(same(locales[code][field], expected[field]), `baked ${code}.${field} stale: ${prompt.slug}`);
      }
    } catch (error) {
      check(false, `baked locale JSON invalid ${prompt.slug}: ${error.message}`);
    }
  }
  const scriptMatch = page.match(/<script>\s*(var L10N=[\s\S]*?)<\/script>/);
  check(Boolean(scriptMatch), `baked interactive script missing: ${prompt.slug}`);
  if (scriptMatch) {
    try { new Function(scriptMatch[1]); } catch (error) { check(false, `baked script syntax failed ${prompt.slug}: ${error.message}`); }
  }
}

const bodySearchSamples = [];
for (const code of translatedLiveCodes) {
  const file = resolve(ROOT, `data/catalog-${code}.js`);
  if (!existsSync(file)) continue;
  const source = readFileSync(file, 'utf8');
  const marker = `window.PROMPT_CATALOG_LANG["${code}"] = `;
  const start = source.indexOf(marker);
  check(start >= 0, `${code} catalog payload marker missing`);
  if (start < 0) continue;
  const pack = JSON.parse(source.slice(start + marker.length, source.lastIndexOf(';')));
  check(Object.keys(pack).length === EXPECTED_TOTAL, `${code} catalog coverage ${Object.keys(pack).length}/${EXPECTED_TOTAL}`);
  for (const prompt of prompts) {
    const card = pack[prompt.slug];
    check(Boolean(card && card.title && card.whatYouGet && card.searchText), `${code} catalog card/search missing: ${prompt.slug}`);
  }
  const tokenCounts = new Map();
  for (const prompt of prompts) for (const token of new Set(normalizedTokens(prompt[code]?.promptText))) tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
  let sample = null;
  for (const prompt of prompts) {
    const cardTokens = new Set(normalizedTokens(`${prompt[code]?.title || ''} ${prompt[code]?.whatYouGet || ''}`));
    const query = normalizedTokens(prompt[code]?.promptText).find(token => token.length > 2 && /\p{M}/u.test(token) && !cardTokens.has(token) && tokenCounts.get(token) === 1);
    if (query) { sample = { slug: prompt.slug, query }; break; }
  }
  check(Boolean(sample), `${code} has no unique combining-mark body-only search sample`);
  if (sample) {
    const indexedTokens = new Set(normalizedTokens(pack[sample.slug].searchText));
    check(indexedTokens.has(sample.query), `${code} exact body-only search token missing from catalog: ${sample.slug}`);
    bodySearchSamples.push({ code, ...sample });
  }
}

const catalogCheck = spawnSync(process.execPath, [resolve(ROOT, 'tools/build-catalog.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8' });
check(catalogCheck.status === 0, `catalog freshness failed: ${(catalogCheck.stderr || catalogCheck.stdout).trim().split('\n').at(-1) || 'unknown'}`);
for (const code of languageCodes.filter(code => code !== 'en' && code !== 'hi')) {
  const status = spawnSync(process.execPath, [resolve(ROOT, 'tools/lang-status.mjs'), '--lang', code], { cwd: ROOT, encoding: 'utf8' });
  check(status.status === 0 && /remaining:\s*0\s*\|\s*invalid:\s*0/.test(status.stdout), `${code} status failed: ${status.stdout.trim()}`);
}
const hindiStatus = spawnSync(process.execPath, [resolve(ROOT, 'tools/hindi-status.mjs')], { cwd: ROOT, encoding: 'utf8' });
check(hindiStatus.status === 0 && /remaining:\s*0/.test(hindiStatus.stdout), `Hindi status failed: ${hindiStatus.stdout.trim()}`);
const hindiInvariant = spawnSync(process.execPath, [resolve(ROOT, 'tools/repair-hindi-invariants.mjs'), '--check'], { cwd: ROOT, encoding: 'utf8' });
check(hindiInvariant.status === 0, `Hindi invariant audit failed: ${(hindiInvariant.stderr || hindiInvariant.stdout).trim()}`);
const protectedHashes = {
  'AGENTS.md': 'c7a2f47fcf09080defa6f7f25e3c0430e55a372c41a719b38b2c6fde3f40e4d9',
  'tools/merge-hindi.mjs': 'fdc49a69329bc56dc9d6ea6b5625a5e1c6fdaefbfb98d64412d06276a0b1d22e',
  'tools/hindi-status.mjs': '45c7ff1ca70adb7a0852ac529ba64e175454d7e4335891f5c1a5c79b1a5a5125',
};
for (const [file, expectedHash] of Object.entries(protectedHashes)) {
  check(sha256(read(file)) === expectedHash, `protected file differs from trusted Phase-2 content: ${file}`);
}

const about = indexSource.match(/<section\b[^>]*\bid=["']about["'][^>]*>[\s\S]*?<\/section>/i)?.[0] || '';
const identity = (about.match(/class=["'][^"']*about-name[^"']*["'][^>]*>([^<]+)/i)?.[1] || '').trim();
check(Boolean(about), 'About section missing; protected identity boundary cannot be verified');
check(Boolean(identity), 'protected identity missing from the About section');
if (about && identity) {
  const maskedIndex = indexSource.replace(about, about.replace(/[^\n]/g, ' '));
  const names = [identity, identity.split(/\s+/)[0]].map(value => new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  // Keep this allowlist text-only: the scan must cover source and configuration
  // files (including translation Python), without decoding arbitrary binaries.
  const textExtensions = /\.(?:html?|cjs|js|jsx|mjs|ts|tsx|py|pyw|rb|sh|bash|zsh|css|scss|less|json|jsonc|jsonl|ya?ml|toml|ini|cfg|conf|properties|env|md|mdx|txt|csv|tsv|xml|svg|sql)$/i;
  const extensionlessTextFiles = /(?:^|\/)(?:Dockerfile|Makefile|Procfile|\.env(?:\.[^/]+)?|\.gitignore|\.gitattributes|\.editorconfig)$/i;
  const listed = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' });
  check(listed.status === 0, 'could not enumerate tracked and untracked files for protected-identity scan');
  const files = new Set((listed.stdout || '').split('\n').filter(file => file && (textExtensions.test(file) || extensionlessTextFiles.test(file))));
  for (const file of files) {
    const absolute = resolve(ROOT, file);
    if (!existsSync(absolute) || !statSync(absolute).isFile()) continue;
    const source = file === 'index.html' ? maskedIndex : readFileSync(absolute, 'utf8');
    if (!names.some(pattern => pattern.test(source))) continue;
    const baseline = spawnSync('git', ['show', `b4ff314:${file}`], { cwd: ROOT, encoding: 'utf8' });
    check(baseline.status === 0 && baseline.stdout === readFileSync(absolute, 'utf8'), `protected identity was added or changed outside About: ${file}`);
  }
}

// The browser probe is intentionally last: it exercises the exact built files,
// but only after static completeness/freshness has passed so partial packs can
// never be mistaken for a UI failure.
if (!errors.length) {
  try { await runBrowserSmoke(liveCodes, ui, bodySearchSamples); }
  catch (error) { check(false, `browser language/search smoke failed: ${error.message}`); }
}

console.log(`Phase 3 QA: ${errors.length ? 'FAIL' : 'PASS'} | assertions ${assertions} | errors ${errors.length}`);
console.log(`Prompts ${prompts.length} | coverage ${JSON.stringify(coverage)} | data version ${data.version}`);
for (const error of errors) console.error(`- ${error}`);
if (errors.length) process.exit(1);
