// ─────────────────────────────────────────────────────────────
// Experience preloader.
// Streams every background film into memory (blob playback),
// warms the cache for all scrub frames and imagery, and drives
// a byte-weighted 0→100% counter. Resolves when the experience
// is ready; heavy scroll scenes boot after this settles.
// ─────────────────────────────────────────────────────────────

const MIN_SHOW_MS = 900;    // never strobe on cached repeat visits
const HARD_TIMEOUT_MS = 25000; // never trap the user on a dead asset

export function initPreloader() {
  const el = document.getElementById('preloader');
  if (!el || !window.fetch) return Promise.resolve();

  const numEl = el.querySelector('.pl-num');
  const barEl = el.querySelector('.pl-bar i');
  document.body.classList.add('locked');
  const t0 = performance.now();

  // ── weighted progress (total is registered upfront; jobs only credit `loaded`) ──
  let total = 0;
  let loaded = 0;
  const settle = (w) => { loaded = Math.min(total || Infinity, loaded + w); };

  // ── display loop: number chases real progress, lands on 100 ──
  let shown = 0;
  let finished = false;
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });

  (function paint() {
    const target = total ? (loaded / total) * 100 : 0;
    shown += (target - shown) * 0.14;
    if (target >= 99.9 && shown > 99.2) shown = 100;
    const n = Math.floor(shown);
    if (numEl) numEl.textContent = n;
    if (barEl) barEl.style.transform = `scaleX(${(shown / 100).toFixed(4)})`;
    if (shown >= 100 && !finished) {
      finished = true;
      const wait = Math.max(0, MIN_SHOW_MS - (performance.now() - t0));
      setTimeout(() => {
        el.classList.add('done');
        document.body.classList.remove('locked');
        setTimeout(() => el.remove(), 900);
        resolveDone();
      }, wait + 180);
      return;
    }
    if (!finished) requestAnimationFrame(paint);
  })();

  // ── streaming fetch with byte progress (films) ──
  async function streamVideo(target, w) {
    try {
      const res = await fetch(target.url);
      const len = +res.headers.get('content-length') || w;
      const reader = res.body?.getReader();
      if (!reader) { // no stream support — settle whole weight on arrival
        const blob = await res.blob();
        attach(target.v, blob);
        settle(w);
        return;
      }
      const chunks = [];
      let received = 0;
      let credited = 0;
      for (;;) {
        const { done: eof, value } = await reader.read();
        if (eof) break;
        chunks.push(value);
        received += value.length;
        const credit = Math.min(w, (received / len) * w);
        loaded += credit - credited;
        credited = credit;
      }
      loaded += w - credited;
      attach(target.v, new Blob(chunks, { type: 'video/mp4' }));
    } catch { settle(w); }
  }

  function attach(video, blob) {
    try {
      video.src = URL.createObjectURL(blob);
      video.muted = true;
      video.load();
      video.play().catch(() => {});
    } catch { /* keep original <source> */ }
  }

  // ── cache-warming fetch (frames, imagery) ──
  async function warm(url, w) {
    try { await fetch(url).then((r) => r.blob()); } catch { /* counted anyway */ }
    settle(w);
  }

  async function pool(jobs, size) {
    const queue = [...jobs];
    const workers = Array.from({ length: size }, async () => {
      while (queue.length) await queue.shift()();
    });
    await Promise.all(workers);
  }

  // ── build the manifest-driven asset list and go ──
  const run = (async () => {
    const videos = [...document.querySelectorAll('video')]
      .map((v) => ({ v, url: v.querySelector('source')?.getAttribute('src') }))
      .filter((t) => t.url);
    const videoWeights = { hero: 6.1e6, 'act-understand': 10.1e6, 'act-source': 6.9e6, 'act-deploy': 8.5e6, command: 5.5e6 };
    const videoJobs = videos.map((t) => () => {
      const key = Object.keys(videoWeights).find((k) => t.url.includes(k));
      return streamVideo(t, videoWeights[key] || 7e6);
    });

    const manifests = await Promise.all(
      ['dissect', 'journey'].map((d) =>
        fetch(`/frames/${d}/manifest.json`).then((r) => (r.ok ? r.json() : { count: 0 })).catch(() => ({ count: 0 }))
      )
    );
    const frameJobs = [];
    const frameWeight = [118000, 56000];
    manifests.forEach((man, mi) => {
      const dir = mi === 0 ? 'dissect' : 'journey';
      for (let i = 1; i <= (man.count || 0); i++) {
        frameJobs.push(() => warm(`/frames/${dir}/f_${String(i).padStart(3, '0')}.jpg`, frameWeight[mi]));
      }
    });

    const imgJobs = [
      '/img/exploded.jpg',
      '/img/brand/logo-light.png',
      '/img/brand/logo-dark.png',
      '/img/cards/understand-scan.jpg', '/img/cards/understand-bom.jpg',
      '/img/cards/source-trust.jpg', '/img/cards/source-quotes.jpg',
      '/img/cards/deploy-golive.jpg', '/img/cards/deploy-finance.jpg',
    ].map((u) => () => warm(u, 160000));

    // register the full weight table before any job credits progress
    total =
      videos.reduce((sum, t) => sum + (videoWeights[Object.keys(videoWeights).find((k) => t.url.includes(k))] || 7e6), 0) +
      manifests.reduce((sum, man, mi) => sum + (man.count || 0) * frameWeight[mi], 0) +
      imgJobs.length * 160000;

    await Promise.all([
      pool(videoJobs, 3),
      pool([...frameJobs, ...imgJobs], 10),
    ]);
    loaded = total; // exact landing
  })();

  // never trap the user
  const timeout = new Promise((r) => setTimeout(r, HARD_TIMEOUT_MS));
  Promise.race([run, timeout]).then(() => { loaded = total = Math.max(1, total); });

  return done;
}
