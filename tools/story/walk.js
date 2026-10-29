// The walk: one long day across six places. Scroll moves him along the road; between chapters the
// light dips and the next place fades up around him. Everything follows the scroll, so it plays backwards too.
import * as THREE from 'three';
import { buildWorld, SPAN, WALK } from './scenes.js';
import { makePerson } from './person.js';
import { lerp, clamp, smooth } from './kit.js';

export const CHAPTERS = 6;
const TZ = 0.14;            // share of a chapter's scroll, either side of a border, spent crossing over
const VEIL = 0.055;         // the part of that crossing hidden behind the dip in light
const K = (WALK[1] - WALK[0]) / (1 - 2 * TZ); // metres walked per chapter of scroll
const STRIDE = 1.45;        // metres per full walk cycle

// Light across one day: dawn in Vadodara to night in Nice.
const KEYS = [
  { top: 0x9DB8CC, bottom: 0xF5CDA8, sun: 0xFFC890, sunI: 2.7, sunDir: [0.36, 0.1, -0.93], hemi: 1.75, ground: 0x9A8A6A, night: 0, exp: 1.02, cloud: 0.55 },
  { top: 0x8FBCDC, bottom: 0xE9E3D2, sun: 0xFFF1D8, sunI: 2.6, sunDir: [0.55, 0.42, -0.7], hemi: 1.8, ground: 0x9E9680, night: 0, exp: 1.0, cloud: 0.5 },
  { top: 0x5D9ED6, bottom: 0xD6E6EF, sun: 0xFFFFFF, sunI: 3.0, sunDir: [0.3, 0.85, -0.42], hemi: 1.9, ground: 0x9C9C94, night: 0, exp: 1.0, cloud: 0.4 },
  { top: 0x7183AE, bottom: 0xF6B676, sun: 0xFFAD60, sunI: 2.8, sunDir: [0.3, 0.09, -0.95], hemi: 1.5, ground: 0x9A7A58, night: 0.1, exp: 1.04, cloud: 0.6 },
  { top: 0x3A3F6A, bottom: 0xD99A86, sun: 0xFF9F7A, sunI: 1.3, sunDir: [-0.85, 0.06, -0.52], hemi: 1.25, ground: 0x6A5A60, night: 0.45, exp: 1.08, cloud: 0.45 },
  { top: 0x060B18, bottom: 0x1D2747, sun: 0xA9BCF0, sunI: 0.75, sunDir: [0.3, 0.2, -0.93], hemi: 1.35, ground: 0x343848, night: 1, exp: 1.32, cloud: 0.2 },
];

export const YEARS = [2017, 2018, 2021, 2024, 2025, 2026];
export const TIMES = ['Dawn', 'Morning', 'Noon', 'Golden hour', 'Dusk', 'Night'];

// What he wore and carried, chapter by chapter.
const OUTFITS = [
  { shirt: 0xF1EDE4, trousers: 0x3B4256, carry: 'backpack', bag: 0x2F6E8E },
  { shirt: 0xE3B35B, trousers: 0xCDBFA4, carry: 'sling', bag: 0x5B4636, shoes: 0x6B4A33 },
  { shirt: 0x34507A, trousers: 0x5E636B, longSleeves: true, lanyard: true, carry: 'backpack', bag: 0x2B2F36 },
  { shirt: 0x4F7A55, trousers: 0x3D5878, carry: 'backpack', bag: 0xB25B3A, shoes: 0xE9E6E0 },
  { shirt: 0xEDE6DA, trousers: 0x2E3446, jacket: 0x9A6B43, carry: 'sling', bag: 0x2B2F36 },
  { shirt: 0xF4F1EA, trousers: 0x2B3550, jacket: 0x2D3B5C, carry: 'none' },
];

/** The year shown on screen; it rolls over while the scene crosses into the next chapter. */
export function yearAt(g) {
  for (let b = 1; b < CHAPTERS; b++) {
    if (g < b - TZ) return YEARS[b - 1];
    if (g <= b + TZ) return Math.round(lerp(YEARS[b - 1], YEARS[b], smooth(clamp((g - (b - TZ)) / (2 * TZ)))));
  }
  return YEARS[CHAPTERS - 1];
}

const c3 = (hex) => new THREE.Color(hex);
const mixColor = (out, a, b, t) => out.copy(c3(a)).lerp(c3(b), t);

export function startWalk(ui) {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: !coarse, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.3 : 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xF5CDA8, 18, 95);
  const cam = new THREE.PerspectiveCamera(36, 1, 0.1, 700);

  // Sky: a gradient dome with the sun (or moon), drifting clouds and, at night, stars.
  const skyU = {
    top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() }, sunCol: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3() }, night: { value: 0 }, cloud: { value: 0.5 }, time: { value: 0 },
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 40, 20), new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform vec3 top, bottom, sunCol, sunDir; uniform float night, cloud, time; varying vec3 vD;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.07 + 3.1; a *= 0.5; } return v; }
      void main(){
        vec3 d = normalize(vD);
        float h = clamp(d.y * 1.5 + 0.1, 0.0, 1.0);
        vec3 col = mix(bottom, top, pow(h, 0.75));
        float s = max(dot(d, normalize(sunDir)), 0.0);
        float day = 1.0 - night;
        col += sunCol * (pow(s, 5.0) * 0.32 * day + pow(s, 48.0) * 0.45);
        col = mix(col, sunCol * 1.25 + 0.25, smoothstep(0.9990, 0.9995, s) * (0.7 + 0.3 * day));
        if (d.y > 0.0) {
          vec2 uv = d.xz / (d.y + 0.15) * 1.2 + vec2(time * 0.01, 0.0);
          float c = smoothstep(0.55 - cloud * 0.2, 0.9, fbm(uv)) * smoothstep(0.0, 0.2, d.y);
          vec3 cc = mix(mix(bottom, vec3(1.0), 0.6), sunCol, pow(s, 3.0) * 0.5);
          cc = mix(cc, top * 1.6 + 0.03, night);
          col = mix(col, cc, c * mix(0.6, 0.35, night));
          vec2 st = floor(d.xz / (d.y + 0.4) * 140.0);
          float star = step(0.9975, hash(st)) * smoothstep(0.05, 0.3, d.y) * (0.6 + 0.4 * sin(time * 2.0 + hash(st) * 30.0));
          col += star * night * (1.0 - c) * 0.9;
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  sky.renderOrder = -1;
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x887766, 1.2);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 18, bottom: -8, near: 1, far: 90 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const glowLight = new THREE.PointLight(0xFFC88A, 0, 12, 1.4); // lamplight that keeps him readable at night
  scene.add(glowLight);

  const world = buildWorld();
  for (const s of world) { s.group.visible = false; scene.add(s.group); }

  const me = makePerson();
  scene.add(me.root);

  // ---------- state ----------
  let gs = 0, gTarget = 0, lastC = -1;
  let phase = 0, walkW = 0, yaw = Math.PI / 2, dir = 1, idleFor = 2;
  let waveUntil = 0, wasAway = false;
  let camX = WALK[0], cutFlash = 0;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  let running = true, visible = true, raf = 0, last = performance.now(), clock = 0, ready = false;
  const veilColor = new THREE.Color();
  const tmp = new THREE.Color(), tmp2 = new THREE.Color();
  const sunPos = new THREE.Vector3();

  const localX = (g) => {
    const c = Math.min(CHAPTERS - 1, Math.max(0, Math.floor(g)));
    return { c, x: WALK[0] + (g - c - TZ) * K };
  };

  function resize() {
    const w = ui.canvas.clientWidth || innerWidth, h = ui.canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    cam.fov = cam.aspect < 0.8 ? 40 : 31;
    cam.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);
  addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  function applyLight(L) {
    const i = Math.floor(L), f = L - i;
    const a = KEYS[clamp(i, 0, 5)], b = KEYS[clamp(i + 1, 0, 5)];
    mixColor(skyU.top.value, a.top, b.top, f);
    mixColor(skyU.bottom.value, a.bottom, b.bottom, f);
    mixColor(skyU.sunCol.value, a.sun, b.sun, f);
    skyU.sunDir.value.set(lerp(a.sunDir[0], b.sunDir[0], f), lerp(a.sunDir[1], b.sunDir[1], f), lerp(a.sunDir[2], b.sunDir[2], f)).normalize();
    skyU.night.value = lerp(a.night, b.night, f);
    skyU.cloud.value = lerp(a.cloud, b.cloud, f);
    scene.fog.color.copy(skyU.bottom.value).lerp(skyU.top.value, 0.12);
    scene.fog.near = lerp(20, 10, skyU.night.value);
    scene.fog.far = lerp(110, 80, skyU.night.value);
    sun.color.copy(skyU.sunCol.value);
    sun.intensity = lerp(a.sunI, b.sunI, f);
    hemi.intensity = lerp(a.hemi, b.hemi, f);
    hemi.color.copy(skyU.top.value).lerp(tmp.set(0xffffff), 0.55);
    hemi.groundColor.copy(mixColor(tmp2, a.ground, b.ground, f));
    renderer.toneMappingExposure = lerp(a.exp, b.exp, f);
    glowLight.intensity = skyU.night.value * 14;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible) return;
    clock += dt;

    gTarget = clamp(ui.progress() * CHAPTERS, 0, CHAPTERS - 1e-4);
    // A long jump (the chapter map) is a cut, not a sprint.
    if (Math.abs(gTarget - gs) > 0.6) {
      gs = gTarget - Math.sign(gTarget - gs) * 0.04;
      cutFlash = 1;
      camX = null;
    }
    const prev = gs;
    gs += (gTarget - gs) * (1 - Math.exp(-dt * 4.5));
    const { c, x } = localX(gs);
    const t = gs - c;
    const v = ((gs - prev) * K) / Math.max(dt, 1e-4); // metres per second along the road

    if (c !== lastC) {
      world.forEach((s, i) => { s.group.visible = i === c; });
      me.dress(OUTFITS[c]);
      lastC = c;
    }

    // light: blends across a border, steady inside a chapter
    let L = c;
    if (t > 1 - TZ && c < CHAPTERS - 1) L = c + 0.5 * smooth(clamp((t - (1 - TZ)) / TZ));
    else if (t < TZ && c > 0) L = c - 0.5 * (1 - smooth(clamp(t / TZ)));
    applyLight(clamp(L, 0, 5));

    // the dip in light that hides the change of place
    let near = 1;
    if (c > 0) near = Math.min(near, t / VEIL);
    if (c < CHAPTERS - 1) near = Math.min(near, (1 - t) / VEIL);
    cutFlash = Math.max(0, cutFlash - dt * 2.2);
    const veil = Math.max(1 - smooth(clamp(near)), smooth(cutFlash));
    veilColor.copy(scene.fog.color);
    ui.veil(veil, veilColor.getStyle());

    // walking
    const speed = Math.abs(v);
    walkW = lerp(walkW, clamp(speed / 1.1), 1 - Math.exp(-dt * 8));
    phase += (Math.min(speed, 6) * dt / STRIDE) * Math.PI * 2;
    if (speed > 0.08) { dir = Math.sign(v); idleFor = 0; } else idleFor += dt;
    const facing = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    const resting = idleFor > 0.5;
    const yawTarget = resting ? (dir > 0 ? 0.55 : -0.55) : facing;
    yaw = lerp(yaw, yawTarget, 1 - Math.exp(-dt * (resting ? 2.5 : 7)));

    if (gs < 0.04 && resting && wasAway) { waveUntil = clock + 2.6; wasAway = false; }
    if (gs > 0.3) wasAway = true;
    const wave = clamp((clock - (waveUntil - 2.6)) / 0.4) * clamp((waveUntil - clock) / 0.4) * (1 - walkW);

    pointer.sx = lerp(pointer.sx, pointer.x, 1 - Math.exp(-dt * 3));
    pointer.sy = lerp(pointer.sy, pointer.y, 1 - Math.exp(-dt * 3));
    const lookYaw = resting ? pointer.sx * 0.55 - yaw : 0;
    me.root.position.set(c * SPAN + x, 0, 0);
    me.body.rotation.y = yaw;
    me.pose({ phase, walk: walkW, t: clock, wave, look: { yaw: lookYaw, pitch: resting ? pointer.sy * 0.18 : 0.05 } });
    world[c].update?.(clock);

    // camera: he stands right of the words on wide screens, centred and lower on phones
    const narrow = cam.aspect < 0.8;
    const dist = narrow ? 14 : 13;
    const fx = narrow ? 0.5 : 0.66;
    const halfW = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect * dist;
    const want = me.root.position.x - (fx - 0.5) * 2 * halfW;
    camX = camX === null ? want : lerp(camX, want, 1 - Math.exp(-dt * 3.2));
    if (Math.abs(camX - want) > 30) camX = want;
    const px = pointer.sx * 0.3, py = -pointer.sy * 0.15;
    // on phones the chapter card sits low, so once the walk starts the camera tilts down to lift him above it
    const lift = narrow ? smooth(clamp((gs - 0.08) / 0.14)) : 0;
    cam.position.set(camX + px, (narrow ? lerp(2.3, 3.2, lift) : 1.9) + py, dist);
    cam.lookAt(camX, narrow ? lerp(3.0, 0.1, lift) : 2.0, 0);
    sky.position.copy(cam.position);

    const sd = skyU.sunDir.value;
    sun.target.position.copy(me.root.position);
    sunPos.set(sd.x, Math.max(sd.y, 0.4), Math.abs(sd.z) + 0.35).normalize(); // light the fronts, facing the camera
    sun.position.copy(me.root.position).addScaledVector(sunPos, 30);
    glowLight.position.set(me.root.position.x + 0.8, 2.6, 1.6);

    renderer.render(scene, cam);
    ui.onState?.({ g: gs, c, t, year: yearAt(gs) });

    if (!ready) {
      ready = true;
      waveUntil = clock + 0.6 + 2.6;
      ui.onReady?.();
    }
  }

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px' });
  io.observe(ui.canvas);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); running = false; }
    else if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  });
  ui.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); cancelAnimationFrame(raf); ui.onFailure?.(); }, { once: true });
  raf = requestAnimationFrame(frame);
}
