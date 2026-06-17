/* ============================================================
   Maths Prompt Studio v3 - by Indrajeet Yadav
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.MPS_CONFIG || { email: 'vandanay2012@gmail.com', googleFormUrl: '', whatsapp: '', photoUrl: '' };
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

  var state = { group: 'all', query: '' };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }

  /* ---------- copy + toast ---------- */
  var toastT;
  function showToast(msg) { var t = document.getElementById('toast'); if (!t) return; if (msg) t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2600); }
  function legacyCopy(text) { var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); }
  function copyText(text, btn, okMsg) {
    var done = function () { if (btn) { var o = btn.innerHTML; btn.innerHTML = '&#10003; Copied!'; btn.classList.add('done'); setTimeout(function () { btn.innerHTML = o; btn.classList.remove('done'); }, 1900); } showToast(okMsg); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text); done(); }); else { legacyCopy(text); done(); }
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

  /* ---------- reliability + cards ---------- */
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
    return '<article class="card" data-id="' + p._id + '"><div class="card-tags"><span class="tag tag-cat">' + esc(p._catTitle) + '</span>' + tagChip(p) + '</div>' +
      '<h4>' + esc(p.title) + '</h4><p class="card-what">' + esc(p.whatYouGet) + '</p>' +
      '<div class="card-rel">' + relBadge(p) + '</div>' +
      '<div class="card-actions"><button class="btn-copy" data-copy="' + p._id + '">&#128203; Copy prompt</button><button class="btn-view" data-view="' + p._id + '">How to use</button></div></article>';
  }
  function matches(p) {
    if (state.group !== 'all' && p._group !== state.group) return false;
    if (state.query) { var q = state.query.toLowerCase(); var hay = (p.title + ' ' + p.whatYouGet + ' ' + p._catTitle + ' ' + p._group + ' ' + (p.howToUse || '') + ' ' + p.promptText).toLowerCase(); if (hay.indexOf(q) === -1) return false; }
    return true;
  }
  function render() {
    var stream = document.getElementById('catStream'); if (!stream) return; stream.innerHTML = ''; var any = false;
    GROUPS.forEach(function (g) {
      if (state.group !== 'all' && state.group !== g) return;
      var catsIn = DATA.filter(function (c) { return c.group === g; });
      if (!catsIn.some(function (c) { return (c.prompts || []).some(matches); })) return;
      stream.appendChild(el('<div class="group-head"><h3>' + esc(g) + '</h3></div>'));
      catsIn.forEach(function (cat) {
        var prompts = (cat.prompts || []).filter(matches); if (!prompts.length) return; any = true;
        var block = el('<section class="cat-block" id="cat-' + cat.category + '"></section>');
        block.appendChild(el('<div class="cat-block-head"><span class="cat-ic">' + (cat.categoryIcon || '') + '</span><h3>' + esc(cat.categoryTitle) + '</h3><span class="cat-count">' + prompts.length + ' prompts</span></div>'));
        if (cat.categoryBlurb) block.appendChild(el('<p class="cat-blurb">' + esc(cat.categoryBlurb) + '</p>'));
        var grid = el('<div class="cards"></div>'); prompts.forEach(function (p) { grid.appendChild(el(cardHTML(p))); }); block.appendChild(grid); stream.appendChild(block);
      });
    });
    if (!any) stream.appendChild(el('<div class="no-results">No prompts match &ldquo;' + esc(state.query) + '&rdquo;. Try another word, or tap All.</div>'));
    wireCards();
  }
  function findPrompt(id) { for (var i = 0; i < ALL.length; i++) if (ALL[i]._id === id) return ALL[i]; return null; }
  function wireCards() {
    document.querySelectorAll('[data-copy]').forEach(function (b) { b.addEventListener('click', function () { var p = findPrompt(b.getAttribute('data-copy')); if (p) copyText(p.promptText, b); }); });
    document.querySelectorAll('[data-view]').forEach(function (b) { b.addEventListener('click', function () { openModal(findPrompt(b.getAttribute('data-view'))); }); });
  }

  /* ---------- modal ---------- */
  function openModal(p) {
    if (!p) return;
    var steps = (p.effectiveUsage && p.effectiveUsage.length) ? '<div class="modal-eff"><h4>&#9989; How to use this effectively</h4><ol>' + p.effectiveUsage.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>' : '';
    var fix = p.commonFix ? '<div class="modal-fix"><b>&#128295; If it is not right, reply with this:</b> ' + esc(p.commonFix) + '</div>' : '';
    var body = document.getElementById('modalBody');
    body.innerHTML = '<h3 id="modalTitle">' + esc(p.title) + '</h3><div class="modal-tags"><span class="tag tag-cat">' + esc(p._catTitle) + '</span>' + tagChip(p) + '</div>' +
      '<div class="card-rel" style="margin:0 0 14px">' + relBadge(p) + ' &nbsp;&middot;&nbsp; <span class="rel">Best tool: <b>&nbsp;' + esc(p.bestTool || 'Any AI chat') + '</b></span></div>' + steps + fix +
      '<div style="font-size:12px;font-weight:800;letter-spacing:.08em;color:var(--gold);margin-bottom:6px">COPY EVERYTHING BELOW INTO YOUR AI CHAT</div>' +
      '<div class="prompt-box"><pre>' + esc(p.promptText) + '</pre></div>' +
      '<div class="modal-actions"><button class="btn-copy" id="modalCopy">&#128203; Copy this prompt</button><button class="btn-view" data-close>Close</button></div>';
    document.getElementById('modalCopy').addEventListener('click', function () { copyText(p.promptText, this); });
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
      var c = el('<article class="learn-card"><div class="learn-top"><span class="learn-ic">' + x.ic + '</span><h3>' + esc(x.t) + '</h3></div>' +
        '<p class="learn-what">' + esc(x.w) + '</p>' +
        '<div class="learn-prompt">' + esc(x.p) + '</div>' +
        '<button class="btn-copy learn-copy">&#128203; Copy this technique</button></article>');
      c.querySelector('.learn-copy').addEventListener('click', function () { copyText(x.p, this, 'Copied! Paste it into ChatGPT or Claude.'); });
      grid.appendChild(c);
    });
  }

  /* ---------- FEEDBACK ---------- */
  function initFeedback() {
    var rating = 0;
    var stars = document.querySelectorAll('#fbStars .star');
    function paint(v) { stars.forEach(function (s) { s.classList.toggle('on', parseInt(s.getAttribute('data-v'), 10) <= v); }); }
    stars.forEach(function (s) {
      var v = parseInt(s.getAttribute('data-v'), 10);
      s.addEventListener('mouseenter', function () { paint(v); });
      s.addEventListener('click', function () { rating = v; paint(v); });
    });
    var starWrap = document.getElementById('fbStars');
    if (starWrap) starWrap.addEventListener('mouseleave', function () { paint(rating); });

    function compose() {
      var role = (document.getElementById('fbRole') || {}).value || '';
      var msg = (document.getElementById('fbMsg') || {}).value || '';
      var name = (document.getElementById('fbName') || {}).value || '';
      var subject = 'Maths Prompt Studio feedback' + (rating ? ' (' + rating + '/5)' : '');
      var body = 'Rating: ' + (rating ? rating + '/5' : '-') + '\nRole: ' + role + '\nName: ' + (name || '-') + '\n\nFeedback:\n' + (msg || '(none)') + '\n\n--\nSent from Maths Prompt Studio';
      return { subject: subject, body: body };
    }
    var form = document.getElementById('fbForm');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var c = compose();
      if (!c.body.includes('Feedback:\n(none)') === false && !rating) { /* allow empty but nudge */ }
      window.location.href = 'mailto:' + CFG.email + '?subject=' + encodeURIComponent(c.subject) + '&body=' + encodeURIComponent(c.body);
      var h = document.getElementById('fbHint'); if (h) h.textContent = 'Your email app should have opened with everything filled in - just press send. Thank you!';
    });
    var copyBtn = document.getElementById('fbCopy');
    if (copyBtn) copyBtn.addEventListener('click', function () { var c = compose(); copyText(c.body, this, 'Feedback copied - paste it wherever you like.'); });

    // direct links
    var emailLink = document.getElementById('fbEmailLink');
    if (emailLink) emailLink.href = 'mailto:' + CFG.email + '?subject=' + encodeURIComponent('Maths Prompt Studio feedback');
    var formLink = document.getElementById('fbFormLink');
    if (formLink && CFG.googleFormUrl) { formLink.href = CFG.googleFormUrl; formLink.hidden = false; }
    var wa = document.getElementById('fbWaLink');
    if (wa && CFG.whatsapp) { wa.href = 'https://wa.me/' + String(CFG.whatsapp).replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent('Hi Indrajeet, feedback on Maths Prompt Studio: '); wa.hidden = false; }
    var insta = document.getElementById('fbInstaLink');
    if (insta && CFG.instagram) { insta.href = 'https://instagram.com/' + String(CFG.instagram).replace(/^@/, ''); insta.hidden = false; }
  }

  /* ---------- SHARE ---------- */
  function initShare() {
    var msg = 'Free AI tool for maths teachers and students - 500+ ready prompts + a step-by-step beginner guide, by Indrajeet Yadav:';
    var wa = document.getElementById('shareWa');
    if (wa) wa.addEventListener('click', function () { window.open('https://wa.me/?text=' + encodeURIComponent(msg + ' ' + SITE), '_blank'); });
    var cp = document.getElementById('shareCopy');
    if (cp) cp.addEventListener('click', function () { copyText(SITE, this, 'Link copied - send it to a teacher or student!'); });
    var more = document.getElementById('shareMore');
    if (more && navigator.share) { more.hidden = false; more.addEventListener('click', function () { navigator.share({ title: 'Maths Prompt Studio', text: msg, url: SITE }).catch(function () {}); }); }
    var link = document.getElementById('shareLink'); if (link) link.textContent = SITE;
  }

  /* ---------- about photo ---------- */
  function initAbout() { var a = document.getElementById('aboutAvatar'); if (a && CFG.photoUrl) { a.style.backgroundImage = 'url(' + CFG.photoUrl + ')'; a.style.backgroundSize = 'cover'; a.style.backgroundPosition = 'center'; a.textContent = ''; } }

  /* ---------- tabs ---------- */
  function initTabs() {
    document.querySelectorAll('.tabs').forEach(function (set) {
      set.querySelectorAll('.tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
          var name = tab.getAttribute('data-tab');
          set.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); }); tab.classList.add('active');
          set.parentElement.querySelectorAll('.tabpane').forEach(function (pane) { pane.classList.toggle('active', pane.getAttribute('data-pane') === name); });
        });
      });
    });
  }

  /* ---------- reveal on scroll ---------- */
  function initReveal() {
    var els = document.querySelectorAll('.reveal'); if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (ents) { ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold: 0.12 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- theme ---------- */
  function initTheme() {
    var saved = null; try { saved = localStorage.getItem('mps-theme'); } catch (e) {}
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    var btn = document.getElementById('themeBtn');
    function sync() { btn.innerHTML = document.documentElement.getAttribute('data-theme') === 'dark' ? '&#9728;' : '&#9790;'; }
    sync();
    btn.addEventListener('click', function () { var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', next); try { localStorage.setItem('mps-theme', next); } catch (e) {} sync(); });
  }

  function init() {
    document.getElementById('year').textContent = new Date().getFullYear();
    initTheme(); initTabs(); renderLearn(); initFeedback(); initShare(); initAbout(); initReveal();
    if (!DATA.length) { document.getElementById('catStream').innerHTML = '<div class="no-results">The library is still being prepared. Please refresh in a moment.</div>'; return; }
    setStats(); buildChips(); render();
    var s = document.getElementById('search'); var deb;
    s.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(function () { state.query = s.value.trim(); render(); }, 160); });
    document.querySelectorAll('#modal [data-close]').forEach(function (x) { x.addEventListener('click', closeModal); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
