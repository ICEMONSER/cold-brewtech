/* Report generation: Excel (.xlsx), CSV and print-to-PDF, built from the live data (deck: "Act"). */
import { claimRows, underwriting } from "./analytics";
import { downloadText, toCSV } from "./csv";
import { forecast, weekly, type Forecast } from "./forecast";
import { fmtBaht, fmtM, lineLabel, STATUS_TH, thaiDate } from "./format";
import type { Datasets } from "./types";

export type ReportKind = "forecast" | "claims" | "scenario" | "underwriting";
export type RCtx = { ds: Datasets; today: string; threshold: number; horizon: number; company: string };
type Sheet = { name: string; rows: (string | number)[][] };
const M = (v: number) => Math.round(v / 1e4) / 100; // ล้านบาท 2 decimals

export function reportData(kind: ReportKind, c: RCtx, params: { shock?: number; delay?: number; horizon?: number } = {}) {
  const H = params.horizon ?? c.horizon;
  const f = forecast(c.ds, { horizon: H, today: c.today, threshold: c.threshold });
  const s = kind === "scenario" ? forecast(c.ds, { horizon: H, today: c.today, threshold: c.threshold, claimShock: params.shock ?? 10, receiptDelay: params.delay ?? 0 }) : null;
  const sheets: Sheet[] = [];
  const head = [["บริษัท", c.company], ["ข้อมูล ณ", thaiDate(c.today)], ["หน่วย", "ล้านบาท (ยกเว้นระบุ)"], []];
  const summary: [string, string][] = [];
  if (kind === "forecast" || kind === "scenario") {
    summary.push(["เงินสดต้นงวด", fmtM(f.opening)], ["เงินรับคาดการณ์", fmtM(f.totals.receipts)], ["เงินจ่ายเคลม", fmtM(f.totals.claims)], ["เงินสดปลายงวด", fmtM(f.closing)], ["เงินสดต่ำสุด", `${fmtM(f.trough.cash)} (วันที่ ${f.trough.day})`], ["เกณฑ์เงินสำรองขั้นต่ำ", fmtM(c.threshold)], ["ต่ำกว่าเกณฑ์", f.breach && !f.breach.earlyWarning ? fmtM(f.breach.shortfall) : "ไม่ต่ำกว่าเกณฑ์"]);
    sheets.push({ name: "สรุป", rows: [...head, ["รายการ", "ค่า"], ...summary] });
    sheets.push({ name: "รายวัน", rows: [["วันที่", "วันที่ (ปฏิทิน)", "เงินรับ", "จ่ายเคลม", "จ่ายอื่น", "เงินสดคงเหลือ", "ต่ำสุด (90%)", "สูงสุด (90%)", ...(s ? ["สถานการณ์: เงินสดคงเหลือ"] : [])], ...f.series.map((p, i) => [p.day, p.date, M(p.receipts), M(p.claims), M(p.other), M(p.cash), M(p.low), M(p.high), ...(s ? [M(s.series[i].cash)] : [])])] });
    sheets.push({ name: "รายสัปดาห์", rows: [["ช่วง", "เงินรับ", "จ่ายเคลม", "จ่ายอื่น"], ...weekly(f).map((w) => [w.label, M(w.receipts), M(w.claims), M(w.other)])] });
    sheets.push({ name: "เคลมที่มีผลมากที่สุด", rows: [["รหัสเคลม", "ประเภท", "สถานะ", "ประเภทการจ่าย", "วันที่", "จำนวนเงิน (บาท)"], ...f.contributors.slice(0, 200).map((x) => [x.claim_id, lineLabel(x.line), STATUS_TH[x.status] ?? x.status, x.kind === "scheduled" ? "กำหนดจ่าย" : "คาดการณ์จากสำรอง", x.date, Math.round(x.amount)])] });
    sheets.push({ name: "เงินรับคาดการณ์", rows: [["วันที่", "ประเภท", "รายละเอียด", "จำนวนเงิน (บาท)"], ...f.receiptItems.map((r) => [r.date, r.type, r.description, Math.round(r.amount)])] });
  }
  if (s) {
    const rows: (string | number)[][] = [["รายการ", "กรณีฐาน", `สถานการณ์ (${(params.shock ?? 10) >= 0 ? "+" : ""}${params.shock ?? 10}%, รับเงินช้า ${params.delay ?? 0} วัน)`, "ผลต่าง"]];
    const add = (l: string, a: number, b: number) => rows.push([l, M(a), M(b), M(b - a)]);
    add("เงินสดต้นงวด", f.opening, s.opening); add("เงินรับรวม", f.totals.receipts, s.totals.receipts); add("จ่ายเคลม", f.totals.claims, s.totals.claims);
    add("เงินสดคงเหลือสิ้นสุด", f.closing, s.closing); add("เงินสดต่ำสุด", f.trough.cash, s.trough.cash);
    add("ขาดจากเงินสำรองขั้นต่ำ", Math.max(0, c.threshold - f.trough.cash), Math.max(0, c.threshold - s.trough.cash));
    sheets.splice(1, 0, { name: "เปรียบเทียบสถานการณ์", rows });
  }
  if (kind === "claims") {
    const rows = claimRows(c.ds, c.today).sort((a, b) => b.reserve - a.reserve);
    const byLine = new Map<string, { n: number; r: number }>();
    rows.forEach((r) => { const x = byLine.get(r.line) ?? { n: 0, r: 0 }; x.n++; x.r += r.reserve; byLine.set(r.line, x); });
    summary.push(["เคลมเปิดอยู่", `${rows.length.toLocaleString()} รายการ`], ["สำรองค่าสินไหมรวม", fmtM(rows.reduce((a, r) => a + r.reserve, 0))], ["คาดการณ์จ่ายเคลมในช่วง", fmtM(f.totals.claims)]);
    sheets.push({ name: "สรุป", rows: [...head, ["ประเภท", "จำนวนเคลม", "สำรอง (ล้านบาท)", "คาดจ่ายในช่วง (ล้านบาท)"], ...[...byLine].map(([l, x]) => [lineLabel(l), x.n, M(x.r), M(f.byLine[l] ?? 0)])] });
    sheets.push({ name: "เคลมเปิดอยู่", rows: [["รหัสเคลม", "กรมธรรม์", "ประเภท", "วันที่เกิดเหตุ", "วันที่แจ้ง", "สถานะ", "สำรอง (บาท)", "กำหนด/คาดว่าจ่าย", "ชนิดวันที่"], ...rows.map((r) => [r.claim_id, r.policy_id, lineLabel(r.line), r.loss_date, r.reported_date, STATUS_TH[r.status] ?? r.status, Math.round(r.reserve), r.dueDate ?? "", r.dueKind === "scheduled" ? "กำหนดจ่าย" : "คาดการณ์"])] });
  }
  if (kind === "underwriting") {
    const u = underwriting(c.ds, c.today);
    summary.push(["เบี้ยประกันรับรู้รายได้", fmtM(u.earned)], ["ค่าสินไหมเกิดขึ้น", fmtM(u.incurred)], ["ค่าใช้จ่ายในการรับประกัน", fmtM(u.expenses)], ["ผลรับประกัน", fmtM(u.result)], ["Loss ratio", `${(u.lossRatio * 100).toFixed(1)}%`], ["Combined ratio", `${(u.combined * 100).toFixed(1)}%`]);
    sheets.push({ name: "ผลการรับประกัน", rows: [...head, ["ช่วงข้อมูล", `${thaiDate(u.from)} – ${thaiDate(c.today)}`], ["รายการ", "ล้านบาท"], ["เบี้ยประกันรับรู้รายได้", M(u.earned)], ["ค่าสินไหมเกิดขึ้น", -M(u.incurred)], ["ค่าใช้จ่ายในการรับประกัน", -M(u.expenses)], ["ผลรับประกัน", M(u.result)], ["Loss ratio (%)", +(u.lossRatio * 100).toFixed(1)], ["Combined ratio (%)", +(u.combined * 100).toFixed(1)]] });
  }
  return { f, s, sheets, summary };
}

export async function downloadXlsx(fileName: string, sheets: Sheet[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const sh of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(sh.rows);
    ws["!cols"] = (sh.rows[0] ?? []).map((_, i) => ({ wch: Math.min(48, Math.max(12, ...sh.rows.map((r) => String(r[i] ?? "").length + 2))) }));
    XLSX.utils.book_append_sheet(wb, ws, sh.name.slice(0, 31));
  }
  XLSX.writeFile(wb, fileName);
}

export function downloadCsvSheet(fileName: string, sh: Sheet) {
  const cols = sh.rows[0].map(String);
  downloadText(fileName, toCSV(cols, sh.rows.slice(1).map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]])))));
}

/** Print an HTML report through a hidden iframe (the browser's "Save as PDF"). */
export function printHtml(title: string, body: string) {
  const ifr = document.createElement("iframe");
  ifr.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(ifr);
  const doc = ifr.contentDocument!;
  const fonts = [...document.querySelectorAll('style,link[rel="stylesheet"]')].map((n) => n.outerHTML).join("");
  doc.open();
  doc.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${title}</title>${fonts}<style>
    body{font-family:Inter,"Noto Sans Thai",sans-serif;color:#16181d;margin:28px;background:#fff;min-width:0}
    h1{font-size:22px;margin:0 0 4px;color:#6b111c} .meta{color:#5d6370;font-size:12px;margin-bottom:16px}
    table{border-collapse:collapse;width:100%;font-size:11.5px;margin:8px 0 16px} th,td{border:1px solid #e3e5e9;padding:4px 8px;text-align:left} th{background:#f3f4f6}
    td.n{text-align:right} h2{font-size:15px;margin:18px 0 4px} .kp{display:grid;grid-template-columns:repeat(4,1fr);gap:8px} .kp div{border:1px solid #e3e5e9;border-radius:6px;padding:8px}
    .kp small{display:block;color:#5d6370;font-size:11px} .kp b{font-size:16px} svg{max-width:100%;height:auto} @page{size:A4;margin:12mm}
  </style></head><body>${body}</body></html>`);
  doc.close();
  setTimeout(() => { ifr.contentWindow!.focus(); ifr.contentWindow!.print(); setTimeout(() => ifr.remove(), 60000); }, 600);
}

export function reportHtml(title: string, c: RCtx, d: ReturnType<typeof reportData>, chartSvg = "") {
  const tbl = (sh: Sheet, max = 40) => `<table><thead><tr>${sh.rows[0].map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${sh.rows.slice(1, max + 1).map((r) => `<tr>${r.map((v) => `<td class="${typeof v === "number" ? "n" : ""}">${typeof v === "number" ? v.toLocaleString("en-US") : v}</td>`).join("")}</tr>`).join("")}</tbody></table>${sh.rows.length - 1 > max ? `<div class="meta">แสดง ${max} จาก ${sh.rows.length - 1} แถว — ดูทั้งหมดในไฟล์ Excel</div>` : ""}`;
  const kp = d.summary.length ? `<div class="kp">${d.summary.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join("")}</div>` : "";
  const sheets = d.sheets.filter((s) => s.name !== "สรุป" || !d.summary.length);
  return `<h1>${title}</h1><div class="meta">${c.company} · ข้อมูล ณ ${thaiDate(c.today)} · สร้างโดย Cold BrewTech AI Concierge</div>${kp}${chartSvg}${sheets.map((s) => `<h2>${s.name}</h2>${tbl(s, s.name === "รายวัน" ? 90 : 25)}`).join("")}`;
}

export const reportFileName = (title: string, ext: string) => `${title.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_")}.${ext}`;
export { fmtBaht };
export type { Forecast };
