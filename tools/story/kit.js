// Small building blocks for the low-poly world: cached materials and one-line primitives.
import * as THREE from 'three';

const mats = new Map();
/** One shared material per colour (and glow), so the scene stays cheap. */
export function mat(color, opts = {}) {
  const key = `${color}|${opts.emissive ?? ''}|${opts.ei ?? ''}|${opts.rough ?? ''}|${opts.metal ?? ''}|${opts.opacity ?? ''}|${opts.side ?? ''}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.85,
      metalness: opts.metal ?? 0,
      flatShading: opts.flat ?? false,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.ei ?? 1,
      transparent: opts.opacity !== undefined,
      opacity: opts.opacity ?? 1,
      side: opts.side ?? THREE.FrontSide,
    });
    mats.set(key, m);
  }
  return m;
}

const geos = new Map();
const geo = (key, make) => {
  let g = geos.get(key);
  if (!g) { g = make(); geos.set(key, g); }
  return g;
};
const unitBox = () => geo('box', () => new THREE.BoxGeometry(1, 1, 1));

function place(mesh, parent, x, y, z, shadow = true) {
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** A box resting on y (its bottom at y). */
export function box(parent, w, h, d, color, x, y, z, opts) {
  const m = new THREE.Mesh(unitBox(), color instanceof THREE.Material ? color : mat(color, opts));
  m.scale.set(w, h, d);
  return place(m, parent, x, y + h / 2, z, opts?.shadow ?? true);
}

/** A cylinder resting on y. */
export function cyl(parent, rTop, rBottom, h, color, x, y, z, seg = 10, opts) {
  const g = geo(`cyl${rTop}|${rBottom}|${seg}`, () => new THREE.CylinderGeometry(rTop, rBottom, 1, seg));
  const m = new THREE.Mesh(g, color instanceof THREE.Material ? color : mat(color, opts));
  m.scale.y = h;
  return place(m, parent, x, y + h / 2, z, opts?.shadow ?? true);
}

export function cone(parent, r, h, color, x, y, z, seg = 8, opts) {
  const g = geo(`cone${seg}`, () => new THREE.ConeGeometry(1, 1, seg));
  const m = new THREE.Mesh(g, mat(color, { flat: true, ...opts }));
  m.scale.set(r, h, r);
  return place(m, parent, x, y + h / 2, z, opts?.shadow ?? true);
}

/** A soft lumpy blob for canopies and bushes. */
export function blob(parent, r, color, x, y, z, detail = 1, opts) {
  const g = geo(`blob${detail}`, () => {
    const s = new THREE.IcosahedronGeometry(1, detail);
    const p = s.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
      const n = 1 + 0.12 * Math.sin(vx * 5.1 + vz * 3.7) + 0.08 * Math.sin(vy * 7.3 + vx * 2.1);
      p.setXYZ(i, vx * n, vy * n, vz * n);
    }
    s.computeVertexNormals();
    return s;
  });
  const m = new THREE.Mesh(g, mat(color, { flat: true, ...opts }));
  m.scale.setScalar(r);
  return place(m, parent, x, y, z, opts?.shadow ?? true);
}

export function sphere(parent, r, color, x, y, z, opts) {
  const g = geo('sphere', () => new THREE.SphereGeometry(1, 16, 12));
  const m = new THREE.Mesh(g, color instanceof THREE.Material ? color : mat(color, opts));
  m.scale.setScalar(r);
  return place(m, parent, x, y, z, opts?.shadow ?? false);
}

/** A flat rectangle lying on the ground. */
export function patch(parent, w, d, color, x, z, y = 0.005, opts) {
  const g = geo('plane', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
  const m = new THREE.Mesh(g, mat(color, opts));
  m.scale.set(w, 1, d);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** Deterministic randomness, so the world looks the same on every visit. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (t) => t * t * (3 - 2 * t);
