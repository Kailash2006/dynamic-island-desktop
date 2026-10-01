// Small hand-drawn icons (24×24 grid) so the app has no icon dependency.

function Svg({ size = 16, children, style, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={style} {...rest}>
      {children}
    </svg>
  );
}

const stroke = { stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const PlayIcon = (p) => (
  <Svg {...p}>
    <path d="M7 4.6v14.8a1.1 1.1 0 0 0 1.66.94l12.1-7.4a1.1 1.1 0 0 0 0-1.88L8.66 3.66A1.1 1.1 0 0 0 7 4.6Z" fill="currentColor" />
  </Svg>
);

export const PauseIcon = (p) => (
  <Svg {...p}>
    <rect x="5.5" y="4" width="4.6" height="16" rx="1.5" fill="currentColor" />
    <rect x="13.9" y="4" width="4.6" height="16" rx="1.5" fill="currentColor" />
  </Svg>
);

export const NextIcon = (p) => (
  <Svg {...p}>
    <path
      d="M2.5 6.3v11.4a1 1 0 0 0 1.52.85L12 13.6v4.1a1 1 0 0 0 1.52.85l9-5.7a1 1 0 0 0 0-1.7l-9-5.7A1 1 0 0 0 12 6.3v4.1L4.02 5.45A1 1 0 0 0 2.5 6.3Z"
      fill="currentColor"
    />
  </Svg>
);

export const PrevIcon = (p) => <NextIcon {...p} style={{ transform: 'scaleX(-1)', ...p.style }} />;

export const BoltIcon = (p) => (
  <Svg {...p}>
    <path d="M13.6 2.2 4.9 13.1a.7.7 0 0 0 .55 1.13H11l-1.4 7.5 8.7-10.9a.7.7 0 0 0-.55-1.13H12.2l1.4-7.5Z" fill="currentColor" />
  </Svg>
);

export const PhoneIcon = (p) => (
  <Svg {...p}>
    <path
      d="M6.7 10.9a15.2 15.2 0 0 0 6.4 6.4l2.1-2.1a1 1 0 0 1 1.02-.24c1.12.37 2.32.57 3.55.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C11.5 21 3 12.5 3 4a1 1 0 0 1 1-1h3.46a1 1 0 0 1 1 1c0 1.24.2 2.43.57 3.55a1 1 0 0 1-.25 1.02L6.7 10.9Z"
      fill="currentColor"
    />
  </Svg>
);

export const HangUpIcon = (p) => <PhoneIcon {...p} style={{ transform: 'rotate(135deg)', ...p.style }} />;

export const MicOffIcon = (p) => (
  <Svg {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M4 4l16 16" {...stroke} />
  </Svg>
);

export const MicIcon = (p) => (
  <Svg {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" {...stroke} />
  </Svg>
);

export const CloseIcon = (p) => (
  <Svg {...p}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" {...stroke} strokeWidth={2.6} />
  </Svg>
);

export const ArrowDownIcon = (p) => (
  <Svg {...p}>
    <path d="M12 4v11.5m0 0-5-5m5 5 5-5M5.5 20h13" {...stroke} strokeWidth={2.4} />
  </Svg>
);

export const TimerIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="13.5" r="7.8" {...stroke} />
    <path d="M12 9.5v4.2l2.6 2M9.6 2.8h4.8" {...stroke} />
  </Svg>
);

export const ClipboardIcon = (p) => (
  <Svg {...p}>
    <rect x="5" y="4.5" width="14" height="16.5" rx="3" {...stroke} />
    <rect x="9" y="2.8" width="6" height="3.6" rx="1.2" fill="currentColor" />
    <path d="M9 12h6M9 15.5h4" {...stroke} />
  </Svg>
);

export const EyeOffIcon = (p) => (
  <Svg {...p}>
    <path d="M3 12s3.3-6 9-6 9 6 9 6-3.3 6-9 6-9-6-9-6Z" {...stroke} />
    <path d="M4 4l16 16" {...stroke} />
  </Svg>
);

export const InfoIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" {...stroke} />
    <path d="M12 11v5.5" {...stroke} />
    <circle cx="12" cy="7.6" r="1.3" fill="currentColor" />
  </Svg>
);

export const WarningIcon = (p) => (
  <Svg {...p}>
    <path d="M10.3 3.9 2.6 17.6A2 2 0 0 0 4.3 20.6h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" fill="currentColor" />
    <path d="M12 9v4.6" stroke="#000" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="12" cy="16.9" r="1.25" fill="#000" />
  </Svg>
);

// A generic eight-point spark used for the Claude Code activity.
export const SparkIcon = (p) => (
  <Svg {...p}>
    <path d="M12 2.5v19M2.5 12h19M5.3 5.3l13.4 13.4M18.7 5.3 5.3 18.7" {...stroke} strokeWidth={2.5} />
  </Svg>
);

export const NoteIcon = (p) => (
  <Svg {...p}>
    <path d="M9 18.5V5.8a1 1 0 0 1 .78-.98l9-2a1 1 0 0 1 1.22.98V16" {...stroke} />
    <circle cx="6.5" cy="18.5" r="2.7" fill="currentColor" />
    <circle cx="17.5" cy="16" r="2.7" fill="currentColor" />
  </Svg>
);

export const BellIcon = (p) => (
  <Svg {...p}>
    <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.6 1.8H4.4L6 16.5Z" fill="currentColor" />
    <path d="M10 20.5a2.2 2.2 0 0 0 4 0" {...stroke} />
  </Svg>
);

export const GearIcon = (p) => (
  <Svg {...p}>
    <path
      d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Zm8.2 4.6-1.9 1.1.2 2.2-2.1 1.6-1.9-1-1.9 1.3h-1.2l-1.9-1.3-1.9 1-2.1-1.6.2-2.2-1.9-1.1v-2.4l1.9-1.1-.2-2.2 2.1-1.6 1.9 1 1.9-1.3h1.2l1.9 1.3 1.9-1 2.1 1.6-.2 2.2 1.9 1.1v2.4Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </Svg>
);

export const ChevronLeftIcon = (p) => (
  <Svg {...p}>
    <path d="M14.5 5.5 8 12l6.5 6.5" {...stroke} strokeWidth={2.6} />
  </Svg>
);

export const OpenIcon = (p) => (
  <Svg {...p}>
    <path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" {...stroke} />
  </Svg>
);
