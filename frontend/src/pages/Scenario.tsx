import { useMemo, useState } from "react";
import CashChart, { Legend, Pt } from "../components/CashChart";
import { PageHeader } from "../components/Shell";
import * as I from "../components/icons";

/* Base-case path read from the reference chart (px → day/฿M), then the scenario is derived from it. */
const DX = (x: number) => 1 + ((x - 620) / 563) * 29;
const BASE: Pt[] = [
  [1, 120], [DX(703), 110], [DX(746), 98], [DX(795), 85], [DX(877), 63], [DX(939), 49], [DX(971), 32],
  [DX(1016), 37], [DX(1077), 42.5], [DX(1140), 48], [30, 50],
];
const OPEN = 120, RECEIPTS = 15, CLAIMS = 85, BASE_CLOSE = 50, BASE_MIN = 32;

function calc(shock: number, delay: number, reserve: number) {
  const extra = (CLAIMS * shock) / 100; // additional claim payments
  const late = (RECEIPTS * delay) / 30; // receipts pushed past day 30
  const f = (d: number) => 0.45 + 0.55 * Math.min(1, (d - 1) / 18); // extra claims are paid before day 20
  const pts: Pt[] = BASE.map(([d, v]) => [d, v - extra * f(d) - (late * (d - 1)) / 29]);
  const min = Math.min(...pts.map((p) => p[1]));
  const close = pts[pts.length - 1][1];
  return { extra, close, min, short: Math.max(0, reserve - min), baseShort: Math.max(0, reserve - BASE_MIN), pts, late };
}

const fm = (v: number) => (Math.round(v * 10) / 10).toString();
const SHOCK_POS = (v: number) => ((v + 20) / 40) * 86; // knob scale as drawn in the reference
const DELAY_TICKS = [[0, 2], [7, 25.5], [14, 47.5], [21, 72], [30, 96.5]];

export default function Scenario() {
  const [shock, setShock] = useState(10);
  const [delay, setDelay] = useState(0);
  const [reserve, setReserve] = useState(40);
  const [applied, setApplied] = useState({ shock: 10, delay: 0, reserve: 40 });
  const [saved, setSaved] = useState(false);
  const r = useMemo(() => calc(applied.shock, applied.delay, applied.reserve), [applied]);
  const sign = (v: number) => (v > 0 ? "+" : "") + fm(v);
  const diff = (v: number) => (Math.abs(v) < 0.05 ? "-" : sign(v));

  const Y = (v: number) => 250 - (v / 160) * 177;
  const X = (d: number) => 63 + ((d - 1) / 29) * 563;
  const minDay = DX(971);
  const sMin = r.pts.find(([d]) => d === minDay)![1];

  return (
    <>
      <PageHeader title="จำลองสถานการณ์" selects={[196, 214]} gap={98} />
      <div className="sc">
        <aside className="card sc-left">
          <h2>การเปลี่ยนแปลงสมมติฐาน</h2>
          <div className="sub">ปรับสมมติฐานเพื่อดูผลกระทบต่อกระแสเงินสด</div>

          <div className="sc-block raised">
            <div className="sc-lbl">ยอดจ่ายเคลมเพิ่มขึ้น <span className="i-mark"><I.Info size={17} /></span><span className="pct">{shock > 0 ? "+" : ""}{shock}%</span></div>
            <div className="slider sc-slider">
              <div className="track" /><div className="fill" style={{ width: `${SHOCK_POS(shock)}%` }} /><div className="knob" style={{ left: `${SHOCK_POS(shock)}%` }} />
              <input type="range" min={-20} max={20} step={1} value={shock} onChange={(e) => setShock(+e.target.value)} aria-label="ยอดจ่ายเคลมเพิ่มขึ้น" />
            </div>
            <div className="ticks sc-ticks">{["-20%", "-10%", "0%", "+10%", "+20%"].map((t, i) => <span key={t} style={{ left: `${[4, 25, 50.5, 75.5, 96][i]}%` }}>{t}</span>)}</div>
          </div>

          <div className="sc-block">
            <div className="sc-lbl">เงินรับล่าช้า <span className="i-mark"><I.Info size={17} /></span><span className="pct">{delay} วัน</span></div>
            <div className="slider sc-slider">
              <div className="track" /><div className="fill" style={{ width: `${(delay / 30) * 100}%` }} /><div className="knob" style={{ left: `calc(${(delay / 30) * 100}% + ${delay ? 0 : 4}px)` }} />
              <input type="range" min={0} max={30} value={delay} onChange={(e) => setDelay(+e.target.value)} aria-label="เงินรับล่าช้า (วัน)" />
            </div>
            <div className="ticks sc-ticks">{DELAY_TICKS.map(([t, p]) => <span key={t} style={{ left: `${p}%` }}>{t}</span>)}</div>
          </div>

          <div className="sc-block reserve">
            <div className="sc-lbl">เงินสำรองขั้นต่ำ <span className="i-mark"><I.Info size={17} /></span></div>
            <div className="input"><input type="number" value={reserve} onChange={(e) => setReserve(+e.target.value || 0)} aria-label="เงินสำรองขั้นต่ำ (ล้านบาท)" /><span className="suffix">ล้านบาท</span></div>
            <div className="hint" style={{ marginTop: 9 }}>ช่วงแนะนำ 30 – 60 ล้านบาท</div>
          </div>

          <button className="btn sc-btn" onClick={() => { setApplied({ shock, delay, reserve }); setSaved(false); }}><I.Calculator size={22} />คำนวณสถานการณ์</button>
          <button className="btn btn-ghost sc-btn2" onClick={() => { setShock(10); setDelay(0); setReserve(40); setApplied({ shock: 10, delay: 0, reserve: 40 }); }}><I.Reset size={20} />รีเซ็ต</button>
        </aside>

        <div className="sc-mid">
          <section className="card sc-res">
            <h2>ผลการจำลองสถานการณ์</h2>
            <div className="sub">เปรียบเทียบกับกรณีฐาน (Base Case)</div>
            <div className="sc-note"><span className="bang">!</span><div><b>ตัวอย่างสมมติ: จ่ายส่วนเพิ่มก่อนวันที่ 20</b><div>ผลลัพธ์เป็นการประมาณการ ไม่รับประกันว่าจะเกิดขึ้นจริง</div></div></div>
            <div className="sc-kpis">
              <div className="sk"><div className="sk-h"><span className="kpi-ico rose"><I.Wallet size={22} /></span><span>เงินสดคงเหลือสิ้นสุด<br />(วันที่ 30)</span></div>
                <div className="sk-2"><div><small>กรณีฐาน</small><b>฿{fm(BASE_CLOSE)}M</b></div><div><small>สถานการณ์</small><b>฿{fm(r.close)}M</b></div></div></div>
              <div className="sk"><div className="sk-h"><span className="kpi-ico rose"><I.Doc size={22} /></span><span>ยอดจ่ายเคลมส่วนเพิ่ม<br /><small>(จาก {sign(applied.shock)}%)</small></span></div>
                <div className="sk-1"><b>฿{fm(r.extra)}M</b><small>คำนวณจาก ฿85M × {Math.abs(applied.shock)}%</small></div></div>
              <div className="sk"><div className="sk-h"><span className="kpi-ico rose"><I.ChartLine size={22} /></span><span>เงินสดต่ำสุด<br /><small className="lg">(ระหว่าง 30 วัน)</small></span></div>
                <div className="sk-2"><div><small>กรณีฐาน</small><b>฿{fm(BASE_MIN)}M</b></div><div><small>สถานการณ์</small><b className="red">฿{fm(r.min)}M</b></div></div></div>
              <div className="sk"><div className="sk-h"><span className="kpi-ico rose"><I.Shield size={22} /></span><span>ขาดจากเงินสำรองขั้นต่ำ</span></div>
                <div className="sk-2"><div><small>กรณีฐาน</small><b>฿{fm(r.baseShort)}M</b></div><div><small>สถานการณ์</small><b className="red">฿{fm(r.short)}M</b></div></div></div>
            </div>
          </section>

          <div className="sc-grid">
            <section className="card chart-card sc-chart">
              <h3 className="card-title" style={{ top: 13 }}>คาดการณ์เงินสด 30 วัน</h3>
              <span className="unit" style={{ position: "absolute", left: 17, top: 47 }}>ล้านบาท</span>
              <CashChart
                w={664} h={300} x0={63} x1={626} yZero={250} yTop={73} yTickX={40} tickSize={13.5}
                xTicks={[{ day: 1, label: "วันที่ 1" }, { day: DX(793), label: "วันที่ 10" }, { day: minDay, label: "วันที่ 20" }, { day: 30, label: "วันที่ 30" }]}
                xTickY={276}
                threshold={{ value: applied.reserve, color: "#7b8191", label: { x: 66, y: Y(applied.reserve) - 7, text: `เงินสำรองขั้นต่ำ ฿${applied.reserve}M`, size: 13.5, color: "#2b2f38" } }}
                series={[
                  { pts: BASE, color: "#8b1a24", dot: 3.4, big: [1, minDay, 30], bigR: 5.5, bigStroke: "#fff", band: { color: "#f9e4e6", half: (d) => 6 + 3 * Math.sin((Math.PI * (d - 1)) / 29) } },
                  { pts: r.pts, color: "#f39a1e", dot: 3.4, big: [1, minDay, 30], bigR: 5.5, bigStroke: "#fff", band: { color: "#fdebd2", half: (d) => 4 + 3 * Math.sin((Math.PI * (d - 1)) / 29), opacity: 0.7 } },
                ]}
                labels={[
                  { x: 70, y: 100, text: "฿120M", weight: 700, size: 13.5 },
                  { x: 649, y: 170, text: `฿${fm(BASE_CLOSE)}M`, weight: 700, size: 13.5, anchor: "end" },
                  { x: 653, y: Y(r.close) + 18, text: `฿${fm(r.close)}M`, weight: 700, size: 13.5, anchor: "end", color: "#e8890c" },
                ]}
                callouts={[{ x: 391, y: 156, w: 80, h: 42, tip: X(minDay), tipY: Y(BASE_MIN) - 7, fill: "#8b1a24", lines: ["กรณีฐาน", `฿${fm(BASE_MIN)}M`], size: 12.5 }]}
              >
                <g>
                  <path d={`M${X(minDay) + 3},${Y(sMin) + 1} L${436},${215} H${516} v39 H${436} V${226} Z`} fill="#f2a530" />
                  <text x="476" y="230" textAnchor="middle" fill="#fff" fontSize="12.5">สถานการณ์</text>
                  <text x="476" y="248" textAnchor="middle" fill="#fff" fontSize="12.5" fontWeight="600">฿{fm(r.min)}M</text>
                </g>
              </CashChart>
              <div className="legend-wrap" style={{ top: 297 }}>
                <Legend gap={26} items={[
                  { kind: "line-dot", color: "#8b1a24", label: "กรณีฐาน (Base Case)" },
                  { kind: "line-dot", color: "#f39a1e", label: `สถานการณ์ (${sign(applied.shock)}%)` },
                  { kind: "thr", color: "#7b8191", label: "เงินสำรองขั้นต่ำ" },
                ]} />
              </div>
            </section>

            <aside className="card sc-src">
              <div className="src-head"><BulbIcon /><div><h3>ตรวจสอบแหล่งเงินสำรอง</h3><div className="sub">พิจารณาทางเลือกเพื่อรองรับเงินสดที่ขาด</div></div></div>
              <div className="danger">
                <span className="d-ico"><I.Shield size={26} /></span>
                <div><b>ในสถานการณ์นี้ เงินสดต่ำสุดต่ำกว่าเงินสำรองขั้นต่ำ {fm(r.short)} ล้านบาท</b><p>ควรพิจารณาจัดหาแหล่งเงินสำรองเพิ่มเติมเพื่อลดความเสี่ยงด้านสภาพคล่อง</p></div>
              </div>
              {[
                [<I.Bag />, "ใช้วงเงินสินเชื่อระยะสั้น", "ตรวจสอบวงเงินคงเหลือและเงื่อนไข"],
                [<I.ClipCalc />, "ขายสินทรัพย์การลงทุนบางส่วน", "พิจารณาสภาพคล่องของสินทรัพย์"],
                [<I.ClipClock />, "ชะลอการจ่ายรายจ่ายที่ไม่จำเป็น", "ทบทวนแผนรายจ่ายระยะสั้น"],
                [<I.Cursor />, "เร่งรับชำระเบี้ยประกัน", "ติดตามลูกหนี้และเสนอสิทธิประโยชน์"],
                [<I.ClipCheck />, "ทบทวนระดับเงินสำรองขั้นต่ำ", "พิจารณาให้เหมาะสมกับความเสี่ยง"],
              ].map(([ic, t, s]) => (
                <button key={t as string} className="opt"><span className="o-ico">{ic}</span><span className="o-txt"><b>{t}</b><small>{s}</small></span><I.ChevronRight size={18} /></button>
              ))}
              <div className="sc-warn"><I.Info size={18} /><span>ผลลัพธ์เป็นเพียงการประมาณการ<br />ไม่รับประกันว่าจะเกิดขึ้นจริง กรุณาพิจารณาเพิ่มเติม<br />ร่วมกับคณะกรรมการบริหารความเสี่ยง</span></div>
              <button className="btn sc-save" onClick={() => setSaved(true)}><I.Save size={22} />{saved ? "บันทึกแล้ว" : "บันทึกสถานการณ์"}</button>
            </aside>

            <section className="card sc-cmp">
              <h3 className="card-title">สรุปตัวเลขเปรียบเทียบ <span>(หน่วย: ล้านบาท)</span></h3>
              <table className="tbl">
                <colgroup><col style={{ width: 214 }} /><col style={{ width: 160 }} /><col style={{ width: 196 }} /><col /></colgroup>
                <thead><tr><th>รายการ</th><th className="c">กรณีฐาน (Base Case)</th><th className="c">สถานการณ์ ({sign(applied.shock)}%)</th><th className="c">ผลต่าง</th></tr></thead>
                <tbody>
                  {[
                    ["เงินสดต้นงวด (วันที่ 1)", OPEN, OPEN, ""],
                    ["เงินรับรวม", RECEIPTS, RECEIPTS - r.late, ""],
                    ["จ่ายเคลม (Cash Payment)", CLAIMS, CLAIMS + r.extra, ""],
                    ["รายจ่ายอื่น", 0, 0, ""],
                    ["เงินสดคงเหลือสิ้นสุด (วันที่ 30)", BASE_CLOSE, r.close, "hl b"],
                    ["เงินสดต่ำสุด (ระหว่าง 30 วัน)", BASE_MIN, r.min, "b"],
                    [`ขาดจากเงินสำรองขั้นต่ำ (฿${applied.reserve}M)`, r.baseShort, r.short, "hl b red"],
                  ].map(([l, a, b, cls]) => {
                    const d = (b as number) - (a as number);
                    return (
                      <tr key={l as string} className={cls as string}>
                        <td className="th">{l}</td><td className="c">{(a as number).toFixed(1)}</td>
                        <td className="c s">{(b as number).toFixed(1)}</td>
                        <td className={"c" + (Math.abs(d) >= 0.05 ? " dred" : "")}>{diff(d)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

function BulbIcon() { return <span style={{ display: "inline-flex", marginTop: 2 }}><I.BulbFilled size={30} /></span>; }
