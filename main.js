/* THE FORGE: site interactions (vanilla, no dependencies) */
(function () {
  'use strict';

  // ── Duplicate the marquee track so the scroll loops seamlessly ──
  var marquee = document.getElementById('marquee');
  if (marquee) marquee.innerHTML += marquee.innerHTML;

  // ── Mobile nav toggle ──────────────────────────────────────────
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('open'); });
    });
  }

  // ── Footer year ────────────────────────────────────────────────
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ── "90 days from today" date on the closing CTA ───────────────
  var dateEl = document.getElementById('resetDate');
  if (dateEl) {
    var d = new Date();
    d.setDate(d.getDate() + 90);
    var fmt = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    dateEl.textContent = "You'll be different by " + fmt;
  }

  // ── Embers on the closing CTA ──────────────────────────────────
  var cta = document.querySelector('.cta');
  if (cta && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (var i = 0; i < 7; i++) {
      var e = document.createElement('span');
      e.className = 'ember';
      e.style.left = (10 + i * 13) + '%';
      e.style.animationDuration = (4.5 + (i % 4) * 0.9) + 's';
      e.style.animationDelay = (i * 0.7) + 's';
      cta.appendChild(e);
    }
  }

  // ── Scroll-reveal via IntersectionObserver ─────────────────────
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  // ── Pricing: monthly / yearly toggle ───────────────────────────
  var PRICING = {
    monthly: {
      iron:     { price: '$10', unit: '/month', sub: '14-day free trial in-app, then $10/mo.', pay: 'https://buy.stripe.com/dRmeVcctxdpS3db8CZasg00' },
      founding: { price: '$20', unit: '/month', sub: 'Locked in forever. The price disappears when the cohort closes.' }
    },
    yearly: {
      iron:     { price: '$102', unit: '/year', sub: '15% off $120. 14-day free trial in-app.', pay: 'https://buy.stripe.com/00w28q0KP85yeVT5qNasg01' },
      founding: { price: '$240', unit: '/year', sub: 'Year-long contract, pay in full or monthly. Locked in forever.' }
    }
  };
  function applyCycle(cycle) {
    var d = PRICING[cycle];
    if (!d) return;
    ['iron', 'founding'].forEach(function (tier) {
      var p = document.querySelector('[data-price="' + tier + '"]');
      var u = document.querySelector('[data-unit="' + tier + '"]');
      var s = document.querySelector('[data-sub="' + tier + '"]');
      if (p) p.textContent = d[tier].price;
      if (u) u.textContent = d[tier].unit;
      if (s) s.textContent = d[tier].sub;
    });
    var pay = document.querySelector('[data-pay="iron"]');
    if (pay && d.iron.pay) pay.href = d.iron.pay;
  }
  var cycleOpts = document.querySelectorAll('.bt-opt');
  cycleOpts.forEach(function (o) {
    o.addEventListener('click', function () {
      cycleOpts.forEach(function (x) { x.classList.remove('active'); });
      o.classList.add('active');
      applyCycle(o.getAttribute('data-cycle'));
    });
  });
})();

/* ── Waitlist + prelaunch CTA wiring ─────────────────────────────── */
(function () {
  var PRELAUNCH = true; // flip to false on launch day: buy buttons come back
  var SB_URL = 'https://hlvcjroskewmoxsxwksg.supabase.co';
  var SB_KEY = 'sb_publishable_yirT83I5CFpR3RHWdbwweA_6UlklZPT';

  // Pre-launch: all purchase CTAs funnel into the waitlist instead.
  if (PRELAUNCH) {
    document.querySelectorAll('[data-pay]').forEach(function (a) {
      a.setAttribute('href', '#waitlist');
      a.textContent = 'Join the waitlist';
    });
  } else {
    // Launch: ask for the sign-in email first and pre-fill it at checkout, so
    // the payment lands on the same email the app checks. Without JS the
    // button still goes straight to Stripe.
    document.querySelectorAll('[data-pay]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (a.parentNode.querySelector('.pay-email')) return;
        e.preventDefault();
        var f = document.createElement('form');
        f.className = 'pay-email';
        f.noValidate = true;
        f.innerHTML =
          '<label class="tier-sub" for="payEmail" style="display:block;margin:12px 0 6px;font-size:13px">Your sign-in email for The Forge</label>' +
          '<input id="payEmail" type="email" autocomplete="email" placeholder="you@example.com" style="width:100%;padding:12px 14px;border-radius:10px;border:1px solid var(--line);background:var(--panel);color:#fff;font-size:15px">' +
          '<button type="submit" class="btn btn-gold btn-block" style="margin-top:10px">Continue to payment</button>' +
          '<p class="tier-sub pay-err" role="alert" style="margin-top:8px;font-size:12.5px"></p>';
        a.insertAdjacentElement('afterend', f);
        a.style.display = 'none';
        f.addEventListener('submit', function (ev) {
          ev.preventDefault();
          var em = (f.querySelector('input').value || '').trim();
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em) || em.length > 254) {
            f.querySelector('.pay-err').textContent = 'Enter the email you use to sign in to The Forge.';
            return;
          }
          var url = a.getAttribute('href'); // follows the monthly / yearly toggle
          if (!/^https:\/\/buy\.stripe\.com\//.test(url)) return;
          location.href = url + (url.indexOf('?') < 0 ? '?' : '&') + 'prefilled_email=' + encodeURIComponent(em);
        });
        f.querySelector('input').focus();
      });
    });
  }

  // Live Founding 20 applicant count (public RPC returns a number only).
  var fdEl = document.getElementById('fdCount');
  if (fdEl) {
    fetch(SB_URL + '/rest/v1/rpc/founding_applicant_count', {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: '{}'
    }).then(function (r) { return r.json(); }).then(function (n) {
      if (typeof n === 'number' && n >= 1) {
        fdEl.innerHTML = '<span class="live-dot" aria-hidden="true"></span>';
        fdEl.appendChild(document.createTextNode(n === 1 ? '1 person has applied so far' : n + ' people have applied so far'));
      }
    }).catch(function () {});
  }

  // Live count for social proof (only shown once it's non-trivial).
  var countEl = document.getElementById('wlCount');
  fetch(SB_URL + '/rest/v1/rpc/waitlist_count', {
    method: 'POST',
    headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
    body: '{}'
  }).then(function (r) { return r.json(); }).then(function (n) {
    if (countEl && typeof n === 'number' && n >= 25) {
      countEl.textContent = n + ' people are already waiting.';
    }
  }).catch(function () {});

  var form = document.getElementById('wlForm');
  if (!form) return;
  var msg = document.getElementById('wlMsg');
  var btn = document.getElementById('wlBtn');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = (document.getElementById('wlEmail').value || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      msg.className = 'wl-note err';
      msg.textContent = 'Enter a real email. The Forge does not accept excuses.';
      return;
    }
    var params = new URLSearchParams(location.search);
    btn.disabled = true; btn.textContent = 'Forging…';
    fetch(SB_URL + '/rest/v1/waitlist', {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        // URL params are attacker-controlled: clamp to what the table accepts
          // (source <= 60, ref_code <= 40) so a long ?src= can't fail a real signup.
          source: (params.get('src') || params.get('utm_source') || 'site').replace(/[^\w.-]/g, '').slice(0, 60) || 'site',
        ref_code: (params.get('ref') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 40) || null
      })
    }).then(function (r) {
      if (r.ok || r.status === 201) {
        msg.className = 'wl-note ok';
        msg.textContent = 'You are in. Watch your inbox, invites go out in signup order.';
        form.style.display = 'none';
      } else if (r.status === 409) {
        msg.className = 'wl-note ok';
        msg.textContent = 'Already on the list. Good, you don’t quit.';
      } else {
        throw new Error('bad status ' + r.status);
      }
    }).catch(function () {
      msg.className = 'wl-note err';
      msg.textContent = 'Something broke. Try again in a minute.';
      btn.disabled = false; btn.textContent = 'Claim my place';
    });
  });
})();
