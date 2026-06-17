/* ============================================================
   Maths Prompt Studio - by Indrajeet Yadav
   Renders the prompt library, search, filter, copy and modal.
   ============================================================ */
(function () {
  'use strict';

  var DATA = (window.PROMPT_DATA && window.PROMPT_DATA.categories) || [];
  var ALL = [];
  DATA.forEach(function (cat) {
    (cat.prompts || []).forEach(function (p, i) {
      p._cat = cat.category;
      p._catTitle = cat.categoryTitle;
      p._id = cat.category + '-' + i;
      ALL.push(p);
    });
  });

  var state = { filter: 'all', query: '' };

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }

  /* ---------- stats ---------- */
  function setStats() {
    var nP = ALL.length, nC = DATA.length;
    var styleCat = DATA.find(function (c) { return c.category === 'handwritten-styles'; });
    var nS = styleCat ? styleCat.prompts.length : 18;
    var map = { prompts: nP + '+', cats: nC, styles: nS };
    document.querySelectorAll('[data-stat]').forEach(function (n) {
      var k = n.getAttribute('data-stat'); if (map[k] != null) n.textContent = map[k];
    });
  }

  /* ---------- filter chips ---------- */
  function buildChips() {
    var wrap = document.getElementById('filterChips');
    if (!wrap) return;
    wrap.innerHTML = '';
    var chips = [{ id: 'all', title: 'All prompts', icon: '&#10022;', ct: ALL.length }];
    DATA.forEach(function (c) {
      chips.push({ id: c.category, title: c.categoryTitle, icon: c.categoryIcon, ct: (c.prompts || []).length });
    });
    chips.forEach(function (c) {
      var b = el('<button class="fchip' + (c.id === state.filter ? ' active' : '') + '" data-filter="' + c.id + '">' +
        '<span>' + c.icon + '</span><span>' + esc(c.title) + '</span><span class="fchip-ct">' + c.ct + '</span></button>');
      b.addEventListener('click', function () {
        state.filter = c.id;
        document.querySelectorAll('.fchip').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        render();
        if (c.id !== 'all') {
          var t = document.getElementById('cat-' + c.id);
          if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          document.getElementById('library').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      wrap.appendChild(b);
    });
  }

  /* ---------- card ---------- */
  function cardHTML(p) {
    var tags = '<span class="tag tag-cat">' + esc(p._catTitle) + '</span>';
    tags += p.needsImage
      ? '<span class="tag tag-img">&#128247; ' + esc(p.tag || 'Photo needed') + '</span>'
      : '<span class="tag tag-txt">' + esc(p.tag || 'Text only') + '</span>';
    return '<article class="card" data-id="' + p._id + '">' +
      '<div class="card-tags">' + tags + '</div>' +
      '<h4>' + esc(p.title) + '</h4>' +
      '<p class="card-what">' + esc(p.whatYouGet) + '</p>' +
      '<div class="card-meta">&#128161; Best tool: <b>' + esc(p.bestTool || 'Any AI chat') + '</b></div>' +
      '<div class="card-actions">' +
      '<button class="btn-copy" data-copy="' + p._id + '">&#128203; Copy prompt</button>' +
      '<button class="btn-view" data-view="' + p._id + '">View</button>' +
      '</div></article>';
  }

  /* ---------- render ---------- */
  function matches(p) {
    if (state.filter !== 'all' && p._cat !== state.filter) return false;
    if (state.query) {
      var q = state.query.toLowerCase();
      var hay = (p.title + ' ' + p.whatYouGet + ' ' + p._catTitle + ' ' + (p.howToUse || '') + ' ' + p.promptText).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function render() {
    var stream = document.getElementById('catStream');
    if (!stream) return;
    stream.innerHTML = '';
    var any = false;

    DATA.forEach(function (cat) {
      var prompts = (cat.prompts || []).filter(matches);
      if (!prompts.length) return;
      any = true;
      var block = el('<section class="cat-block" id="cat-' + cat.category + '"></section>');
      block.appendChild(el('<div class="cat-block-head"><span class="cat-ic">' + cat.categoryIcon + '</span>' +
        '<h3>' + esc(cat.categoryTitle) + '</h3><span class="cat-count">' + prompts.length + ' prompts</span></div>'));
      if (cat.categoryBlurb) block.appendChild(el('<p class="cat-blurb">' + esc(cat.categoryBlurb) + '</p>'));
      var grid = el('<div class="cards"></div>');
      prompts.forEach(function (p) { grid.appendChild(el(cardHTML(p))); });
      block.appendChild(grid);
      stream.appendChild(block);
    });

    if (!any) stream.appendChild(el('<div class="no-results">No prompts match &ldquo;' + esc(state.query) + '&rdquo;. Try another word, or clear the search.</div>'));
    wireCards();
  }

  /* ---------- copy ---------- */
  function copyText(text, btn) {
    var done = function () {
      if (btn) { var o = btn.innerHTML; btn.innerHTML = '&#10003; Copied!'; btn.classList.add('done'); setTimeout(function () { btn.innerHTML = o; btn.classList.remove('done'); }, 1900); }
      showToast();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text); done(); });
    } else { legacyCopy(text); done(); }
  }
  function legacyCopy(text) {
    var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }
  var toastT;
  function showToast() {
    var t = document.getElementById('toast'); if (!t) return;
    t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  function findPrompt(id) { for (var i = 0; i < ALL.length; i++) if (ALL[i]._id === id) return ALL[i]; return null; }

  function wireCards() {
    document.querySelectorAll('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () { var p = findPrompt(b.getAttribute('data-copy')); if (p) copyText(p.promptText, b); });
    });
    document.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () { openModal(findPrompt(b.getAttribute('data-view'))); });
    });
  }

  /* ---------- modal ---------- */
  function openModal(p) {
    if (!p) return;
    var body = document.getElementById('modalBody');
    var tags = '<span class="tag tag-cat">' + esc(p._catTitle) + '</span>' +
      (p.needsImage ? '<span class="tag tag-img">&#128247; ' + esc(p.tag || 'Photo needed') + '</span>'
        : '<span class="tag tag-txt">' + esc(p.tag || 'Text only') + '</span>');
    body.innerHTML =
      '<h3 id="modalTitle">' + esc(p.title) + '</h3>' +
      '<div class="modal-tags">' + tags + '</div>' +
      '<div class="modal-how"><b>How to use this one:</b> ' + esc(p.howToUse || 'Copy the prompt below and paste it into your AI chat.') +
      (p.needsImage ? ' <em>First attach a clear photo of the question, then paste.</em>' : '') +
      ' &nbsp;Best tool: <b>' + esc(p.bestTool || 'Any AI chat') + '</b>.</div>' +
      '<div class="prompt-box"><pre>' + esc(p.promptText) + '</pre></div>' +
      '<div class="modal-actions">' +
      '<button class="btn-copy" id="modalCopy">&#128203; Copy this prompt</button>' +
      '<button class="btn-view" data-close>Close</button></div>';
    document.getElementById('modalCopy').addEventListener('click', function () { copyText(p.promptText, this); });
    body.querySelectorAll('[data-close]').forEach(function (x) { x.addEventListener('click', closeModal); });
    var m = document.getElementById('modal'); m.classList.add('open'); m.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    var m = document.getElementById('modal'); m.classList.remove('open'); m.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* ---------- theme ---------- */
  function initTheme() {
    var saved = null; try { saved = localStorage.getItem('mps-theme'); } catch (e) {}
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    var btn = document.getElementById('themeBtn');
    function sync() { btn.innerHTML = document.documentElement.getAttribute('data-theme') === 'dark' ? '&#9728;' : '&#9790;'; }
    sync();
    btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('mps-theme', next); } catch (e) {}
      sync();
    });
  }

  /* ---------- downloads availability ---------- */
  function checkDownloads() {
    [['dlBook', 'downloads/Maths-Prompt-Studio-by-Indrajeet-Yadav.pdf'],
     ['dlGuide', 'downloads/Quick-Start-Guide-by-Indrajeet-Yadav.pdf'],
     ['dlDoc', 'downloads/Maths-Prompt-Studio-by-Indrajeet-Yadav.docx']].forEach(function (pair) {
      var node = document.getElementById(pair[0]); if (!node) return;
      fetch(pair[1], { method: 'HEAD' }).then(function (r) { if (!r.ok) node.classList.add('disabled'); }).catch(function () { node.classList.add('disabled'); });
    });
  }

  /* ---------- init ---------- */
  function init() {
    document.getElementById('year').textContent = new Date().getFullYear();
    initTheme();
    if (!DATA.length) { document.getElementById('catStream').innerHTML = '<div class="no-results">The library is still being prepared. Please refresh in a moment.</div>'; return; }
    setStats();
    buildChips();
    render();
    var s = document.getElementById('search');
    var deb;
    s.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(function () { state.query = s.value.trim(); render(); }, 140); });
    document.querySelectorAll('#modal [data-close]').forEach(function (x) { x.addEventListener('click', closeModal); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    checkDownloads();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
