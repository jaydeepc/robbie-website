// ─────────────────────────────────────────────────────────────
// 2D interaction layer: nav · reveals · counters · flow ·
// pinned pillars · product tabs · pricing toggle · FAQ · modal
// ─────────────────────────────────────────────────────────────

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export function initUI() {
  navTheme();
  reveals();
  counters();
  flow();
  pillars();
  tabs();
  pricing();
  faq();
  modal();
  videoFallbacks();
  document.getElementById('year')?.append(String(new Date().getFullYear()));
}

// ── nav: dark over hero, light over the white body ──
function navTheme() {
  const nav = document.querySelector('.nav');
  const darkZones = document.querySelectorAll('[data-nav="dark"]');
  const check = () => {
    const y = 28; // probe just under the nav bar
    let dark = false;
    for (const z of darkZones) {
      const r = z.getBoundingClientRect();
      if (r.top <= y && r.bottom >= y) { dark = true; break; }
    }
    nav.classList.toggle('nav-light', !dark);
    nav.classList.toggle('nav-scrolled', window.scrollY > 10);
  };
  window.addEventListener('scroll', check, { passive: true });
  window.addEventListener('resize', check);
  check();
}

// ── generic reveal-on-scroll ──
function reveals() {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
}

// ── animated metric counters ──
function counters() {
  const els = document.querySelectorAll('[data-count]');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const el = e.target;
      const end = parseFloat(el.dataset.count);
      const dur = 1600;
      const t0 = performance.now();
      const dec = +el.dataset.decimals || 0;
      const fmt = (v) => (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US'));
      (function step() {
        const t = Math.min(1, Math.max(0, (performance.now() - t0) / dur));
        el.textContent = fmt(end * easeOut(t));
        if (t < 1) requestAnimationFrame(step);
      })();
    }
  }, { threshold: 0.5 });
  els.forEach((el) => io.observe(el));
}

// ── RFQ journey: pinned horizontal scroll-scrub pipeline ──
function flow() {
  const section = document.querySelector('.journey');
  if (!section) return;
  const track = section.querySelector('.journey-track');
  const railWrap = section.querySelector('.journey-rail-wrap');
  const rail = section.querySelector('.journey-rail');
  const cards = [...rail.children];
  const count = section.querySelector('.j-count');
  const bar = section.querySelector('.j-bar i');
  const canvas = section.querySelector('.journey-canvas');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!cards.length) return;

  let targetP = 0, p = 0, active = -1, inView = false;

  // ── scroll-synced background film (frame sequence, like the dissection) ──
  const ctx = canvas?.getContext('2d');
  let frames = [], frameCount = 0, VIDW = 1600, VIDH = 900, lastDrawn = -1;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  function sizeCanvas() {
    if (!canvas) return;
    const w = canvas.parentElement.clientWidth, h = canvas.parentElement.clientHeight;
    canvas.width = Math.round(w * DPR);
    canvas.height = Math.round(h * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    lastDrawn = -1;
  }
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);

  if (canvas) {
    fetch('/frames/journey/manifest.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no manifest'))))
      .then((man) => {
        frameCount = man.count; VIDW = man.width; VIDH = man.height;
        frames = new Array(frameCount).fill(null);
        const order = [...Array(frameCount).keys()].sort(
          (a, b) => ((a % 6 === 0 ? 0 : 1) - (b % 6 === 0 ? 0 : 1)) || a - b
        );
        for (const i of order) {
          const img = new Image();
          img.decoding = 'async';
          img.src = `/frames/journey/f_${String(i + 1).padStart(3, '0')}.jpg`;
          img.onload = () => { frames[i] = img; lastDrawn = -1; };
        }
      })
      .catch(() => {});
  }

  function drawFilm() {
    if (!ctx || !frameCount) return;
    let idx = Math.round(p * (frameCount - 1));
    idx = Math.max(0, Math.min(frameCount - 1, idx));
    if (idx === lastDrawn) return;
    let img = frames[idx];
    if (!img) { // nearest loaded frame
      for (let d = 1; d < frameCount && !img; d++) img = frames[idx - d] || frames[idx + d];
      if (!img) return;
    }
    const w = canvas.parentElement.clientWidth, h = canvas.parentElement.clientHeight;
    const scale = Math.max(w / VIDW, h / VIDH);
    const dw = VIDW * scale, dh = VIDH * scale;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    lastDrawn = idx;
  }

  new IntersectionObserver((es) => { inView = es[es.length - 1].isIntersecting; }, { rootMargin: '10% 0px' })
    .observe(section);

  const step = () => { p += (targetP - p) * (reduced ? 1 : 0.12); apply(); };
  const onScroll = () => {
    const r = track.getBoundingClientRect();
    const range = Math.max(1, track.offsetHeight - window.innerHeight);
    targetP = Math.min(1, Math.max(0, -r.top / range));
    step(); // progress even when rAF is throttled; adds no cost on healthy frames
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
  p = targetP;

  function apply() {
    const railW = rail.scrollWidth;
    const viewW = railWrap.clientWidth;
    const pad = viewW * 0.5 - cards[0].offsetWidth * 0.5; // first/last card reach center
    const travel = Math.max(0, railW - viewW + pad * 2);
    rail.style.transform = `translate3d(${(pad - p * travel).toFixed(1)}px, 0, 0)`;

    const centerX = viewW / 2;
    let nearest = 0, nearestD = Infinity;
    cards.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const railR = railWrap.getBoundingClientRect();
      const cx = r.left - railR.left + r.width / 2;
      const d = (cx - centerX) / viewW; // -0.5 .. 0.5
      c.style.transform = `perspective(1100px) rotateY(${(-d * 26).toFixed(2)}deg) scale(${(1 - Math.min(0.16, Math.abs(d) * 0.35)).toFixed(3)})`;
      c.style.opacity = String(Math.max(0.28, 1 - Math.abs(d) * 1.5));
      const ad = Math.abs(cx - centerX);
      if (ad < nearestD) { nearestD = ad; nearest = i; }
    });
    if (nearest !== active) {
      active = nearest;
      cards.forEach((c, i) => c.classList.toggle('on', i === nearest));
      if (count) count.textContent = `${String(nearest + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    }
    if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
    drawFilm();
  }

  (function loop() {
    requestAnimationFrame(loop);
    if (!inView) return;
    step();
  })();
  apply();
}

// ── pinned pillars: How Robbie works — 3 acts, 3 films, live cards ──
function pillars() {
  const section = document.getElementById('pillars');
  if (!section) return;
  const track = section.querySelector('.pillars-track');
  const slides = [...section.querySelectorAll('.pillar-slide')];
  const medias = [...section.querySelectorAll('.act-media')];
  const cards = [...section.querySelectorAll('.act-card')];
  const segs = [...section.querySelectorAll('.ap-seg')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let act = -1, local = 0, inView = false;
  let mx = 0, my = 0, smx = 0, smy = 0;

  new IntersectionObserver((es) => { inView = es[es.length - 1].isIntersecting; }, { rootMargin: '10% 0px' })
    .observe(section);

  const onScroll = () => {
    const r = track.getBoundingClientRect();
    const range = Math.max(1, track.offsetHeight - window.innerHeight);
    const p = Math.min(0.9999, Math.max(0, -r.top / range));
    const idx = Math.floor(p * 3);
    local = p * 3 - idx;
    if (idx !== act) {
      act = idx;
      slides.forEach((s, i) => s.classList.toggle('on', i === idx));
      medias.forEach((m, i) => m.classList.toggle('on', i === idx));
      cards.forEach((c) => c.classList.toggle('on', +c.dataset.act === idx));
    }
    segs.forEach((s, i) => {
      s.classList.toggle('on', i === act);
      s.querySelector('i').style.setProperty('--fill', i < act ? 1 : i > act ? 0 : local);
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  window.addEventListener('pointermove', (e) => {
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  // scroll parallax + cursor tilt on the active act's cards
  (function loop() {
    requestAnimationFrame(loop);
    if (!inView || reduced) return;
    smx += (mx - smx) * 0.06;
    smy += (my - smy) * 0.06;
    for (const c of cards) {
      if (+c.dataset.act !== act) continue;
      const depth = parseFloat(c.style.getPropertyValue('--depth')) || 1;
      const drift = (0.5 - local) * 140 * depth;
      const left = c.classList.contains('a-left');
      c.style.transform =
        `translate3d(0, ${drift.toFixed(1)}px, 0) rotate(var(--rot)) ` +
        `rotateY(${(smx * (left ? 7 : -7)).toFixed(2)}deg) rotateX(${(-smy * 5).toFixed(2)}deg)`;
    }
  })();

  // card click → open the matching command-center tab
  section.addEventListener('click', (e) => {
    const card = e.target.closest('.act-card');
    if (!card) return;
    document.querySelector(`.mock-tabs [data-tab="${card.dataset.tab}"]`)?.click();
    document.getElementById('product')?.scrollIntoView({ behavior: 'smooth' });
  });
}

// ── product mockup tabs ──
function tabs() {
  const bar = document.querySelector('.mock-tabs');
  if (!bar) return;
  const panels = document.querySelectorAll('.mock-panel');
  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    bar.querySelectorAll('[data-tab]').forEach((b) => {
      const on = b === btn;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on);
    });
    panels.forEach((p) => p.classList.toggle('on', p.dataset.panel === btn.dataset.tab));
    btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  });
}

// ── pricing toggle with animated prices ──
function pricing() {
  const seg = document.querySelector('.bill-toggle');
  if (!seg) return;
  const prices = document.querySelectorAll('.price-num[data-m]');
  let yearly = false;

  function tween(el, to) {
    const from = parseInt(el.textContent.replace(/\D/g, ''), 10) || 0;
    if (from === to) { el.textContent = to.toLocaleString('en-US'); return; }
    const t0 = performance.now();
    (function step() {
      const t = Math.min(1, Math.max(0, (performance.now() - t0) / 520));
      el.textContent = Math.round(from + (to - from) * easeOut(t)).toLocaleString('en-US');
      if (t < 1) requestAnimationFrame(step);
    })();
  }

  seg.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-bill]');
    if (!btn) return;
    yearly = btn.dataset.bill === 'yearly';
    seg.classList.toggle('yearly', yearly);
    seg.querySelectorAll('[data-bill]').forEach((b) =>
      b.setAttribute('aria-pressed', String((b.dataset.bill === 'yearly') === yearly)));
    prices.forEach((el) => tween(el, parseInt(yearly ? el.dataset.y : el.dataset.m, 10)));
    document.querySelectorAll('.price-note').forEach((n) => {
      n.textContent = yearly ? 'per month · billed yearly' : 'per month · billed monthly';
    });
    document.querySelectorAll('.tier').forEach((t) => {
      t.classList.remove('pulse');
      void t.offsetWidth;
      t.classList.add('pulse');
    });
  });
}

// ── FAQ accordion ──
function faq() {
  const list = document.querySelector('.faq-list');
  if (!list) return;
  list.addEventListener('click', (e) => {
    const head = e.target.closest('.faq-q');
    if (!head) return;
    const item = head.parentElement;
    const open = item.classList.contains('open');
    list.querySelectorAll('.faq-item.open').forEach((i) => {
      i.classList.remove('open');
      i.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
    });
    if (!open) {
      item.classList.add('open');
      head.setAttribute('aria-expanded', 'true');
    }
  });
}

// ── Robbie modal ──
function modal() {
  const overlay = document.getElementById('robbie-modal');
  if (!overlay) return;
  const panel = overlay.querySelector('.modal-panel');
  const form = overlay.querySelector('form');
  const done = overlay.querySelector('.modal-done');

  const open = () => {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => overlay.querySelector('input')?.focus(), 220);
  };
  const close = () => {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    form.hidden = false;
    done.hidden = true;
    form.reset();
  };

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-robbie]')) { e.preventDefault(); open(); }
  });
  overlay.addEventListener('click', (e) => {
    if (!panel.contains(e.target) || e.target.closest('[data-close-modal]')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.hidden = true;
    done.hidden = false;
  });
}

// ── hide missing video layers gracefully ──
function videoFallbacks() {
  document.querySelectorAll('video[data-clip]').forEach((v) => {
    const kill = () => v.closest('.media-layer')?.classList.add('novideo');
    v.addEventListener('error', kill);
    if (v.querySelector('source')) v.querySelector('source').addEventListener('error', kill);
    v.muted = true; // property, not just attribute — required for autoplay in some browsers
    const tryPlay = () => { if (v.paused) v.play().catch(() => {}); };
    tryPlay();
    v.addEventListener('canplay', tryPlay);
    window.addEventListener('pointerdown', tryPlay);
    window.addEventListener('scroll', tryPlay, { passive: true });
  });
}
