import { island } from '../services/activityManager.js';
import { bridge } from '../services/bridge.js';
import { MediaCompact, MediaExpanded, MediaMinimal } from './MediaActivity/MediaActivity.jsx';
import { AppCallBanner, AppCallMinimal } from './AppCallActivity/AppCallActivity.jsx';
import { MusicCompact, MusicExpanded, MusicMinimal } from './MusicActivity/MusicActivity.jsx';
import { TimerCompact, TimerExpanded, TimerMinimal } from './TimerActivity/TimerActivity.jsx';
import { ChargingCompact, ChargingExpanded, ChargingMinimal } from './ChargingActivity/ChargingActivity.jsx';
import { DownloadCompact, DownloadExpanded, DownloadMinimal } from './DownloadActivity/DownloadActivity.jsx';
import { CallCompact, CallExpanded, CallIncoming, CallMinimal } from './CallActivity/CallActivity.jsx';
import { NotificationBanner } from './NotificationActivity/NotificationActivity.jsx';
import { ClipboardBanner } from './ClipboardActivity/ClipboardActivity.jsx';
import { StatusBanner } from './StatusActivity/StatusActivity.jsx';

// How each activity type looks in each presentation, and how big it is.
//   compact  – the resting pill
//   expanded – after a click
//   banner   – alerts and moments that need attention (incoming call…)
export const ACTIVITIES = {
  media: {
    sizes: { compact: { w: 264, h: 36 }, expanded: { w: 400, h: 182 } },
    Compact: MediaCompact,
    Expanded: MediaExpanded,
    Minimal: MediaMinimal,
  },
  appcall: {
    sizes: { banner: { w: 420, h: 90 } },
    presentation: () => 'banner',
    Banner: AppCallBanner,
    Minimal: AppCallMinimal,
    onBannerClick: () => {},
  },
  music: {
    sizes: { compact: { w: 264, h: 36 }, expanded: { w: 400, h: 182 } },
    Compact: MusicCompact,
    Expanded: MusicExpanded,
    Minimal: MusicMinimal,
  },
  timer: {
    sizes: { compact: { w: 196, h: 36 }, expanded: { w: 400, h: 106 } },
    Compact: TimerCompact,
    Expanded: TimerExpanded,
    Minimal: TimerMinimal,
  },
  charging: {
    sizes: { compact: { w: 296, h: 36 }, expanded: { w: 340, h: 108 } },
    Compact: ChargingCompact,
    Expanded: ChargingExpanded,
    Minimal: ChargingMinimal,
  },
  download: {
    sizes: { compact: { w: 244, h: 36 }, expanded: { w: 400, h: 138 } },
    Compact: DownloadCompact,
    Expanded: DownloadExpanded,
    Minimal: DownloadMinimal,
  },
  call: {
    sizes: { compact: { w: 210, h: 36 }, expanded: { w: 400, h: 90 }, banner: { w: 400, h: 90 } },
    presentation: (a) => (a.state === 'incoming' ? 'banner' : null),
    Compact: CallCompact,
    Expanded: CallExpanded,
    Banner: CallIncoming,
    Minimal: CallMinimal,
    onBannerClick: () => {},
  },
  notification: {
    sizes: { banner: { w: 392, h: 78 } },
    Banner: NotificationBanner,
    onBannerClick: (a) => {
      if (a.appId) bridge.openApp(a.appId);
      island.remove(a.id);
    },
  },
  clipboard: { sizes: { banner: { w: 344, h: 66 } }, Banner: ClipboardBanner },
  status: {
    sizes: { banner: (a) => (a.subtitle ? { w: 344, h: 64 } : { w: 250, h: 48 }) },
    Banner: StatusBanner,
    onBannerClick: (a) => {
      if (a.action === 'install-update') bridge.installUpdate();
      else island.remove(a.id);
    },
  },
};

// Idle: a small semicircle hanging from the top edge of the screen.
export const IDLE_SIZE = { w: 60, h: 30 };
// Hovering it opens it into a notch that shows the time and battery.
export const PEEK_SIZE = { w: 206, h: 34 };

export function presentationFor(activity, expanded) {
  const def = ACTIVITIES[activity.type];
  const forced = def?.presentation?.(activity);
  if (forced) return forced;
  if (activity.kind === 'alert' || !def?.Compact) return 'banner';
  return expanded ? 'expanded' : 'compact';
}

export function sizeFor(activity, mode) {
  const size = ACTIVITIES[activity.type]?.sizes[mode] ?? { w: 300, h: 60 };
  return typeof size === 'function' ? size(activity) : size;
}

// Attached shapes (idle, peek) are flush with the top edge of the screen.
export const isAttached = (mode) => mode === 'idle' || mode === 'peek';

export function cornersFor(size, mode) {
  if (isAttached(mode)) {
    const bottom = mode === 'idle' ? size.w / 2 : size.h / 2;
    return { borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: bottom, borderBottomRightRadius: bottom };
  }
  const r = mode === 'compact' ? size.h / 2 : Math.min(size.h / 2, 40);
  return { borderTopLeftRadius: r, borderTopRightRadius: r, borderBottomLeftRadius: r, borderBottomRightRadius: r };
}
