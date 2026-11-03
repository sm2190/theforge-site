/* THE FORGE: /membership/. Iron (Stripe links), Founding 20 (application), gift. */
(function () {
  'use strict';
  var A = window.ForgeAuth;
  var $ = function (id) { return document.getElementById(id); };
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var user = null, cycle = 'monthly';

  var PLANS = {
    monthly: { iron: ['$10', '/month', 'Cancel any time from the billing portal.', 'https://buy.stripe.com/dRmeVcctxdpS3db8CZasg00'], fd: ['$20', '/month'] },
    yearly:  { iron: ['$102', '/year', '15% off $120. Cancel any time from the billing portal.', 'https://buy.stripe.com/00w28q0KP85yeVT5qNasg01'], fd: ['$240', '/year'] }
  };

  $('year').textContent = String(new Date().getFullYear());
  var tg = $('navToggle'), nl = $('navLinks');
  if (tg && nl) tg.addEventListener('click', function () { nl.classList.toggle('open'); });

  A.wireButtons($('authBtns'), $('msMsg'));

  // Price toggle
  var opts = document.querySelectorAll('.bt-opt');
  function applyCycle(c) {
    cycle = c;
    var p = PLANS[c];
    $('ironPrice').textContent = p.iron[0]; $('ironUnit').textContent = p.iron[1];
    $('ironSub').textContent = p.iron[2]; $('ironPay').href = p.iron[3];
    $('fdPrice').textContent = p.fd[0]; $('fdUnit').textContent = p.fd[1];
  }
  opts.forEach(function (o) {
    o.addEventListener('click', function () {
      opts.forEach(function (x) { x.classList.remove('active'); });
      o.classList.add('active');
      applyCycle(o.getAttribute('data-cycle'));
    });
  });

  // Payment: the Stripe link carries the account, so the membership unlocks.
  // Signed in: client_reference_id = Forge user id (the webhook's first choice)
  // plus the email. Signed out: ask for the email first, as the home page does.
  // Trial emails link here with ?u=<user id>&e=<email>, so a click from the
  // inbox pays onto the right account without signing in on the web first.
  var qp = new URLSearchParams(location.search);
  var mailUid = /^[0-9a-f-]{36}$/i.test(qp.get('u') || '') ? qp.get('u') : null;
  var mailEmail = EMAIL_RE.test(qp.get('e') || '') ? qp.get('e') : null;
  function payUrl(email) {
    var base = PLANS[cycle].iron[3];
    if (!/^https:\/\/buy\.stripe\.com\//.test(base)) return null;
    var q = [];
    var uid = (user && user.id) || mailUid;
    if (uid) q.push('client_reference_id=' + encodeURIComponent(uid));
    if (email) q.push('prefilled_email=' + encodeURIComponent(email));
    return q.length ? base + '?' + q.join('&') : base;
  }
  var pay = $('ironPay'), payForm = $('payEmail');
  pay.addEventListener('click', function (e) {
    var email = (user && user.email) || mailEmail;
    if (email) { e.preventDefault(); location.href = payUrl(email); return; }
    e.preventDefault();
    pay.style.display = 'none';
    payForm.classList.add('open');
    $('payEmailIn').focus();
  });
  payForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var em = ($('payEmailIn').value || '').trim();
    if (!EMAIL_RE.test(em) || em.length > 254) {
      payForm.querySelector('.pay-err').textContent = 'Enter the email you use to sign in to The Forge.';
      return;
    }
    var u = payUrl(em);
    if (u) location.href = u;
  });

  // Founding 20 application (signed-in only; RLS lets a user insert their own row)
  var fdForm = $('fdForm'), fdNote = $('fdNote'), fdOpen = $('fdOpen');
  fdOpen.addEventListener('click', function () {
    if (!user) {
      A.flash(fdNote, 'Sign in above first, then apply.', 'err');
      $('msSignin').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    fdOpen.style.display = 'none';
    fdForm.classList.add('open');
    $('fdName').focus();
  });
  fdForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = ($('fdName').value || '').trim().slice(0, 80);
    var message = ($('fdMsg').value || '').trim().slice(0, 1000);
    if (!name) { A.flash(fdNote, 'Add your name.', 'err'); return; }
    if (message.length < 20) { A.flash(fdNote, 'Tell us a bit more, at least 20 characters.', 'err'); return; }
    var c = A.client();
    if (!c || !user) { A.flash(fdNote, 'Sign in above first.', 'err'); return; }
    $('fdSend').disabled = true;
    c.from('founding_applications').insert({ user_id: user.id, name: name, message: message }).then(function (r) {
      if (!r.error) {
        fdForm.classList.remove('open');
        A.flash(fdNote, 'Application received. The Forge Master reads every one and replies by email.', 'ok');
        if (window.forgeTrack) window.forgeTrack('founding_apply', 'web');
      } else if (r.error.code === '23505') {
        fdForm.classList.remove('open');
        A.flash(fdNote, 'You have already applied. The Forge Master will reply by email.', 'ok');
      } else {
        $('fdSend').disabled = false;
        A.flash(fdNote, 'Something broke. Try again in a minute.', 'err');
      }
    });
  });

  // Live Founding 20 applicant count (public RPC returns a number only).
  fetch(A.SB_URL + '/rest/v1/rpc/founding_applicant_count', {
    method: 'POST', headers: { apikey: A.SB_KEY, 'Content-Type': 'application/json' }, body: '{}'
  }).then(function (r) { return r.json(); }).then(function (n) {
    if (typeof n === 'number' && n >= 1) $('fdCount').textContent = n === 1 ? '1 person has applied so far' : n + ' people have applied so far';
  }).catch(function () {});

  A.getUser().then(function (u) {
    if (!u) return;
    user = u;
    $('msSignin').hidden = true;
    var who = $('msWho');
    who.hidden = false;
    who.textContent = 'Signed in' + (u.email ? ' as ' + u.email : '') + '. ';
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'link-quiet'; b.textContent = 'Not you? Sign out';
    b.addEventListener('click', function () { A.signOut(); });
    who.appendChild(b);
    A.recordWaitlist(u);
    A.client().from('founding_applications').select('status').eq('user_id', u.id).maybeSingle().then(function (r) {
      if (r && r.data) {
        fdOpen.style.display = 'none';
        A.flash(fdNote, r.data.status === 'approved' ? 'Approved. Check your email for the next step.' : 'Application received. The Forge Master will reply by email.', 'ok');
      }
    });
    A.giftQueue().then(function (n) {
      var g = $('giftCount');
      if (typeof n === 'number' && n > 0) {
        g.textContent = n === 1 ? '1 person waiting for a gift' : n + ' people waiting for a gift';
        g.classList.add('on');
      }
    });
  });
})();
