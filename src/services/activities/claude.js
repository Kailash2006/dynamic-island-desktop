import { island } from '../activityManager.js';
import { chime } from '../sound.js';

// Turns Claude Code hook events into a live activity.
// Hooks POST their JSON to http://127.0.0.1:47821/claude (see README).

const basename = (p) => (p ? p.split(/[\\/]/).pop() : '');

function describe({ tool, file, command, pattern, description }) {
  switch (tool) {
    case 'Edit':
    case 'MultiEdit':
      return `Editing ${basename(file)}`;
    case 'Write':
      return `Writing ${basename(file)}`;
    case 'Read':
      return `Reading ${basename(file)}`;
    case 'NotebookEdit':
      return `Editing ${basename(file)}`;
    case 'Bash': {
      const cmd = (command ?? '').trim().split(/\s+/).slice(0, 3).join(' ');
      return description ? description : `Running ${cmd}`;
    }
    case 'Grep':
    case 'Glob':
      return pattern ? `Searching for ${pattern}` : 'Searching files';
    case 'WebFetch':
    case 'WebSearch':
      return 'Searching the web';
    case 'Task':
      return 'Working with a subagent';
    case 'TodoWrite':
      return 'Updating the plan';
    default:
      return tool ? `Using ${tool.replace(/^mcp__/, '').replace(/__/g, ' ')}` : 'Working';
  }
}

function ensure(patch) {
  const current = island.get('claude');
  if (!current) {
    island.show({ id: 'claude', type: 'claude', kind: 'live', state: 'working', detail: 'Working', startedAt: Date.now(), steps: [], ...patch });
    return;
  }
  island.update('claude', patch);
}

export function handleClaudeEvent(evt) {
  const current = island.get('claude');
  switch (evt.event) {
    case 'UserPromptSubmit':
      island.show({ id: 'claude', type: 'claude', kind: 'live', state: 'thinking', detail: 'Thinking', startedAt: Date.now(), steps: [], acknowledged: false });
      break;
    case 'PreToolUse':
      ensure({ state: 'working', detail: describe(evt), acknowledged: false });
      break;
    case 'PostToolUse': {
      const steps = [...(current?.steps ?? []), describe(evt)].slice(-3);
      ensure({ steps, state: 'working' });
      break;
    }
    case 'Notification':
      ensure({ state: 'waiting', message: evt.message ?? 'Claude is waiting for you', acknowledged: false });
      island.focus('claude');
      chime('attention');
      break;
    case 'Stop':
      if (!current) return;
      island.show({ id: 'claude', state: 'done', detail: 'Finished', endedAt: Date.now(), duration: 9000 });
      chime('done');
      break;
    case 'SessionEnd':
      island.remove('claude');
      break;
    default:
  }
}

// Replays a realistic sequence so the activity can be shown without Claude Code.
export function runClaudeDemo() {
  const steps = [
    [0, { event: 'UserPromptSubmit' }],
    [1400, { event: 'PreToolUse', tool: 'Read', file: 'src/App.jsx' }],
    [2400, { event: 'PostToolUse', tool: 'Read', file: 'src/App.jsx' }],
    [2600, { event: 'PreToolUse', tool: 'Edit', file: 'src/components/DynamicIsland/DynamicIsland.jsx' }],
    [4600, { event: 'PostToolUse', tool: 'Edit', file: 'src/components/DynamicIsland/DynamicIsland.jsx' }],
    [4800, { event: 'PreToolUse', tool: 'Bash', command: 'npm run build', description: 'Building the app' }],
    [6800, { event: 'Notification', message: 'Claude needs your permission to use Bash' }],
    [9800, { event: 'PostToolUse', tool: 'Bash', command: 'npm run build', description: 'Building the app' }],
    [10200, { event: 'Stop' }],
  ];
  for (const [delay, evt] of steps) setTimeout(() => handleClaudeEvent(evt), delay);
}
