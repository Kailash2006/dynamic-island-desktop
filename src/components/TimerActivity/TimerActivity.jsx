import { timer } from '../../services/activities/timer.js';
import { ProgressRing, formatClock } from '../shared/Primitives.jsx';
import { CloseIcon, PauseIcon, PlayIcon } from '../icons/Icons.jsx';
import { ORANGE } from '../../utils/colors.js';

const TRACK = 'rgba(255,159,10,0.24)';

export function TimerCompact({ a }) {
  return (
    <div className="compact">
      <ProgressRing size={18} stroke={2.8} progress={a.seconds / a.total} color={ORANGE} track={TRACK} />
      <span className="compact__value num" style={{ color: ORANGE }}>
        {formatClock(a.seconds)}
      </span>
    </div>
  );
}

export function TimerExpanded({ a }) {
  return (
    <div className="panel panel--timer">
      <div className="timer__buttons">
        <ProgressRing size={58} stroke={3} progress={a.seconds / a.total} color={ORANGE} track={TRACK}>
          <button className="ibtn ibtn--orange ibtn--md" onClick={timer.toggle} aria-label={a.paused ? 'Resume timer' : 'Pause timer'}>
            {a.paused ? <PlayIcon size={20} /> : <PauseIcon size={20} />}
          </button>
        </ProgressRing>
        <button className="ibtn ibtn--gray ibtn--md" onClick={timer.cancel} aria-label="Cancel timer">
          <CloseIcon size={18} />
        </button>
      </div>
      <div className="timer__readout">
        <span className="timer__label">{a.paused ? 'Paused' : a.label}</span>
        <span className="timer__digits num">{formatClock(a.seconds)}</span>
      </div>
    </div>
  );
}

export const TimerMinimal = ({ a }) => <ProgressRing size={20} stroke={3} progress={a.seconds / a.total} color={ORANGE} track={TRACK} />;
