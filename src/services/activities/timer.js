import { island } from '../activityManager.js';
import { showStatus } from './status.js';
import { chime } from '../sound.js';

let ticker = null;
let endsAt = 0;
let remaining = 0;
let total = 0;
let label = 'Timer';

function stopTicking() {
  clearInterval(ticker);
  ticker = null;
}

function tick() {
  const ms = Math.max(0, endsAt - Date.now());
  const seconds = Math.ceil(ms / 1000);
  const current = island.get('timer');
  if (current && current.seconds !== seconds) island.update('timer', { seconds });
  if (ms <= 0) finish();
}

function finish() {
  stopTicking();
  island.remove('timer');
  chime('done');
  showStatus('success', 'Timer done', label === 'Timer' ? `${formatDuration(total)} timer finished` : `${label} finished`, 4200);
}

export function formatDuration(seconds) {
  if (seconds >= 60) return `${Math.round(seconds / 60)} min`;
  return `${seconds} sec`;
}

export const timer = {
  start(seconds = 10, name = 'Timer') {
    stopTicking();
    total = seconds;
    label = name;
    endsAt = Date.now() + seconds * 1000;
    island.show({ id: 'timer', type: 'timer', kind: 'live', label, total, seconds, paused: false });
    ticker = setInterval(tick, 200);
  },
  pause() {
    if (!ticker) return;
    remaining = Math.max(0, endsAt - Date.now());
    stopTicking();
    island.update('timer', { paused: true });
  },
  resume() {
    if (ticker) return;
    endsAt = Date.now() + remaining;
    island.update('timer', { paused: false });
    ticker = setInterval(tick, 200);
  },
  toggle() {
    if (island.get('timer')?.paused) timer.resume();
    else timer.pause();
  },
  cancel() {
    stopTicking();
    island.remove('timer');
  },
};
