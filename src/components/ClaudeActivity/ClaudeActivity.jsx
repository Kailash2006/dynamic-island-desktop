import { useNow } from '../../hooks/useNow.js';
import { DrawCheck, formatTrackTime } from '../shared/Primitives.jsx';
import { SparkIcon } from '../icons/Icons.jsx';
import { CLAUDE, GREEN, YELLOW } from '../../utils/colors.js';

function Glyph({ a, size = 16 }) {
  if (a.state === 'done') return <DrawCheck size={size + 2} color={GREEN} />;
  const color = a.state === 'waiting' ? YELLOW : CLAUDE;
  return (
    <span className={`claude-glyph ${a.state === 'waiting' ? 'claude-glyph--waiting' : 'claude-glyph--busy'}`} style={{ color }}>
      <SparkIcon size={size} />
    </span>
  );
}

function Elapsed({ a }) {
  const now = useNow(1000, !a.endedAt);
  const seconds = ((a.endedAt ?? now) - a.startedAt) / 1000;
  return <span className="num">{formatTrackTime(seconds)}</span>;
}

const headline = (a) => (a.state === 'waiting' ? 'Waiting for you' : a.detail);

export function ClaudeCompact({ a }) {
  return (
    <div className="compact">
      <div className="compact__lead">
        <Glyph a={a} />
        <span className="compact__text truncate">{headline(a)}</span>
      </div>
      <span className="compact__trail t-sub">
        <Elapsed a={a} />
      </span>
    </div>
  );
}

export function ClaudeExpanded({ a }) {
  return (
    <div className="panel panel--claude">
      <div className="row space-between">
        <span className="row gap-8">
          <Glyph a={a} size={15} />
          <span className="t-sub">Claude Code</span>
        </span>
        <span className="t-sub">
          <Elapsed a={a} />
        </span>
      </div>
      <span className="t-title t-lg truncate">{headline(a)}</span>
      {a.state === 'waiting' && a.message ? <span className="t-sub truncate">{a.message}</span> : null}
      <ul className="claude__steps">
        {(a.steps ?? []).map((step, i) => (
          <li key={`${step}-${i}`} className="truncate">
            <span className="claude__tick" aria-hidden="true">
              ✓
            </span>
            {step}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ClaudeBanner({ a }) {
  return (
    <div className="banner">
      <span className="tile tile--attention" aria-hidden="true">
        <SparkIcon size={20} />
      </span>
      <div className="stack grow">
        <span className="t-title">Claude needs your input</span>
        <span className="t-sub truncate">{a.message}</span>
      </div>
    </div>
  );
}

export const ClaudeMinimal = ({ a }) => <Glyph a={a} size={15} />;
