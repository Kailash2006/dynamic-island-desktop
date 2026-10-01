import { island } from './activityManager.js';
import { music } from './activities/music.js';
import { timer } from './activities/timer.js';
import { download } from './activities/download.js';
import { call } from './activities/call.js';
import { showCharging, batteryStore } from './activities/battery.js';
import { showSampleNotification } from './activities/notification.js';
import { runStatusDemo, showStatus } from './activities/status.js';
import { showClipboard } from './activities/clipboard.js';
import { showDemoAppCall } from './activities/appNotifications.js';

// Commands arrive from the control panel (via the main process).
export function handleCommand(command) {
  switch (command?.type) {
    case 'music':
      return music.start();
    case 'timer':
      return timer.start(command.seconds ?? 10, command.label ?? 'Timer');
    case 'charging':
      return showCharging(batteryStore.get().level ?? 0.82);
    case 'download':
      return download.startDemo();
    case 'notification':
      return showSampleNotification();
    case 'call':
      return call.incoming();
    case 'app-call':
      return showDemoAppCall();
    case 'home':
      return island.openHome(command.view ?? 'main');
    case 'update-ready':
      return island.show({
        id: 'update',
        type: 'status',
        kind: 'alert',
        variant: 'update',
        title: 'Update ready',
        subtitle: `Click to restart with version ${command.version}`,
        action: 'install-update',
        duration: 20000,
      });
    case 'clipboard':
      return showClipboard({ text: 'Transformers use self-attention to weigh tokens', length: 48 });
    case 'status':
      return runStatusDemo(command.variant);
    case 'welcome':
      return showStatus('info', 'Dynoland is running', 'Press Ctrl+Shift+D for the control panel', 6000);
    case 'expand':
      return island.setExpanded(true);
    case 'collapse':
      return island.setExpanded(false);
    case 'clear':
      music.stop();
      timer.cancel();
      download.cancel();
      call.decline();
      return island.clear();
    default:
  }
}
