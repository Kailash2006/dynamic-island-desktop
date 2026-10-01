// Now playing from any app, via the Windows media session API.
// A small PowerShell helper (native/media.ps1) does the WinRT calls and streams
// JSON lines back; commands (toggle/next/prev) go to it over stdin.

const { spawn } = require('node:child_process');
const path = require('node:path');
const readline = require('node:readline');
const { app } = require('electron');

function scriptPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'native', 'media.ps1')
    : path.join(__dirname, '..', '..', 'native', 'media.ps1');
}

function createMediaBridge({ send, setStatus }) {
  let child = null;
  let enabled = false;
  let failures = 0;
  let restartTimer = null;

  function start() {
    if (process.platform !== 'win32') {
      setStatus({ state: 'unsupported', message: 'Available on Windows' });
      return;
    }
    clearTimeout(restartTimer);
    const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    child = spawn(powershell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath()], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    setStatus({ state: 'starting' });

    readline.createInterface({ input: child.stdout }).on('line', (line) => {
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        return;
      }
      if (message.type === 'media') {
        failures = 0;
        const session = message.session;
        setStatus(session ? { state: 'playing', app: session.app, status: session.status } : { state: 'idle' });
        send('media:update', session);
      } else if (message.type === 'thumb') {
        send('media:thumb', { key: message.key, data: message.data });
      } else if (message.type === 'error') {
        setStatus({ state: 'error', message: message.message });
      }
    });
    child.stderr.on('data', () => {});

    const current = child;
    current.on('exit', () => {
      if (child !== current) return;
      child = null;
      send('media:update', null);
      if (!enabled) return;
      failures += 1;
      if (failures > 6) {
        setStatus({ state: 'error', message: 'The media helper keeps stopping' });
        return;
      }
      restartTimer = setTimeout(start, Math.min(60000, 1500 * 2 ** failures));
    });
    current.on('error', (err) => setStatus({ state: 'error', message: err.message }));
  }

  function stop() {
    clearTimeout(restartTimer);
    const current = child;
    child = null;
    if (current) {
      current.stdin.end();
      setTimeout(() => current.kill(), 1500);
    }
    send('media:update', null);
  }

  return {
    setEnabled(next) {
      if (next === enabled) return;
      enabled = next;
      failures = 0;
      if (enabled) start();
      else {
        stop();
        setStatus({ state: 'off' });
      }
    },
    command(name) {
      if (child && ['toggle', 'next', 'prev'].includes(name)) child.stdin.write(`${name}\n`);
    },
    dispose() {
      enabled = false;
      stop();
    },
  };
}

module.exports = { createMediaBridge };
