import { island } from '../activityManager.js';
import { showStatus } from './status.js';
import { chime } from '../sound.js';

let ringTimeout = null;
let ticker = null;

function formatCall(seconds) {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export const call = {
  incoming(name = 'Priya Raman', label = 'Mobile') {
    clearTimeout(ringTimeout);
    clearInterval(ticker);
    island.show({ id: 'call', type: 'call', kind: 'live', state: 'incoming', name, label, muted: false, elapsed: 0 });
    chime('attention');
    ringTimeout = setTimeout(() => {
      island.remove('call');
      showStatus('warning', 'Missed call', name);
    }, 20000);
  },
  accept() {
    clearTimeout(ringTimeout);
    const startedAt = Date.now();
    island.update('call', { state: 'active', elapsed: 0 });
    ticker = setInterval(() => {
      island.update('call', { elapsed: Math.floor((Date.now() - startedAt) / 1000) });
    }, 1000);
  },
  decline() {
    clearTimeout(ringTimeout);
    island.remove('call');
  },
  toggleMute() {
    const current = island.get('call');
    if (current) island.update('call', { muted: !current.muted });
  },
  end() {
    const current = island.get('call');
    clearInterval(ticker);
    island.remove('call');
    if (current) showStatus('info', 'Call ended', `${current.name}, ${formatCall(current.elapsed)}`, 2600);
  },
  format: formatCall,
};
