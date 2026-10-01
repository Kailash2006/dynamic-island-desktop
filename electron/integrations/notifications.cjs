// Mirrors notifications from other apps (WhatsApp, Telegram, Teams, Outlook…).
//
// Windows keeps every toast in a per-user SQLite database. We open it read-only
// and pick up new rows, so no app needs special support. Incoming calls are
// toasts with the "incomingCall" scenario; when the call ends, the app removes
// its toast and we notice the row is gone.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const KNOWN_APPS = [
  [/whatsapp/i, 'WhatsApp', '#25d366'],
  [/telegram/i, 'Telegram', '#2aabee'],
  [/teams/i, 'Teams', '#6264a7'],
  [/discord/i, 'Discord', '#5865f2'],
  [/outlook|windowscommunicationsapps/i, 'Outlook', '#0a64d6'],
  [/slack/i, 'Slack', '#611f69'],
  [/instagram/i, 'Instagram', '#e1306c'],
  [/messenger/i, 'Messenger', '#0a7cff'],
  [/signal/i, 'Signal', '#3a76f0'],
  [/zoom/i, 'Zoom', '#2d8cff'],
  [/skype/i, 'Skype', '#00aff0'],
  [/spotify/i, 'Spotify', '#1db954'],
  [/chrome/i, 'Chrome', '#1a73e8'],
  [/msedge|microsoftedge/i, 'Edge', '#0c8fdc'],
  [/firefox/i, 'Firefox', '#ff7139'],
  [/phonelink|yourphone/i, 'Phone Link', '#0078d4'],
];
const PALETTE = ['#5e5ce6', '#ff9f0a', '#30d158', '#0a84ff', '#ff375f', '#64d2ff', '#bf5af2'];

function describeApp(appId) {
  for (const [pattern, name, color] of KNOWN_APPS) if (pattern.test(appId)) return { name, color };
  // "5319275A.SomeAppDesktop_abc123!App" → "Some App"; "C:\\…\\tool.exe" → "tool"
  let name = appId.split('!')[0].split(/[\\/]/).pop().replace(/\.exe$/i, '');
  name = name.includes('.') ? name.split('_')[0].split('.').pop() : name;
  name = name.replace(/Desktop$/i, '').replace(/([a-z])([A-Z])/g, '$1 $2').trim() || 'App';
  let hash = 0;
  for (const ch of appId) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return { name, color: PALETTE[Math.abs(hash) % PALETTE.length] };
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decodeXml = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
      e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e] ?? m,
    );

function payloadToString(payload) {
  if (typeof payload === 'string') return payload;
  if (!payload) return '';
  const bytes = Buffer.from(payload);
  // Some builds store UTF-16; detect the zero bytes between ASCII characters.
  if (bytes.length > 3 && bytes[1] === 0 && bytes[3] === 0) return bytes.toString('utf16le');
  return bytes.toString('utf8');
}

function parseToast(xml) {
  const texts = [];
  for (const match of xml.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/gi)) {
    if (/placement\s*=\s*"attribution"/i.test(match[1])) continue;
    const value = decodeXml(match[2]).replace(/\s+/g, ' ').trim();
    if (value) texts.push(value);
  }
  const scenario = /<toast\b[^>]*\bscenario\s*=\s*"([^"]+)"/i.exec(xml)?.[1] ?? null;
  // Only the toast scenario, or a line that *is* a call label, counts as a call,
  // so a chat message like "calling you later" stays a message.
  const isCall = scenario === 'incomingCall' || texts.some((t) => /^incoming (voice |video |audio )?call\b/i.test(t));
  const isVideo = texts.some((t) => /\bvideo call\b/i.test(t));
  return { texts, scenario, isCall, isVideo };
}

function defaultDbPath() {
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(local, 'Microsoft', 'Windows', 'Notifications', 'wpndatabase.db');
}

function createNotificationWatcher({ send, setStatus, isMuted, ownAppId }) {
  const dbPath = process.env.DI_NOTIFICATION_DB || defaultDbPath();
  let db = null;
  let timer = null;
  let lastId = 0;
  let signature = '';
  let enabled = false;
  const liveCalls = new Map(); // notification id → appId
  const seenApps = new Map(); // appId → { name, color }
  let statements = null;

  function fileSignature() {
    const parts = [];
    for (const suffix of ['', '-wal']) {
      try {
        const st = fs.statSync(dbPath + suffix);
        parts.push(`${st.mtimeMs}:${st.size}`);
      } catch {
        parts.push('-');
      }
    }
    return parts.join('|');
  }

  function open() {
    const { DatabaseSync } = require('node:sqlite');
    db = new DatabaseSync(dbPath, { readOnly: true });
    statements = {
      maxId: db.prepare('SELECT MAX(Id) AS id FROM Notification'),
      newRows: db.prepare(
        `SELECT n.Id AS id, n.Payload AS payload, h.PrimaryId AS appId
           FROM Notification n JOIN NotificationHandler h ON n.HandlerId = h.RecordId
          WHERE n.Id > ? AND n.Type = 'toast'
          ORDER BY n.Id LIMIT 50`,
      ),
      exists: db.prepare('SELECT 1 AS ok FROM Notification WHERE Id = ?'),
      recentApps: db.prepare(
        `SELECT DISTINCT h.PrimaryId AS appId
           FROM Notification n JOIN NotificationHandler h ON n.HandlerId = h.RecordId
          WHERE n.Type = 'toast'`,
      ),
    };
    lastId = statements.maxId.get()?.id ?? 0;
    for (const row of statements.recentApps.all()) remember(row.appId);
  }

  function remember(appId) {
    if (!appId || appId === ownAppId || seenApps.has(appId)) return;
    seenApps.set(appId, describeApp(appId));
  }

  function publishStatus(extra = {}) {
    setStatus({
      state: 'on',
      apps: [...seenApps].map(([id, info]) => ({ id, name: info.name, color: info.color })).sort((a, b) => a.name.localeCompare(b.name)),
      ...extra,
    });
  }

  function poll() {
    const next = fileSignature();
    if (next === signature) return;
    signature = next;
    try {
      if (!db) open();
      const before = seenApps.size;
      for (const row of statements.newRows.all(lastId)) {
        lastId = Math.max(lastId, row.id);
        if (!row.appId || row.appId === ownAppId) continue;
        remember(row.appId);
        if (isMuted(row.appId)) continue;
        const toast = parseToast(payloadToString(row.payload));
        if (!toast.texts.length) continue;
        const info = seenApps.get(row.appId);
        if (toast.isCall) liveCalls.set(row.id, row.appId);
        send('notification:new', { id: row.id, appId: row.appId, app: info.name, color: info.color, ...toast });
      }
      for (const [id] of liveCalls) {
        if (!statements.exists.get(id)) {
          liveCalls.delete(id);
          send('notification:removed', { id });
        }
      }
      if (seenApps.size !== before) publishStatus();
    } catch (err) {
      try {
        db?.close();
      } catch {
        /* ignore */
      }
      db = null;
      signature = '';
      setStatus({ state: 'error', message: err.message });
    }
  }

  function start() {
    if (!fs.existsSync(dbPath)) {
      setStatus({ state: 'unsupported', message: process.platform === 'win32' ? 'Windows notification history is off' : 'Available on Windows' });
      return;
    }
    try {
      open();
      signature = fileSignature();
      publishStatus();
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
    timer = setInterval(poll, 900);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    try {
      db?.close();
    } catch {
      /* ignore */
    }
    db = null;
  }

  return {
    setEnabled(next) {
      if (next === enabled) return;
      enabled = next;
      if (enabled) start();
      else {
        stop();
        setStatus({ state: 'off', apps: [...seenApps].map(([id, info]) => ({ id, name: info.name, color: info.color })) });
      }
    },
    dispose: stop,
  };
}

module.exports = { createNotificationWatcher, parseToast, describeApp, payloadToString };
