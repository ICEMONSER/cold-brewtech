import { useState } from "react";
import { Link } from "react-router-dom";
import CashChart, { Legend } from "../components/CashChart";
import { AlertBanner, Kpi, PageHeader, Pill } from "../components/Shell";
import * as I from "../components/icons";
import { BASE, BAND, LEGEND_MAIN, SHOCK_STOPS } from "../data";

const UPCOMING = [
  ["5 พ.ย. 2567", "จ่ายเคลมรถยนต์ (Motor)", "฿12,000,000"],
  ["12 พ.ย. 2567", "จ่ายเคลมสุขภาพ (Health)", "฿25,000,000"],
  ["20 พ.ย. 2567", "จ่ายเคลมทรัพย์สิน (Property)", "฿18,000,000"],
];

export default function Overview() {
  return (
    <>
      <PageHeader title="ภาพรวมกระแสเงินสด" />
      <div className="ov">
        <div className="ov-left">
          <AlertBanner>วันที่ 20 เงินสดอาจต่ำกว่าเกณฑ์ <em>฿8M</em></AlertBanner>
          <div className="kpi4">
            <Kpi icon={<I.Wallet size={24} />} label="เงินสดที่ใช้ได้" value="฿120M" />
            <Kpi icon={<I.Doc size={24} />} label="คาดการณ์จ่ายเคลม" value="฿85M" />
            <Kpi icon={<I.BarsSolid size={21} />} label="เงินสดปลายงวด" value="฿50M" />
            <Kpi icon={<I.Shield size={24} />} label="เงินสำรองขั้นต่ำ" value="฿40M" />
          </div>

          <section className="card chart-card" style={{ height: 410 }}>
            <h3 className="card-title">คาดการณ์เงินสด 30 วัน</h3>
            <span className="unit" style={{ position: "absolute", left: 21, top: 57 }}>ล้านบาท</span>
            <CashChart
              w={870} h={360} x0={72} x1={835} yZero={318} yTop={90} yTickX={45}
              xTicks={[{ day: 1, label: "วันที่ 1" }, { day: 10, label: "วันที่ 10" }, { day: 20, label: "วันที่ 20" }, { day: 30, label: "วันที่ 30" }]}
              xTickY={346}
              threshold={{ value: 40, label: { x: 74, y: 256, text: "เกณฑ์เงินสำรองขั้นต่ำ ฿40M", size: 14, color: "#2b2f38" } }}
              series={[{ pts: BASE, color: "#8b1a24", big: [1, 19.7, 30], bigR: 6, bigStroke: "#fff", dot: 3.4, band: BAND }]}
              labels={[
                { x: 76, y: 125, text: "฿120M", weight: 700, size: 14 },
                { x: 854, y: 227, text: "฿50M", weight: 700, size: 14, anchor: "end" },
                { x: 568, y: 299, text: "฿32M", weight: 700, size: 14, anchor: "middle" },
              ]}
              callouts={[{ x: 550, y: 195, w: 119, h: 42, tip: 567, tipY: 258, fill: "#8b1a24", lines: ["ต่ำกว่าเกณฑ์ ฿8M", "วันที่ 20"], size: 12 }]}
            />
            <div className="legend-wrap" style={{ top: 375 }}>
              <Legend items={LEGEND_MAIN} gap={22} />
            </div>
          </section>

          <section className="card ov-table">
            <h3 className="card-title">รายการจ่ายที่กำลังจะถึง</h3>
            <table className="tbl">
              <colgroup><col style={{ width: 144 }} /><col style={{ width: 317 }} /><col style={{ width: 163 }} /><col /><col style={{ width: 60 }} /></colgroup>
              <thead><tr><th>วันที่</th><th>ประเภท</th><th>จำนวนเงิน</th><th>สถานะ</th><th /></tr></thead>
              <tbody>
                {UPCOMING.map((r) => (
                  <tr key={r[0]}>
                    <td className="th">{r[0]}</td><td className="th">{r[1]}</td><td>{r[2]}</td>
                    <td><Pill tone="wait">รอดำเนินการ</Pill></td>
                    <td><button className="dots" aria-label="เพิ่มเติม"><I.Dots size={18} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="foot"><Link to="/claims" className="link">ดูรายการทั้งหมด <I.ArrowRight size={15} /></Link></div>
          </section>
        </div>

        <Concierge />
      </div>
    </>
  );
}

function Concierge() {
  const [shock, setShock] = useState(2);
  const pos = (i: number) => SHOCK_STOPS[i].at;
  return (
    <aside className="card concierge">
      <div className="cg-head"><I.Sparkle size={32} /><h2>AI Concierge</h2><span className="beta">Beta</span></div>
      <div className="cg-q"><span className="who"><I.User size={24} /></span><div className="bubble-q">เดือนนี้ต้องเตรียมเงินเพิ่มเท่าไร?</div></div>
      <div className="cg-a">
        <span className="cg-avatar"><I.Leaf size={20} /></span>
        <div className="bubble-a">
          <p>คาดว่าเงินสดจะต่ำกว่าเกณฑ์ 8 ล้านบาท ในวันที่ 20 โปรดตรวจสอบกำหนดรับเงินประกันภัยต่อ</p>
          <hr />
          <div className="src-h">แหล่งข้อมูล</div>
          <div className="src"><I.Doc size={18} /><Link to="/claims">ข้อมูลเคลม</Link><span className="sep">•</span><Link to="/forecast">แผนรับจ่าย</Link></div>
          <div className="fb"><button aria-label="มีประโยชน์"><I.ThumbUp /></button><button aria-label="ไม่มีประโยชน์"><I.ThumbDown /></button></div>
        </div>
      </div>
      <div className="sugg">
        {["มีวิธีเพิ่มสภาพคล่องอะไรบ้าง?", "ถ้าเลื่อนจ่ายเคลมบางรายการได้หรือไม่?", "ความเสี่ยงหลักที่ทำให้เงินสดต่ำกว่าเกณฑ์คืออะไร?"].map((q) => (
          <button key={q}>{q}<I.ChevronRight size={18} /></button>
        ))}
      </div>
      <form className="ask" onSubmit={(e) => e.preventDefault()}>
        <input placeholder="ถามเกี่ยวกับกระแสเงินสด..." aria-label="ถามเกี่ยวกับกระแสเงินสด" />
        <button aria-label="ส่ง"><I.Send size={20} /></button>
      </form>
      <div className="whatif">
        <div className="whatif-head">
          <span className="ico"><I.Bars4 size={22} /></span>
          <b>หากยอดเคลมเพิ่มขึ้น</b>
          <span className="i-mark"><I.Info size={18} /></span>
          <span className="pct">{SHOCK_STOPS[shock].label}</span>
        </div>
        <div style={{ padding: "16px 6px 0" }}>
          <div className="slider" style={{ width: 338 }}>
            <div className="track" />
            <div className="fill" style={{ width: pos(shock) }} />
            <div className="knob" style={{ left: pos(shock) }} />
            <input type="range" min={0} max={SHOCK_STOPS.length - 1} value={shock} onChange={(e) => setShock(+e.target.value)} aria-label="ยอดเคลมเพิ่มขึ้น" />
          </div>
          <div className="ticks" style={{ marginTop: 4, width: 338 }}>
            {SHOCK_STOPS.map((s) => <span key={s.label} style={{ left: s.at }}>{s.label}</span>)}
          </div>
        </div>
        <Link to="/scenario" className="btn" style={{ width: "100%", height: 42, marginTop: 23 }}>จำลองผลกระทบ</Link>
      </div>
    </aside>
  );
}
