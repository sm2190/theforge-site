/**
 * THE FORGE: clickjacking guard.
 *
 * GitHub Pages cannot send the X-Frame-Options or CSP frame-ancestors
 * headers, and frame-ancestors is ignored inside a <meta> CSP. So no header
 * stops another site from loading these pages in a hidden iframe and tricking
 * a visitor into clicking (the waitlist form, the delete-account page).
 *
 * If this page is framed by another origin, hide it and try to break out to
 * the top window. Hiding happens first, so even a sandboxed frame that blocks
 * top navigation shows nothing clickable.
 *
 * Load it first in <head>, without defer. Remove it once the site moves to a
 * host that sends `Content-Security-Policy: frame-ancestors 'none'`.
 */
(function () {
  'use strict';
  if (window.self === window.top) return;
  document.documentElement.style.display = 'none';
  try {
    window.top.location.replace(window.self.location.href);
  } catch (e) {
    /* top navigation blocked (sandboxed frame): the page stays hidden */
  }
})();

/**
 * THE FORGE: maintenance switch.
 *
 * Every page loads this file first, so one line locks the whole site:
 * set MAINTENANCE to true and push. Flip it with the tool in
 * Desktop\Forge Automations\site-maintenance (ON / OFF), not by hand.
 * It hides the page before anything shows and replaces it with a short
 * notice. Pages people need whatever happens stay open: the two pages a
 * payment or a verification link lands on, and the legal and support pages
 * the app stores require to be reachable.
 * It is a front door lock only: the apps and the backend keep running.
 */
(function () {
  'use strict';
  var MAINTENANCE = false;
  var OPEN = /^\/(welcome|verify|privacy|terms|delete-account|support|accessibility)(\/|$)/;
  if (!MAINTENANCE || OPEN.test(location.pathname)) return;
  var root = document.documentElement;
  root.style.visibility = 'hidden';
  function show() {
    document.title = 'The Forge: back shortly';
    document.body.innerHTML =
      '<main style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0A0A0A;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;padding:32px;text-align:center">' +
      '<div style="max-width:440px">' +
      '<p style="color:#FACC15;font-weight:800;letter-spacing:4px;font-size:12px;margin:0 0 14px">THE FORGE</p>' +
      '<h1 style="font-size:34px;line-height:1.1;margin:0 0 16px">Back shortly.</h1>' +
      '<p style="color:#A3A3A3;font-size:16px;line-height:1.6;margin:0 0 12px">The website is closed for maintenance for a short while. The app keeps working, and your account, your streak and your membership are safe.</p>' +
      '<p style="color:#A3A3A3;font-size:14px;line-height:1.6;margin:0">Need something now? Email theforgemaster1@proton.me</p>' +
      '</div></main>';
    document.body.style.margin = '0';
    root.style.visibility = 'visible';
  }
  if (document.body) show();
  else document.addEventListener('DOMContentLoaded', show);
})();
