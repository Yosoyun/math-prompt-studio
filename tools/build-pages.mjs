// Phase 1: give every prompt a shareable, SEO-friendly static page at /p/<slug>/.
// Also writes slug back into data/prompts.js and regenerates sitemap.xml.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { CATEGORY_I18N, LANGUAGE_DEFINITIONS, validateLanguageCompleteness } from './build-catalog.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://yosoyun.github.io/math-prompt-studio/';
// AUD-B/P1-B2 + AUD-E/P1-E2: baked and redirect pages share the canonical tile,
// favicon, current CSS cache key, and prompt-specific social metadata.
const BRAND_MARK = readFileSync(ROOT + '/assets/brand-mark.svg', 'utf8').trim();
const homeSource = readFileSync(ROOT + '/index.html', 'utf8');
const styleVersion = (homeSource.match(/styles\.css\?v=([a-z0-9._-]+)/i) || [])[1];
if (!styleVersion) throw new Error('Could not read the current styles.css cache version from index.html');
const STYLESHEET = `../../styles.css?v=${styleVersion}`;
const FAVICON = '../../favicon.svg';
const FONT_LINKS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,900&family=Inter:wght@400;500;600;700;800&family=Caveat:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">';

const src = readFileSync(ROOT + '/data/prompts.js', 'utf8');
const DATA = JSON.parse(src.slice(src.indexOf('window.PROMPT_DATA =') + 'window.PROMPT_DATA ='.length, src.lastIndexOf(';')));
const CONTRACT = readFileSync(ROOT + '/_handoff/tool-link-contract.txt', 'utf8').trim();
const LANGUAGE_STATUS = validateLanguageCompleteness(DATA, CONTRACT);
const LIVE_LANGUAGE_DEFINITIONS = LANGUAGE_DEFINITIONS.filter(definition => LANGUAGE_STATUS[definition.code].live);
const DRY_RUN = process.argv.includes('--dry-run');

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
function brand(home = '../../') {
  return `<a class="brand" id="brandHome" href="${home}" aria-label="Maths Prompt Studio home"><span class="brand-mark" aria-hidden="true" style="background:none;border-radius:0;box-shadow:none">${BRAND_MARK}</span><span class="brand-text"><span class="brand-name">Maths Prompt Studio</span><span class="brand-by" id="brandBy">free maths platform</span></span></a>`;
}

const GRAND = DATA.categories.reduce((t, c) => t + c.prompts.length, 0);
const PAGE_UI = {
  en: {
    effective: 'How to use this effectively', fix: 'If it is not right, reply with this:', copyPrompt: 'Copy prompt', openChatGPT: 'Open ChatGPT', openClaude: 'Open Claude', sharePrompt: 'Share this prompt', copyLink: 'Copy link', promptLabel: 'THE PROMPT',
    copied: 'Copied! Paste it into your AI chat.', opening: '{tool} is opening with your prompt loaded. It is also copied — if the box is empty, just paste it.', linkCopied: 'Link copied — share it with a teacher!', shareLead: 'Free AI prompt for maths teachers', browseAll: 'Browse all {count} free prompts',
    makesImages: 'Makes images — needs an image AI', attachPhoto: 'Attach a photo of the question first', freeAI: 'Works on any free AI', bestTool: 'Best tool', anyAIChat: 'Any AI chat', allPrompts: 'All {count} prompts', guide: 'Beginner’s Guide', home: 'Home',
    promptLanguage: 'Prompt language', brandHome: 'Maths Prompt Studio home', freePlatform: 'free maths platform', makesImagesTag: 'Makes images', photoNeededTag: 'Photo needed', textOnlyTag: 'Text only',
  },
  hi: {
    effective: 'इसे प्रभावी ढंग से कैसे इस्तेमाल करें', fix: 'अगर जवाब ठीक न लगे, तो यह भेजें:', copyPrompt: 'प्रॉम्प्ट कॉपी करें', openChatGPT: 'ChatGPT में खोलें', openClaude: 'Claude में खोलें', sharePrompt: 'यह प्रॉम्प्ट शेयर करें', copyLink: 'लिंक कॉपी करें', promptLabel: 'प्रॉम्प्ट',
    copied: 'कॉपी हो गया! अपने AI chat में पेस्ट करें।', opening: '{tool} आपके प्रॉम्प्ट के साथ खुल रहा है। प्रॉम्प्ट कॉपी भी हो गया है—बॉक्स खाली हो तो पेस्ट करें।', linkCopied: 'लिंक कॉपी हो गया—किसी शिक्षक को भेजें!', shareLead: 'गणित शिक्षकों के लिए मुफ़्त AI प्रॉम्प्ट', browseAll: 'सभी {count} मुफ़्त प्रॉम्प्ट देखें',
    makesImages: 'चित्र बनाता है—image AI चाहिए', attachPhoto: 'पहले प्रश्न की फोटो जोड़ें', freeAI: 'किसी भी मुफ़्त AI पर काम करता है', bestTool: 'सबसे अच्छा टूल', anyAIChat: 'कोई भी AI chat', allPrompts: 'सभी {count} प्रॉम्प्ट', guide: 'शुरुआती गाइड', home: 'होम',
    promptLanguage: 'प्रॉम्प्ट भाषा', brandHome: 'Maths Prompt Studio होम', freePlatform: 'मुफ़्त गणित मंच', makesImagesTag: 'चित्र बनाता है', photoNeededTag: 'फोटो चाहिए', textOnlyTag: 'केवल पाठ',
  },
  bn: {
    effective: 'এটি কার্যকরভাবে কীভাবে ব্যবহার করবেন', fix: 'উত্তর ঠিক না হলে এটি পাঠান:', copyPrompt: 'প্রম্পট কপি করুন', openChatGPT: 'ChatGPT-এ খুলুন', openClaude: 'Claude-এ খুলুন', sharePrompt: 'প্রম্পটটি শেয়ার করুন', copyLink: 'লিংক কপি করুন', promptLabel: 'প্রম্পট',
    copied: 'কপি হয়েছে! আপনার AI chat-এ paste করুন।', opening: '{tool} আপনার প্রম্পটসহ খুলছে। প্রম্পটটি কপিও হয়েছে—বক্স খালি থাকলে paste করুন।', linkCopied: 'লিংক কপি হয়েছে—একজন শিক্ষককে পাঠান!', shareLead: 'গণিত শিক্ষকদের জন্য বিনামূল্যের AI প্রম্পট', browseAll: 'সব {count}টি বিনামূল্যের প্রম্পট দেখুন',
    makesImages: 'ছবি তৈরি করে—image AI দরকার', attachPhoto: 'আগে প্রশ্নের একটি ছবি যুক্ত করুন', freeAI: 'যেকোনো বিনামূল্যের AI-তে কাজ করে', bestTool: 'সেরা টুল', anyAIChat: 'যেকোনো AI chat', allPrompts: 'সব {count}টি প্রম্পট', guide: 'শুরুর গাইড', home: 'হোম',
    promptLanguage: 'প্রম্পটের ভাষা', brandHome: 'Maths Prompt Studio হোম', freePlatform: 'বিনামূল্যের গণিত প্ল্যাটফর্ম', makesImagesTag: 'ছবি তৈরি করে', photoNeededTag: 'ছবি দরকার', textOnlyTag: 'শুধু টেক্সট',
  },
  mr: {
    effective: 'हे परिणामकारकपणे कसे वापरावे', fix: 'उत्तर योग्य नसेल तर हे पाठवा:', copyPrompt: 'प्रॉम्प्ट कॉपी करा', openChatGPT: 'ChatGPT मध्ये उघडा', openClaude: 'Claude मध्ये उघडा', sharePrompt: 'हा प्रॉम्प्ट शेअर करा', copyLink: 'लिंक कॉपी करा', promptLabel: 'प्रॉम्प्ट',
    copied: 'कॉपी झाले! आपल्या AI chat मध्ये paste करा.', opening: '{tool} आपला प्रॉम्प्ट घेऊन उघडत आहे. प्रॉम्प्ट कॉपीही झाला आहे—बॉक्स रिकामा असल्यास paste करा.', linkCopied: 'लिंक कॉपी झाली—एका शिक्षकाला पाठवा!', shareLead: 'गणित शिक्षकांसाठी मोफत AI प्रॉम्प्ट', browseAll: 'सर्व {count} मोफत प्रॉम्प्ट पाहा',
    makesImages: 'चित्रे तयार करते—image AI हवा', attachPhoto: 'आधी प्रश्नाचा फोटो जोडा', freeAI: 'कोणत्याही मोफत AI वर चालते', bestTool: 'सर्वोत्तम टूल', anyAIChat: 'कोणताही AI chat', allPrompts: 'सर्व {count} प्रॉम्प्ट', guide: 'नवशिक्यांसाठी मार्गदर्शक', home: 'होम',
    promptLanguage: 'प्रॉम्प्टची भाषा', brandHome: 'Maths Prompt Studio होम', freePlatform: 'मोफत गणित मंच', makesImagesTag: 'चित्रे तयार करते', photoNeededTag: 'फोटो आवश्यक', textOnlyTag: 'फक्त मजकूर',
  },
  te: {
    effective: 'దీన్ని సమర్థంగా ఎలా ఉపయోగించాలి', fix: 'సమాధానం సరైనది కాకపోతే ఇది పంపండి:', copyPrompt: 'ప్రాంప్ట్ కాపీ చేయండి', openChatGPT: 'ChatGPT లో తెరవండి', openClaude: 'Claude లో తెరవండి', sharePrompt: 'ఈ ప్రాంప్ట్‌ను షేర్ చేయండి', copyLink: 'లింక్ కాపీ చేయండి', promptLabel: 'ప్రాంప్ట్',
    copied: 'కాపీ అయింది! మీ AI chat లో paste చేయండి.', opening: '{tool} మీ ప్రాంప్ట్‌తో తెరుచుకుంటోంది. ప్రాంప్ట్ కాపీ కూడా అయింది—బాక్స్ ఖాళీగా ఉంటే paste చేయండి.', linkCopied: 'లింక్ కాపీ అయింది—ఒక ఉపాధ్యాయుడికి పంపండి!', shareLead: 'గణిత ఉపాధ్యాయుల కోసం ఉచిత AI ప్రాంప్ట్', browseAll: 'అన్ని {count} ఉచిత ప్రాంప్ట్‌లను చూడండి',
    makesImages: 'చిత్రాలు తయారు చేస్తుంది—image AI కావాలి', attachPhoto: 'ముందుగా ప్రశ్న ఫోటోను జోడించండి', freeAI: 'ఏ ఉచిత AI లోనైనా పనిచేస్తుంది', bestTool: 'ఉత్తమ టూల్', anyAIChat: 'ఏదైనా AI chat', allPrompts: 'అన్ని {count} ప్రాంప్ట్‌లు', guide: 'ప్రారంభ మార్గదర్శిని', home: 'హోమ్',
    promptLanguage: 'ప్రాంప్ట్ భాష', brandHome: 'Maths Prompt Studio హోమ్', freePlatform: 'ఉచిత గణిత వేదిక', makesImagesTag: 'చిత్రాలు తయారు చేస్తుంది', photoNeededTag: 'ఫోటో అవసరం', textOnlyTag: 'వచనం మాత్రమే',
  },
};

const pageUiKeys = Object.keys(PAGE_UI.en).sort();
for (const definition of LANGUAGE_DEFINITIONS) {
  const keys = Object.keys(PAGE_UI[definition.code] || {}).sort();
  if (JSON.stringify(keys) !== JSON.stringify(pageUiKeys)) throw new Error(`baked-page UI dictionary mismatch: ${definition.code}`);
}

function pageHTML(p, cat) {
  const url = SITE + 'p/' + p.slug + '/';
  const title = p.title + ' - free AI prompt for maths teachers';
  const desc = (p.whatYouGet || ('A free AI prompt for maths teachers: ' + p.title)).slice(0, 155);
  const eff = (p.effectiveUsage || []).map(s => '<li>' + esc(s) + '</li>').join('');
  const locales = {
    en: { title: p.title, whatYouGet: p.whatYouGet, howToUse: p.howToUse || '', effectiveUsage: p.effectiveUsage || [], commonFix: p.commonFix || '', promptText: p.promptText },
  };
  for (const definition of LIVE_LANGUAGE_DEFINITIONS.slice(1)) locales[definition.code] = p[definition.code];
  const localeJson = JSON.stringify(locales).replace(/<\//g, '<\\/');
  const livePageUi = Object.fromEntries(LIVE_LANGUAGE_DEFINITIONS.map(definition => [definition.code, PAGE_UI[definition.code]]));
  const pageUiJson = JSON.stringify(livePageUi).replace(/<\//g, '<\\/');
  const allCategoryLocales = { en: cat.categoryTitle, ...CATEGORY_I18N[cat.category] };
  const categoryLocales = Object.fromEntries(LIVE_LANGUAGE_DEFINITIONS.map(definition => [definition.code, allCategoryLocales[definition.code]]));
  const categoryJson = JSON.stringify(categoryLocales).replace(/<\//g, '<\\/');
  const deliveryMode = p.makesImage ? 'makesImages' : (p.needsImage ? 'attachPhoto' : 'freeAI');
  const typeTag = p.makesImage ? 'makesImagesTag' : (p.needsImage ? 'photoNeededTag' : 'textOnlyTag');
  const bestTool = p.bestTool || '';
  const languageButtons = LIVE_LANGUAGE_DEFINITIONS.map(definition =>
    `<button class="fchip lang-chip${definition.code === 'en' ? ' active' : ''}" type="button" data-page-lang="${definition.code}" aria-pressed="${definition.code === 'en'}">${definition.label}</button>`).join('');
  const ld = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'CreativeWork', name: p.title, headline: p.title,
    description: desc, url, isAccessibleForFree: true, inLanguage: Object.keys(locales),
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
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${attr(p.title)} - Maths Prompt Studio">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${attr(p.title)} - Maths Prompt Studio">
<meta name="twitter:description" content="${attr(desc)}">
<meta name="twitter:image" content="${SITE}og-cover.png">
<link rel="icon" type="image/svg+xml" href="${FAVICON}">
${FONT_LINKS}
<link rel="stylesheet" href="${STYLESHEET}">
<script type="application/ld+json">${ld}</script>
</head><body>
<div class="grain" aria-hidden="true"></div>
<header class="site-head">
  ${brand()}
  <nav class="head-nav"><a id="navAll" href="../../#library">All ${GRAND} prompts</a><a id="navGuide" href="../../#guide">Beginner's Guide</a></nav>
</header>
<main class="ppage">
  <p class="pp-crumb"><a id="crumbHome" href="../../">Home</a> / <a id="crumbCategory" href="../../#cat-${esc(cat.category)}">${esc(cat.categoryTitle)}</a> / <span id="crumbTitle">${esc(p.title)}</span></p>
  <article class="pp-card">
    <div class="card-tags"><span class="tag tag-cat" id="categoryTag">${esc(cat.categoryTitle)}</span><span class="tag ${p.makesImage || p.needsImage ? 'tag-img' : 'tag-txt'}" id="typeTag">${esc(p.makesImage ? 'Makes images' : p.needsImage ? 'Photo needed' : 'Text only')}</span></div>
    <div class="fchips ppage-lang-switch" id="langSwitch" style="margin-bottom:10px" aria-label="Prompt language">${languageButtons}</div>
    <h1 id="ttl">${esc(p.title)}</h1>
    <p class="card-what" id="wht" style="font-size:16px">${esc(p.whatYouGet)}</p>
    <div class="card-rel"><span class="rel"><span class="dot ${relDot(p)}"></span><span id="relText">${esc(relText(p))}</span></span> &nbsp;&middot;&nbsp; <span class="rel"><span id="bestToolLabel">Best tool</span>: <b>&nbsp;<span id="bestToolValue">${esc(p.bestTool || 'Any AI chat')}</span></b></span></div>
    ${eff ? '<div class="modal-eff" id="effWrap"><h4>&#9989; <span id="effTitle">How to use this effectively</span></h4><ol id="effList">' + eff + '</ol></div>' : ''}
    ${p.commonFix ? '<div class="modal-fix" id="fixWrap"><b>&#128295; <span id="fixLabel">If it is not right, reply with this:</span></b> <span id="fixText">' + esc(p.commonFix) + '</span></div>' : ''}
    <button class="card-copy-main" id="cp">&#128203; Copy prompt</button>
    <div class="card-open"><button class="btn-tool t-gpt" id="gpt">&#129302; Open ChatGPT</button><button class="btn-tool t-claude" id="cla">&#128172; Open Claude</button></div>
    <div class="card-open" style="margin-top:8px"><button class="btn-soft card-copy" id="sh">&#128241; Share this prompt</button><button class="btn-soft card-copy" id="lnk">&#128279; Copy link</button></div>
    <div class="modal-lbl" id="promptLabel" style="margin-top:16px">THE PROMPT</div>
    <div class="prompt-box"><pre id="pt">${esc(p.promptText)}</pre></div>
  </article>
  <p style="text-align:center;margin-top:26px"><a class="btn btn-primary" id="browseAll" href="../../#library">&#9664; Browse all ${GRAND} free prompts</a></p>
</main>
<footer class="site-foot"><div class="foot-sign"><span class="foot-sign-name">Maths Prompt Studio</span><span class="foot-sign-sub" id="footStatus">free maths platform</span></div><p class="foot-meta"><a id="footLibrary" href="../../#library">All ${GRAND} prompts</a> &middot; <a id="footHome" href="../../">Home</a></p></footer>
<div class="toast" id="t" role="status" aria-live="polite">Copied!</div>
<script>
var L10N=${localeJson};var UI=${pageUiJson};var CATEGORY=${categoryJson};var LNG='en';var URL=${JSON.stringify(url)};var MODE=${JSON.stringify(deliveryMode)};var TYPE_TAG=${JSON.stringify(typeTag)};var BEST_TOOL=${JSON.stringify(bestTool)};var TOTAL=${GRAND};
(function(){try{var th=localStorage.getItem('mps-theme');if(th)document.documentElement.setAttribute('data-theme',th);}catch(e){}})();
function active(){return L10N[LNG]}function activeP(){var value=active();return value?value.promptText:'';}
(function(){var wrap=document.getElementById('langSwitch');if(!wrap)return;
  function format(text,values){Object.keys(values||{}).forEach(function(name){text=text.split('{'+name+'}').join(values[name])});return text}
  function setLanguage(code){if(!Object.prototype.hasOwnProperty.call(L10N,code))return;LNG=code;var value=active();var ui=UI[code];document.documentElement.lang=code;document.title=value.title+' | Maths Prompt Studio';
    document.getElementById('ttl').textContent=value.title;document.getElementById('wht').textContent=value.whatYouGet;document.getElementById('pt').textContent=value.promptText;document.getElementById('crumbTitle').textContent=value.title;
    var list=document.getElementById('effList');if(list){list.textContent='';(value.effectiveUsage||[]).forEach(function(text){var li=document.createElement('li');li.textContent=text;list.appendChild(li)})}
    var fix=document.getElementById('fixText');if(fix)fix.textContent=value.commonFix||'';var et=document.getElementById('effTitle');if(et)et.textContent=ui.effective;var fl=document.getElementById('fixLabel');if(fl)fl.textContent=ui.fix;
    document.getElementById('relText').textContent=ui[MODE];document.getElementById('bestToolLabel').textContent=ui.bestTool;document.getElementById('bestToolValue').textContent=BEST_TOOL||ui.anyAIChat;
    document.getElementById('crumbCategory').textContent=CATEGORY[code];document.getElementById('categoryTag').textContent=CATEGORY[code];document.getElementById('typeTag').textContent=ui[TYPE_TAG];wrap.setAttribute('aria-label',ui.promptLanguage);document.getElementById('brandHome').setAttribute('aria-label',ui.brandHome);document.getElementById('brandBy').textContent=ui.freePlatform;
    document.getElementById('cp').textContent='📋 '+ui.copyPrompt;document.getElementById('gpt').textContent='🤖 '+ui.openChatGPT;document.getElementById('cla').textContent='💬 '+ui.openClaude;document.getElementById('sh').textContent='📱 '+ui.sharePrompt;document.getElementById('lnk').textContent='🔗 '+ui.copyLink;document.getElementById('promptLabel').textContent=ui.promptLabel;document.getElementById('browseAll').textContent='◀ '+format(ui.browseAll,{count:TOTAL});
    document.getElementById('navAll').textContent=format(ui.allPrompts,{count:TOTAL});document.getElementById('navGuide').textContent=ui.guide;document.getElementById('crumbHome').textContent=ui.home;document.getElementById('footLibrary').textContent=format(ui.allPrompts,{count:TOTAL});document.getElementById('footHome').textContent=ui.home;document.getElementById('footStatus').textContent=ui.freePlatform;
    wrap.querySelectorAll('[data-page-lang]').forEach(function(button){var on=button.getAttribute('data-page-lang')===code;button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on))});try{localStorage.setItem('mps-lang',code)}catch(e){}}
  wrap.querySelectorAll('[data-page-lang]').forEach(function(button){button.onclick=function(){setLanguage(button.getAttribute('data-page-lang'))}});var saved='en';try{saved=localStorage.getItem('mps-lang')||'en'}catch(e){}setLanguage(L10N[saved]?saved:'en');
})();
function toast(m){var t=document.getElementById('t');t.textContent=m;t.classList.add('show');setTimeout(function(){t.classList.remove('show')},2600);}
function clip(x){return (navigator.clipboard&&navigator.clipboard.writeText)?navigator.clipboard.writeText(x):new Promise(function(r){var a=document.createElement('textarea');a.value=x;a.style.position='fixed';a.style.opacity=0;document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(e){}document.body.removeChild(a);r();});}
document.getElementById('cp').onclick=function(){clip(activeP()).then(function(){toast((UI[LNG]||UI.en).copied)})};
function openT(base,name){var full=base+'?q='+encodeURIComponent(activeP());var u=full.length<=7000?full:base;clip(activeP()).then(function(){window.open(u,'_blank','noopener');toast((UI[LNG]||UI.en).opening.split('{tool}').join(name))})}
document.getElementById('gpt').onclick=function(){openT('https://chatgpt.com/','ChatGPT')};
document.getElementById('cla').onclick=function(){openT('https://claude.ai/new','Claude')};
document.getElementById('lnk').onclick=function(){clip(URL).then(function(){toast((UI[LNG]||UI.en).linkCopied)})};
document.getElementById('sh').onclick=function(){var msg=(UI[LNG]||UI.en).shareLead+' — '+active().title+': ';if(navigator.share){navigator.share({title:'Maths Prompt Studio',text:msg,url:URL}).catch(function(){})}else{window.open('https://wa.me/?text='+encodeURIComponent(msg+' '+URL),'_blank')}};
</script>
</body></html>`;
}

function validateBakedLanguagePayloads() {
  const liveCodes = new Set(LIVE_LANGUAGE_DEFINITIONS.map(definition => definition.code));
  let count = 0;
  for (const category of DATA.categories) for (const prompt of category.prompts) {
    const html = pageHTML(prompt, category);
    const localeMatch = html.match(/var L10N=([\s\S]*?);var UI=([\s\S]*?);var CATEGORY=([\s\S]*?);var LNG=/);
    if (!localeMatch) throw new Error(`${prompt.slug}: baked locale payload cannot be audited`);
    const payloads = localeMatch.slice(1).map(value => JSON.parse(value));
    for (const { code } of LANGUAGE_DEFINITIONS) {
      const present = html.includes(`data-page-lang="${code}"`);
      if (present !== liveCodes.has(code)) throw new Error(`${prompt.slug}: baked ${code} switch does not match completeness gate`);
      for (const payload of payloads) if (Object.prototype.hasOwnProperty.call(payload, code) !== liveCodes.has(code)) throw new Error(`${prompt.slug}: baked ${code} payload does not match completeness gate`);
    }
    count += 1;
  }
  return count;
}

function main() {
  const verifiedPages = validateBakedLanguagePayloads();
  const statusSummary = LANGUAGE_DEFINITIONS.map(({ code }) => `${code} ${LANGUAGE_STATUS[code].valid}/${LANGUAGE_STATUS[code].total}${LANGUAGE_STATUS[code].live ? ' live' : ' blocked'}`).join(' | ');
  if (DRY_RUN) {
    console.log(`Baked-page dry run passed: ${verifiedPages} pages | ${statusSummary}`);
    return;
  }

  // Validation above is deliberately before the destructive rebuild.
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
      if (seen.has(oldSlug)) continue;
      const to = SITE + 'p/' + newSlug + '/';
      const localTo = '../' + newSlug + '/';
      mkdirSync(ROOT + '/p/' + oldSlug, { recursive: true });
      writeFileSync(ROOT + '/p/' + oldSlug + '/index.html',
        `<!DOCTYPE html><html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
        `<title>Moved - Maths Prompt Studio</title><link rel="canonical" href="${to}"><meta http-equiv="refresh" content="0; url=${localTo}">` +
        `<meta name="robots" content="noindex"><link rel="icon" type="image/svg+xml" href="${FAVICON}">` +
        `${FONT_LINKS}<link rel="stylesheet" href="${STYLESHEET}"></head><body><div class="grain" aria-hidden="true"></div>` +
        `<header class="site-head">${brand()}<nav class="head-nav"><a href="../../#library">All ${GRAND} prompts</a></nav></header>` +
        `<main class="ppage"><article class="pp-card"><h1>This prompt has moved</h1>` +
        `<p class="card-what" style="font-size:16px">It merged into a stronger version. यह प्रॉम्प्ट एक बेहतर संस्करण में मिल गया है।</p>` +
        `<p><a class="btn btn-primary" href="${localTo}">Continue to the prompt &rarr;</a></p></article></main>` +
        `<script>location.replace(${JSON.stringify(localTo)});</script></body></html>`);
      nRedirects++;
    }
  }

  const grand = DATA.categories.reduce((t, c) => t + c.prompts.length, 0);
  const banner = '/* Maths Prompt Studio data - ' + grand + ' prompts across ' + DATA.categories.length + ' categories. v' + (DATA.version || '') + '. Auto-generated; do not edit by hand. */\n';
  writeFileSync(ROOT + '/data/prompts.js', banner + 'window.PROMPT_DATA = ' + JSON.stringify(DATA) + ';\n');

  const today = '2026-06-18';
  const sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url><loc>' + SITE + '</loc><lastmod>' + today + '</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>']
    .concat(urls.map(u => '  <url><loc>' + u + '</loc><lastmod>' + today + '</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>'))
    .concat(['</urlset>']).join('\n');
  writeFileSync(ROOT + '/sitemap.xml', sm + '\n');

  console.log('Built', n, 'per-prompt pages under /p/ (+', nRedirects, 'redirect stubs), wrote slugs into data, sitemap has', urls.length + 1, 'URLs.', statusSummary);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
