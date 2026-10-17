import { ReactNode, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Legend } from "../components/CashChart";
import LiveChart from "../components/LiveChart";
import { useReportActions } from "../components/reportActions";
import { PageHeader } from "../components/Shell";
import { Dropdown, Menu, Modal } from "../components/ui";
import * as I from "../components/icons";
import { claimRows, underwriting } from "../engine/analytics";
import { forecast } from "../engine/forecast";
import { fmtM, hhmm, lineLabel, relTime, thaiDateTime } from "../engine/format";
import { LEGEND_MAIN } from "../data";
import { useApp, type ReportItem } from "../store";

const KIND_ICON: Record<string, ReactNode> = { forecast: <I.Bars4 size={20} />, claims: <I.Shield size={21} />, scenario: <I.TrendUp size={21} />, underwriting: <I.Doc size={21} /> };
const KIND_TH: Record<string, string> = { forecast: "พยากรณ์เงินสด", claims: "สรุปสินไหม", scenario: "วิเคราะห์สถานการณ์", underwriting: "ผลการรับประกัน" };
const WEEKDAY = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

export default function Reports() {
  const app = useApp();
  const { reports, loadedAt, horizon, setHorizon } = app;
  const rep = useReportActions();
  const [sp, setSp] = useSearchParams();
  const [tab, setTab] = useState(sp.get("tab") === "schedule" ? 1 : sp.get("tab") === "history" ? 2 : 0);
  const [kind, setKind] = useState("all");
  const [q, setQ] = useState("");
  const [asc, setAsc] = useState(false);
  const [sel, setSel] = useState(sp.get("id") ?? reports[0]?.id);
  const [creating, setCreating] = useState(false);
  useEffect(() => { const id = sp.get("id"); if (id) setSel(id); }, [sp]);

  const when = (r: ReportItem) => r.createdAt > 0 ? r.createdAt : r.createdAt === 0 ? loadedAt : r.createdAt === -1 ? new Date().setHours(-7, 30, 0, 0) : r.createdAt === -1.5 ? new Date().setHours(-14, 15, 0, 0) : Date.now() + r.createdAt * 864e5;
  const list = useMemo(() => reports.filter((r) => (kind === "all" || r.kind === kind) && (!q || r.title.includes(q) || r.desc.includes(q))).sort((a, b) => (when(a) - when(b)) * (asc ? 1 : -1)), [reports, kind, q, asc, loadedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = reports.find((r) => r.id === sel) ?? list[0] ?? reports[0];
  const title = (r: ReportItem) => (r.kind === "forecast" && r.id === "r-forecast" ? `พยากรณ์เงินสด ${horizon} วัน` : r.title);

  return (
    <>
      <PageHeader title="รายงาน" />
      <div className="rp-tabs">
        <div className="tabs">
          {["รายงานทั้งหมด", "ตั้งเวลาส่ง", "ประวัติการส่ง"].map((t, i) => (
            <button key={t} className={tab === i ? "on" : ""} onClick={() => { setTab(i); setSp({}); }} style={{ marginLeft: [18, 51, 49][i] }}>{t}</button>
          ))}
        </div>
        <button className="btn rp-new" onClick={() => setCreating(true)}><I.Plus size={22} />สร้างรายงาน</button>
      </div>

      <div className="rp">
        <div>
          {tab === 0 && <>
            <div className="rp-filters">
              <div><div className="field-label">ช่วงเวลา</div><Dropdown label="ช่วงเวลา" icon={<I.Calendar size={21} />} w={194} className="sel-43" value={horizon} onChange={setHorizon} options={[30, 60, 90].map((d) => ({ value: d, label: `${d} วันข้างหน้า` }))} /></div>
              <div><div className="field-label">ประเภทรายงาน</div><Dropdown label="ประเภทรายงาน" w={156} className="sel-43" value={kind} onChange={setKind} options={[{ value: "all", label: "ทั้งหมด" }, ...Object.entries(KIND_TH).map(([k, v]) => ({ value: k, label: v }))]} /></div>
              <label className="search rp-search"><I.Search size={21} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหารายงาน..." /></label>
            </div>
            <section className="card rp-list">
              <div className="rp-head"><span>ชื่อรายงาน</span><button className="th-sort" onClick={() => setAsc(!asc)}>ข้อมูล ณ <span className="sort">{asc ? "↑" : "↓"}</span></button><span>สถานะ</span><span>รูปแบบ</span><span>ดำเนินการ</span></div>
              <div className="rp-scroll">
                {list.map((r) => (
                  <div key={r.id} className={"rp-row" + (cur?.id === r.id ? " on" : "")} onClick={() => setSel(r.id)}>
                    <span className="rp-ico">{KIND_ICON[r.kind]}</span>
                    <div className="rp-name"><b>{title(r)}</b><small>{r.desc}</small></div>
                    <span className="rp-at">{r.createdAt === -1 ? "เมื่อวาน 17:30" : r.createdAt === -1.5 ? "เมื่อวาน 10:15" : relTime(when(r))}</span>
                    <span className="pill ready">พร้อมใช้งาน</span>
                    <span className="pill fmt">PDF, Excel</span>
                    <button className="mini-btn eye" aria-label="ดู" title="ดูตัวอย่าง" onClick={(e) => { e.stopPropagation(); setSel(r.id); }}><I.Eye size={16} />ดู</button>
                    <button className="mini-btn" onClick={(e) => { e.stopPropagation(); rep.xlsx(r.kind, title(r), r.params); }}><I.Download size={15} />ดาวน์โหลด</button>
                    <Menu items={[
                      { label: "ดาวน์โหลด PDF", onClick: () => rep.pdf(r.kind, title(r), r.params) },
                      { label: "ดาวน์โหลด Excel", onClick: () => rep.xlsx(r.kind, title(r), r.params) },
                      { label: "ดาวน์โหลด CSV", onClick: () => rep.csv(r.kind, title(r), r.params) },
                      { label: "ตั้งเวลาส่งรายงานนี้", onClick: () => { app.saveSettings({ schedule: { ...app.settings.schedule, report: r.kind } }); setTab(1); } },
                      ...(r.createdAt > 0 ? [{ label: "ลบรายงาน", danger: true, onClick: () => { app.removeReport(r.id); app.toast("ลบรายงานแล้ว"); } }] : []),
                    ]} />
                  </div>
                ))}
                {!list.length && <div className="empty">ไม่พบรายงาน</div>}
              </div>
            </section>
          </>}
          {tab === 1 && <ScheduleTab />}
          {tab === 2 && <HistoryTab />}
        </div>

        {cur && <Preview r={cur} title={title(cur)} onSchedule={() => setTab(1)} />}
      </div>
      {creating && <CreateModal onClose={() => setCreating(false)} onCreated={(id) => { setSel(id); setTab(0); setCreating(false); }} />}
    </>
  );
}

function Preview({ r, title, onSchedule }: { r: ReportItem; title: string; onSchedule: () => void }) {
  const app = useApp();
  const rep = useReportActions();
  const H = r.params?.horizon ?? app.horizon;
  const f = useMemo(() => forecast(app.ds, { horizon: H, today: app.today, threshold: app.threshold }), [app.ds, H, app.today, app.threshold]);
  const s = useMemo(() => r.kind === "scenario" ? forecast(app.ds, { horizon: H, today: app.today, threshold: app.threshold, claimShock: r.params?.shock ?? 10, receiptDelay: r.params?.delay ?? 0 }) : null, [r, app.ds, H, app.today, app.threshold]);
  const uw = useMemo(() => underwriting(app.ds, app.today), [app.ds, app.today]);
  const rows = useMemo(() => (r.kind === "claims" ? claimRows(app.ds, app.today) : []), [r.kind, app.ds, app.today]);
  const g = s ?? f;
  const sch = app.settings.schedule;
  const k4: [ReactNode, string, string, string][] = r.kind === "underwriting"
    ? [[<I.Wallet size={18} />, "rose", "เบี้ยรับรู้รายได้", fmtM(uw.earned)], [<I.ArrowDown size={18} />, "rose", "ค่าสินไหมเกิดขึ้น", fmtM(uw.incurred)], [<I.ArrowDown size={18} />, "rose", "ค่าใช้จ่าย", fmtM(uw.expenses)], [<I.Bars4 size={18} />, "rose", "ผลรับประกัน", fmtM(uw.result)]]
    : r.kind === "claims"
      ? [[<I.Doc size={18} />, "rose", "เคลมเปิดอยู่", rows.length.toLocaleString()], [<I.Coins size={18} />, "rose", "สำรองรวม", fmtM(rows.reduce((a, x) => a + x.reserve, 0))], [<I.ArrowDown size={18} />, "rose", "คาดจ่ายในช่วง", fmtM(f.totals.claims)], [<I.Bars4 size={18} />, "rose", "กำหนดจ่ายแล้ว", fmtM(f.totals.scheduledClaims)]]
      : [[<I.Wallet size={18} />, "rose", "เงินสดต้นงวด", fmtM(g.opening)], [<I.ArrowUp size={18} />, "green", "เงินสดรับรวม", fmtM(g.totals.receipts)], [<I.ArrowDown size={18} />, "rose", "เงินสดจ่ายสินไหม", fmtM(g.totals.claims)], [<I.Bars4 size={18} />, "rose", "เงินสดปลายงวด", fmtM(g.closing)]];
  const shortG = Math.max(0, app.threshold - g.trough.cash);
  return (
    <section className="card rp-prev">
      <div className="rp-title">
        <div className="rp-name-row">
          <span style={{ color: "#8b1a24", display: "inline-flex", flex: "none" }}>{KIND_ICON[r.kind] ?? <I.Bars4 size={28} />}</span>
          <h2>{title}</h2>
        </div>
        <div className="rp-actions">
          <button className="btn rp-pdf" onClick={() => rep.pdf(r.kind, title, r.params)}><I.FilePdf size={20} />ดาวน์โหลด PDF</button>
          <button className="btn btn-outline rp-xls" onClick={() => rep.xlsx(r.kind, title, r.params)}><I.FileXls size={20} />ดาวน์โหลด Excel</button>
        </div>
      </div>
      <div className="rp-desc">{r.kind === "forecast" ? `ประมาณการกระแสเงินสดและสภาพคล่องในอีก ${H} วันข้างหน้า` : r.desc}</div>
      <div className="rp-meta"><span>ข้อมูล ณ: วันนี้ {hhmm(app.loadedAt)}</span><span>รูปแบบ: PDF, Excel</span></div>

      <div className="card rp-chart chart-card">
        {r.kind === "claims" ? (
          <ByLine f={f} />
        ) : (<>
          <h3 className="card-title" style={{ left: 15, top: 9, fontSize: 18.5 }}>{r.kind === "underwriting" ? "เงินสด" : "คาดการณ์เงินสด"} {H} วัน{s ? " (เทียบสถานการณ์)" : ""}</h3>
          <span className="unit" style={{ position: "absolute", left: 15, top: 44, fontSize: 13 }}>ล้านบาท</span>
          <LiveChart w={644} h={270} x0={64} x1={613} yZero={225} yTop={70} yTickX={39} xTickY={249} tickSize={13} labelSize={13} threshold={app.threshold} compact callout={s ? "scenario" : "breach"}
            series={[{ pts: f.series, color: "#8b1a24", band: "#f9e4e6" }, ...(s ? [{ pts: s.series, color: "#f39a1e", band: "#fdebd2", bandOpacity: 0.7 }] : [])]} />
          <div className="legend-wrap" style={{ top: 271 }}><Legend items={s ? [{ kind: "line-dot", color: "#8b1a24", label: "กรณีฐาน" }, { kind: "line-dot", color: "#f39a1e", label: "สถานการณ์" }, { kind: "thr", color: "#6b7180", label: "เกณฑ์เงินสำรองขั้นต่ำ" }] : LEGEND_MAIN} gap={18} /></div>
        </>)}
      </div>

      <h3 className="rp-sub">สรุปตัวเลขสำคัญ</h3>
      <div className="rp-k4">
        {k4.map(([ic, tone, l, v]) => <div key={l} className="rk"><span className={"kpi-ico " + tone}>{ic}</span><div><small>{l}</small><b>{v}</b></div></div>)}
      </div>
      <div className="rp-k2">
        <div className="rk big"><span className="kpi-ico rose"><I.Shield size={24} /></span><div><small>{r.kind === "underwriting" ? "Combined Ratio" : shortG ? "ต่ำกว่าเกณฑ์" : "สูงกว่าเกณฑ์"}</small><b>{r.kind === "underwriting" ? `${(uw.combined * 100).toFixed(0)}%` : fmtM(shortG || g.trough.cash - app.threshold)}</b><em>{r.kind === "underwriting" ? "ค่าสินไหม + ค่าใช้จ่าย ÷ เบี้ยรับรู้" : shortG ? "ต่ำกว่าเงินสำรองขั้นต่ำ" : "เหนือเงินสำรองขั้นต่ำ"}</em></div></div>
        <div className="rk big"><span className="kpi-ico rose"><I.CalendarGrid size={24} /></span><div><small>วันที่ต่ำสุด</small><b className="th">วันที่ {g.trough.day}</b><em>เงินสดต่ำสุด {fmtM(g.trough.cash)}</em></div></div>
      </div>
      <div className="rp-sched">
        <div className="rs-h"><I.Clock size={22} /><b>การตั้งเวลาส่งรายงาน</b></div>
        <div className="rs-b">
          <div><small>ความถี่</small><span>ทุกวัน{WEEKDAY[sch.weekday]} {sch.time}</span></div>
          <div><small>ผู้รับ</small><span>{sch.recipients}</span></div>
          <div className="rs-st"><small>สถานะ</small><span><i className={sch.enabled ? "on" : ""} />{sch.enabled ? "เปิดใช้งาน" : "ยังไม่เปิดใช้งาน"}</span></div>
          <button className="btn btn-outline rs-btn" onClick={onSchedule}><I.Gear size={18} />ตั้งค่าการส่ง</button>
        </div>
      </div>
    </section>
  );
}

function ByLine({ f }: { f: ReturnType<typeof forecast> }) {
  const rows = Object.entries(f.byLine).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...rows.map((r) => r[1]), 1);
  return (
    <div style={{ padding: "12px 16px" }}>
      <h3 className="card-title" style={{ position: "static", fontSize: 18.5 }}>คาดการณ์จ่ายเคลมตามประเภท ({f.horizon} วัน)</h3>
      <div className="hbars">{rows.map(([l, v]) => <div key={l}><span>{lineLabel(l)}</span><div><i style={{ width: `${(v / max) * 100}%` }} /></div><b>{fmtM(v)}</b></div>)}</div>
    </div>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const app = useApp();
  const [kind, setKind] = useState<ReportItem["kind"]>("forecast");
  const [h, setH] = useState(app.horizon);
  const [shock, setShock] = useState(10);
  const [delay, setDelay] = useState(0);
  const auto = kind === "forecast" ? `พยากรณ์เงินสด ${h} วัน` : kind === "scenario" ? `วิเคราะห์สถานการณ์เคลม ${shock >= 0 ? "+" : ""}${shock}%${delay ? ` รับเงินช้า ${delay} วัน` : ""}` : KIND_TH[kind];
  const [title, setTitle] = useState("");
  return (
    <Modal title="สร้างรายงาน" onClose={onClose} footer={<><button className="btn btn-ghost mbtn" onClick={onClose}>ยกเลิก</button><button className="btn mbtn" onClick={() => { const r = app.addReport({ kind, title: title || auto, desc: { forecast: "ประมาณการกระแสเงินสดและสภาพคล่อง", claims: "สินไหมที่เกิดขึ้น (Incurred) และการจ่ายเงินสด", scenario: "ผลกระทบต่อเงินสดและสภาพคล่อง", underwriting: "เบี้ยประกัน รายจ่าย และอัตราส่วนรวม" }[kind], params: { horizon: h, shock, delay } }); app.log(`สร้างรายงาน "${r.title}"`); app.toast("สร้างรายงานแล้ว"); onCreated(r.id); }}>สร้างรายงาน</button></>}>
      <div className="mgrid">
        <label className="mfield"><span>ประเภทรายงาน</span><select value={kind} onChange={(e) => setKind(e.target.value as any)}>{Object.entries(KIND_TH).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="mfield"><span>ช่วงเวลา</span><select value={h} onChange={(e) => setH(+e.target.value)}>{[30, 60, 90].map((d) => <option key={d} value={d}>{d} วันข้างหน้า</option>)}</select></label>
        {kind === "scenario" && <>
          <label className="mfield"><span>ยอดจ่ายเคลมเปลี่ยน (%)</span><input type="number" min={-50} max={100} value={shock} onChange={(e) => setShock(+e.target.value || 0)} /></label>
          <label className="mfield"><span>เงินรับล่าช้า (วัน)</span><input type="number" min={0} max={60} value={delay} onChange={(e) => setDelay(+e.target.value || 0)} /></label>
        </>}
      </div>
      <label className="mfield"><span>ชื่อรายงาน</span><input value={title} placeholder={auto} onChange={(e) => setTitle(e.target.value)} /></label>
    </Modal>
  );
}

function ScheduleTab() {
  const app = useApp();
  const rep = useReportActions();
  const [s, setS] = useState(app.settings.schedule);
  const sendNow = () => {
    const titles: Record<string, string> = { forecast: `พยากรณ์เงินสด ${app.horizon} วัน`, claims: "สรุปสินไหม", scenario: "วิเคราะห์สถานการณ์เคลม +10%", underwriting: "ผลการรับประกัน" };
    const t = titles[s.report];
    rep.xlsx(s.report as any, t);
    const f = app.fc;
    if (app.settings.channels.email) {
      const body = `${t}\n${app.settings.company}\n\nเงินสดวันนี้ ${fmtM(f.opening)}\nเงินรับคาดการณ์ ${fmtM(f.totals.receipts)}\nเงินจ่ายเคลม ${fmtM(f.totals.claims)}\nเงินสดต่ำสุด ${fmtM(f.trough.cash)} (วันที่ ${f.trough.day})\nเงินสดปลายงวด ${fmtM(f.closing)}\n\n(ไฟล์ Excel ถูกดาวน์โหลดไว้ในเครื่อง แนบไฟล์ก่อนส่ง)`;
      window.location.href = `mailto:${encodeURIComponent(app.settings.email)}?subject=${encodeURIComponent(`[บัญชีจัง วิศวะคุง] ${t}`)}&body=${encodeURIComponent(body)}`;
    }
    app.addSend({ t: Date.now(), report: t, to: s.recipients, channel: app.settings.channels.email ? "อีเมล + ในระบบ" : "ในระบบ", status: "ส่งแล้ว" });
    app.toast("สร้างและส่งรายงานแล้ว");
  };
  return (
    <section className="card sched-card">
      <h3 className="card-title">ตั้งเวลาส่งรายงาน</h3>
      <p className="sub">ระบบจะเตรียมรายงานตามกำหนดและแจ้งเตือนในระบบเมื่อคุณเปิดเว็บหลังถึงเวลาส่ง หากเปิดช่องทางอีเมลไว้ในตั้งค่า จะเปิดแอปอีเมลพร้อมสรุปให้ส่งต่อได้ทันที</p>
      <div className="mgrid">
        <label className="mfield"><span>รายงาน</span><select value={s.report} onChange={(e) => setS({ ...s, report: e.target.value })}>{Object.entries(KIND_TH).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="mfield"><span>ผู้รับ</span><input value={s.recipients} onChange={(e) => setS({ ...s, recipients: e.target.value })} /></label>
        <label className="mfield"><span>ทุกวัน</span><select value={s.weekday} onChange={(e) => setS({ ...s, weekday: +e.target.value })}>{WEEKDAY.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label>
        <label className="mfield"><span>เวลา</span><input type="time" value={s.time} onChange={(e) => setS({ ...s, time: e.target.value })} /></label>
      </div>
      <div className="st-toggle" style={{ margin: "14px 0 18px" }}>
        <button type="button" className={"toggle" + (s.enabled ? " on" : "")} aria-pressed={s.enabled} aria-label="เปิดใช้งาน" onClick={() => setS({ ...s, enabled: !s.enabled })} />
        <span><b>เปิดใช้งานการส่งตามกำหนด</b><small>{s.enabled ? `ส่งทุกวัน${WEEKDAY[s.weekday]} เวลา ${s.time}` : "ปิดอยู่"}</small></span>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button className="btn mbtn" onClick={() => { app.saveSettings({ schedule: s }, `ตั้งเวลาส่งรายงาน ${KIND_TH[s.report]} ทุกวัน${WEEKDAY[s.weekday]} ${s.time} (${s.enabled ? "เปิด" : "ปิด"})`); app.toast("บันทึกการตั้งเวลาแล้ว"); }}>บันทึก</button>
        <button className="btn btn-outline mbtn" onClick={sendNow}>ส่งตอนนี้</button>
      </div>
    </section>
  );
}

function HistoryTab() {
  const app = useApp();
  return (
    <section className="card sched-card">
      <h3 className="card-title">ประวัติการส่งและดาวน์โหลด</h3>
      {app.sends.length ? (
        <table className="tbl mtbl" style={{ marginTop: 12 }}>
          <thead><tr><th>เวลา</th><th>รายงาน</th><th>ช่องทาง</th><th>ผู้รับ</th><th>สถานะ</th></tr></thead>
          <tbody>{app.sends.map((s, i) => <tr key={i}><td>{thaiDateTime(s.t)}</td><td className="th">{s.report}</td><td className="th">{s.channel}</td><td className="th">{s.to}</td><td><span className="pill ready">{s.status}</span></td></tr>)}</tbody>
        </table>
      ) : <div className="empty">ยังไม่มีประวัติ ลองดาวน์โหลดหรือส่งรายงาน</div>}
    </section>
  );
}
