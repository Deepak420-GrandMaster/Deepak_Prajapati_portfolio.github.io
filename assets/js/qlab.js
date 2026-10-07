/* qlab.js — Quantum Lab: a small puzzle game behind the circuit card.
   Build 3-qubit circuits from H, X and CNOT, run 100 simulated measurements
   and match the target histogram. The simulation is a real statevector, not
   a lookup. Progress (stars per level) is kept in localStorage. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ROWS = 3, COLS = 6, SHOTS = 100;
  var STORE = 'dp-qlab';

  var T = {
    en: {
      play: 'Play: build the entangled state', title: 'Quantum Lab', level: 'Level', par: 'Par',
      gates: 'gates', gate: 'gate', run: 'Run ×100', clear: 'Clear', hint: 'Hint', close: 'Close',
      tH: 'H', tX: 'X', tCX: 'CNOT', nH: 'Hadamard', nX: 'Flip', nCX: 'Controlled-NOT',
      qubit: 'Qubit', step: 'Step', empty: 'empty', ctl: 'control', tgt: 'target',
      start: 'Pick a gate, then click a spot on a wire. Click a placed gate to remove it.',
      pickTarget: 'Now click the target qubit in the same step.',
      addFirst: 'Add a gate first, then run.',
      fail: 'Not quite. Compare your bars with the dashed targets and try again.',
      win: 'Entangled! You nailed it.', used: 'You used {n} {u} (par {p}).',
      next: 'Next level', again: 'Play again', done: 'All four levels done. Want to build real AI systems? Let’s talk.',
      measured: 'Measured {n} times', targetNote: 'Dashed = the target',
      locked: 'Locked. Finish the previous level first.',
      mapLabel: 'Order of bits: qubit 0, 1, 2',
      l1t: 'Coin flip', l1g: 'Make qubit 0 a fair coin: about half the shots read 0, half read 1. The other qubits stay 0.',
      l1h: 'Use the Hadamard gate (H) on qubit 0, then Run.',
      l1f: 'H puts a qubit in superposition: both outcomes at once, until you measure.',
      l2t: 'Twins', l2g: 'Make qubits 0 and 1 always agree. Qubit 2 stays 0.',
      l2h: 'H on qubit 0, then a CNOT: pick CNOT, click qubit 0 (control), then qubit 1 (target) in the same step.',
      l2f: 'CNOT flips the target only when the control is 1. That is how entanglement is made.',
      l3t: 'Three of a kind', l3g: 'Make all three qubits agree: only 000 or 111.',
      l3h: 'Entangle 0 → 1, then 1 → 2. Same recipe, one more link.',
      l3f: 'This is a GHZ state: the circuit on my site.',
      l4t: 'Odd one out', l4g: 'Make the qubits disagree: only 010 or 101.',
      l4h: 'Build the GHZ state, then flip qubit 1 with X.',
      l4f: 'X is the quantum NOT. It swaps 0 and 1.'
    },
    fr: {
      play: 'Jouer : créer l’état intriqué', title: 'Labo quantique', level: 'Niveau', par: 'Objectif',
      gates: 'portes', gate: 'porte', run: 'Lancer ×100', clear: 'Effacer', hint: 'Indice', close: 'Fermer',
      tH: 'H', tX: 'X', tCX: 'CNOT', nH: 'Hadamard', nX: 'Inversion', nCX: 'NON contrôlé',
      qubit: 'Qubit', step: 'Étape', empty: 'vide', ctl: 'contrôle', tgt: 'cible',
      start: 'Choisissez une porte, puis cliquez sur un fil. Cliquez sur une porte posée pour la retirer.',
      pickTarget: 'Cliquez maintenant sur le qubit cible, dans la même étape.',
      addFirst: 'Ajoutez d’abord une porte, puis lancez.',
      fail: 'Pas tout à fait. Comparez vos barres aux cibles en pointillés et réessayez.',
      win: 'Intriqué ! Bien joué.', used: 'Vous avez utilisé {n} {u} (objectif {p}).',
      next: 'Niveau suivant', again: 'Rejouer', done: 'Les quatre niveaux sont terminés. Envie de bâtir de vrais systèmes d’IA ? Parlons-en.',
      measured: 'Mesuré {n} fois', targetNote: 'Pointillés = la cible',
      locked: 'Verrouillé. Terminez d’abord le niveau précédent.',
      mapLabel: 'Ordre des bits : qubit 0, 1, 2',
      l1t: 'Pile ou face', l1g: 'Faites du qubit 0 une pièce équilibrée : environ la moitié des mesures donne 0, l’autre 1. Les autres qubits restent à 0.',
      l1h: 'Utilisez la porte de Hadamard (H) sur le qubit 0, puis lancez.',
      l1f: 'H met un qubit en superposition : les deux résultats à la fois, jusqu’à la mesure.',
      l2t: 'Jumeaux', l2g: 'Faites en sorte que les qubits 0 et 1 soient toujours d’accord. Le qubit 2 reste à 0.',
      l2h: 'H sur le qubit 0, puis un CNOT : choisissez CNOT, cliquez le qubit 0 (contrôle), puis le qubit 1 (cible) dans la même étape.',
      l2f: 'CNOT inverse la cible seulement si le contrôle vaut 1. C’est ainsi qu’on crée l’intrication.',
      l3t: 'Brelan', l3g: 'Faites que les trois qubits soient d’accord : seulement 000 ou 111.',
      l3h: 'Intriquez 0 → 1, puis 1 → 2. Même recette, un lien de plus.',
      l3f: 'C’est un état GHZ : le circuit de mon site.',
      l4t: 'L’intrus', l4g: 'Faites que les qubits soient en désaccord : seulement 010 ou 101.',
      l4h: 'Construisez l’état GHZ, puis inversez le qubit 1 avec X.',
      l4f: 'X est le NON quantique. Il échange 0 et 1.'
    }
  };
  function t(k) {
    var d = T[root.lang === 'fr' ? 'fr' : 'en'];
    return d[k] !== undefined ? d[k] : T.en[k];
  }

  var LEVELS = [
    { target: { '000': 0.5, '100': 0.5 }, par: 1 },
    { target: { '000': 0.5, '110': 0.5 }, par: 2 },
    { target: { '000': 0.5, '111': 0.5 }, par: 3 },
    { target: { '010': 0.5, '101': 0.5 }, par: 4 }
  ];
  var LABELS = ['000', '001', '010', '011', '100', '101', '110', '111'];

  /* ---------- statevector simulation (amplitudes are real for H, X, CNOT) ---------- */
  function simulate(gates) {
    var s = [1, 0, 0, 0, 0, 0, 0, 0];
    var R = 1 / Math.SQRT2;
    gates.slice().sort(function (a, b) { return a.col - b.col; }).forEach(function (g) {
      if (g.type === 'H') {
        var m = 1 << (2 - g.row);
        for (var i = 0; i < 8; i++) {
          if (i & m) continue;
          var a = s[i], b = s[i | m];
          s[i] = (a + b) * R; s[i | m] = (a - b) * R;
        }
      } else if (g.type === 'X') {
        var mx = 1 << (2 - g.row);
        for (var j = 0; j < 8; j++) {
          if (j & mx) continue;
          var tmp = s[j]; s[j] = s[j | mx]; s[j | mx] = tmp;
        }
      } else {
        var mc = 1 << (2 - g.c), mt = 1 << (2 - g.t);
        for (var k = 0; k < 8; k++) {
          if ((k & mc) && !(k & mt)) { var u = s[k]; s[k] = s[k | mt]; s[k | mt] = u; }
        }
      }
    });
    return s.map(function (v) { return v * v; });
  }

  /* ---------- state ---------- */
  var level = 0, gates = [], tool = 'H', pending = null, attempts = 0;
  var counts = null, won = false, hintOpen = false;
  var progress = { stars: [0, 0, 0, 0] };
  try { var saved = JSON.parse(window.localStorage.getItem(STORE)); if (saved && saved.stars) progress = saved; } catch (e) { /* ignore */ }
  function save() { try { window.localStorage.setItem(STORE, JSON.stringify(progress)); } catch (e) { /* ignore */ } }
  function unlocked(i) { return i === 0 || progress.stars[i - 1] > 0; }

  function occupant(col, row) {
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      if (g.col !== col) continue;
      if (g.type === 'CX') { if (g.c === row || g.t === row) return g; }
      else if (g.row === row) return g;
    }
    return null;
  }

  /* ---------- dom ---------- */
  var overlay = document.getElementById('qlab');
  if (!overlay) return;
  var lastFocus = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function unit(n) { return n === 1 ? t('gate') : t('gates'); }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }

  function describe(g, row) {
    if (!g) return t('empty');
    if (g.type === 'H') return t('nH');
    if (g.type === 'X') return t('nX');
    return t('nCX') + ' (' + (g.c === row ? t('ctl') : t('tgt')) + ')';
  }

  function build() {
    overlay.textContent = '';
    var panel = el('div', 'qlab-panel');
    panel.setAttribute('role', 'document');

    var top = el('div', 'ql-top');
    var lab = el('span', 'q-label', t('title') + ' · ' + t('level') + ' ' + (level + 1) + '/4');
    var close = el('button', 'ql-close', '×');
    close.type = 'button'; close.setAttribute('aria-label', t('close'));
    close.addEventListener('click', closeGame);
    top.appendChild(lab); top.appendChild(close);

    var title = el('h2', 'ql-title', t('l' + (level + 1) + 't'));
    title.id = 'qlabTitle';
    var goal = el('p', 'ql-goal', t('l' + (level + 1) + 'g'));
    var par = el('p', 'ql-par', t('par') + ': ' + LEVELS[level].par + ' ' + unit(LEVELS[level].par) + ' · ' + t('mapLabel'));

    var board = el('div', 'ql-board');
    for (var r = 0; r < ROWS; r++) {
      var row = el('div', 'qrow');
      row.appendChild(el('span', 'ql', '|0⟩'));
      for (var c = 0; c < COLS; c++) {
        var g = occupant(c, r);
        var b = el('button', 'slot');
        b.type = 'button';
        b.dataset.col = c; b.dataset.row = r;
        b.setAttribute('aria-label', t('qubit') + ' ' + r + ', ' + t('step') + ' ' + (c + 1) + ': ' + describe(g, r));
        if (pending && pending.col === c && pending.row === r) b.classList.add('is-pending');
        if (g) {
          var glyph;
          if (g.type === 'H') { glyph = el('span', 'g g-h', 'H'); }
          else if (g.type === 'X') { glyph = el('span', 'g g-x', 'X'); }
          else if (g.c === r) {
            glyph = el('span', 'g g-c');
            b.style.setProperty('--span', Math.abs(g.t - g.c));
            b.dataset.dir = g.t > g.c ? 'down' : 'up';
          } else { glyph = el('span', 'g g-t'); }
          b.appendChild(glyph);
        }
        row.appendChild(b);
      }
      board.appendChild(row);
    }

    var palette = el('div', 'ql-palette');
    palette.setAttribute('role', 'group');
    [['H', 'tH', 'nH'], ['X', 'tX', 'nX'], ['CX', 'tCX', 'nCX']].forEach(function (p) {
      var pb = el('button', 'qp', t(p[1]));
      pb.type = 'button';
      pb.dataset.tool = p[0];
      pb.setAttribute('aria-pressed', String(tool === p[0]));
      pb.setAttribute('aria-label', t(p[2]));
      pb.title = t(p[2]);
      palette.appendChild(pb);
    });

    var actions = el('div', 'ql-actions');
    var run = el('button', 'btn btn-solid ql-run', t('run'));
    run.type = 'button';
    var clr = el('button', 'btn btn-line', t('clear')); clr.type = 'button'; clr.dataset.act = 'clear';
    var hnt = el('button', 'btn btn-line', t('hint')); hnt.type = 'button'; hnt.dataset.act = 'hint';
    run.dataset.act = 'run';
    actions.appendChild(run); actions.appendChild(clr); actions.appendChild(hnt);

    var msg = el('p', 'ql-msg', hintOpen ? t('l' + (level + 1) + 'h') : t('start'));
    msg.setAttribute('aria-live', 'polite'); msg.id = 'qlMsg';

    var hist = el('div', 'ql-hist');
    hist.setAttribute('aria-hidden', counts ? 'false' : 'true');
    var tgt = LEVELS[level].target;
    LABELS.forEach(function (lbl, i) {
      var col = el('div', 'qh');
      var track = el('div', 'track');
      var ghost = el('i', 'tgt'); ghost.style.setProperty('--t', ((tgt[lbl] || 0) * 100));
      if (!tgt[lbl]) ghost.style.display = 'none';
      var bar = el('div', 'bar');
      bar.style.setProperty('--h', counts ? counts[i] : 0);
      track.appendChild(ghost); track.appendChild(bar);
      col.appendChild(el('span', 'cnt', counts ? String(counts[i]) : ' '));
      col.appendChild(track);
      col.appendChild(el('span', 'lbl', lbl));
      hist.appendChild(col);
    });
    var note = el('p', 'ql-note', counts ? fmt(t('measured'), { n: SHOTS }) + ' · ' + t('targetNote') : t('targetNote'));

    var foot = el('div', 'ql-foot');
    var dots = el('div', 'ql-dots');
    for (var d = 0; d < LEVELS.length; d++) {
      var db = el('button', 'qd', String(d + 1));
      db.type = 'button'; db.dataset.lv = d;
      if (d === level) db.setAttribute('aria-current', 'true');
      if (!unlocked(d)) { db.disabled = true; db.title = t('locked'); }
      var st = progress.stars[d] || 0;
      if (st) db.setAttribute('data-stars', st);
      db.setAttribute('aria-label', t('level') + ' ' + (d + 1) + (st ? ', ' + st + '★' : ''));
      dots.appendChild(db);
    }
    foot.appendChild(dots);

    panel.appendChild(top); panel.appendChild(title); panel.appendChild(goal); panel.appendChild(par);
    panel.appendChild(board); panel.appendChild(palette); panel.appendChild(actions); panel.appendChild(msg);
    panel.appendChild(hist); panel.appendChild(note);
    if (won) panel.appendChild(winBox());
    panel.appendChild(foot);
    overlay.appendChild(panel);
    overlay.setAttribute('aria-labelledby', 'qlabTitle');
  }

  function winBox() {
    var box = el('div', 'ql-win');
    var stars = LevelStars();
    box.appendChild(el('p', 'ql-stars', '★'.repeat(stars) + '☆'.repeat(3 - stars)));
    box.appendChild(el('p', 'ql-winmsg', t('win') + ' ' + fmt(t('used'), { n: gates.length, u: unit(gates.length), p: LEVELS[level].par })));
    box.appendChild(el('p', 'ql-fact', t('l' + (level + 1) + 'f')));
    var row = el('div', 'ql-actions');
    if (level < LEVELS.length - 1) {
      var nx = el('button', 'btn btn-solid', t('next')); nx.type = 'button'; nx.dataset.act = 'next'; row.appendChild(nx);
    } else {
      box.appendChild(el('p', 'ql-fact', t('done')));
      var ag = el('button', 'btn btn-solid', t('again')); ag.type = 'button'; ag.dataset.act = 'restart'; row.appendChild(ag);
    }
    box.appendChild(row);
    return box;
  }
  function LevelStars() {
    var n = gates.length, p = LEVELS[level].par;
    return n <= p ? 3 : (n <= p + 1 ? 2 : 1);
  }

  /* ---------- actions ---------- */
  function setMsg(text) { var m = document.getElementById('qlMsg'); if (m) m.textContent = text; }

  function resetRun() { counts = null; won = false; }

  function onSlot(col, row) {
    var occ = occupant(col, row);
    if (occ) {
      gates.splice(gates.indexOf(occ), 1);
      pending = null; resetRun(); build(); return;
    }
    if (tool === 'CX') {
      if (!pending || pending.col !== col) { pending = { col: col, row: row }; build(); setMsg(t('pickTarget')); return; }
      if (pending.row === row) { pending = null; build(); return; }
      gates.push({ type: 'CX', col: col, c: pending.row, t: row });
      pending = null;
    } else {
      gates.push({ type: tool, col: col, row: row });
    }
    resetRun(); build();
  }

  function run() {
    if (!gates.length) { setMsg(t('addFirst')); return; }
    var p = simulate(gates);
    var c = LABELS.map(function () { return 0; });
    for (var s = 0; s < SHOTS; s++) {
      var r = Math.random(), acc = 0, idx = 7;
      for (var i = 0; i < 8; i++) { acc += p[i]; if (r < acc) { idx = i; break; } }
      c[idx]++;
    }
    attempts++;
    counts = c;
    var tgt = LEVELS[level].target, dist = 0;
    LABELS.forEach(function (lbl, i) { dist += Math.abs(p[i] - (tgt[lbl] || 0)); });
    won = dist < 0.02;
    build();
    /* animate bars up from zero */
    if (!reduce) {
      var bars = overlay.querySelectorAll('.bar');
      [].forEach.call(bars, function (b) { var h = b.style.getPropertyValue('--h'); b.style.setProperty('--h', 0); void b.offsetHeight; b.style.setProperty('--h', h); });
    }
    if (won) {
      var st = LevelStars();
      if (st > (progress.stars[level] || 0)) { progress.stars[level] = st; save(); build(); }
      setMsg(t('win'));
      burst();
      var wb = overlay.querySelector('.ql-win');
      if (wb && wb.scrollIntoView) wb.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    } else {
      setMsg(t('fail'));
      var panel = overlay.querySelector('.qlab-panel');
      if (panel && !reduce) { panel.classList.remove('shake'); void panel.offsetWidth; panel.classList.add('shake'); }
    }
  }

  function burst() {
    if (reduce) return;
    var panel = overlay.querySelector('.qlab-panel');
    if (!panel) return;
    var wrap = el('div', 'confetti');
    var colors = ['#c79a3e', '#8c2f2a', '#7d5f1b', '#396c4f'];
    for (var i = 0; i < 28; i++) {
      var p = el('i');
      var a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 220;
      p.style.setProperty('--dx', Math.round(Math.cos(a) * d) + 'px');
      p.style.setProperty('--dy', Math.round(Math.sin(a) * d - 60) + 'px');
      p.style.setProperty('--r', Math.round(Math.random() * 540) + 'deg');
      p.style.setProperty('--c', colors[i % colors.length]);
      wrap.appendChild(p);
    }
    panel.appendChild(wrap);
    setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 1100);
  }

  function goLevel(i) {
    level = i; gates = []; pending = null; tool = 'H'; attempts = 0; hintOpen = false; resetRun(); build();
    var f = overlay.querySelector('.qp'); if (f) f.focus();
  }

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) { closeGame(); return; }
    var slot = e.target.closest('.slot');
    if (slot) { onSlot(+slot.dataset.col, +slot.dataset.row); var again = overlay.querySelector('.slot[data-col="' + slot.dataset.col + '"][data-row="' + slot.dataset.row + '"]'); if (again) again.focus(); return; }
    var pb = e.target.closest('.qp');
    if (pb) { tool = pb.dataset.tool; pending = null; build(); var np = overlay.querySelector('.qp[data-tool="' + tool + '"]'); if (np) np.focus(); return; }
    var dot = e.target.closest('.qd');
    if (dot && !dot.disabled) { goLevel(+dot.dataset.lv); return; }
    var act = e.target.closest('[data-act]');
    if (!act) return;
    var a = act.dataset.act;
    if (a === 'run') run();
    else if (a === 'clear') { gates = []; pending = null; resetRun(); build(); setMsg(t('start')); }
    else if (a === 'hint') { hintOpen = !hintOpen; setMsg(hintOpen ? t('l' + (level + 1) + 'h') : t('start')); }
    else if (a === 'next') goLevel(level + 1);
    else if (a === 'restart') goLevel(0);
  });

  function openGame(startLevel) {
    lastFocus = document.activeElement;
    var lv = (typeof startLevel === 'number') ? startLevel : firstOpenLevel();
    level = lv; gates = []; pending = null; tool = 'H'; attempts = 0; hintOpen = false; resetRun();
    build();
    overlay.classList.add('is-open');
    overlay.removeAttribute('aria-hidden');
    root.classList.add('qlab-open');
    if (window.__lenis) window.__lenis.stop();
    var f = overlay.querySelector('.qp'); if (f) f.focus();
  }
  function firstOpenLevel() {
    for (var i = 0; i < LEVELS.length; i++) if (!progress.stars[i]) return i;
    return 0;
  }
  function closeGame() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    root.classList.remove('qlab-open');
    if (window.__lenis) window.__lenis.start();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeGame();
  });

  /* triggers */
  var playBtn = document.getElementById('qPlay');
  function labelPlay() { if (playBtn) { var s = playBtn.querySelector('span'); if (s) s.textContent = t('play'); } var mg = document.getElementById('menuGame'); if (mg) mg.textContent = (root.lang === 'fr' ? 'Jouer au jeu quantique' : 'Play the quantum game'); }
  labelPlay();
  if ('MutationObserver' in window) new MutationObserver(labelPlay).observe(root, { attributes: true, attributeFilter: ['lang'] });
  if (playBtn) playBtn.addEventListener('click', function () { openGame(); });
  var menuGame = document.getElementById('menuGame');
  if (menuGame) menuGame.addEventListener('click', function () {
    var mc = document.querySelector('.menu-close'); if (mc) mc.click();
    setTimeout(function () { openGame(); }, 240);
  });
})();
