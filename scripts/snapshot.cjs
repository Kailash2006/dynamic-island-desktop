// Dev-only visual check: `npm run snapshot`
// Drives the island through its states and saves PNG frames to snapshots/.
// Optional: DI_FAKE_WALLPAPER=path.jpg (glass backdrop), DI_NOTIFICATION_DB=path.db
const fs = require('node:fs');
const path = require('node:path');

module.exports = function runSnapshots({ islandWin, openPanel, getPanel }) {
  const dir = process.env.DI_SNAPSHOT_DIR;
  fs.mkdirSync(dir, { recursive: true });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const send = (cmd) => islandWin.webContents.send('island:command', cmd);
  const emit = (channel, payload) => islandWin.webContents.send(channel, payload);
  const shot = async (name, win = islandWin) => {
    const image = await win.webContents.capturePage();
    fs.writeFileSync(path.join(dir, `${name}.png`), image.toPNG());
  };
  const setting = (key, value) => require('electron').ipcMain.emit('snapshot:set', null, key, value);
  const move = (x, y) => islandWin.webContents.sendInputEvent({ type: 'mouseMove', x, y });
  const click = async (x, y, button = 'left') => {
    islandWin.webContents.sendInputEvent({ type: 'mouseDown', x, y, button, clickCount: 1 });
    islandWin.webContents.sendInputEvent({ type: 'mouseUp', x, y, button, clickCount: 1 });
  };

  const state = async (label) => {
    if (!process.env.DI_SNAPSHOT_DEBUG) return;
    const st = await islandWin.webContents.executeJavaScript(
      'JSON.stringify({ a: window.__island?.getState?.().activities.map((x) => x.id), active: window.__island?.getState?.().activeId, exp: window.__island?.debugExpiries(), hover: document.querySelector("[data-hit]:hover") ? 1 : 0 })',
    );
    console.log(`[state ${label}] ${st}`);
  };

  islandWin.webContents.on('console-message', (event) => {
    if (event.level === 'error' || event.level === 'warning') console.log(`[island:${event.level}] ${event.message}`);
  });

  islandWin.webContents.once('did-finish-load', async () => {
    await wait(300);
    await shot('00-idle-bounce-midframe');
    await wait(2600);
    send({ type: 'clear' });
    await wait(1300);
    await shot('01-idle-semicircle');
    move(300, 12);
    await wait(900);
    await shot('02-peek');
    await click(300, 12);
    await wait(900);
    await shot('03-home');
    move(300, 100);
    await click(160, 120); // Timer feature
    await wait(900);
    await shot('04-home-timer');
    emit('clipboard:changed', { text: 'pip install torch torchvision', length: 29 });
    await wait(400);
    emit('clipboard:changed', { text: 'https://arxiv.org/abs/1706.03762', length: 32 });
    await wait(3200);
    send({ type: 'home', view: 'clipboard' });
    await wait(900);
    await shot('05-home-clipboard');
    move(20, 260);
    await wait(1200);

    // Real media from a Windows app
    emit('media:thumb', { key: 'spotify|Kesariya', data: null });
    emit('media:update', {
      app: 'Spotify.exe', title: 'Kesariya', artist: 'Arijit Singh', status: 'Playing',
      position: 61, duration: 268, updatedAt: Date.now(), key: 'spotify|Kesariya', canSkip: true,
    });
    await wait(1000);
    await shot('06-media-compact');
    send({ type: 'expand' });
    await wait(1000);
    await shot('07-media-expanded');
    await state('07-media-expanded');
    send({ type: 'collapse' });
    await wait(500);

    // A WhatsApp message through the notification database (or injected)
    if (process.env.DI_NOTIFICATION_DB) {
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(process.env.DI_NOTIFICATION_DB);
      const payload = Buffer.from('<toast><visual><binding template="ToastGeneric"><text>Amma</text><text>Did you eat? Call me when free &amp; bring the charger</text></binding></visual></toast>');
      db.prepare("INSERT INTO Notification (HandlerId, Type, Payload, ArrivalTime) VALUES (1, 'toast', ?, 0)").run(payload);
      db.close();
    }
    await state('before-08');
    await wait(2200);
    await shot('08-whatsapp-notification');
    await state('08-whatsapp-notification');
    await wait(5600);

    if (process.env.DI_NOTIFICATION_DB) {
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(process.env.DI_NOTIFICATION_DB);
      const payload = Buffer.from('<toast scenario="incomingCall"><visual><binding template="ToastGeneric"><text>Arjun</text><text>Incoming voice call</text></binding></visual><actions><action content="Accept" arguments="a"/><action content="Decline" arguments="d"/></actions></toast>');
      db.prepare("INSERT INTO Notification (HandlerId, Type, Payload, ArrivalTime) VALUES (1, 'toast', ?, 0)").run(payload);
      db.close();
    }
    await wait(2200);
    await shot('09-whatsapp-call');
    await state('09-whatsapp-call');
    if (process.env.DI_NOTIFICATION_DB) {
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(process.env.DI_NOTIFICATION_DB);
      db.exec("DELETE FROM Notification WHERE Payload LIKE '%incomingCall%'");
      db.close();
    }
    await wait(2200);
    await shot('10-call-ended-back-to-media');
    await state('10-call-ended-back-to-media');

    send({ type: 'home', view: 'alerts' });
    await wait(900);
    await shot('11-home-alerts');
    move(20, 260);
    await wait(1200);

    send({ type: 'timer', seconds: 300 });
    await wait(1200);
    await shot('12-timer-with-media-bubble');
    send({ type: 'expand' });
    await wait(1000);
    await shot('13-timer-expanded');
    send({ type: 'collapse' });
    send({ type: 'charging' });
    await wait(1200);
    await shot('14-charging');
    await wait(4000);

    setting('material', 'black');
    await wait(800);
    await shot('15-black-material-timer');
    setting('material', 'glass');
    send({ type: 'clear' });
    await wait(1400);

    openPanel();
    await wait(2500);
    const panel = getPanel();
    if (panel) {
      panel.webContents.on('console-message', (event) => {
        if (event.level === 'error' || event.level === 'warning') console.log(`[panel:${event.level}] ${event.message}`);
      });
      panel.setSize(1400, 900);
      await wait(800);
      await shot('20-panel-wide-try', panel);
      for (const section of ['look', 'apps', 'system']) {
        panel.webContents.send('panel:section', section);
        await wait(600);
        await shot(`21-panel-wide-${section}`, panel);
      }
      panel.setSize(420, 800);
      await wait(800);
      await shot('22-panel-narrow', panel);
    }
    require('electron').app.quit();
  });
};
