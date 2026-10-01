export function NotificationBanner({ a }) {
  return (
    <div className="banner">
      <span className="app-tile" style={{ background: a.color }} aria-hidden="true">
        {a.glyph}
      </span>
      <div className="stack grow">
        <div className="row space-between gap-8">
          <span className="t-title truncate">{a.sender}</span>
          <span className="t-meta">{a.app ?? 'now'}</span>
        </div>
        <span className="t-sub truncate">{a.body}</span>
      </div>
    </div>
  );
}
