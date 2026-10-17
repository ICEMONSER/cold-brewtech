/* Dates are ISO "YYYY-MM-DD" strings handled in UTC so day arithmetic is exact. */
export const DAY = 86400000;

export function todayISO(): string {
  const d = new Date();
  return iso(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}
export const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const ms = (s: string) => Date.parse(s.slice(0, 10) + "T00:00:00Z");
export const addDays = (s: string, n: number) => iso(ms(s) + n * DAY);
export const diffDays = (a: string, b: string) => Math.round((ms(a) - ms(b)) / DAY); // a - b

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
export function thaiDate(s: string) {
  const d = new Date(ms(s));
  return `${d.getUTCDate()} ${TH_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`;
}
export function thaiDateTime(t: number) {
  const d = new Date(t);
  const hh = String(d.getHours()).padStart(2, "0"), mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}  ${hh}:${mm}`;
}
export const hhmm = (t: number) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
export function relTime(t: number) {
  const now = Date.now();
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  if (t >= startToday.getTime()) return `วันนี้ ${hhmm(t)}`;
  if (t >= startToday.getTime() - DAY) return `เมื่อวาน ${hhmm(t)}`;
  return `${Math.max(2, Math.round((now - t) / DAY))} วันที่แล้ว`;
}

/** Millions with up to 1 decimal: 85_000_000 → "85", 8_500_000 → "8.5" */
export function mNum(v: number, d = 1) {
  const x = v / 1e6;
  const r = Math.round(x * 10 ** d) / 10 ** d;
  return r.toLocaleString("en-US", { maximumFractionDigits: d });
}
export const fmtM = (v: number, d = 1) => `${v < 0 ? "-" : ""}฿${mNum(Math.abs(v), d)}M`;
export const fmtBaht = (v: number) => `฿${Math.round(v).toLocaleString("en-US")}`;
export const fmtInt = (v: number) => Math.round(v).toLocaleString("en-US");
export const fmtPct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;

export const LINE_TH: Record<string, string> = { motor: "รถยนต์", health: "สุขภาพ", property: "ทรัพย์สิน", marine: "ขนส่ง", misc: "เบ็ดเตล็ด" };
export const lineLabel = (l: string) => LINE_TH[l] ?? l;

export const STATUS_TH: Record<string, string> = { approved: "อนุมัติแล้ว", review: "อยู่ระหว่างพิจารณา", survey: "สำรวจความเสียหาย", docs: "เอกสารเพิ่มเติม", closed: "ปิดเคลมแล้ว" };
export const STATUS_TONE: Record<string, string> = { approved: "ok", review: "review", survey: "survey", docs: "doc", closed: "ready" };
