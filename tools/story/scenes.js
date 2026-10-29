// The six places of the story, each a small low-poly set along a straight road (+X).
// The walker stays near z = 0; the camera sits at +Z, so the sets are dressed behind the road.
import * as THREE from 'three';
import { mat, box, cyl, cone, blob, sphere, patch, rng } from './kit.js';

/** Chapters sit far apart so one set never shows in another; the walk cuts between them. */
export const SPAN = 1000;
/** Where each chapter's walk starts and ends, in the set's own coordinates. */
export const WALK = [14, 32];

// ---------- shared pieces ----------

let glowTex;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}
/** A soft additive halo, standing in for bloom around lamps and windows at night. */
function glow(g, size, color, x, y, z, opacity = 0.8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }));
  s.scale.set(size, size, 1);
  s.position.set(x, y, z);
  g.add(s);
  return s;
}

/** A square frustum: hipped and mansard roofs, plinths. */
function frustum(g, w, d, h, top, color, x, y, z) {
  const geo = new THREE.CylinderGeometry(Math.SQRT1_2 * top, Math.SQRT1_2, 1, 4, 1);
  geo.rotateY(Math.PI / 4);
  const m = new THREE.Mesh(geo, mat(color, { flat: true }));
  m.scale.set(w, h, d);
  m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return m;
}

/** A window on a front face (+Z) at depth z. */
function win(g, x, y, z, w, h, frame, glass, lit = false) {
  box(g, w + 0.12, h + 0.12, 0.05, frame, x, y - 0.06, z + 0.02, { shadow: false });
  box(g, w, h, 0.06, glass, x, y, z + 0.03, lit ? { emissive: 0xFFC27A, ei: 0.9, shadow: false } : { rough: 0.35, shadow: false });
}

function roundTree(g, x, z, s, leaf, trunk = 0x6B4A33) {
  cyl(g, 0.12 * s, 0.18 * s, 2.2 * s, trunk, x, 0, z, 7);
  blob(g, 1.25 * s, leaf, x, 2.9 * s, z);
  blob(g, 0.9 * s, leaf, x + 0.8 * s, 2.5 * s, z + 0.2 * s);
  blob(g, 0.85 * s, leaf, x - 0.7 * s, 2.6 * s, z - 0.3 * s);
}

function cypress(g, x, z, s, leaf) {
  cyl(g, 0.08 * s, 0.12 * s, 0.8 * s, 0x5A4030, x, 0, z, 6);
  cone(g, 0.55 * s, 4.2 * s, leaf, x, 0.6 * s, z, 7);
}

function palm(g, x, z, s, rand) {
  const trunk = mat(0x8A7258, { flat: true });
  let px = x, py = 0;
  const lean = (rand() - 0.5) * 0.25;
  for (let i = 0; i < 7; i++) {
    const seg = cyl(g, 0.13 * s, 0.16 * s, 0.85 * s, trunk, px, py, z, 7);
    seg.rotation.z = lean * (i / 7);
    px -= Math.sin(lean * (i / 7)) * 0.85 * s;
    py += 0.83 * s;
  }
  const crown = new THREE.Group();
  crown.position.set(px, py, z);
  g.add(crown);
  const leaf = mat(0x3E6B3A, { flat: true, side: THREE.DoubleSide });
  const frond = new THREE.ConeGeometry(0.28, 2.6, 3, 1);
  frond.translate(0, 1.3, 0);
  for (let i = 0; i < 9; i++) {
    const f = new THREE.Mesh(frond, leaf);
    f.scale.set(s, s, s * 0.25);
    f.rotation.order = 'YZX';
    f.rotation.y = (i / 9) * Math.PI * 2;
    f.rotation.z = 1.25 + rand() * 0.35;
    f.castShadow = true;
    crown.add(f);
  }
  return crown;
}

function lamp(g, x, z, h, lit, color = 0x2F3236) {
  cyl(g, 0.05, 0.07, h, color, x, 0, z, 6);
  box(g, 0.06, 0.06, 0.7, color, x, h - 0.05, z + 0.3);
  box(g, 0.32, 0.12, 0.42, lit ? 0xFFE3A8 : 0xDCD6C8, x, h - 0.2, z + 0.6, lit ? { emissive: 0xFFD08A, ei: 1.6, shadow: false } : { shadow: false });
  if (lit) glow(g, 2.4, 0xFFC77A, x, h - 0.3, z + 0.6, 0.7);
}

function pole(g, x, z, h = 6.5) {
  cyl(g, 0.07, 0.1, h, 0x7D756A, x, 0, z, 6);
  box(g, 1.2, 0.08, 0.08, 0x5E574E, x, h - 0.5, z);
}
function wires(g, x0, x1, z, h = 6) {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push(new THREE.Vector3(x0 + (x1 - x0) * t, h - Math.sin(t * Math.PI) * 0.45, z));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  for (const dz of [-0.45, 0.45]) {
    const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x2E2A26, transparent: true, opacity: 0.55 }));
    l.position.z = dz;
    g.add(l);
  }
}

function ground(g, color, road, roadW = 3.4) {
  patch(g, 400, 220, color, 25, -60, 0);
  patch(g, 400, roadW, road, 25, 0, 0.01);
}

// ---------- 01 Vadodara, dawn ----------

function indianHouse(g, x, z, w, h, d, color, rand, opts = {}) {
  box(g, w, h, d, color, x, 0, z);
  box(g, w + 0.2, 0.16, d + 0.2, 0xEFE6D6, x, h, z);
  for (const [sx, sz, ww, dd] of [[0, d / 2, w, 0.1], [0, -d / 2, w, 0.1], [w / 2, 0, 0.1, d], [-w / 2, 0, 0.1, d]]) {
    box(g, ww + 0.1, 0.45, dd + 0.1, color, x + sx, h + 0.16, z + sz);
  }
  const front = z + d / 2;
  box(g, 0.95, 2.05, 0.06, opts.door ?? 0x5C3A2A, x - w * 0.18, 0, front + 0.03);
  box(g, 1.25, 0.12, 0.6, 0xBFB3A0, x - w * 0.18, 0, front + 0.3);
  win(g, x + w * 0.22, 1.45, front, 0.9, 0.85, 0xEFE6D6, opts.glass ?? 0x2F5C63);
  if (h > 5) {
    win(g, x - w * 0.18, 4.2, front, 0.9, 0.85, 0xEFE6D6, opts.glass ?? 0x2F5C63);
    win(g, x + w * 0.22, 4.2, front, 0.9, 0.85, 0xEFE6D6, opts.glass ?? 0x2F5C63);
    box(g, w * 0.6, 0.1, 0.8, 0xEFE6D6, x, 3.1, front + 0.4); // chajja over the door
  } else {
    box(g, w * 0.7, 0.08, 0.55, 0xEFE6D6, x, 2.35, front + 0.27);
  }
  if (opts.tank !== false && rand() > 0.3) cyl(g, 0.45, 0.45, 0.85, 0x1F2224, x + w * 0.25, h + 0.16, z - d * 0.2, 12);
}

function domeHall(g, x, z, s) {
  const stone = 0xB86F4C, trim = 0xF0E2C8;
  box(g, 22 * s, 7 * s, 8 * s, stone, x, 0, z);
  box(g, 22.6 * s, 0.4 * s, 8.6 * s, trim, x, 7 * s, z);
  for (let i = -4; i <= 4; i++) {
    box(g, 1.2 * s, 2.6 * s, 0.2 * s, 0x6E3B27, x + i * 2.3 * s, 1.2 * s, z + 4 * s);
    sphere(g, 0.6 * s, 0x6E3B27, x + i * 2.3 * s, 3.8 * s, z + 4 * s);
  }
  box(g, 8 * s, 4 * s, 7 * s, stone, x, 7 * s, z);
  cyl(g, 3.2 * s, 3.4 * s, 2 * s, trim, x, 11 * s, z, 24);
  const dome = sphere(g, 3.3 * s, 0xC9845E, x, 13 * s, z, { shadow: true });
  dome.scale.y = 3.9 * s;
  cone(g, 0.3 * s, 1.6 * s, 0xD9B46A, x, 16.6 * s, z, 8);
  for (const sx of [-1, 1]) {
    box(g, 2.4 * s, 9 * s, 2.4 * s, stone, x + sx * 10 * s, 0, z + 2.6 * s);
    const d = sphere(g, 1.25 * s, 0xC9845E, x + sx * 10 * s, 9 * s, z + 2.6 * s, { shadow: true });
    d.scale.y = 1.5 * s;
  }
}

function banyan(g, x, z, s) {
  const bark = 0x6E5B47;
  cyl(g, 0.55 * s, 0.85 * s, 3.4 * s, bark, x, 0, z, 9);
  for (const [dx, dz, r] of [[0, 0, 2.4], [2.4, 0.4, 1.9], [-2.3, -0.2, 2], [1.1, -1.4, 1.8], [-1, 1.2, 1.7], [3.8, -0.4, 1.4], [-3.7, 0.5, 1.5]]) {
    const b = blob(g, r * s, 0x5C7E3C, x + dx * s, 4.4 * s + (r - 1.8) * 0.6, z + dz * s);
    b.scale.y *= 0.62;
  }
  const r = rng(7);
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2, d = (1.6 + r() * 2.2) * s, len = (1.4 + r() * 1.6) * s;
    cyl(g, 0.012 * s, 0.02 * s, len, 0x9A8668, x + Math.cos(a) * d, 3.6 * s - len, z + Math.sin(a) * d * 0.6, 4, { shadow: false });
  }
}

function rickshaw(g, x, z, ry = 0) {
  const r = new THREE.Group();
  r.position.set(x, 0, z);
  r.rotation.y = ry;
  g.add(r);
  box(r, 2.3, 0.85, 1.25, 0x1E6B3A, 0, 0.35, 0);
  box(r, 2.35, 0.12, 1.32, 0xF0C419, 0, 1.75, 0);
  const top = box(r, 2.1, 0.55, 1.3, 0xF0C419, -0.05, 1.25, 0);
  top.scale.y = 0.55;
  box(r, 0.08, 0.6, 1.2, 0x2B3A3F, 0.95, 1.2, 0, { opacity: 0.6 });
  for (const [wx, wz] of [[0.95, 0], [-0.8, 0.6], [-0.8, -0.6]]) {
    const w = cyl(r, 0.24, 0.24, 0.16, 0x1A1A1A, wx, 0.24, wz, 12);
    w.rotation.x = Math.PI / 2;
    w.position.y = 0.24;
  }
}

function kite(g, x, y, z, color, rot) {
  const shape = new THREE.Shape([new THREE.Vector2(0, 0.55), new THREE.Vector2(0.42, 0), new THREE.Vector2(0, -0.55), new THREE.Vector2(-0.42, 0)]);
  const k = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat(color, { side: THREE.DoubleSide }));
  k.position.set(x, y, z);
  k.rotation.z = rot;
  g.add(k);
  return k;
}

function vadodara() {
  const g = new THREE.Group();
  const r = rng(11);
  ground(g, 0xA8A468, 0xCFA884, 3.6);
  patch(g, 400, 1.2, 0xBE9E72, 25, -2.4, 0.008);
  const colors = [0xE5B3A3, 0x8EC3BC, 0xEACB86, 0xEBDCC4, 0xC9B6D9, 0xF0C9A0];
  let x = -6;
  while (x < 62) {
    const w = 4.2 + r() * 2.6, h = r() > 0.72 ? 6.2 : 3.3 + r() * 0.6;
    indianHouse(g, x + w / 2, -10.5 - r() * 1.5, w, h, 5, colors[Math.floor(r() * colors.length)], r);
    x += w + 1.2 + r() * 3.2;
  }
  domeHall(g, 34, -46, 1.2);
  banyan(g, 24, -6.6, 1);
  roundTree(g, 6, -6.2, 1.1, 0x6E8A3E);
  roundTree(g, 44, -6, 1.2, 0x668A3E);
  roundTree(g, 52, -14, 1.6, 0x58733A);
  roundTree(g, 12, -16, 1.5, 0x627C3D);
  for (let i = -1; i < 7; i++) pole(g, i * 11 + 3, -2.9);
  wires(g, -8, 74, -2.9, 6.05);
  rickshaw(g, 30, -2.6, 0.08);
  for (let i = 0; i < 26; i++) blob(g, 0.25 + r() * 0.35, 0x6F8A45, r() * 66 - 6, 0.12, -3.2 - r() * 1.4);
  const kites = [];
  const kc = [0xE04848, 0xF0C419, 0x3B82C4, 0xE86AA8, 0x37A36B];
  for (let i = 0; i < 7; i++) kites.push(kite(g, 4 + i * 8 + r() * 4, 12 + r() * 8, -24 - r() * 10, kc[i % kc.length], r() - 0.5));
  return {
    group: g,
    update(t) { kites.forEach((k, i) => { k.position.y += Math.sin(t * 0.9 + i) * 0.004; k.rotation.z = Math.sin(t * 0.7 + i * 2) * 0.35; }); },
  };
}

// ---------- 02 First job: market research, morning ----------

function stall(g, x, z, awning, rand) {
  box(g, 2.6, 0.9, 1.3, 0x8B6A4A, x, 0, z);
  for (const sx of [-1.2, 1.2]) for (const sz of [-0.55, 0.55]) cyl(g, 0.04, 0.04, 2.5, 0x5B4636, x + sx, 0, z + sz, 5);
  const stripes = 5;
  for (let i = 0; i < stripes; i++) {
    const a = box(g, 2.8 / stripes, 0.06, 1.7, i % 2 ? 0xF4EDE0 : awning, x - 1.4 + (i + 0.5) * (2.8 / stripes), 2.45, z + 0.15);
    a.rotation.x = 0.18;
  }
  const fruit = [0xE2572B, 0xF0B429, 0x7DAA3C, 0xC2362F, 0xF2E3A0];
  for (let i = 0; i < 4; i++) {
    const c = fruit[Math.floor(rand() * fruit.length)];
    for (let j = 0; j < 5; j++) sphere(g, 0.1, c, x - 1 + i * 0.65 + (rand() - 0.5) * 0.3, 0.98 + rand() * 0.1, z + (rand() - 0.5) * 0.8, { shadow: false });
  }
}

function shop(g, x, z, w, h, color, sign, rand) {
  box(g, w, h, 4, color, x, 0, z);
  const front = z + 2;
  box(g, w - 0.6, 2.6, 0.05, 0x7A5E46, x, 0, front + 0.02); // open shopfront
  box(g, w - 1, 0.08, 0.3, 0xD8C8A8, x, 1.3, front + 0.1, { shadow: false });
  for (let i = 0; i < 4; i++) box(g, 0.3, 0.35, 0.2, [0xE2572B, 0xF0B429, 0x2F8F5B, 0x3B82C4][i], x - w * 0.3 + i * w * 0.2, 1.38, front + 0.12, { shadow: false });
  box(g, w - 0.4, 0.7, 0.12, sign, x, 2.8, front + 0.06);
  for (let f = 1; f < Math.floor(h / 3); f++) {
    for (let i = 0; i < 2; i++) win(g, x - w * 0.22 + i * w * 0.44, f * 3 + 1.3, front, 0.9, 1.1, 0xE6DDCC, 0x34505A);
    box(g, w * 0.8, 0.08, 0.7, 0xD9CFBE, x, f * 3 + 0.35, front + 0.35);
    box(g, 0.6, 0.45, 0.35, 0xE8E6E0, x + w * 0.3, f * 3 + 0.5, front + 0.2); // a/c unit
  }
  box(g, w, 0.2, 4.1, 0xE9E1D2, x, h, z);
  if (rand() > 0.5) cyl(g, 0.4, 0.4, 0.8, 0x1F2224, x, h + 0.2, z - 0.6, 12);
}

function bunting(g, x0, x1, y, z, rand) {
  const cols = [0xE04848, 0xF0C419, 0x2F8F5B, 0x3B82C4, 0xF08A24];
  const n = Math.floor((x1 - x0) / 0.6);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const shape = new THREE.Shape([new THREE.Vector2(-0.18, 0), new THREE.Vector2(0.18, 0), new THREE.Vector2(0, -0.34)]);
    const f = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat(cols[Math.floor(rand() * cols.length)], { side: THREE.DoubleSide }));
    f.position.set(x0 + (x1 - x0) * t, y - Math.sin(t * Math.PI) * 0.5, z);
    g.add(f);
  }
}

function scooter(g, x, z) {
  const s = new THREE.Group();
  s.position.set(x, 0, z);
  g.add(s);
  box(s, 1.3, 0.35, 0.4, 0xD9473F, 0, 0.3, 0);
  box(s, 0.5, 0.15, 0.36, 0x222222, -0.2, 0.68, 0);
  box(s, 0.12, 0.8, 0.12, 0x555555, 0.55, 0.3, 0);
  for (const wx of [-0.5, 0.55]) {
    const w = cyl(s, 0.2, 0.2, 0.12, 0x1A1A1A, wx, 0.2, 0, 12);
    w.rotation.x = Math.PI / 2;
    w.position.y = 0.2;
  }
}

function chaiCart(g, x, z) {
  box(g, 1.6, 0.95, 0.9, 0x2F6E8E, x, 0.25, z);
  for (const sx of [-0.6, 0.6]) {
    const w = cyl(g, 0.25, 0.25, 0.1, 0x1F1F1F, x + sx, 0.25, z + 0.48, 12);
    w.rotation.x = Math.PI / 2;
    w.position.y = 0.25;
  }
  cyl(g, 0.16, 0.18, 0.3, 0xB8B8B8, x - 0.3, 1.2, z, 12);
  for (let i = 0; i < 4; i++) cyl(g, 0.04, 0.035, 0.09, 0xF3EDE0, x + 0.15 + i * 0.12, 1.2, z + 0.2, 8);
}

function market() {
  const g = new THREE.Group();
  const r = rng(23);
  ground(g, 0xB9AE8E, 0xA9A396, 3.6);
  patch(g, 400, 6, 0xC4B79E, 25, -5.2, 0.008);
  const colors = [0xE8C9A0, 0xD98E6A, 0x9DC4C9, 0xE6D27E, 0xD4B6C9, 0xEFE4D0];
  const signs = [0xC2362F, 0x2F6E8E, 0xE89A2A, 0x2F8F5B, 0x6B4AA0];
  let x = -6;
  while (x < 64) {
    const w = 4 + r() * 2.2;
    shop(g, x + w / 2, -11.5, w, r() > 0.4 ? 9 : 6, colors[Math.floor(r() * colors.length)], signs[Math.floor(r() * signs.length)], r);
    x += w + 0.15;
  }
  for (let i = 0; i < 6; i++) stall(g, -2 + i * 9.5 + r() * 2, -6.2, signs[i % signs.length], r);
  bunting(g, 4, 20, 5.2, -6, r);
  bunting(g, 24, 42, 5.2, -6, r);
  bunting(g, 46, 62, 5.2, -6, r);
  chaiCart(g, 25, -3.1);
  scooter(g, 9.5, -2.6);
  scooter(g, 37.5, -2.7);
  scooter(g, 39, -2.9);
  for (let i = 0; i < 18; i++) box(g, 0.5, 0.35, 0.4, r() > 0.5 ? 0xC9A26B : 0xB08A5A, r() * 64 - 4, 0, -3.3 - r() * 1.6);
  roundTree(g, 18, -13, 1.6, 0x5C7A3A);
  roundTree(g, 54, -13, 1.5, 0x5C7A3A);
  return { group: g };
}

// ---------- 03 Numerator, noon ----------

function tower(g, x, z, w, h, d, tint) {
  box(g, w, h, d, tint, x, 0, z, { rough: 0.25, metal: 0.35 });
  for (let y = 3.5; y < h; y += 3.5) box(g, w + 0.06, 0.18, d + 0.06, 0xD8DEE3, x, y, z, { shadow: false });
  for (let i = 1; i < 4; i++) box(g, 0.12, h, 0.08, 0xC9D1D8, x - w / 2 + (w * i) / 4, 0, z + d / 2 + 0.02, { shadow: false });
}

function shelfRow(g, x, z, rand) {
  box(g, 3.2, 1.9, 0.6, 0xE4E7EA, x, 0, z);
  const cols = [0xE2572B, 0xF0B429, 0x2F8F5B, 0x3B82C4, 0xC2362F, 0x8E5BB8, 0xF2E3A0, 0x1E9E9E];
  for (let s = 0; s < 3; s++) {
    box(g, 3.2, 0.04, 0.7, 0xB9BFC4, x, 0.25 + s * 0.6, z + 0.05, { shadow: false });
    let px = x - 1.5;
    while (px < x + 1.45) {
      const w = 0.16 + rand() * 0.16, h = 0.22 + rand() * 0.25;
      box(g, w, h, 0.22, cols[Math.floor(rand() * cols.length)], px + w / 2, 0.29 + s * 0.6, z + 0.25, { shadow: false });
      px += w + 0.03;
    }
  }
}

function cart(g, x, z, ry) {
  const c = new THREE.Group();
  c.position.set(x, 0, z);
  c.rotation.y = ry;
  g.add(c);
  const wire = mat(0xA7B0B8, { metal: 0.6, rough: 0.4 });
  box(c, 0.9, 0.5, 0.55, wire, 0, 0.45, 0, { opacity: 0.85 });
  box(c, 0.05, 0.6, 0.55, wire, -0.48, 0.5, 0);
  for (const [wx, wz] of [[-0.35, -0.22], [-0.35, 0.22], [0.35, -0.22], [0.35, 0.22]]) sphere(c, 0.07, 0x222222, wx, 0.07, wz);
  box(c, 0.25, 0.2, 0.2, 0xF0B429, 0.15, 0.95, 0);
  box(c, 0.2, 0.25, 0.18, 0x3B82C4, -0.12, 0.95, 0.05);
}

function bars(g, x, z, rand) {
  const cols = [0x2F8F5B, 0x3B82C4, 0xF0B429, 0xE2572B];
  const bars = [];
  for (let i = 0; i < 6; i++) {
    const h = 0.8 + i * 0.45 + rand() * 0.4;
    bars.push(box(g, 0.55, h, 0.55, cols[i % cols.length], x + i * 0.8, 0.3, z, { rough: 0.5 }));
  }
  box(g, 5.4, 0.3, 1.2, 0xD9D4CA, x + 2, 0, z);
  return bars;
}

function numerator() {
  const g = new THREE.Group();
  const r = rng(37);
  ground(g, 0xC9CCC2, 0x8F959A, 3.6);
  patch(g, 400, 4, 0xD9D6CC, 25, -4, 0.008);
  for (let x = -6; x < 66; x += 4.2) patch(g, 0.08, 4, 0xC4C0B5, x, -4, 0.012);
  const tints = [0x7FA4BE, 0x98B6C9, 0x6E8FA8, 0xA9C1CF];
  const spots = [[-2, -26, 9, 30, 9], [10, -34, 10, 42, 10], [24, -22, 8, 24, 8], [38, -30, 11, 36, 10], [52, -24, 9, 28, 9], [64, -32, 10, 40, 10]];
  spots.forEach(([x, z, w, h, d], i) => tower(g, x, z, w, h, d, tints[i % tints.length]));
  // a supermarket with its shelves showing through the glass
  const sx = 23;
  box(g, 26, 5.2, 0.4, 0xEDEBE6, sx, 0, -18.8); // back wall
  for (const ex of [-13, 13]) box(g, 0.4, 5.2, 9, 0xEDEBE6, sx + ex, 0, -14.5);
  box(g, 26.4, 0.4, 9.4, 0xE2E0DA, sx, 4.8, -14.5);
  box(g, 26, 0.02, 9, 0xD8DCDF, sx, 0.01, -14.5, { shadow: false });
  for (let i = 0; i < 4; i++) box(g, 3.5, 0.08, 0.5, 0xFFFFFF, sx - 9 + i * 6, 4.7, -14, { emissive: 0xFFFFFF, ei: 0.6, shadow: false });
  box(g, 26.4, 0.9, 0.5, 0x2F8F5B, sx, 4.4, -9.8);
  box(g, 24, 3.8, 0.06, 0xBFD4DE, sx, 0.3, -9.98, { opacity: 0.28, rough: 0.1 });
  for (let i = 0; i < 6; i++) box(g, 0.14, 4, 0.12, 0xB9C0C6, sx - 12 + i * 4.8, 0.2, -9.92);
  for (let i = 0; i < 6; i++) shelfRow(g, sx - 10 + i * 4, -12.2, r);
  for (let i = 0; i < 5; i++) cart(g, 8 + i * 1.1 + r() * 0.3, -5.6 - r() * 0.4, 0.2 * (r() - 0.5));
  cart(g, 39, -5.9, 0.4);
  const chart = bars(g, 42, -4.6, r);
  for (let i = 0; i < 8; i++) {
    const px = -4 + i * 9.2;
    cyl(g, 0.65, 0.55, 0.6, 0xD2CEC4, px, 0, -2.6, 10);
    blob(g, 0.6, 0x5C8A45, px, 0.95, -2.6);
  }
  for (let i = 0; i < 12; i++) cyl(g, 0.08, 0.08, 0.7, 0x5D6670, i * 6 - 4, 0, -2.0, 6);
  for (let i = 0; i < 5; i++) lamp(g, i * 14 - 2, -2.3, 5.2, false);
  return {
    group: g,
    update(t) { chart.forEach((b, i) => { b.scale.y = (0.8 + i * 0.45) * (1 + 0.06 * Math.sin(t * 1.3 + i)); b.position.y = 0.3 + b.scale.y / 2; }); },
  };
}

// ---------- 04 IIT Ropar, golden hour ----------

function campusBlock(g, x, z, w, h, d, wall, accent) {
  box(g, w, h, d, wall, x, 0, z);
  box(g, w + 0.4, 0.35, d + 0.4, 0xEDE7DC, x, h, z);
  const front = z + d / 2;
  for (let y = 1; y < h - 1; y += 3.2) {
    box(g, w - 0.8, 1.4, 0.05, 0x2F4650, x, y + 0.5, front + 0.02, { rough: 0.3 });
    box(g, w, 0.3, 0.9, 0xEDE7DC, x, y + 2.1, front + 0.45);
  }
  for (let i = 0; i <= 6; i++) box(g, 0.3, h, 0.5, accent, x - w / 2 + (w * i) / 6, 0, front + 0.25);
}

function hills(g, color, z, rand) {
  for (let i = 0; i < 9; i++) {
    const b = blob(g, 14 + rand() * 10, color, -40 + i * 16 + rand() * 6, -4, z - rand() * 20, 1, { shadow: false });
    b.scale.y *= 0.45;
  }
}

function bicycle(g, x, z) {
  const b = new THREE.Group();
  b.position.set(x, 0, z);
  g.add(b);
  for (const wx of [-0.5, 0.5]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 6, 18), mat(0x1E1E1E));
    w.position.set(wx, 0.34, 0);
    b.add(w);
  }
  const frame = mat(0x2E6BD6);
  const top = box(b, 0.9, 0.04, 0.04, frame, 0, 0.72, 0);
  top.rotation.z = 0.08;
  const down = box(b, 0.75, 0.04, 0.04, frame, 0.05, 0.5, 0);
  down.rotation.z = -0.6;
  box(b, 0.2, 0.04, 0.1, 0x1E1E1E, -0.3, 0.85, 0);
  box(b, 0.04, 0.4, 0.04, frame, 0.45, 0.6, 0);
}

function ropar() {
  const g = new THREE.Group();
  const r = rng(53);
  ground(g, 0x93A35E, 0xC7B08A, 3.4);
  patch(g, 400, 26, 0x5E8FA6, 25, -46, 0.02, { rough: 0.2, metal: 0.2 }); // the Sutlej
  patch(g, 400, 3, 0xBDA982, 25, -32, 0.015);
  hills(g, 0x6E8455, -78, r);
  hills(g, 0x86956A, -66, r);
  campusBlock(g, 2, -16, 14, 6.4, 8, 0xB7684A, 0xE3D7C5);
  campusBlock(g, 30, -22, 20, 9.6, 9, 0xEDE7DC, 0xB7684A);
  campusBlock(g, 58, -16, 13, 6.4, 8, 0xB7684A, 0xE3D7C5);
  box(g, 70, 0.12, 2.2, 0xD6CDBE, 25, 0, -8.5, { shadow: false });
  for (let i = 0; i < 9; i++) cypress(g, -4 + i * 8.5 + r() * 2, -4.6 - r() * 1.2, 1.1 + r() * 0.5, 0x4E6B38);
  roundTree(g, 18, -24, 1.7, 0x62803E);
  roundTree(g, 45, -25, 1.8, 0x5E7A3A);
  for (let i = 0; i < 5; i++) bicycle(g, 36 + i * 0.75, -3.4);
  for (let i = 0; i < 6; i++) lamp(g, i * 12 - 2, -2.4, 4.6, false, 0x3E3A36);
  for (let i = 0; i < 30; i++) blob(g, 0.25 + r() * 0.25, 0x6E8A45, r() * 66 - 6, 0.1, -2.8 - r() * 2);
  return { group: g };
}

// ---------- 05 Montpellier, dusk ----------

function parisian(g, x, z, w, floors, rand, lit) {
  const stone = [0xE6D6B8, 0xEDDFC4, 0xDCC9A8][Math.floor(rand() * 3)];
  const h = 1 + floors * 3.1;
  box(g, w, h, 8, stone, x, 0, z);
  const front = z + 4;
  box(g, w + 0.2, 0.25, 8.2, 0xF2E8D6, x, 3.6, z);
  const cols = Math.max(2, Math.floor(w / 2.2));
  for (let f = 0; f < floors; f++) {
    const y = f === 0 ? 0 : 1 + f * 3.1;
    for (let c = 0; c < cols; c++) {
      const wx = x - w / 2 + (w / cols) * (c + 0.5);
      if (f === 0) {
        const on = lit && rand() > 0.25;
        box(g, w / cols - 0.6, 2.7, 0.06, on ? 0xFFD7A0 : 0x2E3540, wx, 0, front + 0.03, on ? { emissive: 0xFFB561, ei: 0.8, shadow: false } : { shadow: false });
        if (on) glow(g, 2.2, 0xFFB561, wx, 1.4, front + 0.6, 0.35);
      } else {
        const on = lit && rand() > 0.6;
        win(g, wx, y + 0.5, front, 0.95, 1.7, 0xF4ECDD, on ? 0xFFD49A : 0x3B4652, on);
        box(g, 0.32, 1.7, 0.05, 0x7B8C99, wx - 0.68, y + 0.5, front + 0.04, { shadow: false });
        box(g, 0.32, 1.7, 0.05, 0x7B8C99, wx + 0.68, y + 0.5, front + 0.04, { shadow: false });
        if (f === 1 || f === floors - 1) box(g, 1.4, 0.55, 0.35, 0x24272B, wx, y + 0.05, front + 0.2, { opacity: 0.85 });
      }
    }
  }
  frustum(g, w, 8, 2.2, 0.72, 0x5D6977, x, h, z);
  for (let c = 0; c < cols; c += 2) box(g, 0.8, 1, 0.6, 0x5D6977, x - w / 2 + (w / cols) * (c + 0.5), h + 0.5, front - 0.9);
  if (rand() > 0.4) box(g, 0.5, 1.2, 0.6, 0xC9A68A, x + w * 0.3, h + 1.4, z);
}

function arch(g, x, z, s) {
  const stone = 0xE2D2B2;
  box(g, 4 * s, 13 * s, 4 * s, stone, x - 5 * s, 0, z);
  box(g, 4 * s, 13 * s, 4 * s, stone, x + 5 * s, 0, z);
  box(g, 14 * s, 4.5 * s, 4 * s, stone, x, 11 * s, z);
  box(g, 14.6 * s, 0.6 * s, 4.4 * s, 0xF0E4CC, x, 15.5 * s, z);
  const a = new THREE.Mesh(new THREE.TorusGeometry(3 * s, 0.5 * s, 6, 20, Math.PI), mat(stone));
  a.position.set(x, 10.5 * s, z + 2 * s);
  g.add(a);
}

function planeTree(g, x, z, s) {
  const trunk = cyl(g, 0.2 * s, 0.28 * s, 3 * s, 0xA59C84, x, 0, z, 8);
  trunk.material = mat(0xA59C84);
  box(g, 0.3 * s, 0.6 * s, 0.05, 0xD8CFB4, x + 0.12 * s, 0.8 * s, z + 0.24 * s, { shadow: false });
  blob(g, 1.7 * s, 0x6F7F45, x, 4.1 * s, z);
  blob(g, 1.2 * s, 0x7A8A4D, x + 1.2 * s, 3.6 * s, z + 0.3);
  blob(g, 1.2 * s, 0x667641, x - 1.1 * s, 3.8 * s, z - 0.2);
}

function tram(g, x, z) {
  const t = new THREE.Group();
  t.position.set(x, 0, z);
  g.add(t);
  const blue = mat(0x2A5DA8, { rough: 0.35 });
  for (let i = 0; i < 3; i++) {
    const car = box(t, 7.4, 2.8, 2.5, blue, i * 7.6, 0.35, 0);
    car.material = blue;
    box(t, 6.4, 1.1, 0.04, 0xFFE2B0, i * 7.6, 1.6, 1.27, { emissive: 0xFFC47A, ei: 0.7, shadow: false });
    for (let b = 0; b < 4; b++) {
      const bird = box(t, 0.5, 0.12, 0.04, 0xFFFFFF, i * 7.6 - 2.6 + b * 1.6, 0.8, 1.28, { shadow: false });
      bird.rotation.z = 0.35;
    }
  }
  const nose = sphere(t, 1.3, 0x2A5DA8, 18.6, 1.75, 0, { shadow: true });
  nose.scale.set(1.2, 1.1, 0.96);
  box(t, 23, 0.06, 0.08, 0x4C4C4C, 7.6, 0, 0.72);
  box(t, 23, 0.06, 0.08, 0x4C4C4C, 7.6, 0, -0.72);
}

function montpellier() {
  const g = new THREE.Group();
  const r = rng(71);
  ground(g, 0xB9B3A4, 0x9B9488, 3.6);
  patch(g, 400, 4, 0xCFC6B4, 25, -5.6, 0.008);
  for (let x = -8; x < 70; x += 1.2) patch(g, 0.05, 4, 0xBDB3A0, x, -5.6, 0.012);
  let x = -8;
  while (x < 66) {
    const w = 8 + r() * 4;
    parisian(g, x + w / 2, -15.5, w, 3 + Math.floor(r() * 2), r, true);
    x += w + 0.2;
  }
  arch(g, 30, -46, 1.1);
  tram(g, 2, -2.9);
  for (let i = 0; i < 7; i++) planeTree(g, -2 + i * 10, -8.5, 1.05);
  for (let i = 0; i < 7; i++) lamp(g, i * 10 + 3, -2.2, 4.6, true, 0x24272B);
  for (let i = 0; i < 4; i++) {
    box(g, 0.7, 0.75, 0.7, 0x2F3236, 40 + i * 1.8, 0, -4.6); // café tables
    cyl(g, 0.04, 0.04, 2.3, 0x2F3236, 40 + i * 1.8, 0.75, -4.6, 4);
    cone(g, 0.95, 0.5, 0xB23B3B, 40 + i * 1.8, 2.7, -4.6, 8);
  }
  return { group: g };
}

// ---------- 06 Nice, night ----------

function chairsBleues(g, x, z, ry) {
  const c = new THREE.Group();
  c.position.set(x, 0, z);
  c.rotation.y = ry;
  g.add(c);
  const blue = mat(0x2C6FB5);
  const seat = box(c, 0.6, 0.06, 0.65, blue, 0, 0.42, 0);
  seat.rotation.x = -0.12;
  const back = box(c, 0.6, 0.7, 0.06, blue, 0, 0.45, -0.38);
  back.rotation.x = -0.35;
  for (const sx of [-0.27, 0.27]) {
    box(c, 0.04, 0.45, 0.04, 0xD9DCE0, sx, 0, 0.25);
    box(c, 0.04, 0.45, 0.04, 0xD9DCE0, sx, 0, -0.3);
    box(c, 0.05, 0.05, 0.6, blue, sx + Math.sign(sx) * 0.03, 0.7, 0);
  }
}

function seaMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, moon: { value: new THREE.Color(0xDCE6FF) }, origin: { value: new THREE.Vector3() } },
    fog: false,
    vertexShader: 'uniform vec3 origin; varying vec3 vW; void main(){ vW = position + origin; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float time; uniform vec3 moon; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.7); }
      void main(){
        float d = clamp((-vW.z - 8.0) / 120.0, 0.0, 1.0);
        vec3 col = mix(vec3(0.05, 0.11, 0.2), vec3(0.08, 0.12, 0.22), d);
        vec2 cell = floor(vec2(vW.x * 0.5 + time * 0.2, vW.z * 2.0));
        float sparkle = step(0.94, h(cell)) * (0.5 + 0.5 * sin(time * 3.0 + h(cell) * 40.0));
        float path = exp(-pow((vW.x - 60.0) / (4.0 + d * 30.0), 2.0));
        col += moon * sparkle * (0.12 + path * 0.6) * (1.0 - d * 0.6);
        col += moon * path * 0.06;
        float wave = smoothstep(0.85, 1.0, sin(vW.z * 3.0 + time * 1.4 + sin(vW.x * 0.3) * 1.5)) * (1.0 - d);
        col += wave * 0.05;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

function nice() {
  const g = new THREE.Group();
  const r = rng(97);
  ground(g, 0x5E5A57, 0xC9C3B8, 6);
  patch(g, 400, 4, 0x6F7F86, 25, 5.2, 0.006);
  box(g, 400, 0.55, 0.3, 0xE9E4DA, 25, 0, -3.15, { shadow: false }); // balustrade
  for (let x = -60; x < 110; x += 0.6) box(g, 0.12, 0.5, 0.12, 0xE2DCCF, x, 0, -3.15, { shadow: false });
  box(g, 400, 0.12, 0.45, 0xF0EBE1, 25, 0.55, -3.15, { shadow: false });
  const beach = patch(g, 400, 8, 0x7D7A74, 25, -7.4, -0.2);
  beach.material = mat(0x7D7A74, { rough: 1 });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 220).rotateX(-Math.PI / 2), seaMaterial());
  sea.position.set(25, -0.25, -121);
  sea.material.uniforms.origin.value.copy(sea.position);
  g.add(sea);
  // the far shore: a curve of lights around the bay and the hill
  const shore = rng(5);
  const pts = [], cols = [];
  for (let i = 0; i < 900; i++) {
    const a = shore() * Math.PI * 0.9 - 0.2;
    const R = 150 + shore() * 18;
    const px = 60 + Math.cos(a) * R * -1, pz = -40 - Math.sin(a) * R * 0.7;
    pts.push(px, 0.6 + shore() * (a > 1.6 ? 14 : 4), pz);
    const warm = shore() > 0.3;
    cols.push(1, warm ? 0.78 : 0.95, warm ? 0.45 : 0.9);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  pg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.9, vertexColors: true, fog: false, transparent: true, opacity: 0.9, depthWrite: false })));
  const hill = blob(g, 34, 0x10141E, -95, -6, -130, 1, { shadow: false });
  hill.scale.y *= 0.55;
  const hill2 = blob(g, 40, 0x0D111A, 160, -8, -150, 1, { shadow: false });
  hill2.scale.y *= 0.5;
  for (let i = 0; i < 9; i++) palm(g, -4 + i * 8 + r() * 1.5, -2.2, 1.05 + r() * 0.2, r);
  for (let i = 0; i < 8; i++) lamp(g, i * 9 + 0.5, -2.6, 4.4, true, 0x2A2D33);
  for (let i = 0; i < 6; i++) chairsBleues(g, 6 + i * 9.5 + r() * 2, -2.35, Math.PI + (r() - 0.5) * 0.6);
  // a lit hotel with a pink dome at the end of the promenade
  box(g, 14, 12, 8, 0xF2ECE2, 74, 0, -10);
  for (let f = 0; f < 4; f++) for (let c = 0; c < 6; c++) win(g, 68.5 + c * 2.2, 1.6 + f * 2.7, -6, 1, 1.5, 0xF8F4EC, r() > 0.35 ? 0xFFD49A : 0x3B4652, true);
  cyl(g, 3, 3, 1.5, 0xF2ECE2, 70, 12, -10, 20);
  const dome = sphere(g, 3, 0xE59AA4, 70, 13.5, -10, { shadow: true });
  dome.scale.y = 3.6;
  glow(g, 18, 0xFFC27A, 74, 6, -5, 0.22);
  return { group: g, update(t) { sea.material.uniforms.time.value = t; } };
}

export function buildWorld() {
  const makers = [vadodara, market, numerator, ropar, montpellier, nice];
  return makers.map((make, i) => {
    const s = make();
    s.group.position.x = i * SPAN;
    s.group.updateMatrixWorld(true);
    return s;
  });
}
