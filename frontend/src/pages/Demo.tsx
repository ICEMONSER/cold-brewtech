/* Demo-mode screens (ข้อมูลสมมติ). Layout follows the approved reference screens 1:1.
 * All numbers come from ../demo.ts — never from real companies. */
import { ReactNode, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { send } from "../api";
import * as D from "../demo";
import { CashChart, ColumnBars, WaterfallSvg, WeeklyBars } from "../components/svgcharts";
import { Concierge, Header, Icon, useData } from "../components/ui";

const m = (v: number, d = 0) => `฿${v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}M`;
const baht = (v: number) => `฿${v.toLocaleString("en-US")}`;

function Kpi({ icon, label, value, unit, tone = "rose", info }: { icon: ReactNode; label: string; value: string; unit?: string; tone?: "rose" | "green" | "amber"; info?: boolean }) {
  return (
    <div className="card dkpi">
      <span className={`ico ${tone}`}>{icon}</span>
      <div>
        <div className="label">{label}{info && <span className="i">{Icon.info}</span>}</div>
        <div className="value">{value}{unit && <small> {unit}</small>}</div>
      </div>
    </div>
  );
}

function Alert({ threshold, short, day, compact }: { threshold: number; short: number; day: number; compact?: boolean }) {
  return (
    <div role="status" className={`banner ${compact ? "compact" : ""}`}>
      <span className="bang" aria-hidden="true">!</span>
      <strong>วันที่ {day} เงินสดอาจต่ำกว่าเกณฑ์ <span className="maroon">฿{Math.round(short)}M</span></strong>
      <Link className="btn sm" to="/forecast">ดูรายละเอียด <span aria-hidden="true">→</span></Link>
      <span className="sr">เกณฑ์ ฿{threshold}M</span>
    </div>
  );
}

function Status({ children, tone = "bad" }: { children: ReactNode; tone?: string }) {
  return <span className={`status ${tone}`}>{children}</span>;
}

function useBase() {
  const { threshold } = useData();
  return { threshold, base: useMemo(() => D.summarize(D.baseFlows, threshold), [threshold]) };
}

/* ======================== 01 ภาพรวม ======================== */
export function DemoOverview() {
  const { threshold, base } = useBase();
  const [shock, setShock] = useState(10);
  const facts = D.demoFacts(threshold);
  return (
    <>
      <Header title="ภาพรวมกระแสเงินสด" />
      <div className="row">
        <div className="col-main">
          {base.breachDay && <Alert threshold={threshold} short={base.shortfall} day={base.trough.day} />}
          <div className="grid4">
            <Kpi icon={Icon.wallet} label="เงินสดที่ใช้ได้" value={m(D.OPENING)} />
            <Kpi icon={Icon.doc} label="คาดการณ์จ่ายเคลม" value={m(base.claims)} />
            <Kpi icon={Icon.bars} label="เงินสดปลายงวด" value={m(base.closing)} />
            <Kpi icon={Icon.shield} label="เงินสำรองขั้นต่ำ" value={m(threshold)} />
          </div>
          <section className="card">
            <h2>คาดการณ์เงินสด 30 วัน</h2>
            <div className="muted">ล้านบาท</div>
            <CashChart series={base.series} threshold={threshold} />
          </section>
          <section className="card">
            <h2 style={{ marginBottom: 10 }}>รายการจ่ายที่กำลังจะถึง</h2>
            <div className="scroll-x"><table className="t">
              <thead><tr><th>วันที่</th><th>ประเภท</th><th>จำนวนเงิน</th><th>สถานะ</th><th><span className="sr">ตัวเลือก</span></th></tr></thead>
              <tbody>{D.upcomingPayments.map((p) => <tr key={p.date}><td>{p.date}</td><td>{p.type}</td><td>{baht(p.amount)}</td><td><Status>{p.status}</Status></td><td><button type="button" className="more" aria-label="ตัวเลือกเพิ่มเติม">⋯</button></td></tr>)}</tbody>
            </table></div>
            <div className="right"><Link to="/forecast" className="link">ดูรายการทั้งหมด →</Link></div>
          </section>
        </div>
        <div className="col-side">
          <Concierge facts={facts}
            seed={[{ role: "user", content: "เดือนนี้ต้องเตรียมเงินเพิ่มเท่าไร?" },
              { role: "assistant", content: `คาดว่าเงินสดจะต่ำกว่าเกณฑ์ ${Math.round(base.shortfall)} ล้านบาท ในวันที่ ${base.trough.day} โปรดตรวจสอบกำหนดรับเงินประกันภัยต่อ`, sources: ["ข้อมูลเคลม", "แผนรับจ่าย"] }]}
            suggestions={["มีวิธีเพิ่มสภาพคล่องอะไรบ้าง?", "ถ้าเลื่อนจ่ายเคลมบางรายการได้หรือไม่?", "ความเสี่ยงหลักที่ทำให้เงินสดต่ำกว่าเกณฑ์คืออะไร?"]}>
            <div className="card inner">
              <div className="slider-head">{Icon.bars}<b>หากยอดเคลมเพิ่มขึ้น</b><span className="i">{Icon.info}</span><span className="chip warn">{shock}%</span></div>
              <input type="range" min={0} max={30} step={1} value={shock} onChange={(e) => setShock(+e.target.value)} aria-label="เปอร์เซ็นต์ยอดเคลมเพิ่มขึ้น" />
              <div className="ticks"><span>0%</span><span>5%</span><span>10%</span><span>20%</span><span>30%</span></div>
              <Link className="btn block" to={`/scenario?shock=${shock}`}>จำลองผลกระทบ</Link>
            </div>
          </Concierge>
        </div>
      </div>
    </>
  );
}

/* ======================== 02 พยากรณ์เงินสด ======================== */
export function DemoForecast() {
  const { threshold, base } = useBase();
  const [h, setH] = useState(30);
  const wk = D.weekly(D.baseFlows);
  return (
    <>
      <Header title="พยากรณ์เงินสด" />
      <div className="toolbar">
        <span className="muted">ช่วงเวลา</span>
        <div className="seg" role="group" aria-label="ช่วงเวลา">
          {[30, 60, 90].map((n) => <button key={n} type="button" aria-pressed={h === n} className={h === n ? "on" : ""} onClick={() => setH(n)} disabled={n !== 30} title={n !== 30 ? "ชุดข้อมูลตัวอย่างมี 30 วัน" : ""}>{n} วัน</button>)}
        </div>
        <span className="vsep" aria-hidden="true" />
        <span className="muted">มุมมอง</span>
        <label className="picker plain"><select aria-label="มุมมอง" defaultValue="w"><option value="w">รายสัปดาห์</option></select>{Icon.chevron}</label>
        <button className="btn ml-auto" onClick={() => window.print()}>{Icon.download}ส่งออกรายงาน{Icon.chevron}</button>
      </div>
      <div className="grid4">
        <Kpi icon={Icon.wallet} label="เงินสดต้นงวด" value={m(D.OPENING)} unit="ล้านบาท" />
        <Kpi icon={Icon.inArrow} tone="green" label="เงินรับคาดการณ์" value={m(base.receipts + base.reins)} unit="ล้านบาท" />
        <Kpi icon={Icon.outArrow} label="เงินจ่ายเคลม" value={m(base.claims)} unit="ล้านบาท" />
        <Kpi icon={Icon.coins} tone="amber" label="เงินสดปลายงวด" value={m(base.closing)} unit="ล้านบาท" />
      </div>
      <section className="card">
        <div className="card-head"><div><h2>คาดการณ์เงินสด 30 วัน</h2><div className="muted">ล้านบาท</div></div>
          {base.breachDay && <div style={{ minWidth: 420 }}><Alert threshold={threshold} short={base.shortfall} day={base.trough.day} compact /></div>}</div>
        <CashChart series={base.series} threshold={threshold} actualUntil={14} ticks={[1, 5, 10, 15, 20, 25, 30]} height={280} />
      </section>
      <div className="row">
        <section className="card" style={{ flex: "1.5 1 420px" }}>
          <h3>เงินรับและเงินจ่ายรายสัปดาห์ (คาดการณ์)</h3><div className="muted">ล้านบาท</div>
          <WeeklyBars rows={wk} />
        </section>
        <section className="card" style={{ flex: "1.1 1 340px" }}>
          <h3 style={{ marginBottom: 10 }}>รายการกระทบยอดเงินสด (30 วัน)</h3>
          <table className="t compact"><thead><tr><th>รายการ</th><th className="num">จำนวนเงิน (ล้านบาท)</th></tr></thead><tbody>
            <tr><td>เงินสดต้นงวด</td><td className="num">{D.OPENING}</td></tr>
            <tr><td>(+) เงินรับเบี้ยประกันคาดการณ์</td><td className="num">{base.receipts.toFixed(0)}</td></tr>
            <tr><td>(+) เงินรับจากประกันภัยต่อ</td><td className="num">{base.reins.toFixed(0)}</td></tr>
            <tr><td>(-) เงินจ่ายเคลม (กระแสเงินสด)</td><td className="num">{base.claims.toFixed(0)}</td></tr>
            <tr><td>(-) เงินจ่ายอื่น ๆ</td><td className="num">{base.other.toFixed(0)}</td></tr>
            <tr className="hl"><td>เงินสดปลายงวด</td><td className="num maroon">{base.closing.toFixed(0)}</td></tr>
          </tbody></table>
          <div role="status" className="banner compact" style={{ marginTop: 14 }}><span className="bang" aria-hidden="true">!</span>
            <span>เงินสดต่ำสุด <b>{m(base.trough.cash)}</b> ในวันที่ {base.trough.day} <span className="sepbar">|</span> <span className="maroon">ต่ำกว่าเกณฑ์ {m(base.shortfall)}</span></span></div>
        </section>
        <aside className="card" style={{ flex: "1 1 280px" }} aria-label="AI Concierge">
          <div className="cc-head small">{Icon.spark}<h3>AI Concierge</h3><span className="chip warn round">Beta</span></div>
          <div className="pill-blue">{Icon.spark}ความเสี่ยงด้านสภาพคล่อง</div>
          <p className="body">คาดว่าเงินสดจะลดลงต่อเนื่องถึงวันที่ {base.trough.day} จากการจ่ายเคลมที่สูงในช่วงสัปดาห์ที่ 1–3 โดยเงินสดต่ำสุดที่ {m(base.trough.cash)} ซึ่งต่ำกว่าเกณฑ์เงินสำรองขั้นต่ำ {m(base.shortfall)} หลังจากนั้นเงินสดจะทยอยเพิ่มขึ้นจากเงินรับประกันภัยต่อ และสิ้นงวดที่ {m(base.closing)}</p>
          <div className="body">ข้อแนะนำ</div>
          <ul className="body"><li>พิจารณาเลื่อนการจ่ายเคลมบางส่วนในช่วงสัปดาห์ที่ 2–3</li><li>เตรียมวงเงินสำรองฉุกเฉินอย่างน้อย {m(Math.ceil(base.shortfall))} เพื่อรักษาเกณฑ์สภาพคล่อง</li></ul>
        </aside>
      </div>
    </>
  );
}

/* ======================== 03 วิเคราะห์เคลม ======================== */
export function DemoClaims() {
  const [q, setQ] = useState("");
  const [line, setLine] = useState("ทั้งหมด");
  const [st, setSt] = useState("ทั้งหมด");
  const rows = D.claimRows.filter((r) => (line === "ทั้งหมด" || r.line === line) && (st === "ทั้งหมด" || r.status === st) && JSON.stringify(r).includes(q));
  const total = D.claimsByLine.reduce((s, r) => s + r.value, 0);
  const u = D.underwriting;
  return (
    <>
      <Header title="วิเคราะห์เคลม" />
      <div className="card filters">
        <label className="field">ประเภทประกัน<span className="picker plain wide"><select value={line} onChange={(e) => setLine(e.target.value)}>{["ทั้งหมด", "รถยนต์", "สุขภาพ", "ทรัพย์สิน"].map((x) => <option key={x}>{x}</option>)}</select>{Icon.chevron}</span></label>
        <label className="field">สถานะเคลม<span className="picker plain wide"><select value={st} onChange={(e) => setSt(e.target.value)}>{["ทั้งหมด", "อนุมัติแล้ว", "อยู่ระหว่างพิจารณา", "สำรวจความเสียหาย", "เอกสารเพิ่มเติม"].map((x) => <option key={x}>{x}</option>)}</select>{Icon.chevron}</span></label>
        <label className="field">ช่วงเวลา<span className="picker plain wide"><select><option>30 วันข้างหน้า</option></select>{Icon.chevron}</span></label>
      </div>
      <div className="grid4">
        <Kpi icon={Icon.doc} label="เคลมเปิดอยู่" value={`${D.claimsKpi.open.toLocaleString()} รายการ`} />
        <Kpi icon={Icon.coins} label="คาดการณ์จ่ายเคลม" value={m(D.claimsKpi.expectedPay)} unit="ล้านบาท" />
        <Kpi icon={Icon.shield} label="ค่าสินไหมเกิดขึ้น" info value={m(D.claimsKpi.incurred)} unit="ล้านบาท" />
        <Kpi icon={Icon.bars} label="Combined Ratio" info value={`${D.claimsKpi.combinedRatio}%`} />
      </div>
      <div className="row">
        <section className="card" style={{ flex: "999 1 520px", display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: "3 1 360px" }}><h2>คาดการณ์ยอดจ่ายตามประเภท</h2><div className="muted">ล้านบาท</div><ColumnBars rows={D.claimsByLine} total={total} /></div>
          <div className="totalbox"><div>รวมทั้งสิ้น</div><b>{m(total)}</b><div>ล้านบาท</div></div>
        </section>
        <section className="card" style={{ flex: "1 1 400px" }}>
          <div className="card-head"><h2>ผลการรับประกัน (Underwriting) <span className="i">{Icon.info}</span></h2><span className="muted">หน่วย: ล้านบาท</span></div>
          <WaterfallSvg steps={[
            { label: ["เบี้ยประกัน", "รับรู้รายได้"], value: u.premium, kind: "total" },
            { label: ["ค่าสินไหม", "เกิดขึ้น"], value: -u.incurred, kind: "delta" },
            { label: ["ค่าใช้จ่าย", "ในการรับประกัน"], value: -u.expenses, kind: "delta" },
            { label: ["ผลรับประกัน"], value: u.premium - u.incurred - u.expenses, kind: "result" }]} />
          <div className="muted">ผลรับประกันไม่รวมรายได้ลงทุน และอาจแตกต่างจากกระแสเงินสดจ่ายเคลม</div>
        </section>
      </div>
      <div className="row">
        <section className="card" style={{ flex: "999 1 420px", minWidth: 0 }}>
          <div className="card-head"><h2>รายละเอียดเคลม</h2>
            <label className="search">{Icon.search}<input type="search" aria-label="ค้นหาเคลม" placeholder="ค้นหารหัสเคลม ประเภท หรือจำนวนเงิน..." value={q} onChange={(e) => setQ(e.target.value)} /></label></div>
          <div className="scroll-x"><table className="t">
            <thead><tr><th>รหัสเคลม</th><th>ประเภท</th><th className="num">ประมาณการจ่าย (บาท)</th><th>กำหนดจ่าย</th><th>สถานะ</th><th><span className="sr">ตัวเลือก</span></th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.id}><td>{r.id}</td><td>{r.line}</td><td className="num">{baht(r.amount)}</td><td>{r.due}</td><td><Status tone={r.tone}>{r.status}</Status></td><td><button type="button" className="more" aria-label="ตัวเลือกเพิ่มเติม">⋯</button></td></tr>)}</tbody>
          </table></div>
          <div className="right"><a href="#" className="link">ดูรายการเคลมทั้งหมด →</a></div>
        </section>
        <section className="card insights" style={{ flex: "1 1 400px" }}>
          <div className="cc-head small">{Icon.bulb}<h2>ข้อมูลเชิงลึก</h2></div>
          <div className="banner block"><span className="bang" aria-hidden="true">!</span><div><b>มีเคลมทรัพย์สินมูลค่าสูงที่กำหนดจ่ายในช่วงครึ่งหลัง</b><p>เคลมทรัพย์สินที่มีมูลค่ามากกว่า 1 ล้านบาท จำนวน 2 รายการ กำหนดจ่ายในช่วงวันที่ 18–25 ซึ่งอาจกดดันกระแสเงินสดในระยะสั้น แม้ผลรับประกันโดยรวมยังขาดทุนเล็กน้อยที่ 5 ล้านบาท</p></div></div>
          <div className="ins"><span className="ico rose">{Icon.bars}</span><div><b>ผลกำไรจากการรับประกัน (Profitability)</b><p>ขาดทุน 5 ล้านบาท (Combined Ratio 105%) สะท้อนผลการรับประกันจากเบี้ยประกัน ค่าสินไหมเกิดขึ้น และค่าใช้จ่ายในการรับประกัน</p></div></div>
          <div className="ins"><span className="ico rose">{Icon.coins}</span><div><b>ผลกระทบต่อสภาพคล่อง (Liquidity)</b><p>คาดการณ์จ่ายเคลมรวม 85 ล้านบาท ซึ่งเป็นกระแสเงินสดจ่าย อาจเกิดขึ้นคนละช่วงเวลากับการรับรู้ค่าสินไหมใหม่ 75 ล้านบาท</p></div></div>
        </section>
      </div>
    </>
  );
}

/* ======================== 04 จำลองสถานการณ์ ======================== */
export function DemoScenario() {
  const { threshold, setThreshold } = useData();
  const init = Number(new URLSearchParams(location.search).get("shock") ?? 10);
  const [shock, setShock] = useState(init);
  const [delay, setDelay] = useState(0);
  const [reserve, setReserve] = useState(threshold);
  const [applied, setApplied] = useState({ shock: init, delay: 0, reserve: threshold });
  const [saved, setSaved] = useState("");
  const base = useMemo(() => D.summarize(D.baseFlows, applied.reserve), [applied.reserve]);
  const sc = useMemo(() => D.summarize(D.scenarioFlows(applied.shock, applied.delay), applied.reserve), [applied]);
  const sign = (v: number) => `${v > 0 ? "+" : ""}${v}%`;
  const diff = (a: number, b: number) => { const d = b - a; return Math.abs(d) < 0.05 ? "-" : `${d > 0 ? "+" : ""}${d.toFixed(1)}`; };
  const rows: [string, number, number, boolean?][] = [
    ["เงินสดต้นงวด (วันที่ 1)", D.OPENING, D.OPENING],
    ["เงินรับรวม", base.receipts + base.reins, sc.receipts + sc.reins],
    ["จ่ายเคลม (Cash Payment)", base.claims, sc.claims],
    ["รายจ่ายอื่น", base.other, sc.other],
    ["เงินสดคงเหลือสิ้นสุด (วันที่ 30)", base.closing, sc.closing, true],
    ["เงินสดต่ำสุด (ระหว่าง 30 วัน)", base.trough.cash, sc.trough.cash],
    [`ขาดจากเงินสำรองขั้นต่ำ (฿${applied.reserve}M)`, base.shortfall, sc.shortfall, true],
  ];
  const label = `สถานการณ์ (${sign(applied.shock)}${applied.delay ? `, รับเงินช้า ${applied.delay} วัน` : ""})`;
  return (
    <>
      <Header title="จำลองสถานการณ์" />
      <div className="row">
        <section className="card ctrl">
          <h2>การเปลี่ยนแปลงสมมติฐาน</h2><div className="muted">ปรับสมมติฐานเพื่อดูผลกระทบต่อกระแสเงินสด</div>
          <div className="ctrl-box">
            <div className="slider-head"><span>ยอดจ่ายเคลมเพิ่มขึ้น</span><span className="i">{Icon.info}</span><span className="chip warn">{sign(shock)}</span></div>
            <input type="range" min={-20} max={20} value={shock} onChange={(e) => setShock(+e.target.value)} aria-label="ยอดจ่ายเคลมเพิ่มขึ้น" />
            <div className="ticks"><span>-20%</span><span>-10%</span><span>0%</span><span>+10%</span><span>+20%</span></div>
          </div>
          <div className="ctrl-box plain">
            <div className="slider-head"><span>เงินรับล่าช้า</span><span className="i">{Icon.info}</span><span className="chip warn">{delay} วัน</span></div>
            <input type="range" min={0} max={30} value={delay} onChange={(e) => setDelay(+e.target.value)} aria-label="เงินรับล่าช้า (วัน)" />
            <div className="ticks"><span>0</span><span>7</span><span>14</span><span>21</span><span>30</span></div>
          </div>
          <label className="field">เงินสำรองขั้นต่ำ<span className="unit-input"><input type="number" value={reserve} onChange={(e) => setReserve(+e.target.value)} /><span>ล้านบาท</span></span><span className="muted">ช่วงแนะนำ 30 – 60 ล้านบาท (ตั้งได้ในหน้าตั้งค่า)</span></label>
          <button className="btn block" onClick={() => { setApplied({ shock, delay, reserve }); setThreshold(reserve); }}>{Icon.calc}คำนวณสถานการณ์</button>
          <button className="btn plain block" onClick={() => { setShock(0); setDelay(0); setReserve(D.DEFAULT_THRESHOLD); setApplied({ shock: 0, delay: 0, reserve: D.DEFAULT_THRESHOLD }); }}>{Icon.reset}รีเซ็ต</button>
        </section>
        <div className="col-main">
          <section className="card">
            <div className="card-head"><div><h2>ผลการจำลองสถานการณ์</h2><div className="muted">เปรียบเทียบกับกรณีฐาน (Base Case)</div></div>
              <div className="banner compact note"><span className="bang" aria-hidden="true">!</span><div><b>ตัวอย่างสมมติ: {sign(applied.shock)} ยอดจ่ายเคลม{applied.delay ? `, เงินรับช้า ${applied.delay} วัน` : ""}</b><div className="muted">ผลลัพธ์เป็นการประมาณการ ไม่รับประกันว่าจะเกิดขึ้นจริง</div></div></div></div>
            <div className="grid4">
              <Compare icon={Icon.wallet} title={<>เงินสดคงเหลือสิ้นสุด<br />(วันที่ 30)</>} a={base.closing} b={sc.closing} />
              <div className="card cmp"><div className="cmp-h"><span className="ico rose">{Icon.doc}</span><div>ยอดจ่ายเคลมส่วนเพิ่ม<br /><span className="muted">(จาก {sign(applied.shock)})</span></div></div>
                <div className="cmp-one">{m(sc.claims - base.claims, 1)}</div><div className="muted center">คำนวณจาก {m(base.claims)} × {applied.shock}%</div></div>
              <Compare icon={Icon.trend} title={<>เงินสดต่ำสุด<br />(ระหว่าง 30 วัน)</>} a={base.trough.cash} b={sc.trough.cash} warn={sc.trough.cash < applied.reserve} />
              <Compare icon={Icon.shield} title="ขาดจากเงินสำรองขั้นต่ำ" a={base.shortfall} b={sc.shortfall} warn={sc.shortfall > base.shortfall} />
            </div>
          </section>
          <div className="row">
            <div style={{ flex: "2 1 460px", display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
              <section className="card"><h2>คาดการณ์เงินสด 30 วัน</h2><div className="muted">ล้านบาท</div>
                <CashChart series={base.series} compare={sc.series} threshold={applied.reserve} height={270} compactLegend /></section>
              <section className="card"><h3 style={{ marginBottom: 8 }}>สรุปตัวเลขเปรียบเทียบ <span className="muted">(หน่วย: ล้านบาท)</span></h3>
                <div className="scroll-x"><table className="t compact"><thead><tr><th>รายการ</th><th className="num">กรณีฐาน (Base Case)</th><th className="num">{label}</th><th className="num">ผลต่าง</th></tr></thead>
                  <tbody>{rows.map(([n, a, b, hl]) => <tr key={n} className={hl ? "hl" : ""}><td>{n}</td><td className="num">{a.toFixed(1)}</td><td className="num">{b.toFixed(1)}</td><td className="num maroon">{diff(a, b)}</td></tr>)}</tbody></table></div>
              </section>
            </div>
            <aside className="card sources" style={{ flex: "1 1 300px" }}>
              <div className="cc-head small"><span className="amber">{Icon.bulb}</span><div><h2>ตรวจสอบแหล่งเงินสำรอง</h2><div className="muted">พิจารณาทางเลือกเพื่อรองรับเงินสดที่ขาด</div></div></div>
              {sc.shortfall > 0
                ? <div className="danger">{Icon.shield}<div><b>ในสถานการณ์นี้ เงินสดต่ำสุดต่ำกว่าเงินสำรองขั้นต่ำ {sc.shortfall.toFixed(1)} ล้านบาท</b><p>ควรพิจารณาจัดหาแหล่งเงินสำรองเพิ่มเติมเพื่อลดความเสี่ยงด้านสภาพคล่อง</p></div></div>
                : <div className="ok">เงินสดไม่ต่ำกว่าเงินสำรองขั้นต่ำในสถานการณ์นี้</div>}
              {[["ใช้วงเงินสินเชื่อระยะสั้น", "ตรวจสอบวงเงินคงเหลือและเงื่อนไข"], ["ขายสินทรัพย์การลงทุนบางส่วน", "พิจารณาสภาพคล่องของสินทรัพย์"], ["ชะลอการจ่ายรายจ่ายที่ไม่จำเป็น", "ทบทวนแผนรายจ่ายระยะสั้น"], ["เร่งรับชำระเบี้ยประกัน", "ติดตามลูกหนี้และเสนอสิทธิประโยชน์"], ["ทบทวนระดับเงินสำรองขั้นต่ำ", "พิจารณาให้เหมาะสมกับความเสี่ยง"]].map(([t, s]) => (
                <button type="button" key={t} className="option"><span><b>{t}</b><small>{s}</small></span><span aria-hidden="true">›</span></button>))}
              <div className="note-amber">{Icon.info}ผลลัพธ์เป็นเพียงการประมาณการ ไม่รับประกันว่าจะเกิดขึ้นจริง กรุณาพิจารณาเพิ่มเติมร่วมกับคณะกรรมการบริหารความเสี่ยง</div>
              <button className="btn block" onClick={async () => { try { await send("/api/demo/scenarios", { ...applied, closing: sc.closing, trough: sc.trough.cash }); setSaved("บันทึกแล้ว"); } catch { setSaved("บันทึกไม่สำเร็จ (backend ไม่ทำงาน)"); } }}>{Icon.save}บันทึกสถานการณ์</button>
              <span role="status" className="muted">{saved}</span>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}

function Compare({ icon, title, a, b, warn }: { icon: ReactNode; title: ReactNode; a: number; b: number; warn?: boolean }) {
  return (
    <div className="card cmp">
      <div className="cmp-h"><span className="ico rose">{icon}</span><div>{title}</div></div>
      <div className="cmp-g"><span>กรณีฐาน</span><span>สถานการณ์</span><b>{m(a, Math.abs(a % 1) > 0.05 ? 1 : 0)}</b><b className={warn ? "maroon" : ""}>{m(b, Math.abs(b % 1) > 0.05 ? 1 : 0)}</b></div>
    </div>
  );
}

/* ======================== 05 รายงาน ======================== */
const REPORTS = [
  { key: "fc", icon: Icon.bars, title: "พยากรณ์เงินสด 30 วัน", desc: "ประมาณการกระแสเงินสดและสภาพคล่อง", at: "วันนี้ 09:00" },
  { key: "cl", icon: Icon.shield, title: "สรุปสินไหม", desc: "สินไหมที่เกิดขึ้น (Incurred) และการจ่ายเงินสด", at: "เมื่อวาน 17:30" },
  { key: "sc", icon: Icon.trend, title: "วิเคราะห์สถานการณ์เคลม +10%", desc: "ผลกระทบต่อเงินสดและสภาพคล่อง", at: "20 วันที่แล้ว" },
  { key: "uw", icon: Icon.doc, title: "ผลการรับประกัน", desc: "เบี้ยประกัน รายจ่าย และอัตราส่วนรวม", at: "เมื่อวาน 10:15" },
];

function csv(name: string, rows: (string | number)[][]) {
  const text = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" })); a.download = name; a.click();
}

export function DemoReports() {
  const { threshold, base } = useBase();
  const [tab, setTab] = useState(0);
  const [sel, setSel] = useState(0);
  const r = REPORTS[sel];
  const exportRows = () => [["วัน", "เงินสดคาดการณ์ (ล้านบาท)", "ต่ำ", "สูง", "หมายเหตุ"], ...base.series.map((p) => [p.day, p.cash.toFixed(2), p.low.toFixed(2), p.high.toFixed(2), "ข้อมูลสมมติ"])];
  return (
    <>
      <Header title="รายงาน" />
      <div className="tabs-row">
        <div className="tabs" role="tablist">{["รายงานทั้งหมด", "ตั้งเวลาส่ง", "ประวัติการส่ง"].map((t, i) => <button key={t} role="tab" aria-selected={tab === i} className={tab === i ? "on" : ""} onClick={() => setTab(i)}>{t}</button>)}</div>
        <button className="btn">{Icon.plus}สร้างรายงาน</button>
      </div>
      <div className="row">
        <div style={{ flex: "1 1 440px", maxWidth: 560, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="toolbar">
            <label className="field">ช่วงเวลา<span className="picker plain">{Icon.calendar}<select><option>30 วันข้างหน้า</option></select>{Icon.chevron}</span></label>
            <label className="field">ประเภทรายงาน<span className="picker plain"><select><option>ทั้งหมด</option></select>{Icon.chevron}</span></label>
            <label className="search grow">{Icon.search}<input type="search" placeholder="ค้นหารายงาน..." aria-label="ค้นหารายงาน" /></label>
          </div>
          <div className="card flush"><div className="scroll-x"><table className="t reports">
            <thead><tr><th>ชื่อรายงาน</th><th>ข้อมูล ณ ⇅</th><th>สถานะ</th><th>รูปแบบ</th><th>ดำเนินการ</th></tr></thead>
            <tbody>{REPORTS.map((x, i) => (
              <tr key={x.key} className={i === sel ? "sel" : ""} onClick={() => setSel(i)}>
                <td><div className="rep"><span className="ico rose sm">{x.icon}</span><div><b>{x.title}</b><small>{x.desc}</small></div></div></td>
                <td>{x.at}</td><td><span className="status ok">● พร้อมใช้งาน</span></td><td><span className="status bad">PDF, Excel</span></td>
                <td className="acts"><button type="button" onClick={() => setSel(i)}>{Icon.eye}ดู</button><button type="button" onClick={() => csv(`${x.title}.csv`, exportRows())}>{Icon.download}ดาวน์โหลด</button></td>
              </tr>))}</tbody></table></div></div>
        </div>
        <section className="card" style={{ flex: "999 1 420px", minWidth: 0 }}>
          <div className="card-head">
            <div><div className="cc-head small">{r.icon}<h2>{r.title}</h2><span className="chip warn">ข้อมูลสมมติ {Icon.info}</span></div>
              <div className="muted">ประมาณการกระแสเงินสดและสภาพคล่องในอีก 30 วันข้างหน้า</div><div className="muted">ข้อมูล ณ: {r.at} · รูปแบบ: PDF, Excel</div></div>
            <div className="btns no-print"><button className="btn" onClick={() => window.print()}>ดาวน์โหลด PDF</button><button className="btn ghost" onClick={() => csv(`${r.title}.csv`, exportRows())}>ดาวน์โหลด Excel</button></div>
          </div>
          <div className="card inner"><h3>คาดการณ์เงินสด 30 วัน</h3><div className="muted">ล้านบาท</div><CashChart series={base.series} threshold={threshold} height={260} /></div>
          <h3 style={{ margin: "12px 0 8px" }}>สรุปตัวเลขสำคัญ</h3>
          <div className="grid4 tight">
            <Kpi icon={Icon.wallet} label="เงินสดต้นงวด" value={m(D.OPENING)} />
            <Kpi icon={Icon.inArrow} tone="green" label="เงินสดรับรวม" value={m(base.receipts + base.reins)} />
            <Kpi icon={Icon.outArrow} label="เงินสดจ่ายสินไหม" value={m(base.claims)} />
            <Kpi icon={Icon.bars} label="เงินสดปลายงวด" value={m(base.closing)} />
          </div>
          <div className="grid2" style={{ marginTop: 10 }}>
            <Kpi icon={Icon.shield} label="ต่ำกว่าเกณฑ์" value={m(base.shortfall)} unit="ต่ำกว่าเงินสำรองขั้นต่ำ" />
            <Kpi icon={Icon.calendar} label="วันที่ต่ำสุด" value={`วันที่ ${base.trough.day}`} unit={`เงินสดต่ำสุด ${m(base.trough.cash)}`} />
          </div>
          <div className="card inner sched"><div className="cc-head small">{Icon.clock}<h3>การตั้งเวลาส่งรายงาน</h3></div>
            <div className="sched-row"><div><small>ความถี่</small>ทุกวันจันทร์ 09:00</div><div><small>ผู้รับ</small>ทีม Finance</div><div><small>สถานะ</small><span><span className="dot grey" />ยังไม่เปิดใช้งาน</span></div>
              <Link className="btn ghost" to="/settings">{Icon.gear}ตั้งค่าการส่ง</Link></div></div>
        </section>
      </div>
    </>
  );
}

/* ======================== 06 ตั้งค่า ======================== */
export function DemoSettings() {
  const { threshold, setThreshold } = useData();
  const [tab, setTab] = useState(2);
  const [val, setVal] = useState(threshold);
  const [lead, setLead] = useState(7);
  const [rules, setRules] = useState({ low: true, stale: true });
  const [ch, setCh] = useState({ app: true, mail: false });
  const [log, setLog] = useState<{ ts: string; item: string; by: string }[]>([{ ts: "5 พ.ย. 2567 10:24", item: "แก้ไขเกณฑ์สภาพคล่องขั้นต่ำ จาก 30 เป็น 40 ล้านบาท", by: "Finance Admin" }]);
  const preview = D.summarize(D.baseFlows, val);
  const save = () => {
    if (val !== threshold) setLog((l) => [{ ts: new Date().toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }), item: `แก้ไขเกณฑ์สภาพคล่องขั้นต่ำ จาก ${threshold} เป็น ${val} ล้านบาท`, by: "Finance Admin" }, ...l]);
    setThreshold(val);
  };
  const Switch = ({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) => (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? "on" : ""}`} onClick={() => set(!on)}><span /></button>);
  return (
    <>
      <Header title="ตั้งค่าระบบ" />
      <div className="tabs" role="tablist">{["บริษัท", "แหล่งข้อมูล", "การแจ้งเตือน", "สิทธิ์ผู้ใช้"].map((t, i) => <button key={t} role="tab" aria-selected={tab === i} className={tab === i ? "on" : ""} onClick={() => setTab(i)}>{t}</button>)}</div>
      <div className="row">
        <div className="col-main">
          <section className="card">
            <h2>เกณฑ์สภาพคล่อง</h2><div className="muted">กำหนดเกณฑ์สำหรับการแจ้งเตือนความเสี่ยงด้านสภาพคล่อง</div>
            <div className="grid2" style={{ marginTop: 12 }}>
              <label className="field">เงินสำรองขั้นต่ำ<span className="unit-input"><input type="number" value={val} onChange={(e) => setVal(+e.target.value)} /><span>ล้านบาท</span></span><span className="muted">แจ้งเตือนเมื่อเงินสดต่ำกว่าเกณฑ์นี้</span></label>
              <label className="field">ระยะเวลาเตือนล่วงหน้า<span className="unit-input"><input type="number" value={lead} onChange={(e) => setLead(+e.target.value)} /><span>วัน</span></span><span className="muted">แจ้งเตือนล่วงหน้าก่อนถึงวันที่คาดว่าจะต่ำกว่าเกณฑ์</span></label>
            </div>
          </section>
          <section className="card split">
            <div>
              <h2>กฎแจ้งเตือน</h2><div className="muted">เลือกเหตุการณ์ที่ต้องการรับการแจ้งเตือน</div>
              <label className="check"><input type="checkbox" checked={rules.low} onChange={(e) => setRules({ ...rules, low: e.target.checked })} /><span><b>เงินสดต่ำกว่าเกณฑ์สภาพคล่อง</b><small>แจ้งเตือนเมื่อมีการคาดการณ์ว่าเงินสดจะต่ำกว่าเงินสำรองขั้นต่ำ</small></span></label>
              <label className="check"><input type="checkbox" checked={rules.stale} onChange={(e) => setRules({ ...rules, stale: e.target.checked })} /><span><b>ข้อมูลไม่อัปเดตเกิน 24 ชั่วโมง</b><small>แจ้งเตือนเมื่อแหล่งข้อมูลไม่ได้รับการอัปเดตตามเวลาที่กำหนด</small></span></label>
            </div>
            <div>
              <h2>ช่องทางแจ้งเตือน</h2><div className="muted">เลือกช่องทางที่ต้องการรับการแจ้งเตือน</div>
              <div className="check"><Switch on={ch.app} set={(v) => setCh({ ...ch, app: v })} label="แจ้งเตือนในระบบ" /><span><b>ในระบบ</b><small>แสดงการแจ้งเตือนในระบบ (สำหรับผู้ใช้ที่มีสิทธิ์)</small></span></div>
              <div className="check"><Switch on={ch.mail} set={(v) => setCh({ ...ch, mail: v })} label="แจ้งเตือนทางอีเมล" /><span><b>อีเมล</b><small>ส่งอีเมลแจ้งเตือน (ตัวอย่างการใช้งานเท่านั้น)</small></span></div>
              <div className="btns end"><button className="btn" onClick={save}>บันทึกการตั้งค่า</button><button className="btn plain" onClick={() => setVal(threshold)}>ยกเลิก</button></div>
            </div>
          </section>
        </div>
        <aside className="card col-side">
          <div className="card-head"><h2>ตัวอย่างการแจ้งเตือน</h2><span className="muted">{Icon.eye} ดูตัวอย่างจากการตั้งค่าปัจจุบัน</span></div>
          {preview.breachDay ? <div className="alertcard"><div className="ac-h"><span className="bang" aria-hidden="true">!</span><b>วันที่ {preview.trough.day} เงินสดอาจต่ำกว่าเกณฑ์ {Math.round(preview.shortfall)} ล้านบาท</b></div>
            <p>จากการคาดการณ์เงินสด 30 วัน คาดว่าเงินสดจะต่ำกว่าเกณฑ์สภาพคล่อง {val} ล้านบาท ในวันที่ {preview.trough.day} โดยมีเงินสดต่ำสุด {Math.round(preview.trough.cash)} ล้านบาท (ต่ำกว่าเกณฑ์ {Math.round(preview.shortfall)} ล้านบาท)</p></div>
            : <div className="ok">ด้วยเกณฑ์ {val} ล้านบาท ไม่มีวันที่เงินสดต่ำกว่าเกณฑ์</div>}
          <dl className="kv"><div><dt>แหล่งข้อมูล</dt><dd>พยากรณ์เงินสด 30 วัน</dd></div><div><dt>สิทธิ์ผู้ใช้ที่เห็นการแจ้งเตือน</dt><dd>Finance Admin</dd></div><div><dt>ช่องทางการแจ้งเตือน</dt><dd>{[ch.app && "ในระบบ", ch.mail && "อีเมล"].filter(Boolean).join(", ") || "—"}</dd></div></dl>
        </aside>
      </div>
      <div className="row">
        <section className="card" style={{ flex: "999 1 560px" }}>
          <h2 style={{ marginBottom: 10 }}>สถานะการเชื่อมต่อข้อมูล</h2>
          <div className="scroll-x"><table className="t"><thead><tr><th>แหล่งข้อมูล</th><th>สถานะ</th><th>ข้อมูลล่าสุด</th><th>อัปเดตล่าสุด</th><th>การดำเนินการ</th><th><span className="sr">ตัวเลือก</span></th></tr></thead>
            <tbody>{[["กรมธรรม์", Icon.doc], ["เคลม", Icon.shield], ["บัญชี", Icon.bars]].map(([n, ic]) => (
              <tr key={n as string}><td><span className="inl">{ic}{n}</span></td><td><span className="dot" /> ข้อมูลตัวอย่าง</td><td>ข้อมูลถึงปัจจุบัน</td><td>09:00</td><td><Link to="/settings" className="status bad">ตรวจสอบ</Link></td><td><button type="button" className="more" aria-label="ตัวเลือกเพิ่มเติม">⋯</button></td></tr>))}</tbody></table></div>
        </section>
        <section className="card" style={{ flex: "1 1 420px" }}>
          <div className="card-head"><h2>ประวัติการเปลี่ยนแปลง</h2><span className="picker plain sm">{Icon.reset}<select><option>ทั้งหมด</option></select>{Icon.chevron}</span></div>
          <table className="t compact"><thead><tr><th>เวลา</th><th>รายการ</th><th>ผู้ดำเนินการ</th></tr></thead><tbody>{log.map((x, i) => <tr key={i}><td>{x.ts}</td><td>{x.item}</td><td>{x.by}</td></tr>)}</tbody></table>
          <div className="empty">{Icon.doc}<div>ยังไม่มีการเปลี่ยนแปลงที่บันทึกเพิ่มเติม</div><small>การเปลี่ยนแปลงการตั้งค่าจะแสดงที่นี่</small></div>
        </section>
      </div>
    </>
  );
}
