import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/inter';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles.css';

import { initPreloader } from './preload.js';
import { renderSections } from './render.js';
import { initUI } from './ui.js';
import { initDissection } from './dissection.js';
import { initExplorer } from './explorer.js';

renderSections();
const ready = initPreloader(); // streams films + warms every frame/image, drives the 0→100%
initUI();

// heavy scroll scenes boot once the experience is fully cached — instant everywhere
ready.then(() => {
  try {
    initDissection();
  } catch (err) {
    console.error('[HR] dissection scene failed', err);
    document.getElementById('dissect')?.classList.add('film-missing');
  }
  try {
    initExplorer();
  } catch (err) {
    console.error('[HR] explorer scene failed', err);
  }
});
