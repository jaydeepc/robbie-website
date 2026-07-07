// ─────────────────────────────────────────────────────────────
// Scroll-pinned humanoid dissection — film-scrub edition.
// A Seedance-generated master clip (assembled → exploded, locked
// camera) is extracted to a frame sequence. Scroll drives the
// frame index + a synthetic Ken-Burns crop per stage; CAD
// callouts and Robi intelligence cards anchor to 2D marks.
// ─────────────────────────────────────────────────────────────
import { STAGES, ALL_PARTS } from './data.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function initDissection() {
  const section = document.getElementById('dissect');
  const track = section.querySelector('.dissect-track');
  const sticky = section.querySelector('.dissect-sticky');
  const canvas = section.querySelector('#stage3d');
  const svg = section.querySelector('.callout-lines');
  const labelLayer = section.querySelector('.callout-layer');
  const stageCard = section.querySelector('.stage-card');
  const holo = section.querySelector('.holo-card');
  const rail = section.querySelector('.stage-rail');
  const hint = section.querySelector('.dissect-hint');
  const loader = section.querySelector('.scrub-loader');
  const loaderBar = loader?.querySelector('b');
  const ring = section.querySelector('.focus-ring');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  // ── frame sequence ──
  let frames = [];
  let count = 0;
  let loadedN = 0;
  let VIDW = 1920, VIDH = 1080;
  let dirty = true;

  fetch('/frames/dissect/manifest.json')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no manifest'))))
    .then((man) => {
      count = man.count;
      VIDW = man.width || 1920;
      VIDH = man.height || 1080;
      frames = new Array(count).fill(null);
      // coarse pass first (every 6th frame), then the rest — scrubbable fast
      const order = [...Array(count).keys()].sort(
        (a, b) => ((a % 6 === 0 ? 0 : 1) - (b % 6 === 0 ? 0 : 1)) || a - b
      );
      for (const i of order) {
        const img = new Image();
        img.decoding = 'async';
        img.src = `/frames/dissect/f_${String(i + 1).padStart(3, '0')}.jpg`;
        img.onload = () => {
          frames[i] = img;
          loadedN++;
          dirty = true;
          if (loaderBar) loaderBar.style.width = `${Math.round((loadedN / count) * 100)}%`;
          if (loader && loadedN >= count * 0.3) loader.classList.add('done');
        };
        img.onerror = () => { loadedN++; };
      }
    })
    .catch(() => {
      section.classList.add('film-missing');
      loader?.classList.add('done');
    });

  const nearestFrame = (i) => {
    if (frames[i]) return frames[i];
    for (let d = 1; d < count; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  };

  // ── stage rail ──
  rail.innerHTML = STAGES.map((s, i) =>
    `<button class="rail-item" data-i="${i}" aria-label="${s.kicker}">
       <span class="rail-dot"></span><span class="rail-name">${i === 0 ? 'Assembled' : s.kicker.split('· ')[1]}</span>
     </button>`).join('');
  const railItems = [...rail.children];

  // ── scroll state ──
  let trackTop = 0, trackRange = 1;
  let targetP = 0, p = 0;
  let activeIdx = -1;
  let inView = false;
  let cssW = 0, cssH = 0;

  function measure() {
    const r = track.getBoundingClientRect();
    trackTop = r.top + window.scrollY;
    trackRange = Math.max(1, track.offsetHeight - window.innerHeight);
    cssW = sticky.clientWidth;
    cssH = sticky.clientHeight;
    canvas.width = Math.round(cssW * DPR);
    canvas.height = Math.round(cssH * DPR);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    svg.setAttribute('viewBox', `0 0 ${cssW} ${cssH}`);
    dirty = true;
  }
  measure();
  window.addEventListener('resize', measure);

  new IntersectionObserver((entries) => {
    inView = entries[entries.length - 1].isIntersecting;
  }, { rootMargin: '20% 0px' }).observe(section);

  const onScroll = () => { targetP = clamp((window.scrollY - trackTop) / trackRange, 0, 1); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  p = targetP; // land on the current scroll position — no catch-up replay on load

  railItems.forEach((el) => el.addEventListener('click', () => {
    const i = +el.dataset.i;
    window.scrollTo({ top: trackTop + (i / (STAGES.length - 1)) * trackRange + 2, behavior: 'smooth' });
  }));

  // ── synthetic camera: crop rect in video px for current view ──
  const view = { frac: 0, zoom: 1, cx: 0.5, cy: 0.5 };
  let crop = { sx: 0, sy: 0, sw: VIDW, sh: VIDH };

  function computeView(f) {
    const i0 = Math.min(STAGES.length - 1, Math.floor(f));
    const i1 = Math.min(STAGES.length - 1, i0 + 1);
    const t = smooth(f - i0);
    const a = STAGES[i0].view, b = STAGES[i1].view;
    view.frac = lerp(a.f, b.f, t);
    view.zoom = lerp(a.zoom, b.zoom, t);
    view.cx = lerp(a.cx, b.cx, t);
    view.cy = lerp(a.cy, b.cy, t);
  }

  function computeCrop() {
    // cover-fit base crop of the canvas aspect, then zoom in around (cx, cy)
    const canvasAspect = cssW / Math.max(1, cssH);
    const videoAspect = VIDW / VIDH;
    let baseW, baseH;
    if (canvasAspect > videoAspect) { baseW = VIDW; baseH = VIDW / canvasAspect; }
    else { baseH = VIDH; baseW = VIDH * canvasAspect; }
    const sw = baseW / view.zoom;
    const sh = baseH / view.zoom;
    const sx = clamp(view.cx * VIDW - sw / 2, 0, VIDW - sw);
    const sy = clamp(view.cy * VIDH - sh / 2, 0, VIDH - sh);
    crop = { sx, sy, sw, sh };
  }

  // map a video-frame fraction point to canvas CSS px (null if outside)
  function mapPt(fx, fy) {
    const x = ((fx * VIDW - crop.sx) / crop.sw) * cssW;
    const y = ((fy * VIDH - crop.sy) / crop.sh) * cssH;
    return { x, y, visible: x > -40 && x < cssW + 40 && y > -40 && y < cssH + 40 };
  }

  // ── stage UI ──
  function setStage(i) {
    activeIdx = i;
    const s = STAGES[i];

    stageCard.classList.remove('swap');
    void stageCard.offsetWidth;
    stageCard.classList.add('swap');
    stageCard.innerHTML = `
      <div class="sc-kicker"><span class="sc-num">${s.num}</span>${s.kicker}</div>
      <h3 class="sc-title">${s.title}</h3>
      <p class="sc-what">${s.what}</p>
      <p class="sc-why">${s.why}</p>
      <div class="robbie-line"><span class="robbie-dot" aria-hidden="true"></span><p>${s.robbie}</p></div>
      ${s.parts.length ? `<div class="sc-parts">${s.parts.map((id) => `<span>${ALL_PARTS[id].name}</span>`).join('')}</div>` : `<div class="sc-scroll-cue">Scroll to begin the dissection ↓</div>`}`;

    if (s.featured) {
      const d = ALL_PARTS[s.featured];
      holo.classList.remove('swap');
      void holo.offsetWidth;
      holo.classList.add('swap', 'on');
      holo.innerHTML = `
        <div class="holo-head">
          <span class="holo-code">${d.code}</span>
          <span class="holo-live"><i></i>Robbie Intelligence</span>
        </div>
        <div class="holo-name">${d.name}</div>
        <div class="holo-type">${d.type}</div>
        <dl class="holo-grid">
          <div><dt>Supplier category</dt><dd>${d.supplier}</dd></div>
          <div><dt>Verified suppliers</dt><dd class="hl">${d.verified} verified</dd></div>
          <div><dt>Price range</dt><dd>${d.price}</dd></div>
          <div><dt>Lead time</dt><dd>${d.lead}</dd></div>
          <div><dt>Compliance</dt><dd>${d.comp}</dd></div>
          <div><dt>Risk signal</dt><dd class="risk">${d.risk}</dd></div>
          <div><dt>Alternatives</dt><dd>${d.alts}</dd></div>
        </dl>
        <button class="holo-cta" data-open-robbie>Ask Robbie about this part</button>`;
    } else {
      holo.classList.remove('on');
    }

    railItems.forEach((el, j) => el.classList.toggle('on', j === i));
    buildCallouts(s);
    section.dataset.stage = s.id;
    section.dataset.stageIndex = i;
  }

  // ── callouts (anchored to per-stage 2D marks) ──
  let callouts = []; // {fx, fy, el, line, dot, featured}
  let featuredMark = null;

  function buildCallouts(s) {
    labelLayer.innerHTML = '';
    svg.innerHTML = '';
    callouts = [];
    featuredMark = null;
    const narrow = window.innerWidth < 760;
    // featured mark first so it survives the narrow-screen slice
    const marks = [...s.marks].sort((a, b) => (a[0] === s.featured ? -1 : 0) - (b[0] === s.featured ? -1 : 0));
    for (const [id, fx, fy] of marks.slice(0, narrow ? 2 : 6)) {
      const d = ALL_PARTS[id];
      const featured = id === s.featured;
      const el = document.createElement('div');
      el.className = 'callout' + (featured ? ' featured' : '');
      el.innerHTML = `<span class="c-code">${d.code}</span><span class="c-name">${d.name}</span>${featured ? `<span class="c-meta">${d.verified} suppliers · ${d.lead}</span>` : ''}`;
      labelLayer.appendChild(el);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      line.setAttribute('class', 'c-line' + (featured ? ' featured' : ''));
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('class', 'c-dot' + (featured ? ' featured' : ''));
      dot.setAttribute('r', featured ? 4 : 3);
      svg.appendChild(line);
      svg.appendChild(dot);
      callouts.push({ fx, fy, el, line, dot, featured });
      if (featured) featuredMark = { fx, fy };
    }
  }

  function layoutCallouts() {
    const placed = { left: [], right: [] };
    for (const c of callouts) {
      const pt = mapPt(c.fx, c.fy);
      if (!pt.visible) { c.el.style.opacity = 0; c.line.setAttribute('points', ''); c.dot.setAttribute('r', 0); continue; }
      c.el.style.opacity = 1;
      c.dot.setAttribute('r', c.featured ? 4 : 3);
      const side = pt.x < cssW / 2 ? 'left' : 'right';
      const reach = Math.min(cssW * 0.16, 190);
      let lx = side === 'left' ? pt.x - reach : pt.x + reach;
      let ly = pt.y - 14;
      const col = placed[side];
      for (const py of col) if (Math.abs(ly - py) < 64) ly = py + 64;
      col.push(ly);
      const bw = c.el.offsetWidth, bh = c.el.offsetHeight;
      lx = clamp(lx, 12, cssW - bw - 12);
      ly = clamp(ly, 84, cssH - bh - 90);
      c.el.style.transform = `translate(${side === 'left' ? lx - bw : lx}px, ${ly - bh / 2}px)`;
      const ex = side === 'left' ? lx + 6 : lx - 6;
      const elbowX = side === 'left' ? pt.x - reach * 0.45 : pt.x + reach * 0.45;
      c.line.setAttribute('points', `${pt.x},${pt.y} ${elbowX},${ly} ${ex},${ly}`);
      c.dot.setAttribute('cx', pt.x);
      c.dot.setAttribute('cy', pt.y);
    }
    if (ring) {
      if (featuredMark) {
        const pt = mapPt(featuredMark.fx, featuredMark.fy);
        ring.classList.toggle('on', pt.visible);
        if (pt.visible) ring.style.transform = `translate(${pt.x}px, ${pt.y}px) translate(-50%, -50%)`;
      } else {
        ring.classList.remove('on');
      }
    }
  }

  // ── draw ──
  let lastFrameDrawn = -1;
  function draw() {
    if (!count) return;
    const idx = clamp(Math.round(view.frac * (count - 1)), 0, count - 1);
    const img = nearestFrame(idx);
    if (!img) return;
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, cssW, cssH);
    lastFrameDrawn = idx;
  }

  setStage(0);

  // ── main loop ──
  let prevSig = '';
  function frame() {
    requestAnimationFrame(frame);
    if (!inView) return;

    p += (targetP - p) * (REDUCED ? 1 : 0.11);
    if (Math.abs(targetP - p) < 0.0004) p = targetP;

    const f = p * (STAGES.length - 1);
    const idx = Math.min(STAGES.length - 1, Math.round(f));
    if (idx !== activeIdx) setStage(idx);

    computeView(f);
    computeCrop();

    const sig = `${view.frac.toFixed(4)}|${view.zoom.toFixed(3)}|${view.cx.toFixed(3)}|${view.cy.toFixed(3)}`;
    if (sig !== prevSig || dirty) {
      draw();
      prevSig = sig;
      dirty = false;
    }
    if (hint) hint.style.opacity = p < 0.015 ? 1 : 0;
    layoutCallouts();
  }
  frame();
}
