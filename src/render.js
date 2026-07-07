// Renders data-driven sections (logos · flow · modules · FAQ) into their containers.
import { LOGOS, FLOW, MODULES, FAQ } from './data.js';

const ICONS = {
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><rect x="2.5" y="4.5" width="3" height="3" rx="0.8"/><rect x="2.5" y="10.5" width="3" height="3" rx="0.8"/><rect x="2.5" y="16.5" width="3" height="3" rx="0.8"/>',
  radar: '<path d="M12 12 20 5.5"/><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.6"/>',
  graph: '<circle cx="5" cy="18" r="2.5"/><circle cx="12" cy="6" r="2.5"/><circle cx="19" cy="15" r="2.5"/><path d="M6.8 16.2 10.4 8M13.9 7.6l3.5 5.6M7.5 18h9"/>',
  send: '<path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8 21 3z"/>',
  scales: '<path d="M12 4v16M4 20h16M7 4.8 12 4l5 .8"/><path d="M7 5 4.4 11h5.2L7 5zM17 5l-2.6 6h5.2L17 5z"/>',
  shield: '<path d="M12 2.5 20 6v6c0 5-3.4 8.2-8 9.5C7.4 20.2 4 17 4 12V6l8-3.5z"/><path d="m8.8 12 2.2 2.2 4.4-4.4"/>',
  coins: '<ellipse cx="12" cy="6" rx="7.5" ry="3.2"/><path d="M4.5 6v6c0 1.8 3.4 3.2 7.5 3.2s7.5-1.4 7.5-3.2V6"/><path d="M4.5 12v6c0 1.8 3.4 3.2 7.5 3.2s7.5-1.4 7.5-3.2v-6"/>',
  doc: '<path d="M6 2.5h8L19 7.5v14H6v-19z"/><path d="M14 2.5v5h5M9 12h7M9 16h7"/>',
  rocket: '<path d="M12 16c5-3.5 7-8 6.5-12.5C14 3 9.5 5 6 10l6 6z"/><path d="M6 10c-2 .5-3.5 2-4 5 3-.5 4.5-2 5-4M12 16c-.5 2-2 3.5-5 4 .5-3 2-4.5 4-5"/><circle cx="13.5" cy="8.5" r="1.6"/>',
};

const icon = (k) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;

export function renderSections() {
  // logos — duplicated row for a seamless marquee
  const row = document.querySelector('.logo-row');
  if (row) {
    const marks = LOGOS.map((n, i) => `<span class="logo-mark m${i % 4}"><i aria-hidden="true"></i>${n}</span>`).join('');
    row.innerHTML = marks + marks;
  }

  // RFQ journey rail
  const rail = document.querySelector('.journey-rail');
  if (rail) {
    rail.innerHTML = FLOW.map(([name, desc], i) => `
      <div class="j-card" data-i="${i}">
        <span class="j-num mono">${String(i + 1).padStart(2, '0')}</span>
        <span class="j-name">${name}</span>
        <span class="j-desc">${desc}</span>
        <i class="j-tick" aria-hidden="true"></i>
      </div>`).join('');
  }

  // modules
  const grid = document.querySelector('.module-grid');
  if (grid) {
    grid.innerHTML = MODULES.map(([name, desc, ic], i) => `
      <div class="module-card" data-reveal style="--d:${(i % 5) * 0.06}s">
        <span class="module-ico">${icon(ic)}</span>
        <h3>${name}</h3>
        <p>${desc}</p>
      </div>`).join('');
  }

  // faq
  const faq = document.querySelector('.faq-list');
  if (faq) {
    faq.innerHTML = FAQ.map(([q, a], i) => `
      <div class="faq-item${i === 0 ? ' open' : ''}">
        <button class="faq-q" aria-expanded="${i === 0}">
          <span>${q}</span><i class="faq-ico" aria-hidden="true"></i>
        </button>
        <div class="faq-a"><div class="faq-a-inner"><p>${a}</p></div></div>
      </div>`).join('');
  }
}
