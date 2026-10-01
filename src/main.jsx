import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { settingsStore } from './services/settings.js';
import './styles/base.css';

const hash = window.location.hash.replace('#', '');
const route = hash.startsWith('panel') ? 'panel' : 'island';
document.body.classList.add(`route-${route}`);
// On Windows the panel draws its own title bar area next to the native buttons.
if (hash === 'panel-overlay') document.body.classList.add('has-titlebar-overlay');
document.title = route === 'panel' ? 'Dynoland' : 'Dynoland overlay';

settingsStore.init();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App route={route} />
  </StrictMode>,
);
