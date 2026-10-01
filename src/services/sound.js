// Short synthesized chimes, so the app ships no audio files.
let ctx = null;

function tone(freq, start, length, gain = 0.06) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0, start);
  amp.gain.linearRampToValueAtTime(gain, start + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(amp).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + length + 0.05);
}

export function chime(kind = 'done') {
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime + 0.01;
    if (kind === 'attention') {
      tone(880, t, 0.18);
      tone(880, t + 0.22, 0.18);
    } else {
      tone(784, t, 0.35);
      tone(1175, t + 0.12, 0.5);
    }
  } catch {
    /* audio is optional */
  }
}
