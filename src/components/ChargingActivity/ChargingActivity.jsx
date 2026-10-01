import { motion } from 'motion/react';
import { BatteryGlyph } from '../shared/Primitives.jsx';
import { BoltIcon } from '../icons/Icons.jsx';
import { GREEN } from '../../utils/colors.js';

const percent = (level) => Math.round((level ?? 0) * 100);

export function ChargingCompact({ a }) {
  return (
    <div className="compact">
      <span className="compact__lead charging__label">
        <BoltIcon size={14} />
        Charging
      </span>
      <span className="compact__trail charging__label">
        <span className="num">{percent(a.level)}%</span>
        <BatteryGlyph level={a.level} color={GREEN} charging />
      </span>
    </div>
  );
}

export function ChargingExpanded({ a }) {
  const pct = percent(a.level);
  return (
    <div className="panel panel--charging">
      <div className="bigbatt" aria-hidden="true">
        <motion.div
          className="bigbatt__fill"
          initial={{ width: '0%' }}
          animate={{ width: `${Math.max(pct, 6)}%` }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        />
        <BoltIcon className="bigbatt__bolt" size={24} />
        <span className="bigbatt__cap" />
      </div>
      <div className="stack">
        <span className="charging__pct num">{pct}%</span>
        <span className="t-sub">Charging</span>
      </div>
    </div>
  );
}

export const ChargingMinimal = () => <BoltIcon size={16} style={{ color: GREEN }} />;
