import { ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Legend } from "../components/CashChart";
import LiveChart from "../components/LiveChart";
import { InfoTip, PageHeader } from "../components/Shell";
import { Modal } from "../components/ui";
import * as I from "../components/icons";
import { forecast } from "../engine/forecast";
import { addDays, diffDays, fmtM, mNum } from "../engine/format";
import type { Datasets } from "../engine/types";
import { useApp } from "../store";

type Action = { id: string; kind: "credit" | "sell" | "defer" | "collect"; amount: number; day: number; label: string };
const SHOCK_POS = (v: number) => ((v + 20) / 40) * 86; // knob scale as drawn in the reference
const DELAY_TICKS = [[0, 2], [7, 25.5], [14, 47.5], [21, 72], [30, 96.5]];

/** Apply mitigation actions to a copy of the data. */
function applyActions(ds: Datasets, acts: Action[], today: string, troughDay: number): Datasets {
  if (!acts.length) return ds;
  const ledger = [...ds.ledger];
  let payments = ds.payments;
  for (const a of acts) {
    if (a.kind === "defer") {
      // postpone the largest approved payments due on/before the trough until after it
      const cutoff = addDays(today, troughDay - 1);
      const cands = ds.payments.filter((p) => p.status === "scheduled" && p.payment_date <= cutoff).sort((x, y) => y.amount - x.amount);
      const pick = new Set<typeof cands[number]>(); let acc = 0;
      for (const p of cands) { if (acc >= a.amount) break; pick.add(p); acc += p.amount; }
      payments = payments.map((p) => (pick.has(p) ? { ...p, payment_date: addDays(today, a.day - 1) } : p));
    } else {
      ledger.push({ date: addDays(today, a.day - 1), type: a.kind === "collect" ? "premium_receipt" : "other_receipt", amount: a.amount, status: "expected", description: a.label });
    }
  }
  return { ...ds, ledger, payments };
}

export default function Scenario() {
  const app = useApp();
  const { ds, today, horizon, pendingScenario, setPendingScenario } = app;
  const nav = useNavigate();
  const [shock, setShock] = useState(10);
  const [delay, setDelay] = useState(0);
  const [reserve, setReserve] = useState(app.settings.reserveM);
  const [applied, setApplied] = useState({ shock: 10, delay: 0, reserve: app.settings.reserveM });
  const [actions, setActions] = useState<Action[]>([]);
  const [modal, setModal] = useState<null | "credit" | "sell" | "defer" | "collect" | "reserve">(null);

  useEffect(() => {
    if (pendingScenario) {
      const s = { shock: pendingScenario.shock ?? 10, delay: pendingScenario.delay ?? 0, reserve: app.settings.reserveM };
      setShock(s.shock); setDelay(s.delay); setApplied(s); setPendingScenario(null);
    }
  }, [pendingScenario]); // eslint-disable-line react-hooks/exhaustive-deps

  const thr = applied.reserve * 1e6;
  const base = useMemo(() => forecast(ds, { horizon, today, threshold: thr }), [ds, horizon, today, thr]);
  const sds = useMemo(() => applyActions(ds, actions, today, base.trough.day), [ds, actions, today, base.trough.day]);
  const sc = useMemo(() => forecast(sds, { horizon, today, threshold: thr, claimShock: applied.shock, receiptDelay: applied.delay }), [sds, horizon, today, thr, applied]);
  const short = (f: typeof sc) => Math.max(0, thr - f.trough.cash);
  const sign = (v: number) => (v > 0 ? "+" : "") + mNum(v);
  const pct = (v: number) => `${v > 0 ? "+" : ""}${v}%`;
  const dirty = shock !== applied.shock || delay !== applied.delay || reserve !== applied.reserve;
  const extra = sc.totals.claims - base.totals.claims;
  const label = `${pct(applied.shock)}${applied.delay ? `, รับช้า ${applied.delay} วัน` : ""}`;

  const save = () => {
    app.saveScenario({ shock: applied.shock, delay: applied.delay, reserveM: applied.reserve, closing: sc.closing, trough: sc.trough.cash, troughDay: sc.trough.day, short: short(sc) });
    app.addReport({ kind: "scenario", title: `วิเคราะห์สถานการณ์เคลม ${pct(applied.shock)}${applied.delay ? ` รับเงินช้า ${applied.delay} วัน` : ""}`, desc: `ต่ำสุด ${fmtM(sc.trough.cash)} วันที่ ${sc.trough.day} · ปลายงวด ${fmtM(sc.closing)}`, params: { shock: applied.shock, delay: applied.delay, horizon } });
    app.log(`บันทึกสถานการณ์ เคลม ${pct(applied.shock)} รับเงินช้า ${applied.delay} วัน`);
    app.toast("บันทึกสถานการณ์แล้ว ดูได้ที่หน้ารายงาน");
  };

  const OPTS: [ReactNode, string, string, typeof modal][] = [
    [<I.Bag />, "ใช้วงเงินสินเชื่อระยะสั้น", "ตรวจสอบวงเงินคงเหลือและเงื่อนไข", "credit"],
    [<I.ClipCalc />, "ขายสินทรัพย์การลงทุนบางส่วน", "พิจารณาสภาพคล่องของสินทรัพย์", "sell"],
    [<I.ClipClock />, "ชะลอการจ่ายรายจ่ายที่ไม่จำเป็น", "ทบทวนแผนรายจ่ายระยะสั้น", "defer"],
    [<I.Cursor />, "เร่งรับชำระเบี้ยประกัน", "ติดตามลูกหนี้และเสนอสิทธิประโยชน์", "collect"],
    [<I.ClipCheck />, "ทบทวนระดับเงินสำรองขั้นต่ำ", "พิจารณาให้เหมาะสมกับความเสี่ยง", "reserve"],
  ];

  return (
    <>
      <PageHeader title="จำลองสถานการณ์" selects={[196, 214]} gap={98} />
      <div className="sc">
        <aside className="card sc-left">
          <h2>การเปลี่ยนแปลงสมมติฐาน</h2>
          <div className="sub">ปรับสมมติฐานเพื่อดูผลกระทบต่อกระแสเงินสด</div>

          <div className="sc-block raised">
            <div className="sc-lbl">ยอดจ่ายเคลมเพิ่มขึ้น <InfoTip text="ปรับยอดจ่ายเคลมทุกรายการ (ทั้งที่กำหนดจ่ายและที่คาดการณ์จากสำรอง) ตามเปอร์เซ็นต์" /><span className="pct">{pct(shock)}</span></div>
            <div className="slider sc-slider">
              <div className="track" /><div className="fill" style={{ width: `${SHOCK_POS(shock)}%` }} /><div className="knob" style={{ left: `${SHOCK_POS(shock)}%` }} />
              <input type="range" min={-20} max={20} step={1} value={shock} onChange={(e) => setShock(+e.target.value)} aria-label="ยอดจ่ายเคลมเพิ่มขึ้น" />
            </div>
            <div className="ticks sc-ticks">{[-20, -10, 0, 10, 20].map((t, i) => <span key={t} style={{ left: `${[4, 25, 50.5, 75.5, 96][i]}%`, cursor: "pointer" }} onClick={() => setShock(t)}>{pct(t)}</span>)}</div>
          </div>

          <div className="sc-block">
            <div className="sc-lbl">เงินรับล่าช้า <InfoTip text="เลื่อนวันรับเงินที่คาดว่าจะได้รับทั้งหมด (เบี้ยประกัน, เงินจากผู้รับประกันภัยต่อ) ออกไปตามจำนวนวัน" /><span className="pct">{delay} วัน</span></div>
            <div className="slider sc-slider">
              <div className="track" /><div className="fill" style={{ width: `${(delay / 30) * 100}%` }} /><div className="knob" style={{ left: `calc(${(delay / 30) * 100}% + ${delay ? 0 : 4}px)` }} />
              <input type="range" min={0} max={30} value={delay} onChange={(e) => setDelay(+e.target.value)} aria-label="เงินรับล่าช้า (วัน)" />
            </div>
            <div className="ticks sc-ticks">{DELAY_TICKS.map(([t, p]) => <span key={t} style={{ left: `${p}%`, cursor: "pointer" }} onClick={() => setDelay(t)}>{t}</span>)}</div>
          </div>

          <div className="sc-block reserve">
            <div className="sc-lbl">เงินสำรองขั้นต่ำ <InfoTip text="เกณฑ์เงินสดขั้นต่ำที่ใช้เปรียบเทียบในสถานการณ์นี้ (ไม่เปลี่ยนค่าในตั้งค่าระบบ)" /></div>
            <div className="input"><input type="number" min={0} value={reserve} onChange={(e) => setReserve(Math.max(0, +e.target.value || 0))} aria-label="เงินสำรองขั้นต่ำ (ล้านบาท)" /><span className="suffix">ล้านบาท</span></div>
            <div className="hint" style={{ marginTop: 9 }}>ช่วงแนะนำ 30 – 60 ล้านบาท</div>
          </div>

          <button className={"btn sc-btn" + (dirty ? " pulse" : "")} onClick={() => { setApplied({ shock, delay, reserve }); app.toast("คำนวณสถานการณ์ใหม่แล้ว"); }}><I.Calculator size={22} />คำนวณสถานการณ์</button>
          <button className="btn btn-ghost sc-btn2" onClick={() => { setShock(10); setDelay(0); setReserve(app.settings.reserveM); setApplied({ shock: 10, delay: 0, reserve: app.settings.reserveM }); setActions([]); }}><I.Reset size={20} />รีเซ็ต</button>
          {actions.length > 0 && (
            <div className="sc-acts">
              <b>มาตรการที่ใส่ในสถานการณ์</b>
              {actions.map((a) => <div key={a.id}><span>{a.label}</span><button aria-label="ลบ" onClick={() => setActions(actions.filter((x) => x.id !== a.id))}>×</button></div>)}
            </div>
          )}
        </aside>

        <div className="sc-mid">
          <section className="card sc-res">
            <h2>ผลการจำลองสถานการณ์</h2>
            <div className="sub">เปรียบเทียบกับกรณีฐาน (Base Case)</div>
            <div className="sc-note"><span className="bang">!</span><div><b>สมมติฐาน: เคลม {label}{actions.length ? ` + ${actions.length} มาตรการ` : ""}</b><div>ผลลัพธ์เป็นการประมาณการ ไม่รับประกันว่าจะเกิดขึ้นจริง</div></div></div>
            <div className="sc-kpis">
              <div className="sk"><div className="sk-h"><span className="kpi-ico rose"><I.Wallet size={22} /></span><span>เงินสดคงเหลือสิ้นสุด<br />(วันที่ {horizon})</span></div>
                <div className="sk-2"><div><small>กรณีฐาน</small><b>{fmtM(base.closing)}</b></div><div><small>สถานการณ์</small><b>{fmtM(sc.closing)}</b></div></div></div>
              <div className="sk"><div className="sk-h"><span className="kpi-ico rose"><I.Doc size={22} /></span><span>ยอดจ่ายเคลมส่วนเพิ่ม<br /><small>(จาก {pct(applied.shock)})</small></span></div>
                <div className="sk-1"><b>{fmtM(extra)}</b><small>คำนวณจาก {fmtM(base.totals.claims, 0)} × {Math.abs(applied.shock)}%</small></div></div>
              <div className="sk"><div className="sk-h"><span className="kpi-ico rose"><I.ChartLine size={22} /></span><span>เงินสดต่ำสุด<br /><small className="lg">(ระหว่าง {horizon} วัน)</small></span></div>
                <div className="sk-2"><div><small>กรณีฐาน</small><b>{fmtM(base.trough.cash)}</b></div><div><small>สถานการณ์</small><b className={sc.trough.cash < thr ? "red" : ""}>{fmtM(sc.trough.cash)}</b></div></div></div>
              <div className="sk"><div className="sk-h"><span className="kpi-ico rose"><I.Shield size={22} /></span><span>ขาดจากเงินสำรองขั้นต่ำ</span></div>
                <div className="sk-2"><div><small>กรณีฐาน</small><b>{fmtM(short(base))}</b></div><div><small>สถานการณ์</small><b className={short(sc) > 0 ? "red" : ""}>{fmtM(short(sc))}</b></div></div></div>
            </div>
          </section>

          <div className="sc-grid">
            <section className="card chart-card sc-chart">
              <h3 className="card-title" style={{ top: 13 }}>คาดการณ์เงินสด {horizon} วัน</h3>
              <span className="unit" style={{ position: "absolute", left: 17, top: 47 }}>ล้านบาท</span>
              <LiveChart w={664} h={300} x0={63} x1={626} yZero={250} yTop={73} yTickX={40} xTickY={276} tickSize={13.5} labelSize={13.5} threshold={thr} callout="scenario" thresholdLabel={`เงินสำรองขั้นต่ำ ${fmtM(thr)}`}
                series={[{ pts: base.series, color: "#8b1a24", band: "#f9e4e6" }, { pts: sc.series, color: "#f39a1e", band: "#fdebd2", bandOpacity: 0.7 }]} />
              <div className="legend-wrap" style={{ top: 297 }}>
                <Legend gap={14} items={[{ kind: "line-dot", color: "#8b1a24", label: "กรณีฐาน (Base Case)" }, { kind: "line-dot", color: "#f39a1e", label: `สถานการณ์ (${pct(applied.shock)})` }, { kind: "thr", color: "#7b8191", label: "เงินสำรองขั้นต่ำ" }, { kind: "band", color: "#f3b3b5", label: "ต่ำกว่าเกณฑ์" }]} />
              </div>
            </section>

            <aside className="card sc-src">
              <div className="src-head"><span style={{ display: "inline-flex", marginTop: 2 }}><I.BulbFilled size={30} /></span><div><h3>ตรวจสอบแหล่งเงินสำรอง</h3><div className="sub">พิจารณาทางเลือกเพื่อรองรับเงินสดที่ขาด</div></div></div>
              {short(sc) > 0 ? (
                <div className="danger"><span className="d-ico"><I.Shield size={26} /></span><div><b>ในสถานการณ์นี้ เงินสดต่ำสุดต่ำกว่าเงินสำรองขั้นต่ำ {mNum(short(sc))} ล้านบาท</b><p>ควรพิจารณาจัดหาแหล่งเงินสำรองเพิ่มเติมเพื่อลดความเสี่ยงด้านสภาพคล่อง</p></div></div>
              ) : (
                <div className="danger ok"><span className="d-ico"><I.Shield size={26} /></span><div><b>ในสถานการณ์นี้ เงินสดไม่ต่ำกว่าเงินสำรองขั้นต่ำ</b><p>เงินสดต่ำสุด {fmtM(sc.trough.cash)} สูงกว่าเกณฑ์ {fmtM(sc.trough.cash - thr)}</p></div></div>
              )}
              {OPTS.map(([ic, t, s, k]) => (
                <button key={t} className="opt" onClick={() => setModal(k)}><span className="o-ico">{ic}</span><span className="o-txt"><b>{t}</b><small>{s}</small></span><I.ChevronRight size={18} /></button>
              ))}
              <div className="sc-warn"><I.Info size={18} /><span>ผลลัพธ์เป็นเพียงการประมาณการ<br />ไม่รับประกันว่าจะเกิดขึ้นจริง กรุณาพิจารณาเพิ่มเติม<br />ร่วมกับคณะกรรมการบริหารความเสี่ยง</span></div>
              <button className="btn sc-save" onClick={save}><I.Save size={22} />บันทึกสถานการณ์</button>
            </aside>

            <section className="card sc-cmp">
              <h3 className="card-title">สรุปตัวเลขเปรียบเทียบ <span>(หน่วย: ล้านบาท)</span></h3>
              <table className="tbl">
                <colgroup><col style={{ width: 214 }} /><col style={{ width: 160 }} /><col style={{ width: 196 }} /><col /></colgroup>
                <thead><tr><th>รายการ</th><th className="c">กรณีฐาน (Base Case)</th><th className="c">สถานการณ์ ({pct(applied.shock)})</th><th className="c">ผลต่าง</th></tr></thead>
                <tbody>
                  {([
                    ["เงินสดต้นงวด (วันที่ 1)", base.opening, sc.opening, ""],
                    ["เงินรับรวม", base.totals.receipts, sc.totals.receipts, ""],
                    ["จ่ายเคลม (Cash Payment)", base.totals.claims, sc.totals.claims, ""],
                    ["รายจ่ายอื่น", base.totals.other, sc.totals.other, ""],
                    [`เงินสดคงเหลือสิ้นสุด (วันที่ ${horizon})`, base.closing, sc.closing, "hl b"],
                    [`เงินสดต่ำสุด (ระหว่าง ${horizon} วัน)`, base.trough.cash, sc.trough.cash, "b"],
                    [`ขาดจากเงินสำรองขั้นต่ำ (${fmtM(thr)})`, short(base), short(sc), "hl b red"],
                  ] as [string, number, number, string][]).map(([l, a, b, cls]) => {
                    const d = b - a;
                    return <tr key={l} className={cls}><td className="th">{l}</td><td className="c">{(a / 1e6).toFixed(1)}</td><td className="c s">{(b / 1e6).toFixed(1)}</td><td className={"c" + (Math.abs(d) >= 5e4 ? " dred" : "")}>{Math.abs(d) < 5e4 ? "-" : sign(d)}</td></tr>;
                  })}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      </div>
      {modal && modal !== "reserve" && <ActionModal kind={modal} need={short(sc)} troughDay={sc.trough.day} firstBreach={sc.series.find((p) => p.cash < thr)?.day ?? sc.trough.day} horizon={horizon} onClose={() => setModal(null)} onApply={(a) => { setActions([...actions, a]); setModal(null); app.toast("เพิ่มมาตรการในสถานการณ์แล้ว"); }} sds={sds} applied={applied} today={today} thr={thr} payments={ds.payments} />}
      {modal === "reserve" && <ReserveModal current={applied.reserve} trough={sc.trough.cash} onClose={() => setModal(null)} onUse={(v) => { setReserve(v); setApplied({ ...applied, reserve: v }); setModal(null); }} onSave={(v) => { app.saveSettings({ reserveM: v }, `แก้ไขเกณฑ์สภาพคล่องขั้นต่ำ\nจาก ${app.settings.reserveM} เป็น ${v} ล้านบาท`); setReserve(v); setApplied({ ...applied, reserve: v }); setModal(null); app.toast("บันทึกเกณฑ์ใหม่ในตั้งค่าระบบแล้ว"); }} onSettings={() => nav("/settings?tab=alerts")} />}
    </>
  );
}

function ActionModal({ kind, need, troughDay, firstBreach, horizon, onClose, onApply, sds, applied, today, thr, payments }: { kind: "credit" | "sell" | "defer" | "collect"; need: number; troughDay: number; firstBreach: number; horizon: number; onClose: () => void; onApply: (a: Action) => void; sds: Datasets; applied: { shock: number; delay: number }; today: string; thr: number; payments: Datasets["payments"] }) {
  const T: Record<string, { title: string; what: string; amountLabel: string; dayLabel: string }> = {
    credit: { title: "ใช้วงเงินสินเชื่อระยะสั้น", what: "เบิกวงเงิน (O/D หรือ Promissory note) เข้าบัญชีก่อนวันที่เงินสดต่ำสุด", amountLabel: "จำนวนเงินที่เบิก (ล้านบาท)", dayLabel: "วันที่เบิกเงิน" },
    sell: { title: "ขายสินทรัพย์การลงทุนบางส่วน", what: "ขายหลักทรัพย์ลงทุนระยะสั้นที่มีสภาพคล่องสูง (ตั๋วเงินคลัง/กองทุนตลาดเงิน)", amountLabel: "มูลค่าที่ขาย (ล้านบาท)", dayLabel: "วันที่ได้รับเงิน" },
    defer: { title: "ชะลอการจ่ายที่ไม่เร่งด่วน", what: "เลื่อนรายการกำหนดจ่ายมูลค่าสูงที่ครบก่อนวันที่เงินสดต่ำสุดออกไป (ต้องอยู่ในกำหนดเวลาจ่ายสินไหมตามที่ คปภ. กำหนด)", amountLabel: "ยอดที่ต้องการเลื่อน (ล้านบาท)", dayLabel: "เลื่อนไปจ่ายวันที่" },
    collect: { title: "เร่งรับชำระเบี้ยประกัน", what: "ติดตามเบี้ยค้างรับและเสนอส่วนลดชำระเร็ว เพื่อให้เงินเข้าเร็วขึ้น", amountLabel: "เบี้ยที่คาดว่าจะเร่งเก็บได้ (ล้านบาท)", dayLabel: "วันที่คาดว่าเงินเข้า" },
  };
  const t = T[kind];
  const sug = Math.max(1, Math.ceil(need / 1e6));
  const [amt, setAmt] = useState(sug);
  const [day, setDay] = useState(kind === "defer" ? Math.min(horizon, troughDay + 2) : Math.max(2, firstBreach - 1));
  const a: Action = { id: `a${Date.now()}`, kind, amount: amt * 1e6, day, label: `${t.title} ${amt} ล้านบาท (${kind === "defer" ? "ไป" : ""}วันที่ ${day})` };
  const res = forecast(applyActions(sds, [a], today, troughDay), { horizon, today, threshold: thr, claimShock: applied.shock, receiptDelay: applied.delay });
  const before = forecast(sds, { horizon, today, threshold: thr, claimShock: applied.shock, receiptDelay: applied.delay });
  const cands = kind === "defer" ? payments.filter((p) => p.status === "scheduled" && diffDays(p.payment_date, today) < troughDay).sort((x, y) => y.amount - x.amount) : [];
  return (
    <Modal title={t.title} onClose={onClose} footer={<><button className="btn btn-ghost mbtn" onClick={onClose}>ยกเลิก</button><button className="btn mbtn" onClick={() => onApply(a)}>ใส่มาตรการนี้ในสถานการณ์</button></>}>
      <p>{t.what}</p>
      <p className="muted">ช่องว่างสภาพคล่องในสถานการณ์ปัจจุบัน: <b>{fmtM(need)}</b> (เงินสดต่ำสุดวันที่ {troughDay})</p>
      <div className="mgrid">
        <label className="mfield"><span>{t.amountLabel}</span><input type="number" min={0} value={amt} onChange={(e) => setAmt(Math.max(0, +e.target.value || 0))} /></label>
        <label className="mfield"><span>{t.dayLabel}</span><input type="number" min={2} max={horizon} value={day} onChange={(e) => setDay(Math.min(horizon, Math.max(2, +e.target.value || 2)))} /></label>
      </div>
      {kind === "defer" && <p className="muted small">รายการที่จะถูกเลื่อน (มูลค่าสูงก่อน): {cands.slice(0, 6).map((p) => `${p.claim_id} ${fmtM(p.amount)}`).join(", ")}{cands.length > 6 ? " …" : ""}</p>}
      <div className="mres">
        <div><small>เงินสดต่ำสุด</small><b>{fmtM(before.trough.cash)} → {fmtM(res.trough.cash)}</b></div>
        <div><small>ขาดจากเกณฑ์</small><b className={res.trough.cash < thr ? "red" : "green"}>{fmtM(Math.max(0, thr - res.trough.cash))}</b></div>
        <div><small>เงินสดปลายงวด</small><b>{fmtM(res.closing)}</b></div>
      </div>
      {kind !== "defer" && kind !== "collect" && <p className="muted small">หมายเหตุ: ไม่ได้รวมดอกเบี้ย/ค่าธรรมเนียมและการชำระคืนภายในช่วงเวลานี้</p>}
    </Modal>
  );
}

function ReserveModal({ current, trough, onClose, onUse, onSave, onSettings }: { current: number; trough: number; onClose: () => void; onUse: (v: number) => void; onSave: (v: number) => void; onSettings: () => void }) {
  const [v, setV] = useState(current);
  return (
    <Modal title="ทบทวนระดับเงินสำรองขั้นต่ำ" onClose={onClose} footer={<><button className="btn btn-ghost mbtn" onClick={onSettings}>ไปที่ตั้งค่า</button><button className="btn btn-ghost mbtn" onClick={() => onUse(v)}>ใช้เฉพาะสถานการณ์นี้</button><button className="btn mbtn" onClick={() => onSave(v)}>บันทึกเป็นค่าระบบ</button></>}>
      <p>เกณฑ์ปัจจุบัน {current} ล้านบาท · เงินสดต่ำสุดในสถานการณ์ {fmtM(trough)}</p>
      <label className="mfield"><span>เงินสำรองขั้นต่ำใหม่ (ล้านบาท)</span><input type="number" min={0} value={v} onChange={(e) => setV(Math.max(0, +e.target.value || 0))} /></label>
      <p className="muted small">ช่วงแนะนำ 30–60 ล้านบาท ควรสอดคล้องกับนโยบายบริหารความเสี่ยงด้านสภาพคล่องและเงินกองทุนตามความเสี่ยง (CAR) ที่ คปภ. กำหนด</p>
    </Modal>
  );
}
