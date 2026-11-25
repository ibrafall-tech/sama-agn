type P = { size?: number };
const base = (size: number) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true });

export const IconBowl = ({ size = 24 }: P) => (
  <svg {...base(size)}><path d="M3 11h18a9 9 0 0 1-18 0Z" /><path d="M8 7c0-1 1-1.5 1-2.5M12 7c0-1 1-1.5 1-2.5M16 7c0-1 1-1.5 1-2.5" /></svg>
);
export const IconSheet = ({ size = 24 }: P) => (
  <svg {...base(size)}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>
);
export const IconChef = ({ size = 24 }: P) => (
  <svg {...base(size)}><path d="M7 14a4 4 0 1 1 1.5-7.7A4 4 0 0 1 16 5a4 4 0 1 1 1 9" /><path d="M7 14v6h10v-6" /><path d="M10 17h4" /></svg>
);
export const IconCheck = ({ size = 20 }: P) => (
  <svg {...base(size)} strokeWidth={3}><path d="m5 12 5 5 9-10" /></svg>
);
export const IconX = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconShare = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M12 3v12M7 8l5-5 5 5" /></svg>
);
export const IconCopy = ({ size = 20 }: P) => (
  <svg {...base(size)}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a1 1 0 0 1 1-1h10" /></svg>
);
export const IconPrint = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M7 9V3h10v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" /></svg>
);
export const IconLock = ({ size = 20 }: P) => (
  <svg {...base(size)}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
);
export const IconPlus = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M12 5v14M5 12h14" /></svg>
);
/** iOS "Share" glyph, used in the iPhone install hint. */
export const IconShareIos = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M12 3v12M8 7l4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" /></svg>
);
export const IconClock =({ size = 16 }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
