import { call } from '../../services/activities/call.js';
import { HangUpIcon, MicIcon, MicOffIcon, PhoneIcon } from '../icons/Icons.jsx';
import { GREEN } from '../../utils/colors.js';

function Avatar({ name, size = 46 }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials}
    </span>
  );
}

export function CallIncoming({ a }) {
  return (
    <div className="banner">
      <Avatar name={a.name} />
      <div className="stack grow">
        <span className="t-sub">{a.label}</span>
        <span className="t-title t-lg truncate">{a.name}</span>
      </div>
      <button className="ibtn ibtn--red ibtn--lg" onClick={call.decline} aria-label="Decline call">
        <HangUpIcon size={22} />
      </button>
      <button className="ibtn ibtn--green ibtn--lg ibtn--ringing" onClick={call.accept} aria-label="Accept call">
        <PhoneIcon size={22} />
      </button>
    </div>
  );
}

export function CallCompact({ a }) {
  return (
    <div className="compact">
      <div className="compact__lead" style={{ color: GREEN }}>
        <PhoneIcon size={15} />
        <span className="compact__text truncate">{a.name.split(' ')[0]}</span>
      </div>
      <span className="compact__value num" style={{ color: GREEN }}>
        {call.format(a.elapsed)}
      </span>
    </div>
  );
}

export function CallExpanded({ a }) {
  return (
    <div className="banner">
      <Avatar name={a.name} />
      <div className="stack grow">
        <span className="t-sub num" style={{ color: GREEN }}>
          {call.format(a.elapsed)}
        </span>
        <span className="t-title t-lg truncate">{a.name}</span>
      </div>
      <button
        className={`ibtn ibtn--lg ${a.muted ? 'ibtn--white' : 'ibtn--gray'}`}
        onClick={call.toggleMute}
        aria-label={a.muted ? 'Unmute' : 'Mute'}
        aria-pressed={a.muted}
      >
        {a.muted ? <MicOffIcon size={20} /> : <MicIcon size={20} />}
      </button>
      <button className="ibtn ibtn--red ibtn--lg" onClick={call.end} aria-label="End call">
        <HangUpIcon size={22} />
      </button>
    </div>
  );
}

export const CallMinimal = () => <PhoneIcon size={16} style={{ color: GREEN }} />;
