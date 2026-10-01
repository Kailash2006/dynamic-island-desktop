import { island } from '../activityManager.js';
import { settingsStore } from '../settings.js';
import { notificationHistory, pushHistory } from '../stores.js';
import { chime } from '../sound.js';

// Phone Link's app ID; its notifications are the phone's.
export const PHONE_LINK_APP_ID = 'Microsoft.YourPhone_8wekyb3d8bbwe!App';

// Notifications and incoming calls mirrored from Windows apps, and from your
// phone through Phone Link.
export function handleAppNotification(n) {
  const settings = settingsStore.get();
  if (!settings.notifications) return;
  if (n.isPhone && !settings.phone) return;

  // For phone notifications show the original app (WhatsApp, Instagram…).
  const app = n.isPhone ? (n.source?.name ?? 'Phone') : n.app;
  const color = n.isPhone ? (n.source?.color ?? n.color) : n.color;
  const hidden = !settings.showMessageText;

  if (n.isCall) {
    if (!settings.calls) return;
    island.show({
      id: `call-${n.id}`,
      type: 'appcall',
      kind: 'live',
      notificationId: n.id,
      appId: n.appId,
      app: n.isPhone ? 'Phone Link' : n.app,
      color,
      icon: n.icon ?? null,
      isPhone: Boolean(n.isPhone),
      name: n.texts[0] ?? app,
      detail: n.isPhone ? (n.isVideo ? 'Phone video call' : 'Phone call') : n.isVideo ? 'Video call' : 'Voice call',
      duration: 90_000,
    });
    chime('attention');
    return;
  }

  const [first, ...rest] = n.texts;
  const title = hidden ? app : first;
  const body = hidden ? 'New notification' : rest.join(' ') || app;
  const icon = hidden ? null : (n.icon ?? null);

  pushHistory(
    notificationHistory,
    { key: n.id, appId: n.appId, app, color, icon, isPhone: Boolean(n.isPhone), title, body, at: Date.now() },
    3,
  );
  island.show({
    id: 'notification',
    type: 'notification',
    kind: 'alert',
    appId: n.appId,
    app,
    color,
    icon,
    isPhone: Boolean(n.isPhone),
    glyph: app.slice(0, 1).toUpperCase(),
    sender: title,
    body,
    duration: 5200,
  });
}

// The app removed its call toast: the call was answered, declined or ended.
export function handleNotificationRemoved({ id }) {
  island.remove(`call-${id}`);
}

// Previews for the demo panel.
export function showDemoAppCall() {
  handleAppNotification({
    id: `demo-${Date.now()}`,
    appId: '5319275A.WhatsAppDesktop_cv1g1gvanyjgm!App',
    app: 'WhatsApp',
    color: '#25d366',
    texts: ['Arjun', 'Incoming voice call'],
    isCall: true,
    isVideo: false,
  });
}

export function showDemoPhoneNotification() {
  handleAppNotification({
    id: `demo-phone-${Date.now()}`,
    appId: PHONE_LINK_APP_ID,
    app: 'Phone',
    color: '#0a84ff',
    isPhone: true,
    source: { name: 'WhatsApp', color: '#25d366' },
    texts: ['Priya', 'Reached home safely, call you after dinner'],
    isCall: false,
  });
}

export function showDemoPhoneCall() {
  handleAppNotification({
    id: `demo-phonecall-${Date.now()}`,
    appId: PHONE_LINK_APP_ID,
    app: 'Phone',
    color: '#30d158',
    isPhone: true,
    texts: ['Amma', 'Incoming call'],
    isCall: true,
    isVideo: false,
  });
}
