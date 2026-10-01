// What the liquid-glass island refracts.
//
// "apps"      (default) the app windows actually behind the island, captured by
//             a small helper (native/GlassCapture.cs) that skips the island's own
//             window, layered over the wallpaper. The island still shows up in
//             screenshots and recordings.
// "wallpaper" only the wallpaper behind the island. No capturing at all.

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { spawn } = require('node:child_process');
const { app, nativeImage, screen } = require('electron');

const PAGE_W = 600; // the overlay page is always 600 × 280 CSS pixels
const PAGE_H = 280;
const OUTPUT_W = 300; // captures are sent at half resolution; they're blurred anyway

// Regular refresh (ms) by how much glass is on screen. Switching apps doesn't
// wait for this: the helper reports window changes within ~100 ms.
const CADENCE = { big: 700, compact: 1200, small: 2000 };
// After a window change, capture right away and once more after the new
// window's opening animation has settled.
const AFTER_CHANGE = 60;
const SETTLE = 380;

function wallpaperFile() {
  if (process.env.DI_FAKE_WALLPAPER) return process.env.DI_FAKE_WALLPAPER;
  const appData = process.env.APPDATA;
  if (!appData) return null;
  const transcoded = path.join(appData, 'Microsoft', 'Windows', 'Themes', 'TranscodedWallpaper');
  return fs.existsSync(transcoded) ? transcoded : null;
}

// Crop the wallpaper the way Windows draws it with the default "Fill" style.
function cropCover(image, display, region) {
  const { width: iw, height: ih } = image.getSize();
  const { width: dw, height: dh } = display.bounds;
  const scale = Math.max(dw / iw, dh / ih);
  const offsetX = (iw * scale - dw) / 2;
  const offsetY = (ih * scale - dh) / 2;
  const rect = {
    x: Math.max(0, Math.round((region.x + offsetX) / scale)),
    y: Math.max(0, Math.round((region.y + offsetY) / scale)),
    width: Math.max(1, Math.round(region.width / scale)),
    height: Math.max(1, Math.round(region.height / scale)),
  };
  rect.width = Math.min(rect.width, iw - rect.x);
  rect.height = Math.min(rect.height, ih - rect.y);
  return image.crop(rect);
}

function helperDir() {
  return app.isPackaged ? path.join(process.resourcesPath, 'native') : path.join(__dirname, '..', '..', 'native');
}

function createBackdrop({ getWindow, send, setStatus }) {
  let mode = 'off';
  let islandSize = 'small';
  let wallpaperUrl = null;
  let wallpaperStamp = '';
  let wallpaperTimer = null;
  let captureTimer = null;
  let stallTimer = null;
  let helper = null;
  let pending = null;
  let failures = 0;
  let lastApp;
  let settlePending = false;

  const win = () => {
    const w = getWindow();
    return w && !w.isDestroyed() ? w : null;
  };

  function publish(layers) {
    send('backdrop:update', { url: wallpaperUrl, layers: layers ?? [] });
  }

  // ------------------------------------------------------------- wallpaper

  function refreshWallpaper(force = false) {
    const w = win();
    const file = wallpaperFile();
    if (!w || !file) {
      if (wallpaperUrl !== null) {
        wallpaperUrl = null;
        if (mode === 'wallpaper') publish();
      }
      return;
    }
    const bounds = w.getBounds();
    const display = screen.getDisplayMatching(bounds);
    let stamp;
    try {
      stamp = `${file}:${fs.statSync(file).mtimeMs}:${JSON.stringify(bounds)}:${display.bounds.width}x${display.bounds.height}`;
    } catch {
      return;
    }
    if (!force && stamp === wallpaperStamp) return;
    wallpaperStamp = stamp;
    const image = nativeImage.createFromBuffer(fs.readFileSync(file));
    if (image.isEmpty()) return;
    const region = { x: bounds.x - display.bounds.x, y: bounds.y - display.bounds.y, width: bounds.width, height: bounds.height };
    const cropped = cropCover(image, display, region).resize({ width: PAGE_W, height: PAGE_H, quality: 'good' });
    wallpaperUrl = `data:image/jpeg;base64,${cropped.toJPEG(82).toString('base64')}`;
    if (mode === 'wallpaper') publish();
  }

  // ----------------------------------------------------- app-window capture

  function startHelper() {
    if (process.platform !== 'win32') {
      setStatus({ state: 'unsupported', message: 'Following apps works on Windows; showing the wallpaper' });
      return false;
    }
    const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    helper = spawn(powershell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(helperDir(), 'glass.ps1')], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    setStatus({ state: 'starting' });
    readline.createInterface({ input: helper.stdout }).on('line', onHelperLine);
    helper.stderr.on('data', () => {});
    const current = helper;
    current.on('exit', () => {
      if (helper !== current) return;
      helper = null;
      pending = null;
      if (mode !== 'apps') return;
      failures += 1;
      publish(); // fall back to the wallpaper meanwhile
      if (failures > 4) {
        setStatus({ state: 'error', message: 'The glass helper keeps stopping, so the glass shows the wallpaper' });
        return;
      }
      setTimeout(() => {
        if (mode === 'apps' && !helper && startHelper()) schedule(800);
      }, 2000 * failures);
    });
    current.on('error', (err) => setStatus({ state: 'error', message: err.message }));
    return true;
  }

  function stopHelper() {
    const current = helper;
    helper = null;
    pending = null;
    if (current) {
      current.stdin.end();
      setTimeout(() => current.kill(), 1000);
    }
  }

  function onHelperLine(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }
    if (message.type === 'changed') {
      // A different window is behind the island: refresh now, not on the timer.
      settlePending = true;
      if (!pending) schedule(AFTER_CHANGE);
      return;
    }
    const request = pending;
    pending = null;
    clearTimeout(stallTimer);
    if (message.type === 'error') {
      setStatus({ state: 'error', message: message.message });
      publish();
    } else if (message.type === 'desktop') {
      failures = 0;
      if (lastApp !== null) setStatus({ state: 'on', app: null });
      lastApp = null;
      publish();
    } else if (message.type === 'frame' && request) {
      failures = 0;
      const scale = PAGE_W / request.width;
      const layers = message.layers.map((layer) => ({
        url: `data:${layer.mime};base64,${layer.data}`,
        x: Math.round(layer.x * scale),
        y: Math.round(layer.y * scale),
        w: Math.round(layer.w * scale),
        h: Math.round(layer.h * scale),
      }));
      const topApp = message.layers[0]?.app || null;
      if (topApp !== lastApp) setStatus({ state: 'on', app: topApp });
      lastApp = topApp;
      publish(layers);
    }
    if (settlePending) {
      settlePending = false;
      schedule(SETTLE);
    } else {
      schedule();
    }
  }

  function requestCapture() {
    const w = win();
    if (mode !== 'apps' || !helper || pending) return;
    if (!w || !w.isVisible()) {
      schedule(3000);
      return;
    }
    const handle = w.getNativeWindowHandle();
    const hwnd = handle.length >= 8 ? handle.readBigUInt64LE(0) : BigInt(handle.readUInt32LE(0));
    const physical = screen.dipToScreenRect(w, w.getBounds());
    pending = physical;
    helper.stdin.write(`capture ${hwnd} ${physical.x} ${physical.y} ${physical.width} ${physical.height} ${OUTPUT_W}\n`);
    // If the helper never answers, don't stall forever.
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      if (pending === physical) {
        pending = null;
        schedule();
      }
    }, 4000);
  }

  function schedule(delay) {
    clearTimeout(captureTimer);
    if (mode !== 'apps' || !helper) return;
    captureTimer = setTimeout(requestCapture, delay ?? CADENCE[islandSize] ?? CADENCE.compact);
  }

  // ------------------------------------------------------------------ API

  function stopAll() {
    clearInterval(wallpaperTimer);
    clearTimeout(captureTimer);
    clearTimeout(stallTimer);
    wallpaperTimer = null;
    captureTimer = null;
    stopHelper();
  }

  return {
    setMode(next) {
      if (next === 'live') next = 'apps'; // setting name used by 1.1.0
      if (next === mode) return;
      stopAll();
      mode = next;
      failures = 0;
      lastApp = undefined;
      const w = win();
      if (w) w.setContentProtection(false); // 1.1.0's live mode hid the island from screenshots
      if (mode === 'off') {
        send('backdrop:update', null);
        setStatus({ state: 'off' });
        return;
      }
      refreshWallpaper(true);
      wallpaperTimer = setInterval(refreshWallpaper, 15000);
      if (mode === 'apps' && startHelper()) schedule(400);
      else {
        if (mode === 'wallpaper') setStatus({ state: 'wallpaper' });
        publish();
      }
    },
    // The renderer reports how big the island is, so bigger shapes refresh sooner.
    setIslandSize(size) {
      const faster = (CADENCE[size] ?? Infinity) < (CADENCE[islandSize] ?? Infinity);
      islandSize = size;
      if (faster && !pending) schedule(60);
    },
    refresh() {
      refreshWallpaper(true);
      if (mode === 'apps') schedule(100);
      else if (mode === 'wallpaper') publish();
    },
    dispose: stopAll,
  };
}

module.exports = { createBackdrop };
