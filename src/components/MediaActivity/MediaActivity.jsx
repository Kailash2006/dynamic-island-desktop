import { AnimatePresence, motion } from 'motion/react';
import { useNow } from '../../hooks/useNow.js';
import { mediaControls, mediaPosition } from '../../services/activities/media.js';
import { Equalizer, formatTrackTime } from '../shared/Primitives.jsx';
import { NextIcon, NoteIcon, PauseIcon, PlayIcon, PrevIcon } from '../icons/Icons.jsx';

const EQ_COLORS = ['#ff375f', '#ff9f0a'];

function Artwork({ a, size, radius }) {
  if (a.art) {
    return <img className="art art--img" src={a.art} alt="" width={size} height={size} style={{ borderRadius: radius }} draggable={false} />;
  }
  return (
    <span className="art art--empty" style={{ width: size, height: size, borderRadius: radius }} aria-hidden="true">
      <NoteIcon size={Math.round(size * 0.46)} />
    </span>
  );
}

export function MediaCompact({ a }) {
  return (
    <div className="compact">
      <div className="compact__lead">
        <Artwork a={a} size={22} radius={6} />
        <span className="compact__text truncate">{a.title}</span>
      </div>
      <Equalizer playing={a.playing} colors={EQ_COLORS} height={14} />
    </div>
  );
}

export function MediaExpanded({ a }) {
  const now = useNow(1000, a.playing);
  const position = mediaPosition(a, now);
  return (
    <div className="panel panel--music">
      <div className="music__head">
        <Artwork a={a} size={58} radius={14} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={a.key}
            className="stack music__meta"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <span className="t-title t-lg truncate">{a.title}</span>
            <span className="t-sub truncate">{a.artist || a.app}</span>
          </motion.div>
        </AnimatePresence>
        <span className="media__source">{a.app}</span>
      </div>

      {a.length ? (
        <div className="scrubber">
          <span className="scrubber__time num">{formatTrackTime(position)}</span>
          <div className="scrubber__track">
            <div className="scrubber__fill scrubber__fill--smooth" style={{ transform: `scaleX(${position / a.length})` }} />
          </div>
          <span className="scrubber__time num">-{formatTrackTime(a.length - position)}</span>
        </div>
      ) : (
        <div className="scrubber scrubber--empty">
          <Equalizer playing={a.playing} colors={EQ_COLORS} height={14} bars={9} />
        </div>
      )}

      <div className="music__controls">
        <button className="ctl" onClick={mediaControls.previous} aria-label="Previous track">
          <PrevIcon size={26} />
        </button>
        <button className="ctl ctl--main" onClick={mediaControls.toggle} aria-label={a.playing ? 'Pause' : 'Play'}>
          {a.playing ? <PauseIcon size={30} /> : <PlayIcon size={30} />}
        </button>
        <button className="ctl" onClick={mediaControls.next} aria-label="Next track" disabled={!a.canSkip}>
          <NextIcon size={26} />
        </button>
      </div>
    </div>
  );
}

export const MediaMinimal = ({ a }) => <Artwork a={a} size={20} radius={6} />;
