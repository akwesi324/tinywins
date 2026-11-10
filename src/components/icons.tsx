// Simple line icons (stroke follows the text colour).
type P = { className?: string };
const base = (className = "h-5 w-5") => ({ className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true });

export const IconToday = ({ className }: P) => (<svg {...base(className)}><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M8 2v4M16 2v4M3 10h18" /><path d="M9 15l2 2 4-4" /></svg>);
export const IconFocus = ({ className }: P) => (<svg {...base(className)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>);
export const IconProgress = ({ className }: P) => (<svg {...base(className)}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>);
export const IconSettings = ({ className }: P) => (<svg {...base(className)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>);
export const IconCheck = ({ className }: P) => (<svg {...base(className)}><path d="M20 6L9 17l-5-5" /></svg>);
export const IconClock = ({ className }: P) => (<svg {...base(className)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
export const IconFlame = ({ className }: P) => (<svg {...base(className)}><path d="M12 22c4 0 7-2.7 7-7 0-3-2-5.5-3.5-7-.4 1.8-1.4 3-3 3.5C13 8 12 5 9.5 2 9.8 5.5 5 8.5 5 15c0 4.3 3 7 7 7z" /></svg>);
export const IconStar = ({ className }: P) => (<svg {...base(className)}><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>);
export const IconBell = ({ className }: P) => (<svg {...base(className)}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>);
export const IconArrowRight = ({ className }: P) => (<svg {...base(className)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const IconArrowLeft = ({ className }: P) => (<svg {...base(className)}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>);
export const IconSnooze = ({ className }: P) => (<svg {...base(className)}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>);
export const IconPlay = ({ className }: P) => (<svg {...base(className)}><path d="M7 4l13 8-13 8z" /></svg>);
export const IconBattery = ({ className }: P) => (<svg {...base(className)}><rect x="2" y="7" width="17" height="10" rx="2" /><path d="M22 11v2M6 10v4" /></svg>);

export function Logo({ size = "h-9 w-9" }: { size?: string }) {
  return (
    <span className={`grid ${size} place-items-center rounded-xl bg-indigo-600 text-white shadow-sm`} aria-hidden>
      <IconCheck className="h-5 w-5" />
    </span>
  );
}
