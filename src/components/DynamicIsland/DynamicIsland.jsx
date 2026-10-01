import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react';
import { island } from '../../services/activityManager.js';
import { useIsland } from '../../hooks/useIsland.js';
import { bridge } from '../../services/bridge.js';
import { useSettings } from '../../services/settings.js';
import { backdropStore, clipboardHistory, notificationHistory, useStore } from '../../services/stores.js';
import { ACTIVITIES, IDLE_SIZE, PEEK_SIZE, cornersFor, isAttached, presentationFor, sizeFor } from '../registry.js';
import { IdleHover } from '../IdleActivity/IdleActivity.jsx';
import { HomeView, homeSize } from '../HomeActivity/HomeActivity.jsx';
import { SecondaryBubble } from '../ActivitySwitcher/SecondaryBubble.jsx';
import { Glass } from './Glass.jsx';
import './island.css';
import './glass.css';

const SPEED = { relaxed: 1.35, default: 1, snappy: 0.72 };
const FLOAT_Y = 8; // gap between the screen edge and a floating island
const GLASS_TINT = { 1: 1, 0.9: 0.72, 0.8: 0.48 };

function Content({ activity, mode, home }) {
  if (mode === 'home') return <HomeView view={home} />;
  if (mode === 'peek') return <IdleHover />;
  if (!activity) return null;
  const def = ACTIVITIES[activity.type];
  const View = mode === 'expanded' ? def.Expanded : mode === 'banner' ? def.Banner : def.Compact;
  return View ? <View a={activity} /> : null;
}

export default function DynamicIsland() {
  const { activities, activeId, expanded, home } = useIsland();
  const settings = useSettings();
  const backdrop = useStore(backdropStore);
  const clipCount = useStore(clipboardHistory).length;
  const alertCount = useStore(notificationHistory).length;
  const systemReduce = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [bouncer, animateBounce] = useAnimate();
  const collapseTimer = useRef(null);
  const lastWheel = useRef(0);
  const heldId = useRef(null);
  const previousMode = useRef(null);
  const islandRef = useRef(null);

  const active = activities.find((a) => a.id === activeId) ?? null;
  const mode = home ? 'home' : active ? presentationFor(active, expanded) : hovered ? 'peek' : 'idle';
  const size =
    mode === 'home'
      ? homeSize(home, { clipboard: clipCount, alerts: alertCount })
      : active
        ? sizeFor(active, mode)
        : mode === 'peek'
          ? PEEK_SIZE
          : IDLE_SIZE;
  const attached = isAttached(mode);
  const y = attached ? 0 : FLOAT_Y;
  const corners = cornersFor(size, mode);

  const others = activities.filter((a) => a.id !== activeId && a.kind !== 'alert' && ACTIVITIES[a.type]?.Minimal);
  const secondary = mode === 'compact' ? (others[others.length - 1] ?? null) : null;

  const reduce = settings.reduceMotion || systemReduce;
  const speed = SPEED[settings.animationSpeed] ?? 1;
  const glass = settings.material === 'glass';
  const growing = mode === 'expanded' || mode === 'banner' || mode === 'home';
  const shape = reduce
    ? { duration: 0.14, ease: 'easeOut' }
    : {
        type: 'spring',
        visualDuration: (growing ? 0.5 : attached ? 0.5 : 0.42) * speed,
        bounce: attached ? 0.12 : growing ? 0.28 : 0.2,
      };
  // Vertical position never overshoots, so the island can't bounce past the
  // top edge of the screen; the landing bounce below is a separate squash.
  const lift = reduce ? shape : { type: 'spring', visualDuration: 0.46 * speed, bounce: 0 };
  const islandTransition = reduce ? shape : { ...shape, y: lift };

  const enter = reduce
    ? { opacity: 1, transition: { duration: 0.12 } }
    : { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { delay: 0.07 * speed, duration: 0.3 * speed, ease: [0.2, 0.8, 0.2, 1] } };
  const from = reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, filter: 'blur(8px)' };
  const leave = reduce
    ? { opacity: 0, transition: { duration: 0.08 } }
    : { opacity: 0, scale: 0.94, filter: 'blur(6px)', transition: { duration: 0.14 * speed } };

  // Idle bounce. At startup the semicircle grows out of the top edge; when an
  // activity ends, the shape glides into the semicircle and then settles with
  // a soft squash-and-stretch, starting from its current size so nothing jumps.
  useEffect(() => {
    const prev = previousMode.current;
    previousMode.current = mode;
    const el = bouncer.current;
    if (!el) return;
    if (reduce) {
      animateBounce(el, { scaleX: 1, scaleY: 1 }, { duration: 0.01 });
      return;
    }
    if (!prev) {
      if (mode === 'idle') {
        animateBounce(
          el,
          { scaleY: [0, 1.14, 0.95, 1.02, 1], scaleX: [0.55, 1.06, 0.98, 1.005, 1] },
          { duration: 0.75 * speed, times: [0, 0.42, 0.68, 0.86, 1], ease: 'easeOut', delay: 0.25 },
        );
      } else {
        animateBounce(el, { scaleX: 1, scaleY: 1 }, { duration: 0.2 });
      }
      return;
    }
    if (mode === 'idle' && prev !== 'peek') {
      animateBounce(
        el,
        { scaleY: [1, 0.84, 1.09, 0.97, 1], scaleX: [1, 1.12, 0.95, 1.01, 1] },
        { duration: 0.62 * speed, times: [0, 0.3, 0.6, 0.82, 1], ease: 'easeInOut', delay: 0.32 * speed },
      );
    }
  }, [mode, reduce, speed, animateBounce, bouncer]);

  // Tell the main process how much glass is on screen, so it refreshes the
  // backdrop more often while the island is big.
  const sizeClass = growing ? 'big' : attached ? 'small' : 'compact';
  useEffect(() => {
    bridge.reportSize?.(sizeClass);
  }, [sizeClass]);

  // Collapse an expanded island (or the home view) shortly after the pointer leaves.
  useEffect(() => () => clearTimeout(collapseTimer.current), []);
  useEffect(() => {
    if (!expanded && !home) clearTimeout(collapseTimer.current);
  }, [expanded, home]);

  // While hovered, the visible activity's auto-dismiss is paused.
  const activeKey = active?.id ?? null;
  useEffect(() => {
    const next = hovered ? activeKey : null;
    if (heldId.current === next) return;
    if (heldId.current) island.release(heldId.current);
    if (next) island.hold(next);
    heldId.current = next;
  }, [hovered, activeKey]);

  // If the island shrinks away from a pointer that isn't moving, the browser
  // updates :hover but sends no pointerleave. Check while we think it's hovered.
  useEffect(() => {
    if (!hovered) return undefined;
    const id = setInterval(() => {
      if (islandRef.current && !islandRef.current.matches(':hover')) onPointerLeave();
    }, 400);
    return () => clearInterval(id);
  });

  const onPointerEnter = () => {
    setHovered(true);
    clearTimeout(collapseTimer.current);
  };

  const onPointerLeave = () => {
    setHovered(false);
    if (expanded || home) {
      collapseTimer.current = setTimeout(() => {
        island.setExpanded(false);
        island.closeHome();
      }, 650);
    }
  };

  const onClick = (event) => {
    if (event.target.closest('button')) return;
    if (mode === 'idle' || mode === 'peek') island.openHome('main');
    else if (mode === 'home') island.closeHome();
    else if (mode === 'compact') island.setExpanded(true);
    else if (mode === 'expanded') island.setExpanded(false);
    else if (mode === 'banner') {
      const handler = ACTIVITIES[active.type]?.onBannerClick;
      if (handler) handler(active);
      else island.remove(active.id);
    }
  };

  // Right-click opens the feature menu, even while something is running.
  const onContextMenu = (event) => {
    event.preventDefault();
    if (mode === 'home') island.closeHome();
    else island.openHome('main');
  };

  const onWheel = (event) => {
    const now = Date.now();
    if (now - lastWheel.current < 350 || Math.abs(event.deltaY) < 4) return;
    lastWheel.current = now;
    island.cycle(event.deltaY > 0 ? 1 : -1);
  };

  if (!active && !home && !settings.showIdlePill) return null;

  const contentKey = mode === 'home' ? `home:${home}` : active ? `${active.id}:${mode}` : mode;
  const hoverScale = mode === 'compact' && !reduce ? { scale: 1.035 } : undefined;

  return (
    <div
      className={`stage ${glass ? 'stage--glass' : ''}`}
      // Black fades the whole island; glass stays solid and only thins its tint,
      // so apps behind never show through unblurred.
      style={glass ? { '--glass-k': GLASS_TINT[settings.opacity] ?? 1 } : { opacity: settings.opacity }}
    >
      {/* The anchor carries the animated width so the side bubble can follow the island's edge. */}
      <motion.div className="island-anchor" initial={false} animate={{ width: size.w }} transition={shape}>
        <motion.div ref={bouncer} className="island-bouncer" initial={reduce ? false : { scaleY: 0, scaleX: 0.55 }}>
          <motion.div
            ref={islandRef}
            data-hit
            role="button"
            aria-label={active ? `${active.type} activity` : 'Dynamic Island. Click to see features.'}
            className={`island island--${mode} ${glass ? 'island--glass' : 'island--black'}`}
            initial={{ height: size.h, y, ...corners }}
            animate={{ height: size.h, y, ...corners }}
            transition={islandTransition}
            whileHover={hoverScale}
            whileTap={mode === 'compact' || attached ? (reduce ? undefined : { scale: 0.95 }) : undefined}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
            onClick={onClick}
            onContextMenu={onContextMenu}
            onWheel={onWheel}
          >
            {glass ? <Glass backdrop={backdrop} offsetY={y} transition={lift} strong={growing} fade={!reduce} /> : null}
            <AnimatePresence initial={false}>
              <motion.div
                key={contentKey}
                className="island__content"
                style={{ width: size.w, height: size.h, marginLeft: -size.w / 2 }}
                initial={from}
                animate={enter}
                exit={leave}
              >
                <Content activity={active} mode={mode} home={home} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>

        <AnimatePresence>
          {secondary ? (
            <SecondaryBubble
              key="secondary"
              activity={secondary}
              count={others.length}
              transition={shape}
              reduce={reduce}
              glass={glass}
              backdrop={backdrop}
              islandWidth={size.w}
              onSelect={() => island.focus(secondary.id)}
            />
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
