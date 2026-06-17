/* ============================================================
   Maths Prompt Studio v2 - by Indrajeet Yadav
   ============================================================ */
(function () {
  'use strict';

  var DATA = (window.PROMPT_DATA && window.PROMPT_DATA.categories) || [];
  var GROUP_ORDER = ['Solving & Checking', 'Practice & Assessment', 'Teaching Materials', 'Writing & Content', 'Engagement', 'Support', 'Teacher Productivity'];

  var ALL = [];
  DATA.forEach(function (cat) {
    if (!cat.group) cat.group = 'More';
    (cat.prompts || []).forEach(function (p, i) {
      p._cat = cat.category; p._catTitle = cat.categoryTitle; p._group = cat.group; p._id = cat.category + '-' + i;
      ALL.push(p);
    });
  });

  // ordered groups present in data
  var GROUPS = GROUP_ORDER.filter(function (g) { return DATA.some(function (c) { return c.group === g; }); });
  DATA.forEach(function (c) { if (GROUPS.indexOf(c.group) === -1) GROUPS.push(c.group); });

  var state = { group: 'all', query: '' };

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }

  function setStats() {
    var styleCat = DATA.find(function (c) { return c.category === 'handwritten-styles'; });
    var map = { prompts: ALL.length + '+', cats: DATA.length, styles: styleCat ? styleCat.prompts.length : 18 };
    document.querySelectorAll('[data-stat]').forEach(function (n) { var k = n.getAttribute('data-stat'); if (map[k] != null) n.textContent = map[k]; });
  }

  /* ---------- group chips ---------- */
  function buildChips() {
    var wrap = document.getElementById('groupChips'); if (!wrap) return; wrap.innerHTML = '';
    var chips = [{ id: 'all', title: 'All', ct: ALL.length }];
    GROUPS.forEach(function (g) {
      var ct = DATA.filter(function (c) { return c.group === g; }).reduce(function (t, c) { return t + (c.prompts || []).length; }, 0);
      chips.push({ id: g, title: g, ct: ct });
    });
    chips.forEach(function (c) {
      var b = el('<button class="fchip' + (c.id === state.group ? ' active' : '') + '">' + esc(c.title) + ' <span class="fchip-ct">' + c.ct + '</span></button>');
      b.addEventListener('click', function () {
        state.group = c.id;
        document.querySelectorAll('#groupChips .fchip').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active'); render();
        document.getElementById('library').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      wrap.appendChild(b);
    });
  }

  /* ---------- reliability ---------- */
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
    return '<article class="card" data-id="' + p._id + '">' +
      '<div class="card-tags"><span class="tag tag-cat">' + esc(p._catTitle) + '</span>' + tagChip(p) + '</div>' +
      '<h4>' + esc(p.title) + '</h4>' +
      '<p class="card-what">' + esc(p.whatYouGet) + '</p>' +
      '<div class="card-rel">' + relBadge(p) + '</div>' +
      '<div class="card-actions">' +
      '<button class="btn-copy" data-copy="' + p._id + '">&#128203; Copy prompt</button>' +
      '<button class="btn-view" data-view="' + p._id + '">How to use</button>' +
      '</div></article>';
  }

  function matches(p) {
    if (state.group !== 'all' && p._group !== state.group) return false;
    if (state.query) {
      var q = state.query.toLowerCase();
      var hay = (p.title + ' ' + p.whatYouGet + ' ' + p._catTitle + ' ' + p._group + ' ' + (p.howToUse || '') + ' ' + p.promptText).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function render() {
    var stream = document.getElementById('catStream'); if (!stream) return;
    stream.innerHTML = ''; var any = false;

    GROUPS.forEach(function (g) {
      if (state.group !== 'all' && state.group !== g) return;
      var catsIn = DATA.filter(function (c) { return c.group === g; });
      var groupHasAny = catsIn.some(function (c) { return (c.prompts || []).some(matches); });
      if (!groupHasAny) return;
      stream.appendChild(el('<div class="group-head"><h3>' + esc(g) + '</h3></div>'));
      catsIn.forEach(function (cat) {
        var prompts = (cat.prompts || []).filter(matches);
        if (!prompts.length) return; any = true;
        var block = el('<section class="cat-block" id="cat-' + cat.category + '"></section>');
        block.appendChild(el('<div class="cat-block-head"><span class="cat-ic">' + (cat.categoryIcon || '') + '</span><h3>' + esc(cat.categoryTitle) + '</h3><span class="cat-count">' + prompts.length + ' prompts</span></div>'));
        if (cat.categoryBlurb) block.appendChild(el('<p class="cat-blurb">' + esc(cat.categoryBlurb) + '</p>'));
        var grid = el('<div class="cards"></div>');
        prompts.forEach(function (p) { grid.appendChild(el(cardHTML(p))); });
        block.appendChild(grid); stream.appendChild(block);
      });
    });

    if (!any) stream.appendChild(el('<div class="no-results">No prompts match &ldquo;' + esc(state.query) + '&rdquo;. Try another word, or tap All.</div>'));
    wireCards();
  }

  /* ---------- copy ---------- */
  function copyText(text, btn) {
    var done = function () {
      if (btn) { var o = btn.innerHTML; btn.innerHTML = '&#10003; Copied!'; btn.classList.add('done'); setTimeout(function () { btn.innerHTML = o; btn.classList.remove('done'); }, 1900); }
      showToast();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text); done(); });
    else { legacyCopy(text); done(); }
  }
  function legacyCopy(text) { var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); }
  var toastT;
  function showToast() { var t = document.getElementById('toast'); if (!t) return; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2600); }

  function findPrompt(id) { for (var i = 0; i < ALL.length; i++) if (ALL[i]._id === id) return ALL[i]; return null; }
  function wireCards() {
    document.querySelectorAll('[data-copy]').forEach(function (b) { b.addEventListener('click', function () { var p = findPrompt(b.getAttribute('data-copy')); if (p) copyText(p.promptText, b); }); });
    document.querySelectorAll('[data-view]').forEach(function (b) { b.addEventListener('click', function () { openModal(findPrompt(b.getAttribute('data-view'))); }); });
  }

  /* ---------- modal ---------- */
  function openModal(p) {
    if (!p) return;
    var steps = (p.effectiveUsage && p.effectiveUsage.length)
      ? '<div class="modal-eff"><h4>&#9989; How to use this effectively</h4><ol>' + p.effectiveUsage.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div>'
      : '';
    var fix = p.commonFix ? '<div class="modal-fix"><b>&#128295; If it is not right, reply with this:</b> ' + esc(p.commonFix) + '</div>' : '';
    var body = document.getElementById('modalBody');
    body.innerHTML =
      '<h3 id="modalTitle">' + esc(p.title) + '</h3>' +
      '<div class="modal-tags"><span class="tag tag-cat">' + esc(p._catTitle) + '</span>' + tagChip(p) + '</div>' +
      '<div class="card-rel" style="margin:0 0 14px">' + relBadge(p) + ' &nbsp;&middot;&nbsp; <span class="rel">Best tool: <b>&nbsp;' + esc(p.bestTool || 'Any AI chat') + '</b></span></div>' +
      steps + fix +
      '<div style="font-size:12px;font-weight:800;letter-spacing:.08em;color:var(--gold);margin-bottom:6px">COPY EVERYTHING BELOW INTO YOUR AI CHAT</div>' +
      '<div class="prompt-box"><pre>' + esc(p.promptText) + '</pre></div>' +
      '<div class="modal-actions"><button class="btn-copy" id="modalCopy">&#128203; Copy this prompt</button><button class="btn-view" data-close>Close</button></div>';
    document.getElementById('modalCopy').addEventListener('click', function () { copyText(p.promptText, this); });
    body.querySelectorAll('[data-close]').forEach(function (x) { x.addEventListener('click', closeModal); });
    var m = document.getElementById('modal'); m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
  }
  function closeModal() { var m = document.getElementById('modal'); m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }

  /* ---------- guide tabs ---------- */
  function initTabs() {
    document.querySelectorAll('.tabs').forEach(function (set) {
      set.querySelectorAll('.tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
          var name = tab.getAttribute('data-tab');
          set.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
          tab.classList.add('active');
          var scope = set.parentElement;
          scope.querySelectorAll('.tabpane').forEach(function (pane) {
            pane.classList.toggle('active', pane.getAttribute('data-pane') === name);
          });
        });
      });
    });
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

  function checkDownloads() {
    [['dlBook', 'downloads/Maths-Prompt-Studio-by-Indrajeet-Yadav.pdf'], ['dlGuide', 'downloads/Quick-Start-Guide-by-Indrajeet-Yadav.pdf'], ['dlDoc', 'downloads/Maths-Prompt-Studio-by-Indrajeet-Yadav.docx']].forEach(function (pair) {
      var node = document.getElementById(pair[0]); if (!node) return;
      fetch(pair[1], { method: 'HEAD' }).then(function (r) { if (!r.ok) node.classList.add('disabled'); }).catch(function () { node.classList.add('disabled'); });
    });
  }

  function init() {
    document.getElementById('year').textContent = new Date().getFullYear();
    initTheme(); initTabs();
    if (!DATA.length) { document.getElementById('catStream').innerHTML = '<div class="no-results">The library is still being prepared. Please refresh in a moment.</div>'; return; }
    setStats(); buildChips(); render();
    var s = document.getElementById('search'); var deb;
    s.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(function () { state.query = s.value.trim(); render(); }, 160); });
    document.querySelectorAll('#modal [data-close]').forEach(function (x) { x.addEventListener('click', closeModal); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    checkDownloads();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
