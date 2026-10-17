import { useState } from "react";
import CashChart, { Legend } from "../components/CashChart";
import { AlertBanner, Kpi, PageHeader, Select } from "../components/Shell";
import * as I from "../components/icons";
import { BAND } from "../data";
import type { Pt } from "../components/CashChart";

const D = (x: number) => 1 + ((x - 344) / 1174) * 29; // mock px → day
const FC: Pt[] = [
  [1, 122], [D(427), 115.4], [D(526), 101.9], [D(596), 89.2], [D(684), 72.4], [D(767), 63.7], [D(843), 51.7],
  [D(945), 43], [D(1084), 32], [D(1294), 43], [D(1435), 51.7], [30, 54.9],
];

const WEEKS = [
  { label: "วันที่ 1–7", cx: 93, inn: 4, out: 25 },
  { label: "วันที่ 8–14", cx: 197, inn: 3, out: 22 },
  { label: "วันที่ 15–21", cx: 300, inn: 3, out: 20 },
  { label: "วันที่ 22–28", cx: 403, inn: 3, out: 15 },
  { label: "วันที่ 29–30", cx: 508, inn: 2, out: 3 },
];

export default function Forecast() {
  const [range, setRange] = useState(30);
  return (
    <>
      <PageHeader title="พยากรณ์เงินสด" />
      <div className="fc-bar">
        <span className="fc-lbl" style={{ width: 72 }}>ช่วงเวลา</span>
        {[30, 60, 90].map((r, i) => (
          <button key={r} className={"seg" + (range === r ? " on" : "")} style={{ width: [93, 85, 84][i], marginRight: [14, 15, 0][i] }} onClick={() => setRange(r)}>{r} วัน</button>
        ))}
        <span className="vsep" style={{ margin: "0 30px 0 29px" }} />
        <span className="fc-lbl" style={{ width: 68 }}>มุมมอง</span>
        <Select w={179} className="sel-43">รายสัปดาห์</Select>
        <button className="btn" style={{ marginLeft: "auto", width: 188, height: 43, gap: 14, fontSize: 16 }}>
          <I.Download size={21} />ส่งออกรายงาน<I.Chevron size={17} />
        </button>
      </div>

      <div className="fc-kpis">
        <Kpi className="big" icon={<I.Wallet size={30} />} label="เงินสดต้นงวด" value="฿120M" sub="ล้านบาท" />
        <Kpi className="big" tone="green" icon={<I.FileIn size={30} />} label="เงินรับคาดการณ์" value="฿15M" sub="ล้านบาท" />
        <Kpi className="big" icon={<I.FileOut size={30} />} label="เงินจ่ายเคลม" value="฿85M" sub="ล้านบาท" />
        <Kpi className="big" tone="amber" icon={<I.Coins size={30} />} label="เงินสดปลายงวด" value="฿50M" sub="ล้านบาท" />
      </div>

      <section className="card chart-card" style={{ height: 359, marginTop: 17 }}>
        <h3 className="card-title" style={{ top: 12 }}>คาดการณ์เงินสด 30 วัน</h3>
        <span className="unit" style={{ position: "absolute", left: 21, top: 47 }}>ล้านบาท</span>
        <AlertBanner className="alert-in">วันที่ 20 เงินสดอาจต่ำกว่าเกณฑ์ <em>฿8M</em></AlertBanner>
        <CashChart
          w={1296} h={320} x0={76} x1={1250} yZero={281} yTop={80} yTickX={53}
          xTicks={[[1, "วันที่ 1"], [D(493), "วันที่ 5"], [D(693), "วันที่ 10"], [D(886), "วันที่ 15"], [D(1085), "วันที่ 20"], [D(1296), "วันที่ 25"], [30, "วันที่ 30"]].map(([d, l]) => ({ day: d as number, label: l as string }))}
          xTickY={308}
          threshold={{ value: 40, color: "#7b8191", label: { x: 78, y: 225, text: "เกณฑ์เงินสำรองขั้นต่ำ ฿40M", size: 14, color: "#2b2f38" } }}
          series={[{ pts: FC, color: "#8b1a24", dashFrom: D(843), big: [1, D(1084), 30], bigR: 6, bigStroke: "#fff", dot: 3.4, band: BAND }]}
          labels={[
            { x: 80, y: 108, text: "฿120M", weight: 700, size: 14 },
            { x: 1270, y: 194, text: "฿50M", weight: 700, size: 14, anchor: "end" },
            { x: 814, y: 268, text: "฿32M", weight: 700, size: 14, anchor: "middle" },
          ]}
          callouts={[{ x: 773, y: 159, w: 128, h: 49, tip: 815, tipY: 226, fill: "#8b1a24", lines: ["ต่ำกว่าเกณฑ์ ฿8M", "วันที่ 20"], size: 13 }]}
        />
        <div className="legend-wrap" style={{ top: 326 }}>
          <Legend gap={28} items={[
            { kind: "line-dot", color: "#8b1a24", label: "เงินสดจริง (ย้อนหลัง)" },
            { kind: "dash", color: "#8b1a24", label: "คาดการณ์เงินสด" },
            { kind: "band", color: "#f9e2e4", label: "ช่วงความไม่แน่นอน" },
            { kind: "thr", color: "#7b8191", label: "เกณฑ์เงินสำรองขั้นต่ำ" },
          ]} />
        </div>
      </section>

      <div className="fc-bottom">
        <section className="card" style={{ position: "relative" }}>
          <h3 className="card-title" style={{ position: "absolute", left: 17, top: 12, fontSize: 18.5 }}>เงินรับและเงินจ่ายรายสัปดาห์ (คาดการณ์)</h3>
          <span className="unit" style={{ position: "absolute", left: 20, top: 46 }}>ล้านบาท</span>
          <svg className="chart" width="574" height="300" viewBox="0 0 574 300" style={{ display: "block" }}>
            {[0, 10, 20, 30, 40].map((t) => (
              <g key={t}>
                <line x1="48" x2="560" y1={215 - t * 3.4} y2={215 - t * 3.4} stroke={t ? "#eceef1" : "#cfd2d7"} />
                <text x="36" y={220 - t * 3.4} textAnchor="end" className="tick" fontSize="13">{t}</text>
              </g>
            ))}
            <line x1="48" x2="48" y1="76" y2="215" stroke="#e3e5e9" />
            {WEEKS.map((w) => (
              <g key={w.label}>
                <rect x={w.cx - 34} y={215 - w.inn * 3.4} width="32" height={w.inn * 3.4} rx="2" fill="#93d3a9" />
                <rect x={w.cx + 1} y={215 - w.out * 3.4} width="34" height={w.out * 3.4} rx="2" fill="#f19aa2" />
                <text x={w.cx - 18} y={215 - w.inn * 3.4 - 9} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#1f2430">฿{w.inn}M</text>
                <text x={w.cx + 18} y={215 - w.out * 3.4 - 9} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#1f2430">฿{w.out}M</text>
                <text x={w.cx} y="241" textAnchor="middle" fontSize="14" className="tick">{w.label}</text>
              </g>
            ))}
          </svg>
          <div className="legend-wrap" style={{ top: 266 }}>
            <Legend gap={26} items={[{ kind: "dot", color: "#93d3a9", label: "เงินรับคาดการณ์" }, { kind: "dot", color: "#f19aa2", label: "เงินจ่ายเคลม (กระแสเงินสด)" }]} />
          </div>
        </section>

        <section className="card fc-sum">
          <h3 className="card-title">รายการกระทบยอดเงินสด (30 วัน)</h3>
          <table className="tbl">
            <thead><tr><th>รายการ</th><th style={{ textAlign: "right" }}>จำนวนเงิน (ล้านบาท)</th></tr></thead>
            <tbody>
              {[["เงินสดต้นงวด", "120"], ["(+) เงินรับคาดการณ์", "15"], ["(-) เงินจ่ายเคลม (กระแสเงินสด)", "85"], ["(-) เงินจ่ายอื่น ๆ", "0"]].map(([a, b]) => (
                <tr key={a}><td className="th">{a}</td><td style={{ textAlign: "right" }}>{b}</td></tr>
              ))}
              <tr className="total"><td className="th">เงินสดปลายงวด</td><td style={{ textAlign: "right" }}>50</td></tr>
            </tbody>
          </table>
          <div className="alert mini"><span className="bang">!</span><span>เงินสดต่ำสุด <b>฿32M</b> ในวันที่ 20</span><span className="bar">|</span><span className="red">ต่ำกว่าเกณฑ์ ฿8M</span></div>
        </section>

        <section className="card fc-ai">
          <div className="cg-head sm"><I.Sparkle size={25} /><h2>AI Concierge</h2><span className="beta">Beta</span></div>
          <div className="ai-strip"><I.Sparkle size={19} /><b>ความเสี่ยงด้านสภาพคล่อง</b></div>
          <p>คาดว่าเงินสดจะลดลงต่อเนื่องถึงวันที่ 20<br />จากการจ่ายเคลมที่สูงในช่วงสัปดาห์ที่ 1–3<br />โดยเงินสดต่ำสุดที่ ฿32M ซึ่งต่ำกว่า<br />เกณฑ์เงินสำรองขั้นต่ำ ฿8M<br />หลังจากนั้นเงินสดจะทยอยเพิ่มขึ้นจากเงินรับ<br />คาดการณ์ และสิ้นงวดที่ ฿50M</p>
          <div className="ai-rec">ข้อแนะนำ</div>
          <ul>
            <li>พิจารณาเลื่อนการจ่ายเคลมบางส่วน<br />ในช่วงสัปดาห์ที่ 2–3</li>
            <li>เตรียมวงเงินสำรองฉุกเฉินอย่างน้อย ฿8M<br />เพื่อรักษาเกณฑ์สภาพคล่อง</li>
          </ul>
        </section>
      </div>
    </>
  );
}
