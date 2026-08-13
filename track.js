/**
 * THE FORGE: first-party site analytics.
 *
 * Answers: how many people land, where they came from, how far they scroll,
 * which sections they actually see, what they click, and where they drop out
 * of the waitlist funnel.
 *
 * Privacy: no cookies, no IP logging, no cross-site identifiers, no third
 * party. The session id is a random string held in sessionStorage, so it dies
 * when the tab closes and cannot follow anyone anywhere. Only the referrer's
 * HOST is stored, never the full URL.
 *
 * Usage:
 *   <script src="/track.js" defer></script>
 *   add data-track="some_label" to any element you want click-tracked
 *   add data-section="some_label" to any section you want view-tracked
 *   call window.forgeTrack('event', 'label') for custom events
 */
(function () {
  'use strict';

  var SB  = 'https://hlvcjroskewmoxsxwksg.supabase.co';
  var KEY = 'sb_publishable_yirT83I5CFpR3RHWdbwweA_6UlklZPT';
  var ENDPOINT = SB + '/rest/v1/site_events';

  // Respect an explicit Do Not Track signal.
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

  // ── session id: random, per-tab, non-persistent ──────────────────────────
  var sid;
  try {
    sid = sessionStorage.getItem('fg_sid');
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('fg_sid', sid);
    }
  } catch (e) {
    sid = 'nostore' + Date.now().toString(36);
  }

  var params = new URLSearchParams(location.search);
  var source = params.get('src') || params.get('utm_source') || null;

  var refHost = null;
  try {
    if (document.referrer) {
      var h = new URL(document.referrer).hostname;
      if (h && h !== location.hostname) refHost = h;
    }
  } catch (e) { /* malformed referrer, ignore */ }

  function send(event, label) {
    var body = JSON.stringify({
      session_id: sid,
      event: event,
      path: location.pathname,
      label: label || null,
      source: source,
      referrer: refHost,
      viewport_w: window.innerWidth || null
    });
    // NOT sendBeacon: it always sends with credentials mode "include", and
    // Supabase answers preflight with Access-Control-Allow-Origin: *, which
    // the browser rejects in that mode. fetch with keepalive survives page
    // unload just the same and sends same-origin credentials, so CORS passes.
    fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: 'Bearer ' + KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: body,
      keepalive: true,
      mode: 'cors',
      credentials: 'omit'
    }).catch(function () {});
  }

  window.forgeTrack = send;

  // ── 1. pageview ──────────────────────────────────────────────────────────
  send('pageview', document.title ? document.title.slice(0, 80) : null);

  // ── 2. section views (what they actually looked at) ──────────────────────
  var seen = {};
  function watchSections() {
    var nodes = document.querySelectorAll('[data-section], section[id]');
    if (!nodes.length || !window.IntersectionObserver) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var name = el.getAttribute('data-section') || el.id;
        if (!name || seen[name]) return;
        seen[name] = 1;
        send('section_view', name);
        io.unobserve(el);
      });
    }, { threshold: 0.4 });
    nodes.forEach(function (n) { io.observe(n); });
  }

  // ── 3. clicks (anything tagged, plus every link) ─────────────────────────
  document.addEventListener('click', function (ev) {
    var el = ev.target && ev.target.closest ? ev.target.closest('[data-track], a, button') : null;
    if (!el) return;
    var label = el.getAttribute('data-track');
    if (!label) {
      if (el.tagName === 'A') {
        var href = el.getAttribute('href') || '';
        var external = /^https?:\/\//.test(href) && href.indexOf(location.hostname) === -1;
        label = (external ? 'out:' : 'link:') + href.slice(0, 60);
      } else {
        label = (el.textContent || 'button').trim().slice(0, 40);
      }
    }
    send('click', label);
  }, true);

  // ── 4. scroll depth ──────────────────────────────────────────────────────
  var marks = [25, 50, 75, 100], hit = {};
  function onScroll() {
    var doc = document.documentElement;
    var max = (doc.scrollHeight - window.innerHeight);
    if (max <= 0) return;
    var pct = Math.min(100, Math.round((window.scrollY / max) * 100));
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      if (pct >= m && !hit[m]) { hit[m] = 1; send('scroll', m + '%'); }
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // ── 5. time on page (sent once, on the way out) ──────────────────────────
  var t0 = Date.now(), sentExit = false;
  function onExit() {
    if (sentExit) return;
    sentExit = true;
    var secs = Math.round((Date.now() - t0) / 1000);
    var bucket = secs < 5 ? '0-5s' : secs < 15 ? '5-15s' : secs < 30 ? '15-30s'
               : secs < 60 ? '30-60s' : secs < 180 ? '1-3m' : '3m+';
    send('exit', bucket);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') onExit();
  });
  window.addEventListener('pagehide', onExit);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchSections);
  } else {
    watchSections();
  }
})();
