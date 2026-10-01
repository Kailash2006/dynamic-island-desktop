import { ClipboardIcon, EyeOffIcon } from '../icons/Icons.jsx';

export function ClipboardBanner({ a }) {
  return (
    <div className="banner">
      <span className="tile tile--gray" aria-hidden="true">
        {a.preview ? <ClipboardIcon size={18} /> : <EyeOffIcon size={18} />}
      </span>
      <div className="stack grow">
        <span className="t-title">Copied</span>
        <span className="t-sub truncate">{a.preview ?? 'Hidden because it looks like a password'}</span>
      </div>
    </div>
  );
}
