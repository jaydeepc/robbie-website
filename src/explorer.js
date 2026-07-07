// ─────────────────────────────────────────────────────────────
// Component intelligence explorer — annotated film edition.
// The fully-exploded frame of the Seedance master clip becomes a
// CAD plate: pulsing hotspot markers open each part's Robi
// intelligence card. Chips mirror every marker.
// ─────────────────────────────────────────────────────────────
import { PARTS, ALL_PARTS, CATEGORY_LABELS } from './data.js';

// hotspot positions as fractions of the exploded still (tuned to the frame)
export const HOTSPOTS = {
  lidar: [0.505, 0.035],
  visor: [0.5, 0.062],
  depth_cam: [0.5, 0.1],
  mics: [0.565, 0.075],
  shoulder_act: [0.552, 0.28],
  elbow: [0.655, 0.315],
  torque_sensor: [0.706, 0.342],
  hand: [0.735, 0.36],
  arm_struct: [0.315, 0.325],
  compute: [0.5, 0.315],
  battery: [0.498, 0.44],
  bms: [0.527, 0.395],
  estop: [0.415, 0.29],
  charger: [0.468, 0.51],
  motor_ctrl: [0.558, 0.345],
  harness: [0.535, 0.49],
  frame: [0.5, 0.55],
  hip: [0.532, 0.585],
  knee: [0.53, 0.74],
  leg_struct: [0.568, 0.71],
  foot_sensor: [0.462, 0.955],
};

let STILL_W = 1920, STILL_H = 1080; // exploded.jpg dimensions (updated from the loaded image)

export function initExplorer() {
  const section = document.getElementById('explorer');
  if (!section) return;
  const viewport = section.querySelector('.explorer-viewport');
  const img = section.querySelector('#exploded-still');
  const layer = section.querySelector('.hotspot-layer');
  const chipWrap = section.querySelector('.explorer-chips');
  const card = section.querySelector('.intel-card');
  if (!viewport || !layer) return;

  // ── build hotspots + chips ──
  const spots = new Map();
  for (const [id, [fx, fy]] of Object.entries(HOTSPOTS)) {
    if (!ALL_PARTS[id]) continue;
    const b = document.createElement('button');
    b.className = 'hotspot';
    b.dataset.part = id;
    b.setAttribute('aria-label', `${ALL_PARTS[id].name} — open intelligence card`);
    b.innerHTML = '<i></i>';
    layer.appendChild(b);
    spots.set(id, { el: b, fx, fy });
  }

  chipWrap.innerHTML = Object.entries(PARTS)
    .map(([id, d]) => `<button class="chip" data-part="${id}"><i></i>${d.name}</button>`)
    .join('');

  // ── object-fit: cover mapping for marker positions ──
  function layout() {
    if (img?.naturalWidth) { STILL_W = img.naturalWidth; STILL_H = img.naturalHeight; }
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    const scale = Math.max(vw / STILL_W, vh / STILL_H);
    const dw = STILL_W * scale, dh = STILL_H * scale;
    const ox = (vw - dw) / 2, oy = (vh - dh) / 2;
    for (const { el, fx, fy } of spots.values()) {
      const x = ox + fx * dw, y = oy + fy * dh;
      const visible = x > 8 && x < vw - 8 && y > 8 && y < vh - 8;
      el.style.display = visible ? '' : 'none';
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    }
  }
  layout();
  window.addEventListener('resize', layout);
  img?.addEventListener('load', layout);

  // ── selection ──
  function select(id) {
    const d = ALL_PARTS[id];
    if (!d) return;
    chipWrap.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c.dataset.part === id));
    for (const [sid, s] of spots) s.el.classList.toggle('on', sid === id);
    card.classList.remove('swap');
    void card.offsetWidth;
    card.classList.add('swap');
    card.innerHTML = `
      <div class="intel-top">
        <span class="holo-code">${d.code}</span>
        <span class="intel-cat">${CATEGORY_LABELS[d.cat]}</span>
      </div>
      <h3 class="intel-name">${d.name}</h3>
      <p class="intel-type">${d.type}</p>
      <p class="intel-role">${d.role}</p>
      <dl class="holo-grid intel-grid">
        <div><dt>Supplier category</dt><dd>${d.supplier}</dd></div>
        <div><dt>Verified suppliers</dt><dd class="hl">${d.verified} verified</dd></div>
        <div><dt>Price band</dt><dd>${d.price}</dd></div>
        <div><dt>Lead time</dt><dd>${d.lead}</dd></div>
        <div><dt>Compliance needs</dt><dd>${d.comp}</dd></div>
        <div><dt>Risk alerts</dt><dd class="risk">${d.risk}</dd></div>
        <div><dt>Recommended alternatives</dt><dd>${d.alts}</dd></div>
      </dl>
      <div class="intel-actions">
        <button class="btn btn-primary btn-sm" data-open-robbie>Ask Robbie for quotes</button>
        <button class="btn btn-ghost-dark btn-sm" data-open-robbie>Add to BoM</button>
      </div>`;
  }

  layer.addEventListener('click', (e) => {
    const spot = e.target.closest('.hotspot');
    if (spot) select(spot.dataset.part);
  });
  chipWrap.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) select(chip.dataset.part);
  });

  select('hand');
}
