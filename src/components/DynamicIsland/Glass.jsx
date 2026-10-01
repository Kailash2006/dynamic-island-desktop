import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

// The overlay page is always this many CSS pixels; the backdrop covers it.
export const PAGE_W = 600;
export const PAGE_H = 280;

// Turns the backdrop (wallpaper + captured app windows, topmost first) into
// stacked CSS backgrounds that line up with the screen.
function backgroundStyle(backdrop) {
  if (!backdrop) return null;
  const layers = (backdrop.layers ?? []).map((l) => ({ image: `url(${l.url})`, size: `${l.w}px ${l.h}px`, position: `${l.x}px ${l.y}px` }));
  if (backdrop.url) layers.push({ image: `url(${backdrop.url})`, size: `${PAGE_W}px ${PAGE_H}px`, position: '0 0' });
  if (!layers.length) return null;
  return {
    backgroundImage: layers.map((l) => l.image).join(', '),
    backgroundSize: layers.map((l) => l.size).join(', '),
    backgroundPosition: layers.map((l) => l.position).join(', '),
  };
}

// Keeps the previous backdrop under the new one while the new one fades in,
// so switching apps dissolves instead of snapping.
function useCrossfade(backdrop) {
  const counter = useRef(0);
  const [frames, setFrames] = useState(() => (backdrop ? [{ key: 0, style: backgroundStyle(backdrop) }] : []));
  useEffect(() => {
    const style = backgroundStyle(backdrop);
    if (!style) {
      setFrames([]);
      return;
    }
    counter.current += 1;
    const key = counter.current;
    setFrames((list) => [...list.slice(-1), { key, style }]);
  }, [backdrop]);
  return frames;
}

// Liquid glass, layer by layer:
//   base      – a dark fill for when nothing is available to refract
//   backdrop  – what's behind the island, blurred, saturated, slightly magnified
//   edge      – a thin band of the backdrop magnified more, so edges bend light
//   tint      – keeps white text readable on any background
//   sheen     – soft specular light from the top-left
//   rim       – a bright hairline that fades around the shape
// The backdrop layers counter the island's own offset so they stay pinned to
// the screen while the island moves.
export function Glass({ backdrop, offsetY = 0, offsetX = 0, transition, strong = false, lens = true, fade = true }) {
  const frames = useCrossfade(backdrop);
  const pinned = { x: offsetX, y: -offsetY };
  const layer = (frame, index, scale, extra = '') => (
    <motion.span
      key={frame.key}
      className={`glass__backdrop ${extra} ${fade && index > 0 ? 'glass__backdrop--fade-in' : ''}`}
      style={{ ...frame.style, scale }}
      initial={pinned}
      animate={pinned}
      transition={transition}
      aria-hidden="true"
    />
  );
  return (
    <>
      <span className="glass__base" aria-hidden="true" />
      {frames.map((frame, i) => layer(frame, i, lens ? 1.08 : 1))}
      {lens && frames.length ? (
        <span className="glass__edge" aria-hidden="true">
          {frames.map((frame, i) => layer(frame, i, 1.14, 'glass__backdrop--edge'))}
        </span>
      ) : null}
      <span className={`glass__tint ${strong ? 'glass__tint--strong' : ''} ${frames.length ? '' : 'glass__tint--solid'}`} aria-hidden="true" />
      <span className="glass__sheen" aria-hidden="true" />
      <span className="glass__rim" aria-hidden="true" />
    </>
  );
}
