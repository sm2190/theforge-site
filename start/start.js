/* THE FORGE: /start/ sign-up page. Google or Apple through Supabase Auth. */
(function () {
  'use strict';
  var A = window.ForgeAuth, S = window.FORGE_STORES || {};
  var $ = function (id) { return document.getElementById(id); };
  var out = $('stOut'), inn = $('stIn'), msg = $('stMsg');

  var yr = $('year'); if (yr) yr.textContent = String(new Date().getFullYear());
  var tg = $('navToggle'), nl = $('navLinks');
  if (tg && nl) tg.addEventListener('click', function () { nl.classList.toggle('open'); });

  // Social proof from the existing public count (anonymous RPC).
  fetch(A.SB_URL + '/rest/v1/rpc/waitlist_count', {
    method: 'POST', headers: { apikey: A.SB_KEY, 'Content-Type': 'application/json' }, body: '{}'
  }).then(function (r) { return r.json(); }).then(function (n) {
    var el = document.querySelector('[data-wlcount]');
    if (el && typeof n === 'number' && n >= 25) el.textContent = n + ' people have already signed up.';
  }).catch(function () {});

  A.wireButtons($('authBtns'), msg);

  function storeLinks() {
    var ref = (A.attribution().ref || '').slice(0, 8);
    var android = $('androidBtn'), ios = $('iosBtn');
    var play = S.androidLive ? S.androidStoreUrl : S.androidBetaUrl;
    // Play Install Referrer keeps an invite code through the install.
    if (S.androidLive && ref) play += '&referrer=' + encodeURIComponent('ref=' + ref);
    if (play) android.href = play;
    if (S.iosLive && S.iosUrl) ios.href = S.iosUrl;
  }

  A.getUser().then(function (user) {
    if (!user) return;
    out.hidden = true; inn.hidden = false;
    storeLinks();
    A.recordWaitlist(user);
    if (window.forgeTrack) window.forgeTrack('signup_done', (user.app_metadata && user.app_metadata.provider) || 'oauth');
    A.giftQueue().then(function (n) {
      var g = $('giftCount');
      if (typeof n === 'number' && n > 0) {
        g.textContent = n === 1 ? '1 person waiting for a gift' : n + ' people waiting for a gift';
        g.classList.add('on');
      }
    });
    $('signOut').addEventListener('click', function () { A.signOut(); });
  });
})();
