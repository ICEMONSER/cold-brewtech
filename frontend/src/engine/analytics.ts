/* Claims & underwriting analytics (deck: "Understand" + "Remember"). */
import { addDays, diffDays, fmtM, lineLabel, mNum } from "./format";
import { lagModel, reserveOf, type Forecast } from "./forecast";
import type { Claim, Datasets } from "./types";

export type ClaimRow = Claim & { reserve: number; dueDate: string | null; dueIn: number | null; dueKind: "scheduled" | "expected" | null };

/** Open claims with their reserve and scheduled (or expected median) payment date. */
export function claimRows(ds: Datasets, today: string): ClaimRow[] {
  const R = reserveOf(ds);
  const sched = new Map<string, string>();
  for (const p of ds.payments) if (p.status === "scheduled") { const cur = sched.get(p.claim_id); if (!cur || p.payment_date < cur) sched.set(p.claim_id, p.payment_date); }
  const model = ds.payments.length ? lagModel(ds) : null;
  return ds.claims.filter((c) => c.status !== "closed").map((c) => {
    const s = sched.get(c.claim_id);
    if (s) return { ...c, reserve: R(c), dueDate: s, dueIn: Math.max(0, diffDays(s, today)), dueKind: "scheduled" as const };
    if (!model) return { ...c, reserve: R(c), dueDate: null, dueIn: null, dueKind: null };
    // expected date: when the conditional settlement probability reaches 50%
    const F = model.get(c.line), a = Math.min(Math.max(0, diffDays(today, c.reported_date)), model.MAX - 1), surv = 1 - F[a];
    let t = 1;
    if (surv > 1e-9) while (a + t < model.MAX && (F[a + t] - F[a]) / surv < 0.5) t++;
    return { ...c, reserve: R(c), dueDate: addDays(today, t), dueIn: t, dueKind: "expected" as const };
  });
}

/** Underwriting result over the last N days: earned premium − incurred claims − expenses. */
export function underwriting(ds: Datasets, today: string, days = 30) {
  const from = addDays(today, -days + 1);
  let earned = 0;
  for (const p of ds.policies) {
    const s = p.start_date > from ? p.start_date : from, e = p.end_date < today ? p.end_date : today;
    const ov = diffDays(e, s) + 1;
    const term = diffDays(p.end_date, p.start_date) + 1;
    if (ov > 0 && term > 0) earned += (p.premium * ov) / term;
  }
  const R = reserveOf(ds);
  const paidBy = new Map<string, number>();
  for (const p of ds.payments) if (p.status === "paid") paidBy.set(p.claim_id, (paidBy.get(p.claim_id) ?? 0) + p.amount);
  let incurred = 0;
  for (const c of ds.claims) if (c.loss_date >= from && c.loss_date <= today) incurred += (paidBy.get(c.claim_id) ?? 0) + (c.status === "closed" ? 0 : R(c));
  const expenses = ds.ledger.filter((l) => l.type === "expense" && l.status === "actual" && l.date >= from && l.date <= today).reduce((a, l) => a + l.amount, 0);
  const result = earned - incurred - expenses;
  return { earned, incurred, expenses, result, combined: earned ? (incurred + expenses) / earned : 0, lossRatio: earned ? incurred / earned : 0, from };
}

/** Same-window payments last year and in the last 30 days, for "Remember" comparisons. */
export function history(ds: Datasets, today: string, horizon: number) {
  const paidIn = (a: string, b: string) => ds.payments.filter((p) => p.status === "paid" && p.payment_date >= a && p.payment_date <= b).reduce((s, p) => s + p.amount, 0);
  const last30 = paidIn(addDays(today, -30), addDays(today, -1));
  const lastYear = paidIn(addDays(today, -365), addDays(today, -365 + horizon - 1));
  // monthly property claims by calendar month → seasonal peak
  const byMonth = new Array(12).fill(0);
  for (const c of ds.claims) if (c.line === "property") byMonth[Number(c.reported_date.slice(5, 7)) - 1]++;
  const avg = byMonth.reduce((a, b) => a + b, 0) / 12 || 1;
  const peaks = byMonth.map((n, i) => ({ m: i, x: n / avg })).filter((m) => m.x > 1.25).map((m) => m.m);
  return { last30, lastYear, peaks, byMonth };
}
const MONTH_TH = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
export const monthTh = (m: number) => MONTH_TH[m];

/** Insight cards for the claims page. */
export function insights(ds: Datasets, f: Forecast, today: string) {
  const out: { tone: "warn" | "info"; icon: "bars" | "coins" | "warn"; title: string; body: string }[] = [];
  const big = f.contributors.filter((c) => c.kind === "scheduled" && c.amount >= 10e6);
  const bigLine = big.length ? mostCommon(big.map((b) => b.line)) : null;
  const uw = underwriting(ds, today);
  if (big.length) {
    const days = big.map((b) => b.day);
    out.push({ tone: "warn", icon: "warn", title: `มีเคลม${lineLabel(bigLine!)}มูลค่าสูงที่กำหนดจ่ายในช่วง${Math.min(...days) > f.horizon / 2 ? "ครึ่งหลัง" : "นี้"}`,
      body: `เคลมที่มีมูลค่ามากกว่า 10 ล้านบาท จำนวน ${big.length} รายการ (รวม ${mNum(big.reduce((a, b) => a + b.amount, 0))} ล้านบาท) กำหนดจ่ายในช่วงวันที่ ${Math.min(...days)}–${Math.max(...days)} ซึ่งอาจกดดันกระแสเงินสดในระยะสั้น${uw.result < 0 ? ` แม้ผลรับประกันโดยรวมขาดทุน ${mNum(-uw.result)} ล้านบาท` : ""}` });
  }
  out.push({ tone: "info", icon: "bars", title: "ผลกำไรจากการรับประกัน (Profitability)",
    body: `${uw.result < 0 ? "ขาดทุน" : "กำไร"} ${mNum(Math.abs(uw.result))} ล้านบาท (Combined Ratio ${(uw.combined * 100).toFixed(1)}%) สะท้อนผลการรับประกันจากเบี้ยประกัน ค่าสินไหมเกิดขึ้น และค่าใช้จ่ายในการรับประกัน ใน 30 วันที่ผ่านมา` });
  out.push({ tone: "info", icon: "coins", title: "ผลกระทบต่อสภาพคล่อง (Liquidity)",
    body: `คาดการณ์จ่ายเคลมรวม ${mNum(f.totals.claims)} ล้านบาท ซึ่งเป็นกระแสเงินสดจ่าย อาจเกิดขึ้นคนละช่วงเวลากับการรับรู้ค่าสินไหม ${mNum(uw.incurred)} ล้านบาท` });
  return out;
}
const mostCommon = (a: string[]) => { const m = new Map<string, number>(); a.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1)); return [...m].sort((x, y) => y[1] - x[1])[0][0]; };

/** Text summary used by the forecast page's AI panel. */
export function forecastSummary(f: Forecast) {
  const wk = Math.ceil(f.trough.day / 7);
  const text = f.breach && !f.breach.earlyWarning
    ? `คาดว่าเงินสดจะลดลงต่อเนื่องถึงวันที่ ${f.trough.day} จากการจ่ายเคลมที่สูงในช่วงสัปดาห์ที่ 1–${wk} โดยเงินสดต่ำสุดที่ ${fmtM(f.trough.cash)} ซึ่งต่ำกว่าเกณฑ์เงินสำรองขั้นต่ำ ${fmtM(f.breach.shortfall)} หลังจากนั้นเงินสดจะ${f.closing > f.trough.cash ? "ทยอยเพิ่มขึ้นจากเงินรับคาดการณ์ และ" : ""}สิ้นงวดที่ ${fmtM(f.closing)}`
    : `เงินสดต่ำสุดอยู่ที่ ${fmtM(f.trough.cash)} ในวันที่ ${f.trough.day} ยังสูงกว่าเกณฑ์เงินสำรองขั้นต่ำ ${fmtM(f.threshold)} และสิ้นงวดที่ ${fmtM(f.closing)}`;
  const recs = f.breach && !f.breach.earlyWarning
    ? [`พิจารณาเลื่อนการจ่ายเคลมบางส่วนในช่วงสัปดาห์ที่ ${Math.max(1, wk - 1)}–${wk}`, `เตรียมวงเงินสำรองฉุกเฉินอย่างน้อย ${fmtM(Math.ceil(f.breach.shortfall / 1e6) * 1e6, 0)} เพื่อรักษาเกณฑ์สภาพคล่อง`]
    : ["ติดตามเคลมมูลค่าสูงที่กำหนดจ่ายใกล้วันที่เงินสดต่ำสุด", "ทบทวนกำหนดรับเงินจากผู้รับประกันภัยต่อให้ตรงเวลา"];
  return { text, recs };
}
