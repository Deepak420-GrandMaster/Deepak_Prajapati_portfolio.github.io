// A small procedural person: a jointed figure built from capsules, with a walk cycle, idle breathing,
// a wave and a head that follows you. Built facing +Z; the root turns him onto the road.
import * as THREE from 'three';
import { mat, clamp, lerp } from './kit.js';

const capsules = new Map();
const capsule = (r, len) => {
  const k = `${r}|${len}`;
  if (!capsules.has(k)) capsules.set(k, new THREE.CapsuleGeometry(r, len, 6, 12));
  return capsules.get(k);
};
const SPHERE = new THREE.SphereGeometry(1, 20, 14);
const HAIR = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.56);
const BOX = new THREE.BoxGeometry(1, 1, 1);

function part(parent, geo, material, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const joint = (parent, x, y, z) => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
};

const SKIN = 0xA8714E;
const HAIR_C = 0x1B1714;

export function makePerson() {
  const own = (c, rough = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: rough });
  const m = {
    skin: mat(SKIN, { rough: 0.62 }),
    hair: mat(HAIR_C, { rough: 0.9 }),
    eye: mat(0x14110F, { rough: 0.3 }),
    shirt: own(0x9CB8D3), sleeve: own(0x9CB8D3), trousers: own(0x2D3442), shoes: own(0x2A211C, 0.6),
    jacket: own(0x8A6A48), bag: own(0x3D5A73), strap: own(0x2B2B2B),
  };

  const root = new THREE.Group();
  const body = joint(root, 0, 0, 0); // turns to face the road or the viewer
  const hips = joint(body, 0, 0.98, 0);
  part(hips, capsule(0.14, 0.1), m.trousers, 0, 0.02, 0, 1.18, 1, 0.78);

  const spine = joint(hips, 0, 0.07, 0);
  const torso = part(spine, capsule(0.165, 0.3), m.shirt, 0, 0.24, 0, 1.08, 1, 0.66);
  const jacket = part(spine, capsule(0.18, 0.3), m.jacket, 0, 0.24, -0.004, 1.08, 1, 0.7);
  jacket.visible = false;
  part(spine, capsule(0.06, 0.05), m.skin, 0, 0.46, 0.005); // neck
  const collar = part(spine, new THREE.TorusGeometry(0.075, 0.018, 6, 16), m.shirt, 0, 0.42, 0.01, 1, 1, 1);
  collar.rotation.x = Math.PI / 2;

  // head
  const neck = joint(spine, 0, 0.48, 0.01);
  const head = joint(neck, 0, 0.06, 0);
  part(head, SPHERE, m.skin, 0, 0.1, 0.008, 0.102, 0.122, 0.112);
  part(head, SPHERE, m.skin, 0, 0.035, 0.03, 0.078, 0.06, 0.085); // jaw
  const hair = part(head, HAIR, m.hair, 0, 0.115, -0.006, 0.108, 0.115, 0.12);
  hair.rotation.x = -0.18;
  part(head, SPHERE, m.hair, 0, 0.12, -0.04, 0.1, 0.1, 0.095);
  for (const s of [-1, 1]) {
    part(head, SPHERE, m.skin, s * 0.1, 0.09, 0, 0.018, 0.028, 0.016); // ears
    part(head, SPHERE, m.eye, s * 0.037, 0.115, 0.1, 0.012, 0.014, 0.008);
    const brow = part(head, BOX, m.hair, s * 0.039, 0.14, 0.102, 0.034, 0.008, 0.01);
    brow.rotation.z = s * -0.12;
  }
  part(head, SPHERE, m.skin, 0, 0.088, 0.112, 0.016, 0.024, 0.02); // nose
  // a short beard and moustache, and clear-rimmed glasses
  part(head, SPHERE, m.hair, 0, 0.036, 0.032, 0.084, 0.066, 0.088);
  part(head, BOX, m.hair, 0, 0.066, 0.108, 0.05, 0.012, 0.014);
  part(head, BOX, mat(0x6B3B2E), 0, 0.05, 0.118, 0.03, 0.006, 0.01); // mouth
  const rim = mat(0xC9CED3, { rough: 0.3, metal: 0.4 });
  for (const s of [-1, 1]) {
    const lens = part(head, new THREE.TorusGeometry(0.026, 0.0045, 6, 18), rim, s * 0.04, 0.115, 0.112);
    lens.scale.set(1.15, 0.9, 1);
    const arm = part(head, BOX, rim, s * 0.088, 0.118, 0.06, 0.006, 0.006, 0.1);
    arm.castShadow = false;
  }
  part(head, BOX, rim, 0, 0.12, 0.114, 0.026, 0.005, 0.005);

  // arms
  const arms = [-1, 1].map((s) => {
    const shoulder = joint(spine, s * 0.205, 0.39, 0);
    const upper = part(shoulder, capsule(0.052, 0.2), m.sleeve, 0, -0.14, 0);
    const elbow = joint(shoulder, 0, -0.29, 0);
    const fore = part(elbow, capsule(0.044, 0.19), m.skin, 0, -0.12, 0);
    const hand = part(elbow, SPHERE, m.skin, 0, -0.27, 0.005, 0.042, 0.056, 0.03);
    const cuff = part(elbow, capsule(0.048, 0.17), m.sleeve, 0, -0.11, 0);
    return { shoulder, elbow, upper, fore, hand, cuff, s };
  });

  // legs
  const legs = [-1, 1].map((s) => {
    const hip = joint(hips, s * 0.094, 0, 0);
    part(hip, capsule(0.086, 0.34), m.trousers, 0, -0.235, 0, 1, 1, 0.95);
    const knee = joint(hip, 0, -0.45, 0);
    part(knee, SPHERE, m.trousers, 0, 0, 0, 0.074, 0.08, 0.074);
    part(knee, capsule(0.07, 0.33), m.trousers, 0, -0.2, 0, 1, 1, 0.95);
    const ankle = joint(knee, 0, -0.45, 0);
    part(ankle, BOX, m.shoes, 0, -0.045, 0.045, 0.1, 0.075, 0.25);
    return { hip, knee, ankle, s };
  });

  // carried things
  const backpack = joint(spine, 0, 0.26, -0.13);
  part(backpack, capsule(0.12, 0.16), m.bag, 0, 0, -0.04, 1.15, 1, 0.55);
  part(backpack, BOX, m.bag, 0, -0.08, -0.09, 0.2, 0.12, 0.06);
  for (const s of [-1, 1]) part(backpack, BOX, m.strap, s * 0.11, 0.06, 0.12, 0.03, 0.34, 0.02);
  const sling = joint(spine, 0, 0.2, 0);
  const strap = part(sling, BOX, m.strap, 0, 0.06, 0, 0.035, 0.62, 0.02);
  strap.position.z = 0.118; strap.rotation.z = 0.78;
  const slingFront = part(sling, BOX, m.strap, 0, 0.06, -0.118, 0.035, 0.62, 0.02);
  slingFront.rotation.z = 0.78;
  part(sling, BOX, m.bag, 0.19, -0.2, 0.02, 0.07, 0.22, 0.3); // bag on the hip
  const lanyard = joint(spine, 0, 0, 0);
  const ly = part(lanyard, new THREE.TorusGeometry(0.1, 0.006, 4, 20, Math.PI), mat(0x2E6BD6), 0, 0.42, 0.075);
  ly.rotation.z = Math.PI; ly.scale.set(0.9, 1.9, 1);
  part(lanyard, BOX, mat(0xF2F2F2), 0, 0.22, 0.118, 0.06, 0.08, 0.008);

  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  /** Dress him for a chapter. */
  function dress(o) {
    m.shirt.color.set(o.shirt);
    m.trousers.color.set(o.trousers);
    m.shoes.color.set(o.shoes ?? 0x2A211C);
    m.bag.color.set(o.bag ?? 0x3D5A73);
    m.jacket.color.set(o.jacket ?? 0x8A6A48);
    jacket.visible = !!o.jacket;
    const sleeveColor = o.jacket ?? o.shirt;
    m.sleeve.color.set(sleeveColor);
    for (const a of arms) a.cuff.visible = !!(o.longSleeves || o.jacket);
    backpack.visible = o.carry === 'backpack';
    sling.visible = o.carry === 'sling';
    lanyard.visible = !!o.lanyard;
  }

  /**
   * Pose him. phase: walk cycle (radians), walk: 0 standing to 1 striding, t: seconds,
   * wave: 0..1, look: {yaw, pitch} for the head, lean: forward lean in radians.
   */
  function pose({ phase = 0, walk = 0, t = 0, wave = 0, look = { yaw: 0, pitch: 0 } }) {
    const w = clamp(walk);
    const s = Math.sin(phase), c = Math.cos(phase);
    const breathe = Math.sin(t * 1.7) * (1 - w);

    hips.position.y = 0.98 - w * 0.03 * s * s + w * 0.012 + breathe * 0.003;
    hips.rotation.y = w * 0.12 * s;
    hips.rotation.z = w * 0.035 * c;
    spine.rotation.y = -w * 0.18 * s;
    spine.rotation.x = w * 0.06 + breathe * 0.012;
    spine.rotation.z = -w * 0.02 * c + Math.sin(t * 0.6) * 0.012 * (1 - w);
    torso.scale.x = 1.08 + breathe * 0.012;

    for (const l of legs) {
      const p = l.s < 0 ? phase : phase + Math.PI;
      const ls = Math.sin(p), lc = Math.cos(p);
      l.hip.rotation.x = -w * 0.5 * ls - w * 0.06;
      l.knee.rotation.x = w * (0.08 + 0.95 * Math.pow(Math.max(0, lc), 1.6)) + (1 - w) * 0.03;
      l.ankle.rotation.x = -l.hip.rotation.x * 0.55 - l.knee.rotation.x * 0.7 + w * 0.12 * Math.max(0, -ls);
      l.hip.rotation.z = (1 - w) * l.s * -0.03;
    }

    for (const a of arms) {
      const p = a.s < 0 ? phase + Math.PI : phase;
      const swing = Math.sin(p);
      const waving = a.s < 0 ? wave : 0;
      a.shoulder.rotation.x = lerp(-w * 0.5 * swing + (1 - w) * 0.04, -0.15, waving);
      a.shoulder.rotation.z = lerp(a.s * (0.09 + (1 - w) * 0.02), -1.95, waving);
      a.shoulder.rotation.y = 0;
      a.elbow.rotation.x = lerp(-0.18 - w * (0.25 + 0.25 * Math.max(0, -swing)), -0.1, waving);
      a.elbow.rotation.z = -waving * (1.05 + 0.32 * Math.sin(t * 9));
    }

    neck.rotation.y = clamp(look.yaw, -1.1, 1.1) * 0.4;
    head.rotation.y = clamp(look.yaw, -1.1, 1.1) * 0.6;
    head.rotation.x = clamp(look.pitch, -0.4, 0.4) - spine.rotation.x * 0.6;
    head.rotation.z = Math.sin(t * 0.9) * 0.02 * (1 - w);
  }

  pose({});
  return { root, body, dress, pose };
}
