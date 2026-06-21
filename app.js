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

  var state = { group: 'all', query: '', prevEmpty: true };

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
    word: '\n\n----------\nFORMAT THE OUTPUT: After solving, present your ENTIRE response as a clean document ready to paste straight into Microsoft Word or Google Docs - use a bold title, clear section headings, bold key terms, neatly numbered steps, and tables where helpful. Keep all mathematics fully readable. Keep the "Prepared by ' + 'Indrajeet Yadav" footer line.',
    pdf: '\n\n----------\nFORMAT THE OUTPUT: After solving, lay out your ENTIRE response as a clean, print-ready A4 page I can save as PDF (File > Print > Save as PDF) - a clear title, well-spaced headings, numbered sections and generous margins. Keep all mathematics fully readable. Keep the "Prepared by ' + 'Indrajeet Yadav" footer line.',
    ppt: '\n\n----------\nFORMAT THE OUTPUT: After solving, turn your ENTIRE response into a slide-by-slide deck for PowerPoint, Google Slides, Canva or Gamma. For each slide give "Slide N - Title", then 3 to 5 short bullet points, then a "Speaker notes:" line. Begin with a title slide and end with a summary slide. Put "Compiled by ' + 'Indrajeet Yadav" on the title slide.'
  };
  var FMT_MSG = { word: 'Copied a Word-ready version - paste into ChatGPT or Claude, then into Word/Docs.', pdf: 'Copied a print-ready (PDF) version - paste into your AI, then Print > Save as PDF.', ppt: 'Copied a slide-deck version - paste into your AI, then into PowerPoint/Slides/Gamma.' };
  function copyFormatted(text, kind, btn) { copyText(text + (FMT[kind] || ''), btn, FMT_MSG[kind]); }

  /* ---------- open in tool ---------- */
  function openTool(text, tool, btn) {
    var base = tool === 'claude' ? 'https://claude.ai/new' : 'https://chatgpt.com/';
    var name = tool === 'claude' ? 'Claude' : 'ChatGPT';
    var limit = tool === 'claude' ? 10000 : 6000; // keep within safe URL length
    var full = base + '?q=' + encodeURIComponent(text);
    var carried = full.length <= limit;
    clip(text).then(function () {
      var url = carried ? full : base;
      try { window.open(url, '_blank', 'noopener'); } catch (e) { location.href = url; }
      copyBtn(btn, '&#10003; Opened');
      showToast(carried
        ? name + ' is opening with your prompt. It is also copied - if the box is empty, just paste it (Ctrl/Cmd+V or long-press > Paste), fill the [brackets] and send.'
        : name + ' opened. This prompt is long, so it is copied - paste it (Ctrl/Cmd+V or long-press > Paste), then send.');
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
    return '<article class="card" data-id="' + id + '"><div class="card-tags"><span class="tag tag-cat">' + esc(p._catTitle) + '</span>' + tagChip(p) + '</div>' +
      '<h4>' + esc(p.title) + '</h4><p class="card-what">' + esc(p.whatYouGet) + '</p><div class="card-rel">' + relBadge(p) + '</div>' +
      '<div class="card-open">' +
      '<button class="btn-tool t-gpt" data-open="' + id + '" data-tool="gpt">&#129302; Open in ChatGPT</button>' +
      '<button class="btn-tool t-claude" data-open="' + id + '" data-tool="claude">&#128172; Open in Claude</button>' +
      '</div>' +
      '<button class="btn-soft card-copy" data-copy="' + id + '">&#128203; Copy prompt</button>' +
      '<button class="card-more" data-view="' + id + '">How to use this &rarr;</button>' +
      '</article>';
  }
  function matches(p) {
    if (state.group !== 'all' && p._group !== state.group) return false;
    if (state.query) { var q = state.query.toLowerCase(); var hay = (p.title + ' ' + p.whatYouGet + ' ' + p._catTitle + ' ' + p._group + ' ' + (p.howToUse || '') + ' ' + p.promptText).toLowerCase(); if (hay.indexOf(q) === -1) return false; }
    return true;
  }
  function updateCount(n) {
    var c = document.getElementById('resultCount'); if (!c) return;
    if (state.query) c.innerHTML = '<b>' + n + '</b> prompt' + (n === 1 ? '' : 's') + ' found for &ldquo;' + esc(state.query) + '&rdquo;' + (n ? '' : ' - try another word');
    else if (state.group !== 'all') c.innerHTML = '<b>' + n + '</b> prompts in ' + esc(state.group);
    else c.innerHTML = 'Browse all <b>' + n + '</b> prompts';
  }
  function render() {
    var stream = document.getElementById('catStream'); if (!stream) return; stream.innerHTML = ''; var count = 0;
    GROUPS.forEach(function (g) {
      if (state.group !== 'all' && state.group !== g) return;
      var catsIn = DATA.filter(function (c) { return c.group === g; });
      var has = false; var frag = document.createDocumentFragment();
      catsIn.forEach(function (cat) {
        var prompts = (cat.prompts || []).filter(matches); if (!prompts.length) return; has = true; count += prompts.length;
        var block = el('<section class="cat-block" id="cat-' + cat.category + '"></section>');
        block.appendChild(el('<div class="cat-block-head"><span class="cat-ic">' + (cat.categoryIcon || '') + '</span><h3>' + esc(cat.categoryTitle) + '</h3><span class="cat-count">' + prompts.length + ' prompts</span></div>'));
        if (cat.categoryBlurb) block.appendChild(el('<p class="cat-blurb">' + esc(cat.categoryBlurb) + '</p>'));
        var grid = el('<div class="cards"></div>'); prompts.forEach(function (p) { grid.appendChild(el(cardHTML(p))); }); block.appendChild(grid); frag.appendChild(block);
      });
      if (has) { stream.appendChild(el('<div class="group-head"><h3>' + esc(g) + '</h3></div>')); stream.appendChild(frag); }
    });
    if (!count) stream.appendChild(el('<div class="no-results">No prompts match &ldquo;' + esc(state.query) + '&rdquo;. Try another word, or tap All.</div>'));
    updateCount(count);
  }

  function findPrompt(id) { for (var i = 0; i < ALL.length; i++) if (ALL[i]._id === id) return ALL[i]; return null; }

  /* ---------- delegated clicks on the stream (fast for 500+ cards) ---------- */
  function wireStream() {
    var stream = document.getElementById('catStream'); if (!stream) return;
    stream.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-copy')) { var p = findPrompt(b.getAttribute('data-copy')); if (p) copyText(p.promptText, b, 'Copied! Paste it into your AI chat.'); }
      else if (b.hasAttribute('data-view')) { openModal(findPrompt(b.getAttribute('data-view'))); }
      else if (b.hasAttribute('data-open')) { var p2 = findPrompt(b.getAttribute('data-open')); if (p2) openTool(p2.promptText, b.getAttribute('data-tool'), b); }
      else if (b.hasAttribute('data-fmt')) { var p3 = findPrompt(b.getAttribute('data-fmt')); if (p3) copyFormatted(p3.promptText, b.getAttribute('data-kind'), b); }
    });
  }

  /* ---------- modal ---------- */
  function openModal(p) {
    if (!p) return;
    var steps = (p.effectiveUsage && p.effectiveUsage.length) ? '<div class="modal-eff"><h4>&#9989; How to use this effectively</h4><ol>' + p.effectiveUsage.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>' : '';
    var fix = p.commonFix ? '<div class="modal-fix"><b>&#128295; If it is not right, reply with this:</b> ' + esc(p.commonFix) + '</div>' : '';
    var body = document.getElementById('modalBody');
    body.innerHTML = '<h3 id="modalTitle">' + esc(p.title) + '</h3><div class="modal-tags"><span class="tag tag-cat">' + esc(p._catTitle) + '</span>' + tagChip(p) + '</div>' +
      '<div class="card-rel" style="margin:0 0 14px">' + relBadge(p) + ' &nbsp;&middot;&nbsp; <span class="rel">Best tool: <b>&nbsp;' + esc(p.bestTool || 'Any AI chat') + '</b></span></div>' +
      '<div class="modal-open"><span class="mo-lbl">Open it in one click (the prompt is copied for you):</span><div class="mo-btns"><button class="btn-tool t-gpt" id="mGpt">&#129302; Open in ChatGPT</button><button class="btn-tool t-claude" id="mClaude">&#128172; Open in Claude</button></div></div>' +
      steps + fix +
      '<div class="modal-lbl">COPY THE PROMPT</div><div class="prompt-box"><pre>' + esc(p.promptText) + '</pre></div>' +
      '<div class="modal-actions"><button class="btn-copy" id="mCopy">&#128203; Copy prompt</button><button class="btn-view" data-close>Close</button></div>';
    document.getElementById('mGpt').addEventListener('click', function () { openTool(p.promptText, 'gpt', this); });
    document.getElementById('mClaude').addEventListener('click', function () { openTool(p.promptText, 'claude', this); });
    document.getElementById('mCopy').addEventListener('click', function () { copyText(p.promptText, this, 'Copied! Paste it into your AI chat.'); });
    body.querySelectorAll('[data-close]').forEach(function (x) { x.addEventListener('click', closeModal); });
    var m = document.getElementById('modal'); m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
  }
  function closeModal() { var m = document.getElementById('modal'); m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }

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
    var msg = 'Free AI tool for maths teachers and students - 500+ ready prompts + a step-by-step beginner guide, by Indrajeet Yadav:';
    var wa = document.getElementById('shareWa'); if (wa) wa.addEventListener('click', function () { window.open('https://wa.me/?text=' + encodeURIComponent(msg + ' ' + SITE), '_blank'); });
    var cp = document.getElementById('shareCopy'); if (cp) cp.addEventListener('click', function () { copyText(SITE, this, 'Link copied - send it to a teacher or student!'); });
    var more = document.getElementById('shareMore'); if (more && navigator.share) { more.hidden = false; more.addEventListener('click', function () { navigator.share({ title: 'Maths Prompt Studio', text: msg, url: SITE }).catch(function () {}); }); }
    var link = document.getElementById('shareLink'); if (link) link.textContent = SITE;
  }
  function initAbout() { var a = document.getElementById('aboutAvatar'); if (a && CFG.photoUrl) { a.style.backgroundImage = 'url(' + CFG.photoUrl + ')'; a.style.backgroundSize = 'cover'; a.style.backgroundPosition = 'center'; a.textContent = ''; } }
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
    initTheme(); initTabs(); renderLearn(); initFeedback(); initShare(); initAbout(); initReveal();
    if (!DATA.length) { document.getElementById('catStream').innerHTML = '<div class="no-results">The library is still being prepared. Please refresh in a moment.</div>'; return; }
    setStats(); buildChips(); wireStream(); render(); initSearch();
    document.querySelectorAll('#modal [data-close]').forEach(function (x) { x.addEventListener('click', closeModal); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
