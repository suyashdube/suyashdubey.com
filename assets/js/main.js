/* ============================================================
   main.js — interaction + motion layer
   ============================================================ */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  document.documentElement.classList.add('js');
  window.addEventListener('load', function () { document.body.classList.add('is-ready'); });
  setTimeout(function () { document.body.classList.add('is-ready'); }, 900);

  /* ---------- sticky nav + mobile menu ---------- */
  var nav = $('.nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('is-stuck', window.scrollY > 12); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var toggle = $('.nav__toggle', nav);
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      $$('.nav__links a', nav).forEach(function (a) {
        a.addEventListener('click', function () {
          nav.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  /* ---------- scroll progress ---------- */
  var bar = $('.progress');
  if (bar) {
    var tick = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? window.scrollY / h : 0) + ')';
    };
    tick();
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
  }

  /* ---------- reveal on scroll ---------- */
  var rv = $$('.rv');
  if (rv.length) {
    if (!('IntersectionObserver' in window) || reduced) {
      rv.forEach(function (el) { el.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
      rv.forEach(function (el) { io.observe(el); });
      // Safety net: content must never stay invisible because a throttled or
      // never-delivered observer callback left the reveal state stuck.
      setTimeout(function () { rv.forEach(function (el) { el.classList.add('in'); }); }, 4000);
    }
  }

  /* ---------- count-up metrics ---------- */
  $$('[data-count]').forEach(function (el) {
    var to = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var run = function () {
      el.closest('.metric') && el.closest('.metric').classList.add('in');
      if (reduced || document.hidden) { el.textContent = to + suffix; return; }
      var t0 = null, dur = 1500;
      var step = function (now) {
        if (t0 === null) t0 = now;
        var p = Math.min(1, (now - t0) / dur);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(to * e) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!('IntersectionObserver' in window)) { run(); return; }
    var o = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { run(); o.disconnect(); }
    }, { threshold: 0.5 });
    o.observe(el);
  });

  /* ---------- pointer spotlight on cards ---------- */
  if (!reduced && window.matchMedia('(hover:hover)').matches) {
    $$('.card, .work__row').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    /* subtle 3D tilt */
    $$('.card--tilt').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateX(' + (-y * 4).toFixed(2) + 'deg) rotateY(' + (x * 5).toFixed(2) + 'deg) translateY(-3px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });

    /* magnetic buttons */
    $$('.btn').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.16).toFixed(2) + 'px,' +
                                            ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(2) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });

    /* cursor */
    var cur = document.createElement('div');
    cur.className = 'cursor';
    document.body.appendChild(cur);
    var cx = 0, cy = 0, dx = 0, dy = 0, seen = false;
    window.addEventListener('pointermove', function (e) {
      cx = e.clientX; cy = e.clientY;
      if (!seen) { dx = cx; dy = cy; seen = true; cur.classList.add('on'); }
    }, { passive: true });
    (function loop() {
      dx += (cx - dx) * 0.18; dy += (cy - dy) * 0.18;
      cur.style.transform = 'translate(' + dx + 'px,' + dy + 'px) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest('a,button,summary,input,textarea,select');
      cur.classList.toggle('grow', !!t);
    });
  }

  /* ---------- marquee: duplicate track for a seamless loop ---------- */
  $$('.marquee__track').forEach(function (tr) {
    tr.innerHTML = tr.innerHTML + tr.innerHTML;
  });

  /* ---------- FAQ: one open at a time ---------- */
  var faqs = $$('.qa details');
  faqs.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) faqs.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });

  /* ---------- live IST clock ---------- */
  $$('[data-clock]').forEach(function (el) {
    var paint = function () {
      try {
        var s = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false
        }).format(new Date());
        el.textContent = s + ' IST — India';
      } catch (e) { el.textContent = 'India (IST)'; }
    };
    paint();
    setInterval(paint, 20000);
  });

  /* ---------- active section in nav ---------- */
  var links = $$('.nav__links a[href^="#"]');
  if (links.length && 'IntersectionObserver' in window) {
    var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { so.observe(s); });
  }


  /* ---------- experience glyphs ----------
     Each role gets a deterministic little node constellation: nodes drift on
     their own, edges carry a travelling pulse, and the whole graph leans
     toward the pointer when you move across it.                            */
  (function () {
    var canvases = $$('canvas[data-glyph]');
    if (!canvases.length) return;

    function rng(seed) {                       // mulberry32
      return function () {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    var HUES = ['63,228,255', '124,92,255', '255,92,208', '200,255,77'];

    canvases.forEach(function (cv) {
      var ctx = cv.getContext('2d');
      if (!ctx) return;
      var gi = parseInt(cv.getAttribute('data-glyph'), 10) || 0;
      var rand = rng(gi * 9781 + 17);
      var DPR = Math.min(window.devicePixelRatio || 1, 2);
      var W = 0, H = 0, R = 0;

      // nodes on a super-elliptic ring, echoing the hero form, plus a hub
      var N = 7 + Math.floor(rand() * 3);
      var nodes = [], i, j;
      for (i = 0; i < N; i++) {
        var a = (i / N) * Math.PI * 2 + rand() * 0.45;
        var k = 0.62 + rand() * 0.38;
        var ca = Math.cos(a), sa = Math.sin(a), e = 2 / 3.2;
        nodes.push({
          bx: k * (ca < 0 ? -1 : 1) * Math.pow(Math.abs(ca), e),
          by: k * (sa < 0 ? -1 : 1) * Math.pow(Math.abs(sa), e),
          x: 0, y: 0, r: 1.6 + rand() * 2.2,
          sp: 0.25 + rand() * 0.5, ph: rand() * 6.28,
          c: HUES[Math.floor(rand() * HUES.length)]
        });
      }
      nodes.push({ bx: 0, by: 0, x: 0, y: 0, r: 3.1, sp: 0.2, ph: rand() * 6.28, c: HUES[1], hub: true });

      // every node links to the hub, plus a couple of near neighbours
      var edges = [];
      var hub = nodes.length - 1;
      for (i = 0; i < N; i++) edges.push({ a: i, b: hub, ph: rand(), sp: 0.16 + rand() * 0.3 });
      for (i = 0; i < N; i++) {
        var best = -1, bd = 1e9;
        for (j = 0; j < N; j++) {
          if (j === i) continue;
          var d = (nodes[i].bx - nodes[j].bx) * (nodes[i].bx - nodes[j].bx) +
                  (nodes[i].by - nodes[j].by) * (nodes[i].by - nodes[j].by);
          if (d < bd) { bd = d; best = j; }
        }
        if (best > i) edges.push({ a: i, b: best, ph: rand(), sp: 0.16 + rand() * 0.3 });
      }

      var pointer = { x: -999, y: -999 }, energy = 0, over = false;
      cv.addEventListener('pointermove', function (e) {
        var r = cv.getBoundingClientRect();
        pointer.x = (e.clientX - r.left) / r.width * W;
        pointer.y = (e.clientY - r.top) / r.height * H;
        over = true;
      });
      cv.addEventListener('pointerleave', function () { over = false; pointer.x = pointer.y = -999; });

      function measure() {
        var r = cv.getBoundingClientRect();
        var w = Math.max(1, Math.round(r.width * DPR)), h = Math.max(1, Math.round(r.height * DPR));
        var changed = cv.width !== w || cv.height !== h;
        if (changed) { cv.width = w; cv.height = h; }
        W = w; H = h; R = Math.min(w, h) * 0.36;
        return changed;
      }

      function draw(t) {
        measure();
        ctx.clearRect(0, 0, W, H);
        var cx = W / 2, cy = H / 2, k;
        energy += ((over ? 1 : 0) - energy) * 0.08;

        for (k = 0; k < nodes.length; k++) {
          var n = nodes[k];
          var drift = n.hub ? 0.012 : 0.055;
          var tx = cx + n.bx * R + Math.cos(t * n.sp + n.ph) * R * drift;
          var ty = cy + n.by * R + Math.sin(t * n.sp * 1.3 + n.ph) * R * drift;
          if (pointer.x > -900) {                 // lean toward the pointer
            var dx = pointer.x - tx, dy = pointer.y - ty;
            var dist = Math.hypot(dx, dy) || 1;
            var pull = Math.max(0, 1 - dist / (R * 2.1)) * R * 0.20 * energy;
            tx += dx / dist * pull; ty += dy / dist * pull;
          }
          n.x = tx; n.y = ty;
        }

        for (k = 0; k < edges.length; k++) {
          var e2 = edges[k], A = nodes[e2.a], B = nodes[e2.b];
          var g = ctx.createLinearGradient(A.x, A.y, B.x, B.y);
          g.addColorStop(0, 'rgba(' + A.c + ',' + (0.16 + energy * 0.34).toFixed(3) + ')');
          g.addColorStop(1, 'rgba(' + B.c + ',' + (0.16 + energy * 0.34).toFixed(3) + ')');
          ctx.strokeStyle = g;
          ctx.lineWidth = (0.85 + energy * 0.5) * DPR;
          ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();

          var p = (t * e2.sp + e2.ph) % 1;        // travelling pulse
          var px = A.x + (B.x - A.x) * p, py = A.y + (B.y - A.y) * p;
          ctx.fillStyle = 'rgba(' + B.c + ',' + (0.55 + energy * 0.45).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(px, py, (1.15 + energy * 0.9) * DPR, 0, 6.2832); ctx.fill();
        }

        for (k = 0; k < nodes.length; k++) {
          var m = nodes[k];
          var rr = m.r * DPR * (1 + energy * 0.28);
          var hg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, rr * 4.2);
          hg.addColorStop(0, 'rgba(' + m.c + ',' + (0.42 + energy * 0.34).toFixed(3) + ')');
          hg.addColorStop(1, 'rgba(' + m.c + ',0)');
          ctx.fillStyle = hg;
          ctx.beginPath(); ctx.arc(m.x, m.y, rr * 4.2, 0, 6.2832); ctx.fill();
          ctx.fillStyle = m.hub ? 'rgba(245,245,248,.95)' : 'rgba(' + m.c + ',.95)';
          ctx.beginPath(); ctx.arc(m.x, m.y, rr, 0, 6.2832); ctx.fill();
        }
      }

      draw(gi * 3.7);                             // paint once, before any rAF
      if (reduced) return;

      var vis = true;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { vis = en[0].isIntersecting; }, { threshold: 0 }).observe(cv);
      }
      var t0 = performance.now();
      (function loop(now) {
        requestAnimationFrame(loop);
        if (!vis || document.hidden) return;
        draw((now - t0) / 1000 + gi * 3.7);
      })(t0);

      if (window.ResizeObserver) new ResizeObserver(function () { draw(gi * 3.7); }).observe(cv);
    });
  })();

  /* ---------- project brief form ----------
     Nothing is transmitted from the page. On submit we validate, then
     open the visitor's own mail client with a pre-filled draft that
     they send themselves.                                            */
  var form = $('#brief');
  if (form) {
    var status = $('.form-status', form);

    var setErr = function (field, msg) {
      var wrap = field.closest('.field');
      wrap.classList.toggle('invalid', !!msg);
      var e = $('.err', wrap);
      if (e) e.textContent = msg || '';
      field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    };

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var name = form.elements.name, email = form.elements.email, message = form.elements.message;
      var ok = true;

      if (!name.value.trim()) { setErr(name, 'Please add your name.'); ok = false; } else setErr(name, '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) { setErr(email, 'Please add a valid email.'); ok = false; } else setErr(email, '');
      if (message.value.trim().length < 20) { setErr(message, 'A couple of sentences helps — 20 characters minimum.'); ok = false; } else setErr(message, '');

      if (!ok) { form.querySelector('.invalid input, .invalid textarea').focus(); return; }

      var to = form.getAttribute('data-to');
      var subject = 'Project brief — ' + name.value.trim() + (form.elements.company.value.trim() ? ' (' + form.elements.company.value.trim() + ')' : '');
      var body = [
        'Name: ' + name.value.trim(),
        'Email: ' + email.value.trim(),
        'Company: ' + (form.elements.company.value.trim() || '—'),
        'Engagement: ' + form.elements.engagement.value,
        'Timeline: ' + form.elements.timeline.value,
        '',
        'Brief:',
        message.value.trim(),
        ''
      ].join('\n');

      var mailto = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      var gmail = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(to) +
                  '&su=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);

      if (status) {
        $('[data-act="mail"]', status).setAttribute('href', mailto);
        $('[data-act="gmail"]', status).setAttribute('href', gmail);
        $('.form-status__lead', status).textContent =
          'Your brief is ready. Open it in your email app and press send — it goes straight to ' + to +
          '. Nothing has been sent from this page.';

        var copyBtn = $('[data-act="copy"]', status);
        copyBtn.onclick = function () {
          var text = 'To: ' + to + '\nSubject: ' + subject + '\n\n' + body;
          var done = function () {
            var label = $('span', copyBtn);
            label.textContent = 'Copied';
            setTimeout(function () { label.textContent = 'Copy the brief'; }, 2200);
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text, done); });
          } else { legacyCopy(text, done); }
        };

        status.classList.add('show');
      }

      // Try the visitor's default mail client. If they have none registered the
      // navigation is a no-op — which is exactly why the panel above stays up.
      window.location.href = mailto;
    });

    function legacyCopy(text, done) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* clipboard unavailable */ }
      document.body.removeChild(ta);
    }
  }
})();
