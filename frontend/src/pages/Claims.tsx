import { Link } from "react-router-dom";
import { Kpi, PageHeader, Pill, Select } from "../components/Shell";
import * as I from "../components/icons";

const LINES = [
  { name: "รถยนต์", pct: "49%", v: 42, cx: 117 },
  { name: "สุขภาพ", pct: "29%", v: 25, cx: 282 },
  { name: "ทรัพย์สิน", pct: "21%", v: 18, cx: 453 },
];

const CLAIMS = [
  ["CLM-240001", "รถยนต์", "฿850,000", "อีก 3 วัน", "ok", "อนุมัติแล้ว"],
  ["CLM-240002", "สุขภาพ", "฿620,000", "อีก 7 วัน", "review", "อยู่ระหว่างพิจารณา"],
  ["CLM-240003", "ทรัพย์สิน", "฿480,000", "อีก 10 วัน", "survey", "สำรวจความเสียหาย"],
  ["CLM-240004", "รถยนต์", "฿320,000", "อีก 14 วัน", "ok", "อนุมัติแล้ว"],
  ["CLM-240005", "สุขภาพ", "฿280,000", "อีก 20 วัน", "doc", "เอกสารเพิ่มเติม"],
];

export default function Claims() {
  const Yb = (v: number) => 240 - v * 2.667; // bar chart, card-relative
  const Yw = (v: number) => 173 - v * 0.73; // waterfall, card-relative
  return (
    <>
      <PageHeader title="วิเคราะห์เคลม" />
      <section className="card filters" style={{ marginTop: -8 }}>
        {[["ประเภทประกัน", "ทั้งหมด", 291], ["สถานะเคลม", "ทั้งหมด", 291], ["ช่วงเวลา", "30 วันข้างหน้า", 307]].map(([l, v, w]) => (
          <div key={l as string}>
            <div className="field-label">{l}</div>
            <Select w={w as number} className="sel-40">{v}</Select>
          </div>
        ))}
      </section>

      <div className="cl-kpis">
        <Kpi className="circ" icon={<I.Doc size={24} />} label="เคลมเปิดอยู่" value="1,240 รายการ" />
        <Kpi className="circ" icon={<I.Coins size={24} />} label="คาดการณ์จ่ายเคลม" value="฿85M" unit="ล้านบาท" />
        <Kpi className="circ" icon={<I.Shield size={24} />} label="ค่าสินไหมเกิดขึ้น" info value="฿75M" unit="ล้านบาท" />
        <Kpi className="circ" icon={<I.Bars4 size={24} />} label="Combined Ratio" info value="105%" />
      </div>

      <div className="cl-row">
        <section className="card rel">
          <h3 className="card-title" style={{ position: "absolute", left: 18, top: 13 }}>คาดการณ์ยอดจ่ายตามประเภท</h3>
          <span className="unit" style={{ position: "absolute", left: 19, top: 44 }}>ล้านบาท</span>
          <svg className="chart" width="560" height="314" viewBox="0 0 560 314" style={{ position: "absolute", left: 0, top: 0 }}>
            {[0, 20, 40, 60].map((t) => (
              <g key={t}>
                <line x1="50" x2="539" y1={Yb(t)} y2={Yb(t)} stroke={t ? "#eceef1" : "#cfd2d7"} />
                <text x="36" y={Yb(t) + 5} textAnchor="end" className="tick" fontSize="14">{t}</text>
              </g>
            ))}
            <line x1="50" x2="50" y1={Yb(60)} y2="240" stroke="#e3e5e9" />
            {[197, 367].map((x) => <line key={x} x1={x} x2={x} y1={Yb(60)} y2="240" stroke="#f0f1f3" />)}
            {LINES.map((l) => (
              <g key={l.name}>
                <rect x={l.cx - 46} y={Yb(l.v)} width="92" height={l.v * 2.667} fill="#8b1a24" />
                <text x={l.cx} y={Yb(l.v) - 11} textAnchor="middle" fontSize="15" fontWeight="700" fill="#16181d">฿{l.v}M</text>
                <text x={l.cx} y="266" textAnchor="middle" fontSize="15" fill="#2b2f38">{l.name}</text>
                <text x={l.cx} y="287" textAnchor="middle" fontSize="14" fill="#5d6370">({l.pct})</text>
              </g>
            ))}
          </svg>
          <div className="total-box">
            <div className="t1">รวมทั้งสิ้น</div>
            <div className="t2">฿85M</div>
            <div className="t3">ล้านบาท</div>
          </div>
        </section>

        <section className="card rel">
          <h3 className="card-title" style={{ position: "absolute", left: 16, top: 14, display: "flex", alignItems: "center", gap: 10 }}>ผลการรับประกัน (Underwriting) <span className="i-mark"><I.Info size={18} /></span></h3>
          <span className="th" style={{ position: "absolute", right: 16, top: 19, fontSize: 14.5, color: "#2b2f38" }}>หน่วย: ล้านบาท</span>
          <svg className="chart" width="535" height="314" viewBox="0 0 535 314" style={{ position: "absolute", left: 0, top: 0 }}>
            {[150, 100, 50, 0, -50].map((t) => (
              <g key={t}>
                <line x1="58" x2="520" y1={Yw(t)} y2={Yw(t)} stroke={t === 0 ? "#c8ccd2" : "#eceef1"} />
                <text x="46" y={Yw(t) + 5} textAnchor="end" className="tick" fontSize="14">{t}</text>
              </g>
            ))}
            <line x1="58" x2="58" y1={Yw(150)} y2={Yw(-50)} stroke="#e3e5e9" />
            <rect x="81" y={Yw(100)} width="70" height={100 * 0.73} fill="#6b111c" />
            <rect x="197" y={Yw(100)} width="70" height={75 * 0.73} fill="#f2a5a8" />
            <rect x="312" y={Yw(33)} width="70" height={33 * 0.73} fill="#f2a5a8" />
            <rect x="428" y={Yw(0)} width="71" height={5 * 0.73 + 2} fill="#ef8f94" />
            <line x1="151" x2="197" y1={Yw(100)} y2={Yw(100)} stroke="#c9ccd2" />
            <line x1="267" x2="312" y1={Yw(25)} y2={Yw(25)} stroke="#c9ccd2" />
            <line x1="267" x2="312" y1={Yw(33)} y2={Yw(33)} stroke="#e1e3e7" />
            <text x="116" y="88" textAnchor="middle" fontSize="15" fontWeight="700" fill="#16181d">฿100M</text>
            <text x="232" y="170" textAnchor="middle" fontSize="14" fill="#b4232c">-฿75M</text>
            <text x="347" y="195" textAnchor="middle" fontSize="14" fill="#b4232c">-฿30M</text>
            <text x="463" y="201" textAnchor="middle" fontSize="14" fill="#b4232c">-฿5M</text>
            {[[116, ["เบี้ยประกัน", "รับรู้รายได้"]], [232, ["ค่าสินไหม", "เกิดขึ้น", "(Underwriting)"]], [347, ["ค่าใช้จ่าย", "ในการรับประกัน"]], [463, ["ผลรับประกัน"]]].map(([x, ls]) => (
              <text key={x as number} x={x as number} y="231" textAnchor="middle" fontSize="13.5" fill="#2b2f38">
                {(ls as string[]).map((l, i) => <tspan key={i} x={x as number} dy={i ? 18 : 0}>{l}</tspan>)}
              </text>
            ))}
          </svg>
          <div className="th" style={{ position: "absolute", left: 18, bottom: 12, fontSize: 13.5, color: "#5d6370" }}>ผลรับประกันไม่รวมรายได้ลงทุน และอาจแตกต่างจากกระแสเงินสดจ่ายเคลม</div>
        </section>
      </div>

      <div className="cl-row b">
        <section className="card cl-table">
          <div className="cl-table-head">
            <h3 className="card-title">รายละเอียดเคลม</h3>
            <label className="search"><I.Search size={19} /><input placeholder="ค้นหารหัสเคลม ประเภท หรือจำนวนเงิน..." /></label>
          </div>
          <table className="tbl">
            <colgroup><col style={{ width: 114 }} /><col style={{ width: 116 }} /><col style={{ width: 150 }} /><col style={{ width: 126 }} /><col /><col style={{ width: 50 }} /></colgroup>
            <thead><tr><th>รหัสเคลม</th><th>ประเภท</th><th>ประมาณการจ่าย<br />(บาท)</th><th>กำหนดจ่าย</th><th>สถานะ</th><th /></tr></thead>
            <tbody>
              {CLAIMS.map((c) => (
                <tr key={c[0]}>
                  <td>{c[0]}</td><td className="th">{c[1]}</td><td style={{ textAlign: "right", paddingRight: 46 }}>{c[2]}</td><td className="th">{c[3]}</td>
                  <td><Pill tone={c[4]}>{c[5]}</Pill></td>
                  <td><button className="dots" aria-label="เพิ่มเติม"><I.Dots size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="foot"><Link to="/claims" className="link">ดูรายการเคลมทั้งหมด <I.ArrowRight size={16} /></Link></div>
        </section>

        <section className="card insights">
          <h3 className="card-title"><span style={{ color: "#8b1a24", display: "inline-flex" }}><I.Bulb size={25} /></span>ข้อมูลเชิงลึก</h3>
          <div className="ins-alert">
            <span className="bang">!</span>
            <div>
              <b>มีเคลมทรัพย์สินมูลค่าสูงที่กำหนดจ่ายในช่วงครึ่งหลัง</b>
              <p>เคลมทรัพย์สินที่มีมูลค่ามากกว่า 1 ล้านบาท จำนวน 2 รายการ กำหนดจ่ายในช่วงวันที่ 18–25 ซึ่งอาจกดดันกระแสเงินสดในระยะสั้น แม้ผลรับประกันโดยรวมยังขาดทุนเล็กน้อยที่ 5 ล้านบาท</p>
            </div>
          </div>
          <div className="ins-item">
            <span className="ins-ico"><I.Bars4 size={21} /></span>
            <div><b>ผลกำไรจากการรับประกัน (Profitability)</b><p>ขาดทุน 5 ล้านบาท (Combined Ratio 105%) สะท้อนผลการรับประกันจากเบี้ยประกัน ค่าสินไหมเกิดขึ้น และค่าใช้จ่ายในการรับประกัน</p></div>
          </div>
          <div className="ins-item">
            <span className="ins-ico"><I.Coins size={21} /></span>
            <div><b>ผลกระทบต่อสภาพคล่อง (Liquidity)</b><p>คาดการณ์จ่ายเคลมรวม 85 ล้านบาท ซึ่งเป็นกระแสเงินสดจ่าย อาจเกิดขึ้นคนละช่วงเวลากับการรับรู้ค่าสินไหม 75 ล้านบาท</p></div>
          </div>
        </section>
      </div>
    </>
  );
}
