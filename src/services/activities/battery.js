import { useSyncExternalStore } from 'react';
import { island } from '../activityManager.js';
import { settingsStore } from '../settings.js';
import { showStatus } from './status.js';

// Real battery data from Chromium's Battery Status API.
let snapshot = { supported: false, level: null, charging: false };
const listeners = new Set();
const warned = new Set();

function publish(next) {
  snapshot = next;
  listeners.forEach((fn) => fn());
}

export function showCharging(level) {
  island.show({ id: 'charging', type: 'charging', kind: 'live', level, duration: 4500 });
}

let started = false;

export async function initBattery() {
  if (started || !navigator.getBattery) return;
  started = true;
  const battery = await navigator.getBattery();
  const read = () => ({ supported: true, level: battery.level, charging: battery.charging });
  publish(read());

  battery.addEventListener('chargingchange', () => {
    publish(read());
    if (battery.charging) warned.clear();
    if (battery.charging && settingsStore.get().battery) showCharging(battery.level);
  });

  battery.addEventListener('levelchange', () => {
    publish(read());
    if (battery.charging || !settingsStore.get().battery) return;
    const percent = Math.round(battery.level * 100);
    for (const threshold of [20, 10]) {
      if (percent <= threshold && !warned.has(threshold)) {
        warned.add(threshold);
        showStatus('warning', 'Battery low', `${percent}% remaining. Plug in soon.`, 5000);
        break;
      }
    }
  });
}

export const batteryStore = {
  get: () => snapshot,
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export const useBattery = () => useSyncExternalStore(batteryStore.subscribe, batteryStore.get);
