/* fx.js — scroll/pointer effects layered on top of the page.
   Everything here is an enhancement: the page is complete without it.
   Only transform/opacity-class properties are driven, and every effect
   stands down for prefers-reduced-motion. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---- intro ----
     Capable first visits get the Three.js tunnel (boot.js set html.tunnel-on
     before first paint). Everyone else gets the short CSS curtain, which is
     pure CSS and tidied up here. */
  var tunnel = document.querySelector('.tunnel');
  function endIntro() {
    var c = document.querySelector('.curtain');
    if (c && c.parentNode) c.parentNode.removeChild(c);
    if (tunnel && tunnel.parentNode) tunnel.parentNode.removeChild(tunnel);
    root.classList.remove('intro', 'tunnel-on');
  }
  if (root.classList.contains('tunnel-on') && tunnel && !reduce) {
    try { window.sessionStorage.setItem('tunnel', '1'); } catch (e) { /* ignore */ }
    var finished = false, cancelFlight = null;
    var finish = function () {
      if (finished) return;
      finished = true;
      if (cancelFlight) cancelFlight();
      tunnel.classList.add('is-out');
      setTimeout(endIntro, 320);
    };
    var skipBtn = tunnel.querySelector('.tunnel-skip');
    if (skipBtn) {
      skipBtn.textContent = (root.lang === 'fr') ? 'Passer' : 'Skip';
      skipBtn.addEventListener('click', finish);
    }
    setTimeout(finish, 3200);                       /* load failsafe */
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
      window.addEventListener(ev, finish, { once: true, passive: true });
    });
    import('./three-fx.js').then(function (m) {
      if (finished) return;
      var flight = m.runTunnel(tunnel.querySelector('canvas'), { duration: 1800 });
      cancelFlight = flight.cancel;
      flight.done.then(finish);
    }).catch(finish);
  } else {
    /* repeat visit: the short name moment, still cancellable */
    var curtainEl = document.querySelector('.curtain');
    var skipped = false;
    var skipCurtain = function () {
      if (skipped || !curtainEl) return;
      skipped = true;
      curtainEl.classList.add('is-skipped');
      setTimeout(endIntro, 340);
    };
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
      window.addEventListener(ev, skipCurtain, { once: true, passive: true });
    });
    setTimeout(endIntro, 1500);
  }

  /* ---- dock: full-screen menu (works with motion off too) ---- */
  var isFr = function () { return root.lang === 'fr'; };
  var menuBtn = document.getElementById('menuBtn');
  var menu = document.getElementById('menu');
  if (menuBtn && menu) {
    var menuNav = menu.querySelector('.menu-nav');
    var lastFocus = null;
    var buildMenu = function () {
      menuNav.textContent = '';
      [].slice.call(document.querySelectorAll('.topnav button[data-go]')).forEach(function (src, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.style.setProperty('--i', i);
        var n = document.createElement('em'); n.textContent = '0' + (i + 1);
        var t = document.createElement('span'); t.textContent = src.textContent.trim();
        b.appendChild(n); b.appendChild(t);
        b.addEventListener('click', function () {
          closeMenu(true);
          setTimeout(function () { src.click(); }, 160);
        });
        menuNav.appendChild(b);
      });
      menu.querySelector('.menu-close').setAttribute('aria-label', isFr() ? 'Fermer le menu' : 'Close menu');
    };
    var openMenu = function () {
      buildMenu();
      lastFocus = document.activeElement;
      menu.classList.add('is-open');
      menu.removeAttribute('aria-hidden');
      root.classList.add('menu-open');
      menuBtn.setAttribute('aria-expanded', 'true');
      if (window.__lenis) window.__lenis.stop();
      var first = menuNav.querySelector('button');
      if (first) first.focus();
    };
    var closeMenu = function (skipFocus) {
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      root.classList.remove('menu-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      if (window.__lenis) window.__lenis.start();
      if (!skipFocus && lastFocus && lastFocus.focus) lastFocus.focus();
    };
    menuBtn.addEventListener('click', function () {
      if (menu.classList.contains('is-open')) closeMenu(); else openMenu();
    });
    menu.querySelector('.menu-close').addEventListener('click', function () { closeMenu(); });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) closeMenu();
    });
  }

  if (reduce) return;

  /* ---- scroll scrubbing: hero depth, staggered settle, word-by-word emphasis ---- */
  var hero = document.querySelector('.hero');
  var scenes = [].slice.call(document.querySelectorAll('.scene'));
  var wordHosts = [].slice.call(document.querySelectorAll('.pull, .close-a .desc, .col-alt .prose, .skills-head p'));
  var busy = false;

  function splitWords(el) {
    if (el.querySelector('.w')) return;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = walker.nextNode())) if (n.nodeValue.trim()) nodes.push(n);
    nodes.forEach(function (tn) {
      var frag = document.createDocumentFragment();
      tn.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var sp = document.createElement('span');
        sp.className = 'w';
        sp.textContent = part;
        frag.appendChild(sp);
      });
      tn.parentNode.replaceChild(frag, tn);
    });
  }
  wordHosts.forEach(function (el) {
    splitWords(el);
    /* the language switch rewrites the text — split again afterwards */
    if ('MutationObserver' in window) {
      new MutationObserver(function () { splitWords(el); schedule(); })
        .observe(el, { childList: true });
    }
  });

  /* ---- text decode: section labels scramble into place as their scene arrives ---- */
  var GLYPHS = '01<>/\\_-+*#';
  function decode(el) {
    if (el._decoding || el.children.length) return;
    var txt = el.textContent;
    if (!txt.trim()) return;
    el._decoding = true;
    var t0 = performance.now(), dur = 520;
    (function tick(now) {
      var t = clamp(((now || performance.now()) - t0) / dur, 0, 1);
      var out = '';
      for (var i = 0; i < txt.length; i++) {
        var c = txt.charAt(i);
        out += (c === ' ' || i < t * txt.length) ? c : GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
      }
      el.textContent = t < 1 ? out : txt;
      if (t < 1) window.requestAnimationFrame(tick); else el._decoding = false;
    })(t0);
  }
  document.addEventListener('scene:live', function (e) {
    var sc = scenes[e.detail];
    if (!sc) return;
    [].slice.call(sc.querySelectorAll('.eyebrow, .kicker, .sub-label, .viz-label')).forEach(decode);
  });

  var cables = null;
  function update() {
    busy = false;
    var vh = window.innerHeight;
    if (hero) hero.style.setProperty('--hp', clamp(window.scrollY / vh, 0, 1).toFixed(3));
    scenes.forEach(function (s, i) {
      if (!i) return;
      var p = clamp((1 - s.getBoundingClientRect().top / vh) * 1.4, 0, 1);
      s.style.setProperty('--sp', p.toFixed(3));
      s._p = p;
    });
    if (cables && scenes[2]) cables.setProgress(scenes[2]._p == null ? 0 : scenes[2]._p);
    wordHosts.forEach(function (el) {
      var scene = el.closest('.scene');
      var p = scene && scene._p != null ? scene._p : 1;
      var ws = el.querySelectorAll('.w');
      var n = ws.length;
      for (var k = 0; k < n; k++) {
        ws[k].style.opacity = (0.22 + 0.78 * clamp((p * 1.25 - (k / n) * 0.9) * 6, 0, 1)).toFixed(2);
      }
    });
  }
  function schedule() { if (!busy) { busy = true; window.requestAnimationFrame(update); } }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();

  /* ---- light cables behind the career scene (wide screens, once idle) ---- */
  var cableCanvas = document.getElementById('cables');
  if (cableCanvas && window.matchMedia('(min-width: 760px)').matches && window.WebGLRenderingContext) {
    var bootCables = function () {
      import('./three-fx.js').then(function (m) {
        cables = m.startCables(cableCanvas, scenes[2]);
        schedule();
      }).catch(function () { /* the column simply stays plain */ });
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(bootCables, { timeout: 2500 });
    else setTimeout(bootCables, 1200);
  }

  if (!fine) return;

  /* ---- pointer: layered parallax on the hero doodles ---- */
  var layers = hero ? [].slice.call(hero.querySelectorAll('[data-depth]')) : [];
  if (layers.length) {
    var tx = 0, ty = 0, cx = 0, cy = 0, running = false;
    var step = function () {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      layers.forEach(function (l) {
        var d = +l.getAttribute('data-depth');
        l.style.translate = (cx * d).toFixed(2) + 'px ' + (cy * d).toFixed(2) + 'px';
      });
      if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) window.requestAnimationFrame(step);
      else running = false;
    };
    window.addEventListener('pointermove', function (e) {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!running) { running = true; window.requestAnimationFrame(step); }
    }, { passive: true });
  }

  /* ---- pointer: a light that follows the cursor across cards and tiles ---- */
  document.addEventListener('pointermove', function (e) {
    var el = e.target.closest && e.target.closest('.card, .prof, .rec');
    if (!el) return;
    var r = el.getBoundingClientRect();
    el.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    el.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
  }, { passive: true });

  /* ---- pointer: a ring that trails the cursor and swells over anything clickable ---- */
  var ring = document.createElement('div');
  ring.className = 'cursor';
  ring.setAttribute('aria-hidden', 'true');
  document.body.appendChild(ring);
  var rx = 0, ry = 0, mx2 = 0, my2 = 0, shown = false, looping = false;
  var ringLoop = function () {
    rx += (mx2 - rx) * 0.2;
    ry += (my2 - ry) * 0.2;
    ring.style.translate = rx.toFixed(1) + 'px ' + ry.toFixed(1) + 'px';
    if (Math.abs(mx2 - rx) > 0.15 || Math.abs(my2 - ry) > 0.15) window.requestAnimationFrame(ringLoop);
    else looping = false;
  };
  window.addEventListener('pointermove', function (e) {
    mx2 = e.clientX; my2 = e.clientY;
    if (!shown) { shown = true; rx = mx2; ry = my2; ring.classList.add('on'); }
    var t = e.target;
    var hot = !!(t.closest && t.closest('a, button, .card, .prof, .chip, [data-go], summary'));
    var typing = !!(t.closest && t.closest('input, textarea'));
    ring.classList.toggle('hot', hot);
    ring.classList.toggle('typing', typing);
    if (!looping) { looping = true; window.requestAnimationFrame(ringLoop); }
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', function () { ring.classList.remove('on'); shown = false; });
})();
