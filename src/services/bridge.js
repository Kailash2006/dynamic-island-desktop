// Access to the Electron preload API, with a browser fallback so the UI can
// also be previewed with plain `vite` (panel and island in two tabs).

export const DEFAULT_SETTINGS = {
  size: 'default',
  opacity: 1,
  animationSpeed: 'default',
  material: 'glass',
  glassSource: 'apps',
  reduceMotion: false,
  showIdlePill: true,
  media: true,
  notifications: true,
  calls: true,
  showMessageText: true,
  mutedApps: [],
  clipboard: true,
  battery: true,
  claude: true,
  startWithWindows: false,
  islandHidden: false,
  firstRun: false,
};

const noop = () => () => {};

function createBrowserBridge() {
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('dynamic-island') : null;
  const subs = { command: new Set(), settings: new Set(), section: new Set() };
  let settings = { ...DEFAULT_SETTINGS };
  const subscribe = (kind) => (fn) => {
    subs[kind].add(fn);
    return () => subs[kind].delete(fn);
  };
  const dispatch = (kind, payload) => subs[kind].forEach((fn) => fn(payload));

  channel?.addEventListener('message', (event) => {
    const { kind, payload } = event.data ?? {};
    if (kind === 'settings') settings = payload;
    if (subs[kind]) dispatch(kind, payload);
  });

  return {
    isBrowserPreview: true,
    setInteractive() {},
    reportSize() {},
    getSettings: async () => settings,
    setSetting: async (key, value) => {
      settings = { ...settings, [key]: value };
      dispatch('settings', settings);
      channel?.postMessage({ kind: 'settings', payload: settings });
      return settings;
    },
    getStatus: async () => ({
      media: { state: 'unsupported' },
      notifications: { state: 'unsupported' },
      glass: { state: 'unsupported' },
      update: { state: 'unavailable' },
    }),
    getInfo: async () => ({ version: 'preview', claudePort: 47821, packaged: false, platform: 'browser' }),
    sendCommand(command) {
      dispatch('command', command);
      channel?.postMessage({ kind: 'command', payload: command });
    },
    openPanel() {},
    openApp() {},
    mediaCommand() {},
    writeClipboard: (text) => navigator.clipboard?.writeText(text),
    checkForUpdates() {},
    installUpdate() {},
    quit() {},
    onSettings: subscribe('settings'),
    onCommand: subscribe('command'),
    onPanelSection: subscribe('section'),
    onStatus: noop,
    onClipboard: noop,
    onClaude: noop,
    onMedia: noop,
    onMediaThumb: noop,
    onNotification: noop,
    onNotificationRemoved: noop,
    onBackdrop: noop,
  };
}

export const bridge = typeof window !== 'undefined' && window.island ? window.island : createBrowserBridge();
