// AUD-B/P1-B2 + AUD-E/P1-E2: mechanical guard for the shared brand tile and social-cover dimensions.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mark = readFileSync(resolve(ROOT, 'assets/brand-mark.svg'), 'utf8');
const favicon = readFileSync(resolve(ROOT, 'favicon.svg'), 'utf8');
const cover = readFileSync(resolve(ROOT, 'og-cover.png'));
const generator = readFileSync(resolve(ROOT, 'tools/generate-brand-assets.mjs'), 'utf8');
const pageBuilder = readFileSync(resolve(ROOT, 'tools/build-pages.mjs'), 'utf8');
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };

check(mark === favicon, 'favicon.svg must exactly match the canonical brand mark');
check(mark.includes('rx="16"'), 'brand tile must use a 16% corner radius');
check(mark.includes('#6C5CE7') && mark.includes('#4834D4'), 'brand gradient colors are wrong');
check(mark.includes('>Σ</text>'), 'brand glyph must be Σ');
check(mark.includes('font-weight="700"'), 'brand glyph must use weight 700');
check(cover.subarray(1, 4).toString('ascii') === 'PNG', 'og-cover.png is not a PNG');
check(cover.readUInt32BE(16) === 1200 && cover.readUInt32BE(20) === 630, 'og-cover.png must be exactly 1200x630');
check(generator.includes('${TOTAL} prompts</strong> · English + हिंदी · free forever'), 'social-cover line is not driven by the current prompt total');
check(generator.includes("data/prompts.js"), 'social-cover generator does not read the current prompt corpus');
check(generator.includes('document.fonts.check(\'700 82px Fraunces\')'), 'generator must verify Fraunces 700 loaded');
check(pageBuilder.includes("assets/brand-mark.svg"), 'baked pages do not use the canonical brand mark');
check(pageBuilder.includes("../../favicon.svg"), 'baked pages do not use favicon.svg');
check(pageBuilder.includes('styles\\.css\\?v='), 'baked pages do not discover the current stylesheet cache version');
check(pageBuilder.includes('id="lang"') && pageBuilder.includes('function swapLang()'), 'baked-page Hindi toggle was removed');
check(pageBuilder.includes('<link rel="canonical" href="${url}">'), 'prompt canonical metadata was removed');
check(pageBuilder.includes('<meta http-equiv="refresh" content="0; url=${localTo}">') && pageBuilder.includes('location.replace(${JSON.stringify(localTo)})'), 'redirect fallback no longer preserves both redirect mechanisms');
check(pageBuilder.includes('og:image:width') && pageBuilder.includes('twitter:description'), 'prompt share metadata is incomplete');

console.log(`Brand asset QA: ${errors.length ? 'FAIL' : 'PASS'} | errors: ${errors.length}`);
for (const error of errors) console.error(`- ${error}`);
if (errors.length) process.exit(1);
