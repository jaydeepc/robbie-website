import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/inter';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles.css';

import { renderSections } from './render.js';
import { initUI } from './ui.js';
import { initDissection } from './dissection.js';
import { initExplorer } from './explorer.js';

renderSections();
initUI();

try {
  initDissection();
} catch (err) {
  console.error('[TRP] dissection scene failed', err);
  document.getElementById('dissect')?.classList.add('film-missing');
}

try {
  initExplorer();
} catch (err) {
  console.error('[TRP] explorer scene failed', err);
}
