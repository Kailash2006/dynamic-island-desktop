import { island } from '../activityManager.js';

// Loading / success / warning / error / info alerts.
export function showStatus(variant, title, subtitle, duration) {
  return island.show({
    id: 'status',
    type: 'status',
    kind: 'alert',
    variant,
    title,
    subtitle,
    duration: duration ?? (variant === 'loading' ? undefined : variant === 'error' ? 4200 : 3200),
  });
}

export function runStatusDemo(variant) {
  if (variant === 'loading') {
    showStatus('loading', 'Uploading build', 'project-build.zip');
    setTimeout(() => showStatus('success', 'Upload complete', 'project-build.zip'), 2600);
    return;
  }
  const copy = {
    success: ['Saved', 'Project settings were saved'],
    warning: ['Battery low', '15% remaining. Plug in soon.'],
    error: ['Wi-Fi disconnected', 'Reconnect to keep syncing'],
  }[variant];
  if (copy) showStatus(variant, ...copy);
}
