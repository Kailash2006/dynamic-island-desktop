import { island } from '../activityManager.js';

// A fully local demo player. Tracks are invented; artwork is a gradient.
export const TRACKS = [
  { title: 'Paper Lanterns', artist: 'Maya Soren', duration: 214, colors: ['#ff5e62', '#7b2ff7'] },
  { title: 'Night Shift', artist: 'The Low Hum', duration: 187, colors: ['#00c6ff', '#0f9b6c'] },
  { title: 'Monsoon Letters', artist: 'Arvind & the Tide', duration: 242, colors: ['#f9d423', '#ff4e50'] },
];

let index = 0;
let position = 0;
let playing = false;
let ticker = null;

function publish(focus = false) {
  island.show({ id: 'music', type: 'music', kind: 'live', track: TRACKS[index], index, position, playing, focus });
}

function tick() {
  position += 1;
  if (position >= TRACKS[index].duration) {
    index = (index + 1) % TRACKS.length;
    position = 0;
  }
  island.update('music', { track: TRACKS[index], index, position });
}

function setPlaying(next) {
  playing = next;
  clearInterval(ticker);
  ticker = playing ? setInterval(tick, 1000) : null;
}

export const music = {
  start() {
    if (!island.get('music')) {
      index = 0;
      position = 32;
    }
    setPlaying(true);
    publish(true);
  },
  toggle() {
    setPlaying(!playing);
    island.update('music', { playing });
  },
  next() {
    index = (index + 1) % TRACKS.length;
    position = 0;
    island.update('music', { track: TRACKS[index], index, position });
  },
  previous() {
    if (position > 3) position = 0;
    else index = (index - 1 + TRACKS.length) % TRACKS.length;
    position = 0;
    island.update('music', { track: TRACKS[index], index, position });
  },
  stop() {
    setPlaying(false);
    island.remove('music');
  },
};
