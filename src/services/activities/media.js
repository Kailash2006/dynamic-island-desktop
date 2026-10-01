import { island } from '../activityManager.js';
import { bridge } from '../bridge.js';
import { settingsStore } from '../settings.js';

// Real "now playing" from Windows (Spotify, YouTube in a browser, Apple Music…).

const APP_NAMES = [
  [/spotify/i, 'Spotify'],
  [/applemusic|apple music|itunes/i, 'Apple Music'],
  [/zunemusic|mediaplayer/i, 'Media Player'],
  [/amazon.?music/i, 'Amazon Music'],
  [/saavn/i, 'JioSaavn'],
  [/gaana/i, 'Gaana'],
  [/wynk/i, 'Wynk Music'],
  [/deezer/i, 'Deezer'],
  [/tidal/i, 'Tidal'],
  [/vlc/i, 'VLC'],
  [/chrome/i, 'Chrome'],
  [/msedge/i, 'Edge'],
  [/firefox/i, 'Firefox'],
  [/brave/i, 'Brave'],
  [/opera/i, 'Opera'],
];

export function mediaAppName(appId = '') {
  for (const [pattern, name] of APP_NAMES) if (pattern.test(appId)) return name;
  const base = appId.split('!')[0].split(/[\\/]/).pop().replace(/\.exe$/i, '');
  return (base.includes('.') ? base.split('_')[0].split('.').pop() : base) || 'Media';
}

const thumbs = new Map();
let lastKey = null;
let pausedTimer = null;
const PAUSED_HIDE_MS = 60_000;

export function handleMediaThumb({ key, data }) {
  if (!key) return;
  thumbs.set(key, data);
  if (thumbs.size > 12) thumbs.delete(thumbs.keys().next().value);
  const current = island.get('media');
  if (current?.key === key) island.update('media', { art: data });
}

export function handleMediaUpdate(session) {
  if (!session || !settingsStore.get().media) {
    clearTimeout(pausedTimer);
    lastKey = null;
    island.remove('media');
    return;
  }
  const playing = session.status === 'Playing';
  const existing = island.get('media');
  const newTrack = session.key !== lastKey;
  lastKey = session.key;

  if (!playing && !existing) return; // an app that's merely paused stays out of the way

  const data = {
    id: 'media',
    type: 'media',
    kind: 'live',
    key: session.key,
    app: mediaAppName(session.app),
    title: session.title,
    artist: session.artist || session.album || '',
    playing,
    position: Math.max(0, session.position || 0),
    length: session.duration > 1 ? session.duration : 0, // not `duration`: that name means auto-dismiss
    updatedAt: session.updatedAt || Date.now(),
    art: thumbs.get(session.key) ?? null,
    canSkip: session.canSkip !== false,
  };

  const activeNow = island.get(island.getState().activeId);
  const takeFocus = playing && (newTrack || !existing) && activeNow?.kind !== 'alert';
  island.show({ ...data, focus: takeFocus });

  clearTimeout(pausedTimer);
  if (!playing) pausedTimer = setTimeout(() => island.remove('media'), PAUSED_HIDE_MS);
}

export function mediaPosition(a, now = Date.now()) {
  const elapsed = a.playing ? Math.max(0, (now - a.updatedAt) / 1000) : 0;
  const position = a.position + elapsed;
  return a.length ? Math.min(a.length, position) : position;
}

export const mediaControls = {
  toggle() {
    const a = island.get('media');
    if (a) island.update('media', { playing: !a.playing, position: mediaPosition(a), updatedAt: Date.now() });
    bridge.mediaCommand('toggle');
  },
  next: () => bridge.mediaCommand('next'),
  previous: () => bridge.mediaCommand('prev'),
};
