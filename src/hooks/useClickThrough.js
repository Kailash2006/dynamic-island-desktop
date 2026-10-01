import { useEffect } from 'react';
import { bridge } from '../services/bridge.js';

// The overlay window ignores the mouse except over elements marked data-hit,
// so the transparent area around the island never blocks your desktop.
export function useClickThrough() {
  useEffect(() => {
    let interactive = false;
    const set = (next) => {
      if (next === interactive) return;
      interactive = next;
      bridge.setInteractive(next);
    };
    const onMove = (event) => set(event.target instanceof Element && Boolean(event.target.closest('[data-hit]')));
    const onLeave = () => set(false);
    window.addEventListener('mousemove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      set(false);
    };
  }, []);
}
