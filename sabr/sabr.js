// THE FORGE: The Sabr Fort. Everything the reader writes stays in their own
// browser (localStorage). Nothing typed here is ever sent anywhere, and no
// user text is ever written as HTML: only textContent / value.
(function () {
  'use strict';
  var KEY = 'forge-sabr-v1';
  var SB_URL = 'https://hlvcjroskewmoxsxwksg.supabase.co';
  var SB_KEY = 'sb_publishable_yirT83I5CFpR3RHWdbwweA_6UlklZPT';
  var DEFAULT_SIN = 'this sin';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ── Storage (best effort: private windows can throw) ─────────────────────
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { state = {}; }
  if (typeof state !== 'object' || Array.isArray(state)) state = {};
  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage off: fine */ }
    }, 250);
  }

  // ── Build repeated writing lines ─────────────────────────────────────────
  // <ol class="lines" data-k="w1" data-n="10" data-ph="a|b|c"> → n textareas.
  $$('ol.lines[data-k]').forEach(function (ol) {
    var n = Math.min(30, parseInt(ol.getAttribute('data-n'), 10) || 5);
    var phs = (ol.getAttribute('data-ph') || '').split('|');
    var label = ol.getAttribute('aria-label') || 'Line';
    for (var i = 0; i < n; i++) {
      var li = document.createElement('li');
      var ta = document.createElement('textarea');
      ta.className = 'fld'; ta.rows = 1; ta.maxLength = 400;
      ta.setAttribute('data-k', ol.getAttribute('data-k') + '.' + i);
      ta.setAttribute('aria-label', label + ' ' + (i + 1));
      var ph = phs[i] !== undefined && phs[i] !== '' ? phs[i] : phs[phs.length - 1];
      if (ph) ta.setAttribute('data-ph-tpl', ph);
      li.appendChild(ta);
      ol.appendChild(li);
    }
  });

  // Every field gets a print mirror (textareas do not print their overflow).
  var fields = $$('.fld[data-k]');
  fields.forEach(function (f) {
    var pv = document.createElement('div');
    pv.className = 'pv'; pv.setAttribute('aria-hidden', 'true');
    f.parentNode.insertBefore(pv, f.nextSibling);
    var k = f.getAttribute('data-k');
    if (typeof state[k] === 'string') f.value = state[k].slice(0, 2000);
    grow(f);
    f.addEventListener('input', function () {
      state[k] = f.value.slice(0, 2000);
      if (k === 'sin') paintSin();
      grow(f); save();
    });
  });
  function grow(f) {
    if (f.tagName !== 'TEXTAREA') return;
    f.style.height = 'auto';
    f.style.height = Math.min(f.scrollHeight + 2, 420) + 'px';
  }

  $$('input[type=checkbox][data-k]').forEach(function (c) {
    var k = c.getAttribute('data-k');
    c.checked = state[k] === true;
    c.addEventListener('change', function () { state[k] = c.checked; save(); });
  });

  // ── The sin's name, painted into the page and the prompts ────────────────
  function sinName() {
    var v = (state.sin || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    return v || DEFAULT_SIN;
  }
  function paintSin() {
    var s = sinName();
    $$('.sin').forEach(function (el) { el.textContent = s; });
    $$('[data-ph-tpl]').forEach(function (el) {
      el.setAttribute('placeholder', el.getAttribute('data-ph-tpl').split('{sin}').join(s));
    });
  }
  paintSin();

  // ── Reflection timers ────────────────────────────────────────────────────
  $$('[data-timer]').forEach(function (btn) {
    var out = btn.parentNode.querySelector('output');
    var total = Math.max(30, Math.min(900, parseInt(btn.getAttribute('data-timer'), 10) || 180));
    var left = total, iv = null;
    function show() {
      var m = Math.floor(left / 60), s = left % 60;
      out.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    }
    show();
    btn.addEventListener('click', function () {
      if (iv) { clearInterval(iv); iv = null; btn.textContent = 'Resume'; return; }
      if (left <= 0) left = total;
      btn.textContent = 'Pause';
      iv = setInterval(function () {
        left -= 1; show();
        if (left <= 0) {
          clearInterval(iv); iv = null; btn.textContent = 'Again';
          out.textContent = 'Done';
          if (navigator.vibrate) { try { navigator.vibrate(200); } catch (e) { /* ignore */ } }
        }
      }, 1000);
    });
  });

  // ── "Pick a wall for me" ─────────────────────────────────────────────────
  var pick = $('#pickWall');
  if (pick) pick.addEventListener('click', function () {
    var n = 1 + Math.floor(Math.random() * 10);
    var w = document.getElementById('wall-' + n);
    if (!w) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    w.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    w.classList.add('flash');
    setTimeout(function () { w.classList.remove('flash'); }, 2400);
  });

  // ── Save as PDF (print) + clear ──────────────────────────────────────────
  function syncPrint() {
    fields.forEach(function (f) {
      var pv = f.nextSibling;
      if (pv && pv.className === 'pv') pv.textContent = f.value;
    });
  }
  window.addEventListener('beforeprint', syncPrint);
  $$('[data-print]').forEach(function (b) {
    b.addEventListener('click', function () { syncPrint(); window.print(); });
  });
  var clear = $('#clearAll');
  if (clear) clear.addEventListener('click', function () {
    if (!window.confirm('Erase everything you wrote on this page? This cannot be undone.')) return;
    state = {};
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    fields.forEach(function (f) { f.value = ''; grow(f); });
    $$('input[type=checkbox][data-k]').forEach(function (c) { c.checked = false; });
    paintSin();
  });

  // ── Waitlist ─────────────────────────────────────────────────────────────
  var form = $('#wlForm');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = $('#wlMsg');
    var input = $('#wlEmail');
    var email = (input.value || '').trim().slice(0, 254);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      msg.className = 'wl-note err';
      msg.textContent = 'Enter a real email. The Forge does not accept excuses.';
      return;
    }
    // URL params are attacker-controlled: clamp them to what the table accepts
    // so a long ?src= can never make a real signup fail.
    var p = new URLSearchParams(location.search);
    var source = (p.get('src') || p.get('utm_source') || 'sabr').replace(/[^\w.-]/g, '').slice(0, 60) || 'sabr';
    var ref = (p.get('ref') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 40) || null;
    var btn = form.querySelector('button');
    btn.disabled = true; btn.textContent = 'Forging…';
    fetch(SB_URL + '/rest/v1/waitlist', {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, source: source, ref_code: ref })
    }).then(function (r) {
      if (r.ok || r.status === 409) {
        msg.className = 'wl-note ok';
        msg.textContent = r.status === 409
          ? 'Already on the list. Check your inbox for the beta invite.'
          : 'You are in. Check your inbox: the beta invite is on its way.';
        form.style.display = 'none';
      } else if (r.status === 429 || r.status === 400) {
        throw new Error('rate');
      } else { throw new Error('status ' + r.status); }
    }).catch(function () {
      msg.className = 'wl-note err';
      msg.textContent = 'Something broke. Try again in a minute.';
      btn.disabled = false; btn.textContent = 'Get the beta';
    });
  });
})();
