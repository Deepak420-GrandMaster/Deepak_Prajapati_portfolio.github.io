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

// The header shows where you are on the page.
function setupNavSpy() {
  const links = $$('.top nav a[href^="#"]');
  const targets = links.map((a) => (a.getAttribute('href') === '#story' ? $('.walk') : $(a.getAttribute('href'))));
  const update = () => {
    const y = innerHeight * 0.4;
    let on = -1;
    targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top <= y && t.getBoundingClientRect().bottom > y) on = i; });
    links.forEach((a, i) => a.toggleAttribute('aria-current', i === on));
  };
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

// ---------- motion: everything below is skipped under reduced motion ----------

// The page colour flows from section to section instead of meeting at hard edges.
function setupPageColour() {
  const parts = $$('[data-bg]');
  if (!parts.length) return;
  const root = document.documentElement;
  const update = () => {
    const mid = innerHeight * 0.5;
    for (const el of parts) {
      const r = el.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) { root.style.setProperty('--page', el.dataset.bg); break; }
    }
  };
  addEventListener('scroll', update, { passive: true });
  update();
}

// A statement that lights up word by word as it scrolls through.
function setupFill() {
  for (const el of $$('[data-fill]')) {
    const words = [];
    const walk = (node) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const part of child.textContent.split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { frag.append(part); continue; }
            const w = document.createElement('span');
            w.className = 'w';
            w.textContent = part;
            words.push(w);
            frag.append(w);
          }
          child.replaceWith(frag);
        } else walk(child);
      }
    };
    walk(el);
    el.classList.add('filling');
    const update = () => {
      const r = el.getBoundingClientRect();
      const p = clamp((innerHeight * 0.82 - r.top) / (r.height + innerHeight * 0.35));
      const lit = p * words.length;
      words.forEach((w, i) => w.style.setProperty('--lit', clamp(lit - i).toFixed(2)));
    };
    addEventListener('scroll', update, { passive: true });
    update();
  }
}

// Section headlines rise out of a mask.
function setupHeadlines() {
  const heads = $$('.head h2, .contact h2');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -10% 0px' });
  for (const h of heads) {
    const inner = document.createElement('span');
    inner.className = 'mask-inner';
    inner.append(...h.childNodes);
    h.append(inner);
    h.classList.add('mask');
    io.observe(h);
  }
}

// Calls to action lean toward the pointer.
function setupMagnetic() {
  for (const el of $$('[data-magnetic]')) {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${(x * 0.22).toFixed(1)}px, ${(y * 0.3).toFixed(1)}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  }
}

// A small label follows the pointer over project cards; clicking the card opens its main link.
function setupCursorLabel() {
  const cards = $$('[data-cursor]');
  if (!cards.length) return;
  const label = document.createElement('div');
  label.className = 'cursor-label';
  label.setAttribute('aria-hidden', 'true');
  document.body.append(label);
  let x = 0, y = 0, lx = 0, ly = 0, raf = 0;
  const tick = () => {
    lx += (x - lx) * 0.2; ly += (y - ly) * 0.2;
    label.style.transform = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px) translate(-50%, -50%)`;
    raf = Math.abs(x - lx) + Math.abs(y - ly) > 0.3 ? requestAnimationFrame(tick) : 0;
  };
  addEventListener('pointermove', (e) => {
    x = e.clientX; y = e.clientY;
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
  for (const card of cards) {
    card.classList.add('clickable');
    card.addEventListener('pointerenter', (e) => {
      label.textContent = card.dataset.cursor;
      lx = x = e.clientX; ly = y = e.clientY;
      label.classList.add('on');
    });
    card.addEventListener('pointerleave', () => label.classList.remove('on'));
    card.addEventListener('pointerover', (e) => label.classList.toggle('hide', !!e.target.closest('a')));
    card.addEventListener('click', (e) => {
      if (e.target.closest('a') || getSelection().toString()) return;
      window.open(card.dataset.href, '_blank', 'noopener');
    });
  }
}

// The marquee drifts on its own and runs faster, either way, with the scroll.
function setupMarquee() {
  const track = $('.marquee-track');
  if (!track) return;
  track.append(...[...track.children].map((n) => n.cloneNode(true)));
  let pos = 0, dir = -1, boost = 0, lastY = scrollY, last = performance.now(), seen = false;
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; }).observe(track.parentElement);
  const frame = (now) => {
    requestAnimationFrame(frame);
    if (!seen) { last = now; lastY = scrollY; return; }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const dy = scrollY - lastY;
    lastY = scrollY;
    if (dy) { dir = dy > 0 ? -1 : 1; boost = Math.min(14, boost + Math.abs(dy) * 0.06); }
    boost *= Math.exp(-dt * 3);
    pos += dir * (40 + boost * 60) * dt;
    const half = track.scrollWidth / 2;
    if (pos <= -half) pos += half;
    if (pos > 0) pos -= half;
    track.style.transform = `translate3d(${pos.toFixed(1)}px, 0, 0) skewX(${(-dir * boost * 0.6).toFixed(2)}deg)`;
  };
  requestAnimationFrame(frame);
}

// Numbers count up the first time they come into view.
function setupCounters() {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const el = e.target, to = +el.dataset.count, from = +(el.dataset.from ?? 0);
      const dec = +(el.dataset.decimals ?? 0), suffix = el.dataset.suffix ?? '';
      const t0 = performance.now();
      const step = (now) => {
        const t = clamp((now - t0) / 1400);
        const v = from + (to - from) * (1 - Math.pow(1 - t, 3));
        el.textContent = v.toFixed(dec) + suffix;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => io.observe(el));
}

// Local time in Nice, for anyone deciding when to call.
function setupClock() {
  const el = $('#nice-time');
  if (!el) return;
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris', timeZoneName: 'short' });
  const update = () => { el.textContent = fmt.format(new Date()); };
  update();
  setInterval(update, 30000);
}

setupWalk();
setupReveals();
setupSpines();
setupHeader();
setupNavSpy();
setupTilt();
setupPageColour();
setupClock();
if (!reduce) {
  setupFill();
  setupHeadlines();
  setupMarquee();
  setupCounters();
  if (matchMedia('(pointer: fine)').matches) { setupMagnetic(); setupCursorLabel(); }
}
