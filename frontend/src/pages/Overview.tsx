import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ConciergePanel, { WhatIf } from "../components/Concierge";
import { Legend } from "../components/CashChart";
import LiveChart from "../components/LiveChart";
import { Kpi, LiveAlert, PageHeader, Pill } from "../components/Shell";
import { Menu, Modal } from "../components/ui";
import * as I from "../components/icons";
import { fmtBaht, fmtM, lineLabel, thaiDate, STATUS_TH } from "../engine/format";
import { LEGEND_MAIN } from "../data";
import { useApp } from "../store";

const TYPE_TH: Record<string, string> = { motor: "จ่ายเคลมรถยนต์ (Motor)", health: "จ่ายเคลมสุขภาพ (Health)", property: "จ่ายเคลมทรัพย์สิน (Property)" };

export default function Overview() {
  const { fc, threshold, ds } = useApp();
  const nav = useNavigate();
  const [detail, setDetail] = useState<null | { date: string; line: string; items: { claim_id: string; amount: number }[] }>(null);
  const upcoming = useMemo(() => {
    // group scheduled payments by date + line, show the three largest upcoming payment runs
    const g = new Map<string, { date: string; line: string; amount: number; items: { claim_id: string; amount: number }[] }>();
    for (const c of fc.contributors) if (c.kind === "scheduled") {
      const k = c.date + c.line;
      if (!g.has(k)) g.set(k, { date: c.date, line: c.line, amount: 0, items: [] });
      const x = g.get(k)!; x.amount += c.amount; x.items.push({ claim_id: c.claim_id, amount: c.amount });
    }
    return [...g.values()].sort((a, b) => b.amount - a.amount).slice(0, 3).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [fc]);
  const claimById = useMemo(() => new Map(ds.claims.map((c) => [c.claim_id, c])), [ds]);
  return (
    <>
      <PageHeader title="ภาพรวมกระแสเงินสด" />
      <div className="ov">
        <div className="ov-left">
          <LiveAlert />
          <div className="kpi4">
            <Kpi icon={<I.Wallet size={24} />} label="เงินสดที่ใช้ได้" value={fmtM(fc.opening)} onClick={() => nav("/forecast")} />
            <Kpi icon={<I.Doc size={24} />} label="คาดการณ์จ่ายเคลม" value={fmtM(fc.totals.claims)} onClick={() => nav("/claims")} />
            <Kpi icon={<I.BarsSolid size={21} />} label="เงินสดปลายงวด" value={fmtM(fc.closing)} onClick={() => nav("/forecast")} />
            <Kpi icon={<I.Shield size={24} />} label="เงินสำรองขั้นต่ำ" value={fmtM(threshold)} onClick={() => nav("/settings?tab=alerts")} />
          </div>

          <section className="card chart-card" style={{ height: 410 }}>
            <h3 className="card-title">คาดการณ์เงินสด {fc.horizon} วัน</h3>
            <span className="unit" style={{ position: "absolute", left: 21, top: 57 }}>ล้านบาท</span>
            <LiveChart w={870} h={360} x0={72} x1={835} yZero={318} yTop={90} yTickX={45} xTickY={346} threshold={threshold}
              series={[{ pts: fc.series, color: "#8b1a24", band: "#f9e4e6" }]} compact />
            <div className="legend-wrap" style={{ top: 375 }}><Legend items={LEGEND_MAIN} gap={16} /></div>
          </section>

          <section className="card ov-table">
            <h3 className="card-title">รายการจ่ายที่กำลังจะถึง</h3>
            <table className="tbl">
              <colgroup><col style={{ width: 144 }} /><col style={{ width: 317 }} /><col style={{ width: 163 }} /><col /><col style={{ width: 60 }} /></colgroup>
              <thead><tr><th>วันที่</th><th>ประเภท</th><th>จำนวนเงิน</th><th>สถานะ</th><th /></tr></thead>
              <tbody>
                {upcoming.map((r) => (
                  <tr key={r.date + r.line} className="row-click" onClick={() => setDetail(r)}>
                    <td className="th">{thaiDate(r.date)}</td><td className="th">{TYPE_TH[r.line] ?? `จ่ายเคลม${lineLabel(r.line)}`}{r.items.length > 1 && <span className="muted"> · {r.items.length} รายการ</span>}</td><td>{fmtBaht(r.amount)}</td>
                    <td><Pill tone="wait">รอดำเนินการ</Pill></td>
                    <td><Menu items={[
                      { label: "ดูรายการเคลม", onClick: () => setDetail(r) },
                      { label: "ดูผลต่อเงินสด", onClick: () => nav("/forecast") },
                      { label: "จำลองเลื่อนจ่าย/เคลมเพิ่ม", onClick: () => nav("/scenario") },
                    ]} /></td>
                  </tr>
                ))}
                {!upcoming.length && <tr><td colSpan={5} className="muted" style={{ textAlign: "center" }}>ไม่มีรายการกำหนดจ่ายในช่วงนี้</td></tr>}
              </tbody>
            </table>
            <div className="foot"><Link to="/claims?due=1" className="link">ดูรายการทั้งหมด <I.ArrowRight size={15} /></Link></div>
          </section>
        </div>

        <aside className="card concierge">
          <ConciergePanel />
          <WhatIf />
        </aside>
      </div>
      {detail && (
        <Modal title={`จ่ายเคลม${lineLabel(detail.line)} · ${thaiDate(detail.date)}`} onClose={() => setDetail(null)}
          footer={<><button className="btn btn-ghost mbtn" onClick={() => setDetail(null)}>ปิด</button><button className="btn mbtn" onClick={() => nav(`/claims?q=${detail.items[0].claim_id}`)}>เปิดในหน้าวิเคราะห์เคลม</button></>}>
          <table className="tbl mtbl">
            <thead><tr><th>รหัสเคลม</th><th>สถานะ</th><th style={{ textAlign: "right" }}>จำนวนเงิน</th></tr></thead>
            <tbody>{[...detail.items].sort((a, b) => b.amount - a.amount).map((x) => <tr key={x.claim_id}><td>{x.claim_id}</td><td className="th">{STATUS_TH[claimById.get(x.claim_id)?.status ?? ""] ?? "-"}</td><td style={{ textAlign: "right" }}>{fmtBaht(x.amount)}</td></tr>)}</tbody>
          </table>
          <p className="muted" style={{ marginTop: 10 }}>รวม {fmtBaht(detail.items.reduce((a, x) => a + x.amount, 0))} · ข้อมูลจาก Payment System (scheduled)</p>
        </Modal>
      )}
    </>
  );
}
