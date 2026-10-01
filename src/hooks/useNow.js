import { useEffect, useState } from 'react';

// Re-renders on an interval, only while the component is mounted and enabled.
export function useNow(interval = 1000, enabled = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval, enabled]);
  return now;
}
