// Phase 1 acceptance gate. This script is deliberately read-only: it checks
// the compact-catalog launch path, activation/retention hooks, generated pages,
// and the shared brand assets without rebuilding or rewriting anything.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_PROMPTS = 848;
const EXPECTED_CATEGORIES = 45;
const EXPECTED_REDIRECTS = 71;
const EXPECTED_CACHE_VERSION = '22';
const MAX_CATALOG_RAW_BYTES = 450 * 1024;
const MAX_CATALOG_GZIP_BYTES = 100 * 1024;
const MAX_CATALOG_SOURCE_RATIO = 0.04;

const errors = [];
let assertions = 0;
const check = (condition, message) => {
  assertions += 1;
  if (!condition) errors.push(message);
};

function read(relativePath) {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

function parseWindowAssignment(source, marker, label) {
  const start = source.indexOf(marker);
  const end = source.lastIndexOf(';');
  if (start < 0 || end <= start) throw new Error(`${label}: assignment marker or terminator missing`);
  return JSON.parse(source.slice(start + marker.length, end));
}

function normaliseMarkup(value) {
  return String(value).trim().replace(/>\s+</g, '><').replace(/\s+/g, ' ');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lineNumbersFor(source, patterns) {
  const lines = String(source).split('\n');
  const hits = [];
  lines.forEach((line, index) => {
    if (patterns.some(pattern => pattern.test(line))) hits.push(index + 1);
  });
  return hits;
}

function hexToRgb(hex) {
  const value = String(hex).replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  return [0, 2, 4].map(offset => Number.parseInt(value.slice(offset, offset + 2), 16));
}

function luminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const linear = rgb.map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(a, b) {
  const first = luminance(a);
  const second = luminance(b);
  if (first == null || second == null) return 0;
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function listHtmlFiles(directory) {
  if (!existsSync(directory)) return [];
  const output = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) output.push(...listHtmlFiles(absolute));
    else if (entry.isFile() && entry.name.endsWith('.html')) output.push(absolute);
  }
  return output;
}

const indexSource = read('index.html');
const appSource = read('app.js');
const cssSource = read('styles.css');
const promptSource = read('data/prompts.js');
const catalogSource = read('data/catalog.js');
const hindiCatalogSource = read('data/catalog-hi.js');
const brandMark = read('assets/brand-mark.svg');
const favicon = read('favicon.svg');
const brandFont = readFileSync(resolve(ROOT, 'assets/fraunces-latin.woff2'));
const pageBuilderSource = read('tools/build-pages.mjs');
const brandGeneratorSource = read('tools/generate-brand-assets.mjs');
const redirects = JSON.parse(read('data/redirects.json'));

let data;
let catalog;
let hindiCatalog;
try {
  data = parseWindowAssignment(promptSource, 'window.PROMPT_DATA =', 'data/prompts.js');
  catalog = parseWindowAssignment(catalogSource, 'window.PROMPT_CATALOG =', 'data/catalog.js');
  hindiCatalog = parseWindowAssignment(hindiCatalogSource, 'window.PROMPT_CATALOG_LANG["hi"] =', 'data/catalog-hi.js');
} catch (error) {
  console.error(`Phase 1 QA: FAIL | assertions: ${assertions} | errors: 1`);
  console.error(`- Corpus parse failed: ${error.message}`);
  process.exit(1);
}

const sourceCategories = data.categories || [];
const sourcePrompts = sourceCategories.flatMap(category =>
  (category.prompts || []).map(prompt => ({ ...prompt, _category: category.category }))
);
const catalogCategories = catalog.categories || [];
const catalogPrompts = catalogCategories.flatMap(category =>
  (category.prompts || []).map(prompt => ({ ...prompt, _category: category.category }))
);
const sourceBySlug = new Map(sourcePrompts.map(prompt => [prompt.slug, prompt]));
const catalogBySlug = new Map(catalogPrompts.map(prompt => [prompt.slug, prompt]));

// 1. Frozen Phase 1 corpus/count contract.
check(sourcePrompts.length === EXPECTED_PROMPTS, `full corpus must contain ${EXPECTED_PROMPTS} prompts (found ${sourcePrompts.length})`);
check(sourceCategories.length === EXPECTED_CATEGORIES, `full corpus must contain ${EXPECTED_CATEGORIES} categories (found ${sourceCategories.length})`);
check(catalog.total === EXPECTED_PROMPTS, `catalog total must be ${EXPECTED_PROMPTS} (found ${catalog.total})`);
check(catalogPrompts.length === EXPECTED_PROMPTS, `catalog must contain ${EXPECTED_PROMPTS} cards (found ${catalogPrompts.length})`);
check(catalogCategories.length === EXPECTED_CATEGORIES, `catalog must contain ${EXPECTED_CATEGORIES} categories (found ${catalogCategories.length})`);
check(sourceBySlug.size === sourcePrompts.length, 'full-corpus slugs must be present and unique');
check(catalogBySlug.size === catalogPrompts.length, 'catalog slugs must be present and unique');
check(Object.keys(redirects).length === EXPECTED_REDIRECTS, `redirect manifest must retain ${EXPECTED_REDIRECTS} entries`);
check(/<title>[^<]*\(848\)[^<]*<\/title>/i.test(indexSource), 'home-page title does not expose the 848 count');
check(/data-stat=["']prompts["'][^>]*>848</i.test(indexSource), 'hero prompt statistic is not 848');
check(/data-stat=["']cats["'][^>]*>45</i.test(indexSource), 'hero category statistic is not 45');
check(/Browse all 848 prompts/i.test(indexSource), 'hero browse CTA does not expose the 848 count');
check(/Loading 848 prompts/i.test(indexSource), 'library loading state does not expose the 848 count');

for (const sourcePrompt of sourcePrompts) {
  const card = catalogBySlug.get(sourcePrompt.slug);
  check(Boolean(card), `catalog card missing for ${sourcePrompt.slug}`);
  if (!card) continue;
  check(card.title === sourcePrompt.title, `catalog title drift: ${sourcePrompt.slug}`);
  check(card.whatYouGet === sourcePrompt.whatYouGet, `catalog outcome drift: ${sourcePrompt.slug}`);
  check(card._category === sourcePrompt._category, `catalog category drift: ${sourcePrompt.slug}`);
  check(JSON.stringify(card.exams) === JSON.stringify(sourcePrompt.exams), `catalog exam facets drift: ${sourcePrompt.slug}`);
  check(card.aud === sourcePrompt.aud, `catalog audience facet drift: ${sourcePrompt.slug}`);
  const hindiCard = hindiCatalog[sourcePrompt.slug];
  check(Boolean(hindiCard) === Boolean(sourcePrompt.hi), `Hindi card-pack coverage drift: ${sourcePrompt.slug}`);
  if (sourcePrompt.hi && hindiCard) {
    check(hindiCard.title === sourcePrompt.hi.title, `Hindi card-pack title drift: ${sourcePrompt.slug}`);
    check(hindiCard.whatYouGet === sourcePrompt.hi.whatYouGet, `Hindi card-pack outcome drift: ${sourcePrompt.slug}`);
  }
}

// 2. Compact catalog and lazy full-body loading.
const catalogRawBytes = Buffer.byteLength(catalogSource);
const catalogGzipBytes = gzipSync(catalogSource).byteLength;
const sourceBytes = Buffer.byteLength(promptSource);
check(catalogRawBytes <= MAX_CATALOG_RAW_BYTES, `catalog exceeds ${MAX_CATALOG_RAW_BYTES} raw bytes (found ${catalogRawBytes})`);
check(catalogGzipBytes <= MAX_CATALOG_GZIP_BYTES, `catalog exceeds ${MAX_CATALOG_GZIP_BYTES} gzip bytes (found ${catalogGzipBytes})`);
check(catalogRawBytes / sourceBytes <= MAX_CATALOG_SOURCE_RATIO, `catalog is not compact enough (${(100 * catalogRawBytes / sourceBytes).toFixed(1)}% of full data)`);
check(!catalogSource.includes('window.PROMPT_DATA ='), 'catalog must not initialise the full prompt corpus');

const forbiddenCardKeys = new Set(['bestTool', 'worksOnFree', 'howToUse', 'effectiveUsage', 'commonFix', 'promptText']);
const allowedRootKeys = new Set(['version', 'total', 'searchKeywords', 'categories']);
const allowedCategoryKeys = new Set(['category', 'categoryTitle', 'categoryIcon', 'group', 'categoryBlurb', 'prompts']);
const allowedCardKeys = new Set(['title', 'tag', 'needsImage', 'makesImage', 'whatYouGet', 'slug', 'exams', 'aud', 'sk', 'featured', 'added', 'fmt', 'styles']);
check(Object.keys(catalog).every(key => allowedRootKeys.has(key)), 'catalog root contains an unexpected/full-body field');
check(Object.keys(hindiCatalog).length === EXPECTED_PROMPTS, `Hindi card pack must contain ${EXPECTED_PROMPTS} cards (found ${Object.keys(hindiCatalog).length})`);
for (const [slug, card] of Object.entries(hindiCatalog)) {
  check(catalogBySlug.has(slug), `Hindi card pack has an unknown slug: ${slug}`);
  check(Object.keys(card).every(key => key === 'title' || key === 'whatYouGet'), `Hindi card pack leaked a body field: ${slug}`);
}
for (const category of catalogCategories) {
  check(Object.keys(category).every(key => allowedCategoryKeys.has(key)), `catalog category contains an unexpected field: ${category.category}`);
  for (const card of category.prompts || []) {
    const cardKeys = Object.keys(card);
    check(cardKeys.every(key => allowedCardKeys.has(key)), `catalog card contains an unexpected field: ${card.slug}`);
    check(!cardKeys.some(key => forbiddenCardKeys.has(key)), `catalog leaked a prompt-body field: ${card.slug}`);
    if (card.sk) check(/^[A-Za-z0-9+/]+$/.test(card.sk) && card.sk.length <= 16, `catalog search bitset is invalid: ${card.slug}`);
  }
}

const catalogCheck = spawnSync(process.execPath, [resolve(ROOT, 'tools/build-catalog.mjs'), '--check'], {
  cwd: ROOT,
  encoding: 'utf8',
});
check(catalogCheck.status === 0, `catalog freshness check failed${catalogCheck.stderr ? `: ${catalogCheck.stderr.trim().split('\n').at(-1)}` : ''}`);

const promptVersion = (indexSource.match(/window\.MPS_DATA_URL\s*=\s*['"]data\/prompts\.js\?v=([^'"]+)/) || [])[1];
const catalogVersion = (indexSource.match(/['"]data\/catalog\.js\?v=([^'"]+)['"]/i) || [])[1];
const appVersion = (indexSource.match(/['"]app\.js\?v=([^'"]+)['"]/i) || [])[1];
const styleVersion = (indexSource.match(/<link\b[^>]*href=['"]styles\.css\?v=([^'"]+)['"][^>]*>/i) || [])[1];
const generatedDataVersion = (catalogSource.match(/window\.MPS_DATA_URL\s*=\s*window\.MPS_DATA_URL\s*\|\|\s*["']data\/prompts\.js\?v=([^"']+)/) || [])[1];
const fallbackDataVersion = (appSource.match(/window\.MPS_DATA_URL\s*\|\|\s*['"]data\/prompts\.js\?v=([^'"]+)/) || [])[1];
const languagePackVersion = (appSource.match(/data\/catalog-['"]?\s*\+\s*lang\s*\+\s*['"]\.js\?v=([^'"]+)/) || [])[1];
check(promptVersion === EXPECTED_CACHE_VERSION, `prompt cache version must be ${EXPECTED_CACHE_VERSION} (found ${promptVersion || 'missing'})`);
check(catalogVersion === EXPECTED_CACHE_VERSION, `catalog cache version must be ${EXPECTED_CACHE_VERSION} (found ${catalogVersion || 'missing'})`);
check(appVersion === EXPECTED_CACHE_VERSION, `app cache version must be ${EXPECTED_CACHE_VERSION} (found ${appVersion || 'missing'})`);
check(styleVersion === EXPECTED_CACHE_VERSION, `stylesheet cache version must be ${EXPECTED_CACHE_VERSION} (found ${styleVersion || 'missing'})`);
check(promptVersion === appVersion && appVersion === catalogVersion, 'prompt, catalog and app cache versions must move together');
check(generatedDataVersion === promptVersion, 'generated catalog points to a stale full-data cache version');
check(fallbackDataVersion === promptVersion, 'app lazy-loader fallback points to a stale full-data cache version');
check(languagePackVersion === promptVersion, 'app language-pack loader points to a stale cache version');

const scriptTags = [...indexSource.matchAll(/<script\b[^>]*src=['"]([^'"]+)['"][^>]*><\/script>/gi)];
const initialScriptUrls = scriptTags.map(match => match[1]);
check(!initialScriptUrls.some(url => /data\/prompts\.js/i.test(url)), 'full prompt data must not be an initial script request');
const staticCatalog = initialScriptUrls.some(url => /^data\/catalog\.js\?v=/.test(url));
const dynamicCatalog = /addScript\(['"]data\/catalog\.js\?v=[^'"]+['"]/.test(indexSource);
check(staticCatalog || dynamicCatalog, 'compact catalog launch hook is missing');
check(indexSource.indexOf(`data/catalog.js?v=${catalogVersion}`) < indexSource.indexOf(`app.js?v=${appVersion}`), 'catalog script must load before app.js');
if (dynamicCatalog) {
  check(/addScript\(['"]data\/catalog\.js\?v=[^'"]+['"],\s*function\s*\(\)\s*\{\s*addScript\(['"]app\.js\?v=/.test(indexSource), 'dynamic launch must wait for catalog before loading app.js');
  check(/addEventListener\(['"]load['"],\s*startCatalog/.test(indexSource), 'dynamic catalog launch must wait until the window load event');
}
for (const match of scriptTags.filter(item => /^(?:data\/catalog|app)\.js\?v=/.test(item[1]))) {
  check(/\bdefer\b/i.test(match[0]), `initial script must be deferred: ${match[1]}`);
}

try {
  // Compile only; do not execute browser code in Node.
  new Function(appSource);
  check(true, 'app.js syntax');
} catch (error) {
  check(false, `app.js syntax error: ${error.message}`);
}
check(/var CATALOG\s*=\s*window\.PROMPT_CATALOG/.test(appSource), 'app does not boot from the compact catalog');
check(/function loadFullData\(\)/.test(appSource), 'lazy full-data loader is missing');
check(/document\.createElement\(['"]script['"]\)/.test(appSource), 'lazy full-data loader does not create an on-demand script');
check(/function withFullPrompt\([\s\S]*?return loadFullData\(\)\.then/.test(appSource), 'full data is not gated behind a prompt action');
check(/function ensureCatalogLanguage\(lang\)/.test(appSource) && /data\/catalog-/.test(appSource), 'on-demand card-language loader is missing');
const initSlice = appSource.slice(appSource.indexOf('function init()'), appSource.indexOf("if (document.readyState === 'loading')"));
check(!/loadFullData\(\)/.test(initSlice), 'initialisation eagerly loads the full corpus');
check(/renderLimit:\s*60/.test(appSource) && /state\.renderLimit\s*\+=\s*60/.test(appSource), 'progressive 60-card rendering/show-more hook is missing');

// 3. The 60-second start: exact controls, bilingual chrome, complete 6x5 routing.
for (const id of ['quickStart', 'quickSegment', 'quickJobs', 'quickStatus', 'filterBar', 'groupChips', 'facetMount', 'formatMount']) {
  check(new RegExp(`id=["']${id}["']`).test(indexSource), `required Phase 1 mount is missing: #${id}`);
}
const expectedSegments = ['jee-main', 'jee-advanced', 'olympiad', 'boards', 'foundation', 'student'];
const jobCategories = {
  paper: ['question-papers', 'mock-sample-papers', 'competitive-exams', 'latex-pdf-sets'],
  'solve-verify': ['verified-answers', 'single-solution', 'multi-method', 'photo-doubt-solving', 'error-analysis'],
  worksheet: ['worksheets', 'dpp', 'print-beautifully', 'endless-practice'],
  ppt: ['presentations'],
  quiz: ['phone-quizzes', 'quiz-mcq', 'games-gamification'],
};
const quickSlice = appSource.slice(appSource.indexOf('var QUICK_SEGMENTS'), appSource.indexOf('/* ---------- cards ---------- */'));
for (const segment of expectedSegments) {
  check(new RegExp(`\\{\\s*id:\\s*['"]${escapeRegExp(segment)}['"][^}]*\\ben:\\s*['"][^'"]+['"][^}]*\\bhi:\\s*['"][^'"]+['"][^}]*\\}`).test(quickSlice), `quick-start bilingual segment missing: ${segment}`);
}
for (const [job, categories] of Object.entries(jobCategories)) {
  check(new RegExp(`id:\\s*['"]${escapeRegExp(job)}['"]`).test(quickSlice), `quick-start job missing: ${job}`);
  for (const category of categories) check(quickSlice.includes(`'${category}'`) || quickSlice.includes(`"${category}"`), `quick-start ${job} routing omits ${category}`);
}
check((quickSlice.match(/<svg\b/g) || []).length === 5, 'the five quick-start jobs must each use one inline SVG illustration');
check((quickSlice.match(/[\u0900-\u097f]/g) || []).length >= 20 && (appSource.match(/[\u0900-\u097f]/g) || []).length >= 100, 'quick-start Hindi chrome is incomplete');
check(/setLang\([\s\S]*?buildQuickStart\(\)/.test(appSource), 'language changes do not refresh quick-start chrome');
check(/openPromptCard\(state\.quickPrompt,\s*\{\s*fillOpen:\s*true\s*\}\)/.test(quickSlice), 'quick start does not open a fill-ready modal');
check(/options\.fillOpen\s*\?\s*['"] open['"]/.test(appSource), 'fill-ready modal option is not wired to an open details panel');
check(/localStorage\.setItem\(['"]mps-segment['"]/.test(quickSlice), 'quick-start segment is not remembered locally');

const routedCards = catalogCategories.flatMap(category => (category.prompts || []).map(prompt => ({ ...prompt, category: category.category })));
for (const segment of expectedSegments) {
  for (const [job, categories] of Object.entries(jobCategories)) {
    const preferred = routedCards.filter(card => categories.includes(card.category) && (
      segment === 'student'
        ? card.aud === 'student' || card.aud === 'both'
        : (card.exams || []).includes(segment)
    ));
    const fallback = routedCards.filter(card => categories.includes(card.category) && (card.exams || []).includes('any'));
    check(preferred.length > 0 || fallback.length > 0, `quick-start route has no result: ${segment} -> ${job}`);
  }
}

// 4. Retention and share loops are real stateful behaviors, not decorative labels.
check(/new Set\(JSON\.parse\(localStorage\.getItem\(['"]mps-favorites['"]/.test(appSource), 'saved prompts are not restored from local storage');
check(/localStorage\.setItem\(['"]mps-favorites['"]/.test(appSource), 'saved prompts are not persisted');
check(/state\.group === ['"]saved['"]/.test(appSource), 'Saved library filter is not wired');
check(/function promptOfDay\(\)/.test(appSource) && /toISOString\(\)\.slice\(0,\s*10\)/.test(appSource), 'deterministic daily prompt hook is missing');
check(/localStorage\.getItem\(['"]mps-recent['"]/.test(appSource) && /localStorage\.setItem\(['"]mps-recent['"]/.test(appSource), 'recent-prompt history is not persisted');
check(/\.slice\(0,\s*8\)/.test(appSource), 'recent-prompt history is not bounded');
check(/function sharePrompt\(p\)/.test(appSource), 'per-prompt sharing is missing');
const shareSlice = appSource.slice(appSource.indexOf('function sharePrompt(p)'), appSource.indexOf('/* ---------- delegated clicks'));
check(/navigator\.share/.test(shareSlice) && /wa\.me/.test(shareSlice), 'sharing needs native share plus WhatsApp fallback');
check(/T\(p,\s*['"]title['"]\)/.test(shareSlice) && /T\(p,\s*['"]whatYouGet['"]\)/.test(shareSlice), 'share copy must include the prompt title and outcome');
check(/SITE\s*\+\s*['"]p\//.test(shareSlice), 'share copy must include the canonical prompt URL');
check(!/promptText/.test(shareSlice), 'share copy must not leak the full prompt body');

// 5. Brand/UI design hooks and dark-mode contrast.
check(brandMark === favicon, 'favicon.svg must exactly equal assets/brand-mark.svg');
check(/viewBox=["']0 0 100 100["']/.test(brandMark), 'canonical brand mark must use a 100x100 viewBox');
check(/rx=["']16["']/.test(brandMark), 'canonical brand tile must use a 16% corner radius');
check(brandMark.includes('#6C5CE7') && brandMark.includes('#4834D4'), 'canonical brand gradient colors are wrong');
check(/>Σ<\/text>/.test(brandMark) && /font-weight=["']700["']/.test(brandMark), 'canonical brand glyph/weight is wrong');
check(createHash('sha256').update(brandFont).digest('hex') === '48282a415ec22e31beaf0a0666e6fae0c8cbddcd0b1f6e729f27c3ade8a64e43', 'pinned Fraunces brand font checksum drifted');
check(/@font-face\s*\{[^}]*font-family:'Fraunces'[^}]*assets\/fraunces-latin\.woff2/s.test(cssSource), 'local Fraunces brand font is not wired into CSS');
check(/rel=["']preload["'][^>]*assets\/fraunces-latin\.woff2[^>]*as=["']font["']/i.test(indexSource), 'Fraunces brand font is not preloaded');
const inlineBrand = (indexSource.match(/<span class=["']brand-tile["'][^>]*>\s*([\s\S]*?<\/svg>)\s*<\/span>/i) || [])[1];
check(Boolean(inlineBrand), 'home page inline brand mark is missing');
if (inlineBrand) check(normaliseMarkup(inlineBrand) === normaliseMarkup(brandMark), 'home page inline brand mark drifted from the canonical SVG');
check(/font-family:var\(--font-head\)[^}]*font-weight:700/.test(cssSource), 'brand wordmark is not Fraunces/heading-font 700');
check(/\.hero h1\s*\{[^}]*font-size:clamp\(40px,6vw,64px\)[^}]*letter-spacing:-\.02em/.test(cssSource), 'hero display does not match the 40-64px/-2% contract');
check(/\.section\s*\{[^}]*padding:var\(--space-12\)/.test(cssSource) && /\.section\s*\{padding:56px 16px\}/.test(cssSource), '96px desktop / 56px mobile section rhythm is missing');
check(/\.library-controls\.filter-bar\s*\{[^}]*position:sticky[^}]*backdrop-filter/.test(cssSource), 'compact sticky filter bar hook is missing');
check(/\.fchip\s*\{[^}]*min-height:44px/.test(cssSource), 'filter chips do not guarantee a 44px touch target');
check(/\.card:hover\s*\{[^}]*translateY\(-2px\)[^}]*box-shadow/.test(cssSource), 'card hover elevation hook is missing');
check(/-webkit-line-clamp:2/.test(cssSource), 'two-line card-title clamp is missing');
check(/\.featured-card::before/.test(cssSource), 'featured-card gradient-border hook is missing');
check(/\.cards\.is-initial-load/.test(cssSource) && /prefers-reduced-motion:reduce/.test(cssSource), 'card load stagger/reduced-motion guard is missing');
check(/stream\.querySelectorAll\(['"]\.cards['"]\)[\s\S]*?classList\.add\(['"]is-initial-load['"]\)/.test(appSource), 'app never applies the one-time card stagger class');

const darkBlocks = [...cssSource.matchAll(/\[data-theme=["']?dark["']?\]\s*\{([^}]+)\}/g)];
const darkBlock = darkBlocks.at(-1)?.[1] || '';
const darkVars = Object.fromEntries([...darkBlock.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map(match => [match[1], match[2]]));
check(String(darkVars.surface || '').toLowerCase() === '#1e2433', 'dark card surface must be #1E2433');
for (const [foreground, background] of [
  ['ink', 'surface'], ['ink-soft', 'surface'], ['ink-faint', 'surface'],
  ['violet', 'brand-soft'], ['green', 'green-soft'], ['gold', 'gold-soft'],
]) {
  const ratio = contrast(darkVars[foreground], darkVars[background]);
  check(ratio >= 4.5, `dark token contrast ${foreground}/${background} is ${ratio.toFixed(2)}:1 (needs 4.5:1)`);
}

// 6. Social asset, generated pages, sitemap, and brand parity everywhere.
const cover = readFileSync(resolve(ROOT, 'og-cover.png'));
check(cover.length >= 24 && cover.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'og-cover.png is not a valid PNG signature');
check(cover.length >= 24 && cover.readUInt32BE(16) === 1200 && cover.readUInt32BE(20) === 630, 'og-cover.png must be exactly 1200x630');
check(/og:image[^>]+og-cover\.png/i.test(indexSource), 'home social metadata does not use og-cover.png');
check(/og:image:width["']\s+content=["']1200["']/.test(indexSource) && /og:image:height["']\s+content=["']630["']/.test(indexSource), 'home social metadata has wrong cover dimensions');
check(brandGeneratorSource.includes('${TOTAL} prompts</strong> · English + हिंदी · free forever'), 'brand generator does not use the exact dynamic social-cover line');
check(/data\/prompts\.js/.test(brandGeneratorSource), 'brand generator does not derive the current prompt total from data');
check(/width:\s*1200,\s*height:\s*630/.test(brandGeneratorSource), 'brand generator viewport is not 1200x630');
check(pageBuilderSource.includes("assets/brand-mark.svg") && pageBuilderSource.includes("../../favicon.svg"), 'page builder does not consume the canonical brand/favicons');

const sitemapSource = read('sitemap.xml');
const sitemapLocations = [...sitemapSource.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
check(sitemapLocations.length === EXPECTED_PROMPTS + 1, `sitemap must contain home + ${EXPECTED_PROMPTS} prompt URLs (found ${sitemapLocations.length})`);
const generatedTextFiles = new Map();
for (const prompt of sourcePrompts) {
  const relative = `p/${prompt.slug}/index.html`;
  const absolute = resolve(ROOT, relative);
  check(existsSync(absolute), `generated prompt page missing: ${prompt.slug}`);
  if (!existsSync(absolute)) continue;
  const page = readFileSync(absolute, 'utf8');
  generatedTextFiles.set(relative, page);
  check(page.includes(brandMark.trim()), `generated prompt page brand drift: ${prompt.slug}`);
  check(page.includes(`../../styles.css?v=${styleVersion}`), `generated prompt page cache drift: ${prompt.slug}`);
  check(page.includes('../../favicon.svg'), `generated prompt page favicon missing: ${prompt.slug}`);
  check(page.includes('<meta property="og:image:width" content="1200">') && page.includes('<meta property="og:image:height" content="630">'), `generated prompt page social dimensions missing: ${prompt.slug}`);
  check(sitemapLocations.includes(`https://yosoyun.github.io/math-prompt-studio/p/${prompt.slug}/`), `sitemap URL missing: ${prompt.slug}`);
}
for (const [oldSlug, targetSlug] of Object.entries(redirects)) {
  const relative = `p/${oldSlug}/index.html`;
  const absolute = resolve(ROOT, relative);
  check(existsSync(absolute), `redirect page missing: ${oldSlug}`);
  if (!existsSync(absolute)) continue;
  const page = readFileSync(absolute, 'utf8');
  generatedTextFiles.set(relative, page);
  check(page.includes(brandMark.trim()), `redirect page brand drift: ${oldSlug}`);
  check(page.includes(`../../styles.css?v=${styleVersion}`) && page.includes('../../favicon.svg'), `redirect page asset/cache drift: ${oldSlug}`);
  check(page.includes(`../${targetSlug}/`), `redirect target drift: ${oldSlug}`);
  check(/http-equiv=["']refresh["']/i.test(page) && /location\.replace\(/.test(page), `redirect mechanisms missing: ${oldSlug}`);
}
const allGeneratedHtml = listHtmlFiles(resolve(ROOT, 'p'));
check(allGeneratedHtml.length === EXPECTED_PROMPTS + EXPECTED_REDIRECTS, `p/ must contain ${EXPECTED_PROMPTS + EXPECTED_REDIRECTS} generated HTML pages (found ${allGeneratedHtml.length})`);

// 7. Production-facing identity guard. The approved identity is learned from
// the existing About section, then forbidden everywhere else. Governance docs
// and QA code are intentionally outside this production-surface scan.
const aboutMatch = indexSource.match(/<section\b[^>]*\bid=["']about["'][^>]*>[\s\S]*?<\/section>/i);
check(Boolean(aboutMatch), 'approved About section is missing');
let protectedIdentity = '';
if (aboutMatch) {
  protectedIdentity = ((aboutMatch[0].match(/<[^>]*class=["'][^"']*\babout-name\b[^"']*["'][^>]*>([^<]+)<\//i) || [])[1] || '').trim();
  check(protectedIdentity.split(/\s+/).length >= 2, 'approved About identity could not be derived safely');
}
if (protectedIdentity) {
  const firstToken = protectedIdentity.split(/\s+/)[0];
  const identityPatterns = [
    new RegExp(escapeRegExp(protectedIdentity), 'i'),
    new RegExp(`\\b${escapeRegExp(firstToken)}\\b`, 'i'),
  ];
  const maskedIndex = indexSource.replace(aboutMatch[0], aboutMatch[0].replace(/[^\n]/g, ' '));
  const productionFiles = new Map([
    ['index.html', maskedIndex],
    ['app.js', appSource],
    ['styles.css', cssSource],
    ['data/prompts.js', promptSource],
    ['data/catalog.js', catalogSource],
    ['data/catalog-hi.js', hindiCatalogSource],
    ['assets/brand-mark.svg', brandMark],
    ['favicon.svg', favicon],
    ['tools/build-pages.mjs', pageBuilderSource],
    ['tools/generate-brand-assets.mjs', brandGeneratorSource],
    ...generatedTextFiles,
  ]);
  for (const [relative, source] of productionFiles) {
    const hits = lineNumbersFor(source, identityPatterns);
    check(hits.length === 0, `protected identity appears outside About: ${relative}${hits.length ? ` (line${hits.length === 1 ? '' : 's'} ${hits.slice(0, 8).join(', ')}${hits.length > 8 ? ', …' : ''})` : ''}`);
  }
}

console.log(`Phase 1 QA: ${errors.length ? 'FAIL' : 'PASS'} | assertions: ${assertions} | errors: ${errors.length}`);
console.log(`Corpus: ${sourcePrompts.length} prompts / ${sourceCategories.length} categories | catalog: ${catalogRawBytes} raw / ${catalogGzipBytes} gzip bytes`);
for (const error of errors) console.error(`- ${error}`);
if (errors.length) process.exit(1);
