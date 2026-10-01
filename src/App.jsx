import { useEffect } from 'react';
import DynamicIsland from './components/DynamicIsland/DynamicIsland.jsx';
import ControlPanel from './components/ControlPanel/ControlPanel.jsx';
import { useClickThrough } from './hooks/useClickThrough.js';
import { settingsStore, useSettings } from './services/settings.js';
import { bridge } from './services/bridge.js';
import { handleCommand } from './services/commands.js';
import { initBattery } from './services/activities/battery.js';
import { showClipboard } from './services/activities/clipboard.js';
import { handleMediaThumb, handleMediaUpdate } from './services/activities/media.js';
import { handleAppNotification, handleNotificationRemoved } from './services/activities/appNotifications.js';
import { backdropStore, initStatus } from './services/stores.js';

function IslandApp() {
  useClickThrough();

  useEffect(() => {
    initBattery();
    initStatus();
    const off = [
      bridge.onCommand(handleCommand),
      bridge.onClipboard((payload) => settingsStore.get().clipboard && showClipboard(payload)),
      bridge.onMedia(handleMediaUpdate),
      bridge.onMediaThumb(handleMediaThumb),
      bridge.onNotification(handleAppNotification),
      bridge.onNotificationRemoved(handleNotificationRemoved),
      bridge.onBackdrop((payload) => backdropStore.set(payload ?? null)),
    ];
    return () => off.forEach((fn) => fn());
  }, []);

  return <DynamicIsland />;
}

export default function App({ route }) {
  const settings = useSettings();
  useEffect(() => {
    document.body.classList.toggle('reduce-motion', settings.reduceMotion);
  }, [settings.reduceMotion]);

  return route === 'panel' ? <ControlPanel /> : <IslandApp />;
}
