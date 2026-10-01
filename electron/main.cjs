// Dynoland — Electron main process
// Owns: the transparent overlay window, click-through, tray, settings, the
// control panel, and the bridges to Windows (media, notifications, clipboard,
// wallpaper) plus automatic updates.

const {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  globalShortcut,
  clipboard,
} = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { createMediaBridge } = require('./integrations/media.cjs');
const { createNotificationWatcher } = require('./integrations/notifications.cjs');
const { createBackdrop } = require('./integrations/backdrop.cjs');
const { createUpdater } = require('./updater.cjs');

const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const APP_ID = 'com.kailash.dynamicisland';

// The overlay window never resizes. It is sized for the largest expanded
// state plus room for the shadow; only the island inside it animates.
const WIN_W = 600;
const WIN_H = 280;
const SIZE_SCALE = { small: 0.9, default: 1, large: 1.15 };

const PANEL_SHORTCUT = 'CommandOrControl+Shift+D';

const DEFAULT_SETTINGS = {
  size: 'default', // small | default | large
  opacity: 1, // 1 | 0.9 | 0.8
  animationSpeed: 'default', // relaxed | default | snappy
  material: 'glass', // glass | black
  glassSource: 'apps', // apps (windows behind the island) | wallpaper
  reduceMotion: false,
  showIdlePill: true,
  media: true,
  notifications: true,
  calls: true,
  showMessageText: true,
  mutedApps: [],
  clipboard: true,
  battery: true,
  startWithWindows: false,
  islandHidden: false,
  firstRun: true,
  settingsVersion: 2,
};

let islandWin = null;
let panelWin = null;
let tray = null;
let settings = { ...DEFAULT_SETTINGS };
let clipboardTimer = null;
let media = null;
let notifications = null;
let backdrop = null;
let updater = null;

// Live status of each integration, shown in the control panel.
let status = { media: { state: 'off' }, notifications: { state: 'off' }, glass: { state: 'off' }, update: { state: 'idle' } };

// ---------------------------------------------------------------- helpers

const alive = (win) => win && !win.isDestroyed();

function sendToIsland(channel, payload) {
  if (alive(islandWin)) islandWin.webContents.send(channel, payload);
}

function broadcast(channel, payload) {
  for (const win of [islandWin, panelWin]) if (alive(win)) win.webContents.send(channel, payload);
}

function setStatus(key, value) {
  status = { ...status, [key]: value };
  broadcast('status:changed', status);
}

// ---------------------------------------------------------------- settings

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

// Versions before 1.3.0 were called "Dynamic Island" and kept settings in a
// folder of that name. Carry them over once.
function migrateOldSettings() {
  try {
    const oldFile = path.join(app.getPath('appData'), 'Dynamic Island', 'settings.json');
    if (!fs.existsSync(settingsFile()) && fs.existsSync(oldFile)) {
      fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
      fs.copyFileSync(oldFile, settingsFile());
    }
  } catch {
    /* start with defaults */
  }
}

function loadSettings() {
  try {
    const saved = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
    // 1.1.0 defaulted to the wallpaper and had a "live" mode; both move to following apps.
    if (!saved.settingsVersion || saved.glassSource === 'live') saved.glassSource = 'apps';
    settings = { ...DEFAULT_SETTINGS, ...saved, settingsVersion: 2 };
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  try {
    fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
    fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
  } catch (err) {
    console.warn('Could not save settings:', err.message);
  }
}

function applySetting(key) {
  if (key === 'size') {
    positionIsland();
    backdrop?.refresh();
  }
  if (key === 'clipboard') syncClipboardWatcher();
  if (key === 'islandHidden') applyIslandVisibility();
  if (key === 'startWithWindows') applyLoginItem();
  if (key === 'media') media?.setEnabled(settings.media);
  if (key === 'notifications') notifications?.setEnabled(settings.notifications);
  if (key === 'material' || key === 'glassSource') syncBackdrop();
  refreshTrayMenu();
}

function updateSetting(key, value) {
  if (!(key in DEFAULT_SETTINGS)) return settings;
  settings = { ...settings, [key]: value };
  saveSettings();
  applySetting(key);
  broadcast('settings:changed', settings);
  return settings;
}

// ------------------------------------------------------------ island window

function islandBounds() {
  const { workArea } = screen.getPrimaryDisplay();
  const scale = SIZE_SCALE[settings.size] ?? 1;
  const width = Math.round(WIN_W * scale);
  const height = Math.round(WIN_H * scale);
  return {
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: workArea.y,
    width,
    height,
  };
}

function positionIsland() {
  if (!alive(islandWin)) return;
  islandWin.setBounds(islandBounds());
  islandWin.webContents.setZoomFactor(SIZE_SCALE[settings.size] ?? 1);
}

function loadRoute(win, route) {
  if (DEV_URL) win.loadURL(`${DEV_URL}#${route}`);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { hash: route });
}

function hardenWebContents(win) {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (!DEV_URL || !url.startsWith(DEV_URL)) event.preventDefault();
  });
}

const preload = () => path.join(__dirname, 'preload.cjs');

function createIslandWindow() {
  islandWin = new BrowserWindow({
    ...islandBounds(),
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    thickFrame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false, // clicks work, but the island never steals keyboard focus
    alwaysOnTop: true,
    show: false,
    title: 'Dynoland',
    webPreferences: {
      preload: preload(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      spellcheck: false,
    },
  });

  hardenWebContents(islandWin);
  islandWin.setAlwaysOnTop(true, 'screen-saver');
  islandWin.setIgnoreMouseEvents(true, { forward: true });

  islandWin.webContents.on('did-finish-load', () => {
    islandWin.webContents.setZoomFactor(SIZE_SCALE[settings.size] ?? 1);
    islandWin.webContents.send('settings:changed', settings);
    islandWin.webContents.send('status:changed', status);
    backdrop?.refresh();
    if (settings.firstRun) {
      setTimeout(() => sendToIsland('island:command', { type: 'welcome' }), 1200);
      settings.firstRun = false;
      saveSettings();
    }
  });

  islandWin.once('ready-to-show', applyIslandVisibility);
  loadRoute(islandWin, 'island');
}

function applyIslandVisibility() {
  if (!alive(islandWin)) return;
  if (settings.islandHidden) islandWin.hide();
  else {
    islandWin.showInactive();
    islandWin.setAlwaysOnTop(true, 'screen-saver');
  }
}

function syncBackdrop() {
  backdrop?.setMode(settings.material === 'glass' ? settings.glassSource : 'off');
}

// ------------------------------------------------------------ control panel

function openPanel(section) {
  if (alive(panelWin)) {
    if (panelWin.isMinimized()) panelWin.restore();
    panelWin.show();
    panelWin.focus();
    if (section) panelWin.webContents.send('panel:section', section);
    return;
  }
  const isWindows = process.platform === 'win32';
  panelWin = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: 380,
    minHeight: 480,
    show: false,
    title: 'Dynoland',
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    // Dark, native-looking title bar with the standard Windows buttons.
    ...(isWindows ? { titleBarStyle: 'hidden', titleBarOverlay: { color: '#000000', symbolColor: '#ffffff', height: 40 } } : {}),
    webPreferences: {
      preload: preload(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  hardenWebContents(panelWin);
  panelWin.setMenu(null);
  panelWin.once('ready-to-show', () => {
    panelWin.show();
    if (section) panelWin.webContents.send('panel:section', section);
  });
  panelWin.on('closed', () => {
    panelWin = null;
  });
  loadRoute(panelWin, isWindows ? 'panel-overlay' : 'panel');
}

function togglePanel() {
  if (alive(panelWin) && panelWin.isVisible() && panelWin.isFocused()) panelWin.close();
  else openPanel();
}

// --------------------------------------------------------------------- tray

const trayIconPath = () => path.join(__dirname, 'assets', 'tray.png');

function createTray() {
  const image = nativeImage.createFromPath(trayIconPath());
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image);
  tray.setToolTip('Dynoland');
  tray.on('click', () => openPanel());
  refreshTrayMenu();
}

function refreshTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open control panel', accelerator: 'Ctrl+Shift+D', click: () => openPanel() },
      {
        label: settings.islandHidden ? 'Show island' : 'Hide island',
        click: () => updateSetting('islandHidden', !settings.islandHidden),
      },
      { type: 'separator' },
      {
        label: 'Start with Windows',
        type: 'checkbox',
        checked: settings.startWithWindows,
        enabled: app.isPackaged,
        click: (item) => updateSetting('startWithWindows', item.checked),
      },
      { label: 'Check for updates', enabled: app.isPackaged, click: () => updater?.check() },
      { type: 'separator' },
      { label: 'Quit Dynoland', click: () => app.quit() },
    ]),
  );
}

// ------------------------------------------------------- start with Windows

function applyLoginItem() {
  if (!app.isPackaged) return; // never register the dev electron.exe
  app.setLoginItemSettings({
    openAtLogin: settings.startWithWindows,
    path: process.env.PORTABLE_EXECUTABLE_FILE || process.execPath,
  });
}

// ---------------------------------------------------------------- clipboard

let lastClipboard = '';

function syncClipboardWatcher() {
  clearInterval(clipboardTimer);
  clipboardTimer = null;
  if (!settings.clipboard) return;
  lastClipboard = clipboard.readText();
  clipboardTimer = setInterval(() => {
    const text = clipboard.readText();
    if (!text || text === lastClipboard) return;
    lastClipboard = text;
    sendToIsland('clipboard:changed', { text: text.slice(0, 240), length: text.length });
  }, 700);
}

// --------------------------------------------------------------- open apps

function openApp(appId) {
  if (process.platform !== 'win32' || typeof appId !== 'string' || appId.length > 300) return;
  if (/^[a-z]:\\/i.test(appId) && appId.toLowerCase().endsWith('.exe')) {
    spawn(appId, [], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  // Store apps and most desktop apps can be opened by their app ID.
  spawn('explorer.exe', [`shell:AppsFolder\\${appId}`], { detached: true, stdio: 'ignore' }).unref();
}

// ---------------------------------------------------------------------- IPC

function registerIpc() {
  ipcMain.on('island:set-interactive', (_e, interactive) => {
    if (!alive(islandWin)) return;
    if (interactive) islandWin.setIgnoreMouseEvents(false);
    else islandWin.setIgnoreMouseEvents(true, { forward: true });
  });
  ipcMain.on('island:size', (_e, size) => backdrop?.setIslandSize(size));
  ipcMain.handle('settings:get', () => settings);
  ipcMain.handle('settings:set', (_e, key, value) => updateSetting(key, value));
  ipcMain.handle('status:get', () => status);
  ipcMain.on('panel:command', (_e, command) => sendToIsland('island:command', command));
  ipcMain.on('panel:open', (_e, section) => openPanel(typeof section === 'string' ? section : undefined));
  ipcMain.handle('app:info', () => ({ version: app.getVersion(), packaged: app.isPackaged, platform: process.platform }));
  ipcMain.on('app:quit', () => app.quit());
  ipcMain.on('app:open', (_e, appId) => openApp(appId));
  ipcMain.on('media:command', (_e, name) => media?.command(name));
  ipcMain.on('clipboard:write', (_e, text) => {
    if (typeof text !== 'string') return;
    lastClipboard = text; // don't announce our own copy
    clipboard.writeText(text);
  });
  ipcMain.on('update:check', () => updater?.check());
  ipcMain.on('update:install', () => updater?.install());
}

// ---------------------------------------------------------------- lifecycle

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => openPanel());

  app.whenReady().then(() => {
    app.setAppUserModelId(APP_ID);
    migrateOldSettings();
    loadSettings();
    registerIpc();
    createIslandWindow();
    createTray();
    syncClipboardWatcher();
    applyLoginItem();

    media = createMediaBridge({ send: sendToIsland, setStatus: (s) => setStatus('media', s) });
    notifications = createNotificationWatcher({
      send: sendToIsland,
      setStatus: (s) => setStatus('notifications', s),
      isMuted: (appId) => settings.mutedApps.includes(appId),
      ownAppId: APP_ID,
    });
    backdrop = createBackdrop({ getWindow: () => islandWin, send: sendToIsland, setStatus: (s) => setStatus('glass', s) });
    updater = createUpdater({
      setStatus: (s) => setStatus('update', s),
      onReady: (version) => sendToIsland('island:command', { type: 'update-ready', version }),
    });

    media.setEnabled(settings.media);
    notifications.setEnabled(settings.notifications);
    syncBackdrop();
    updater.init();

    if (!globalShortcut.register(PANEL_SHORTCUT, togglePanel)) {
      console.warn(`${PANEL_SHORTCUT} is already used by another app.`);
    }

    const reposition = () => {
      positionIsland();
      backdrop.refresh();
    };
    screen.on('display-metrics-changed', reposition);
    screen.on('display-added', reposition);
    screen.on('display-removed', reposition);

    if (process.env.DI_SNAPSHOT_DIR) {
      ipcMain.on('snapshot:set', (_e, key, value) => updateSetting(key, value));
      require(process.env.DI_SNAPSHOT_SCRIPT || path.join(__dirname, '..', 'scripts', 'snapshot.cjs'))({ islandWin, openPanel, getPanel: () => panelWin });
    }
  });

  // Tray app: closing the control panel must not quit.
  app.on('window-all-closed', () => {});

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    clearInterval(clipboardTimer);
    media?.dispose();
    notifications?.dispose();
    backdrop?.dispose();
  });
}
