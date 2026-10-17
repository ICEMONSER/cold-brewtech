/* ------------------------------------------------------------------
 * DEMO MODE DATASET — ข้อมูลสมมติ (assumption / illustrative only)
 * ------------------------------------------------------------------
 * Every number in this file is invented to demonstrate the product for a
 * fictional "บริษัทประกัน A". It is NOT real company data and is always shown
 * with the "ข้อมูลสมมติ" badge. Real mode never reads this file.
 *
 * The flows are internally consistent: one daily cash series drives every
 * chart, KPI, table and scenario so all screens reconcile.
 *   Opening 120 + premium receipts 15 + reinsurance recoveries 18
 *   − claim payments 85 − other payments 18 = closing 50   (million THB)
 * ------------------------------------------------------------------ */

export const DAYS = 30;
export const OPENING = 120;
export const DEFAULT_THRESHOLD = 40;

const spread = (total: number, from: number, to: number) => {
  const a = new Array(DAYS + 1).fill(0);
  const n = to - from + 1;
  for (let d = from; d <= to; d++) a[d] = total / n;
  return a;
};
const add = (...xs: number[][]) => xs[0].map((_, i) => xs.reduce((s, x) => s + x[i], 0));

// index 1..30 = day of month; index 0 unused
const perDay = (v: number, from: number, to: number) => spread(v * (to - from + 1), from, to);
const lump = (day: number, v: number) => { const a = new Array(DAYS + 1).fill(0); a[day] = v; return a; };
// Scheduled claims (upcoming payments table) + reserve-based daily claims → 85
export const claimPayments = add(lump(5, 12), lump(12, 25), lump(20, 18), perDay(1.35, 1, 20), perDay(0.3, 21, 30));
export const premiumReceipts = add(perDay(0.6, 1, 20), perDay(0.3, 21, 30)); // 15
export const reinsuranceRecoveries = perDay(3.6, 23, 27); // 18
export const otherPayments = perDay(0.9, 1, 20); // commissions, opex & tax, 18
// → cash bottoms at exactly 32 on day 20 (8 below the 40 floor) and closes at 50.

export type Flows = { claims: number[]; premiums: number[]; reins: number[]; other: number[] };
export const baseFlows: Flows = { claims: claimPayments, premiums: premiumReceipts, reins: reinsuranceRecoveries, other: otherPayments };

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);

export function cashSeries(f: Flows, opening = OPENING) {
  // index 0 = opening balance (start of day 1); index d = cash at END of day d.
  // Uncertainty band (illustrative) widens with sqrt(t).
  const out: { day: number; cash: number; low: number; high: number }[] = [{ day: 0, cash: opening, low: opening, high: opening }];
  let c = opening;
  for (let d = 1; d <= DAYS; d++) {
    c += f.premiums[d] + f.reins[d] - f.claims[d] - f.other[d];
    const half = 1.8 * Math.sqrt(d);
    out.push({ day: d, cash: c, low: c - half, high: c + half });
  }
  return out;
}

/** What-if (as in the reference screen: "จ่ายส่วนเพิ่มก่อนวันที่ 20"):
 *  extra claims = total claims × shock%, paid evenly over days 1–20;
 *  premium receipts AND reinsurance recoveries delayed by `delay` days (dropped if beyond day 30). */
export function scenarioFlows(shockPct: number, delay: number): Flows {
  const extra = claimPayments.reduce((a, b) => a + b, 0) * shockPct / 100;
  const claims = claimPayments.map((v, d) => v + (d >= 1 && d <= 20 ? extra / 20 : 0));
  const shift = (src: number[]) => { const a = new Array(DAYS + 1).fill(0); src.forEach((v, d) => { if (d >= 1 && d + delay <= DAYS) a[d + delay] += v; }); return a; };
  return { ...baseFlows, claims, premiums: shift(premiumReceipts), reins: shift(reinsuranceRecoveries) };
}

export function summarize(f: Flows, threshold: number) {
  const s = cashSeries(f);
  const trough = s.reduce((m, r) => (r.cash < m.cash ? r : m), s[0]);
  const breachDay = s.find((r) => r.cash < threshold)?.day ?? null;
  return {
    series: s, trough, breachDay,
    shortfall: Math.max(0, threshold - trough.cash),
    closing: s[DAYS].cash,
    receipts: sum(f.premiums), reins: sum(f.reins), claims: sum(f.claims), other: sum(f.other),
  };
}

export const WEEKS: [string, number, number][] = [["วันที่ 1–7", 1, 7], ["วันที่ 8–14", 8, 14], ["วันที่ 15–21", 15, 21], ["วันที่ 22–28", 22, 28], ["วันที่ 29–30", 29, 30]];
export const weekly = (f: Flows) => WEEKS.map(([label, a, b]) => {
  let inflow = 0, outflow = 0;
  for (let d = a; d <= b; d++) { inflow += f.premiums[d] + f.reins[d]; outflow += f.claims[d]; }
  return { label, inflow, outflow };
});

export const upcomingPayments = [
  { date: "5 พ.ย. 2569", type: "จ่ายเคลมรถยนต์ (Motor)", amount: 12_000_000, status: "รอดำเนินการ" },
  { date: "12 พ.ย. 2569", type: "จ่ายเคลมสุขภาพ (Health)", amount: 25_000_000, status: "รอดำเนินการ" },
  { date: "20 พ.ย. 2569", type: "จ่ายเคลมทรัพย์สิน (Property)", amount: 18_000_000, status: "รอดำเนินการ" },
];

export const claimsKpi = { open: 1240, expectedPay: 85, incurred: 75, combinedRatio: 105 };
export const claimsByLine = [
  { label: "รถยนต์", value: 42 }, { label: "สุขภาพ", value: 25 }, { label: "ทรัพย์สิน", value: 18 },
];
export const underwriting = { premium: 100, incurred: 75, expenses: 30 }; // result = 100 − 75 − 30 = −5
export const claimRows = [
  { id: "CLM-240001", line: "รถยนต์", amount: 850_000, due: "อีก 3 วัน", status: "อนุมัติแล้ว", tone: "ok" },
  { id: "CLM-240002", line: "สุขภาพ", amount: 620_000, due: "อีก 7 วัน", status: "อยู่ระหว่างพิจารณา", tone: "warn" },
  { id: "CLM-240003", line: "ทรัพย์สิน", amount: 480_000, due: "อีก 10 วัน", status: "สำรวจความเสียหาย", tone: "info" },
  { id: "CLM-240004", line: "รถยนต์", amount: 320_000, due: "อีก 14 วัน", status: "อนุมัติแล้ว", tone: "ok" },
  { id: "CLM-240005", line: "สุขภาพ", amount: 280_000, due: "อีก 20 วัน", status: "เอกสารเพิ่มเติม", tone: "bad" },
];

/** Fact sheet sent to the AI Concierge in demo mode — explicitly marked as assumptions. */
export function demoFacts(threshold: number) {
  const s = summarize(baseFlows, threshold);
  const r = (x: number) => Math.round(x * 10) / 10;
  return {
    dataset: "DEMO — ข้อมูลสมมติ (fictional insurer 'บริษัทประกัน A'); every figure is an assumption, not real data",
    unit: "million THB",
    opening_cash: OPENING, premium_receipts_30d: r(s.receipts), reinsurance_recoveries_30d: r(s.reins),
    claim_payments_30d: r(s.claims), other_payments_30d: r(s.other), closing_cash_day30: r(s.closing),
    min_cash: r(s.trough.cash), min_cash_day: s.trough.day, threshold, shortfall_vs_threshold: r(s.shortfall),
    weekly: weekly(baseFlows).map((w) => ({ ...w, inflow: r(w.inflow), outflow: r(w.outflow) })),
    claims_by_line: claimsByLine, upcoming_payments: upcomingPayments,
    underwriting: { ...underwriting, result: underwriting.premium - underwriting.incurred - underwriting.expenses, combined_ratio_pct: 105 },
  };
}
