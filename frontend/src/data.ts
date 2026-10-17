/* Sample data (ข้อมูลสมมติ) shown on every screen, read off the reference designs. */
import type { Pt } from "./components/CashChart";

export const BASE: Pt[] = [
  [1, 120], [3.3, 112.5], [5.8, 98.6], [7.6, 86.7], [10.3, 67.7], [12.25, 60.7],
  [14.45, 49.5], [16.96, 40.4], [19.7, 32], [22, 36.8], [24.9, 42.1], [28.4, 48.4], [30, 50.5],
];

export const BAND = { color: "#f9e4e6", half: (d: number) => 5 + 3.5 * Math.sin((Math.PI * (d - 1)) / 29) };

export const LEGEND_MAIN = [
  { kind: "line-dot" as const, color: "#8b1a24", label: "คาดการณ์เงินสด" },
  { kind: "band" as const, color: "#f9e2e4", label: "ช่วงความไม่แน่นอน" },
  { kind: "thr" as const, color: "#6b7180", label: "เกณฑ์เงินสำรองขั้นต่ำ" },
];

// Overview "what if claims rise" slider: stop label → x position (px) on a 338px track
export const SHOCK_STOPS = [
  { label: "0%", at: 5 },
  { label: "5%", at: 66 },
  { label: "10%", at: 126 },
  { label: "20%", at: 232 },
  { label: "30%", at: 328 },
];
