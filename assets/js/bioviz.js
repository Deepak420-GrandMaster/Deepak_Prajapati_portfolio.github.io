/* ============================================================
   Bio-data figures, drawn as live decorations across the scenes:
     .bio-arc     RNA secondary structure as an arc diagram   (hero)
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

  function init() {
    document.querySelectorAll('.bio-arc').forEach(arcs);
    document.querySelectorAll('.bio-mat').forEach(matrix);
    document.querySelectorAll('.bio-aln').forEach(align);
    document.addEventListener('scene:live', function () { setTimeout(sync, 0); });
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('resize', sync, { passive: true });
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
