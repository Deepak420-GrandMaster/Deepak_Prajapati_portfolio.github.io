/* three-fx — the only Three.js the site ships.
   Built with esbuild so just these classes are included (the full library is
   ~2 MB; this bundle is a fraction of that). Rebuild with tools/README.md.

   Exports:
     - the classes the hero embedding field uses (so it shares this one module)
     - runTunnel(canvas, opts)  the intro fly-through
     - startCables(canvas)      the light-cable field behind the career scene */
import {
  Scene, FogExp2, PerspectiveCamera, WebGLRenderer, Color, BufferGeometry, BufferAttribute,
  Points, PointsMaterial, LineSegments, LineBasicMaterial, Line, Group,
  CatmullRomCurve3, Vector3, CanvasTexture
} from 'three';

export {
  Scene, FogExp2, PerspectiveCamera, WebGLRenderer, Color, BufferGeometry, BufferAttribute,
  Points, PointsMaterial, LineSegments, LineBasicMaterial, Line, Group,
  CatmullRomCurve3, Vector3, CanvasTexture
};

const PAPER = 0xf6f3ec, BRASS = 0xc79a3e, OXIDE = 0x8c2f2a, INK = 0x4a515b;
/* soft round sprite so points read as glints, not squares */
function makeSprite() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ------------------------------------------------------------------
   Intro tunnel: an eight-sided data tunnel the camera flies down.
   Resolves when the flight ends (or is cancelled).
   ------------------------------------------------------------------ */
export function runTunnel(canvas, opts) {
  const duration = (opts && opts.duration) || 1300;
  let cancelled = false, raf = 0;
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });

  const w = window.innerWidth, h = window.innerHeight;
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(PAPER, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(w, h, false);

  const scene = new Scene();
  scene.fog = new FogExp2(PAPER, 0.028);
  const camera = new PerspectiveCamera(72, w / h, 0.1, 300);

  const RINGS = 30, SIDES = 8, R = 6, GAP = 4, TWIST = 0.12;
  const brass = new Color(BRASS), ink = new Color(INK), oxide = new Color(OXIDE);
  const mid = ink.clone().lerp(brass, 0.55);
  const pos = [], col = [];
  const ang = (i, s) => (s / SIDES) * Math.PI * 2 + i * TWIST;
  const at = (i, s) => [Math.cos(ang(i, s)) * R, Math.sin(ang(i, s)) * R, -i * GAP];
  for (let i = 0; i < RINGS; i++) {
    const c = i % 7 === 3 ? oxide : (i % 2 ? brass : mid);
    for (let s = 0; s < SIDES; s++) {
      const a = at(i, s), b = at(i, s + 1);
      pos.push(a[0], a[1], a[2], b[0], b[1], b[2]);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (i < RINGS - 1) {
        const n = at(i + 1, s);
        pos.push(a[0], a[1], a[2], n[0], n[1], n[2]);
        col.push(brass.r, brass.g, brass.b, brass.r, brass.g, brass.b);
      }
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('color', new BufferAttribute(new Float32Array(col), 3));
  scene.add(new LineSegments(geo, new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1 })));

  /* sparks drifting past the walls */
  const N = 320, sp = new Float32Array(N * 3), sc = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = 1.2 + Math.random() * (R - 1.6);
    sp[i * 3] = Math.cos(a) * r; sp[i * 3 + 1] = Math.sin(a) * r; sp[i * 3 + 2] = -Math.random() * RINGS * GAP;
    const c = Math.random() < 0.2 ? oxide : brass;
    sc[i * 3] = c.r; sc[i * 3 + 1] = c.g; sc[i * 3 + 2] = c.b;
  }
  const sGeo = new BufferGeometry();
  sGeo.setAttribute('position', new BufferAttribute(sp, 3));
  sGeo.setAttribute('color', new BufferAttribute(sc, 3));
  scene.add(new Points(sGeo, new PointsMaterial({ size: 0.55, map: makeSprite(), vertexColors: true, transparent: true, opacity: 1, depthWrite: false })));

  const travel = RINGS * GAP - 20;
  const t0 = performance.now();

  function dispose() {
    cancelAnimationFrame(raf);
    geo.dispose(); sGeo.dispose();
    renderer.dispose();
    if (renderer.forceContextLoss) renderer.forceContextLoss();
  }
  function frame(now) {
    const t = Math.min(1, (now - t0) / duration);
    const e = easeInOut(t);
    camera.position.set(Math.sin(t * 5) * 0.35, Math.cos(t * 4) * 0.25, 8 - e * travel);
    camera.rotation.z = e * 0.5;
    renderer.render(scene, camera);
    if (t < 1 && !cancelled) raf = requestAnimationFrame(frame);
    else { dispose(); resolveDone(); }
  }
  raf = requestAnimationFrame(frame);

  return { done, cancel() { cancelled = true; } };
}

/* ------------------------------------------------------------------
   Light cables: slim brass cables curving down a tunnel, with pulses of
   light travelling along them. Renders only while `live` and visible.
   ------------------------------------------------------------------ */
export function startCables(canvas, sceneEl) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(PAPER, 0);

  const scene = new Scene();
  scene.fog = new FogExp2(PAPER, 0.016);
  const camera = new PerspectiveCamera(62, 1, 0.1, 200);
  camera.position.set(0, 0, 12);

  const CABLES = 16, PULSES = 48;
  const curves = [];
  for (let i = 0; i < CABLES; i++) {
    const base = (i / CABLES) * Math.PI * 2 + Math.random() * 0.4;
    const rad = 3 + Math.random() * 5.5;
    const pts = [];
    for (let k = 0; k < 8; k++) {
      const a = base + Math.sin(k * 0.9 + i) * 0.5;
      const r = rad + Math.cos(k * 0.7 + i * 1.3) * 1.6;
      pts.push(new Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.7, 16 - k * 11));
    }
    const curve = new CatmullRomCurve3(pts);
    curves.push(curve);
    const g = new BufferGeometry().setFromPoints(curve.getPoints(140));
    const mat = new LineBasicMaterial({ color: i % 5 === 0 ? OXIDE : BRASS, transparent: true, opacity: 0.55 });
    /* three hair-offset copies read as one cable ~2px wide instead of a 1px line */
    [-0.035, 0, 0.035].forEach((o) => {
      const line = new Line(g, mat);
      line.position.set(o, o * 0.6, 0);
      scene.add(line);
    });
  }

  const tex = makeSprite();
  const pulses = [], pPos = new Float32Array(PULSES * 3), pCol = new Float32Array(PULSES * 3);
  const cB = new Color(BRASS), cO = new Color(OXIDE);
  for (let i = 0; i < PULSES; i++) {
    pulses.push({ curve: curves[i % CABLES], u: Math.random(), v: 0.035 + Math.random() * 0.06 });
    const c = i % 4 === 0 ? cO : cB;
    pCol[i * 3] = c.r; pCol[i * 3 + 1] = c.g; pCol[i * 3 + 2] = c.b;
  }
  const pGeo = new BufferGeometry();
  pGeo.setAttribute('position', new BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new BufferAttribute(pCol, 3));
  scene.add(new Points(pGeo, new PointsMaterial({
    size: 1.2, map: tex, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true
  })));

  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);

  let live = false, raf = 0, last = 0, t = 0, progress = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now; t += dt;
    for (let i = 0; i < PULSES; i++) {
      const p = pulses[i];
      p.u = (p.u + p.v * dt) % 1;
      const v = p.curve.getPoint(p.u);
      pPos[i * 3] = v.x; pPos[i * 3 + 1] = v.y; pPos[i * 3 + 2] = v.z;
    }
    pGeo.attributes.position.needsUpdate = true;
    camera.position.set(Math.sin(t * 0.18) * 0.9, Math.cos(t * 0.14) * 0.6, 12 - progress * 10);
    camera.rotation.z = Math.sin(t * 0.1) * 0.05;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function tick() {
    const should = live && !document.hidden;
    if (should && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    else if (!should && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function check() { live = !sceneEl || sceneEl.classList.contains('is-live'); tick(); }
  if (sceneEl && 'MutationObserver' in window) {
    new MutationObserver(check).observe(sceneEl, { attributes: true, attributeFilter: ['class'] });
  }
  document.addEventListener('visibilitychange', tick);
  check();

  return { setProgress(p) { progress = Math.max(0, Math.min(1, p)); } };
}
