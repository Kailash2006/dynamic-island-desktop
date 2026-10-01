// A tiny store for everything the island shows.
//
//   island.show({ type: 'download', title: 'Downloading', progress: 0.65 })
//   island.show({ type: 'notification', sender: 'Mail', body: '…', duration: 5000 })
//
// Each activity has an id (defaults to its type, so there is one timer, one
// music session…). `duration` makes it disappear on its own; hovering the
// island pauses that countdown.

const listeners = new Set();
const expiries = new Map();

// home: null, or which feature view is open when the island is clicked with
// nothing running ('main' | 'timer' | 'music' | 'clipboard' | 'alerts').
let state = { activities: [], activeId: null, expanded: false, home: null };

function emit() {
  for (const listener of listeners) listener();
}

function setState(patch) {
  state = { ...state, ...patch };
  emit();
}

function clearExpiry(id) {
  const entry = expiries.get(id);
  if (entry) clearTimeout(entry.timeout);
  expiries.delete(id);
}

function scheduleExpiry(id, ms) {
  clearExpiry(id);
  expiries.set(id, {
    timeout: setTimeout(() => island.remove(id), ms),
    deadline: Date.now() + ms,
    held: false,
  });
}

function pickNextActive(activities) {
  // Prefer the most recent live activity (music, timer…) over alerts.
  const live = activities.filter((a) => a.kind !== 'alert');
  const pool = live.length ? live : activities;
  return pool.length ? pool[pool.length - 1].id : null;
}

export const island = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getState: () => state,

  debugExpiries: () => [...expiries].map(([id, e]) => ({ id, held: e.held, left: Math.round(e.deadline - Date.now()) })),

  get(id) {
    return state.activities.find((a) => a.id === id) ?? null;
  },

  show(input) {
    const { duration, focus = true, ...data } = input;
    const id = data.id ?? data.type;
    const now = Date.now();
    const existing = state.activities.find((a) => a.id === id);
    const next = existing
      ? { ...existing, ...data, id, updatedAt: now }
      : { kind: 'live', ...data, id, createdAt: now, updatedAt: now };

    const activities = existing ? state.activities.map((a) => (a.id === id ? next : a)) : [...state.activities, next];
    const patch = { activities };
    if (focus || !state.activeId) {
      if (state.activeId !== id) patch.expanded = false;
      patch.activeId = id;
      patch.home = null;
    }
    setState(patch);

    if (duration) scheduleExpiry(id, duration);
    else if (existing) clearExpiry(id);
    return id;
  },

  update(id, patch) {
    if (!state.activities.some((a) => a.id === id)) return;
    setState({
      activities: state.activities.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a)),
    });
  },

  expireIn(id, ms) {
    if (state.activities.some((a) => a.id === id)) scheduleExpiry(id, ms);
  },

  remove(id) {
    if (!state.activities.some((a) => a.id === id)) return;
    clearExpiry(id);
    const activities = state.activities.filter((a) => a.id !== id);
    const wasActive = state.activeId === id;
    setState({
      activities,
      activeId: wasActive ? pickNextActive(activities) : state.activeId,
      expanded: wasActive ? false : state.expanded,
    });
  },

  focus(id, expanded = false) {
    if (state.activities.some((a) => a.id === id)) setState({ activeId: id, expanded, home: null });
  },

  openHome(view = 'main') {
    setState({ home: view, expanded: false });
  },

  closeHome() {
    if (state.home) setState({ home: null });
  },

  cycle(direction = 1) {
    const live = state.activities.filter((a) => a.kind !== 'alert');
    if (live.length < 2) return;
    const index = Math.max(0, live.findIndex((a) => a.id === state.activeId));
    const next = live[(index + direction + live.length) % live.length];
    setState({ activeId: next.id, expanded: false });
  },

  setExpanded(expanded) {
    if (state.expanded !== expanded) setState({ expanded });
  },

  hold(id) {
    const entry = expiries.get(id);
    if (!entry || entry.held) return;
    clearTimeout(entry.timeout);
    entry.held = true;
    entry.remaining = Math.max(1500, entry.deadline - Date.now());
  },

  release(id) {
    const entry = expiries.get(id);
    if (entry?.held) scheduleExpiry(id, entry.remaining);
  },

  clear() {
    for (const id of expiries.keys()) clearExpiry(id);
    setState({ activities: [], activeId: null, expanded: false, home: null });
  },
};

// Convenience export matching the original brief's API.
export const showActivity = (activity) => island.show(activity);
