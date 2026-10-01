import { island } from '../activityManager.js';
import { notificationHistory, pushHistory } from '../stores.js';

const SAMPLES = [
  { app: 'WhatsApp', sender: 'Priya', body: 'Are we still meeting at 6 near the library?', color: '#25d366', glyph: 'W' },
  { app: 'Telegram', sender: 'ML Study Group', body: 'Slides for tomorrow are pinned', color: '#2aabee', glyph: 'T' },
  { app: 'Outlook', sender: 'GitHub', body: 'Your pull request #42 was merged into main', color: '#0a64d6', glyph: 'O' },
];
let next = 0;

export function showNotification(notification) {
  island.show({ id: 'notification', type: 'notification', kind: 'alert', duration: 5200, ...notification });
}

export function showSampleNotification() {
  const sample = SAMPLES[next];
  pushHistory(notificationHistory, { key: `sample-${Date.now()}`, app: sample.app, color: sample.color, title: sample.sender, body: sample.body, at: Date.now() }, 3);
  showNotification(sample);
  next = (next + 1) % SAMPLES.length;
}
