import { motion } from 'motion/react';
import './primitives.css';

export function ProgressRing({ size = 18, stroke = 2.6, progress = 0, color = '#fff', track = 'rgba(255,255,255,0.18)', smooth = true, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <span className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          className={smooth ? 'ring__value ring__value--smooth' : 'ring__value'}
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children ? <span className="ring__content">{children}</span> : null}
    </span>
  );
}

export function Equalizer({ playing, colors = ['#fff', '#fff'], bars = 5, height = 16 }) {
  return (
    <span className={`eq ${playing ? 'eq--playing' : ''}`} style={{ height, '--eq-a': colors[0], '--eq-b': colors[1] }} aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className="eq__bar" style={{ animationDelay: `${-i * 0.23}s`, animationDuration: `${0.72 + (i % 3) * 0.17}s` }} />
      ))}
    </span>
  );
}

export function AlbumArt({ colors, size = 24, radius = 7 }) {
  return (
    <span
      className="art"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `radial-gradient(120% 90% at 20% 15%, rgba(255,255,255,.35), transparent 45%), linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
      }}
      aria-hidden="true"
    />
  );
}

export function BatteryGlyph({ level = 1, color = '#fff', charging = false, width = 27 }) {
  const inner = Math.max(2, Math.round(20 * level));
  return (
    <svg width={width} height={(width * 13) / 27} viewBox="0 0 27 13" aria-hidden="true">
      <rect x="0.6" y="0.6" width="23" height="11.8" rx="3.6" fill="none" stroke={color} strokeOpacity="0.45" strokeWidth="1.2" />
      <rect x="2.2" y="2.2" width={inner} height="8.6" rx="2" fill={color} />
      <path d="M25.2 4.6v3.8c.9-.3 1.4-1 1.4-1.9s-.5-1.6-1.4-1.9Z" fill={color} fillOpacity="0.45" />
      {charging ? <path d="M13.4 2.4 9.6 7.2h2.6l-.8 3.4 3.9-4.9h-2.6l.7-3.3Z" fill="#000" /> : null}
    </svg>
  );
}

// Animated check mark that draws itself.
export function DrawCheck({ size = 18, color = '#30d158', strokeWidth = 3 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <motion.path
        d="M5 12.5 10 17.5 19.5 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.45, ease: [0.3, 0.9, 0.3, 1], delay: 0.08 }}
      />
    </svg>
  );
}

export function Spinner({ size = 18, color = '#fff' }) {
  return (
    <span className="spinner" style={{ width: size, height: size, color }} aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} style={{ transform: `rotate(${i * 45}deg)`, animationDelay: `${(i - 8) * 0.1}s` }} />
      ))}
    </span>
  );
}

export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${String(m).padStart(2, '0')}:${sec}`;
}

export function formatTrackTime(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
