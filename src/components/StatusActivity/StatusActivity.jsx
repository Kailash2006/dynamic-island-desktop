import { AnimatePresence, motion } from 'motion/react';
import { DrawCheck, Spinner } from '../shared/Primitives.jsx';
import { ArrowDownIcon, CloseIcon, InfoIcon, WarningIcon } from '../icons/Icons.jsx';
import { BLUE, GREEN, RED, YELLOW } from '../../utils/colors.js';

function StatusIcon({ variant }) {
  switch (variant) {
    case 'loading':
      return <Spinner size={20} />;
    case 'success':
      return (
        <span className="status__disc" style={{ background: 'rgba(48,209,88,0.18)' }}>
          <DrawCheck size={17} color={GREEN} />
        </span>
      );
    case 'warning':
      return <WarningIcon size={24} style={{ color: YELLOW }} />;
    case 'error':
      return (
        <span className="status__disc" style={{ background: RED, color: '#fff' }}>
          <CloseIcon size={14} />
        </span>
      );
    case 'update':
      return (
        <span className="status__disc" style={{ background: BLUE, color: '#fff' }}>
          <ArrowDownIcon size={14} />
        </span>
      );
    default:
      return <InfoIcon size={22} style={{ color: BLUE }} />;
  }
}

export function StatusBanner({ a }) {
  return (
    <div className="banner banner--status">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={a.variant}
          className="status__icon"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, x: a.variant === 'error' ? [0, -5, 5, -3, 3, 0] : 0 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ default: { type: 'spring', visualDuration: 0.35, bounce: 0.45 }, x: { duration: 0.45, delay: 0.1 } }}
        >
          <StatusIcon variant={a.variant} />
        </motion.span>
      </AnimatePresence>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={a.title}
          className="stack grow"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          <span className="t-title truncate">{a.title}</span>
          {a.subtitle ? <span className="t-sub truncate">{a.subtitle}</span> : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
