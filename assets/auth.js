/* THE FORGE: web sign-up (Google / Apple through Supabase Auth).
   Needs the pinned supabase-js UMD build loaded first. Exposes window.ForgeAuth.
   Public values only: the project URL and the publishable key ship to every
   browser by design; row-level security is what protects the data. */
(function () {
  'use strict';
  var SB_URL = 'https://hlvcjroskewmoxsxwksg.supabase.co';
  var SB_KEY = 'sb_publishable_yirT83I5CFpR3RHWdbwweA_6UlklZPT';
  // Flip to true once Apple "Sign in with Apple" is configured for the web in
  // Supabase (Services ID + secret key). Until then the Apple button explains
  // and points to the app instead of sending the visitor to an error page.
  var APPLE_WEB_READY = false;
  var sb = null;

  function ss(k, v) {
    try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) {}
    return null;
  }
  function client() {
    if (sb) return sb;
    if (!window.supabase || !window.supabase.createClient) return null;
    sb = window.supabase.createClient(SB_URL, SB_KEY, {
      auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
    });
    return sb;
  }
  // URL params are attacker-controlled: clamp to what the waitlist table accepts.
  function attribution() {
    var p = new URLSearchParams(location.search);
    var src = (p.get('src') || p.get('utm_source') || '').replace(/[^\w.-]/g, '').slice(0, 30);
    var ref = (p.get('ref') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 40);
    if (src) ss('forge_src', src);
    if (ref) ss('forge_ref', ref);
    return { src: ss('forge_src') || '', ref: ss('forge_ref') || '' };
  }
  attribution();

  function signIn(provider) {
    var c = client();
    if (!c) return Promise.resolve({ error: 'unavailable' });
    if (provider === 'apple' && !APPLE_WEB_READY) return Promise.resolve({ appleUnavailable: true });
    attribution();
    return c.auth.signInWithOAuth({
      provider: provider,
      options: { redirectTo: location.origin + location.pathname }
    }).then(function (r) { return r.error ? { error: r.error.message } : {}; });
  }
  function getUser() {
    var c = client();
    if (!c) return Promise.resolve(null);
    return c.auth.getSession().then(function (r) {
      var s = r && r.data && r.data.session;
      if (/[?&]code=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);
      return s ? s.user : null;
    }).catch(function () { return null; });
  }
  function signOut() {
    var c = client();
    return (c ? c.auth.signOut() : Promise.resolve()).then(function () { location.reload(); });
  }
  function provider(user) {
    var p = user && user.app_metadata && user.app_metadata.provider;
    return /^[a-z]{2,12}$/.test(p || '') ? p : 'oauth';
  }
  // Keep the email in the existing waitlist table so nothing downstream breaks.
  // Anonymous key on purpose: that is the role the table's insert policy allows.
  function recordWaitlist(user) {
    if (!user || !user.email) return;
    var key = 'forge_wl_' + user.id, done = null;
    try { done = localStorage.getItem(key); } catch (e) {}
    if (done) return;
    var a = attribution();
    var source = ['signup', provider(user), a.src].filter(Boolean).join('-').slice(0, 60);
    fetch(SB_URL + '/rest/v1/waitlist', {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, source: source, ref_code: a.ref || null })
    }).then(function (r) {
      if (r.ok || r.status === 201 || r.status === 409) { try { localStorage.setItem(key, '1'); } catch (e) {} }
    }).catch(function () {});
  }
  // Gift queue length. The RPC is members-only (signed in), so this is shown
  // after sign-in; it returns counters, no personal data.
  function giftQueue() {
    var c = client();
    if (!c) return Promise.resolve(null);
    return c.rpc('sponsorship_pool_stats').then(function (r) {
      var row = r && r.data && (Array.isArray(r.data) ? r.data[0] : r.data);
      return row && typeof row.waitlist_count === 'number' ? row.waitlist_count : null;
    }).catch(function () { return null; });
  }
  function flash(el, text, kind) {
    if (!el) return;
    el.className = 'wl-note ' + (kind || '');
    el.textContent = text;
  }
  // Wire every [data-provider] button inside root; msgEl shows errors.
  function wireButtons(root, msgEl) {
    root.querySelectorAll('[data-provider]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.getAttribute('data-provider');
        if (window.forgeTrack) window.forgeTrack('signup_click', p);
        signIn(p).then(function (r) {
          if (r.appleUnavailable) flash(msgEl, 'Apple sign-up on the web opens soon. Use Google here, or download the app and choose Sign in with Apple there.', 'err');
          else if (r.error) flash(msgEl, 'Could not start sign-in. Try again in a minute.', 'err');
        });
      });
    });
  }

  window.ForgeAuth = {
    SB_URL: SB_URL, SB_KEY: SB_KEY, client: client, signIn: signIn, getUser: getUser,
    signOut: signOut, recordWaitlist: recordWaitlist, giftQueue: giftQueue,
    wireButtons: wireButtons, flash: flash, attribution: attribution
  };
})();
