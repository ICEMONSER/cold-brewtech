import { ReactNode, useState } from "react";
import CashChart, { Legend } from "../components/CashChart";
import { PageHeader, SampleChip, Select } from "../components/Shell";
import * as I from "../components/icons";
import { BAND, BASE, LEGEND_MAIN } from "../data";

type Row = { icon: ReactNode; title: string; desc: string; at: string };
const ROWS: Row[] = [
  { icon: <I.Bars4 size={20} />, title: "พยากรณ์เงินสด 30 วัน", desc: "ประมาณการกระแสเงินสดและสภาพคล่อง", at: "วันนี้ 09:00" },
  { icon: <I.Shield size={21} />, title: "สรุปสินไหม", desc: "สินไหมที่เกิดขึ้น (Incurred) และการจ่ายเงินสด", at: "เมื่อวาน 17:30" },
  { icon: <I.TrendUp size={21} />, title: "วิเคราะห์สถานการณ์เคลม +10%", desc: "ผลกระทบต่อเงินสดและสภาพคล่อง", at: "20 วันที่แล้ว" },
  { icon: <I.Doc size={21} />, title: "ผลการรับประกัน", desc: "เบี้ยประกัน รายจ่าย และอัตราส่วนรวม", at: "เมื่อวาน 10:15" },
];

export default function Reports() {
  const [tab, setTab] = useState(0);
  const [sel, setSel] = useState(0);
  return (
    <>
      <PageHeader title="รายงาน" />
      <div className="rp-tabs">
        <div className="tabs">
          {["รายงานทั้งหมด", "ตั้งเวลาส่ง", "ประวัติการส่ง"].map((t, i) => (
            <button key={t} className={tab === i ? "on" : ""} onClick={() => setTab(i)} style={{ marginLeft: [18, 51, 49][i] }}>{t}</button>
          ))}
        </div>
        <button className="btn rp-new"><I.Plus size={22} />สร้างรายงาน</button>
      </div>

      <div className="rp">
        <div>
          <div className="rp-filters">
            <div><div className="field-label">ช่วงเวลา</div><Select icon={<I.Calendar size={21} />} w={194} className="sel-43">30 วันข้างหน้า</Select></div>
            <div><div className="field-label">ประเภทรายงาน</div><Select w={156} className="sel-43">ทั้งหมด</Select></div>
            <label className="search rp-search"><I.Search size={21} /><input placeholder="ค้นหารายงาน..." /></label>
          </div>
          <section className="card rp-list">
            <div className="rp-head"><span>ชื่อรายงาน</span><span>ข้อมูล ณ <span className="sort">⇅</span></span><span>สถานะ</span><span>รูปแบบ</span><span>ดำเนินการ</span></div>
            {ROWS.map((r, i) => (
              <div key={r.title} className={"rp-row" + (sel === i ? " on" : "")} onClick={() => setSel(i)} style={{ height: [90, 100, 116, 96][i] }}>
                <span className="rp-ico">{r.icon}</span>
                <div className="rp-name"><b>{r.title}</b><small>{r.desc}</small></div>
                <span className="rp-at">{r.at}</span>
                <span className="pill ready">พร้อมใช้งาน</span>
                <span className="pill fmt">PDF, Excel</span>
                <button className="mini-btn eye" aria-label="ดู"><I.Eye size={16} />ดู</button>
                <button className="mini-btn"><I.Download size={15} />ดาวน์โหลด</button>
                <button className="dots" aria-label="เพิ่มเติม"><I.Dots size={18} /></button>
              </div>
            ))}
          </section>
        </div>

        <section className="card rp-prev">
          <div className="rp-title">
            <span style={{ color: "#8b1a24", display: "inline-flex" }}><I.Bars4 size={28} /></span>
            <h2>{ROWS[sel].title}</h2>
            <SampleChip small />
            <button className="btn rp-pdf"><I.FilePdf size={20} />ดาวน์โหลด PDF</button>
            <button className="btn btn-outline rp-xls"><I.FileXls size={20} />ดาวน์โหลด Excel</button>
          </div>
          <div className="rp-desc">ประมาณการกระแสเงินสดและสภาพคล่องในอีก 30 วันข้างหน้า</div>
          <div className="rp-meta"><span>ข้อมูล ณ: วันนี้ 09:00</span><span>รูปแบบ: PDF, Excel</span></div>

          <div className="card rp-chart chart-card">
            <h3 className="card-title" style={{ left: 15, top: 9, fontSize: 18.5 }}>คาดการณ์เงินสด 30 วัน</h3>
            <span className="unit" style={{ position: "absolute", left: 15, top: 44, fontSize: 13 }}>ล้านบาท</span>
            <CashChart
              w={644} h={270} x0={64} x1={613} yZero={225} yTop={70} yTickX={39} tickSize={13}
              xTicks={[{ day: 1, label: "วันที่ 1" }, { day: 10, label: "วันที่ 10" }, { day: 20, label: "วันที่ 20" }, { day: 30, label: "วันที่ 30" }]}
              xTickY={249}
              threshold={{ value: 40, label: { x: 64, y: 181, text: "เกณฑ์เงินสำรองขั้นต่ำ ฿40M", size: 13, color: "#2b2f38" } }}
              series={[{ pts: BASE, color: "#8b1a24", big: [1, 19.7, 30], bigR: 5.5, bigStroke: "#fff", dot: 3, band: BAND }]}
              labels={[
                { x: 64, y: 93, text: "฿120M", weight: 700, size: 13.5 },
                { x: 629, y: 156, text: "฿50M", weight: 700, size: 13.5, anchor: "end" },
                { x: 444, y: 219, text: "฿32M", weight: 700, size: 13.5, anchor: "middle" },
              ]}
              callouts={[{ x: 372, y: 117, w: 116, h: 44, tip: 422, tipY: 183, fill: "#8b1a24", lines: ["ต่ำกว่าเกณฑ์ 8M", "วันที่ 20"], size: 12 }]}
            />
            <div className="legend-wrap" style={{ top: 271 }}><Legend items={LEGEND_MAIN} gap={34} /></div>
          </div>

          <h3 className="rp-sub">สรุปตัวเลขสำคัญ</h3>
          <div className="rp-k4">
            {[[<I.Wallet size={18} />, "rose", "เงินสดต้นงวด", "฿120M"], [<I.ArrowUp size={18} />, "green", "เงินสดรับรวม", "฿15M"], [<I.ArrowDown size={18} />, "rose", "เงินสดจ่ายสินไหม", "฿85M"], [<I.Bars4 size={18} />, "rose", "เงินสดปลายงวด", "฿50M"]].map(([ic, tone, l, v]) => (
              <div key={l as string} className="rk"><span className={"kpi-ico " + tone}>{ic}</span><div><small>{l}</small><b>{v}</b></div></div>
            ))}
          </div>
          <div className="rp-k2">
            <div className="rk big"><span className="kpi-ico rose"><I.Shield size={24} /></span><div><small>ต่ำกว่าเกณฑ์</small><b>฿8M</b><em>ต่ำกว่าเงินสำรองขั้นต่ำ</em></div></div>
            <div className="rk big"><span className="kpi-ico rose"><I.CalendarGrid size={24} /></span><div><small>วันที่ต่ำสุด</small><b className="th">วันที่ 20</b><em>เงินสดต่ำสุด ฿32M</em></div></div>
          </div>
          <div className="rp-sched">
            <div className="rs-h"><I.Clock size={22} /><b>การตั้งเวลาส่งรายงาน</b></div>
            <div className="rs-b">
              <div><small>ความถี่</small><span>ทุกวันจันทร์ 09:00</span></div>
              <div><small>ผู้รับ</small><span>ทีม Finance</span></div>
              <div className="rs-st"><small>สถานะ</small><span><i />ยังไม่เปิดใช้งาน</span></div>
              <button className="btn btn-outline rs-btn"><I.Gear size={18} />ตั้งค่าการส่ง</button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
