/* Sample data (ข้อมูลสมมติ) for "บริษัทประกัน A": a synthetic, internally consistent set of the
 * five source systems, dated relative to today so the demo always shows a live 30-day window.
 * After generating, amounts are calibrated so the 30-day forecast tells the story of the
 * reference design: ฿120M today, a dip below the ฿40M reserve around day 20 (claims fall due
 * before the reinsurance recovery arrives), and ฿50M at day 30. */
import { addDays, diffDays } from "./format";
import { forecast } from "./forecast";
import { underwriting } from "./analytics";
import type { Claim, Datasets, Ledger, Payment, Policy, Reserve } from "./types";

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
  { line: "motor", w: 0.55, sev: 95_000, sevSd: 0.8, lag: 28, lagSd: 0.55, prem: 120_000 },
  { line: "health", w: 0.3, sev: 55_000, sevSd: 0.7, lag: 14, lagSd: 0.5, prem: 150_000 },
  { line: "property", w: 0.15, sev: 420_000, sevSd: 0.9, lag: 70, lagSd: 0.6, prem: 650_000 },
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
  let seq = 230001;
  for (let i = 0; i < 4600; i++) {
    const L = pick();
    let reported = addDays(today, -int(25, 540));
    const month = Number(reported.slice(5, 7));
    if (L.line === "property" && (month < 8 || month > 10) && r() < 0.45) reported = addDays(today, -int(25, 540));
    const sev = round(logn(L.sev, L.sevSd));
    const id = `CLM-${seq++}`;
    claims.push({ claim_id: id, policy_id: polOf(L.line), line: L.line, loss_date: addDays(reported, -int(0, 7)), reported_date: reported, status: "closed", claimed_amount: sev });
    const parts = r() < 0.3 ? 2 : 1;
    let lag = Math.round(logn(L.lag, L.lagSd));
    for (let k = 0; k < parts; k++) {
      let pay = addDays(reported, lag);
      if (pay >= today) pay = addDays(today, -int(1, 10));
      payments.push({ claim_id: id, payment_date: pay, amount: round(sev / parts, 100), status: "paid" });
      lag += int(5, 25);
    }
  }

  // fast-settled claims that occurred in the last 30 days (already paid) — part of incurred losses
  const fast: { c: Claim; p: Payment }[] = [];
  for (let i = 0; i < 260; i++) {
    const L = LINES[i % 3 === 0 ? 1 : 0];
    const reported = addDays(today, -int(4, 28));
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
  for (let i = 0; i < 1238; i++) {
    const L = pick();
    const age = Math.min(220, Math.round(logn(L.lag * 0.9, 0.8)));
    const reported = addDays(today, -age);
    const status = statusPick();
    const sev = round(logn(L.sev, L.sevSd));
    const c: Claim = { claim_id: `CLM-${seq++}`, policy_id: polOf(L.line), line: L.line, loss_date: addDays(reported, -int(0, 7)), reported_date: reported, status, claimed_amount: sev };
    const due = 1 + Math.floor(18.99 * Math.pow(r(), 1.1)); // approved claims fall due in the next ~3 weeks, front-loaded
    open.push({ c, sched: status === "approved" ? { claim_id: c.claim_id, payment_date: addDays(today, due), amount: sev, status: "scheduled" } : undefined });
  }
  // two large property losses due around day 19 and day 24
  for (const [amt, due] of [[2_400_000, 18], [1_850_000, 23]] as const) {
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
  const OPEN_CASH = 120_000_000;
  let bal = OPEN_CASH;
  for (let d = 0; d <= 90; d++) {
    const date = addDays(today, -d);
    ledger.push({ date, type: "balance", amount: Math.round(bal), status: "actual", description: "ยอดเงินสดคงเหลือสิ้นวัน" });
    const inflow = logn(3_300_000, 0.35), exp = 1_000_000 * (0.7 + 0.6 * r()), claimsPaid = logn(2_100_000, 0.4);
    ledger.push({ date, type: "premium_receipt", amount: Math.round(inflow), status: "actual", description: "รับชำระเบี้ยประกัน" });
    ledger.push({ date, type: "expense", amount: Math.round(exp), status: "actual", description: "ค่าใช้จ่ายในการรับประกัน (ค่านายหน้า/ดำเนินงาน)" });
    bal -= inflow - exp - claimsPaid; // walk backwards
  }

  const ds: Datasets = { policies, claims: [...claims, ...open.map((o) => o.c)], reserves, payments: [...payments, ...open.flatMap((o) => (o.sched ? [o.sched] : []))], ledger };
  for (const o of open) reserves.push({ claim_id: o.c.claim_id, reserve_amount: o.c.claimed_amount, valuation_date: today });

  // ---- Calibrate to the design story
  const TARGET_SCHED = 66.5e6;
  const f0 = forecast(ds, { horizon: 30, today, threshold: 40e6 });
  const schedEarly = ds.payments.filter((p) => p.status === "scheduled" && diffDays(p.payment_date, today) <= 19);
  const showIds = new Set(open.slice(0, 5).map((o) => o.c.claim_id).concat(open.slice(-2).map((o) => o.c.claim_id)));
  const fixed = schedEarly.filter((p) => showIds.has(p.claim_id)).reduce((a, p) => a + p.amount, 0);
  const flex = schedEarly.filter((p) => !showIds.has(p.claim_id)).reduce((a, p) => a + p.amount, 0);
  const kSched = (TARGET_SCHED - fixed) / flex;
  const kRes = 35e6 / f0.totals.expectedClaims;
  const scheduled = new Set(ds.payments.filter((p) => p.status === "scheduled").map((p) => p.claim_id));
  for (const p of schedEarly) if (!showIds.has(p.claim_id)) p.amount = round(p.amount * kSched, 100);
  for (const c of ds.claims) {
    if (c.status === "closed" || showIds.has(c.claim_id)) continue;
    if (scheduled.has(c.claim_id)) {
      const p = ds.payments.find((x) => x.claim_id === c.claim_id && x.status === "scheduled")!;
      c.claimed_amount = p.amount;
    } else c.claimed_amount = round(c.claimed_amount * kRes, 100);
  }
  for (const rs of reserves) rs.reserve_amount = ds.claims.find((c) => c.claim_id === rs.claim_id)!.claimed_amount;

  // underwriting over the last 30 days: earned premium ≈ ฿100M, incurred ≈ ฿75M, expenses ≈ ฿30M
  {
    const u = underwriting(ds, today);
    const kp = 100e6 / u.earned;
    for (const p of policies) { p.premium = round(p.premium * kp, 100); p.sum_insured = round(p.sum_insured * kp, 10000); }
    const fastSum = fast.reduce((a, x) => a + x.c.claimed_amount, 0);
    const kf = Math.max(0.05, (75e6 - (u.incurred - fastSum)) / fastSum);
    for (const x of fast) { x.c.claimed_amount = round(x.c.claimed_amount * kf, 100); x.p.amount = x.c.claimed_amount; }
    const from = addDays(today, -29);
    const exp = ledger.filter((l) => l.type === "expense" && l.date >= from);
    const ke = 30e6 / exp.reduce((a, l) => a + l.amount, 0);
    for (const l of exp) l.amount = Math.round(l.amount * ke);
  }

  // expected receipts: daily premium collections + reinsurance recovery (day 21) + a large premium instalment (day 27)
  const f1 = forecast(ds, { horizon: 30, today, threshold: 40e6 });
  const daily = 350_000;
  const RI = 18_000_000;
  const extra = 50e6 - OPEN_CASH + f1.totals.claims - RI - daily * 29;
  for (let t = 1; t < 30; t++) ledger.push({ date: addDays(today, t), type: "premium_receipt", amount: daily, status: "expected", description: "รับชำระเบี้ยประกัน (ประมาณการ)" });
  ledger.push({ date: addDays(today, 20), type: "reinsurance_recovery", amount: RI, status: "expected", description: "รับเงินจากผู้รับประกันภัยต่อ (Reinsurance recovery)" });
  ledger.push({ date: addDays(today, 26), type: "premium_receipt", amount: Math.round(extra), status: "expected", description: "รับชำระเบี้ยงวดใหญ่ (ลูกค้ากลุ่มองค์กร)" });
  for (let t = 30; t < 90; t++) ledger.push({ date: addDays(today, t), type: "premium_receipt", amount: 1_900_000, status: "expected", description: "รับชำระเบี้ยประกัน (ประมาณการ)" });
  for (let t = 30; t < 90; t += 30) ledger.push({ date: addDays(today, t + 5), type: "reinsurance_recovery", amount: 9_000_000, status: "expected", description: "รับเงินจากผู้รับประกันภัยต่อ (Reinsurance recovery)" });
  ledger.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return ds;
}
