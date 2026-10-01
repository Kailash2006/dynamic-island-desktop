import { useSyncExternalStore } from 'react';
import { bridge, DEFAULT_SETTINGS } from './bridge.js';

let settings = { ...DEFAULT_SETTINGS };
const listeners = new Set();

function set(next) {
  settings = { ...DEFAULT_SETTINGS, ...next };
  listeners.forEach((fn) => fn());
}

export const settingsStore = {
  get: () => settings,
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  async init() {
    bridge.onSettings(set);
    const initial = await bridge.getSettings();
    if (initial) set(initial);
  },
  update: (key, value) => bridge.setSetting(key, value),
};

export const useSettings = () => useSyncExternalStore(settingsStore.subscribe, settingsStore.get);
