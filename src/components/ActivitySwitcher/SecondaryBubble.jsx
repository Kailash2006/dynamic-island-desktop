import { motion } from 'motion/react';
import { ACTIVITIES } from '../registry.js';
import { Glass, PAGE_W } from '../DynamicIsland/Glass.jsx';

// When two live activities run at once, the second one splits off into a
// small circle beside the island, like iOS. Click it to switch.
export function SecondaryBubble({ activity, count, onSelect, transition, reduce, glass, backdrop, islandWidth }) {
  const Minimal = ACTIVITIES[activity.type].Minimal;
  // Where the bubble sits in the page, so its glass lines up with the screen.
  const left = PAGE_W / 2 + islandWidth / 2 + 8;
  return (
    <motion.button
      data-hit
      className={`bubble ${glass ? 'bubble--glass' : ''}`}
      aria-label={`Switch to ${activity.type}`}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.3, x: -34 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.3, x: -34 }}
      transition={transition}
      whileHover={reduce ? undefined : { scale: 1.08 }}
      whileTap={reduce ? undefined : { scale: 0.92 }}
      onClick={onSelect}
    >
      {glass ? <Glass backdrop={backdrop} offsetX={-left} offsetY={8} transition={transition} lens={false} /> : null}
      <span className="bubble__icon">
        <Minimal a={activity} />
      </span>
      {count > 1 ? <span className="bubble__count num">{count}</span> : null}
    </motion.button>
  );
}
