import { island } from '../activityManager.js';
import { clipboardHistory, pushHistory } from '../stores.js';

// Anything that looks like a password or token is never shown on screen.
export function looksSecret(text) {
  const t = text.trim();
  if (t.length < 8 || t.length > 160 || /\s/.test(t)) return false;
  if (/^https?:\/\//i.test(t) || /[\\/]/.test(t) || /^[\w.+-]+@[\w-]+\.[\w.]+$/.test(t)) return false;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter((re) => re.test(t)).length;
  return classes >= 3 || /^(sk|pk|ghp|gho|xox[bap])[-_]/i.test(t);
}

export function showClipboard({ text, length }) {
  const hidden = looksSecret(text);
  // Only non-secret, fully captured text is kept for "copy again".
  if (!hidden && length === text.length) pushHistory(clipboardHistory, { key: text, text }, 3);
  island.show({
    id: 'clipboard',
    type: 'clipboard',
    kind: 'alert',
    preview: hidden ? null : text.replace(/\s+/g, ' ').trim(),
    length,
    duration: 2600,
  });
}
