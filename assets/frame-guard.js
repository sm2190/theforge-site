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
