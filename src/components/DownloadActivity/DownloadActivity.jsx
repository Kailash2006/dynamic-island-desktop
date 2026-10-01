import { download } from '../../services/activities/download.js';
import { ProgressRing } from '../shared/Primitives.jsx';
import { ArrowDownIcon, CloseIcon } from '../icons/Icons.jsx';
import { BLUE } from '../../utils/colors.js';

const progressOf = (a) => (a.totalMB ? a.receivedMB / a.totalMB : 0);

export function DownloadCompact({ a }) {
  return (
    <div className="compact">
      <div className="compact__lead">
        <span className="dot-icon" style={{ background: BLUE }}>
          <ArrowDownIcon size={13} />
        </span>
        <span className="compact__text truncate">{a.fileName}</span>
      </div>
      <ProgressRing size={18} stroke={2.8} progress={progressOf(a)} color={BLUE} track="rgba(10,132,255,0.25)" smooth={false} />
    </div>
  );
}

export function DownloadExpanded({ a }) {
  const p = progressOf(a);
  return (
    <div className="panel panel--download">
      <div className="row gap-12">
        <span className="tile" style={{ background: BLUE }}>
          <ArrowDownIcon size={20} />
        </span>
        <div className="stack grow">
          <span className="t-title truncate">{a.fileName}</span>
          <span className="t-sub num">
            Downloading, {Math.round(a.receivedMB)} of {a.totalMB} MB
          </span>
        </div>
        <button className="ibtn ibtn--gray ibtn--sm" onClick={download.cancel} aria-label="Cancel download">
          <CloseIcon size={13} />
        </button>
      </div>
      <div className="bar">
        <div className="bar__fill" style={{ transform: `scaleX(${p})`, background: BLUE }} />
      </div>
      <div className="row space-between t-sub num">
        <span>{a.speed.toFixed(1)} MB/s</span>
        <span>{Math.round(p * 100)}%</span>
      </div>
    </div>
  );
}

export const DownloadMinimal = ({ a }) => (
  <ProgressRing size={20} stroke={3} progress={progressOf(a)} color={BLUE} track="rgba(10,132,255,0.25)" smooth={false} />
);
