import { island } from '../activityManager.js';
import { settingsStore } from '../settings.js';
import { notificationHistory, pushHistory } from '../stores.js';
import { chime } from '../sound.js';

// Notifications and incoming calls mirrored from other Windows apps.
export function handleAppNotification(n) {
  const settings = settingsStore.get();
  if (!settings.notifications) return;

  if (n.isCall) {
    if (!settings.calls) return;
    island.show({
      id: `call-${n.id}`,
      type: 'appcall',
      kind: 'live',
      notificationId: n.id,
      appId: n.appId,
      app: n.app,
      color: n.color,
      name: n.texts[0] ?? n.app,
      detail: n.isVideo ? 'Video call' : 'Voice call',
      duration: 90_000,
    });
    chime('attention');
    return;
  }

  const [first, ...rest] = n.texts;
  const hidden = !settings.showMessageText;
  const title = hidden ? n.app : first;
  const body = hidden ? 'New notification' : rest.join(' ') || n.app;

  pushHistory(notificationHistory, { key: n.id, appId: n.appId, app: n.app, color: n.color, title, body, at: Date.now() }, 3);
  island.show({
    id: 'notification',
    type: 'notification',
    kind: 'alert',
    appId: n.appId,
    app: n.app,
    color: n.color,
    glyph: n.app.slice(0, 1).toUpperCase(),
    sender: title,
    body,
    duration: 5200,
  });
}

// The app removed its call toast: the call was answered, declined or ended.
export function handleNotificationRemoved({ id }) {
  island.remove(`call-${id}`);
}

// Preview of an incoming WhatsApp-style call, for the demo panel.
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
