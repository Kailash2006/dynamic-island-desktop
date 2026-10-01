// Preload: the only bridge between the React renderer and Electron.
const { contextBridge, ipcRenderer } = require('electron');

const listen = (channel) => (callback) => {
  const handler = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('island', {
  // island window
  setInteractive: (interactive) => ipcRenderer.send('island:set-interactive', Boolean(interactive)),
  reportSize: (size) => ipcRenderer.send('island:size', size),
  // settings and status
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getStatus: () => ipcRenderer.invoke('status:get'),
  getInfo: () => ipcRenderer.invoke('app:info'),
  // actions
  sendCommand: (command) => ipcRenderer.send('panel:command', command),
  openPanel: (section) => ipcRenderer.send('panel:open', section),
  openApp: (appId) => ipcRenderer.send('app:open', appId),
  openSystem: (target) => ipcRenderer.send('system:open', target),
  mediaCommand: (name) => ipcRenderer.send('media:command', name),
  writeClipboard: (text) => ipcRenderer.send('clipboard:write', text),
  checkForUpdates: () => ipcRenderer.send('update:check'),
  installUpdate: () => ipcRenderer.send('update:install'),
  quit: () => ipcRenderer.send('app:quit'),
  // events
  onSettings: listen('settings:changed'),
  onStatus: listen('status:changed'),
  onCommand: listen('island:command'),
  onPanelSection: listen('panel:section'),
  onClipboard: listen('clipboard:changed'),
  onMedia: listen('media:update'),
  onMediaThumb: listen('media:thumb'),
  onNotification: listen('notification:new'),
  onNotificationRemoved: listen('notification:removed'),
  onBackdrop: listen('backdrop:update'),
});
