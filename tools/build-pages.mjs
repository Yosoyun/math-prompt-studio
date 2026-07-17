// Phase 1: give every prompt a shareable, SEO-friendly static page at /p/<slug>/.
// Also writes slug back into data/prompts.js and regenerates sitemap.xml.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://yosoyun.github.io/math-prompt-studio/';

const src = readFileSync(ROOT + '/data/prompts.js', 'utf8');
const DATA = JSON.parse(src.slice(src.indexOf('window.PROMPT_DATA =') + 'window.PROMPT_DATA ='.length, src.lastIndexOf(';')));

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attr = s => esc(s).replace(/\n/g, ' ');
function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64).replace(/-+$/, ''); }

// assign unique slugs
const seen = new Set();
for (const c of DATA.categories) {
  for (const p of c.prompts) {
    let base = slugify(p.title) || slugify(c.category);
    let s = base, i = 2;
    while (seen.has(s)) { s = base + '-' + i++; }
    seen.add(s); p.slug = s;
  }
}

function relText(p) { return p.makesImage ? 'Makes images - needs an image AI' : (p.needsImage ? 'Attach a photo of the question first' : 'Works on any free AI'); }
function relDot(p) { return p.makesImage ? 'dot-amber' : (p.needsImage ? 'dot-blue' : 'dot-green'); }

const GRAND = DATA.categories.reduce((t, c) => t + c.prompts.length, 0);

function pageHTML(p, cat) {
  const url = SITE + 'p/' + p.slug + '/';
  const title = p.title + ' - free AI prompt for maths teachers';
  const desc = (p.whatYouGet || ('A free AI prompt for maths teachers: ' + p.title)).slice(0, 155);
  const eff = (p.effectiveUsage || []).map(s => '<li>' + esc(s) + '</li>').join('');
  const pjson = JSON.stringify(p.promptText).replace(/<\//g, '<\\/');
  const ld = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'CreativeWork', name: p.title, headline: p.title,
    description: desc, url, isAccessibleForFree: true, inLanguage: 'en',
    about: { '@type': 'Thing', name: 'Mathematics teaching' }, genre: cat.categoryTitle,
    publisher: { '@type': 'Organization', name: 'Maths Prompt Studio' },
    isPartOf: { '@type': 'WebSite', name: 'Maths Prompt Studio', url: SITE }
  });
  return `<!DOCTYPE html><html lang="en" data-theme="light"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | Maths Prompt Studio</title>
<meta name="description" content="${attr(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${attr(p.title)} - free AI prompt for maths teachers">
<meta property="og:description" content="${attr(desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Maths Prompt Studio">
<meta property="og:image" content="${SITE}og-cover.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}og-cover.png">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%E2%88%91%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,900&family=Inter:wght@400;500;600;700;800&family=Caveat:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../styles.css?v=8">
<script type="application/ld+json">${ld}</script>
</head><body>
<div class="grain" aria-hidden="true"></div>
<header class="site-head">
  <a class="brand" href="../../"><span class="brand-mark" aria-hidden="true">&#8721;</span><span class="brand-text"><span class="brand-name">Maths Prompt Studio</span><span class="brand-by">free maths platform</span></span></a>
  <nav class="head-nav"><a href="../../#library">All ${GRAND} prompts</a><a href="../../#guide">Beginner's Guide</a></nav>
</header>
<main class="ppage">
  <p class="pp-crumb"><a href="../../">Home</a> / <a href="../../#cat-${esc(cat.category)}">${esc(cat.categoryTitle)}</a> / ${esc(p.title)}</p>
  <article class="pp-card">
    <div class="card-tags"><span class="tag tag-cat">${esc(cat.categoryTitle)}</span><span class="tag ${p.makesImage || p.needsImage ? 'tag-img' : 'tag-txt'}">${esc(p.tag || (p.makesImage ? 'Makes images' : p.needsImage ? 'Photo needed' : 'Text only'))}</span></div>
    ${p.hi ? '<div class="card-open" style="margin-bottom:10px"><button class="btn-soft card-copy" id="lang">&#2361;&#2367;&#2306;&#2342;&#2368; &#2350;&#2375;&#2306; &#2342;&#2375;&#2326;&#2375;&#2306;</button></div>' : ''}
    <h1 id="ttl">${esc(p.title)}</h1>
    <p class="card-what" id="wht" style="font-size:16px">${esc(p.whatYouGet)}</p>
    <div class="card-rel"><span class="rel"><span class="dot ${relDot(p)}"></span>${esc(relText(p))}</span> &nbsp;&middot;&nbsp; <span class="rel">Best tool: <b>&nbsp;${esc(p.bestTool || 'Any AI chat')}</b></span></div>
    ${eff ? '<div class="modal-eff"><h4>&#9989; How to use this effectively</h4><ol>' + eff + '</ol></div>' : ''}
    ${p.commonFix ? '<div class="modal-fix"><b>&#128295; If it is not right, reply with this:</b> ' + esc(p.commonFix) + '</div>' : ''}
    <button class="card-copy-main" id="cp">&#128203; Copy prompt</button>
    <div class="card-open"><button class="btn-tool t-gpt" id="gpt">&#129302; Open ChatGPT</button><button class="btn-tool t-claude" id="cla">&#128172; Open Claude</button></div>
    <div class="card-open" style="margin-top:8px"><button class="btn-soft card-copy" id="sh">&#128241; Share this prompt</button><button class="btn-soft card-copy" id="lnk">&#128279; Copy link</button></div>
    <div class="modal-lbl" style="margin-top:16px">THE PROMPT</div>
    <div class="prompt-box"><pre id="pt">${esc(p.promptText)}</pre></div>
  </article>
  <p style="text-align:center;margin-top:26px"><a class="btn btn-primary" href="../../#library">&#9664; Browse all ${GRAND} free prompts</a></p>
</main>
<footer class="site-foot"><div class="foot-sign"><span class="foot-sign-name">Maths Prompt Studio</span><span class="foot-sign-sub">free, forever &middot; &#2350;&#2369;&#2347;&#2364;&#2381;&#2340;, &#2361;&#2350;&#2375;&#2358;&#2366;</span></div><p class="foot-meta"><a href="../../#about">About the author</a> &middot; free, forever</p></footer>
<div class="toast" id="t" role="status" aria-live="polite">Copied!</div>
<script>
var P=${pjson};var HI=${JSON.stringify(p.hi || null).replace(/<\//g, '<\\/')};var LNG='en';var URL=${JSON.stringify(url)};
(function(){try{var th=localStorage.getItem('mps-theme');if(th)document.documentElement.setAttribute('data-theme',th);}catch(e){}})();
function activeP(){return (LNG==='hi'&&HI&&HI.promptText)?HI.promptText:P;}
(function(){var lb=document.getElementById('lang');if(!lb)return;
  try{if(localStorage.getItem('mps-lang')==='hi')swapLang();}catch(e){}
  lb.onclick=swapLang;
  function swapLang(){LNG=LNG==='en'?'hi':'en';var hiOn=LNG==='hi';
    lb.textContent=hiOn?'View in English':'\\u0939\\u093f\\u0902\\u0926\\u0940 \\u092e\\u0947\\u0902 \\u0926\\u0947\\u0916\\u0947\\u0902';
    if(HI.title)document.getElementById('ttl').textContent=hiOn?HI.title:${JSON.stringify(p.title)};
    if(HI.whatYouGet)document.getElementById('wht').textContent=hiOn?HI.whatYouGet:${JSON.stringify(p.whatYouGet || '')};
    document.getElementById('pt').textContent=activeP();
    try{localStorage.setItem('mps-lang',LNG);}catch(e){}}
})();
function toast(m){var t=document.getElementById('t');t.textContent=m;t.classList.add('show');setTimeout(function(){t.classList.remove('show')},2600);}
function clip(x){return (navigator.clipboard&&navigator.clipboard.writeText)?navigator.clipboard.writeText(x):new Promise(function(r){var a=document.createElement('textarea');a.value=x;a.style.position='fixed';a.style.opacity=0;document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(e){}document.body.removeChild(a);r();});}
document.getElementById('cp').onclick=function(){clip(activeP()).then(function(){toast('Copied! Paste it into your AI chat.')})};
function openT(base,name){var full=base+'?q='+encodeURIComponent(activeP());var u=full.length<=7000?full:base;clip(activeP()).then(function(){window.open(u,'_blank','noopener');toast(name+' opening with your prompt loaded. Also copied - if empty, just paste it.')})}
document.getElementById('gpt').onclick=function(){openT('https://chatgpt.com/','ChatGPT')};
document.getElementById('cla').onclick=function(){openT('https://claude.ai/new','Claude')};
document.getElementById('lnk').onclick=function(){clip(URL).then(function(){toast('Link copied - share it with a teacher!')})};
document.getElementById('sh').onclick=function(){var msg='Free AI prompt for maths teachers - '+document.title.split(' - ')[0]+': ';if(navigator.share){navigator.share({title:'Maths Prompt Studio',text:msg,url:URL}).catch(function(){})}else{window.open('https://wa.me/?text='+encodeURIComponent(msg+' '+URL),'_blank')}};
</script>
</body></html>`;
}

// clean old pages and rebuild
if (existsSync(ROOT + '/p')) rmSync(ROOT + '/p', { recursive: true, force: true });
let n = 0;
const urls = [];
for (const c of DATA.categories) {
  for (const p of c.prompts) {
    mkdirSync(ROOT + '/p/' + p.slug, { recursive: true });
    writeFileSync(ROOT + '/p/' + p.slug + '/index.html', pageHTML(p, c));
    urls.push(SITE + 'p/' + p.slug + '/');
    n++;
  }
}

// redirect stubs: data/redirects.json maps removed slugs -> surviving slugs, so old
// bookmarks and indexed pages keep working after a dedup pass
let nRedirects = 0;
if (existsSync(ROOT + '/data/redirects.json')) {
  const redirects = JSON.parse(readFileSync(ROOT + '/data/redirects.json', 'utf8'));
  for (const [oldSlug, newSlug] of Object.entries(redirects)) {
    if (seen.has(oldSlug)) continue; // a live prompt owns this slug now
    const to = SITE + 'p/' + newSlug + '/';
    const localTo = '../' + newSlug + '/';
    mkdirSync(ROOT + '/p/' + oldSlug, { recursive: true });
    writeFileSync(ROOT + '/p/' + oldSlug + '/index.html',
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Moved - Maths Prompt Studio</title>` +
      `<link rel="canonical" href="${to}"><meta http-equiv="refresh" content="0; url=${localTo}">` +
      `<meta name="robots" content="noindex"></head><body><p>This prompt merged into a better version - ` +
      `<a href="${localTo}">continue here</a>.</p><script>location.replace(${JSON.stringify(localTo)});</script></body></html>`);
    nRedirects++;
  }
}

// write slugs back into data/prompts.js
const grand = DATA.categories.reduce((t, c) => t + c.prompts.length, 0);
const banner = '/* Maths Prompt Studio data - ' + grand + ' prompts across ' + DATA.categories.length + ' categories. v' + (DATA.version || '') + '. Auto-generated; do not edit by hand. */\n';
writeFileSync(ROOT + '/data/prompts.js', banner + 'window.PROMPT_DATA = ' + JSON.stringify(DATA) + ';\n');

// sitemap with homepage + every prompt page
const today = '2026-06-18';
const sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  '  <url><loc>' + SITE + '</loc><lastmod>' + today + '</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>']
  .concat(urls.map(u => '  <url><loc>' + u + '</loc><lastmod>' + today + '</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>'))
  .concat(['</urlset>']).join('\n');
writeFileSync(ROOT + '/sitemap.xml', sm + '\n');

console.log('Built', n, 'per-prompt pages under /p/ (+', nRedirects, 'redirect stubs), wrote slugs into data, sitemap has', urls.length + 1, 'URLs.');
