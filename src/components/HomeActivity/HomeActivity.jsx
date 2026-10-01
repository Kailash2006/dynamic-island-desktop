import { island } from '../../services/activityManager.js';
import { bridge } from '../../services/bridge.js';
import { timer } from '../../services/activities/timer.js';
import { music } from '../../services/activities/music.js';
import { showStatus } from '../../services/activities/status.js';
import { useBattery } from '../../services/activities/battery.js';
import { clipboardHistory, notificationHistory, statusStore, useStore } from '../../services/stores.js';
import { useSettings } from '../../services/settings.js';
import { useNow } from '../../hooks/useNow.js';
import { BatteryGlyph } from '../shared/Primitives.jsx';
import { BellIcon, ChevronLeftIcon, ClipboardIcon, GearIcon, NoteIcon, SparkIcon, TimerIcon } from '../icons/Icons.jsx';
import { GREEN } from '../../utils/colors.js';

// What the island can do, shown when you click it while nothing is running
// (or right-click it at any time).

function openMusic() {
  const media = island.get('media') ?? island.get('music');
  if (media) island.focus(media.id, true);
  else island.openHome('music');
}

function openClaude() {
  if (island.get('claude')) island.focus('claude', true);
  else {
    bridge.openPanel('claude');
    island.closeHome();
  }
}

const FEATURES = [
  { id: 'timer', label: 'Timer', color: '#ff9f0a', icon: <TimerIcon size={20} />, run: () => island.openHome('timer') },
  { id: 'music', label: 'Music', color: '#ff375f', icon: <NoteIcon size={19} />, run: openMusic },
  { id: 'clipboard', label: 'Clipboard', color: '#64d2ff', icon: <ClipboardIcon size={19} />, run: () => island.openHome('clipboard') },
  { id: 'alerts', label: 'Alerts', color: '#ff453a', icon: <BellIcon size={19} />, run: () => island.openHome('alerts') },
  { id: 'claude', label: 'Claude', color: '#d97757', icon: <SparkIcon size={18} />, run: openClaude },
  {
    id: 'settings',
    label: 'Settings',
    color: '#aeaeb2',
    icon: <GearIcon size={20} />,
    run: () => {
      bridge.openPanel();
      island.closeHome();
    },
  },
];

function Header({ title }) {
  return (
    <div className="home__header">
      <button className="ibtn ibtn--gray ibtn--sm" onClick={() => island.openHome('main')} aria-label="Back">
        <ChevronLeftIcon size={15} />
      </button>
      <span className="t-title">{title}</span>
    </div>
  );
}

function HomeMain() {
  const now = useNow(1000);
  const battery = useBattery();
  const date = new Date(now);
  const level = battery.level ?? 0;
  const batteryColor = battery.charging ? GREEN : level <= 0.2 ? '#ff453a' : '#fff';
  return (
    <div className="home">
      <div className="row space-between">
        <div className="home__clock">
          <span className="home__time num">{date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
          <span className="t-sub">{date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
        {battery.supported ? (
          <span className="idle__battery" style={{ color: batteryColor }}>
            <span className="num">{Math.round(level * 100)}%</span>
            <BatteryGlyph level={level} color={batteryColor} charging={battery.charging} width={25} />
          </span>
        ) : null}
      </div>
      <div className="home__grid">
        {FEATURES.map((f) => (
          <button key={f.id} className="feature" onClick={f.run}>
            <span className="feature__icon" style={{ color: f.color }}>
              {f.icon}
            </span>
            <span className="feature__label">{f.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const PRESETS = [
  [60, '1 min'],
  [300, '5 min'],
  [600, '10 min'],
  [900, '15 min'],
  [1500, '25 min focus'],
  [2700, '45 min'],
];

function HomeTimer() {
  return (
    <div className="home">
      <Header title="Start a timer" />
      <div className="chips">
        {PRESETS.map(([seconds, label]) => (
          <button key={seconds} className="chip" onClick={() => timer.start(seconds, seconds === 1500 ? 'Focus' : 'Timer')}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function HomeMusic() {
  const settings = useSettings();
  const status = useStore(statusStore).media;
  const unavailable = !settings.media || status.state === 'unsupported' || status.state === 'error';
  return (
    <div className="home">
      <Header title="Music" />
      <p className="home__note">
        {unavailable
          ? 'Turn on Music and media in the control panel to see what’s playing.'
          : 'Play something in Spotify, YouTube, or any app with media controls and it shows up here.'}
      </p>
      <div className="row gap-8">
        <button className="pill-btn" onClick={music.start}>
          Try the demo player
        </button>
        {unavailable ? (
          <button className="pill-btn" onClick={() => bridge.openPanel('apps')}>
            Open settings
          </button>
        ) : null}
      </div>
    </div>
  );
}

function HomeClipboard() {
  const items = useStore(clipboardHistory);
  const copy = (text) => {
    bridge.writeClipboard(text);
    showStatus('success', 'Copied again', undefined, 1600);
  };
  return (
    <div className="home">
      <Header title="Recently copied" />
      {items.length ? (
        <div className="list">
          {items.map((item) => (
            <button key={item.key} className="list__row" onClick={() => copy(item.text)}>
              <span className="list__icon">
                <ClipboardIcon size={15} />
              </span>
              <span className="truncate grow">{item.text.replace(/\s+/g, ' ')}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="home__note">Text you copy shows up here, so you can copy it again. Passwords are never kept.</p>
      )}
    </div>
  );
}

function timeAgo(at, now) {
  const minutes = Math.floor((now - at) / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

function HomeAlerts() {
  const items = useStore(notificationHistory);
  const settings = useSettings();
  const status = useStore(statusStore).notifications;
  const now = useNow(30000);
  const off = !settings.notifications || status.state === 'unsupported' || status.state === 'error';
  return (
    <div className="home">
      <Header title="Recent notifications" />
      {items.length ? (
        <div className="list">
          {items.map((item) => (
            <button key={item.key} className="list__row" onClick={() => item.appId && bridge.openApp(item.appId)}>
              <span className="list__icon list__icon--app" style={{ background: item.color }}>
                {item.app.slice(0, 1)}
              </span>
              <span className="stack grow">
                <span className="list__title truncate">{item.title}</span>
                <span className="t-sub truncate">{item.body}</span>
              </span>
              <span className="t-meta">{timeAgo(item.at, now)}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="home__note">
          {off
            ? 'Turn on notifications in the control panel to mirror WhatsApp and other apps here.'
            : 'Notifications from WhatsApp, Telegram, Outlook and your other apps show up here.'}
        </p>
      )}
    </div>
  );
}

export function HomeView({ view }) {
  switch (view) {
    case 'timer':
      return <HomeTimer />;
    case 'music':
      return <HomeMusic />;
    case 'clipboard':
      return <HomeClipboard />;
    case 'alerts':
      return <HomeAlerts />;
    default:
      return <HomeMain />;
  }
}

export function homeSize(view, counts) {
  switch (view) {
    case 'timer':
      return { w: 400, h: 150 };
    case 'music':
      return { w: 400, h: 148 };
    case 'clipboard':
      return { w: 400, h: counts.clipboard ? 66 + counts.clipboard * 46 : 118 };
    case 'alerts':
      return { w: 400, h: counts.alerts ? 66 + counts.alerts * 50 : 118 };
    default:
      return { w: 420, h: 166 };
  }
}
