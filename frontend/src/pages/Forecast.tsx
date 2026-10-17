import { useMemo, useState } from "react";
import { Legend } from "../components/CashChart";
import LiveChart from "../components/LiveChart";
import { useReportActions } from "../components/reportActions";
import { Kpi, LiveAlert, PageHeader } from "../components/Shell";
import { Dropdown, Menu } from "../components/ui";
import * as I from "../components/icons";
import { forecastSummary } from "../engine/analytics";
import { weekly } from "../engine/forecast";
import { diffDays, fmtM, mNum } from "../engine/format";
import { useApp } from "../store";

export default function Forecast() {
  const { fc, horizon, setHorizon, ds, today, threshold } = useApp();
  const rep = useReportActions();
  const [view, setView] = useState<"week" | "day">("week");
  const history = useMemo(() => ds.ledger.filter((l) => l.type === "balance" && l.date < today && diffDays(today, l.date) <= 6)
    .map((l) => ({ day: diffDays(l.date, today) + 1, cash: l.amount })).sort((a, b) => a.day - b.day).concat([{ day: 1, cash: fc.opening }]), [ds, today, fc.opening]);
  const bars = useMemo(() => view === "week" ? weekly(fc) : fc.series.slice(1).map((p) => ({ label: `${p.day}`, receipts: p.receipts, claims: p.claims, other: p.other })), [fc, view]);
  const sum = forecastSummary(fc);
  const title = `พยากรณ์เงินสด ${horizon} วัน`;

  // bar chart geometry
  const maxV = Math.max(...bars.map((b) => Math.max(b.receipts, b.claims)), 1);
  const step = [1, 2, 2.5, 5, 10, 20, 25, 50].map((x) => x * 1e6).find((s) => s * 4 >= maxV) ?? Math.ceil(maxV / 4e7) * 1e7;
  const top = step * 4, Yb = (v: number) => 215 - (v / top) * 136;
  const n = bars.length, slot = 512 / n, bw = Math.min(34, slot * 0.34);

  return (
    <>
      <PageHeader title="พยากรณ์เงินสด" />
      <div className="fc-bar">
        <span className="fc-lbl" style={{ width: 72 }}>ช่วงเวลา</span>
        {[30, 60, 90].map((r, i) => (
          <button key={r} className={"seg" + (horizon === r ? " on" : "")} style={{ width: [93, 85, 84][i], marginRight: [14, 15, 0][i] }} onClick={() => setHorizon(r)}>{r} วัน</button>
        ))}
        <span className="vsep" style={{ margin: "0 30px 0 29px" }} />
        <span className="fc-lbl" style={{ width: 68 }}>มุมมอง</span>
        <Dropdown label="มุมมอง" w={179} className="sel-43" value={view} onChange={setView} options={[{ value: "week", label: "รายสัปดาห์" }, { value: "day", label: "รายวัน" }]} />
        <div style={{ marginLeft: "auto" }}>
          <Menu label="ส่งออกรายงาน" trigger={<button className="btn" style={{ width: 188, height: 43, gap: 14, fontSize: 16 }}><I.Download size={21} />ส่งออกรายงาน<I.Chevron size={17} /></button>} items={[
            { label: "Excel (.xlsx)", onClick: () => rep.xlsx("forecast", title) },
            { label: "PDF (พิมพ์/บันทึก)", onClick: () => rep.pdf("forecast", title) },
            { label: "CSV รายวัน", onClick: () => rep.csv("forecast", title) },
          ]} />
        </div>
      </div>

      <div className="fc-kpis">
        <Kpi className="big" icon={<I.Wallet size={30} />} label="เงินสดต้นงวด" value={fmtM(fc.opening)} sub="ล้านบาท" />
        <Kpi className="big" tone="green" icon={<I.FileIn size={30} />} label="เงินรับคาดการณ์" value={fmtM(fc.totals.receipts)} sub="ล้านบาท" />
        <Kpi className="big" icon={<I.FileOut size={30} />} label="เงินจ่ายเคลม" value={fmtM(fc.totals.claims)} sub="ล้านบาท" />
        <Kpi className="big" tone="amber" icon={<I.Coins size={30} />} label="เงินสดปลายงวด" value={fmtM(fc.closing)} sub="ล้านบาท" />
      </div>

      <section className="card chart-card" style={{ height: 359, marginTop: 17 }}>
        <h3 className="card-title" style={{ top: 12 }}>คาดการณ์เงินสด {horizon} วัน</h3>
        <span className="unit" style={{ position: "absolute", left: 21, top: 47 }}>ล้านบาท</span>
        <LiveAlert className="alert-in" />
        <LiveChart w={1296} h={320} x0={76} x1={1250} yZero={281} yTop={80} yTickX={53} xTickY={308} threshold={threshold} history={history}
          series={[{ pts: fc.series, color: "#8b1a24", band: "#f9e4e6", dashed: true }]} />
        <div className="legend-wrap" style={{ top: 326 }}>
          <Legend gap={20} items={[
            { kind: "line-dot", color: "#8b1a24", label: "เงินสดจริง (ย้อนหลัง)" },
            { kind: "dash", color: "#8b1a24", label: "คาดการณ์เงินสด" },
            { kind: "band", color: "#f9e2e4", label: "ช่วงความไม่แน่นอน" },
            { kind: "thr", color: "#7b8191", label: "เกณฑ์เงินสำรองขั้นต่ำ" },
            { kind: "band", color: "#f3b3b5", label: "ต่ำกว่าเกณฑ์" },
          ]} />
        </div>
      </section>

      <div className="fc-bottom">
        <section className="card" style={{ position: "relative" }}>
          <h3 className="card-title" style={{ position: "absolute", left: 17, top: 12, fontSize: 18.5 }}>เงินรับและเงินจ่าย{view === "week" ? "รายสัปดาห์" : "รายวัน"} (คาดการณ์)</h3>
          <span className="unit" style={{ position: "absolute", left: 20, top: 46 }}>ล้านบาท</span>
          <svg className="chart" width="574" height="300" viewBox="0 0 574 300" style={{ display: "block" }}>
            {[0, 1, 2, 3, 4].map((k) => (
              <g key={k}>
                <line x1="48" x2="560" y1={Yb(k * step)} y2={Yb(k * step)} stroke={k ? "#eceef1" : "#cfd2d7"} />
                <text x="36" y={Yb(k * step) + 5} textAnchor="end" className="tick" fontSize="13">{mNum(k * step)}</text>
              </g>
            ))}
            <line x1="48" x2="48" y1={Yb(top)} y2="215" stroke="#e3e5e9" />
            {bars.map((w, i) => {
              const cx = 48 + slot * (i + 0.5);
              const week = view === "week";
              // x labels: full "วันที่ 1–7" when there is room, otherwise "ส.1", "ส.2"… (full text in the tooltip)
              const short = week && slot < 90;
              const lbl = week ? (!short || slot >= 26 || i % 2 === 0) : (i + 1) % Math.ceil(n / 10) === 0 || i === 0;
              // value labels only when they fit; nudge the two labels apart and stack them if they still collide
              const showVals = week && slot >= 70;
              const gap = 4, xr = cx - gap / 2 - bw / 2, xc = cx + gap / 2 + bw / 2;
              const tr = fmtM(w.receipts, 0), tc = fmtM(w.claims, 0);
              const est = (t: string) => t.length * 7.8;
              let yr = Yb(w.receipts) - 9, yc = Yb(w.claims) - 9;
              if (xc - xr < (est(tr) + est(tc)) / 2 + 2 && Math.abs(yr - yc) < 14) { if (yr >= yc) yr = yc - 14; else yc = yr - 14; }
              return (
                <g key={w.label}>
                  <title>{`${week ? w.label : "วันที่ " + w.label}: รับ ${fmtM(w.receipts)} · จ่ายเคลม ${fmtM(w.claims)}`}</title>
                  <rect x={cx - gap / 2 - bw} y={Yb(w.receipts)} width={bw} height={215 - Yb(w.receipts)} rx="2" fill="#93d3a9" />
                  <rect x={cx + gap / 2} y={Yb(w.claims)} width={bw} height={215 - Yb(w.claims)} rx="2" fill="#f19aa2" />
                  {showVals && <>
                    <text x={xr} y={yr} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#1f2430">{tr}</text>
                    <text x={xc} y={yc} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#1f2430">{tc}</text>
                  </>}
                  {lbl && <text x={cx} y="241" textAnchor="middle" fontSize={week ? (short ? 12.5 : 14) : 12} className="tick">{short ? `ส.${i + 1}` : w.label}</text>}
                </g>
              );
            })}
          </svg>
          <div className="legend-wrap" style={{ top: 266 }}>
            <Legend gap={26} items={[{ kind: "dot", color: "#93d3a9", label: "เงินรับคาดการณ์" }, { kind: "dot", color: "#f19aa2", label: "เงินจ่ายเคลม (กระแสเงินสด)" }]} />
          </div>
        </section>

        <section className="card fc-sum">
          <h3 className="card-title">รายการกระทบยอดเงินสด ({horizon} วัน)</h3>
          <table className="tbl">
            <thead><tr><th>รายการ</th><th style={{ textAlign: "right" }}>จำนวนเงิน (ล้านบาท)</th></tr></thead>
            <tbody>
              {[["เงินสดต้นงวด", fc.opening], ["(+) เงินรับคาดการณ์", fc.totals.receipts], ["(-) เงินจ่ายเคลม (กระแสเงินสด)", fc.totals.claims], ["(-) เงินจ่ายอื่น ๆ", fc.totals.other]].map(([a, b]) => (
                <tr key={a as string}><td className="th">{a}</td><td style={{ textAlign: "right" }}>{mNum(b as number)}</td></tr>
              ))}
              <tr className="total"><td className="th">เงินสดปลายงวด</td><td style={{ textAlign: "right" }}>{mNum(fc.closing)}</td></tr>
            </tbody>
          </table>
          <div className={"alert mini" + (fc.trough.cash < threshold ? "" : " ok")}>
            <span className="bang">{fc.trough.cash < threshold ? "!" : <I.Check size={15} />}</span><span className="mini-txt"><span>Liquidity Headroom ต่ำสุด <b>{fmtM(fc.headroom.min)}</b> ในวันที่ {fc.headroom.minDay}</span>
            <span className={fc.headroom.min < 0 ? "red" : "green"}>{fc.headroom.borrowDay ? `ติดลบตั้งแต่วันที่ ${fc.headroom.firstNegDay} → ต้องกู้ ${fmtM(fc.headroom.need)} ภายในวันที่ ${fc.headroom.borrowDay}` : "ไม่ติดลบ ไม่ต้องกู้"}</span></span>
          </div>
        </section>

        <section className="card fc-ai">
          <div className="cg-head sm"><I.Sparkle size={25} /><h2>AI Concierge</h2><span className="beta">Beta</span></div>
          <div className="ai-strip"><I.Sparkle size={19} /><b>ความเสี่ยงด้านสภาพคล่อง</b></div>
          <p className="wrap">{sum.text}</p>
          <div className="ai-rec">ข้อแนะนำ</div>
          <ul className="wrap">{sum.recs.map((r) => <li key={r}>{r}</li>)}</ul>
        </section>
      </div>
    </>
  );
}
