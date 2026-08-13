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
      iron:     { price: '$10', unit: '/month', sub: '14-day free trial in-app, then $10/mo.', pay: 'https://buy.stripe.com/test_8x23cu0Ym0eV5ZBappfnO04' },
      founding: { price: '$20', unit: '/month', sub: 'Locked in forever. The price disappears when the cohort closes.' }
    },
    yearly: {
      iron:     { price: '$102', unit: '/year', sub: '15% off $120. 14-day free trial in-app.', pay: 'https://buy.stripe.com/test_14AbJ0ePcd1Hds3fJJfnO05' },
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
        source: params.get('src') || params.get('utm_source') || 'site',
        ref_code: params.get('ref') || null
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
