import { AnimatePresence, motion } from 'motion/react';
import { music } from '../../services/activities/music.js';
import { AlbumArt, Equalizer, formatTrackTime } from '../shared/Primitives.jsx';
import { NextIcon, PauseIcon, PlayIcon, PrevIcon } from '../icons/Icons.jsx';

export function MusicCompact({ a }) {
  return (
    <div className="compact">
      <div className="compact__lead">
        <AlbumArt colors={a.track.colors} size={22} radius={6} />
        <span className="compact__text truncate">{a.track.title}</span>
      </div>
      <Equalizer playing={a.playing} colors={a.track.colors} height={14} />
    </div>
  );
}

export function MusicExpanded({ a }) {
  const { track, position, playing } = a;
  return (
    <div className="panel panel--music">
      <div className="music__head">
        <AlbumArt colors={track.colors} size={58} radius={14} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={track.title}
            className="stack music__meta"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <span className="t-title t-lg truncate">{track.title}</span>
            <span className="t-sub truncate">{track.artist}</span>
          </motion.div>
        </AnimatePresence>
        <Equalizer playing={playing} colors={track.colors} height={20} />
      </div>

      <div className="scrubber">
        <span className="scrubber__time num">{formatTrackTime(position)}</span>
        <div className="scrubber__track">
          <div
            className={`scrubber__fill ${position === 0 ? '' : 'scrubber__fill--smooth'}`}
            style={{ transform: `scaleX(${position / track.duration})` }}
          />
        </div>
        <span className="scrubber__time num">-{formatTrackTime(track.duration - position)}</span>
      </div>

      <div className="music__controls">
        <button className="ctl" onClick={music.previous} aria-label="Previous track">
          <PrevIcon size={26} />
        </button>
        <button className="ctl ctl--main" onClick={music.toggle} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <PauseIcon size={30} /> : <PlayIcon size={30} />}
        </button>
        <button className="ctl" onClick={music.next} aria-label="Next track">
          <NextIcon size={26} />
        </button>
      </div>
    </div>
  );
}

export const MusicMinimal = ({ a }) => <AlbumArt colors={a.track.colors} size={20} radius={6} />;
