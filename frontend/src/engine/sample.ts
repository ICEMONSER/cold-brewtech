/* Sample data (ข้อมูลจำลอง) calibrated to Bangkok Insurance PCL (BKI) FY2024 public figures.
 * Records are synthetic; their monthly totals match BKI's annual figures ÷ 12. The internal
 * splits that are not published are assumptions (marked ASSUMED). Sources: BKI 56-1 One Report
 * 2024, S&P Global Ratings report (27 Nov 2025), BKIH balance sheet FY2024. Dates are relative to
 * today so the demo always shows a live 30-day window. */
import { addDays, diffDays } from "./format";
import { forecast } from "./forecast";
import { underwriting } from "./analytics";
import type { Claim, Datasets, Ledger, Payment, Policy, Reserve } from "./types";

export const BKI2024 = {
  gwp: 31_736.1e6,            // เบี้ยประกันภัยรับรวม ปี 2567 (56-1 One Report)
  netUwProfit: 1_871.0e6,     // กำไรสุทธิจากการรับประกันภัย (หลังค่าใช้จ่ายดำเนินงาน)
  combinedRatio: 0.901,       // Net combined ratio 2024 (S&P, Nov 2025)
  cash: 789.53e6,             // เงินสดและรายการเทียบเท่าเงินสด 31 ธ.ค. 2567 (งบรวม BKIH)
  claims: 87_937 + 170_090,   // จำนวนเคลม ปี 2567 (สดที่เกิดเหตุ + แห้ง)
  netProfit: 3_059.8e6,
  car: 1.781,                 // CAR ณ 30 ก.ย. 2567
  mix: { motor: 0.46, property: 0.23, health: 0.14, misc: 0.17 }, // สัดส่วนเบี้ยตรง (S&P, 1H2025 ใกล้เคียงที่สุดที่เปิดเผย)
};
// Derived monthly (30-day) figures, net of reinsurance
const NEP = BKI2024.netUwProfit / (1 - BKI2024.combinedRatio) / 12; // ≈ ฿1,575M เบี้ยรับรู้รายได้สุทธิ/เดือน
const LOSS_RATIO = 0.55;                                              // ASSUMED split of the 90.1% combined ratio
const INCURRED = NEP * LOSS_RATIO;                                    // ≈ ฿866M
const EXPENSES = NEP * (BKI2024.combinedRatio - LOSS_RATIO);          // ≈ ฿553M (ค่านายหน้า + ค่าใช้จ่าย)
const OPEN_CLAIMS = Math.round(BKI2024.claims / 12);                  // ≈ 21,502 เคลมค้างจ่าย (≈ เคลมเข้าใหม่ 1 เดือน)
// ASSUMED cash-flow story for the demo window
const THRESHOLD_DEMO = 500e6, TROUGH_DAY20 = 430e6, CLOSING = 945e6, RI_RECOVERY = 250e6, EXPECTED_STAT = 300e6;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LINES = [
  { line: "motor", w: BKI2024.mix.motor, sev: 28_000, sevSd: 0.8, lag: 28, lagSd: 0.55, prem: 18_000 },
  { line: "property", w: BKI2024.mix.property, sev: 50_000, sevSd: 0.9, lag: 70, lagSd: 0.6, prem: 90_000 },
  { line: "health", w: BKI2024.mix.health, sev: 20_000, sevSd: 0.7, lag: 14, lagSd: 0.5, prem: 9_000 },
  { line: "misc", w: BKI2024.mix.misc, sev: 35_000, sevSd: 0.9, lag: 40, lagSd: 0.6, prem: 25_000 },
];

export function sampleData(today: string): Datasets {
  const r = rng(20261017);
  const normal = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());
  const logn = (median: number, sd: number) => median * Math.exp(sd * normal());
  const pick = () => { const x = r(); let c = 0; for (const L of LINES) { c += L.w; if (x <= c) return L; } return LINES[0]; };
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const round = (v: number, step = 1000) => Math.max(step, Math.round(v / step) * step);

  // ---- Policy System
  const policies: Policy[] = [];
  for (let i = 1; i <= 6000; i++) {
    const L = pick();
    const start = addDays(today, -int(0, 363));
    const premium = round(logn(L.prem, 0.6), 100);
    policies.push({ policy_id: `POL-${String(i).padStart(6, "0")}`, line: L.line, start_date: start, end_date: addDays(start, 364), premium, sum_insured: round(premium * int(40, 120), 10000) });
  }
  const polOf = (line: string) => { for (;;) { const p = policies[int(0, policies.length - 1)]; if (p.line === line) return p.policy_id; } };

  // ---- Claims + Payment history (closed claims), with seasonal property losses in Aug–Oct (floods)
  const claims: Claim[] = [], payments: Payment[] = [], reserves: Reserve[] = [];
  let seq = 100001;
  for (let i = 0; i < 14000; i++) {
    const L = pick();
    const parts = r() < 0.3 ? 2 : 1;
    const lags = [Math.round(logn(L.lag, L.lagSd))];
    if (parts === 2) lags.push(lags[0] + int(5, 25));
    // fully settled before today: report date is at least the last payment lag (+ a few days) ago
    const minAge = lags[lags.length - 1] + int(2, 20);
    let reported = addDays(today, -int(Math.max(31, minAge), 540));
    const month = Number(reported.slice(5, 7));
    if (L.line === "property" && (month < 8 || month > 10) && r() < 0.45) reported = addDays(today, -int(Math.max(31, minAge), 540));
    const sev = round(logn(L.sev, L.sevSd));
    const id = `CLM-${seq++}`;
    claims.push({ claim_id: id, policy_id: polOf(L.line), line: L.line, loss_date: addDays(reported, -int(0, 7)), reported_date: reported, status: "closed", claimed_amount: sev });
    for (const lag of lags) payments.push({ claim_id: id, payment_date: addDays(reported, lag), amount: round(sev / parts, 100), status: "paid" });
  }

  // fast-settled claims that occurred in the last 30 days (already paid) — part of incurred losses
  const fast: { c: Claim; p: Payment }[] = [];
  for (let i = 0; i < 3000; i++) {
    const L = LINES[i % 3 === 0 ? 2 : 0];
    const reported = addDays(today, -int(4, 27));
    const sev = round(logn(L.sev, 0.6));
    const c: Claim = { claim_id: `CLM-${seq++}`, policy_id: polOf(L.line), line: L.line, loss_date: addDays(reported, -int(0, 2)), reported_date: reported, status: "closed", claimed_amount: sev };
    let pay = addDays(reported, int(2, 12)); if (pay >= today) pay = addDays(today, -1);
    const p: Payment = { claim_id: c.claim_id, payment_date: pay, amount: sev, status: "paid" };
    claims.push(c); payments.push(p); fast.push({ c, p });
  }

  // ---- Open claims (Claims system) with reserves (Actuarial system) and schedules (Payment system)
  seq = 240001;
  const statusPick = () => { const x = r(); return x < 0.22 ? "approved" : x < 0.55 ? "review" : x < 0.8 ? "survey" : "docs"; };
  const open: { c: Claim; sched?: Payment }[] = [];
  for (let i = 0; i < OPEN_CLAIMS - 7; i++) {
    const L = pick();
    const status = statusPick();
    let age = Math.min(220, Math.round(logn(L.lag * 0.9, 0.8)));
    if (status === "approved") age = Math.max(age, 31 + int(0, 40)); // approved claims were reported before the 30-day window
    const reported = addDays(today, -age);
    const sev = round(logn(L.sev, L.sevSd));
    const c: Claim = { claim_id: `CLM-${seq++}`, policy_id: polOf(L.line), line: L.line, loss_date: addDays(reported, -int(0, 7)), reported_date: reported, status, claimed_amount: sev };
    const due = 1 + Math.floor(18.99 * Math.pow(r(), 1.1)); // approved claims fall due in the next ~3 weeks, front-loaded
    open.push({ c, sched: status === "approved" ? { claim_id: c.claim_id, payment_date: addDays(today, due), amount: sev, status: "scheduled" } : undefined });
  }
  // two large property losses due around day 19 and day 24
  for (const [amt, due] of [[160_000_000, 18], [110_000_000, 23]] as const) { // large property (IAR) losses
    const c: Claim = { claim_id: `CLM-${seq++}`, policy_id: polOf("property"), line: "property", loss_date: addDays(today, -48), reported_date: addDays(today, -45), status: "approved", claimed_amount: amt };
    open.push({ c, sched: { claim_id: c.claim_id, payment_date: addDays(today, due), amount: amt, status: "scheduled" } });
  }
  // the five claims shown first in the claims table (as in the reference design)
  const showcase: [string, string, number, number][] = [["motor", "approved", 850_000, 3], ["health", "review", 620_000, 7], ["property", "survey", 480_000, 10], ["motor", "approved", 320_000, 14], ["health", "docs", 280_000, 20]];
  showcase.forEach(([line, status, amt, due], k) => {
    const o = open[k];
    o.c.line = line; o.c.status = status; o.c.claimed_amount = amt; o.c.policy_id = polOf(line);
    o.sched = status === "approved" ? { claim_id: o.c.claim_id, payment_date: addDays(today, due), amount: amt, status: "scheduled" } : undefined;
  });

  // ---- Accounting / Bank: 90 days of balances, actual history, expected future flows
  const ledger: Ledger[] = [];
  const OPEN_CASH = BKI2024.cash;
  let bal = OPEN_CASH;
  for (let d = 0; d <= 90; d++) {
    const date = addDays(today, -d);
    ledger.push({ date, type: "balance", amount: Math.round(bal), status: "actual", description: "ยอดเงินสดคงเหลือสิ้นวัน" });
    const inflow = logn(NEP / 30, 0.3), exp = (EXPENSES / 30) * (0.7 + 0.6 * r()), claimsPaid = logn(37e6, 0.35);
    ledger.push({ date, type: "premium_receipt", amount: Math.round(inflow), status: "actual", description: "รับชำระเบี้ยประกัน" });
    ledger.push({ date, type: "expense", amount: Math.round(exp), status: "actual", description: "ค่าใช้จ่ายในการรับประกัน (ค่านายหน้า/ดำเนินงาน)" });
    bal -= inflow - exp - claimsPaid; // walk backwards
  }

  const ds: Datasets = { policies, claims: [...claims, ...open.map((o) => o.c)], reserves, payments: [...payments, ...open.flatMap((o) => (o.sched ? [o.sched] : []))], ledger };
  for (const o of open) reserves.push({ claim_id: o.c.claim_id, reserve_amount: o.c.claimed_amount, valuation_date: today });

  const showIds = new Set(open.slice(0, 5).map((o) => o.c.claim_id).concat(open.slice(-2).map((o) => o.c.claim_id)));
  const scheduled = new Set(ds.payments.filter((p) => p.status === "scheduled").map((p) => p.claim_id));
  const syncReserves = () => { const byId = new Map(ds.claims.map((c) => [c.claim_id, c])); for (const rs of reserves) rs.reserve_amount = byId.get(rs.claim_id)!.claimed_amount; };

  // 1) statistical (unscheduled) claim payments in the window ≈ EXPECTED_STAT
  const f0 = forecast(ds, { horizon: 30, today, threshold: THRESHOLD_DEMO });
  const kRes = EXPECTED_STAT / f0.totals.expectedClaims;
  for (const c of ds.claims) if (c.status !== "closed" && !showIds.has(c.claim_id) && !scheduled.has(c.claim_id)) c.claimed_amount = round(c.claimed_amount * kRes, 100);
  syncReserves();

  // 2) underwriting, last 30 days: earned ≈ NEP, incurred ≈ INCURRED, expenses ≈ EXPENSES → combined ratio 90.1%
  {
    const u = underwriting(ds, today);
    const kp = NEP / u.earned;
    for (const p of policies) { p.premium = round(p.premium * kp, 100); p.sum_insured = round(p.sum_insured * kp, 10000); }
    const fastSum = fast.reduce((a, x) => a + x.c.claimed_amount, 0);
    const kf = Math.max(0.05, (INCURRED - (u.incurred - fastSum)) / fastSum);
    for (const x of fast) { x.c.claimed_amount = round(x.c.claimed_amount * kf, 100); x.p.amount = x.c.claimed_amount; }
    const from = addDays(today, -29);
    const exp = ledger.filter((l) => l.type === "expense" && l.status === "actual" && l.date >= from && l.date <= today);
    const ke = EXPENSES / exp.reduce((a, l) => a + l.amount, 0);
    for (const l of exp) l.amount = Math.round(l.amount * ke);
  }
  // paid claims in the last 30 days ≈ one month of net claims plus large losses (for "compare with history")
  {
    const from = addDays(today, -30), fastIds = new Set(fast.map((x) => x.c.claim_id));
    const hist = payments.filter((p) => p.status === "paid" && !fastIds.has(p.claim_id));
    const in30 = hist.filter((p) => p.payment_date >= from).reduce((a, p) => a + p.amount, 0);
    const fastPaid = fast.reduce((a, x) => a + x.p.amount, 0);
    const kh = Math.max(0.05, (1_050e6 - fastPaid) / in30);
    for (const p of hist) p.amount = round(p.amount * kh, 100);
    const byId = new Map(claims.map((c) => [c.claim_id, c]));
    for (const p of hist) { const c = byId.get(p.claim_id); if (c) c.claimed_amount = 0; }
    for (const p of hist) { const c = byId.get(p.claim_id); if (c) c.claimed_amount += p.amount; }
  }

  // 3) expected daily premium collections and commissions/expenses (days 2–30), then scheduled claims so cash bottoms at day 20
  const daily = (NEP - 200e6) / 29, dailyExp = EXPENSES / 29;
  for (let t = 1; t < 30; t++) {
    ledger.push({ date: addDays(today, t), type: "premium_receipt", amount: Math.round(daily), status: "expected", description: "รับชำระเบี้ยประกัน (ประมาณการ)" });
    ledger.push({ date: addDays(today, t), type: "expense", amount: Math.round(dailyExp), status: "expected", description: "ค่านายหน้าและค่าใช้จ่ายในการรับประกัน (ประมาณการ)" });
  }
  {
    const f1 = forecast(ds, { horizon: 30, today, threshold: THRESHOLD_DEMO });
    const delta = f1.series[19].cash - TROUGH_DAY20; // extra scheduled payments needed before day 20
    const early = ds.payments.filter((p) => p.status === "scheduled" && !showIds.has(p.claim_id) && diffDays(p.payment_date, today) <= 19);
    const flex = early.reduce((a, p) => a + p.amount, 0);
    const k = (flex + delta) / flex;
    for (const p of early) p.amount = round(p.amount * k, 100);
    const byId = new Map(ds.claims.map((c) => [c.claim_id, c]));
    for (const p of ds.payments) if (p.status === "scheduled" && !showIds.has(p.claim_id)) byId.get(p.claim_id)!.claimed_amount = p.amount;
    syncReserves();
  }

  // 4) reinsurance recovery on the large losses (day 21) and a corporate premium instalment (day 27) to land at CLOSING
  ledger.push({ date: addDays(today, 20), type: "reinsurance_recovery", amount: RI_RECOVERY, status: "expected", description: "รับเงินจากผู้รับประกันภัยต่อ (Reinsurance recovery)" });
  const f2 = forecast(ds, { horizon: 30, today, threshold: THRESHOLD_DEMO });
  ledger.push({ date: addDays(today, 26), type: "premium_receipt", amount: Math.round(CLOSING - f2.closing), status: "expected", description: "รับชำระเบี้ยงวดใหญ่ (ลูกค้ากลุ่มองค์กร)" });
  for (let t = 30; t < 90; t++) {
    ledger.push({ date: addDays(today, t), type: "premium_receipt", amount: Math.round(NEP / 30), status: "expected", description: "รับชำระเบี้ยประกัน (ประมาณการ)" });
    ledger.push({ date: addDays(today, t), type: "expense", amount: Math.round(EXPENSES / 30), status: "expected", description: "ค่านายหน้าและค่าใช้จ่ายในการรับประกัน (ประมาณการ)" });
  }
  for (let t = 30; t < 90; t += 30) ledger.push({ date: addDays(today, t + 5), type: "reinsurance_recovery", amount: 120e6, status: "expected", description: "รับเงินจากผู้รับประกันภัยต่อ (Reinsurance recovery)" });
  ledger.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return ds;
}
