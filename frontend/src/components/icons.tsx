/* Line icons (24×24, stroke = currentColor), drawn to match the reference screens. */
import { ReactNode } from "react";

const S = ({ children, size = 22, sw = 1.9, fill = "none" }: { children: ReactNode; size?: number; sw?: number; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

type P = { size?: number; sw?: number };

export const Home = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.6 2.4 10.4c-.3.2-.4.5-.4.9V21c0 .6.4 1 1 1h6.2v-6.4c0-.6.4-1 1-1h3.6c.6 0 1 .4 1 1V22H21c.6 0 1-.4 1-1v-9.7c0-.4-.1-.7-.4-.9L12 2.6Z" /></svg>
);
export const BarsSolid = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><rect x="3" y="14" width="3.6" height="7" rx=".6" /><rect x="10.2" y="9" width="3.6" height="12" rx=".6" /><rect x="17.4" y="3" width="3.6" height="18" rx=".6" /></svg>
);
export const Bars4 = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><rect x="3" y="15" width="3" height="6" rx=".5" /><rect x="8" y="11" width="3" height="10" rx=".5" /><rect x="13" y="7" width="3" height="14" rx=".5" /><rect x="18" y="3" width="3" height="18" rx=".5" /></svg>
);
export const Doc = (p: P) => (
  <S {...p}><path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8Z" /><path d="M14 2.5V8h5.5" /><path d="M8.5 12.5h7M8.5 16h7M8.5 9h2" /></S>
);
export const Wave = (p: P) => (
  <S {...p}><path d="M2.5 15c2.5-7 5-7 7.5-1.5S15 21 17 13s3.5-2.5 4.5-1" /></S>
);
export const Gear = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fillRule="evenodd" d="M10.3 1.8h3.4l.6 2.9c.7.3 1.4.6 2 1.1l2.8-.9 1.7 2.9-2.2 2c.1.8.1 1.6 0 2.4l2.2 2-1.7 2.9-2.8-.9c-.6.5-1.3.9-2 1.1l-.6 2.9h-3.4l-.6-2.9c-.7-.3-1.4-.6-2-1.1l-2.8.9-1.7-2.9 2.2-2a7.5 7.5 0 0 1 0-2.4l-2.2-2 1.7-2.9 2.8.9c.6-.5 1.3-.9 2-1.1ZM12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z" /></svg>
);
export const Info = ({ size = 16 }: P) => (
  <S size={size} sw={1.8}><circle cx="12" cy="12" r="9.5" /><path d="M12 11v5.5" /><circle cx="12" cy="7.6" r=".5" fill="currentColor" /></S>
);
export const Building = (p: P) => (
  <S {...p} sw={1.7}><path d="M4 21V4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1V21" /><path d="M14 9h4.5a1 1 0 0 1 1 1V21" /><path d="M2.5 21h19M7.3 7.5h3.4M7.3 11h3.4M7.3 14.5h3.4M10 21v-3" /></S>
);
export const Calendar = (p: P) => (
  <S {...p} sw={1.7}><rect x="3.5" y="4.5" width="17" height="16" rx="2" /><path d="M3.5 9.5h17M8 2.8v3.4M16 2.8v3.4" /><path d="m9 14.6 2 2 4-4" /></S>
);
export const CalendarGrid = (p: P) => (
  <S {...p}><rect x="3.5" y="4.5" width="17" height="16" rx="2" /><path d="M3.5 9.5h17M8 2.8v3.4M16 2.8v3.4M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" /></S>
);
export const Chevron = ({ size = 18 }: P) => (
  <S size={size} sw={1.8}><path d="m6 9 6 6 6-6" /></S>
);
export const ChevronRight = ({ size = 18 }: P) => (
  <S size={size} sw={1.8}><path d="m9 6 6 6-6 6" /></S>
);
export const ArrowRight = ({ size = 16 }: P) => (
  <S size={size} sw={1.9}><path d="M4.5 12h15M13.5 6l6 6-6 6" /></S>
);
export const Wallet = (p: P) => (
  <S {...p}><path d="M18 7.5V5.2a1.2 1.2 0 0 0-1.4-1.2L5 6" /><rect x="3" y="6.5" width="18" height="13.5" rx="2.2" /><path d="M21 11h-4.5a2 2 0 0 0 0 4H21" /></S>
);
export const Shield = (p: P) => (
  <S {...p}><path d="M12 2.8 4.5 5.6v6c0 4.6 3.2 8.2 7.5 9.6 4.3-1.4 7.5-5 7.5-9.6v-6Z" /><path d="M12 8v5" /><circle cx="12" cy="16" r=".5" fill="currentColor" /></S>
);
export const Sparkle = ({ size = 30 }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" fill="currentColor"><path d="M13 4c.6 5.6 2.6 8.4 9 9.5-6.4 1.1-8.4 3.9-9 9.5-.6-5.6-2.6-8.4-9-9.5 6.4-1.1 8.4-3.9 9-9.5Z" /><path d="M24 2.5c.3 2.6 1.2 3.7 3.8 4.2-2.6.5-3.5 1.6-3.8 4.2-.3-2.6-1.2-3.7-3.8-4.2 2.6-.5 3.5-1.6 3.8-4.2Z" /><path d="M24.5 21c.3 2.2 1 3.1 3.3 3.5-2.3.4-3 1.3-3.3 3.5-.3-2.2-1-3.1-3.3-3.5 2.3-.4 3-1.3 3.3-3.5Z" /></svg>
);
export const User = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="12" cy="7.5" r="4.5" /><path d="M3.5 21.5c0-4.4 3.8-7.5 8.5-7.5s8.5 3.1 8.5 7.5Z" /></svg>
);
export const Leaf = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.5 3c-9 .2-15.4 3.5-16.8 10.4-.4 2 0 3.9.8 5.3L3 21.2l1.3.8 1.4-2.3c1.4.9 3.3 1.3 5.3.8C17.9 18.9 20.6 12 20.5 3Z" /><path d="M5.6 19.4C8 14 11.5 10 16.4 7" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" /></svg>
);
export const ThumbUp = ({ size = 18 }: P) => (
  <S size={size} sw={1.6}><path d="M7.5 10.5v10M7.5 10.5 11 3.2c1.6 0 2.6 1.1 2.4 2.7l-.6 3.8h5.4a2 2 0 0 1 2 2.4l-1.4 6.6a2 2 0 0 1-2 1.8H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" /></S>
);
export const ThumbDown = ({ size = 18 }: P) => (
  <S size={size} sw={1.6}><path d="M16.5 13.5v-10M16.5 13.5 13 20.8c-1.6 0-2.6-1.1-2.4-2.7l.6-3.8H5.8a2 2 0 0 1-2-2.4l1.4-6.6a2 2 0 0 1 2-1.8H20a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1Z" /></S>
);
export const Send = ({ size = 20 }: P) => (
  <S size={size} sw={1.9}><path d="M21.5 2.5 10.5 13.5M21.5 2.5 14.5 21.5l-4-8-8-4Z" /></S>
);
export const Search = ({ size = 20 }: P) => (
  <S size={size} sw={1.9}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.6-4.6" /></S>
);
export const Download = ({ size = 20 }: P) => (
  <S size={size} sw={1.9}><path d="M12 3.5v12M7 10.5l5 5 5-5M3.5 15.5v3a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-3" /></S>
);
export const FileIn = (p: P) => (
  <S {...p}><path d="M7 7.5V5a1.5 1.5 0 0 1 1.5-1.5H15l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 7 19v-2.5" /><path d="M3 12h9M9 8.8 12.2 12 9 15.2" /></S>
);
export const FileOut = (p: P) => (
  <S {...p}><path d="M15 7.5V5a1.5 1.5 0 0 0-1.5-1.5h-8A1.5 1.5 0 0 0 4 5v14a1.5 1.5 0 0 0 1.5 1.5h8A1.5 1.5 0 0 0 15 19v-2.5" /><path d="M10 12h11M17.8 8.8 21 12l-3.2 3.2" /></S>
);
export const Coins = (p: P) => (
  <S {...p}><ellipse cx="12" cy="6" rx="7.5" ry="3" /><path d="M4.5 6v4c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6M4.5 10v4c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-4M4.5 14v4c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-4" /></S>
);
export const ChartLine = (p: P) => (
  <S {...p}><path d="M3.5 3.5v17h17" /><path d="m7 9 3.5 4.5 3-2.5 5 6" /></S>
);
export const Calculator = (p: P) => (
  <S {...p} sw={1.7}><rect x="4" y="2.5" width="16" height="19" rx="2" /><path d="M7.5 6.5h9v3h-9zM8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01" strokeWidth="2.4" /></S>
);
export const Reset = (p: P) => (
  <S {...p}><path d="M4 12a8 8 0 1 0 2.5-5.8" /><path d="M4 3.5v4.5h4.5" /></S>
);
export const Save = (p: P) => (
  <S {...p}><path d="M5 3.5h11l3.5 3.5v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5Z" /><path d="M7.5 3.5v5h8v-5M7.5 20.5v-6h9v6" /></S>
);
export const Bulb = (p: P) => (
  <S {...p} sw={1.6}><path d="M9 17.5h6M9.8 21h4.4M12 3.5a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V17h5.2v-.7c0-.8.4-1.5 1-2A6 6 0 0 0 12 3.5Z" /><path d="M12 .8v.9M3.2 4.2l.7.7M20.8 4.2l-.7.7M1 11h1M22 11h1" /></S>
);
export const BulbFilled = ({ size = 26 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path fill="#f7b733" d="M12 2.5a7 7 0 0 0-4.2 12.6c.7.5 1.2 1.3 1.2 2.2v.7h6v-.7c0-.9.5-1.7 1.2-2.2A7 7 0 0 0 12 2.5Z" /><rect x="9" y="18.5" width="6" height="1.6" rx=".8" fill="#9aa1ad" /><rect x="10" y="21" width="4" height="1.5" rx=".75" fill="#9aa1ad" /></svg>
);
export const Bag = (p: P) => (
  <S {...p} sw={1.7}><path d="M6 8.5h12l-1 12H7Z" /><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" /><path d="M10 13.5h4" /></S>
);
export const ClipCalc = (p: P) => (
  <S {...p} sw={1.7}><rect x="4.5" y="4" width="15" height="17" rx="2" /><path d="M9 4V2.8h6V4M9.5 11.5h5M12 9v5M9.5 17h5" /></S>
);
export const ClipClock = (p: P) => (
  <S {...p} sw={1.7}><rect x="4.5" y="4" width="15" height="17" rx="2" /><path d="M9 4V2.8h6V4" /><circle cx="12" cy="13" r="3.6" /><path d="M12 11.3V13l1.2.8" /></S>
);
export const Cursor = (p: P) => (
  <S {...p} sw={1.7}><path d="m5 3.5 13.5 6.4-5.8 1.9-2.4 6Z" /><path d="m13 12.2 5.5 5.5" /></S>
);
export const ClipCheck = (p: P) => (
  <S {...p} sw={1.7}><rect x="4.5" y="4" width="15" height="17" rx="2" /><path d="M9 4V2.8h6V4" /><circle cx="12" cy="13" r="3.4" /><path d="M12 11.6v1.5" /></S>
);
export const Eye = ({ size = 18 }: P) => (
  <S size={size} sw={1.9}><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></S>
);
export const Dots = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
);
export const Plus = ({ size = 20 }: P) => (
  <S size={size} sw={2}><path d="M12 4.5v15M4.5 12h15" /></S>
);
export const Clock = (p: P) => (
  <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>
);
export const TrendUp = (p: P) => (
  <S {...p}><path d="m3 17 6-6 4 4 8-8" /></S>
);
export const ArrowUp = (p: P) => (
  <S {...p}><path d="M12 19.5v-15M6 10.5l6-6 6 6" /></S>
);
export const ArrowDown = (p: P) => (
  <S {...p}><path d="M12 4.5v15M6 13.5l6 6 6-6" /></S>
);
export const FilePdf = (p: P) => (
  <S {...p} sw={1.6}><path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8Z" /><path d="M14 2.5V8h5.5" /><path d="M8.5 17.5c2-1 4.5-5 3.5-7.5-.6-1.4-2 .3-.6 2.5 1.2 2 3.7 3.5 5.1 3-.8-1.5-4.2-1-8 2Z" /></S>
);
export const FileXls = (p: P) => (
  <S {...p} sw={1.6}><path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8Z" /><path d="M14 2.5V8h5.5" /><path d="m9 12 5 6M14 12l-5 6" /></S>
);
export const Refresh = ({ size = 18 }: P) => (
  <S size={size} sw={1.8}><path d="M20 12a8 8 0 1 1-2.4-5.7" /><path d="M20 3.5V8h-4.5" /></S>
);
export const FileBlank = (p: P) => (
  <S {...p} sw={1.5}><path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8Z" /><path d="M14 2.5V8h5.5" /></S>
);
export const Check = ({ size = 16 }: P) => (
  <S size={size} sw={2.6}><path d="m5 12.5 4.5 4.5L19 7.5" /></S>
);
