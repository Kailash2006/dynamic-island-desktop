import { useSyncExternalStore } from 'react';
import { bridge } from './bridge.js';

// Minimal observable value, used for small shared bits of renderer state.
export function createStore(initial) {
  let value = initial;
  const listeners = new Set();
  return {
    get: () => value,
    set(next) {
      value = typeof next === 'function' ? next(value) : next;
      listeners.forEach((fn) => fn());
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export const useStore = (store) => useSyncExternalStore(store.subscribe, store.get);

// Integration status from the main process (media, notifications, updates).
export const statusStore = createStore({
  media: { state: 'off' },
  notifications: { state: 'off' },
  glass: { state: 'off' },
  update: { state: 'idle' },
});
let statusStarted = false;
export function initStatus() {
  if (statusStarted) return;
  statusStarted = true;
  bridge.onStatus((next) => statusStore.set(next));
  bridge.getStatus?.().then((next) => next && statusStore.set(next));
}

// What the liquid glass refracts: { url: wallpaper crop, layers: [app window
// crops placed in page pixels, topmost first] }, or null when unavailable.
export const backdropStore = createStore(null);

// Recent items for the island's home view. Kept in memory only.
export const clipboardHistory = createStore([]);
export const notificationHistory = createStore([]);

export function pushHistory(store, item, limit = 5) {
  store.set((list) => [item, ...list.filter((x) => x.key !== item.key)].slice(0, limit));
}
