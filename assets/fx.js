/* THE FORGE: motion layer for the homepage (vanilla, no dependencies).
   Word-by-word headline reveals, 3D tilt + spotlight cards, scroll-linked
   depth, the streak demo. Everything degrades to a still page. */
(function () {
  'use strict';
  // Pages whose CSP blocks inline scripts can't set this in <head>.
  document.documentElement.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ── Second marquee band loops seamlessly too ──
  var m2 = document.getElementById('marquee2');
  if (m2) m2.innerHTML += m2.innerHTML;

  // ── Split headlines into words that rise into place ──
  function split(el) {
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var o = document.createElement('span'); o.className = 'w';
            var i = document.createElement('span'); i.className = 'wi'; i.textContent = p;
            o.appendChild(i); frag.appendChild(o);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    })(el);
    el.querySelectorAll('.wi').forEach(function (w, k) { w.style.transitionDelay = (0.06 * k) + 's'; });
  }
  var heads = document.querySelectorAll('.split');
  if (!reduce) heads.forEach(split);

  // ── One observer: reveal headlines and anything marked .fx-in ──
  var watch = document.querySelectorAll('.split, .fx-in');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -30px 0px' });
    watch.forEach(function (el) { io.observe(el); });
  } else {
    watch.forEach(function (el) { el.classList.add('in'); });
  }

  // Safety net: on a busy or slow device the observer can miss an element
  // that scrolled past between two rendering updates, leaving it invisible.
  // Anything whose top is above the bottom of the screen gets revealed.
  var pending = document.querySelectorAll('.split, .fx-in, .reveal');
  var sweepQueued = false;
  var sweep = function () {
    sweepQueued = false;
    var vh = window.innerHeight, left = 0;
    pending.forEach(function (el) {
      if (el.classList.contains('in')) return;
      if (el.getBoundingClientRect().top < vh) el.classList.add('in'); else left++;
    });
    if (!left) { window.removeEventListener('scroll', onSweep); }
  };
  var onSweep = function () { if (!sweepQueued) { sweepQueued = true; setTimeout(sweep, 160); } };
  window.addEventListener('scroll', onSweep, { passive: true });
  window.addEventListener('load', function () { setTimeout(sweep, 1200); });

  // ── 3D tilt + pointer spotlight ──
  if (fine && !reduce) {
    document.querySelectorAll('.tilt').forEach(function (el) {
      var max = parseFloat(el.getAttribute('data-tilt')) || 6;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        el.style.setProperty('--ry', ((x - 0.5) * 2 * max).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - y) * 2 * max).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--ry', '0deg');
        el.style.setProperty('--rx', '0deg');
      });
    });
  }

  // ── Scroll-linked depth: --k goes 0 → 1 as an element settles into view ──
  var linked = document.querySelectorAll('[data-scroll]');
  if (linked.length && !reduce) {
    var ticking = false;
    var update = function () {
      ticking = false;
      var vh = window.innerHeight;
      linked.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var k = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.75)));
        k = 1 - Math.pow(1 - k, 3);
        var p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
        el.style.setProperty('--k', k.toFixed(3));
        el.style.setProperty('--p', p.toFixed(3));
      });
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // ── Streak demo: forge a block a beat, miss once, back to zero ──
  var demo = document.getElementById('streakDemo');
  if (demo) {
    var cells = [];
    for (var c = 0; c < 14; c++) {
      var s = document.createElement('span');
      demo.appendChild(s);
      cells.push(s);
    }
    var count = document.getElementById('streakCount');
    var label = document.getElementById('streakLabel');
    var day = 0, timer = null;
    var paint = function () {
      cells.forEach(function (s, i) { s.className = i < day ? 'on' : ''; });
      if (count) count.textContent = String(day).padStart(2, '0');
    };
    var step = function () {
      if (day < 13) {
        day++;
        paint();
        if (label) label.textContent = 'Day kept';
        timer = setTimeout(step, 420);
      } else {
        cells[day].className = 'miss';
        if (label) label.textContent = 'Missed. Back to zero.';
        demo.classList.add('shake');
        timer = setTimeout(function () {
          demo.classList.remove('shake');
          day = 0;
          paint();
          timer = setTimeout(step, 700);
        }, 1500);
      }
    };
    if (reduce) {
      day = 13; paint();
    } else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting && !timer) step();
        if (!es[0].isIntersecting && timer) { clearTimeout(timer); timer = null; }
      }).observe(demo);
    }
  }
})();
