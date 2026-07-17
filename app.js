/* Maths Prompt Studio application */
(function () {
  'use strict';

  var aboutSection = document.getElementById('about');
  var rawConfig = window.MPS_CONFIG || {};
  var CFG = {
    email: rawConfig.email || (aboutSection ? (aboutSection.getAttribute('data-contact-email') || '') : ''),
    whatsapp: rawConfig.whatsapp || (aboutSection ? (aboutSection.getAttribute('data-contact-whatsapp') || '') : ''),
    instagram: rawConfig.instagram || (aboutSection ? (aboutSection.getAttribute('data-contact-instagram') || '') : ''),
    googleFormUrl: rawConfig.googleFormUrl || '', photoUrl: rawConfig.photoUrl || '',
    analyticsSrc: rawConfig.analyticsSrc || '', analyticsDomain: rawConfig.analyticsDomain || ''
  };
  var SITE = 'https://yosoyun.github.io/math-prompt-studio/';
  // AUD-A P1/A3: render cards from the compact catalog and fetch the complete
  // prompt corpus only when an action genuinely needs promptText.
  var CATALOG = window.PROMPT_CATALOG || window.PROMPT_DATA || { categories: [] };
  var DATA = CATALOG.categories || [];
  var FULL_DATA = window.PROMPT_DATA && window.PROMPT_DATA.categories ? window.PROMPT_DATA : null;
  var fullDataPromise = null;
  var fullBySlug = null;
  var SEARCH_KEYWORDS = CATALOG.searchKeywords || [];
  var GROUP_ORDER = ['Solving & Checking', 'Practice & Assessment', 'Teaching Materials', 'Writing & Content', 'Engagement', 'Support', 'Teacher Productivity'];

  function expandSearchBits(code) {
    if (!code || !SEARCH_KEYWORDS.length) return '';
    try {
      var raw = atob(code + '='.repeat((4 - code.length % 4) % 4));
      return SEARCH_KEYWORDS.filter(function (_, index) { return raw.charCodeAt(index >> 3) & (1 << (index & 7)); }).join(' ');
    } catch (e) { return ''; }
  }

  var ALL = [];
  DATA.forEach(function (cat) {
    if (!cat.group) cat.group = 'More';
    (cat.prompts || []).forEach(function (p, i) { p._cat = cat.category; p._catTitle = cat.categoryTitle; p._catIcon = cat.categoryIcon || ''; p._group = cat.group; p._id = cat.category + '-' + i; p._searchExtras = expandSearchBits(p.sk); ALL.push(p); });
  });
  var ALL_BY_SLUG = Object.create(null);
  ALL.forEach(function (prompt) { ALL_BY_SLUG[prompt.slug] = prompt; });
  var catalogLanguagePromises = Object.create(null);
  var GROUPS = GROUP_ORDER.filter(function (g) { return DATA.some(function (c) { return c.group === g; }); });
  DATA.forEach(function (c) { if (GROUPS.indexOf(c.group) === -1) GROUPS.push(c.group); });

  var state = { group: 'all', query: '', prevEmpty: true, lang: 'en', exam: 'all', aud: 'all', fmt: 'all', renderLimit: 60, quickSegment: '', quickJob: '', quickPrompt: null, hasRendered: false };
  var favorites = new Set();
  var recentSlugs = [];
  try { if (localStorage.getItem('mps-lang') === 'hi') state.lang = 'hi'; } catch (e) {}
  try { favorites = new Set(JSON.parse(localStorage.getItem('mps-favorites') || '[]')); } catch (e2) { favorites = new Set(); }
  try { recentSlugs = JSON.parse(localStorage.getItem('mps-recent') || '[]'); if (!Array.isArray(recentSlugs)) recentSlugs = []; } catch (e3) { recentSlugs = []; }
  try { state.quickSegment = localStorage.getItem('mps-segment') || ''; } catch (e4) {}

  // AUD-A, AUD-C, AUD-E: small dictionary for the new activation, retention,
  // progressive-render and sharing chrome. Existing prompt content still uses T().
  var UI = {
    en: {
      all: 'All', saved: 'Saved', everyone: 'Everyone', teachers: 'For teachers', students: 'For students', allExams: 'All exams',
      chooseSegment: 'Choose what you teach', chooseJob: 'Now choose what you need', ready: 'Your best starting prompt', openFill: 'Open and fill details',
      quickKicker: '60-second start', quickTitle: 'What do you need for your next class?', quickSub: 'Choose who you teach, then choose the job. Your best matching prompt will open ready to fill.', segmentSmall: 'We will remember this on this device.', jobSmall: 'Paper, solve and verify, worksheet, PPT, or quiz.',
      quickHint: 'Three taps: segment, job, then open.', loading: 'Loading the full prompt…', loadError: 'The full prompt could not load. Please check your connection and try again.',
      paper: 'Paper', solveVerify: 'Solve + Verify', worksheet: 'Worksheet', ppt: 'PPT', quiz: 'Quiz',
      student: 'Student', foundation: 'Foundation',
      copyPrompt: 'Copy prompt', howTo: 'How to use this', share: 'Share', save: 'Save', unsave: 'Remove from saved',
      promptDay: 'Prompt of the day', recent: 'Recently used', savedShelf: 'Your saved prompts', important: 'Most important', added: 'Recently added',
      showMore: 'Show 60 more prompts', surprise: 'Surprise me — random prompt', browseAll: 'Browse all', noMatch: 'No prompts match', related: 'related prompts', found: 'prompts found',
      shareLead: 'Free maths teaching prompt', copied: 'Copied! Paste it into your AI chat.', linkCopied: 'Link copied — send this prompt to a teacher!',
      fillOptional: 'Fill in the blanks here', fillNote: 'Type your details — the prompt and action buttons update automatically.', close: 'Close', copyLink: 'Copy link',
      formatAll: 'All formats'
    },
    hi: {
      all: 'सभी', saved: 'सहेजे हुए', everyone: 'सबके लिए', teachers: 'शिक्षकों के लिए', students: 'छात्रों के लिए', allExams: 'सभी परीक्षाएँ',
      chooseSegment: 'आप किसे पढ़ाते हैं?', chooseJob: 'अब अपना काम चुनें', ready: 'शुरू करने के लिए सही प्रॉम्प्ट', openFill: 'खोलें और जानकारी भरें',
      quickKicker: '60-सेकंड शुरुआत', quickTitle: 'अगली कक्षा के लिए आपको क्या चाहिए?', quickSub: 'पहले अपनी कक्षा या परीक्षा चुनें, फिर काम। सही प्रॉम्प्ट जानकारी भरने के लिए तैयार खुलेगा।', segmentSmall: 'यह चुनाव इसी डिवाइस पर याद रहेगा।', jobSmall: 'पेपर, हल और जाँच, वर्कशीट, PPT या क्विज़।',
      quickHint: 'तीन टैप: वर्ग, काम, फिर खोलें।', loading: 'पूरा प्रॉम्प्ट लोड हो रहा है…', loadError: 'पूरा प्रॉम्प्ट लोड नहीं हुआ। इंटरनेट जाँचकर फिर कोशिश करें।',
      paper: 'पेपर', solveVerify: 'हल + जाँच', worksheet: 'वर्कशीट', ppt: 'PPT', quiz: 'क्विज़',
      student: 'विद्यार्थी', foundation: 'फ़ाउंडेशन',
      copyPrompt: 'प्रॉम्प्ट कॉपी करें', howTo: 'इस्तेमाल कैसे करें', share: 'शेयर करें', save: 'सहेजें', unsave: 'सहेजे से हटाएँ',
      promptDay: 'आज का प्रॉम्प्ट', recent: 'हाल में इस्तेमाल किए', savedShelf: 'आपके सहेजे प्रॉम्प्ट', important: 'सबसे ज़रूरी', added: 'हाल में जोड़े गए',
      showMore: '60 और प्रॉम्प्ट दिखाएँ', surprise: 'कोई भी एक प्रॉम्प्ट दिखाएँ', browseAll: 'सभी देखें', noMatch: 'कोई प्रॉम्प्ट मेल नहीं खाता', related: 'संबंधित प्रॉम्प्ट', found: 'प्रॉम्प्ट मिले',
      shareLead: 'मुफ़्त गणित शिक्षण प्रॉम्प्ट', copied: 'कॉपी हो गया! अपने AI चैट में पेस्ट करें।', linkCopied: 'लिंक कॉपी हो गया — किसी शिक्षक को भेजें!',
      fillOptional: 'यहाँ खाली जगह भरें', fillNote: 'अपनी जानकारी भरें — प्रॉम्प्ट और बटन अपने-आप बदलेंगे।', close: 'बंद करें', copyLink: 'लिंक कॉपी करें',
      formatAll: 'सभी प्रारूप'
    }
  };
  function tr(key) { return (UI[state.lang] && UI[state.lang][key]) || UI.en[key] || key; }

  /* Bilingual: every prompt may carry a p.hi = {title, whatYouGet, howToUse, effectiveUsage, commonFix, promptText}.
     T() returns the Hindi field when the teacher chose Hindi and a translation exists, else English. */
  function T(p, field) { return (state.lang !== 'en' && p[state.lang] && p[state.lang][field]) ? p[state.lang][field] : p[field]; }
  function applyCatalogLanguage(lang) {
    var packs = window.PROMPT_CATALOG_LANG || {};
    var pack = packs[lang];
    if (!pack) return false;
    Object.keys(pack).forEach(function (slug) { if (ALL_BY_SLUG[slug]) ALL_BY_SLUG[slug][lang] = pack[slug]; });
    return true;
  }
  function ensureCatalogLanguage(lang) {
    if (lang === 'en' || applyCatalogLanguage(lang)) return Promise.resolve();
    if (catalogLanguagePromises[lang]) return catalogLanguagePromises[lang];
    catalogLanguagePromises[lang] = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'data/catalog-' + lang + '.js?v=23';
      script.onload = function () { if (applyCatalogLanguage(lang)) resolve(); else reject(new Error('missing language pack')); };
      script.onerror = function () { reject(new Error('language pack request failed')); };
      document.head.appendChild(script);
    }).catch(function () { catalogLanguagePromises[lang] = null; showToast('That language could not load. Please try again.'); });
    return catalogLanguagePromises[lang];
  }
  function refreshLanguageView() {
    buildChips(); buildFacets(); buildFormatFacets(); buildQuickStart(); render();
  }
  function setLang(lang) {
    state.lang = lang;
    try { localStorage.setItem('mps-lang', lang); } catch (e) {}
    document.querySelectorAll('.lang-chip').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-lang') === lang); });
    refreshLanguageView();
    ensureCatalogLanguage(lang).then(refreshLanguageView);
  }

  function indexFullData(data) {
    fullBySlug = Object.create(null);
    (data.categories || []).forEach(function (cat) {
      (cat.prompts || []).forEach(function (p, i) {
        p._cat = cat.category; p._catTitle = cat.categoryTitle; p._catIcon = cat.categoryIcon || ''; p._group = cat.group || 'More'; p._id = cat.category + '-' + i;
        fullBySlug[p.slug] = p;
      });
    });
    return data;
  }
  if (FULL_DATA) indexFullData(FULL_DATA);

  function loadFullData() {
    if (FULL_DATA && fullBySlug) return Promise.resolve(FULL_DATA);
    if (window.PROMPT_DATA && window.PROMPT_DATA.categories) { FULL_DATA = window.PROMPT_DATA; return Promise.resolve(indexFullData(FULL_DATA)); }
    if (fullDataPromise) return fullDataPromise;
    fullDataPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = window.MPS_DATA_URL || 'data/prompts.js?v=23';
      script.async = true;
      script.onload = function () {
        if (!window.PROMPT_DATA || !window.PROMPT_DATA.categories) { reject(new Error('prompt data did not initialise')); return; }
        FULL_DATA = window.PROMPT_DATA; resolve(indexFullData(FULL_DATA));
      };
      script.onerror = function () { reject(new Error('prompt data request failed')); };
      document.head.appendChild(script);
    }).catch(function (error) { fullDataPromise = null; throw error; });
    return fullDataPromise;
  }

  function withFullPrompt(card, action) {
    if (!card) return Promise.resolve(null);
    if (card.promptText) { action(card); return Promise.resolve(card); }
    showToast(tr('loading'));
    return loadFullData().then(function () {
      var full = fullBySlug && fullBySlug[card.slug];
      if (!full) throw new Error('prompt not found: ' + card.slug);
      action(full); return full;
    }).catch(function () { showToast(tr('loadError')); return null; });
  }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }

  /* ---------- clipboard + toast ---------- */
  var toastT;
  function showToast(msg) { var t = document.getElementById('toast'); if (!t) return; if (msg) t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 3000); }
  function legacyCopy(text) { var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); }
  function clip(text) { try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(function () { legacyCopy(text); }); } catch (e) {} legacyCopy(text); return Promise.resolve(); }
  function copyBtn(btn, label) { if (!btn) return; var o = btn.getAttribute('data-lbl') || btn.innerHTML; btn.setAttribute('data-lbl', o); btn.innerHTML = label || '&#10003; Copied!'; btn.classList.add('done'); setTimeout(function () { btn.innerHTML = o; btn.classList.remove('done'); }, 1900); }
  function copyText(text, btn, okMsg) { clip(text).then(function () { copyBtn(btn); showToast(okMsg); }); }

  /* ---------- export formats ---------- */
  var FMT = {
    word: '\n\n----------\nFORMAT THE OUTPUT: After solving, present your ENTIRE response as a clean document ready to paste straight into Microsoft Word or Google Docs - use a bold title, clear section headings, bold key terms, neatly numbered steps, and tables where helpful. Keep all mathematics fully readable. If a "Prepared by" footer is present, keep it.',
    pdf: '\n\n----------\nFORMAT THE OUTPUT: After solving, lay out your ENTIRE response as a clean, print-ready A4 page I can save as PDF (File > Print > Save as PDF) - a clear title, well-spaced headings, numbered sections and generous margins. Keep all mathematics fully readable. If a "Prepared by" footer is present, keep it.',
    ppt: '\n\n----------\nFORMAT THE OUTPUT: After solving, turn your ENTIRE response into a slide-by-slide deck for PowerPoint, Google Slides, Canva or Gamma. For each slide give "Slide N - Title", then 3 to 5 short bullet points, then a "Speaker notes:" line. Begin with a title slide and end with a summary slide. Put the "Compiled by" line from the prompt (if any) on the title slide.'
  };
  var FMT_MSG = { word: 'Copied a Word-ready version - paste into ChatGPT or Claude, then into Word/Docs.', pdf: 'Copied a print-ready (PDF) version - paste into your AI, then Print > Save as PDF.', ppt: 'Copied a slide-deck version - paste into your AI, then into PowerPoint/Slides/Gamma.' };
  function copyFormatted(text, kind, btn) { copyText(text + (FMT[kind] || ''), btn, FMT_MSG[kind]); }

  /* ---------- open in tool ---------- */
  function openTool(text, tool, btn) {
    // Try to pre-fill via ?q= (works on ChatGPT/Gemini web; Claude may ignore it). ALWAYS copy too,
    // so it works on phone apps that ignore the URL: the toast tells the teacher to paste if empty.
    var base = tool === 'claude' ? 'https://claude.ai/new' : 'https://chatgpt.com/';
    var name = tool === 'claude' ? 'Claude' : 'ChatGPT';
    var full = base + '?q=' + encodeURIComponent(text);
    var url = full.length <= 7000 ? full : base; // very long prompts -> open bare + rely on clipboard
    clip(text).then(function () {
      try { window.open(url, '_blank', 'noopener'); } catch (e) { location.href = url; }
      copyBtn(btn, '&#10003; Opened');
      showToast(name + ' is opening with your prompt loaded. It is also copied - if the box is empty (some phone apps), just paste it, fill the [brackets], and send.');
    });
  }

  /* ---------- stats ---------- */
  function setStats() {
    var styleCat = DATA.find(function (c) { return c.category === 'handwritten-styles'; });
    var styleCount = styleCat ? styleCat.prompts.reduce(function (max, p) { return Math.max(max, (p.styles || []).length, p.styleCount || 0); }, 0) : 0;
    if (!styleCount) styleCount = 18;
    var map = { prompts: ALL.length + '+', cats: DATA.length, styles: styleCount };
    document.querySelectorAll('[data-stat]').forEach(function (n) { var k = n.getAttribute('data-stat'); if (map[k] != null) n.textContent = map[k]; });
  }

  /* ---------- group chips ---------- */
  function buildChips() {
    var wrap = document.getElementById('groupChips'); if (!wrap) return; wrap.innerHTML = '';
    // AUD-C P1/C1: Saved is a first-class local shelf, never an account feature.
    var savedCount = ALL.filter(function (p) { return favorites.has(p.slug); }).length;
    var chips = [{ id: 'all', title: tr('all'), ct: ALL.length }, { id: 'saved', title: tr('saved'), ct: savedCount }];
    GROUPS.forEach(function (g) { chips.push({ id: g, title: g, ct: DATA.filter(function (c) { return c.group === g; }).reduce(function (t, c) { return t + (c.prompts || []).length; }, 0) }); });
    chips.forEach(function (c) {
      var b = el('<button class="fchip' + (c.id === state.group ? ' active' : '') + '" type="button" aria-pressed="' + (c.id === state.group) + '">' + esc(c.title) + ' <span class="fchip-ct">' + c.ct + '</span></button>');
      b.addEventListener('click', function () { state.group = c.id; state.renderLimit = 60; document.querySelectorAll('#groupChips .fchip').forEach(function (x) { x.classList.remove('active'); x.setAttribute('aria-pressed', 'false'); }); b.classList.add('active'); b.setAttribute('aria-pressed', 'true'); render(); var lib = document.getElementById('library'); if (lib) lib.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      wrap.appendChild(b);
    });
  }

  /* ---------- facet filters: exam + audience ---------- */
  var EXAMS = [
    { id: 'all', en: 'All exams', hi: 'सभी परीक्षाएँ' },
    { id: 'boards', en: 'Boards', hi: 'बोर्ड' },
    { id: 'jee-main', en: 'JEE Main', hi: 'JEE Main' },
    { id: 'jee-advanced', en: 'JEE Advanced', hi: 'JEE Advanced' },
    { id: 'olympiad', en: 'Olympiad', hi: 'ओलंपियाड' },
    { id: 'foundation', en: 'Foundation (6-8)', hi: 'फ़ाउंडेशन (6-8)' }
  ];
  var AUDS = [
    { id: 'all', en: 'Everyone', hi: 'सबके लिए' },
    { id: 'teacher', en: 'For teachers', hi: 'शिक्षकों के लिए' },
    { id: 'student', en: 'For students', hi: 'छात्रों के लिए' }
  ];
  function buildFacets() {
    var chips = document.getElementById('groupChips'); if (!chips) return;
    var mount = document.getElementById('facetMount');
    if (!mount) {
      mount = document.getElementById('facetChips');
      if (!mount) { mount = el('<div id="facetMount"></div>'); chips.parentNode.insertBefore(mount, chips.nextSibling); }
    }
    mount.innerHTML = '';
    var hi = state.lang === 'hi';
    var wrap = el('<div class="fchips" id="facetChips"></div>');
    function addChip(list, key, item) {
      var n = item.id === 'all' ? null : ALL.filter(function (p) { return key === 'exam' ? (p.exams || []).indexOf(item.id) !== -1 : (p.aud === item.id || p.aud === 'both'); }).length;
      var label = item.id === 'all' ? (key === 'exam' ? tr('allExams') : tr('everyone')) : (hi ? item.hi : item.en);
      var b = el('<button class="fchip' + (state[key] === item.id ? ' active' : '') + '" type="button" aria-pressed="' + (state[key] === item.id) + '">' + esc(label) + (n != null ? ' <span class="fchip-ct">' + n + '</span>' : '') + '</button>');
      b.addEventListener('click', function () { state[key] = item.id; state.renderLimit = 60; buildFacets(); render(); });
      wrap.appendChild(b);
    }
    EXAMS.forEach(function (x) { addChip(EXAMS, 'exam', x); });
    var sep = el('<span style="display:inline-block;width:14px"></span>'); wrap.appendChild(sep);
    AUDS.forEach(function (x) { addChip(AUDS, 'aud', x); });
    mount.appendChild(wrap);
  }

  var FORMATS = [
    { id: 'all', ic: '', en: 'All formats', hi: 'सभी प्रारूप' },
    { id: 'pdf-print', ic: '&#128424;&#65039;', en: 'Print/PDF', hi: 'प्रिंट/PDF' },
    { id: 'doc', ic: '&#128196;', en: 'Doc', hi: 'Doc' },
    { id: 'ppt', ic: '&#128202;', en: 'PPT', hi: 'PPT' },
    { id: 'image', ic: '&#127912;', en: 'Image', hi: 'चित्र' },
    { id: 'links', ic: '&#128279;', en: 'Tool links', hi: 'टूल लिंक' },
    { id: 'interactive', ic: '&#128172;', en: 'Interactive', hi: 'इंटरैक्टिव' },
    { id: 'text', ic: '&#9997;&#65039;', en: 'Text', hi: 'पाठ' }
  ];
  function buildFormatFacets() {
    var mount = document.getElementById('formatMount'); if (!mount) return;
    mount.innerHTML = '';
    if (!ALL.some(function (p) { return p.fmt; })) { mount.hidden = true; return; }
    mount.hidden = false;
    var hi = state.lang === 'hi';
    var wrap = el('<div class="fchips format-chips" role="group" aria-label="Output format"></div>');
    FORMATS.forEach(function (item) {
      var n = item.id === 'all' ? null : ALL.filter(function (p) { return p.fmt === item.id; }).length;
      var b = el('<button class="fchip' + (state.fmt === item.id ? ' active' : '') + '" type="button" aria-pressed="' + (state.fmt === item.id) + '">' + item.ic + (item.ic ? ' ' : '') + esc(hi ? item.hi : item.en) + (n != null ? ' <span class="fchip-ct">' + n + '</span>' : '') + '</button>');
      b.addEventListener('click', function () { state.fmt = item.id; state.renderLimit = 60; buildFormatFacets(); render(); });
      wrap.appendChild(b);
    });
    mount.appendChild(wrap);
  }

  /* ---------- header language switch: one tap, always on top ---------- */
  var LANGS = [
    { code: 'en', label: 'English', live: true },
    { code: 'hi', label: 'हिंदी', live: true },
    { code: 'bn', label: 'বাংলা', live: false },
    { code: 'mr', label: 'मराठी', live: false },
    { code: 'te', label: 'తెలుగు', live: false }
  ];
  function initLangSwitch() {
    var head = document.querySelector('.site-head'); if (!head) return;
    var themeBtn = document.getElementById('themeBtn');
    var wrap = el('<div class="lang-switch" style="display:inline-flex;align-items:center;gap:4px;margin-right:8px">' +
      LANGS.map(function (l) {
        return '<button type="button" class="lang-chip fchip' + (state.lang === l.code ? ' active' : '') + (l.live ? '' : ' lang-soon') + '" data-lang="' + l.code + '"' +
          (l.live ? '' : ' title="Coming soon / जल्द आ रही है" style="opacity:.45"') + '>' + l.label + '</button>';
      }).join('') + '</div>');
    wrap.querySelectorAll('.lang-chip').forEach(function (b) {
      b.addEventListener('click', function () {
        var code = b.getAttribute('data-lang');
        var lang = null; LANGS.forEach(function (l) { if (l.code === code) lang = l; });
        if (!lang.live) { showToast(lang.label + ' is coming soon — English and हिंदी are live today.'); return; }
        setLang(code);
      });
    });
    head.insertBefore(wrap, themeBtn);
  }

  /* ---------- 60-second start ---------- */
  // AUD-A P1/A1-P1/A2, AUD-C P1/C3, AUD-D P1/D1: three explicit taps,
  // remembered segment, and a full prompt modal with its fill fields open.
  var QUICK_SEGMENTS = [
    { id: 'jee-main', en: 'JEE Main', hi: 'JEE Main' },
    { id: 'jee-advanced', en: 'JEE Advanced', hi: 'JEE Advanced' },
    { id: 'olympiad', en: 'Olympiad', hi: 'ओलंपियाड' },
    { id: 'boards', en: 'Boards', hi: 'बोर्ड' },
    { id: 'foundation', en: 'Foundation', hi: 'फ़ाउंडेशन' },
    { id: 'student', en: 'Student', hi: 'विद्यार्थी' }
  ];
  var QUICK_ICONS = {
    paper: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h9l3 3V21H6zM9 10h6M9 14h6M9 18h4M15 3.5V7h3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m8.2 12.2 2.4 2.4 5.3-5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
    slides: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 20h8M12 17v3M7.5 13l2.7-3 2.3 2 2.8-3 1.2 1.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.8" width="10" height="18.4" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 6.5h4M10 10h4M10 13.5h2.5M11 18h2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };
  var QUICK_JOBS = [
    { id: 'paper', icon: QUICK_ICONS.paper, label: 'paper', cats: ['question-papers', 'mock-sample-papers', 'competitive-exams', 'latex-pdf-sets'] },
    { id: 'solve-verify', icon: QUICK_ICONS.check, label: 'solveVerify', cats: ['verified-answers', 'single-solution', 'multi-method', 'photo-doubt-solving', 'error-analysis'] },
    { id: 'worksheet', icon: QUICK_ICONS.grid, label: 'worksheet', cats: ['worksheets', 'dpp', 'print-beautifully', 'endless-practice'] },
    { id: 'ppt', icon: QUICK_ICONS.slides, label: 'ppt', cats: ['presentations'] },
    { id: 'quiz', icon: QUICK_ICONS.phone, label: 'quiz', cats: ['phone-quizzes', 'quiz-mcq', 'games-gamification'] }
  ];
  function segmentPattern(id) {
    return {
      'jee-main': /jee main/i,
      'jee-advanced': /jee advanced|multi[- ]correct|partial[- ]mark/i,
      olympiad: /olympiad|ioqm|rmo|inmo/i,
      boards: /board|cbse|ncert/i,
      foundation: /foundation|class [6-8]|basics/i,
      student: /student|learner|self[- ]study/i
    }[id];
  }
  function quickCandidates(segment, job, fallbackAny) {
    return ALL.filter(function (p) {
      if (job.cats.indexOf(p._cat) === -1) return false;
      if (segment === 'student') return fallbackAny ? (p.exams || []).indexOf('any') !== -1 : (p.aud === 'student' || p.aud === 'both');
      return fallbackAny ? (p.exams || []).indexOf('any') !== -1 : (p.exams || []).indexOf(segment) !== -1;
    });
  }
  function chooseQuickPrompt(segment, jobId) {
    var job = QUICK_JOBS.find(function (item) { return item.id === jobId; }); if (!job) return null;
    var pool = quickCandidates(segment, job, false);
    if (!pool.length) pool = quickCandidates(segment, job, true);
    var rx = segmentPattern(segment);
    return pool.slice().sort(function (a, b) {
      function score(p) {
        var visible = [p.title, p.tag, p.whatYouGet].join(' ');
        var value = 100 - job.cats.indexOf(p._cat) * 8;
        if (rx && rx.test(visible)) value += 24;
        if (p.featured) value += 12;
        if ((p.exams || []).length === 1 && (p.exams || [])[0] === segment) value += 10;
        if (segment === 'student' && p.aud === 'student') value += 10;
        if (segment === 'student' && (p.exams || []).indexOf('any') !== -1) value += 18;
        if ((jobId === 'ppt' && p.fmt === 'ppt') || (jobId === 'quiz' && p.fmt === 'interactive') || (jobId === 'paper' && p.fmt === 'pdf-print')) value += 8;
        return value;
      }
      return score(b) - score(a) || String(a.slug).localeCompare(String(b.slug));
    })[0] || null;
  }
  function buildQuickStatus() {
    var status = document.getElementById('quickStatus'); if (!status) return;
    if (!state.quickSegment) { status.innerHTML = '<p>' + esc(tr('quickHint')) + '</p>'; return; }
    if (!state.quickJob) { status.innerHTML = '<p>' + esc(tr('chooseJob')) + '</p>'; return; }
    state.quickPrompt = chooseQuickPrompt(state.quickSegment, state.quickJob);
    if (!state.quickPrompt) { status.innerHTML = '<p>' + esc(tr('noMatch')) + '.</p>'; return; }
    status.innerHTML = '<div class="quick-result"><span class="quick-result-kicker">' + esc(tr('ready')) + '</span><strong>' + esc(T(state.quickPrompt, 'title')) + '</strong><span>' + esc(T(state.quickPrompt, 'whatYouGet')) + '</span><button class="btn btn-primary" type="button" id="quickOpen">' + esc(tr('openFill')) + ' &rarr;</button></div>';
    status.querySelector('#quickOpen').addEventListener('click', function () { openPromptCard(state.quickPrompt, { fillOpen: true }); });
  }
  function buildQuickStart() {
    var root = document.getElementById('quickStart');
    var segments = document.getElementById('quickSegment');
    var jobs = document.getElementById('quickJobs');
    if (!root || !segments || !jobs) return;
    root.setAttribute('data-audit', 'AUD-A-P1-A1 AUD-D-P1-D1');
    var head = root.querySelector('.quick-start-head');
    if (head) {
      var kicker = head.querySelector('.kicker'); var heading = head.querySelector('h2'); var sub = head.querySelector('p');
      if (kicker) kicker.textContent = tr('quickKicker'); if (heading) heading.textContent = tr('quickTitle'); if (sub) sub.textContent = tr('quickSub');
    }
    var stepLabels = root.querySelectorAll('.quick-step-label');
    if (stepLabels[0]) { var sb = stepLabels[0].querySelector('b'); var ss = stepLabels[0].querySelector('small'); if (sb) sb.textContent = tr('chooseSegment'); if (ss) ss.textContent = tr('segmentSmall'); }
    if (stepLabels[1]) { var jb = stepLabels[1].querySelector('b'); var js = stepLabels[1].querySelector('small'); if (jb) jb.textContent = tr('chooseJob'); if (js) js.textContent = tr('jobSmall'); }
    segments.innerHTML = '';
    QUICK_SEGMENTS.forEach(function (segment) {
      var selected = state.quickSegment === segment.id;
      var b = el('<button class="fchip quick-segment' + (selected ? ' active' : '') + '" type="button" aria-pressed="' + selected + '">' + esc(state.lang === 'hi' ? segment.hi : segment.en) + '</button>');
      b.addEventListener('click', function () {
        state.quickSegment = segment.id; state.quickJob = ''; state.quickPrompt = null;
        try { localStorage.setItem('mps-segment', segment.id); } catch (e) {}
        buildQuickStart();
      });
      segments.appendChild(b);
    });
    jobs.innerHTML = '';
    QUICK_JOBS.forEach(function (job) {
      var selected = state.quickJob === job.id;
      var b = el('<button class="quick-job' + (selected ? ' active' : '') + '" type="button" aria-pressed="' + selected + '"><span class="quick-job-icon" aria-hidden="true">' + job.icon + '</span><b>' + esc(tr(job.label)) + '</b></button>');
      b.disabled = !state.quickSegment;
      b.addEventListener('click', function () { state.quickJob = job.id; buildQuickStart(); });
      jobs.appendChild(b);
    });
    buildQuickStatus();
  }

  /* ---------- cards ---------- */
  function relBadge(p) {
    if (p.makesImage) return '<span class="rel"><span class="dot dot-amber"></span>' + esc(p.worksOnFree || 'Needs an image-making AI') + '</span>';
    if (p.needsImage) return '<span class="rel"><span class="dot dot-blue"></span>' + esc(p.worksOnFree || 'Attach a photo first') + '</span>';
    return '<span class="rel"><span class="dot dot-green"></span>' + esc(p.worksOnFree || 'Works on any free AI') + '</span>';
  }
  function tagChip(p) {
    if (p.makesImage) return '<span class="tag tag-img">&#127912; ' + esc(p.tag || 'Makes images') + '</span>';
    if (p.needsImage) return '<span class="tag tag-img">&#128247; ' + esc(p.tag || 'Photo needed') + '</span>';
    return '<span class="tag tag-txt">' + esc(p.tag || 'Text only') + '</span>';
  }
  function formatBadge(p) {
    if (!p.fmt) return '';
    var item = FORMATS.find(function (format) { return format.id === p.fmt; });
    if (!item) return '';
    return '<span class="tag tag-format" data-output-format="' + esc(p.fmt) + '">' + item.ic + ' ' + esc(state.lang === 'hi' ? item.hi : item.en) + '</span>';
  }
  function cardHTML(p) {
    var id = p._id;
    var hi = state.lang === 'hi';
    var saved = favorites.has(p.slug);
    // AUD-B P1/B3 + P2/B4 hooks; AUD-C P1/C1; AUD-E P1/E1.
    return '<article class="card' + (p.featured ? ' featured-card' : '') + '" data-id="' + id + '" data-slug="' + esc(p.slug) + '"><div class="card-tags"><span class="tag tag-cat"><span aria-hidden="true">' + esc(p._catIcon) + '</span> ' + esc(p._catTitle) + '</span>' + formatBadge(p) + tagChip(p) + '</div>' +
      '<h4>' + esc(T(p, 'title')) + '</h4><p class="card-what">' + esc(T(p, 'whatYouGet')) + '</p><div class="card-rel">' + relBadge(p) + '</div>' +
      '<button class="card-copy-main" data-copy="' + id + '">&#128203; ' + esc(tr('copyPrompt')) + '</button>' +
      '<div class="card-open">' +
      '<button class="btn-tool t-gpt" data-open="' + id + '" data-tool="gpt">&#129302; Open ChatGPT</button>' +
      '<button class="btn-tool t-claude" data-open="' + id + '" data-tool="claude">&#128172; Open Claude</button>' +
      '</div>' +
      '<div class="card-secondary"><button class="card-more" data-view="' + id + '">' + esc(tr('howTo')) + ' &rarr;</button>' +
      '<button class="card-icon-action" data-favorite="' + id + '" aria-pressed="' + saved + '" aria-label="' + esc(saved ? tr('unsave') : tr('save')) + '">' + (saved ? '&#9829;' : '&#9825;') + '</button>' +
      '<button class="card-icon-action" data-share="' + id + '" aria-label="' + esc(tr('share')) + '">&#128241;</button></div>' +
      '</article>';
  }
  /* Tool names and common words teachers search for that the prompt texts may not
     contain verbatim - each maps to related words we also try, so a search for
     "wolfram" or "kahoot" surfaces the prompts that do that job. */
  var SYNONYMS = {
    wolfram: ['check', 'verify', 'graph', 'calculator', 'steps'],
    wolframalpha: ['check', 'verify', 'graph', 'calculator', 'steps'],
    desmos: ['graph', 'plot', 'function'],
    geogebra: ['graph', 'geometry', 'construction', 'diagram'],
    symbolab: ['solve', 'steps', 'check'],
    photomath: ['photo', 'solve', 'doubt'],
    mathway: ['solve', 'check', 'steps'],
    overleaf: ['latex', 'pdf'],
    stackexchange: ['doubt', 'proof', 'concept'],
    oeis: ['sequence', 'pattern'],
    khan: ['explain', 'concept', 'practice'],
    phet: ['interactive', 'activity', 'visual'],
    colab: ['python', 'code'],
    python: ['code', 'latex'],
    kahoot: ['quiz', 'game', 'mcq'],
    quizizz: ['quiz', 'mcq', 'test'],
    blooket: ['quiz', 'game'],
    forms: ['quiz', 'mcq', 'test', 'feedback'],
    excel: ['table', 'marks', 'tracker'],
    sheets: ['table', 'marks', 'tracker'],
    ppt: ['slide', 'presentation'],
    powerpoint: ['slide', 'presentation'],
    gamma: ['slide', 'presentation'],
    reels: ['reel', 'video', 'script'],
    youtube: ['video', 'script'],
    insta: ['instagram', 'social'],
    whatsapp: ['parent', 'message', 'communication']
  };
  function termHits(hayFull, hayCard, term, useSyn) {
    if (hayFull.indexOf(term) !== -1) return true;
    if (!useSyn) return false;
    // synonyms only match the short card fields, else generic words like "check" match everything;
    // word-start boundary so "graph" hits "graphs/graphing" but not "topographic"
    var alts = SYNONYMS[term]; if (!alts) return false;
    for (var ai = 0; ai < alts.length; ai++) { if (new RegExp('\\b' + alts[ai].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(hayCard)) return true; }
    return false;
  }
  function matches(p, useSyn) {
    if (state.group === 'saved' && !favorites.has(p.slug)) return false;
    if (state.group !== 'all' && state.group !== 'saved' && p._group !== state.group) return false;
    if (state.exam !== 'all' && (p.exams || []).indexOf(state.exam) === -1) return false;
    if (state.aud !== 'all' && p.aud !== state.aud && p.aud !== 'both') return false;
    if (state.fmt !== 'all' && p.fmt !== state.fmt) return false;
    if (state.query) {
      // AUD-A P1/A3 + AUD-D P3/D4 hook: catalog search keeps compact card
      // fields for every available language plus detected keywords from omitted bodies.
      var languageText = ['hi', 'bn', 'mr', 'te'].map(function (code) { return p[code] ? (' ' + (p[code].title || '') + ' ' + (p[code].whatYouGet || '') + ' ' + (p[code].promptText || '')) : ''; }).join('');
      var hayFull = (p.title + ' ' + p.whatYouGet + ' ' + p._catTitle + ' ' + p._group + ' ' + (p.tag || '') + ' ' + (p._searchExtras || p.searchExtras || '') + ' ' + (p.howToUse || '') + ' ' + (p.promptText || '') + languageText).toLowerCase();
      var hayCard = (p.title + ' ' + p.whatYouGet + ' ' + p._catTitle + (p.hi ? ' ' + (p.hi.title || '') + ' ' + (p.hi.whatYouGet || '') : '')).toLowerCase();
      var terms = state.query.toLowerCase().split(/\s+/);
      for (var qi = 0; qi < terms.length; qi++) { if (terms[qi] && !termHits(hayFull, hayCard, terms[qi], useSyn)) return false; }
    }
    return true;
  }
  function updateCount(n, viaSynonyms) {
    var c = document.getElementById('resultCount'); if (!c) return;
    if (state.query && viaSynonyms) c.innerHTML = '<b>' + n + '</b> ' + esc(tr('related')) + ' &ldquo;' + esc(state.query) + '&rdquo;';
    else if (state.query) c.innerHTML = '<b>' + n + '</b> ' + esc(tr('found')) + ' &ldquo;' + esc(state.query) + '&rdquo;';
    else if (state.group === 'saved') c.innerHTML = '<b>' + n + '</b> ' + esc(tr('saved'));
    else if (state.group !== 'all') c.innerHTML = '<b>' + n + '</b> prompts in ' + esc(state.group);
    else c.innerHTML = esc(tr('browseAll')) + ' <b>' + n + '</b> prompts';
  }
  var SUGGEST_TERMS = ['graph', 'worksheet', 'quiz', 'lesson plan', 'formula sheet', 'photo', 'JEE', 'parents'];
  function persistFavorites() { try { localStorage.setItem('mps-favorites', JSON.stringify(Array.from(favorites))); } catch (e) {} }
  function toggleFavorite(p) {
    if (!p || !p.slug) return;
    if (favorites.has(p.slug)) favorites.delete(p.slug); else favorites.add(p.slug);
    persistFavorites(); buildChips(); render();
  }
  function rememberRecent(p) {
    if (!p || !p.slug) return;
    recentSlugs = [p.slug].concat(recentSlugs.filter(function (slug) { return slug !== p.slug; })).slice(0, 8);
    try { localStorage.setItem('mps-recent', JSON.stringify(recentSlugs)); } catch (e) {}
  }
  function promptOfDay() {
    if (!ALL.length) return null;
    var day = new Date().toISOString().slice(0, 10);
    var hash = 2166136261;
    for (var i = 0; i < day.length; i++) { hash ^= day.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    var sorted = ALL.slice().sort(function (a, b) { return String(a.slug).localeCompare(String(b.slug)); });
    return sorted[(hash >>> 0) % sorted.length];
  }

  /* AUD-C P1/C1-P1/C2: local saved/recent/daily discovery, only unfiltered. */
  function discoveryHTML() {
    var frag = document.createDocumentFragment();
    var featured = ALL.filter(function (p) { return p.featured; });
    var fresh = ALL.filter(function (p) { return p.added; });
    var saved = ALL.filter(function (p) { return favorites.has(p.slug); });
    var recent = recentSlugs.map(findSlug).filter(Boolean);
    var used = new Set();
    var cardCount = 0;
    function row(title, items, max) {
      var unique = items.filter(function (p) { if (!p || used.has(p.slug)) return false; used.add(p.slug); return true; }).slice(0, max);
      if (!unique.length) return;
      var block = el('<section class="cat-block"></section>');
      block.appendChild(el('<div class="cat-block-head"><h3>' + title + '</h3><span class="cat-count">' + unique.length + '</span></div>'));
      var grid = el('<div class="cards"></div>');
      unique.forEach(function (p) { grid.appendChild(el(cardHTML(p))); cardCount++; });
      block.appendChild(grid); frag.appendChild(block);
    }
    row('&#9728;&#65039; ' + esc(tr('promptDay')), [promptOfDay()], 1);
    row('&#9829; ' + esc(tr('savedShelf')), saved, 4);
    row('&#128337; ' + esc(tr('recent')), recent, 4);
    row('&#128293; ' + esc(tr('important')), featured, 6);
    row('&#10024; ' + esc(tr('added')), fresh, 6);
    return { fragment: frag, count: cardCount, slugs: used };
  }
  function openPromptCard(card, options) { return withFullPrompt(card, function (full) { openModal(full, options || {}); }); }
  function openRandom() { if (ALL.length) openPromptCard(ALL[Math.floor(Math.random() * ALL.length)]); }
  function render() {
    var stream = document.getElementById('catStream'); if (!stream) return; stream.innerHTML = '';
    var useSyn = false;
    // exact pass first; if a search finds nothing, retry once letting tool-name synonyms match
    if (state.query && !ALL.some(function (p) { return matches(p, false); }) && ALL.some(function (p) { return matches(p, true); })) useSyn = true;
    var matched = ALL.filter(function (p) { return matches(p, useSyn); });
    var count = matched.length;
    var defaultView = !state.query && state.group === 'all' && state.exam === 'all' && state.aud === 'all' && state.fmt === 'all';
    var discovery = defaultView ? discoveryHTML() : { fragment: document.createDocumentFragment(), count: 0, slugs: new Set() };
    var budget = Math.max(0, state.renderLimit - discovery.count);
    var uniqueMatched = matched.filter(function (p) { return !discovery.slugs.has(p.slug); });
    var visible = uniqueMatched.slice(0, budget);
    GROUPS.forEach(function (g) {
      var catsIn = DATA.filter(function (c) { return c.group === g; });
      var has = false; var frag = document.createDocumentFragment();
      catsIn.forEach(function (cat) {
        var prompts = visible.filter(function (p) { return p._cat === cat.category; }); if (!prompts.length) return; has = true;
        var fullCategoryCount = matched.filter(function (p) { return p._cat === cat.category; }).length;
        var block = el('<section class="cat-block" id="cat-' + cat.category + '"></section>');
        block.appendChild(el('<div class="cat-block-head"><span class="cat-ic">' + (cat.categoryIcon || '') + '</span><h3>' + esc(cat.categoryTitle) + '</h3><span class="cat-count">' + fullCategoryCount + ' prompts</span></div>'));
        if (cat.categoryBlurb) block.appendChild(el('<p class="cat-blurb">' + esc(cat.categoryBlurb) + '</p>'));
        var grid = el('<div class="cards"></div>'); prompts.forEach(function (p) { grid.appendChild(el(cardHTML(p))); }); block.appendChild(grid); frag.appendChild(block);
      });
      if (has) { stream.appendChild(el('<div class="group-head"><h3>' + esc(g) + '</h3></div>')); stream.appendChild(frag); }
    });
    if (useSyn && count) stream.insertBefore(el('<div class="no-results" style="margin-bottom:18px">No prompt mentions &ldquo;' + esc(state.query) + '&rdquo; by name yet, so here are the prompts that do that job. Every prompt works in any AI chat - paste it there first.</div>'), stream.firstChild);
    if (defaultView && count) {
      var randWrap = el('<div class="random-prompt-wrap"><button class="fchip" id="randBtn" type="button">&#127922; ' + esc(tr('surprise')) + '</button></div>');
      randWrap.querySelector('#randBtn').addEventListener('click', openRandom);
      stream.insertBefore(discovery.fragment, stream.firstChild);
      stream.insertBefore(randWrap, stream.firstChild);
    }
    if (!count) {
      var nr = el('<div class="no-results">' + esc(tr('noMatch')) + ' &ldquo;' + esc(state.query) + '&rdquo;.<div class="fchips"></div></div>');
      var chipWrap = nr.querySelector('.fchips');
      SUGGEST_TERMS.forEach(function (t) {
        var b = el('<button class="fchip" type="button">' + esc(t) + '</button>');
        b.addEventListener('click', function () { var s = document.getElementById('search'); if (s) s.value = t; state.query = t; state.renderLimit = 60; var cl = document.getElementById('searchClear'); if (cl) cl.hidden = false; render(); });
        chipWrap.appendChild(b);
      });
      stream.appendChild(nr);
    }
    var remaining = uniqueMatched.length - visible.length;
    if (remaining > 0) {
      var more = el('<div class="show-more-wrap"><button class="btn btn-soft" type="button" id="showMore" aria-controls="catStream">' + esc(tr('showMore')) + ' <span>(' + remaining + ')</span></button></div>');
      more.querySelector('#showMore').addEventListener('click', function () { state.renderLimit += 60; render(); });
      stream.appendChild(more);
    }
    if (!state.hasRendered) {
      stream.querySelectorAll('.cards').forEach(function (grid) { grid.classList.add('is-initial-load'); });
      state.hasRendered = true;
    }
    updateCount(count, useSyn);
  }

  function findPrompt(id) { for (var i = 0; i < ALL.length; i++) if (ALL[i]._id === id) return ALL[i]; return null; }

  // AUD-E P1/E1-P1/E3: share the outcome and canonical URL, never the full prompt.
  function sharePrompt(p) {
    if (!p) return;
    var page = SITE + 'p/' + (p.slug || '') + '/';
    var message = tr('shareLead') + ': ' + T(p, 'title') + '\n' + T(p, 'whatYouGet');
    function whatsapp() { window.open('https://wa.me/?text=' + encodeURIComponent(message + '\n' + page), '_blank', 'noopener'); }
    if (navigator.share) {
      navigator.share({ title: T(p, 'title') + ' — Maths Prompt Studio', text: message, url: page }).catch(function (error) { if (!error || error.name !== 'AbortError') whatsapp(); });
    } else whatsapp();
  }

  /* ---------- delegated clicks on the stream (fast for 500+ cards) ---------- */
  function wireStream() {
    var stream = document.getElementById('catStream'); if (!stream) return;
    stream.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-copy')) { var p = findPrompt(b.getAttribute('data-copy')); if (p) withFullPrompt(p, function (full) { copyText(T(full, 'promptText'), b, tr('copied')); }); }
      else if (b.hasAttribute('data-view')) { openPromptCard(findPrompt(b.getAttribute('data-view'))); }
      else if (b.hasAttribute('data-open')) { var p2 = findPrompt(b.getAttribute('data-open')); if (p2) withFullPrompt(p2, function (full) { openTool(T(full, 'promptText'), b.getAttribute('data-tool'), b); }); }
      else if (b.hasAttribute('data-fmt')) { var p3 = findPrompt(b.getAttribute('data-fmt')); if (p3) withFullPrompt(p3, function (full) { copyFormatted(T(full, 'promptText'), b.getAttribute('data-kind'), b); }); }
      else if (b.hasAttribute('data-favorite')) { toggleFavorite(findPrompt(b.getAttribute('data-favorite'))); }
      else if (b.hasAttribute('data-share')) { sharePrompt(findPrompt(b.getAttribute('data-share'))); }
    });
  }

  /* ---------- modal ---------- */
  function openModal(p, options) {
    if (!p) return;
    options = options || {};
    var hi = state.lang === 'hi';
    var effList = T(p, 'effectiveUsage');
    var steps = (effList && effList.length) ? '<div class="modal-eff"><h4>&#9989; ' + (hi ? '&#2311;&#2360;&#2325;&#2366; &#2360;&#2361;&#2368; &#2311;&#2360;&#2381;&#2340;&#2375;&#2350;&#2366;&#2354;' : 'How to use this effectively') + '</h4><ol>' + effList.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>' : '';
    var fixText = T(p, 'commonFix');
    var fix = fixText ? '<div class="modal-fix"><b>&#128295; ' + (hi ? '&#2309;&#2327;&#2352; &#2332;&#2357;&#2366;&#2348; &#2336;&#2368;&#2325; &#2344; &#2354;&#2327;&#2375;, &#2340;&#2379; &#2351;&#2361; &#2349;&#2375;&#2332;&#2375;&#2306;:' : 'If it is not right, reply with this:') + '</b> ' + esc(fixText) + '</div>' : '';
    var body = document.getElementById('modalBody');
    var activeText = T(p, 'promptText');
    var _toks = [];
    (activeText.match(/\[[^\]\n]{1,80}\]/g) || []).forEach(function (t) { if (_toks.indexOf(t) === -1) _toks.push(t); });
    _toks = _toks.slice(0, 12);
    function filled() { var t = activeText; _toks.forEach(function (tok, i) { var elx = body.querySelector('[data-tok="' + i + '"]'); var v = elx ? elx.value.trim() : ''; if (v) t = t.split(tok).join(v); }); return t; }
    var fillHTML = '';
    if (_toks.length) {
      var hasStyles = p.styles && p.styles.length;
      fillHTML = '<details class="modal-fill"' + (hasStyles || options.fillOpen ? ' open' : '') + '><summary>&#9999;&#65039; ' + (hasStyles ? 'Pick a style + ' : '') + esc(tr('fillOptional')) + '</summary><p class="mf-note">' + esc(tr('fillNote')) + '</p><div class="mf-grid">' +
        _toks.map(function (t, i) {
          var label = esc(t.replace(/^\[|\]$/g, '').slice(0, 52));
          if (hasStyles && /STYLE/i.test(t)) {
            return '<label class="mf-f"><span>' + label + '</span><select data-tok="' + i + '"><option value="">-- choose one of ' + p.styles.length + ' styles --</option>' +
              p.styles.map(function (s) { return '<option value="' + esc(s.name + ': ' + s.direction) + '">' + esc(s.name) + '</option>'; }).join('') + '</select></label>';
          }
          var long = /PASTE|ATTACH|QUESTION|DATA|LIST|DESCRIBE|CHAPTER|TOPIC|SYLLABUS|WRITE YOURS|FIGURE/i.test(t);
          return '<label class="mf-f"><span>' + label + '</span>' + (long ? '<textarea data-tok="' + i + '" rows="2"></textarea>' : '<input data-tok="' + i + '" type="text" />') + '</label>';
        }).join('') +
        '</div></details>';
    }
    body.innerHTML = '<h3 id="modalTitle">' + esc(T(p, 'title')) + '</h3><div class="modal-tags"><span class="tag tag-cat"><span aria-hidden="true">' + esc(p._catIcon || '') + '</span> ' + esc(p._catTitle) + '</span>' + formatBadge(p) + tagChip(p) + '</div>' +
      '<div class="card-rel" style="margin:0 0 14px">' + relBadge(p) + ' &nbsp;&middot;&nbsp; <span class="rel">Best tool: <b>&nbsp;' + esc(p.bestTool || 'Any AI chat') + '</b></span></div>' +
      '<div class="modal-open"><span class="mo-lbl">' + (hi ? '&#2319;&#2325; &#2325;&#2381;&#2354;&#2367;&#2325; &#2350;&#2375;&#2306; &#2326;&#2379;&#2354;&#2375;&#2306; (&#2346;&#2381;&#2352;&#2377;&#2350;&#2381;&#2346;&#2381;&#2335; &#2325;&#2377;&#2346;&#2368; &#2361;&#2379; &#2332;&#2366;&#2319;&#2327;&#2366;):' : 'Open it in one click (the prompt is copied for you):') + '</span><div class="mo-btns"><button class="btn-tool t-gpt" id="mGpt">&#129302; Open in ChatGPT</button><button class="btn-tool t-claude" id="mClaude">&#128172; Open in Claude</button></div></div>' +
      steps + fix + fillHTML +
      '<div class="modal-export"><span class="mo-lbl">' + (hi ? 'इसे पाएँ:' : 'Get this as:') + '</span><div class="mo-btns"><button class="btn-soft" id="mPdf">PDF</button><button class="btn-soft" id="mWord">Word</button><button class="btn-soft" id="mPpt">PPT</button></div></div>' +
      '<div class="modal-lbl">' + (hi ? '&#2346;&#2381;&#2352;&#2377;&#2350;&#2381;&#2346;&#2381;&#2335; &#2325;&#2377;&#2346;&#2368; &#2325;&#2352;&#2375;&#2306;' : 'COPY THE PROMPT') + '</div><div class="prompt-box"><pre id="mPre">' + esc(activeText) + '</pre></div>' +
      '<div class="modal-actions"><button class="btn-copy" id="mCopy">&#128203; ' + esc(tr('copyPrompt')) + '</button>' +
      '<button class="btn-soft" id="mShare">&#128241; ' + esc(tr('share')) + '</button>' +
      '<button class="btn-soft" id="mLink">&#128279; ' + esc(tr('copyLink')) + '</button>' +
      '<button class="btn-view" data-close>' + esc(tr('close')) + '</button></div>' +
      '<p class="modal-report"><a href="#" id="mReport">&#9888;&#65039; Report a problem with this prompt</a></p>';
    var PAGE = SITE + 'p/' + (p.slug || '') + '/';
    document.getElementById('mGpt').addEventListener('click', function () { openTool(filled(), 'gpt', this); });
    document.getElementById('mClaude').addEventListener('click', function () { openTool(filled(), 'claude', this); });
    document.getElementById('mCopy').addEventListener('click', function () { copyText(filled(), this, tr('copied')); });
    document.getElementById('mPdf').addEventListener('click', function () { copyFormatted(filled(), 'pdf', this); });
    document.getElementById('mWord').addEventListener('click', function () { copyFormatted(filled(), 'word', this); });
    document.getElementById('mPpt').addEventListener('click', function () { copyFormatted(filled(), 'ppt', this); });
    body.querySelectorAll('[data-tok]').forEach(function (elx) { elx.addEventListener('input', function () { var pre = document.getElementById('mPre'); if (pre) pre.textContent = filled(); }); });
    document.getElementById('mShare').addEventListener('click', function () { sharePrompt(p); });
    document.getElementById('mLink').addEventListener('click', function () { copyText(PAGE, this, tr('linkCopied')); });
    document.getElementById('mReport').addEventListener('click', function (e) {
      e.preventDefault();
      var b = 'Prompt: ' + p.title + ' (' + (p.slug || p._id) + ')\nPage: ' + PAGE + '\n\nWhat went wrong (e.g. wrong answer, unclear step, bad formatting):\n';
      window.location.href = 'mailto:' + CFG.email + '?subject=' + encodeURIComponent('Problem with prompt: ' + p.title) + '&body=' + encodeURIComponent(b);
    });
    body.querySelectorAll('[data-close]').forEach(function (x) { x.addEventListener('click', closeModal); });
    if (p.slug) { try { history.replaceState(null, '', '#p/' + p.slug); } catch (e) {} }
    var m = document.getElementById('modal'); m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
    rememberRecent(p);
  }
  function closeModal() { var m = document.getElementById('modal'); m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; if ((location.hash || '').indexOf('#p/') === 0) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} } }
  function findSlug(slug) { for (var i = 0; i < ALL.length; i++) if (ALL[i].slug === slug) return ALL[i]; return null; }
  function openFromHash() { var h = location.hash || ''; if (h.indexOf('#p/') === 0) { var p = findSlug(decodeURIComponent(h.slice(3))); if (p) openPromptCard(p); } }

  /* ---------- LEARN 10x ---------- */
  var LEARN = [
    { ic: '&#128260;', t: 'The Feynman Loop', w: 'Understand anything deeply by explaining it simply.', p: 'Act as my study coach. Explain [TOPIC] to me in the simplest words, as if I am 12 years old. Then tell me the 3 parts students most often misunderstand, and quiz me on them one question at a time, waiting for my answer each time.' },
    { ic: '&#129504;', t: 'Active Recall Drill', w: 'Remembering by testing beats re-reading every time.', p: 'Be my quiz master for [TOPIC] at [CLASS/LEVEL]. Ask me ONE question at a time, wait for my answer, tell me if I am right, and give a one-line explanation. Start easy and get harder. Keep going until I say stop, then summarise my weak spots.' },
    { ic: '&#10067;', t: 'The Socratic Tutor', w: 'Reach the answer yourself with guided questions.', p: 'Be my maths tutor for [TOPIC]. Do NOT give me the answer. Ask me guiding questions one at a time until I work it out myself. If I am stuck, give a small hint, not the solution. Encourage me as we go.' },
    { ic: '&#9997;&#65039;', t: 'Worked Example, then Fade', w: 'Learn a skill, then practise with less and less help.', p: 'Teach me [SKILL] in 3 steps: (1) show ONE fully worked example with reasons for each line; (2) give me a similar problem with hints; (3) give me one with no hints. Check my answer after each and correct gently.' },
    { ic: '&#128269;', t: 'Spot-My-Mistake', w: 'Finding errors builds sharper understanding.', p: 'Give me a worked solution to a [TOPIC] problem that contains exactly ONE subtle but realistic mistake. I will try to find it. After I answer, tell me if I was right and explain the error and how to avoid it.' },
    { ic: '&#127757;', t: 'Analogy Engine', w: 'Make an abstract idea click with real-life pictures.', p: 'Explain [CONCEPT] using 3 different real-life analogies a student would relate to, then give a one-line plain-English definition, then one practice question to check I got it.' },
    { ic: '&#9201;&#65039;', t: 'Exam Simulator', w: 'Train under real exam conditions, then get marked.', p: 'Act as a strict [EXAM e.g. board / JEE] examiner. Give me [N] questions on [TOPIC] one at a time with a suggested time each. After I answer all of them, mark me out of the total, show where I lost marks, and list what to revise.' },
    { ic: '&#8617;&#65039;', t: 'Teach-Back', w: 'If you can teach it, you truly know it.', p: 'I am going to explain [TOPIC] to you in my own words. Listen carefully, then correct any mistakes, fill the gaps, rate my understanding out of 10, and tell me the ONE thing to fix first. Ready - here is my explanation: [WRITE YOURS].' },
    { ic: '&#128197;', t: 'Spaced Revision Plan', w: 'Beat forgetting with a smart, short daily plan.', p: 'Make me a 7-day revision plan for [CHAPTER] for [CLASS/EXAM]. Each day under 30 minutes, mixing new review with a quick active-recall check on earlier days. End with a short mock on day 7.' },
    { ic: '&#128506;&#65039;', t: 'Connect-the-Dots Map', w: 'See how each topic links to the bigger picture.', p: 'Show how [TOPIC] connects to other maths I have learned. Give a simple text map: what I need to know BEFORE this, the key ideas IN this topic, and what this UNLOCKS next. Add one line on why it matters.' },
  ];
  function renderLearn() {
    var grid = document.getElementById('learnGrid'); if (!grid) return;
    LEARN.forEach(function (x) {
      var c = el('<article class="learn-card"><div class="learn-top"><span class="learn-ic">' + x.ic + '</span><h3>' + esc(x.t) + '</h3></div><p class="learn-what">' + esc(x.w) + '</p><div class="learn-prompt">' + esc(x.p) + '</div><button class="btn-copy learn-copy">&#128203; Copy this technique</button></article>');
      c.querySelector('.learn-copy').addEventListener('click', function () { copyText(x.p, this, 'Copied! Paste it into ChatGPT or Claude.'); });
      grid.appendChild(c);
    });
  }

  /* ---------- feedback / share / about / tabs / theme / reveal ---------- */
  function initFeedback() {
    var rating = 0; var stars = document.querySelectorAll('#fbStars .star');
    function paint(v) { stars.forEach(function (s) { s.classList.toggle('on', parseInt(s.getAttribute('data-v'), 10) <= v); }); }
    stars.forEach(function (s) { var v = parseInt(s.getAttribute('data-v'), 10); s.addEventListener('mouseenter', function () { paint(v); }); s.addEventListener('click', function () { rating = v; paint(v); }); });
    var sw = document.getElementById('fbStars'); if (sw) sw.addEventListener('mouseleave', function () { paint(rating); });
    function compose() {
      var role = (document.getElementById('fbRole') || {}).value || ''; var msg = (document.getElementById('fbMsg') || {}).value || ''; var name = (document.getElementById('fbName') || {}).value || '';
      return { subject: 'Maths Prompt Studio feedback' + (rating ? ' (' + rating + '/5)' : ''), body: 'Rating: ' + (rating ? rating + '/5' : '-') + '\nRole: ' + role + '\nName: ' + (name || '-') + '\n\nFeedback:\n' + (msg || '(none)') + '\n\n--\nSent from Maths Prompt Studio' };
    }
    var form = document.getElementById('fbForm');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); var c = compose(); window.location.href = 'mailto:' + CFG.email + '?subject=' + encodeURIComponent(c.subject) + '&body=' + encodeURIComponent(c.body); var h = document.getElementById('fbHint'); if (h) h.textContent = 'Your email app should have opened with everything filled in - just press send. Thank you!'; });
    var cb = document.getElementById('fbCopy'); if (cb) cb.addEventListener('click', function () { var c = compose(); copyText(c.body, this, 'Feedback copied - paste it wherever you like.'); });
    var em = document.getElementById('fbEmailLink'); if (em) em.href = 'mailto:' + CFG.email + '?subject=' + encodeURIComponent('Maths Prompt Studio feedback');
    var fl = document.getElementById('fbFormLink'); if (fl && CFG.googleFormUrl) { fl.href = CFG.googleFormUrl; fl.hidden = false; }
    var wa = document.getElementById('fbWaLink'); if (wa && CFG.whatsapp) { wa.href = 'https://wa.me/' + String(CFG.whatsapp).replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent('Hello, feedback on Maths Prompt Studio: '); wa.hidden = false; }
    var ig = document.getElementById('fbInstaLink'); if (ig && CFG.instagram) { ig.href = 'https://instagram.com/' + String(CFG.instagram).replace(/^@/, ''); ig.hidden = false; }
  }
  function initShare() {
    var msg = 'Free AI tool for maths teachers and students - ' + ALL.length + ' ready prompts + a step-by-step beginner guide:';
    var wa = document.getElementById('shareWa'); if (wa) wa.addEventListener('click', function () { window.open('https://wa.me/?text=' + encodeURIComponent(msg + ' ' + SITE), '_blank'); });
    var cp = document.getElementById('shareCopy'); if (cp) cp.addEventListener('click', function () { copyText(SITE, this, 'Link copied - send it to a teacher or student!'); });
    var more = document.getElementById('shareMore'); if (more && navigator.share) { more.hidden = false; more.addEventListener('click', function () { navigator.share({ title: 'Maths Prompt Studio', text: msg, url: SITE }).catch(function () {}); }); }
    var link = document.getElementById('shareLink'); if (link) link.textContent = SITE;
  }
  function initAbout() { var a = document.getElementById('aboutAvatar'); if (a && CFG.photoUrl) { a.style.backgroundImage = 'url(' + CFG.photoUrl + ')'; a.style.backgroundSize = 'cover'; a.style.backgroundPosition = 'center'; a.textContent = ''; } }
  function buildPaperPrompt(o) {
    var foot = '\n\nSIGNATURE: If I filled in a name, end the paper with a "Prepared by [YOUR NAME]" footer line; otherwise add no signature.';
    var sectioned = /paper|test/i.test(o.type);
    return 'ROLE: Act as a senior ' + o.board + ' mathematics paper-setter and answer-key writer with 25 years of experience.\n\n' +
      'CONTEXT: Make a ' + o.type + ' for ' + o.cls + ' students (' + o.board + '). Total marks: ' + o.marks + '. Time: ' + o.time + '. Difficulty: ' + o.diff + '.\n\n' +
      'CHAPTERS / TOPICS to draw from (use ONLY these, and only the CURRENT syllabus): ' + o.chapters + '\n\n' +
      'YOUR TASK:\n' +
      '1. Start with a clean header block: exam name, subject (Mathematics), class, board, time, max marks, and 5-7 numbered General Instructions.\n' +
      (sectioned
        ? '2. Organise into standard ' + o.board + ' sections (e.g. Section A objective/MCQ, B very-short, C short, D long, E case/source-based) suited to the marks. Number questions continuously; show marks in brackets on the right; add internal choice (OR) where the pattern expects it.\n'
        : '2. Present it as a clean ' + o.type + ': a graded set of questions from easy to hard, numbered, with marks/level shown.\n') +
      '3. Add a mark-distribution table; the grand total MUST equal ' + o.marks + '.\n' +
      '4. Then, clearly separated under a heading "ANSWER KEY", give a complete step-wise solution and marking scheme for every question.\n\n' +
      'HOW TO WORK IT OUT: Silently solve every question first to confirm it is solvable and unambiguous. Check the marks sum exactly to ' + o.marks + '. Keep all maths in readable plain text (a/b, x^2, sqrt(x)) - never raw LaTeX.\n\n' +
      'OUTPUT FILE FORMAT: present everything ready to paste into Microsoft Word or Google Docs and print as an A4 PDF; keep the ANSWER KEY clearly separated.\n\n' +
      'GROUND RULES: stay strictly inside the given chapters and the current ' + o.board + ' syllabus; do not invent out-of-syllabus topics, fake data, or marks you were not asked for. If a chapter name is unclear, ask me before including it.' +
      foot;
  }
  function initBuilder() {
    var btn = document.getElementById('bBuild'); if (!btn) return;
    function gen() {
      return buildPaperPrompt({
        cls: (document.getElementById('bClass') || {}).value || 'Class 10',
        board: (document.getElementById('bBoard') || {}).value || 'CBSE',
        type: (document.getElementById('bType') || {}).value || 'Full question paper',
        diff: (document.getElementById('bDiff') || {}).value || 'Balanced',
        chapters: ((document.getElementById('bChapters') || {}).value || '').trim() || '[type your chapters here]',
        marks: ((document.getElementById('bMarks') || {}).value || '40').trim(),
        time: ((document.getElementById('bTime') || {}).value || '1.5 hours').trim()
      });
    }
    function refresh() { var pre = document.getElementById('bPre'); if (pre) pre.textContent = gen(); }
    btn.addEventListener('click', function () { var o = document.getElementById('bOut'); o.hidden = false; refresh(); o.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
    var c = document.getElementById('bCopy'); if (c) c.addEventListener('click', function () { copyText(gen(), this, 'Copied! Paste it into ChatGPT or Claude.'); });
    var g = document.getElementById('bGpt'); if (g) g.addEventListener('click', function () { openTool(gen(), 'gpt', this); });
    var cl = document.getElementById('bCla'); if (cl) cl.addEventListener('click', function () { openTool(gen(), 'claude', this); });
  }
  function initAnalytics() { if (!CFG.analyticsSrc) return; var s = document.createElement('script'); s.defer = true; s.src = CFG.analyticsSrc; if (CFG.analyticsDomain) s.setAttribute('data-domain', CFG.analyticsDomain); document.head.appendChild(s); }
  function initTrust() { var btn = document.getElementById('verifyBtn'); if (!btn) return; btn.addEventListener('click', function () { var p = findSlug('double-check-any-ai-maths-answer') || ALL.find(function (x) { return /double-check/i.test(x.title); }); if (p) openPromptCard(p); else { document.getElementById('library').scrollIntoView({ behavior: 'smooth' }); } }); }
  function initTabs() { document.querySelectorAll('.tabs').forEach(function (set) { set.querySelectorAll('.tab').forEach(function (tab) { tab.addEventListener('click', function () { var name = tab.getAttribute('data-tab'); set.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); }); tab.classList.add('active'); set.parentElement.querySelectorAll('.tabpane').forEach(function (pane) { pane.classList.toggle('active', pane.getAttribute('data-pane') === name); }); }); }); }); }
  function initReveal() { var els = Array.prototype.filter.call(document.querySelectorAll('.reveal'), function (e) { return !e.closest('.hero'); }); if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; } var io = new IntersectionObserver(function (ents) { ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold: 0.12 }); els.forEach(function (e) { io.observe(e); }); }
  function initTheme() { var saved = null; try { saved = localStorage.getItem('mps-theme'); } catch (e) {} if (saved) document.documentElement.setAttribute('data-theme', saved); var btn = document.getElementById('themeBtn'); function sync() { btn.innerHTML = document.documentElement.getAttribute('data-theme') === 'dark' ? '&#9728;' : '&#9790;'; } sync(); btn.addEventListener('click', function () { var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', next); try { localStorage.setItem('mps-theme', next); } catch (e) {} sync(); }); }

  /* ---------- search ---------- */
  function initSearch() {
    var s = document.getElementById('search'); var clearBtn = document.getElementById('searchClear'); if (!s) return; var deb;
    function apply() {
      state.query = s.value.trim();
      state.renderLimit = 60;
      if (clearBtn) clearBtn.hidden = !state.query;
      render();
      // mobile-friendly: when a search begins, bring the results into view so the change is visible
      if (state.query && state.prevEmpty) { var lib = document.getElementById('library'); if (lib) lib.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      state.prevEmpty = !state.query;
    }
    s.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(apply, 140); });
    if (clearBtn) clearBtn.addEventListener('click', function () { s.value = ''; state.query = ''; state.renderLimit = 60; clearBtn.hidden = true; state.prevEmpty = true; render(); s.focus(); });
  }

  function init() {
    document.getElementById('year').textContent = new Date().getFullYear();
    initTheme(); initLangSwitch(); initTabs(); renderLearn(); initFeedback(); initShare(); initAbout(); initReveal(); initAnalytics();
    if (!DATA.length) { document.getElementById('catStream').innerHTML = '<div class="no-results">The library is still being prepared. Please refresh in a moment.</div>'; return; }
    setStats(); buildChips(); buildFacets(); buildFormatFacets(); buildQuickStart(); wireStream(); render(); initSearch(); initTrust(); initBuilder();
    if (state.lang !== 'en') ensureCatalogLanguage(state.lang).then(refreshLanguageView);
    document.querySelectorAll('#modal [data-close]').forEach(function (x) { x.addEventListener('click', closeModal); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    openFromHash(); window.addEventListener('hashchange', openFromHash);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
