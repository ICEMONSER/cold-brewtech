/* CSV import/export for the five source systems, with validation. */
import { SOURCES, type Datasets, type SourceKey } from "./types";

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const esc = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function toCSV(columns: string[], rows: Record<string, unknown>[]) {
  return "﻿" + [columns.join(","), ...rows.map((r) => columns.map((c) => esc(r[c])).join(","))].join("\n");
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LINE_ALIASES: Record<string, string> = { รถยนต์: "motor", สุขภาพ: "health", ทรัพย์สิน: "property", ขนส่ง: "marine", เบ็ดเตล็ด: "misc" };
const STATUS_ALIASES: Record<string, string> = { อนุมัติแล้ว: "approved", อยู่ระหว่างพิจารณา: "review", สำรวจความเสียหาย: "survey", เอกสารเพิ่มเติม: "docs", ปิดเคลมแล้ว: "closed", open: "review" };
const NUM = new Set(["premium", "sum_insured", "claimed_amount", "reserve_amount", "amount"]);
const ENUMS: Partial<Record<string, string[]>> = {
  "claims.status": ["approved", "review", "survey", "docs", "closed"],
  "payments.status": ["paid", "scheduled"],
  "ledger.type": ["balance", "premium_receipt", "reinsurance_recovery", "other_receipt", "expense", "other_payment"],
  "ledger.status": ["actual", "expected"],
};

export type Validation = { ok: boolean; rows: any[]; errors: string[]; warnings: string[] };

export function validate(key: SourceKey, text: string): Validation {
  const spec = SOURCES.find((s) => s.key === key)!;
  const errors: string[] = [], warnings: string[] = [];
  const table = parseCSV(text);
  if (!table.length) return { ok: false, rows: [], errors: ["ไฟล์ว่าง"], warnings };
  const head = table[0].map((h) => h.trim().toLowerCase());
  const missing = spec.columns.filter((c) => !head.includes(c) && !(key === "ledger" && c === "description"));
  if (missing.length) return { ok: false, rows: [], errors: [`ไม่พบคอลัมน์: ${missing.join(", ")} (ต้องมี ${spec.columns.join(", ")})`], warnings };
  const idx = Object.fromEntries(spec.columns.map((c) => [c, head.indexOf(c)]));
  const rows: any[] = [];
  for (let i = 1; i < table.length; i++) {
    const r = table[i], o: any = {};
    let bad = false;
    for (const c of spec.columns) {
      let v = (idx[c] >= 0 ? r[idx[c]] ?? "" : "").trim();
      if (c === "line") v = LINE_ALIASES[v] ?? v.toLowerCase();
      if (c === "status" && key === "claims") v = STATUS_ALIASES[v] ?? v.toLowerCase();
      if (c.endsWith("_date") || c === "date") {
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)) { const [d, m, y] = v.split("/").map(Number); v = `${y > 2400 ? y - 543 : y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }
        if (!DATE.test(v)) { if (errors.length < 15) errors.push(`แถว ${i + 1}: ${c} "${v}" ต้องเป็นวันที่ YYYY-MM-DD`); bad = true; }
      }
      if (NUM.has(c)) {
        const n = Number(v.replace(/[,฿\s]/g, ""));
        if (!Number.isFinite(n)) { if (errors.length < 15) errors.push(`แถว ${i + 1}: ${c} "${v}" ต้องเป็นตัวเลข`); bad = true; }
        o[c] = n; continue;
      }
      const en = ENUMS[`${key}.${c}`];
      if (en && !en.includes(v)) { if (errors.length < 15) errors.push(`แถว ${i + 1}: ${c} "${v}" ต้องเป็นหนึ่งใน ${en.join(", ")}`); bad = true; }
      if (!v && c !== "description" && c !== "policy_id") { if (errors.length < 15) errors.push(`แถว ${i + 1}: ${c} ว่าง`); bad = true; }
      o[c] = v;
    }
    if (!bad) rows.push(o);
  }
  if (!rows.length && !errors.length) errors.push("ไม่มีข้อมูลในไฟล์");
  if (key === "ledger" && !rows.some((r) => r.type === "balance")) warnings.push("ไม่มีแถว type=balance จะไม่สามารถหาเงินสดต้นงวดได้");
  if (key === "payments" && !rows.some((r) => r.status === "paid")) warnings.push("ไม่มีประวัติการจ่าย (status=paid) จะใช้เรียนรู้ระยะเวลาจ่ายไม่ได้");
  return { ok: errors.length === 0, rows, errors, warnings };
}

/** Cross-source checks ("ตรวจสอบ"). */
export function crossCheck(ds: Datasets, key: SourceKey) {
  const ids = new Set(ds.claims.map((c) => c.claim_id));
  const pol = new Set(ds.policies.map((p) => p.policy_id));
  const issues: string[] = [];
  if (key === "claims") { const n = ds.claims.filter((c) => c.policy_id && !pol.has(c.policy_id)).length; if (n) issues.push(`${n} เคลมอ้างอิงกรมธรรม์ที่ไม่มีใน Policy System`); }
  if (key === "reserves") { const n = ds.reserves.filter((r) => !ids.has(r.claim_id)).length; if (n) issues.push(`${n} รายการสำรองไม่มี claim_id ใน Claims System`); const open = ds.claims.filter((c) => c.status !== "closed"); const has = new Set(ds.reserves.map((r) => r.claim_id)); const m = open.filter((c) => !has.has(c.claim_id)).length; if (m) issues.push(`${m} เคลมเปิดอยู่ไม่มีสำรอง (ใช้ยอดเรียกร้องคงเหลือแทน)`); }
  if (key === "payments") { const n = ds.payments.filter((p) => !ids.has(p.claim_id)).length; if (n) issues.push(`${n} รายการจ่ายไม่มี claim_id ใน Claims System`); }
  if (key === "ledger") { if (!ds.ledger.some((l) => l.type === "balance")) issues.push("ไม่มียอดเงินสดคงเหลือ"); }
  if (key === "policies") { if (!ds.policies.length) issues.push("ไม่มีกรมธรรม์ ผลรับประกันจะคำนวณไม่ได้"); }
  return issues;
}

export function downloadText(name: string, text: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
