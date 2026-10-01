import { bridge } from '../../services/bridge.js';
import { island } from '../../services/activityManager.js';
import { CloseIcon, OpenIcon, PhoneIcon } from '../icons/Icons.jsx';

// An incoming call from another app (WhatsApp, Teams…). Answering happens in
// that app, so the island offers to bring it to the front.
export function AppCallBanner({ a }) {
  const open = () => {
    bridge.openApp(a.appId);
    island.remove(a.id);
  };
  return (
    <div className="banner">
      <span className="app-tile app-tile--call" style={{ background: a.color }} aria-hidden="true">
        <PhoneIcon size={20} />
      </span>
      <div className="stack grow">
        <span className="t-sub truncate">{a.detail}</span>
        <span className="t-title t-lg truncate">{a.name}</span>
      </div>
      <button className="ibtn ibtn--gray ibtn--lg" onClick={() => island.remove(a.id)} aria-label="Dismiss">
        <CloseIcon size={16} />
      </button>
      <button className="pill-btn pill-btn--green" onClick={open}>
        <OpenIcon size={15} />
        Open {a.app}
      </button>
    </div>
  );
}

export const AppCallMinimal = ({ a }) => <PhoneIcon size={16} style={{ color: a.color }} />;
