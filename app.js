/* ============================================================
   Maths Prompt Studio v4 - by Indrajeet Yadav
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.MPS_CONFIG || { email: 'indrajeetsirallen@gmail.com', whatsapp: '', instagram: '', googleFormUrl: '', photoUrl: '' };
  var SITE = 'https://yosoyun.github.io/math-prompt-studio/';
  var DATA = (window.PROMPT_DATA && window.PROMPT_DATA.categories) || [];
  var GROUP_ORDER = ['Solving & Checking', 'Practice & Assessment', 'Teaching Materials', 'Writing & Content', 'Engagement', 'Support', 'Teacher Productivity'];

  var ALL = [];
  DATA.forEach(function (cat) {
    if (!cat.group) cat.group = 'More';
    (cat.prompts || []).forEach(function (p, i) { p._cat = cat.category; p._catTitle = cat.categoryTitle; p._group = cat.group; p._id = cat.category + '-' + i; ALL.push(p); });
  });
  var GROUPS = GROUP_ORDER.filter(function (g) { return DATA.some(function (c) { return c.group === g; }); });
  DATA.forEach(function (c) { if (GROUPS.indexOf(c.group) === -1) GROUPS.push(c.group); });

  var state = { group: 'all', query: '', prevEmpty: true, lang: 'en', exam: 'all', aud: 'all' };
  try { if (localStorage.getItem('mps-lang') === 'hi') state.lang = 'hi'; } catch (e) {}

  /* Bilingual: every prompt may carry a p.hi = {title, whatYouGet, howToUse, effectiveUsage, commonFix, promptText}.
     T() returns the Hindi field when the teacher chose Hindi and a translation exists, else English. */
  function T(p, field) { return (state.lang === 'hi' && p.hi && p.hi[field]) ? p.hi[field] : p[field]; }
  function setLang(lang) { state.lang = lang; try { localStorage.setItem('mps-lang', lang); } catch (e) {} document.querySelectorAll('.lang-chip').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-lang') === lang); }); if (typeof buildFacets === 'function') buildFacets(); render(); }

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
    var map = { prompts: ALL.length + '+', cats: DATA.length, styles: styleCat ? styleCat.prompts.length : 18 };
    document.querySelectorAll('[data-stat]').forEach(function (n) { var k = n.getAttribute('data-stat'); if (map[k] != null) n.textContent = map[k]; });
  }

  /* ---------- group chips ---------- */
  function buildChips() {
    var wrap = document.getElementById('groupChips'); if (!wrap) return; wrap.innerHTML = '';
    var chips = [{ id: 'all', title: 'All', ct: ALL.length }];
    GROUPS.forEach(function (g) { chips.push({ id: g, title: g, ct: DATA.filter(function (c) { return c.group === g; }).reduce(function (t, c) { return t + (c.prompts || []).length; }, 0) }); });
    chips.forEach(function (c) {
      var b = el('<button class="fchip' + (c.id === state.group ? ' active' : '') + '">' + esc(c.title) + ' <span class="fchip-ct">' + c.ct + '</span></button>');
      b.addEventListener('click', function () { state.group = c.id; document.querySelectorAll('#groupChips .fchip').forEach(function (x) { x.classList.remove('active'); }); b.classList.add('active'); render(); document.getElementById('library').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
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
    var old = document.getElementById('facetChips'); if (old) old.remove();
    var hi = state.lang === 'hi';
    var wrap = el('<div class="fchips" id="facetChips" style="margin-top:10px"></div>');
    function addChip(list, key, item) {
      var n = item.id === 'all' ? null : ALL.filter(function (p) { return key === 'exam' ? (p.exams || []).indexOf(item.id) !== -1 : (p.aud === item.id || p.aud === 'both'); }).length;
      var b = el('<button class="fchip' + (state[key] === item.id ? ' active' : '') + '" type="button">' + esc(hi ? item.hi : item.en) + (n != null ? ' <span class="fchip-ct">' + n + '</span>' : '') + '</button>');
      b.addEventListener('click', function () { state[key] = item.id; buildFacets(); render(); });
      wrap.appendChild(b);
    }
    EXAMS.forEach(function (x) { addChip(EXAMS, 'exam', x); });
    var sep = el('<span style="display:inline-block;width:14px"></span>'); wrap.appendChild(sep);
    AUDS.forEach(function (x) { addChip(AUDS, 'aud', x); });
    chips.parentNode.insertBefore(wrap, chips.nextSibling);
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
  function cardHTML(p) {
    var id = p._id;
    var hi = state.lang === 'hi';
    return '<article class="card" data-id="' + id + '"><div class="card-tags"><span class="tag tag-cat">' + esc(p._catTitle) + '</span>' + tagChip(p) + '</div>' +
      '<h4>' + esc(T(p, 'title')) + '</h4><p class="card-what">' + esc(T(p, 'whatYouGet')) + '</p><div class="card-rel">' + relBadge(p) + '</div>' +
      '<button class="card-copy-main" data-copy="' + id + '">&#128203; ' + (hi ? 'प्रॉम्प्ट कॉपी करें' : 'Copy prompt') + '</button>' +
      '<div class="card-open">' +
      '<button class="btn-tool t-gpt" data-open="' + id + '" data-tool="gpt">&#129302; Open ChatGPT</button>' +
      '<button class="btn-tool t-claude" data-open="' + id + '" data-tool="claude">&#128172; Open Claude</button>' +
      '</div>' +
      '<button class="card-more" data-view="' + id + '">' + (hi ? 'इस्तेमाल कैसे करें' : 'How to use this') + ' &rarr;</button>' +
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
    if (state.group !== 'all' && p._group !== state.group) return false;
    if (state.exam !== 'all' && (p.exams || []).indexOf(state.exam) === -1) return false;
    if (state.aud !== 'all' && p.aud !== state.aud && p.aud !== 'both') return false;
    if (state.query) {
      // both languages are always searchable, whatever the toggle shows
      var hiText = p.hi ? (' ' + (p.hi.title || '') + ' ' + (p.hi.whatYouGet || '') + ' ' + (p.hi.promptText || '')) : '';
      var hayFull = (p.title + ' ' + p.whatYouGet + ' ' + p._catTitle + ' ' + p._group + ' ' + (p.howToUse || '') + ' ' + p.promptText + hiText).toLowerCase();
      var hayCard = (p.title + ' ' + p.whatYouGet + ' ' + p._catTitle + (p.hi ? ' ' + (p.hi.title || '') + ' ' + (p.hi.whatYouGet || '') : '')).toLowerCase();
      var terms = state.query.toLowerCase().split(/\s+/);
      for (var qi = 0; qi < terms.length; qi++) { if (terms[qi] && !termHits(hayFull, hayCard, terms[qi], useSyn)) return false; }
    }
    return true;
  }
  function updateCount(n, viaSynonyms) {
    var c = document.getElementById('resultCount'); if (!c) return;
    if (state.query && viaSynonyms) c.innerHTML = '<b>' + n + '</b> related prompt' + (n === 1 ? '' : 's') + ' for &ldquo;' + esc(state.query) + '&rdquo;';
    else if (state.query) c.innerHTML = '<b>' + n + '</b> prompt' + (n === 1 ? '' : 's') + ' found for &ldquo;' + esc(state.query) + '&rdquo;' + (n ? '' : ' - try another word');
    else if (state.group !== 'all') c.innerHTML = '<b>' + n + '</b> prompts in ' + esc(state.group);
    else c.innerHTML = 'Browse all <b>' + n + '</b> prompts';
  }
  var SUGGEST_TERMS = ['graph', 'worksheet', 'quiz', 'lesson plan', 'formula sheet', 'photo', 'JEE', 'parents'];
  /* discovery strip: new + featured + random — only on the unfiltered view */
  function discoveryHTML() {
    var hi = state.lang === 'hi';
    var frag = document.createDocumentFragment();
    var featured = ALL.filter(function (p) { return p.featured; });
    var fresh = ALL.filter(function (p) { return p.added; });
    function row(title, items, max) {
      if (!items.length) return;
      var block = el('<section class="cat-block"></section>');
      block.appendChild(el('<div class="cat-block-head"><h3>' + title + '</h3><span class="cat-count">' + items.length + ' prompts</span></div>'));
      var grid = el('<div class="cards"></div>');
      items.slice(0, max).forEach(function (p) { grid.appendChild(el(cardHTML(p))); });
      block.appendChild(grid); frag.appendChild(block);
    }
    row('&#128293; ' + (hi ? 'सबसे ज़रूरी' : 'Most important'), featured, 6);
    row('&#10024; ' + (hi ? 'हाल ही में जोड़े गए' : 'Recently added'), fresh, 6);
    return frag;
  }
  function openRandom() { if (ALL.length) openModal(ALL[Math.floor(Math.random() * ALL.length)]); }
  function render() {
    var stream = document.getElementById('catStream'); if (!stream) return; stream.innerHTML = ''; var count = 0;
    var useSyn = false;
    // exact pass first; if a search finds nothing, retry once letting tool-name synonyms match
    if (state.query && !ALL.some(function (p) { return matches(p, false); }) && ALL.some(function (p) { return matches(p, true); })) useSyn = true;
    GROUPS.forEach(function (g) {
      if (state.group !== 'all' && state.group !== g) return;
      var catsIn = DATA.filter(function (c) { return c.group === g; });
      var has = false; var frag = document.createDocumentFragment();
      catsIn.forEach(function (cat) {
        var prompts = (cat.prompts || []).filter(function (p) { return matches(p, useSyn); }); if (!prompts.length) return; has = true; count += prompts.length;
        var block = el('<section class="cat-block" id="cat-' + cat.category + '"></section>');
        block.appendChild(el('<div class="cat-block-head"><span class="cat-ic">' + (cat.categoryIcon || '') + '</span><h3>' + esc(cat.categoryTitle) + '</h3><span class="cat-count">' + prompts.length + ' prompts</span></div>'));
        if (cat.categoryBlurb) block.appendChild(el('<p class="cat-blurb">' + esc(cat.categoryBlurb) + '</p>'));
        var grid = el('<div class="cards"></div>'); prompts.forEach(function (p) { grid.appendChild(el(cardHTML(p))); }); block.appendChild(grid); frag.appendChild(block);
      });
      if (has) { stream.appendChild(el('<div class="group-head"><h3>' + esc(g) + '</h3></div>')); stream.appendChild(frag); }
    });
    if (useSyn && count) stream.insertBefore(el('<div class="no-results" style="margin-bottom:18px">No prompt mentions &ldquo;' + esc(state.query) + '&rdquo; by name yet, so here are the prompts that do that job. Every prompt works in any AI chat - paste it there first.</div>'), stream.firstChild);
    if (!state.query && state.group === 'all' && count) {
      var disco = discoveryHTML();
      var randWrap = el('<div style="text-align:center;margin:0 0 20px"><button class="fchip" id="randBtn" type="button" style="font-size:15px;padding:.5em 1.4em">&#127922; ' + (state.lang === 'hi' ? 'कोई भी एक प्रॉम्प्ट दिखाओ' : 'Surprise me — random prompt') + '</button></div>');
      randWrap.querySelector('#randBtn').addEventListener('click', openRandom);
      stream.insertBefore(disco, stream.firstChild);
      stream.insertBefore(randWrap, stream.firstChild);
    }
    if (!count) {
      var nr = el('<div class="no-results">No prompts match &ldquo;' + esc(state.query) + '&rdquo;. Try one of these:<div class="fchips" style="margin-top:12px"></div></div>');
      var chipWrap = nr.querySelector('.fchips');
      SUGGEST_TERMS.forEach(function (t) {
        var b = el('<button class="fchip" type="button">' + esc(t) + '</button>');
        b.addEventListener('click', function () { var s = document.getElementById('search'); if (s) s.value = t; state.query = t; var cl = document.getElementById('searchClear'); if (cl) cl.hidden = false; render(); });
        chipWrap.appendChild(b);
      });
      stream.appendChild(nr);
    }
    updateCount(count, useSyn);
  }

  function findPrompt(id) { for (var i = 0; i < ALL.length; i++) if (ALL[i]._id === id) return ALL[i]; return null; }

  /* ---------- delegated clicks on the stream (fast for 500+ cards) ---------- */
  function wireStream() {
    var stream = document.getElementById('catStream'); if (!stream) return;
    stream.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-copy')) { var p = findPrompt(b.getAttribute('data-copy')); if (p) copyText(T(p, 'promptText'), b, state.lang === 'hi' ? 'कॉपी हो गया! अपने AI चैट में पेस्ट करें।' : 'Copied! Paste it into your AI chat.'); }
      else if (b.hasAttribute('data-view')) { openModal(findPrompt(b.getAttribute('data-view'))); }
      else if (b.hasAttribute('data-open')) { var p2 = findPrompt(b.getAttribute('data-open')); if (p2) openTool(T(p2, 'promptText'), b.getAttribute('data-tool'), b); }
      else if (b.hasAttribute('data-fmt')) { var p3 = findPrompt(b.getAttribute('data-fmt')); if (p3) copyFormatted(T(p3, 'promptText'), b.getAttribute('data-kind'), b); }
    });
  }

  /* ---------- modal ---------- */
  function openModal(p) {
    if (!p) return;
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
      fillHTML = '<details class="modal-fill"' + (hasStyles ? ' open' : '') + '><summary>&#9999;&#65039; ' + (hasStyles ? 'Pick a style + fill in the blanks' : 'Fill in the blanks here (optional)') + '</summary><p class="mf-note">' + (hi ? 'अपनी जानकारी भरें - नीचे का प्रॉम्प्ट अपने आप बदल जाएगा।' : 'Type your details - the prompt below and the Copy / Open buttons update automatically.') + '</p><div class="mf-grid">' +
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
    body.innerHTML = '<h3 id="modalTitle">' + esc(T(p, 'title')) + '</h3><div class="modal-tags"><span class="tag tag-cat">' + esc(p._catTitle) + '</span>' + tagChip(p) + '</div>' +
      '<div class="card-rel" style="margin:0 0 14px">' + relBadge(p) + ' &nbsp;&middot;&nbsp; <span class="rel">Best tool: <b>&nbsp;' + esc(p.bestTool || 'Any AI chat') + '</b></span></div>' +
      '<div class="modal-open"><span class="mo-lbl">' + (hi ? '&#2319;&#2325; &#2325;&#2381;&#2354;&#2367;&#2325; &#2350;&#2375;&#2306; &#2326;&#2379;&#2354;&#2375;&#2306; (&#2346;&#2381;&#2352;&#2377;&#2350;&#2381;&#2346;&#2381;&#2335; &#2325;&#2377;&#2346;&#2368; &#2361;&#2379; &#2332;&#2366;&#2319;&#2327;&#2366;):' : 'Open it in one click (the prompt is copied for you):') + '</span><div class="mo-btns"><button class="btn-tool t-gpt" id="mGpt">&#129302; Open in ChatGPT</button><button class="btn-tool t-claude" id="mClaude">&#128172; Open in Claude</button></div></div>' +
      steps + fix + fillHTML +
      '<div class="modal-lbl">' + (hi ? '&#2346;&#2381;&#2352;&#2377;&#2350;&#2381;&#2346;&#2381;&#2335; &#2325;&#2377;&#2346;&#2368; &#2325;&#2352;&#2375;&#2306;' : 'COPY THE PROMPT') + '</div><div class="prompt-box"><pre id="mPre">' + esc(activeText) + '</pre></div>' +
      '<div class="modal-actions"><button class="btn-copy" id="mCopy">&#128203; Copy prompt</button>' +
      '<button class="btn-soft" id="mShare">&#128241; Share this prompt</button>' +
      '<button class="btn-soft" id="mLink">&#128279; Copy link</button>' +
      '<button class="btn-view" data-close>Close</button></div>' +
      '<p class="modal-report"><a href="#" id="mReport">&#9888;&#65039; Report a problem with this prompt</a></p>';
    var PAGE = SITE + 'p/' + (p.slug || '') + '/';
    document.getElementById('mGpt').addEventListener('click', function () { openTool(filled(), 'gpt', this); });
    document.getElementById('mClaude').addEventListener('click', function () { openTool(filled(), 'claude', this); });
    document.getElementById('mCopy').addEventListener('click', function () { copyText(filled(), this, 'Copied! Paste it into your AI chat.'); });
    body.querySelectorAll('[data-tok]').forEach(function (elx) { elx.addEventListener('input', function () { var pre = document.getElementById('mPre'); if (pre) pre.textContent = filled(); }); });
    document.getElementById('mShare').addEventListener('click', function () {
      var msg = 'Free AI prompt for maths teachers - ' + p.title + ':';
      if (p.slug && navigator.share) { navigator.share({ title: 'Maths Prompt Studio', text: msg, url: PAGE }).catch(function () {}); }
      else { window.open('https://wa.me/?text=' + encodeURIComponent(msg + ' ' + PAGE), '_blank'); }
    });
    document.getElementById('mLink').addEventListener('click', function () { copyText(PAGE, this, 'Link copied - send this prompt to a teacher!'); });
    document.getElementById('mReport').addEventListener('click', function (e) {
      e.preventDefault();
      var b = 'Prompt: ' + p.title + ' (' + (p.slug || p._id) + ')\nPage: ' + PAGE + '\n\nWhat went wrong (e.g. wrong answer, unclear step, bad formatting):\n';
      window.location.href = 'mailto:' + CFG.email + '?subject=' + encodeURIComponent('Problem with prompt: ' + p.title) + '&body=' + encodeURIComponent(b);
    });
    body.querySelectorAll('[data-close]').forEach(function (x) { x.addEventListener('click', closeModal); });
    if (p.slug) { try { history.replaceState(null, '', '#p/' + p.slug); } catch (e) {} }
    var m = document.getElementById('modal'); m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
  }
  function closeModal() { var m = document.getElementById('modal'); m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; if ((location.hash || '').indexOf('#p/') === 0) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} } }
  function findSlug(slug) { for (var i = 0; i < ALL.length; i++) if (ALL[i].slug === slug) return ALL[i]; return null; }
  function openFromHash() { var h = location.hash || ''; if (h.indexOf('#p/') === 0) { var p = findSlug(decodeURIComponent(h.slice(3))); if (p) openModal(p); } }

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
    var wa = document.getElementById('fbWaLink'); if (wa && CFG.whatsapp) { wa.href = 'https://wa.me/' + String(CFG.whatsapp).replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent('Hi Indrajeet, feedback on Maths Prompt Studio: '); wa.hidden = false; }
    var ig = document.getElementById('fbInstaLink'); if (ig && CFG.instagram) { ig.href = 'https://instagram.com/' + String(CFG.instagram).replace(/^@/, ''); ig.hidden = false; }
  }
  function initShare() {
    var msg = 'Free AI tool for maths teachers and students - 520 ready prompts + a step-by-step beginner guide:';
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
  function initTrust() { var btn = document.getElementById('verifyBtn'); if (!btn) return; btn.addEventListener('click', function () { var p = findSlug('double-check-any-ai-maths-answer') || ALL.find(function (x) { return /double-check/i.test(x.title); }); if (p) openModal(p); else { document.getElementById('library').scrollIntoView({ behavior: 'smooth' }); } }); }
  function initTabs() { document.querySelectorAll('.tabs').forEach(function (set) { set.querySelectorAll('.tab').forEach(function (tab) { tab.addEventListener('click', function () { var name = tab.getAttribute('data-tab'); set.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); }); tab.classList.add('active'); set.parentElement.querySelectorAll('.tabpane').forEach(function (pane) { pane.classList.toggle('active', pane.getAttribute('data-pane') === name); }); }); }); }); }
  function initReveal() { var els = document.querySelectorAll('.reveal'); if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; } var io = new IntersectionObserver(function (ents) { ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold: 0.12 }); els.forEach(function (e) { io.observe(e); }); }
  function initTheme() { var saved = null; try { saved = localStorage.getItem('mps-theme'); } catch (e) {} if (saved) document.documentElement.setAttribute('data-theme', saved); var btn = document.getElementById('themeBtn'); function sync() { btn.innerHTML = document.documentElement.getAttribute('data-theme') === 'dark' ? '&#9728;' : '&#9790;'; } sync(); btn.addEventListener('click', function () { var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', next); try { localStorage.setItem('mps-theme', next); } catch (e) {} sync(); }); }

  /* ---------- search ---------- */
  function initSearch() {
    var s = document.getElementById('search'); var clearBtn = document.getElementById('searchClear'); if (!s) return; var deb;
    function apply() {
      state.query = s.value.trim();
      if (clearBtn) clearBtn.hidden = !state.query;
      render();
      // mobile-friendly: when a search begins, bring the results into view so the change is visible
      if (state.query && state.prevEmpty) { var lib = document.getElementById('library'); if (lib) lib.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      state.prevEmpty = !state.query;
    }
    s.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(apply, 140); });
    if (clearBtn) clearBtn.addEventListener('click', function () { s.value = ''; state.query = ''; clearBtn.hidden = true; state.prevEmpty = true; render(); s.focus(); });
  }

  function init() {
    document.getElementById('year').textContent = new Date().getFullYear();
    initTheme(); initLangSwitch(); initTabs(); renderLearn(); initFeedback(); initShare(); initAbout(); initReveal(); initAnalytics();
    if (!DATA.length) { document.getElementById('catStream').innerHTML = '<div class="no-results">The library is still being prepared. Please refresh in a moment.</div>'; return; }
    setStats(); buildChips(); buildFacets(); wireStream(); render(); initSearch(); initTrust(); initBuilder();
    document.querySelectorAll('#modal [data-close]').forEach(function (x) { x.addEventListener('click', closeModal); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    openFromHash(); window.addEventListener('hashchange', openFromHash);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
