/* AI Concierge: Retrieve → Reason → Act over the connected data (deck: Recommendation).
 * Works offline with deterministic reasoning; optionally sends the retrieved facts to Claude
 * (the user's own API key, stored only in their browser) to phrase the answer. */
import { claimRows, history, monthTh, underwriting } from "./analytics";
import { forecast, type Forecast } from "./forecast";
import { fmtBaht, fmtM, lineLabel, mNum, thaiDate } from "./format";
import type { Datasets } from "./types";

export type Act = { label: string; kind: "nav" | "scenario" | "report" | "threshold" | "download"; to?: string; shock?: number; delay?: number; report?: string };
export type Steps = { retrieve: { source: string; detail: string }[]; reason: string[]; act: Act[] };
export type Answer = { text: string; steps: Steps; sources: { label: string; to: string }[]; facts: Record<string, unknown>; intent: string };
export type Ctx = { ds: Datasets; today: string; threshold: number; horizon: number };

const has = (q: string, ...w: string[]) => w.some((x) => q.includes(x));

function horizonOf(q: string, fallback: number) {
  if (has(q, "ไตรมาส", "quarter", "3 เดือน", "90")) return { h: 90, label: "ไตรมาสหน้า (90 วัน)" };
  if (has(q, "60", "2 เดือน")) return { h: 60, label: "60 วันข้างหน้า" };
  if (has(q, "สัปดาห์", "week", "7 วัน")) return { h: 8, label: "สัปดาห์หน้า (7 วัน)" };
  if (has(q, "ปีนี้", "ทั้งปี", "this year", "year")) return { h: 90, label: "90 วันข้างหน้า (ระบบพยากรณ์ได้สูงสุด 90 วัน)" };
  if (has(q, "เดือน", "month", "30")) return { h: 30, label: "30 วันข้างหน้า" };
  return { h: fallback, label: `${fallback} วันข้างหน้า` };
}
const pct = (q: string) => { const m = q.match(/(-?\d+(?:\.\d+)?)\s*(%|เปอร์เซ็นต์|percent)/); return m ? Number(m[1]) : null; };

const SRC = {
  claims: { source: "Claims Management System", label: "ข้อมูลเคลม", to: "/claims" },
  reserves: { source: "Actuarial System", label: "สำรองค่าสินไหม", to: "/claims" },
  payments: { source: "Payment System", label: "แผนรับจ่าย", to: "/forecast" },
  ledger: { source: "Accounting / Bank Data", label: "ยอดเงินสด", to: "/forecast" },
  policies: { source: "Policy System", label: "กรมธรรม์", to: "/claims" },
};

export function answer(question: string, c: Ctx): Answer {
  const q = question.toLowerCase().trim();
  const { h, label: lb } = horizonOf(q, c.horizon);
  const label = /^\d/.test(lb) ? ` ${lb}` : lb;
  const f = forecast(c.ds, { horizon: Math.max(h, 8), today: c.today, threshold: c.threshold });
  const sched = f.contributors.filter((x) => x.kind === "scheduled");
  const steps: Steps = { retrieve: [], reason: [], act: [] };
  const sources = new Map<string, { label: string; to: string }>();
  const use = (k: keyof typeof SRC, detail: string) => { steps.retrieve.push({ source: SRC[k].source, detail }); sources.set(SRC[k].label, { label: SRC[k].label, to: SRC[k].to }); };
  const baseRetrieve = () => {
    use("ledger", `ยอดเงินสดคงเหลือ ${fmtM(f.opening)} ณ ${thaiDate(f.balanceDate)} และเงินรับที่คาดว่าจะได้รับ ${fmtM(f.totals.receipts)}`);
    use("claims", `เคลมที่ยังเปิดอยู่ ${f.openClaims.toLocaleString()} รายการ`);
    use("payments", `รายการกำหนดจ่ายแล้ว ${sched.length} รายการ รวม ${fmtM(f.totals.scheduledClaims)} และประวัติการจ่ายเพื่อเรียนรู้ระยะเวลาจ่าย`);
    use("reserves", `สำรองค่าสินไหมของเคลมที่ยังไม่กำหนดจ่าย → คาดว่าจะจ่ายในช่วงนี้ ${fmtM(f.totals.expectedClaims)}`);
  };
  const facts: Record<string, unknown> = { horizon_days: f.horizon, opening_cash: f.opening, expected_receipts: f.totals.receipts, expected_claim_payments: f.totals.claims, scheduled_claims: f.totals.scheduledClaims, statistical_claims: f.totals.expectedClaims, lowest_cash: f.trough.cash, lowest_day: f.trough.day, lowest_date: f.trough.date, closing_cash: f.closing, minimum_reserve: c.threshold, shortfall: f.breach?.shortfall ?? 0, by_line: f.byLine };
  let text = "", intent = "";

  const scen = pct(q);
  if (scen !== null && has(q, "ถ้า", "หาก", "if", "เพิ่ม", "ลด", "scenario", "สถานการณ์")) {
    intent = "scenario";
    const shock = has(q, "ลด", "decrease") && scen > 0 ? -scen : scen;
    const s = forecast(c.ds, { horizon: f.horizon, today: c.today, threshold: c.threshold, claimShock: shock });
    baseRetrieve();
    steps.reason.push(`ปรับยอดจ่ายเคลมทุกรายการ ${shock > 0 ? "+" : ""}${shock}% แล้วคำนวณกระแสเงินสดรายวันใหม่`, `ยอดจ่ายเคลม ${fmtM(f.totals.claims)} → ${fmtM(s.totals.claims)} (ส่วนเพิ่ม ${fmtM(s.totals.claims - f.totals.claims)})`, `เงินสดต่ำสุด ${fmtM(f.trough.cash)} → ${fmtM(s.trough.cash)} (วันที่ ${s.trough.day})`);
    text = `ถ้ายอดจ่ายเคลม${shock >= 0 ? "เพิ่มขึ้น" : "ลดลง"} ${Math.abs(shock)}% ใน${label} เงินสดต่ำสุดจะอยู่ที่ ${fmtM(s.trough.cash)} ในวันที่ ${s.trough.day} ${s.breach && !s.breach.earlyWarning ? `ต่ำกว่าเกณฑ์ ${fmtM(c.threshold)} อยู่ ${fmtM(s.breach.shortfall)}` : `ยังสูงกว่าเกณฑ์ ${fmtM(c.threshold)}`} และเงินสดปลายงวดจะเหลือ ${fmtM(s.closing)} (กรณีฐาน ${fmtM(f.closing)})`;
    steps.act.push({ label: "เปิดหน้าจำลองสถานการณ์", kind: "scenario", shock }, { label: "สร้าง Scenario Report", kind: "report", report: "scenario", shock });
    Object.assign(facts, { scenario_claim_change_pct: shock, scenario_lowest_cash: s.trough.cash, scenario_lowest_day: s.trough.day, scenario_closing: s.closing, scenario_shortfall: s.breach?.shortfall ?? 0 });
  } else if (has(q, "เลื่อน", "postpone", "defer", "delay payment", "ชะลอ")) {
    intent = "defer";
    baseRetrieve();
    const before = sched.filter((x) => x.day <= f.trough.day && x.status === "approved").sort((a, b) => b.amount - a.amount);
    const need = f.breach && !f.breach.earlyWarning ? f.breach.shortfall : 0;
    let acc = 0; const pickList = [];
    for (const x of before) { if (acc >= need) break; pickList.push(x); acc += x.amount; }
    steps.reason.push(`ค้นหารายการที่กำหนดจ่ายก่อนหรือในวันที่เงินสดต่ำสุด (วันที่ ${f.trough.day}): ${before.length} รายการ`, need ? `ต้องลดเงินจ่ายก่อนวันที่ ${f.trough.day} อย่างน้อย ${fmtM(need)} เพื่อไม่ให้ต่ำกว่าเกณฑ์` : "ขณะนี้เงินสดไม่ต่ำกว่าเกณฑ์ จึงไม่จำเป็นต้องเลื่อน", `เลือกรายการมูลค่าสูงก่อน: ${pickList.length} รายการ รวม ${fmtM(acc)}`);
    text = need
      ? `ทำได้บางส่วน หากเลื่อนการจ่าย ${pickList.length} รายการ (รวม ${fmtM(acc)}) ไปหลังวันที่ ${f.trough.day} ซึ่งเป็นช่วงที่ได้รับเงินจากผู้รับประกันภัยต่อแล้ว เงินสดจะไม่ต่ำกว่าเกณฑ์ ${fmtM(c.threshold)}: ${pickList.slice(0, 4).map((x) => `${x.claim_id} (${lineLabel(x.line)} ${fmtM(x.amount)} วันที่ ${x.day})`).join(", ")}${pickList.length > 4 ? " …" : ""} ทั้งนี้ต้องอยู่ในกำหนดเวลาจ่ายสินไหมตามที่ คปภ. กำหนดและไม่กระทบผู้เอาประกัน ควรพิจารณาร่วมกับฝ่ายสินไหมก่อน`
      : `ขณะนี้ไม่จำเป็นต้องเลื่อนการจ่ายเคลม เงินสดต่ำสุดอยู่ที่ ${fmtM(f.trough.cash)} ในวันที่ ${f.trough.day} ยังสูงกว่าเกณฑ์ ${fmtM(c.threshold)}`;
    steps.act.push({ label: "ดูรายการเคลมที่กำหนดจ่าย", kind: "nav", to: "/claims" }, { label: "จำลองการรับเงินล่าช้า/เคลมเพิ่ม", kind: "scenario", shock: 0 });
    facts.defer_candidates = pickList.map((x) => ({ claim_id: x.claim_id, line: x.line, amount: x.amount, day: x.day }));
  } else if (has(q, "สภาพคล่อง", "liquidity", "วิธี", "แก้", "ทางเลือก", "เพิ่มเงิน", "หาเงิน")) {
    intent = "options";
    baseRetrieve();
    const ri = f.receiptItems.filter((r) => r.type === "reinsurance_recovery");
    const need = f.breach && !f.breach.earlyWarning ? f.breach.shortfall : 0;
    steps.reason.push(need ? `ช่องว่างสภาพคล่องที่ต้องปิด: ${fmtM(need)} ในวันที่ ${f.trough.day}` : "ยังไม่มีช่องว่างสภาพคล่องในช่วงนี้", ri.length ? `เงินจากผู้รับประกันภัยต่อ ${fmtM(ri[0].amount)} จะเข้าวันที่ ${ri[0].day} (${ri[0].day > f.trough.day ? "หลัง" : "ก่อน"}วันที่เงินสดต่ำสุด)` : "ไม่พบกำหนดรับเงินจากผู้รับประกันภัยต่อในช่วงนี้");
    const opts = [
      ri.length && ri[0].day > f.trough.day ? `เร่งรับเงินจากผู้รับประกันภัยต่อ ${fmtM(ri[0].amount)} ให้เข้าก่อนวันที่ ${f.trough.day} (ปัจจุบันกำหนดวันที่ ${ri[0].day})` : null,
      need ? `ใช้วงเงินสินเชื่อระยะสั้นอย่างน้อย ${fmtM(Math.ceil(need / 1e6) * 1e6, 0)}` : null,
      `เร่งรับชำระเบี้ยประกันค้างรับ (เงินรับคาดการณ์ ${fmtM(f.totals.receipts)} ในช่วงนี้)`,
      `ทบทวนกำหนดจ่ายเคลมที่อนุมัติแล้ว ${sched.length} รายการ ก่อนวันที่ ${f.trough.day}`,
      "ขายสินทรัพย์ลงทุนระยะสั้นที่มีสภาพคล่องสูงบางส่วน",
    ].filter(Boolean) as string[];
    text = `${need ? `เพื่อปิดช่องว่าง ${fmtM(need)} ในวันที่ ${f.trough.day}` : "ทางเลือกเพิ่มสภาพคล่อง"} มีวิธีดังนี้: ${opts.map((o, i) => `${i + 1}) ${o}`).join(" ")}`;
    steps.act.push({ label: "ตรวจสอบแหล่งเงินสำรอง", kind: "nav", to: "/scenario" }, { label: "สร้างรายงานพยากรณ์เงินสด", kind: "report", report: "forecast" });
    facts.options = opts;
  } else if (has(q, "ทำไม", "สาเหตุ", "ความเสี่ยง", "why", "risk", "ปัจจัย", "เพราะ")) {
    intent = "drivers";
    baseRetrieve();
    const before = f.contributors.filter((x) => x.day <= f.trough.day);
    const byLine: Record<string, number> = {};
    before.forEach((x) => (byLine[x.line] = (byLine[x.line] ?? 0) + x.amount));
    const topLine = Object.entries(byLine).sort((a, b) => b[1] - a[1]);
    const recBefore = f.series.filter((p) => p.day <= f.trough.day).reduce((a, p) => a + p.receipts, 0);
    const recAfter = f.totals.receipts - recBefore;
    const big = before.filter((x) => x.amount >= 10e6);
    steps.reason.push(`ช่วงวันที่ 1–${f.trough.day}: จ่ายเคลม ${fmtM(before.reduce((a, x) => a + x.amount, 0))} แต่รับเงินเพียง ${fmtM(recBefore)}`, `เงินรับส่วนใหญ่ ${fmtM(recAfter)} เข้าหลังวันที่ ${f.trough.day}`, `แยกตามประเภท: ${topLine.map(([l, v]) => `${lineLabel(l)} ${fmtM(v)}`).join(", ")}`);
    text = `ความเสี่ยงหลักคือจังหวะเวลาไม่ตรงกัน ช่วงวันที่ 1–${f.trough.day} มีเคลมครบกำหนดจ่ายรวม ${fmtM(before.reduce((a, x) => a + x.amount, 0))} โดยเฉพาะเคลม${lineLabel(topLine[0]?.[0] ?? "")} (${fmtM(topLine[0]?.[1] ?? 0)})${big.length ? ` และเคลมมูลค่าเกิน 10 ล้านบาท ${big.length} รายการ` : ""} ขณะที่เงินรับส่วนใหญ่ ${fmtM(recAfter)} รวมถึงเงินจากผู้รับประกันภัยต่อจะเข้าหลังวันที่ ${f.trough.day} ทำให้เงินสดต่ำสุดอยู่ที่ ${fmtM(f.trough.cash)}`;
    steps.act.push({ label: "ดูพยากรณ์รายสัปดาห์", kind: "nav", to: "/forecast" }, { label: "ดูเคลมมูลค่าสูง", kind: "nav", to: "/claims" });
  } else if (has(q, "ใหญ่", "สูงสุด", "มากที่สุด", "top", "largest", "biggest")) {
    intent = "top";
    const rows = claimRows(c.ds, c.today).sort((a, b) => b.reserve - a.reserve).slice(0, 5);
    use("claims", "เคลมที่ยังเปิดอยู่ทั้งหมด"); use("reserves", "ประมาณการค่าสินไหมของแต่ละเคลม"); use("payments", "กำหนดจ่ายของแต่ละเคลม");
    steps.reason.push("เรียงเคลมเปิดอยู่ตามประมาณการค่าสินไหมจากมากไปน้อย");
    text = `เคลมมูลค่าสูงสุด 5 รายการ: ${rows.map((r) => `${r.claim_id} ${lineLabel(r.line)} ${fmtBaht(r.reserve)} (${r.dueKind === "scheduled" ? "กำหนดจ่าย" : "คาดว่าจ่าย"} ${r.dueDate ? thaiDate(r.dueDate) : "-"})`).join("; ")}`;
    steps.act.push({ label: "เปิดรายละเอียดเคลม", kind: "nav", to: "/claims" });
    facts.top_claims = rows.map((r) => ({ id: r.claim_id, line: r.line, reserve: r.reserve, due: r.dueDate }));
  } else if (has(q, "เทียบ", "ที่ผ่านมา", "ปีที่แล้ว", "budget", "compare", "งบ", "ฤดู", "season", "ช่วงไหน")) {
    intent = "compare";
    const hst = history(c.ds, c.today, f.horizon);
    use("payments", "ประวัติการจ่ายเคลมย้อนหลัง"); use("claims", "จำนวนเคลมทรัพย์สินรายเดือนย้อนหลัง");
    steps.reason.push(`จ่ายจริง 30 วันที่ผ่านมา ${fmtM(hst.last30)}`, `ช่วงเดียวกันปีที่แล้ว ${fmtM(hst.lastYear)}`, `คาดการณ์${label} ${fmtM(f.totals.claims)}`);
    const diff = hst.last30 ? f.totals.claims / hst.last30 - 1 : 0;
    text = `คาดว่าจะจ่ายเคลม ${fmtM(f.totals.claims)} ใน${label} ${diff >= 0 ? "สูงกว่า" : "ต่ำกว่า"} 30 วันที่ผ่านมา (${fmtM(hst.last30)}) ${Math.abs(diff * 100).toFixed(0)}% และเทียบกับช่วงเดียวกันปีที่แล้ว ${fmtM(hst.lastYear)}${hst.peaks.length ? ` จากข้อมูลในอดีต เคลมทรัพย์สินมักเพิ่มขึ้นในเดือน${hst.peaks.map(monthTh).join(" ")} (ช่วงอุทกภัย) ควรเตรียมเงินสดเพิ่มในช่วงดังกล่าว` : ""}`;
    steps.act.push({ label: "ดูพยากรณ์เงินสด", kind: "nav", to: "/forecast" });
    Object.assign(facts, { paid_last_30_days: hst.last30, paid_same_period_last_year: hst.lastYear, seasonal_peak_months: hst.peaks.map(monthTh) });
  } else if (has(q, "ผลรับประกัน", "กำไร", "ขาดทุน", "combined", "loss ratio", "underwriting")) {
    intent = "underwriting";
    const u = underwriting(c.ds, c.today);
    use("policies", "เบี้ยประกันที่ถือเป็นรายได้ 30 วันที่ผ่านมา"); use("claims", "ค่าสินไหมที่เกิดขึ้น"); use("ledger", "ค่าใช้จ่ายในการรับประกัน");
    steps.reason.push(`เบี้ยที่ถือเป็นรายได้ ${fmtM(u.earned)} − ค่าสินไหมเกิดขึ้น ${fmtM(u.incurred)} − ค่าใช้จ่าย ${fmtM(u.expenses)} = ${fmtM(u.result)}`);
    text = `ผลรับประกัน 30 วันที่ผ่านมา${u.result < 0 ? "ขาดทุน" : "กำไร"} ${fmtM(Math.abs(u.result))} Combined Ratio ${(u.combined * 100).toFixed(0)}% (Loss ratio ${(u.lossRatio * 100).toFixed(0)}%)`;
    steps.act.push({ label: "เปิดหน้าวิเคราะห์เคลม", kind: "nav", to: "/claims" }, { label: "สร้างรายงานผลการรับประกัน", kind: "report", report: "underwriting" });
    Object.assign(facts, { earned_premium: u.earned, incurred: u.incurred, expenses: u.expenses, underwriting_result: u.result, combined_ratio: u.combined });
  } else if (has(q, "รายงาน", "report", "สรุป")) {
    intent = "report";
    baseRetrieve();
    steps.reason.push("รวบรวมพยากรณ์เงินสด จุดต่ำสุด และรายการที่ต้องติดตาม");
    text = `สรุป${label}: เงินสดวันนี้ ${fmtM(f.opening)} รับ ${fmtM(f.totals.receipts)} จ่ายเคลม ${fmtM(f.totals.claims)} ต่ำสุด ${fmtM(f.trough.cash)} วันที่ ${f.trough.day} ปลายงวด ${fmtM(f.closing)} กดปุ่มด้านล่างเพื่อสร้างรายงานพร้อมดาวน์โหลด PDF/Excel`;
    steps.act.push({ label: "สร้าง Cash Flow Forecast Report", kind: "report", report: "forecast" });
  } else if (has(q, "รถ", "motor", "สุขภาพ", "health", "ทรัพย์สิน", "property", "ประเภท")) {
    intent = "by_line";
    baseRetrieve();
    const rows = Object.entries(f.byLine).sort((a, b) => b[1] - a[1]);
    steps.reason.push("แยกยอดจ่ายเคลมที่คาดการณ์ตามประเภทประกัน");
    text = `คาดการณ์จ่ายเคลม${label}แยกตามประเภท: ${rows.map(([l, v]) => `${lineLabel(l)} ${fmtM(v)} (${((v / f.totals.claims) * 100).toFixed(0)}%)`).join(", ")}`;
    steps.act.push({ label: "เปิดหน้าวิเคราะห์เคลม", kind: "nav", to: "/claims" });
  } else if (has(q, "เท่าไร", "เท่าไหร่", "เตรียม", "ต้องจ่าย", "how much", "need", "จ่าย", "เงินสด", "cash")) {
    intent = "cash_need";
    baseRetrieve();
    const win = f.series.filter((p) => p.day <= h);
    const tr = win.reduce((m, p) => (p.cash < m.cash ? p : m), win[0]);
    const claimsWin = win.reduce((a, p) => a + p.claims, 0);
    const short = Math.max(0, c.threshold - tr.cash);
    steps.reason.push(`คาดการณ์จ่ายเคลม${label}: ตามกำหนด ${fmtM(sched.filter((x) => x.day <= h).reduce((a, x) => a + x.amount, 0))} + คาดการณ์จากสำรอง ${fmtM(claimsWin - sched.filter((x) => x.day <= h).reduce((a, x) => a + x.amount, 0))}`, `เงินสดรายวัน = เงินสดวันนี้ + เงินรับ − เงินจ่าย → ต่ำสุด ${fmtM(tr.cash)} วันที่ ${tr.day}`, `เทียบเกณฑ์เงินสำรองขั้นต่ำ ${fmtM(c.threshold)} → ${short ? `ขาด ${fmtM(short)}` : "ไม่ขาด"}`);
    text = short
      ? `คาดว่าเงินสดจะต่ำกว่าเกณฑ์ ${mNum(short)} ล้านบาท ในวันที่ ${tr.day} (${thaiDate(tr.date)}) จึงควรเตรียมเงินเพิ่มอย่างน้อย ${mNum(Math.ceil(short / 1e6) * 1e6)} ล้านบาท ก่อนวันดังกล่าว โปรดตรวจสอบกำหนดรับเงินประกันภัยต่อ ใน${label}คาดว่าจะจ่ายเคลมรวม ${fmtM(claimsWin)}`
      : `ไม่จำเป็นต้องเตรียมเงินเพิ่ม ใน${label}คาดว่าจะจ่ายเคลมรวม ${fmtM(claimsWin)} เงินสดต่ำสุด ${fmtM(tr.cash)} ในวันที่ ${tr.day} ยังสูงกว่าเกณฑ์ ${fmtM(c.threshold)}`;
    steps.act.push({ label: "ดูพยากรณ์เงินสด", kind: "nav", to: "/forecast" }, { label: "จำลองถ้าเคลมเพิ่ม 10%", kind: "scenario", shock: 10 }, { label: "สร้างรายงาน", kind: "report", report: "forecast" });
    Object.assign(facts, { window_claims: claimsWin, window_lowest: tr.cash, window_lowest_day: tr.day, prepare_at_least: short });
  } else {
    intent = "help";
    text = "ผมช่วยตอบคำถามจากข้อมูลกรมธรรม์ เคลม สำรองค่าสินไหม การจ่ายเงิน และบัญชี/ธนาคารได้ เช่น \"เดือนนี้ต้องเตรียมเงินเพิ่มเท่าไร?\", \"ถ้าเคลมเพิ่ม 15% จะเกิดอะไรขึ้น?\", \"ความเสี่ยงหลักคืออะไร?\", \"เคลมที่ใหญ่ที่สุดคืออะไร?\", \"เทียบกับปีที่แล้ว\", \"ผลรับประกันเป็นอย่างไร?\"";
    steps.reason.push("ไม่พบคำถามที่ระบบเข้าใจ จึงแสดงตัวอย่างคำถาม");
  }
  return { text, steps, sources: [...sources.values()], facts, intent };
}

/** Optional: phrase the answer with Claude, grounded only in the retrieved facts. */
export async function askClaude(question: string, a: Answer, history: { role: "user" | "ai"; text: string }[], key: string, model: string, company: string): Promise<string> {
  const system = `คุณคือ AI Concierge ด้านกระแสเงินสดของบริษัทประกันวินาศภัย "${company}" ตอบเป็นภาษาไทย กระชับ 2–5 ประโยค ใช้ตัวเลขจาก FACTS เท่านั้น ห้ามแต่งตัวเลขเพิ่ม หน่วยเงินเป็นบาท (แสดงเป็นล้านบาทได้) ถ้าข้อมูลไม่พอให้บอกตรง ๆ ว่าขาดข้อมูลอะไร`;
  const messages = [
    ...history.slice(-6).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })),
    { role: "user", content: `คำถาม: ${question}\n\nFACTS (คำนวณจากระบบ):\n${JSON.stringify(a.facts)}\n\nขั้นตอนที่ระบบคำนวณ:\n${a.steps.reason.join("\n")}\n\nคำตอบเบื้องต้นของระบบ: ${a.text}` },
  ];
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model, max_tokens: 600, system, messages }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 160)}`);
  const j = await res.json();
  return (j.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
}

export type { Forecast };
