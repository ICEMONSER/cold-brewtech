/* Cash-flow forecast (deck: "Reason").
 *
 * Day 1 = today, cash = latest bank balance. Future days add:
 *   + expected receipts from the ledger (premium collections, reinsurance recoveries, …)
 *   − other expected payments from the ledger
 *   − claim payments:
 *       • scheduled payments from the Payment System, on their due date (deterministic)
 *       • open claims without a schedule: reserve × P(paid on that day | unpaid today), where
 *         P comes from the amount-weighted distribution of "report → payment" days learned
 *         from paid history, per line of business (pooled when a line has < 30 payments).
 * Uncertainty band (≈90%): ±1.645σ, σ² = Σ R² p(1−p) over unscheduled claims, widened
 * with the share of expected claim outflow realised so far.
 */
import { addDays, diffDays } from "./format";
import type { Claim, Datasets, Ledger } from "./types";

export type DayPoint = { day: number; date: string; cash: number; headroom: number; low: number; high: number; receipts: number; claims: number; other: number };
export type Contributor = { claim_id: string; line: string; status: string; amount: number; day: number; date: string; kind: "scheduled" | "expected"; reserve: number };
export type Forecast = {
  ok: boolean; missing: string[]; today: string; horizon: number; opening: number; balanceDate: string;
  series: DayPoint[]; trough: DayPoint; closing: number; threshold: number;
  breach: null | { day: number; date: string; cash: number; shortfall: number; earlyWarning: boolean };
  /** Liquidity Headroom(t) = เงินสดคาดการณ์(t) − เกณฑ์เงินสำรองขั้นต่ำ.
   *  Borrowing is needed when headroom turns negative: draw the day before it first goes below 0,
   *  amount = |min headroom| rounded up to ฿1M. */
  headroom: { min: number; minDay: number; minDate: string; firstNegDay: number | null; firstNegDate: string | null; borrowDay: number | null; need: number };
  totals: { receipts: number; claims: number; other: number; scheduledClaims: number; expectedClaims: number };
  byLine: Record<string, number>; contributors: Contributor[]; receiptItems: (Ledger & { day: number })[];
  sigma: number; openClaims: number;
};
export type ForecastOpts = { horizon: number; today: string; threshold: number; claimShock?: number; receiptDelay?: number };

const RECEIPT = new Set(["premium_receipt", "reinsurance_recovery", "other_receipt"]);
const PAYOUT = new Set(["expense", "other_payment"]);

export function lagModel(ds: Datasets) {
  const rep = new Map(ds.claims.map((c) => [c.claim_id, c] as const));
  const byLine = new Map<string, [number, number][]>();
  const pooled: [number, number][] = [];
  for (const p of ds.payments) {
    if (p.status !== "paid") continue;
    const c = rep.get(p.claim_id);
    if (!c) continue;
    const d = Math.max(0, diffDays(p.payment_date, c.reported_date));
    pooled.push([d, p.amount]);
    if (!byLine.has(c.line)) byLine.set(c.line, []);
    byLine.get(c.line)!.push([d, p.amount]);
  }
  const maxLag = pooled.reduce((m, [d]) => Math.max(m, d), 0);
  const MAX = Math.min(maxLag + 400, 2000);
  const ecdf = (rows: [number, number][]) => {
    const mass = new Float64Array(MAX + 2);
    let tot = 0;
    for (const [d, w] of rows) { mass[Math.min(d, MAX + 1)] += w; tot += w; }
    const cdf = new Float64Array(MAX + 2);
    let run = 0;
    for (let i = 0; i < mass.length; i++) { run += mass[i]; cdf[i] = tot ? run / tot : 1; }
    return cdf;
  };
  const pool = ecdf(pooled);
  const curves = new Map<string, Float64Array>();
  for (const [l, rows] of byLine) curves.set(l, rows.length >= 30 ? ecdf(rows) : pool);
  // median lag per line (for "expected date" of an unscheduled claim)
  const median = (cdf: Float64Array) => { for (let i = 0; i < cdf.length; i++) if (cdf[i] >= 0.5) return i; return cdf.length - 1; };
  return { get: (line: string) => curves.get(line) ?? pool, MAX, n: pooled.length, median: (line: string) => median(curves.get(line) ?? pool) };
}

export function reserveOf(ds: Datasets) {
  const res = new Map(ds.reserves.map((r) => [r.claim_id, r.reserve_amount] as const));
  const paid = new Map<string, number>();
  for (const p of ds.payments) if (p.status === "paid") paid.set(p.claim_id, (paid.get(p.claim_id) ?? 0) + p.amount);
  return (c: Claim) => res.get(c.claim_id) ?? Math.max(0, c.claimed_amount - (paid.get(c.claim_id) ?? 0));
}

export function forecast(ds: Datasets, o: ForecastOpts): Forecast {
  const H = o.horizon, today = o.today, shock = 1 + (o.claimShock ?? 0) / 100, delay = o.receiptDelay ?? 0;
  const missing: string[] = [];
  const balances = ds.ledger.filter((l) => l.type === "balance" && l.date <= today).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!balances.length) missing.push("ยอดเงินสดคงเหลือ (ledger: type=balance)");
  if (!ds.claims.length) missing.push("ข้อมูลเคลม (claims)");
  if (!ds.payments.some((p) => p.status === "paid")) missing.push("ประวัติการจ่าย (payments: status=paid)");
  const opening = balances.length ? balances[balances.length - 1].amount : 0;
  const balanceDate = balances.length ? balances[balances.length - 1].date : today;

  const receipts = new Float64Array(H + 1), other = new Float64Array(H + 1), claims = new Float64Array(H + 1);
  const receiptItems: (Ledger & { day: number })[] = [];
  for (const l of ds.ledger) {
    if (l.status !== "expected" || l.date <= today) continue;
    if (RECEIPT.has(l.type)) {
      const t = diffDays(l.date, today) + delay;
      if (t >= 1 && t < H) { receipts[t] += l.amount; receiptItems.push({ ...l, day: t + 1, date: addDays(l.date, delay) }); }
    } else if (PAYOUT.has(l.type)) {
      const t = diffDays(l.date, today);
      if (t >= 1 && t < H) other[t] += l.amount;
    }
  }

  const contributors: Contributor[] = [];
  const byLine: Record<string, number> = {};
  let scheduledTotal = 0, expectedTotal = 0, varTotal = 0, openClaims = 0;
  const scheduledBy = new Map<string, { date: string; amount: number }[]>();
  for (const p of ds.payments) if (p.status === "scheduled") {
    if (!scheduledBy.has(p.claim_id)) scheduledBy.set(p.claim_id, []);
    scheduledBy.get(p.claim_id)!.push({ date: p.payment_date, amount: p.amount });
  }
  const model = ds.payments.length ? lagModel(ds) : null;
  const R = reserveOf(ds);
  if (model) for (const c of ds.claims) {
    if (c.status === "closed") continue;
    openClaims++;
    const sched = scheduledBy.get(c.claim_id);
    if (sched) {
      for (const s of sched) {
        const t = Math.max(1, diffDays(s.date, today));
        if (t < H) {
          const amt = s.amount * shock;
          claims[t] += amt; scheduledTotal += amt; byLine[c.line] = (byLine[c.line] ?? 0) + amt;
          contributors.push({ claim_id: c.claim_id, line: c.line, status: c.status, amount: amt, day: t + 1, date: addDays(today, t), kind: "scheduled", reserve: R(c) });
        }
      }
      continue;
    }
    const res = R(c) * shock;
    if (res <= 0) continue;
    const F = model.get(c.line);
    const a = Math.min(Math.max(0, diffDays(today, c.reported_date)), model.MAX - H - 1);
    const surv = 1 - F[a];
    let tot = 0, peak = 0, peakT = 1;
    if (surv <= 1e-9) {
      // older than any observed settlement: assume it is paid within the horizon, spread evenly
      for (let t = 1; t < H; t++) claims[t] += res / (H - 1);
      tot = res; peakT = Math.round(H / 2);
    } else {
      for (let t = 1; t < H; t++) {
        const amt = (res * (F[a + t] - F[a + t - 1])) / surv;
        claims[t] += amt; tot += amt;
        if (amt > peak) { peak = amt; peakT = t; }
      }
      const p = (F[a + H - 1] - F[a]) / surv;
      varTotal += res * res * p * (1 - p);
    }
    expectedTotal += tot; byLine[c.line] = (byLine[c.line] ?? 0) + tot;
    if (tot > 0) contributors.push({ claim_id: c.claim_id, line: c.line, status: c.status, amount: tot, day: peakT + 1, date: addDays(today, peakT), kind: "expected", reserve: R(c) });
  }

  const sigma = Math.sqrt(varTotal);
  const claimSum = claims.reduce((a, b) => a + b, 0) || 1;
  const series: DayPoint[] = [];
  let cash = opening, cum = 0;
  for (let t = 0; t < H; t++) {
    if (t > 0) cash += receipts[t] - claims[t] - other[t];
    cum += claims[t];
    const band = 1.645 * sigma * Math.sqrt(cum / claimSum) + opening * 0.004 * Math.sqrt(t);
    series.push({ day: t + 1, date: addDays(today, t), cash, headroom: cash - o.threshold, low: cash - band, high: cash + band, receipts: receipts[t], claims: claims[t], other: other[t] });
  }
  const trough = series.reduce((m, p) => (p.cash < m.cash ? p : m), series[0]);
  const first = series.find((p) => p.cash < o.threshold);
  const early = series.find((p) => p.low < o.threshold);
  const breach = first
    ? { day: trough.cash < o.threshold ? trough.day : first.day, date: trough.cash < o.threshold ? trough.date : first.date, cash: trough.cash, shortfall: o.threshold - trough.cash, earlyWarning: false }
    : early ? { day: early.day, date: early.date, cash: early.cash, shortfall: 0, earlyWarning: true } : null;
  const neg = series.find((p) => p.headroom < 0);
  const headroom = {
    min: trough.headroom, minDay: trough.day, minDate: trough.date,
    firstNegDay: neg?.day ?? null, firstNegDate: neg?.date ?? null,
    borrowDay: neg ? Math.max(1, neg.day - 1) : null,
    need: trough.headroom < 0 ? Math.ceil(-trough.headroom / 1e6) * 1e6 : 0,
  };
  contributors.sort((a, b) => b.amount - a.amount);
  return {
    headroom,
    ok: missing.length === 0, missing, today, horizon: H, opening, balanceDate, series, trough, closing: series[H - 1].cash, threshold: o.threshold, breach,
    totals: { receipts: sum(receipts), claims: sum(claims), other: sum(other), scheduledClaims: scheduledTotal, expectedClaims: expectedTotal },
    byLine, contributors, receiptItems: receiptItems.sort((a, b) => a.day - b.day), sigma, openClaims,
  };
}
const sum = (a: Float64Array) => a.reduce((x, y) => x + y, 0);

/** Weekly buckets (days 1–7, 8–14, …) of receipts and claim payments. */
export function weekly(f: Forecast) {
  const out: { label: string; receipts: number; claims: number; other: number }[] = [];
  for (let s = 1; s <= f.horizon; s += 7) {
    const e = Math.min(s + 6, f.horizon);
    const pts = f.series.filter((p) => p.day >= s && p.day <= e);
    out.push({ label: `วันที่ ${s}–${e}`, receipts: pts.reduce((a, p) => a + p.receipts, 0), claims: pts.reduce((a, p) => a + p.claims, 0), other: pts.reduce((a, p) => a + p.other, 0) });
  }
  return out;
}
