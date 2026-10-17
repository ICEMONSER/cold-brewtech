import { useState } from "react";
import { fmtM } from "../api";
import { Chip, Header, SourceFoot, useData } from "../components/ui";

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name;
  a.click();
}

export default function Reports() {
  const { summary, market } = useData();
  const [sel, setSel] = useState(0);
  if (!summary || !market) return null;
  const a = summary.actual, p = summary.previous;
  const reports = [
    { title: "สรุปกระแสเงินสด ปี 2568", desc: "งบกระแสเงินสดและสภาพคล่อง",
      rows: [["รายการ", "2568", "2567", "สถานะ", "แหล่งข้อมูล"], ["CFO", a.cfo, p.cfo, "actual", "NKI-FH"], ["CFI", a.cfi, p.cfi, "actual", "NKI-FH"], ["CFF", a.cff, p.cff, "actual", "NKI-FH"], ["Net change", summary.derived.net_cash_change.value, (p.cfo + p.cfi + p.cff).toFixed(2), "derived", "CFO+CFI+CFF"], ["Liquidity ratio (x)", a.liquidity_ratio_x, p.liquidity_ratio_x, "actual", "NKI-FH"]] },
    { title: "สรุปบริการประกันภัย", desc: "รายได้และค่าใช้จ่ายตาม TFRS 17",
      rows: [["รายการ", "2568", "2567", "สถานะ", "แหล่งข้อมูล"], ["Insurance revenue", a.insurance_revenue, p.insurance_revenue, "actual", "NKI-FH"], ["Insurance service expenses", a.insurance_service_expenses, p.insurance_service_expenses, "actual", "NKI-FH"], ["Net reinsurance", a.net_reinsurance_result, p.net_reinsurance_result, "actual", "NKI-FH"], ["Insurance service result", a.insurance_service_result, p.insurance_service_result, "actual", "NKI-FH"], ["Combined ratio %", a.combined_ratio_pct, p.combined_ratio_pct, "actual", "NKI-FH"]] },
    { title: "ภาพรวมตลาดประกันวินาศภัย", desc: "เบี้ยรับโดยตรงและจำนวนกรมธรรม์",
      rows: [["รายการ", "ค่า", "งวด", "สถานะ", "แหล่งข้อมูล"], ...market.direct_premiums.map((d: any) => ["Direct premiums (MTHB)", d.value ?? `${d.low}–${d.high}`, d.period, d.status, d.source]), ...market.policies_million.map((d: any) => ["Policies (million)", d.value, d.period, d.status, d.source])] },
  ];
  const r = reports[sel];
  return (
    <>
      <Header title="รายงาน" />
      <div className="row">
        <section className="card" style={{ flex: "1 1 420px", maxWidth: 560 }}>
          <table className="t"><thead><tr><th>ชื่อรายงาน</th><th>ข้อมูล ณ</th><th>รูปแบบ</th></tr></thead><tbody>
            {reports.map((x, i) => (
              <tr key={x.title} style={{ background: i === sel ? "#FCECEC" : undefined, cursor: "pointer" }} onClick={() => setSel(i)}>
                <td><button type="button" onClick={() => setSel(i)} style={{ border: 0, background: "none", padding: 0, textAlign: "left", cursor: "pointer" }}><b>{x.title}</b><div className="muted">{x.desc}</div></button></td>
                <td>31 ธ.ค. 2568</td><td><Chip kind="warn">CSV, PDF</Chip></td>
              </tr>))}
          </tbody></table>
        </section>
        <section className="card" style={{ flex: "999 1 520px" }}>
          <div className="card-head">
            <div><h2>{r.title}</h2><div className="muted">{r.desc} · บมจ. นวกิจประกันภัย (NKI)</div></div>
            <div style={{ display: "flex", gap: 8 }} className="no-print">
              <button className="btn" onClick={() => window.print()}>ดาวน์โหลด PDF</button>
              <button className="btn ghost" onClick={() => downloadCsv(`${r.title}.csv`, r.rows as any)}>ดาวน์โหลด CSV</button>
            </div>
          </div>
          <div className="scroll-x"><table className="t"><thead><tr>{r.rows[0].map((h: any) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{r.rows.slice(1).map((row: any, i: number) => <tr key={i}>{row.map((c: any, j: number) => <td key={j} className={typeof c === "number" ? "num" : ""}>{typeof c === "number" ? c.toLocaleString() : c}</td>)}</tr>)}</tbody></table></div>
          <p className="muted">ตัวเลขทั้งหมดเป็นล้านบาท เว้นแต่ระบุ · ผลการบริการประกันภัยปี 2568: {fmtM(a.insurance_service_result)}</p>
        </section>
      </div>
      <SourceFoot ids={["NKI-FH", "SRIKRUNG-IPRB-TIRD", "OIC-2025", "THAIRE-2025"]} />
    </>
  );
}
