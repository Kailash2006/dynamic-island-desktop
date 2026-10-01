import { useEffect, useRef, useState } from 'react';
import { bridge } from '../../services/bridge.js';
import { settingsStore, useSettings } from '../../services/settings.js';
import { initStatus, statusStore, useStore } from '../../services/stores.js';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { mediaAppName } from '../../services/activities/media.js';
import {
  ArrowDownIcon,
  BellIcon,
  BoltIcon,
  ClipboardIcon,
  CloseIcon,
  GearIcon,
  InfoIcon,
  NoteIcon,
  PhoneIcon,
  PlayIcon,
  TimerIcon,
  WarningIcon,
} from '../icons/Icons.jsx';
import { Spinner } from '../shared/Primitives.jsx';
import logoMark from '../../assets/logo-mark.png';
import './panel.css';

const DEMOS = [
  { label: 'Feature menu', color: '#8e8e93', icon: <GearIcon size={16} />, command: { type: 'home' } },
  { label: 'Music', color: '#ff375f', icon: <PlayIcon size={15} />, command: { type: 'music' } },
  { label: 'Timer, 10 sec', color: '#ff9f0a', icon: <TimerIcon size={16} />, command: { type: 'timer', seconds: 10 } },
  { label: 'Focus, 25 min', color: '#ff9f0a', icon: <TimerIcon size={16} />, command: { type: 'timer', seconds: 1500, label: 'Focus' } },
  { label: 'Charging', color: '#30d158', icon: <BoltIcon size={16} />, command: { type: 'charging' } },
  { label: 'Download', color: '#0a84ff', icon: <ArrowDownIcon size={15} />, command: { type: 'download' } },
  { label: 'Notification', color: '#25d366', icon: <BellIcon size={15} />, command: { type: 'notification' } },
  { label: 'WhatsApp call', color: '#25d366', icon: <PhoneIcon size={15} />, command: { type: 'app-call' } },
  { label: 'Phone message', color: '#0a84ff', icon: <BellIcon size={15} />, command: { type: 'phone-notification' } },
  { label: 'Phone call', color: '#0a84ff', icon: <PhoneIcon size={15} />, command: { type: 'phone-call' } },
  { label: 'Call (demo)', color: '#30d158', icon: <PhoneIcon size={15} />, command: { type: 'call' } },
  { label: 'Copied text', color: '#636366', icon: <ClipboardIcon size={15} />, command: { type: 'clipboard' } },
  { label: 'Loading', color: '#636366', icon: <Spinner size={14} />, command: { type: 'status', variant: 'loading' } },
  { label: 'Success', color: '#30d158', icon: <span className="glyph-check">✓</span>, command: { type: 'status', variant: 'success' } },
  { label: 'Warning', color: '#ffd60a', icon: <WarningIcon size={15} />, command: { type: 'status', variant: 'warning' } },
  { label: 'Error', color: '#ff453a', icon: <CloseIcon size={13} />, command: { type: 'status', variant: 'error' } },
];

const SECTIONS = [
  { id: 'try', label: 'Try it', icon: <PlayIcon size={14} />, blurb: 'Show any activity on the island right now.' },
  { id: 'look', label: 'Appearance', icon: <InfoIcon size={16} />, blurb: 'Material, size and motion.' },
  { id: 'apps', label: 'Connected apps', icon: <NoteIcon size={15} />, blurb: 'Music, notifications and calls from apps on this PC.' },
  { id: 'phone', label: 'Phone', icon: <PhoneIcon size={14} />, blurb: 'Show your phone’s messages, notifications and calls on the island.' },
  { id: 'system', label: 'System', icon: <GearIcon size={16} />, blurb: 'Startup, updates and quitting.' },
];

// ------------------------------------------------------------- controls

function Segmented({ value, options, onChange, label }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map(([optionValue, optionLabel]) => (
        <button
          key={String(optionValue)}
          role="radio"
          aria-checked={value === optionValue}
          className={value === optionValue ? 'is-on' : ''}
          onClick={() => onChange(optionValue)}
        >
          {optionLabel}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`toggle ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle__knob" />
    </button>
  );
}

function Row({ title, detail, children, lead }) {
  return (
    <div className="prow">
      {lead}
      <div className="prow__text">
        <span className="prow__title">{title}</span>
        {detail ? <span className="prow__detail">{detail}</span> : null}
      </div>
      <div className="prow__control">{children}</div>
    </div>
  );
}

const set = (key) => (value) => settingsStore.update(key, value);

// ------------------------------------------------------------- sections

function TrySection() {
  return (
    <>
      <div className="demo-grid">
        {DEMOS.map((demo) => (
          <button key={demo.label} className="demo" onClick={() => bridge.sendCommand(demo.command)}>
            <span className="demo__icon" style={{ background: demo.color }}>
              {demo.icon}
            </span>
            <span className="demo__label">{demo.label}</span>
          </button>
        ))}
      </div>
      <button className="plain-btn" onClick={() => bridge.sendCommand({ type: 'clear' })}>
        Clear all activities
      </button>
      <p className="hint">Click the island when it’s idle to open the feature menu. Right-click it any time for the same menu.</p>
    </>
  );
}

function glassDetail(source, status) {
  if (source === 'wallpaper') return 'Your wallpaper only. Uses no extra power.';
  switch (status?.state) {
    case 'on':
      return status.app ? `Following ${prettyProcess(status.app)}` : 'Showing your desktop';
    case 'starting':
      return 'Starting…';
    case 'unsupported':
    case 'error':
      return status.message;
    default:
      return 'Whatever app is behind the island, refreshed about once a second';
  }
}

const PROCESS_NAMES = { chrome: 'Chrome', msedge: 'Edge', firefox: 'Firefox', code: 'VS Code', explorer: 'File Explorer', spotify: 'Spotify', whatsapp: 'WhatsApp' };
const prettyProcess = (name) => PROCESS_NAMES[name.toLowerCase()] ?? name;

function AppearanceSection({ settings }) {
  const glass = settings.material === 'glass';
  const glassStatus = useStore(statusStore).glass;
  return (
    <div className="group">
      <Row title="Material">
        <Segmented
          label="Material"
          value={settings.material}
          onChange={set('material')}
          options={[
            ['glass', 'Liquid glass'],
            ['black', 'Black'],
          ]}
        />
      </Row>
      {glass ? (
        <Row title="Glass shows" detail={glassDetail(settings.glassSource, glassStatus)}>
          <Segmented
            label="Glass shows"
            value={settings.glassSource === 'live' ? 'apps' : settings.glassSource}
            onChange={set('glassSource')}
            options={[
              ['apps', 'Apps behind it'],
              ['wallpaper', 'Wallpaper'],
            ]}
          />
        </Row>
      ) : null}
      <Row title="Size">
        <Segmented
          label="Size"
          value={settings.size}
          onChange={set('size')}
          options={[
            ['small', 'Small'],
            ['default', 'Default'],
            ['large', 'Large'],
          ]}
        />
      </Row>
      <Row title={glass ? 'Tint' : 'Opacity'} detail={glass ? 'Lower lets more of the background color through' : null}>
        <Segmented
          label={glass ? 'Tint' : 'Opacity'}
          value={settings.opacity}
          onChange={set('opacity')}
          options={[
            [1, '100%'],
            [0.9, '90%'],
            [0.8, '80%'],
          ]}
        />
      </Row>
      <Row title="Animation">
        <Segmented
          label="Animation speed"
          value={settings.animationSpeed}
          onChange={set('animationSpeed')}
          options={[
            ['relaxed', 'Relaxed'],
            ['default', 'Default'],
            ['snappy', 'Snappy'],
          ]}
        />
      </Row>
      <Row title="Reduce motion" detail="Fades instead of springs and bounces">
        <Toggle label="Reduce motion" checked={settings.reduceMotion} onChange={set('reduceMotion')} />
      </Row>
      <Row title="Show when idle" detail="A small semicircle at the top of the screen">
        <Toggle label="Show when idle" checked={settings.showIdlePill} onChange={set('showIdlePill')} />
      </Row>
    </div>
  );
}

function mediaDetail(status) {
  switch (status.state) {
    case 'playing':
      return `${status.status === 'Playing' ? 'Playing' : 'Paused'} in ${mediaAppName(status.app)}`;
    case 'idle':
      return 'Nothing is playing right now';
    case 'starting':
      return 'Connecting…';
    case 'unsupported':
    case 'error':
      return status.message;
    default:
      return 'Spotify, YouTube, Apple Music and any app with media controls';
  }
}

function notificationDetail(status) {
  switch (status.state) {
    case 'on':
      return status.apps?.length ? `Watching ${status.apps.length} ${status.apps.length === 1 ? 'app' : 'apps'}` : 'Waiting for the first notification';
    case 'unsupported':
    case 'error':
      return status.message;
    default:
      return 'WhatsApp, Telegram, Teams, Outlook and more';
  }
}

function AppsSection({ settings }) {
  const status = useStore(statusStore);
  const apps = status.notifications?.apps ?? [];
  const muted = new Set(settings.mutedApps);
  const toggleApp = (id, on) =>
    settingsStore.update('mutedApps', on ? settings.mutedApps.filter((x) => x !== id) : [...settings.mutedApps, id]);

  return (
    <>
      <h3 className="subhead">Music and media</h3>
      <div className="group">
        <Row title="Show what’s playing" detail={settings.media ? mediaDetail(status.media ?? {}) : 'Off'}>
          <Toggle label="Show what’s playing" checked={settings.media} onChange={set('media')} />
        </Row>
      </div>

      <h3 className="subhead">Notifications and calls</h3>
      <div className="group">
        <Row title="Mirror notifications" detail={settings.notifications ? notificationDetail(status.notifications ?? {}) : 'Off'}>
          <Toggle label="Mirror notifications" checked={settings.notifications} onChange={set('notifications')} />
        </Row>
        <Row title="Incoming calls" detail="Shows the caller and opens the app so you can answer">
          <Toggle label="Incoming calls" checked={settings.calls} onChange={set('calls')} disabled={!settings.notifications} />
        </Row>
        <Row title="Show message text" detail="When off, only the app name is shown">
          <Toggle label="Show message text" checked={settings.showMessageText} onChange={set('showMessageText')} disabled={!settings.notifications} />
        </Row>
      </div>
      {settings.notifications && apps.length ? (
        <>
          <h3 className="subhead">Apps</h3>
          <div className="group">
            {apps.map((a) => (
              <Row
                key={a.id}
                title={a.name}
                lead={
                  <span className="app-chip" style={{ background: a.color }} aria-hidden="true">
                    {a.name.slice(0, 1)}
                  </span>
                }
              >
                <Toggle label={`Show ${a.name}`} checked={!muted.has(a.id)} onChange={(on) => toggleApp(a.id, on)} />
              </Row>
            ))}
          </div>
        </>
      ) : null}

      <h3 className="subhead">This PC</h3>
      <div className="group">
        <Row title="Copied text" detail="Passwords and tokens stay hidden">
          <Toggle label="Copied text" checked={settings.clipboard} onChange={set('clipboard')} />
        </Row>
        <Row title="Charging and low battery">
          <Toggle label="Charging and low battery" checked={settings.battery} onChange={set('battery')} />
        </Row>
      </div>
    </>
  );
}

function ago(at) {
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : 'over a day ago';
}

function Step({ n, title, detail, action }) {
  return (
    <div className="prow prow--step">
      <span className="step-num" aria-hidden="true">
        {n}
      </span>
      <div className="prow__text">
        <span className="prow__title">{title}</span>
        {detail ? <span className="prow__detail">{detail}</span> : null}
      </div>
      {action ? <div className="prow__control">{action}</div> : null}
    </div>
  );
}

// Windows can't read a phone's notifications over Bluetooth on its own, so the
// connection goes through Microsoft Phone Link; Dynoland shows what it receives.
function PhoneSection({ settings }) {
  const phone = useStore(statusStore).phone ?? {};
  const ready = phone.state === 'ready';
  const unsupported = phone.state === 'unsupported';
  const headline = unsupported ? 'Phone notifications work on Windows' : ready ? 'Phone Link is installed' : 'Phone Link isn’t installed yet';
  const detail = phone.lastAt
    ? `Last phone notification ${ago(phone.lastAt)}${phone.lastApp ? ` from ${phone.lastApp}` : ''}`
    : ready
      ? 'Waiting for the first notification from your phone'
      : 'Phone Link connects your phone to this PC over Bluetooth';
  return (
    <>
      <div className="group">
        <div className="prow">
          <span className={`phone-badge ${phone.lastAt ? 'is-live' : ''}`} aria-hidden="true">
            <PhoneIcon size={18} />
          </span>
          <div className="prow__text">
            <span className="prow__title">{headline}</span>
            <span className="prow__detail">{detail}</span>
          </div>
        </div>
      </div>

      <h3 className="subhead">Connect your phone</h3>
      <div className="group">
        <Step
          n={1}
          title="Turn on Bluetooth"
          detail="On this PC and on your phone."
          action={
            <button className="small-btn" onClick={() => bridge.openSystem('bluetooth')} disabled={unsupported}>
              Bluetooth settings
            </button>
          }
        />
        <Step
          n={2}
          title="Link your phone in Phone Link"
          detail="Android: install Link to Windows on the phone and scan the code. iPhone: choose iPhone and pair over Bluetooth."
          action={
            <button className="small-btn small-btn--accent" onClick={() => bridge.openSystem('phone-link')} disabled={unsupported}>
              {ready ? 'Open Phone Link' : 'Get Phone Link'}
            </button>
          }
        />
        <Step
          n={3}
          title="Allow notifications"
          detail="Turn them on in Phone Link. On iPhone, also open Bluetooth, tap ⓘ next to this PC and turn on Show Notifications."
        />
        <Step
          n={4}
          title="Keep Phone Link notifications on in Windows"
          detail="Dynoland shows what Phone Link shows as Windows notifications."
          action={
            <button className="small-btn" onClick={() => bridge.openSystem('notification-settings')} disabled={unsupported}>
              Notification settings
            </button>
          }
        />
      </div>

      <h3 className="subhead">On the island</h3>
      <div className="group">
        <Row title="Phone notifications" detail="Messages and app notifications, with the original app and sender’s photo">
          <Toggle label="Phone notifications" checked={settings.phone} onChange={set('phone')} disabled={!settings.notifications} />
        </Row>
        <Row title="Phone calls" detail="Shows the caller; answer in Phone Link">
          <Toggle label="Phone calls" checked={settings.calls} onChange={set('calls')} disabled={!settings.notifications} />
        </Row>
      </div>
      <p className="hint">
        Windows can’t read a phone’s notifications over Bluetooth by itself, so Dynoland uses Microsoft Phone Link, which comes with
        Windows 11, for the connection. Everything Phone Link receives appears on the island. Try it in Try it → Phone message.
      </p>
    </>
  );
}

function updateDetail(update, info) {
  switch (update?.state) {
    case 'checking':
      return 'Checking for updates…';
    case 'downloading':
      return `Downloading update${update.version ? ` ${update.version}` : ''}… ${update.percent ?? 0}%`;
    case 'ready':
      return `Version ${update.version} is ready to install`;
    case 'current':
      return 'You’re up to date';
    case 'error':
      return `Couldn’t check for updates. ${update.message ?? ''}`;
    case 'unavailable':
      return update.message;
    default:
      return `Version ${info.version}`;
  }
}

function SystemSection({ settings, info }) {
  const update = useStore(statusStore).update ?? {};
  return (
    <div className="group">
      <Row title="Start with Windows" detail={info.packaged ? null : 'Available in the installed app'}>
        <Toggle label="Start with Windows" checked={settings.startWithWindows} onChange={set('startWithWindows')} disabled={!info.packaged} />
      </Row>
      <Row title="Show island">
        <Toggle label="Show island" checked={!settings.islandHidden} onChange={(v) => settingsStore.update('islandHidden', !v)} />
      </Row>
      <Row title={`Version ${info.version || ''}`} detail={updateDetail(update, info)}>
        {update.state === 'ready' ? (
          <button className="small-btn small-btn--accent" onClick={() => bridge.installUpdate()}>
            Restart to update
          </button>
        ) : (
          <button
            className="small-btn"
            onClick={() => bridge.checkForUpdates()}
            disabled={update.state === 'unavailable' || update.state === 'checking' || update.state === 'downloading'}
          >
            Check for updates
          </button>
        )}
      </Row>
      <div className="prow prow--action">
        <button className="link-btn link-btn--danger" onClick={() => bridge.quit()}>
          Quit Dynoland
        </button>
      </div>
    </div>
  );
}

function SectionBody({ id, settings, info }) {
  switch (id) {
    case 'try':
      return <TrySection />;
    case 'look':
      return <AppearanceSection settings={settings} />;
    case 'apps':
      return <AppsSection settings={settings} />;
    case 'phone':
      return <PhoneSection settings={settings} />;
    default:
      return <SystemSection settings={settings} info={info} />;
  }
}

// --------------------------------------------------------------- layout

// "Dyno" in white and "land" in the logo's blue-to-pink gradient.
function Wordmark() {
  return (
    <span className="wordmark" aria-label="Dynoland">
      <span aria-hidden="true">Dyno</span>
      <span className="wordmark__land" aria-hidden="true">
        land
      </span>
    </span>
  );
}

export default function ControlPanel() {
  const settings = useSettings();
  const wide = useMediaQuery('(min-width: 820px)');
  const [info, setInfo] = useState({ packaged: false, version: '' });
  const [active, setActive] = useState('try');
  const mainRef = useRef(null);

  useEffect(() => {
    initStatus();
    bridge.getInfo?.().then((next) => next && setInfo(next));
    return bridge.onPanelSection((section) => setActive(section));
  }, []);

  useEffect(() => {
    if (wide) mainRef.current?.scrollTo({ top: 0 });
    else document.getElementById(`section-${active}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [active, wide]);

  const current = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0];

  return (
    <div className={`cp ${wide ? 'cp--wide' : 'cp--narrow'}`}>
      <div className="cp__titlebar">
        <img className="cp__titlebar-mark" src={logoMark} alt="" />
        <span>Dynoland</span>
      </div>

      <div className="cp__body">
        {wide ? (
          <nav className="cp__nav" aria-label="Sections">
            <div className="cp__brand">
              <img className="cp__brand-mark" src={logoMark} alt="" />
              <span className="cp__brand-name">
                <Wordmark />
              </span>
              <span className="cp__brand-version">{info.version ? `Version ${info.version}` : 'Your dynamic island'}</span>
            </div>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={`nav-item ${s.id === active ? 'is-active' : ''}`}
                aria-current={s.id === active ? 'page' : undefined}
                onClick={() => setActive(s.id)}
              >
                <span className="nav-item__icon">{s.icon}</span>
                {s.label}
              </button>
            ))}
            <p className="cp__shortcut">Ctrl+Shift+D opens this window from anywhere.</p>
          </nav>
        ) : null}

        <main className="cp__main" ref={mainRef}>
          {wide ? (
            <div className="cp__page">
              <header className="page-header">
                <h1>{current.label}</h1>
                <p>{current.blurb}</p>
              </header>
              <SectionBody id={current.id} settings={settings} info={info} />
            </div>
          ) : (
            <div className="cp__page">
              <header className="page-header page-header--narrow">
                <div className="page-header__brand">
                  <img className="page-header__mark" src={logoMark} alt="" />
                  <h1>
                    <Wordmark />
                  </h1>
                </div>
                <p>Your dynamic island. Try each activity, then choose how it looks and which apps it shows.</p>
              </header>
              {SECTIONS.map((s) => (
                <section key={s.id} id={`section-${s.id}`} aria-labelledby={`heading-${s.id}`}>
                  <h2 id={`heading-${s.id}`}>{s.label}</h2>
                  <SectionBody id={s.id} settings={settings} info={info} />
                </section>
              ))}
              <footer className="cp__footer">
                Ctrl+Shift+D opens this window from anywhere.{info.version ? ` Version ${info.version}.` : ''}
              </footer>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
