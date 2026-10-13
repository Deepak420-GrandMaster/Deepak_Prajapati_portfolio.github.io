/* ============================================================
   Bio-data figures, drawn as live decorations across the scenes:
     .bio-arc     RNA secondary structure as an arc diagram   (hero)
     .bio-ribbon  a small alpha/beta protein fold, rotating    (hero)
     .bio-aln     motif alignments that slide into register   (projects, skills)
     .bio-mat     a contact map with a box walking its domains (timeline)
   Purely decorative (aria-hidden). Every loop runs only while its scene
   is live and the tab is visible; reduced motion gets a still frame.
   ============================================================ */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* seeded PRNG: the figures come out identical on every visit */
  function rng(seed) {
    return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  }
  function svgEl(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function shown(node) {
    var s = node.closest('.scene');
    return !document.hidden && !!s && s.classList.contains('is-live') &&
           getComputedStyle(node).display !== 'none';
  }

  /* one registry: each figure exposes start()/stop(), sync() flips them */
  var figs = [];
  function sync() {
    figs.forEach(function (f) {
      var on = shown(f.node);
      if (on && !f.running) { f.running = true; f.start(); }
      else if (!on && f.running) { f.running = false; f.stop(); }
    });
  }

  /* ---------- RNA arc diagram ---------- */
  function arcs(host) {
    var N = 60, gap = 5, top = 4, x1 = 62, x2 = 68;
    /* stems as [i, j, length]: pairs (i+k, j-k). Nested stems bulge left;
       the two pseudoknots cross them and are drawn on the right. */
    var left = [[0, 43, 5], [7, 20, 4], [23, 37, 4], [46, 59, 4], [27, 33, 2]];
    var right = [[13, 30, 2], [16, 52, 2]];
    var h = top * 2 + (N - 1) * gap;
    var svg = svgEl('svg', { viewBox: '0 0 96 ' + h, preserveAspectRatio: 'xMidYMid meet' }, host);
    var gA = svgEl('g', {}, svg), gD = svgEl('g', {}, svg);
    var dots = [], stems = [], k = 0;
    function y(i) { return top + i * gap; }

    function addStem(st, side) {
      var group = [];
      for (var s = 0; s < st[2]; s++) {
        var i = st[0] + s, j = st[1] - s, dy = y(j) - y(i);
        var x = side ? x2 : x1;
        var rx = side ? Math.min(dy * 0.45, 24) : Math.min(dy * 0.45, 56);
        var d = 'M' + x + ' ' + y(i) + 'A' + rx.toFixed(2) + ' ' + (dy / 2) + ' 0 0 ' + side + ' ' + x + ' ' + y(j);
        var p = svgEl('path', { d: d, 'class': 'arc' + (side ? ' pk' : ''), pathLength: 1, style: '--k:' + (k++) }, gA);
        group.push({ p: p, i: i, j: j });
      }
      stems.push(group);
    }
    left.forEach(function (st) { addStem(st, 0); });
    right.forEach(function (st) { addStem(st, 1); });
    for (var i = 0; i < N; i++) {
      svgEl('circle', { cx: x2, cy: y(i), r: 1.1, 'class': 'dot2' }, gD);
      dots.push(svgEl('circle', { cx: x1, cy: y(i), r: 1.3, 'class': 'dot' }, gD));
    }

    var t = null, n = 0, lit = [];
    function light(group) {
      lit.forEach(function (e) { e.classList.remove('hot'); });
      lit = [];
      group.forEach(function (a) { lit.push(a.p, dots[a.i], dots[a.j]); });
      lit.forEach(function (e) { e.classList.add('hot'); });
    }
    figs.push({
      node: host,
      start: function () {
        if (reduce) { light(stems[0]); return; }
        t = setInterval(function () { light(stems[n++ % stems.length]); }, 1300);
      },
      stop: function () { clearInterval(t); }
    });
  }

  /* ---------- contact map ---------- */
  function matrix(host) {
    var r = rng(11), N = 36, doms = [], i = 0;
    while (i < N) {
      var s = 4 + Math.floor(r() * 6);
      if (N - i - s < 4) s = N - i;
      doms.push([i, s]); i += s;
    }
    var on = {};
    function set(a, b) { on[Math.min(a, b) * N + Math.max(a, b)] = 1; }
    doms.forEach(function (d) {
      for (var a = d[0]; a < d[0] + d[1]; a++)
        for (var b = a; b < d[0] + d[1]; b++)
          if (b - a <= 1 || r() < 0.8) set(a, b);
    });
    for (var c = 0; c < 18; c++) {
      var a = Math.floor(r() * N), b = Math.floor(r() * N);
      if (Math.abs(a - b) > 4) set(a, b);
    }

    var svg = svgEl('svg', { viewBox: '-0.5 -0.5 ' + (N + 1) + ' ' + (N + 1) }, host);
    svgEl('rect', { x: 0, y: 0, width: N, height: N, 'class': 'frame' }, svg);
    var cells = [];
    Object.keys(on).forEach(function (key) {
      var a = Math.floor(key / N), b = key % N;
      var k = '--k:' + (a + b);
      /* upper triangle carries the map; the lower mirror is fainter and sparser */
      cells.push({ a: a, b: b, n: svgEl('rect', { x: b + 0.08, y: a + 0.08, width: 0.84, height: 0.84, 'class': 'c u', style: k }, svg) });
      if (a !== b && r() < 0.8)
        cells.push({ a: a, b: b, n: svgEl('rect', { x: a + 0.08, y: b + 0.08, width: 0.84, height: 0.84, 'class': 'c l', style: k }, svg) });
    });
    var box = svgEl('rect', { x: 0, y: 0, width: 1, height: 1, 'class': 'box' }, svg);

    var t = null, n = doms.length - 1;
    function focus(d) {
      box.style.transform = 'translate(' + (d[0] - 0.15) + 'px,' + (d[0] - 0.15) + 'px) scale(' + (d[1] + 0.3) + ')';
      cells.forEach(function (c) {
        var inside = c.a >= d[0] && c.b < d[0] + d[1];
        c.n.classList.toggle('on', inside);
      });
    }
    focus(doms[n]);
    figs.push({
      node: host,
      start: function () {
        if (reduce) return;
        t = setInterval(function () { n = (n + 1) % doms.length; focus(doms[n]); }, 2100);
      },
      stop: function () { clearInterval(t); }
    });
  }

  /* ---------- motif alignments ---------- */
  var SETS = {
    /* Shine-Dalgarno sites: flank | AGGAGG core | flank */
    dna: {
      cols: [8, 6, 8], band: [1], box: [],
      consensus: [null, 'AGGAGG', null],
      rows: [
        ['TAGAGG', 'AGGAGC', 'AC'], ['GCATAC', 'AGGAGG', 'CC'], ['CA', 'AGGAGC', 'AGGCTG'],
        ['TAA', 'AGGAGG', 'CGAAG'], ['TA', 'AGGAGG', 'GTGGAC'], ['C', 'AGGATG', 'CACTCGG'],
        ['ACCAC', 'AGGAGG', 'GTA'], ['AG', 'CAGGTG', 'CGAGGA'], ['TGTTC', 'AGGAGT', 'ATG'],
        ['ACTCCTAG', 'AGGAGG', ''], ['CGAACC', 'AGGAGG', 'CC'], ['GCAT', 'AGGAGC', 'AGCA']
      ]
    },
    /* zinc-knuckle style cysteine motif: C-x3-C ... C-x-C */
    cys: {
      cols: [6, 5, 1, 3, 6], band: [1], box: [3],
      consensus: [null, 'C...C', null, 'C.C', null],
      rows: [
        ['NHSA', 'CAAHC', '.', 'CVC', 'RN'], ['FSRPAL', 'CHIAC', '.', 'CHC', ''],
        ['MVYMQ', 'CEEIC', '.', 'CVC', 'Y'], ['VLASIV', 'CTFPC', '.', 'CKC', ''],
        ['NKEK', 'CLEPC', '.', 'CVC', 'HT'], ['', 'CTEPC', '.', 'CNC', 'AHTLQA'],
        ['GH', 'CKNAC', '.', 'CNC', 'LPVG'], ['', 'CSSMC', '.', 'CMC', 'HRIDYQ'],
        ['IS', 'CYDEC', '.', 'CPC', 'MMKN'], ['FQVATS', 'CTFVC', '.', 'CTC', ''],
        ['GFA', 'CHLGC', '.', 'CKC', 'AAA'], ['YKV', 'CPANC', '.', 'CMC', 'HFF']
      ]
    }
  };

  function align(host) {
    var set = SETS[host.getAttribute('data-set')] || SETS.dna;
    var vis = Math.min(+host.getAttribute('data-rows') || set.rows.length, set.rows.length);
    var r = rng(5), at = 0;
    var wrap = document.createElement('div');
    wrap.className = 'aln is-scattered';
    host.appendChild(wrap);

    /* column bands sit behind the letters, offset in character cells */
    function offset(c) { var o = 0; for (var i = 0; i < c; i++) o += set.cols[i]; return o; }
    set.band.concat(set.box).forEach(function (c) {
      var b = document.createElement('span');
      b.className = set.box.indexOf(c) > -1 ? 'aln-box' : 'aln-band';
      b.style.setProperty('--at', offset(c));
      b.style.setProperty('--w', set.cols[c]);
      wrap.appendChild(b);
    });

    var rowEls = [];
    for (var v = 0; v < vis; v++) {
      var row = document.createElement('div');
      row.className = 'aln-row';
      row.style.setProperty('--r', v);
      wrap.appendChild(row);
      rowEls.push(row);
    }

    function fill(row, data) {
      row.textContent = '';
      data.forEach(function (seg, c) {
        var col = document.createElement('span');
        col.className = 'aln-col' + (c === 0 ? ' lead' : '');
        col.style.setProperty('--w', set.cols[c]);
        var cons = set.consensus[c];
        for (var i = 0; i < seg.length; i++) {
          var ch = document.createElement('i');
          ch.textContent = seg[i] === '.' ? '…' : seg[i];
          if (cons) {
            var want = cons[i];
            ch.className = want === 'C' && seg[i] === 'C' ? 'm cy' : (want === '.' || want === seg[i] ? 'm' : 'm x');
          }
          col.appendChild(ch);
        }
        row.appendChild(col);
      });
    }
    function load() {
      rowEls.forEach(function (row, v) { fill(row, set.rows[(at + v) % set.rows.length]); });
    }
    function scatter() {
      rowEls.forEach(function (row) {
        var dx = Math.floor(r() * 7) - 3;
        row.style.setProperty('--dx', dx === 0 ? 2 : dx);
      });
      wrap.classList.add('is-scattered');
    }
    function gather() {
      rowEls.forEach(function (row) { row.style.setProperty('--dx', 0); });
      wrap.classList.remove('is-scattered');
    }
    load();
    scatter();

    var timers = [];
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function cycle() {
      later(gather, 250);
      later(scatter, 5200);
      later(function () {
        if (vis < set.rows.length) {
          wrap.classList.add('is-swap');
          later(function () { at = (at + vis) % set.rows.length; load(); wrap.classList.remove('is-swap'); }, 320);
        }
      }, 6200);
      later(cycle, 6900);
    }
    figs.push({
      node: host,
      start: function () { if (reduce) { gather(); return; } cycle(); },
      stop: function () { timers.forEach(clearTimeout); timers = []; }
    });
  }

  /* ---------- protein ribbon ---------- */
  function ribbon(host) {
    var cv = host.querySelector('canvas') || host.appendChild(document.createElement('canvas'));
    var ctx = cv.getContext('2d');
    if (!ctx) return;

    function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
    function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
    function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
    function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

    /* residues: position + secondary structure (h helix, s strand, l loop) */
    var R = [];
    var axis = norm([0.18, -1, 0.12]);
    var hu = norm(cross(axis, [0, 0, 1])), hv = cross(axis, hu);
    function loop(pts) {
      var from = R.length ? R[R.length - 1].p : pts.shift();
      if (!R.length) R.push({ p: from, t: 'l' });
      pts.forEach(function (to) {
        var n = Math.max(1, Math.round(Math.hypot.apply(null, sub(to, from)) / 3.6));
        for (var k = 1; k <= n; k++) R.push({ p: add(from, mul(sub(to, from), k / n)), t: 'l' });
        from = to;
      });
    }
    function strand(a, b, n) {
      for (var k = 0; k < n; k++) {
        var p = add(a, mul(sub(b, a), k / (n - 1)));
        p[2] += (k % 2 ? 0.45 : -0.45);           /* the pleat */
        R.push({ p: p, t: 's' });
      }
    }
    loop([[-1, 15, 5], [-5, 14, 3], [-8.5, 11.5, 1]]);
    var c0 = [-8.2, 9, -1];
    for (var k = 0; k < 13; k++) {
      var th = k * 100 * Math.PI / 180;
      R.push({ p: add(add(c0, mul(axis, 1.5 * k)), add(mul(hu, 2.3 * Math.cos(th)), mul(hv, 2.3 * Math.sin(th)))), t: 'h' });
    }
    loop([[-4, -13, 3], [-0.5, -11.5, 3.5]]);
    strand([0, -8.5, 3], [1, 8, 2], 6);
    loop([[2.6, 11, 1.4], [4.8, 10.6, 0.4]]);
    strand([5.2, 7.8, 0], [4.6, -8, -0.6], 6);
    loop([[6.4, -11.6, 0.4], [9.2, -11, 1.6]]);
    strand([10, -8, 2], [9.6, 8, 1.6], 6);
    loop([[9.4, 12, 3.4], [5.4, 14.2, 6], [1.2, 12.6, 7], [-1.4, 9, 6.2], [-3.4, 5, 7.2]]);

    /* Catmull-Rom through the residues */
    var S = 7, P = [], T = [];
    function cr(p0, p1, p2, p3, t) {
      var t2 = t * t, t3 = t2 * t;
      return [0, 1, 2].map(function (i) {
        return 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3);
      });
    }
    for (var i = 0; i < R.length - 1; i++) {
      var p0 = R[Math.max(0, i - 1)].p, p1 = R[i].p, p2 = R[i + 1].p, p3 = R[Math.min(R.length - 1, i + 2)].p;
      var ty = (R[i].t === R[i + 1].t) ? R[i].t : 'l';
      for (var s = 0; s < S; s++) { P.push(cr(p0, p1, p2, p3, s / S)); T.push(ty); }
    }
    P.push(R[R.length - 1].p); T.push('l');

    /* centre and size the fold */
    var cen = [0, 0, 0];
    P.forEach(function (p) { cen = add(cen, p); });
    cen = mul(cen, 1 / P.length);
    var rad = 0;
    P = P.map(function (p) { var q = sub(p, cen); rad = Math.max(rad, Math.hypot(q[0], q[1], q[2])); return q; });

    /* per-sample tangent, width direction and half-width */
    var n = P.length, TAN = [], W = [], HW = [], HB = [];
    for (i = 0; i < n; i++) TAN.push(norm(sub(P[Math.min(n - 1, i + 1)], P[Math.max(0, i - 1)])));
    for (i = 0; i < n; i++) {
      var t = T[i];
      if (t === 'h') { W.push(norm(sub(axis, mul(TAN[i], dot(axis, TAN[i]))))); HW.push(1.45); }
      else if (t === 's') { W.push(norm(cross(TAN[i], [0, 0, 1]))); HW.push(1.6); }
      else { W.push(null); HW.push(0.3); }
      /* strand ends become arrowheads */
      if (t === 's' && (i === n - 1 || T[i + 1] !== 's')) {
        for (var a = 0; a < 7 && i - a >= 0 && T[i - a] === 's'; a++) HW[i - a] = 0.25 + 2.35 * (a / 6);
      }
    }
    /* helix colour ramps in and out instead of switching hard */
    var hIdx = [];
    for (i = 0; i < n; i++) if (T[i] === 'h') hIdx.push(i);
    for (i = 0; i < n; i++) {
      if (!hIdx.length || i < hIdx[0] - 6 || i > hIdx[hIdx.length - 1] + 6) { HB.push(0); continue; }
      var u = (i - hIdx[0]) / (hIdx[hIdx.length - 1] - hIdx[0]);
      HB.push(Math.max(0, Math.min(1, Math.sin(Math.max(0, Math.min(1, u)) * Math.PI) * 1.6)));
    }
    /* soften width steps at the junctions */
    var HW2 = HW.slice();
    for (i = 2; i < n - 2; i++) if (T[i] !== 's') HW2[i] = (HW[i - 2] + HW[i - 1] + HW[i] + HW[i + 1] + HW[i + 2]) / 5;
    HW = HW2;

    var yaw = 0.6, pitch = 0.32, last = 0, raf = 0, drag = null, size = 0, dpr = 1;
    var light = norm([-0.35, 0.55, 0.8]);

    function resize() {
      var w = host.clientWidth;
      if (!w) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = w;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(w * dpr);
    }
    function rot(v, cy, sy, cx, sx) {
      var x = v[0] * cy + v[2] * sy, z = -v[0] * sy + v[2] * cy;
      return [x, v[1] * cx - z * sx, v[1] * sx + z * cx];
    }
    function draw() {
      if (!size) resize();
      if (!size) return;
      var cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch);
      var sc = size * 0.43 / rad, D = 70, h = size / 2;
      var L = [], Rr = [], Z = [], NN = [];
      for (var i = 0; i < n; i++) {
        var q = rot(P[i], cy, sy, cx, sx), tq = rot(TAN[i], cy, sy, cx, sx);
        var w = W[i] ? rot(W[i], cy, sy, cx, sx) : norm(cross(tq, [0, 0, 1]));
        var e = mul(w, HW[i]);
        var a = add(q, e), b = sub(q, e);
        var fa = D / (D - a[2]), fb = D / (D - b[2]);
        L.push([h + a[0] * sc * fa, h - a[1] * sc * fa]);
        Rr.push([h + b[0] * sc * fb, h - b[1] * sc * fb]);
        Z.push(q[2]);
        NN.push(norm(cross(tq, w)));
      }
      var quads = [];
      for (i = 0; i < n - 1; i++) quads.push(i);
      quads.sort(function (x, y) { return (Z[x] + Z[x + 1]) - (Z[y] + Z[y + 1]); });

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.lineJoin = 'round';
      for (var k = 0; k < quads.length; k++) {
        i = quads[k];
        var lam = Math.abs(dot(NN[i], light));
        var lum = 0.7 + 0.3 * lam + 0.18 * Math.pow(lam, 14);
        var depth = Math.max(0, Math.min(1, (Z[i] + rad) / (2 * rad)));
        lum *= 0.86 + 0.14 * depth;
        var hb = HB[i];
        var base = [242 - 178 * hb, 241 - 124 * hb, 238 - 52 * hb];
        var col = 'rgb(' + (Math.min(255, base[0] * lum) | 0) + ',' + (Math.min(255, base[1] * lum) | 0) + ',' + (Math.min(255, base[2] * lum) | 0) + ')';
        ctx.fillStyle = col;
        ctx.strokeStyle = col;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(L[i][0], L[i][1]); ctx.lineTo(L[i + 1][0], L[i + 1][1]);
        ctx.lineTo(Rr[i + 1][0], Rr[i + 1][1]); ctx.lineTo(Rr[i][0], Rr[i][1]);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        /* crisp outer edges keep the ribbon legible on the paper ground */
        ctx.strokeStyle = 'rgba(52,62,78,' + (0.35 + 0.35 * depth).toFixed(2) + ')';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(L[i][0], L[i][1]); ctx.lineTo(L[i + 1][0], L[i + 1][1]);
        ctx.moveTo(Rr[i][0], Rr[i][1]); ctx.lineTo(Rr[i + 1][0], Rr[i + 1][1]);
        ctx.stroke();
      }
    }
    function frame(ts) {
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
      last = ts;
      if (!drag) yaw += dt * 0.32;
      draw();
      raf = requestAnimationFrame(frame);
    }

    /* drag to turn it by hand */
    cv.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY, yaw: yaw, pitch: pitch };
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', function (e) {
      if (!drag) return;
      yaw = drag.yaw + (e.clientX - drag.x) * 0.012;
      pitch = Math.max(-1.2, Math.min(1.2, drag.pitch + (e.clientY - drag.y) * 0.012));
      if (reduce) draw();
    });
    function release() { drag = null; }
    cv.addEventListener('pointerup', release);
    cv.addEventListener('pointercancel', release);
    window.addEventListener('resize', function () { size = 0; resize(); draw(); }, { passive: true });

    figs.push({
      node: host,
      start: function () {
        resize(); draw();
        if (!reduce) { last = 0; raf = requestAnimationFrame(frame); }
      },
      stop: function () { cancelAnimationFrame(raf); }
    });
  }

  function init() {
    document.querySelectorAll('.bio-arc').forEach(arcs);
    document.querySelectorAll('.bio-mat').forEach(matrix);
    document.querySelectorAll('.bio-aln').forEach(align);
    document.querySelectorAll('.bio-ribbon').forEach(ribbon);
    document.addEventListener('scene:live', function () { setTimeout(sync, 0); });
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('resize', sync, { passive: true });
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
