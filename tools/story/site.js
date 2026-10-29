// Page behaviour: the walk's chapters and controls, reveals, and the timeline spine.
// Without WebGL, or with reduced motion, the story reads as plain chapters and nothing here is required.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);

const CHAPTERS = 6;
const TZ = 0.14;
const TIMES = ['Dawn', 'Morning', 'Noon', 'Golden hour', 'Dusk', 'Night'];

document.documentElement.classList.add('js');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function webgl() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

function setupWalk() {
  const walk = $('.walk');
  const canvas = $('#walk-canvas');
  if (!walk || !canvas || reduce || !webgl()) return;

  const cards = $$('.chapter', walk);
  const buttons = $$('.map button', walk);
  const hud = $('.hud', walk);
  const bar = $('#walk-progress');
  const veil = $('.veil', walk);
  const year = $('.scene-year', walk), time = $('.scene-time', walk), place = $('.scene-place', walk);
  walk.classList.add('is-3d', 'at-start');
  hud.hidden = false;

  const span = () => walk.offsetHeight - innerHeight;
  const progress = () => clamp(-walk.getBoundingClientRect().top / Math.max(1, span()));
  const scrollToChapter = (i) => {
    const top = walk.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + ((i + 0.5) / CHAPTERS) * span(), behavior: 'smooth' });
  };

  buttons.forEach((b) => b.addEventListener('click', () => {
    const i = +b.dataset.ch;
    scrollToChapter(i);
    $(`#ch-${i}`)?.focus({ preventScroll: true });
  }));
  $$('[data-go]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    scrollToChapter(+a.dataset.go);
  }));

  let current = -1, lastYear = 0;
  const ui = {
    canvas,
    progress,
    veil(v, color) {
      veil.style.opacity = v.toFixed(3);
      veil.style.backgroundColor = color;
    },
    onReady() { walk.classList.add('ready'); },
    onFailure() {
      walk.classList.remove('is-3d', 'ready');
      hud.hidden = true;
    },
    onState({ g, c, t, year: y }) {
      walk.classList.toggle('at-start', g < 0.12);
      walk.classList.toggle('leaving', walk.getBoundingClientRect().bottom < innerHeight * 1.05);
      walk.dataset.walkEnd = String(g > CHAPTERS - 0.25);
      bar.style.transform = `scaleX(${(g / CHAPTERS).toFixed(4)})`;
      if (y !== lastYear) { year.textContent = String(y); lastYear = y; }
      if (c !== current) {
        current = c;
        time.textContent = TIMES[c];
        place.textContent = cards[c].dataset.place;
        buttons.forEach((b, i) => b.toggleAttribute('aria-current', i === c));
      }
      buttons.forEach((b, i) => b.style.setProperty('--fill', clamp(g - i).toFixed(3)));
      cards.forEach((card, i) => {
        let vis = 0, local = 0;
        if (i === c) {
          const a = i === 0 ? 0.18 : TZ + 0.01;
          const b = i === CHAPTERS - 1 ? 1.2 : 1 - TZ - 0.01;
          vis = smooth(clamp((t - a) / 0.07)) * smooth(clamp((b - t) / 0.07));
          local = clamp((t - a) / (b - a));
        }
        card.style.setProperty('--vis', vis.toFixed(3));
        card.style.setProperty('--p', local.toFixed(3));
        card.classList.toggle('is-on', vis > 0.02);
      });
    },
  };

  import('./walk.js').then(({ startWalk }) => startWalk(ui)).catch(() => ui.onFailure());
}

function setupReveals() {
  const items = $$('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach((el) => { el.classList.add('pre'); io.observe(el); });
}

function setupSpines() {
  const lists = $$('.stops');
  const update = () => {
    for (const l of lists) {
      const r = l.getBoundingClientRect();
      const p = clamp((innerHeight * 0.6 - r.top) / r.height);
      l.style.setProperty('--spine', p.toFixed(3));
      for (const li of l.children) li.classList.toggle('reached', li.getBoundingClientRect().top < innerHeight * 0.6);
    }
  };
  addEventListener('scroll', update, { passive: true });
  update();
}

function setupHeader() {
  const top = $('.top'), walk = $('.walk');
  const update = () => top.classList.toggle('solid', !walk || walk.getBoundingClientRect().bottom < 80);
  addEventListener('scroll', update, { passive: true });
  update();
}

function setupTilt() {
  if (reduce || matchMedia('(pointer: coarse)').matches) return;
  for (const card of $$('.project')) {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    });
  }
}

setupWalk();
setupReveals();
setupSpines();
setupHeader();
setupTilt();
