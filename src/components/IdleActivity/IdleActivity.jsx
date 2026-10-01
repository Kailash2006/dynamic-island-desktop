import { useNow } from '../../hooks/useNow.js';
import { useBattery } from '../../services/activities/battery.js';
import { BatteryGlyph } from '../shared/Primitives.jsx';
import { GREEN } from '../../utils/colors.js';

// Hovering the empty island shows the time and battery.
export function IdleHover() {
  const now = useNow(1000);
  const battery = useBattery();
  const time = new Date(now).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const level = battery.level ?? 0;
  const color = battery.charging ? GREEN : level <= 0.2 ? '#ff453a' : '#fff';
  return (
    <div className="compact compact--idle">
      <span className="compact__value num">{time}</span>
      {battery.supported ? (
        <span className="compact__trail idle__battery" style={{ color }}>
          <span className="num">{Math.round(level * 100)}%</span>
          <BatteryGlyph level={level} color={color} charging={battery.charging} width={24} />
        </span>
      ) : null}
    </div>
  );
}
