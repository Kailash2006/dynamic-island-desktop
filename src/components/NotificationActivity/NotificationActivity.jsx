import { PhoneIcon } from '../icons/Icons.jsx';

// The app's colored tile, or the picture the notification came with (a
// sender's photo or the app's icon), with a small phone badge for
// notifications that came from your phone.
export function SenderTile({ a, size = 44, radius = 12 }) {
  return (
    <span className="sender-tile" style={{ width: size, height: size }} aria-hidden="true">
      {a.icon ? (
        <img className="sender-tile__img" src={a.icon} alt="" style={{ borderRadius: radius }} draggable={false} />
      ) : (
        <span className="app-tile" style={{ width: size, height: size, borderRadius: radius, background: a.color, fontSize: size * 0.4 }}>
          {a.glyph ?? a.app?.slice(0, 1)}
        </span>
      )}
      {a.isPhone ? (
        <span className="sender-tile__badge" style={{ width: Math.max(13, size * 0.38), height: Math.max(13, size * 0.38) }}>
          <PhoneIcon size={Math.max(7, Math.round(size * 0.2))} />
        </span>
      ) : null}
    </span>
  );
}

export function NotificationBanner({ a }) {
  return (
    <div className="banner">
      <SenderTile a={a} />
      <div className="stack grow">
        <div className="row space-between gap-8">
          <span className="t-title truncate">{a.sender}</span>
          <span className="t-meta">{a.isPhone ? `${a.app} on phone` : (a.app ?? 'now')}</span>
        </div>
        <span className="t-sub truncate">{a.body}</span>
      </div>
    </div>
  );
}
