// Automatic updates from GitHub Releases (installer builds only).
// Set your GitHub username in package.json → build.publish, then publish a
// release with `npm run release` and every installed copy updates itself.

const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

const PLACEHOLDER = 'YOUR-GITHUB-USERNAME';
const SIX_HOURS = 6 * 60 * 60 * 1000;

function createUpdater({ setStatus, onReady }) {
  let autoUpdater = null;

  function configured() {
    try {
      const yml = fs.readFileSync(path.join(process.resourcesPath, 'app-update.yml'), 'utf8');
      return !yml.includes(PLACEHOLDER);
    } catch {
      return false;
    }
  }

  function init() {
    if (!app.isPackaged) return setStatus({ state: 'unavailable', message: 'Updates work in the installed app' });
    if (process.env.PORTABLE_EXECUTABLE_FILE) return setStatus({ state: 'unavailable', message: 'The portable version doesn’t update itself. Use the installer.' });
    if (!configured()) return setStatus({ state: 'unavailable', message: 'Update server not set up for this build' });

    ({ autoUpdater } = require('electron-updater'));
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('checking-for-update', () => setStatus({ state: 'checking' }));
    autoUpdater.on('update-not-available', () => setStatus({ state: 'current', checkedAt: Date.now() }));
    autoUpdater.on('update-available', (info) => setStatus({ state: 'downloading', version: info.version, percent: 0 }));
    autoUpdater.on('download-progress', (p) => setStatus({ state: 'downloading', percent: Math.round(p.percent) }));
    autoUpdater.on('update-downloaded', (info) => {
      setStatus({ state: 'ready', version: info.version });
      onReady(info.version);
    });
    autoUpdater.on('error', (err) => {
      const message = err?.message ?? '';
      // A repository with no releases yet isn't a problem, just nothing to install.
      if (/No published versions|Unable to find latest version|latest\.yml|HttpError: 404/i.test(message)) {
        setStatus({ state: 'current', checkedAt: Date.now() });
      } else if (/ENOTFOUND|ETIMEDOUT|ECONNREFUSED|ERR_INTERNET_DISCONNECTED|net::/i.test(message)) {
        setStatus({ state: 'error', message: 'You seem to be offline' });
      } else {
        setStatus({ state: 'error', message: message.split('\n')[0] || 'Update check failed' });
      }
    });

    setTimeout(check, 8000);
    setInterval(check, SIX_HOURS);
    setStatus({ state: 'idle' });
  }

  function check() {
    autoUpdater?.checkForUpdates().catch(() => {});
  }

  return {
    init,
    check,
    install() {
      autoUpdater?.quitAndInstall(false, true);
    },
  };
}

module.exports = { createUpdater };
