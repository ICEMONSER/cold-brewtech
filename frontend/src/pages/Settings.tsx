import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/Shell";
import { Dropdown, Menu, Modal } from "../components/ui";
import * as I from "../components/icons";
import { crossCheck, downloadText, toCSV, validate, type Validation } from "../engine/csv";
import { addDays, fmtM, hhmm, mNum, thaiDate, thaiDateTime } from "../engine/format";
import { sampleData } from "../engine/sample";
import { SOURCES, type SourceKey } from "../engine/types";
import { useApp } from "../store";

const TABS = ["company", "sources", "alerts", "users"] as const;
const SRC_ICON: Record<SourceKey, JSX.Element> = { policies: <I.Doc size={20} />, claims: <I.Shield size={20} />, reserves: <I.ChartLine size={20} />, payments: <I.Coins size={20} />, ledger: <I.Bars4 size={20} /> };

export default function Settings() {
  const [sp, setSp] = useSearchParams();
  const tab = Math.max(0, TABS.indexOf((sp.get("tab") ?? "alerts") as any));
  return (
    <>
      <PageHeader title="ตั้งค่าระบบ" />
      <div className="tabs st-tabs">
        {["บริษัท", "แหล่งข้อมูล", "การแจ้งเตือน", "สิทธิ์ผู้ใช้"].map((t, i) => (
          <button key={t} className={tab === i ? "on" : ""} onClick={() => setSp({ tab: TABS[i] })} style={{ marginLeft: [26, 51, 50, 50][i] }}>{t}</button>
        ))}
      </div>
      {tab === 2 && <Alerts />}
      {tab === 1 && <Sources />}
      {tab === 0 && <Company />}
      {tab === 3 && <Users />}
    </>
  );
}

/* ---------------- การแจ้งเตือน ---------------- */
function Alerts() {
  const app = useApp();
  const s = app.settings;
  const [reserve, setReserve] = useState(s.reserveM);
  const [lead, setLead] = useState(s.leadDays);
  const [rules, setRules] = useState(s.rules);
  const [ch, setCh] = useState(s.channels);
  const [email, setEmail] = useState(s.email);
  const [useDraft, setUseDraft] = useState(true);
  const dirty = reserve !== s.reserveM || lead !== s.leadDays || rules.below !== s.rules.below || rules.stale !== s.rules.stale || ch.inApp !== s.channels.inApp || ch.email !== s.channels.email || email !== s.email;

  const R = useDraft ? reserve : s.reserveM, L = useDraft ? lead : s.leadDays, C = useDraft ? ch : s.channels;
  const trough = app.fc.trough;
  const short = R * 1e6 - trough.cash;
  const notifyOn = short > 0 ? addDays(trough.date, -L) : null;

  const save = () => {
    const changes: string[] = [];
    if (reserve !== s.reserveM) changes.push(`แก้ไขเกณฑ์สภาพคล่องขั้นต่ำ\nจาก ${s.reserveM} เป็น ${reserve} ล้านบาท`);
    if (lead !== s.leadDays) changes.push(`แก้ไขระยะเวลาเตือนล่วงหน้า\nจาก ${s.leadDays} เป็น ${lead} วัน`);
    if (rules.below !== s.rules.below || rules.stale !== s.rules.stale) changes.push("แก้ไขกฎแจ้งเตือน");
    if (ch.inApp !== s.channels.inApp || ch.email !== s.channels.email || email !== s.email) changes.push(`แก้ไขช่องทางแจ้งเตือน: ${[ch.inApp && "ในระบบ", ch.email && `อีเมล (${email})`].filter(Boolean).join(", ") || "ปิดทั้งหมด"}`);
    app.saveSettings({ reserveM: reserve, leadDays: lead, rules, channels: ch, email });
    changes.forEach((c) => app.log(c));
    app.toast(changes.length ? "บันทึกการตั้งค่าแล้ว" : "ไม่มีการเปลี่ยนแปลง");
  };
  const cancel = () => { setReserve(s.reserveM); setLead(s.leadDays); setRules(s.rules); setCh(s.channels); setEmail(s.email); app.toast("ยกเลิกการแก้ไขแล้ว"); };

  return (
    <>
      <div className="st">
        <div className="st-left">
          <section className="card st-card">
            <h3 className="card-title">เกณฑ์สภาพคล่อง</h3>
            <div className="sub">กำหนดเกณฑ์สำหรับการแจ้งเตือนความเสี่ยงด้านสภาพคล่อง</div>
            <div className="st-fields">
              <div>
                <div className="field-label">เงินสำรองขั้นต่ำ</div>
                <div className="input"><input type="number" min={0} value={reserve} onChange={(e) => setReserve(Math.max(0, +e.target.value || 0))} aria-label="เงินสำรองขั้นต่ำ" /><span className="suffix" style={{ width: 87 }}>ล้านบาท</span></div>
                <div className="hint">แจ้งเตือนเมื่อเงินสดต่ำกว่าเกณฑ์นี้</div>
              </div>
              <div>
                <div className="field-label">ระยะเวลาเตือนล่วงหน้า</div>
                <div className="input"><input type="number" min={0} max={90} value={lead} onChange={(e) => setLead(Math.min(90, Math.max(0, +e.target.value || 0)))} aria-label="ระยะเวลาเตือนล่วงหน้า (วัน)" /><span className="suffix" style={{ width: 53, justifyContent: "center", padding: 0 }}>วัน</span></div>
                <div className="hint">แจ้งเตือนล่วงหน้าก่อนถึงวันที่คาดว่าจะต่ำกว่าเกณฑ์</div>
              </div>
            </div>
          </section>

          <section className="card st-card st-rules">
            <div className="st-col">
              <h3 className="card-title">กฎแจ้งเตือน</h3>
              <div className="sub">เลือกเหตุการณ์ที่ต้องการรับการแจ้งเตือน</div>
              {([["below", "เงินสดต่ำกว่าเกณฑ์สภาพคล่อง", "แจ้งเตือนเมื่อมีการคาดการณ์ว่าเงินสดจะต่ำกว่าเงินสำรองขั้นต่ำ"], ["stale", "ข้อมูลไม่อัปเดตเกิน 24 ชั่วโมง", "แจ้งเตือนเมื่อแหล่งข้อมูลไม่ได้รับการอัปเดตตามเวลาที่กำหนด"]] as const).map(([k, t, d], i) => (
                <div key={k} className="st-check" style={{ marginTop: i ? 25 : 23 }} onClick={() => setRules({ ...rules, [k]: !rules[k] })}>
                  <button type="button" role="checkbox" aria-checked={rules[k]} className={"cbox" + (rules[k] ? "" : " off")}>{rules[k] && <I.Check size={16} />}</button>
                  <span><b>{t}</b><small>{d}</small></span>
                </div>
              ))}
            </div>
            <div className="st-col right">
              <h3 className="card-title">ช่องทางแจ้งเตือน</h3>
              <div className="sub">เลือกช่องทางที่ต้องการรับการแจ้งเตือน</div>
              <div className="st-toggle" style={{ marginTop: 19 }}>
                <button type="button" className={"toggle" + (ch.inApp ? " on" : "")} aria-pressed={ch.inApp} onClick={() => setCh({ ...ch, inApp: !ch.inApp })} aria-label="ในระบบ" />
                <span><b>ในระบบ</b><small>แสดงการแจ้งเตือนในระบบ (สำหรับผู้ใช้ที่มีสิทธิ์)</small></span>
              </div>
              <div className="st-toggle" style={{ marginTop: 22 }}>
                <button type="button" className={"toggle" + (ch.email ? " on" : "")} aria-pressed={ch.email} onClick={() => setCh({ ...ch, email: !ch.email })} aria-label="อีเมล" />
                <span><b>อีเมล</b>{ch.email ? <input className="st-email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="อีเมลผู้รับ" /> : <small>ส่งอีเมลแจ้งเตือน (ตัวอย่างการใช้งานเท่านั้น)</small>}</span>
              </div>
              <div className="st-actions">
                <button className="btn" onClick={save}>บันทึกการตั้งค่า{dirty && " •"}</button>
                <button className="btn btn-ghost st-cancel" onClick={cancel} disabled={!dirty}>ยกเลิก</button>
              </div>
            </div>
          </section>
        </div>

        <section className="card st-prev">
          <div className="sp-head"><h3 className="card-title">ตัวอย่างการแจ้งเตือน</h3><button className="plain-link" onClick={() => setUseDraft(!useDraft)}><I.Eye size={20} />{useDraft ? "ดูตัวอย่างจากการตั้งค่าปัจจุบัน" : "ดูตัวอย่างจากค่าที่กำลังแก้ไข"}</button></div>
          {short > 0 ? (
            <div className="sp-alert">
              <div className="sp-top"><span className="bang">!</span><b>วันที่ {trough.day} เงินสดอาจต่ำกว่าเกณฑ์<br />{mNum(short)} ล้านบาท</b></div>
              <p>จากการคาดการณ์เงินสด {app.horizon} วัน คาดว่าเงินสดจะต่ำกว่าเกณฑ์สภาพคล่อง {R} ล้านบาท ในวันที่ {trough.day} โดยมีเงินสดต่ำสุดที่ {mNum(trough.cash)} ล้านบาท (ต่ำกว่าเกณฑ์ {mNum(short)} ล้านบาท)</p>
            </div>
          ) : (
            <div className="sp-alert ok">
              <div className="sp-top"><span className="bang okb"><I.Check size={16} /></span><b>ไม่มีการแจ้งเตือน<br />เงินสดสูงกว่าเกณฑ์</b></div>
              <p>เงินสดต่ำสุด {mNum(trough.cash)} ล้านบาท ในวันที่ {trough.day} สูงกว่าเกณฑ์ {R} ล้านบาท</p>
            </div>
          )}
          <dl className="sp-dl">
            <div><dt>แหล่งข้อมูล</dt><dd>พยากรณ์เงินสด {app.horizon} วัน</dd></div>
            <div><dt>สิทธิ์ผู้ใช้ที่เห็นการแจ้งเตือน</dt><dd>Finance Admin</dd></div>
            <div><dt>ช่องทางการแจ้งเตือน</dt><dd>{[C.inApp && "ในระบบ", C.email && "อีเมล"].filter(Boolean).join(", ") || "ปิดทั้งหมด"}</dd></div>
            {notifyOn && <div><dt>แจ้งเตือนครั้งแรก</dt><dd>{thaiDate(notifyOn < app.today ? app.today : notifyOn)} ({L} วันก่อนถึงวันที่ {trough.day})</dd></div>}
          </dl>
        </section>
      </div>

      <div className="st-bottom">
        <ConnTable />
        <History />
      </div>
    </>
  );
}

function useSourceTools() {
  const app = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ key: SourceKey; name: string; v: Validation } | null>(null);
  const [check, setCheck] = useState<{ key: SourceKey; issues: string[] } | null>(null);
  const target = useRef<SourceKey>("claims");
  const pick = (k: SourceKey) => { target.current = k; fileRef.current?.click(); };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    const text = await f.text();
    setPending({ key: target.current, name: f.name, v: validate(target.current, text) });
  };
  const spec = (k: SourceKey) => SOURCES.find((s) => s.key === k)!;
  const template = (k: SourceKey) => {
    const s = spec(k);
    const ex = (sampleData(app.today)[k] as any[]).slice(0, 5);
    downloadText(`template-${s.file}`, toCSV(s.columns, ex));
    app.toast(`ดาวน์โหลดเทมเพลต ${s.file} แล้ว`);
  };
  const current = (k: SourceKey) => { const s = spec(k); downloadText(s.file, toCSV(s.columns, app.ds[k] as any[])); app.toast(`ดาวน์โหลด ${s.file} (${(app.ds[k] as any[]).length.toLocaleString()} แถว)`); };
  const runCheck = (k: SourceKey) => setCheck({ key: k, issues: crossCheck(app.ds, k) });
  const ui = (
    <>
      <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
      {pending && (
        <Modal title={`นำเข้า ${pending.name} → ${spec(pending.key).system}`} onClose={() => setPending(null)}
          footer={<><button className="btn btn-ghost mbtn" onClick={() => setPending(null)}>ยกเลิก</button><button className="btn mbtn" disabled={!pending.v.rows.length} onClick={() => { const ok = app.upload(pending.key, pending.v.rows, pending.name); app.toast(ok ? "นำเข้าข้อมูลแล้ว คำนวณใหม่ทั้งระบบ" : "นำเข้าแล้ว (ไฟล์ใหญ่เกินกว่าจะจำไว้ในเบราว์เซอร์ จะหายเมื่อรีเฟรช)"); setPending(null); }}>นำเข้า {pending.v.rows.length.toLocaleString()} แถว</button></>}>
          {pending.v.errors.length === 0 ? <p className="green">✓ รูปแบบถูกต้อง {pending.v.rows.length.toLocaleString()} แถว</p> : <><p className="red">พบปัญหา {pending.v.errors.length}{pending.v.errors.length >= 15 ? "+" : ""} รายการ {pending.v.rows.length ? `(นำเข้าได้เฉพาะ ${pending.v.rows.length.toLocaleString()} แถวที่ถูกต้อง)` : ""}</p><ul className="errs">{pending.v.errors.map((e) => <li key={e}>{e}</li>)}</ul></>}
          {pending.v.warnings.map((w) => <p key={w} className="muted">⚠ {w}</p>)}
          <p className="muted small">คอลัมน์ที่ต้องมี: {spec(pending.key).columns.join(", ")}</p>
        </Modal>
      )}
      {check && (
        <Modal title={`ตรวจสอบ ${spec(check.key).system}`} onClose={() => setCheck(null)} footer={<button className="btn mbtn" onClick={() => setCheck(null)}>ปิด</button>}>
          <p>จำนวนแถว: <b>{(app.ds[check.key] as any[]).length.toLocaleString()}</b> · แหล่ง: {app.meta[check.key].origin === "upload" ? `อัปโหลด (${app.meta[check.key].fileName})` : "ข้อมูลตัวอย่าง"} · อัปเดต {thaiDateTime(app.meta[check.key].updatedAt)}</p>
          {check.issues.length ? <ul className="errs">{check.issues.map((i) => <li key={i}>{i}</li>)}</ul> : <p className="green">✓ เชื่อมโยงกับแหล่งข้อมูลอื่นครบถ้วน ไม่พบปัญหา</p>}
        </Modal>
      )}
    </>
  );
  return { pick, template, current, runCheck, ui };
}

function ConnTable() {
  const app = useApp();
  const t = useSourceTools();
  return (
    <section className="card st-conn">
      <h3 className="card-title">สถานะการเชื่อมต่อข้อมูล</h3>
      <table className="tbl">
        <colgroup><col style={{ width: 150 }} /><col style={{ width: 144 }} /><col style={{ width: 129 }} /><col style={{ width: 113 }} /><col style={{ width: 118 }} /><col /></colgroup>
        <thead><tr><th>แหล่งข้อมูล</th><th>สถานะ</th><th>ข้อมูลล่าสุด</th><th>อัปเดตล่าสุด</th><th>การดำเนินการ</th><th /></tr></thead>
        <tbody>
          {SOURCES.map((s) => {
            const m = app.meta[s.key];
            return (
              <tr key={s.key}>
                <td><span className="st-src" title={s.system}>{SRC_ICON[s.key]}{s.th}</span></td>
                <td className="th"><span className={"st-dot" + (m.origin === "upload" ? "" : " sample")} />{m.origin === "upload" ? "ข้อมูลบริษัท" : "ข้อมูลตัวอย่าง"}</td>
                <td className="th">{m.rows.toLocaleString()} แถว</td>
                <td>{hhmm(m.updatedAt)}</td>
                <td><button className="pill check" onClick={() => t.runCheck(s.key)}>ตรวจสอบ</button></td>
                <td><Menu items={[
                  { label: "อัปโหลดไฟล์ CSV", onClick: () => t.pick(s.key) },
                  { label: "ดาวน์โหลดข้อมูลปัจจุบัน", onClick: () => t.current(s.key) },
                  { label: "ดาวน์โหลดเทมเพลต", onClick: () => t.template(s.key) },
                  ...(m.origin === "upload" ? [{ label: "กลับไปใช้ข้อมูลตัวอย่าง", danger: true, onClick: () => { app.resetSource(s.key); app.toast("กลับไปใช้ข้อมูลตัวอย่างแล้ว"); } }] : []),
                ]} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {t.ui}
    </section>
  );
}

function History() {
  const app = useApp();
  const [range, setRange] = useState("all");
  const [tick, setTick] = useState(0);
  const items = useMemo(() => app.audit.filter((a) => range === "all" || Date.now() - a.t < (range === "today" ? 864e5 : 7 * 864e5)), [app.audit, range, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="card st-hist">
      <div className="sh-head">
        <h3 className="card-title">ประวัติการเปลี่ยนแปลง</h3>
        <Dropdown label="ช่วงเวลา" className="sh-sel" icon={<span role="button" title="รีเฟรช" onClick={() => setTick(tick + 1)} style={{ display: "inline-flex" }}><I.Refresh size={18} /></span>} value={range} onChange={setRange} options={[{ value: "all", label: "ทั้งหมด" }, { value: "today", label: "วันนี้" }, { value: "7d", label: "7 วันล่าสุด" }]} />
      </div>
      <div className="sh-box">
        <div className="sh-row hd"><span>เวลา</span><span>รายการ</span><span>ผู้ดำเนินการ</span></div>
        <div className="sh-list">
          {items.map((a, i) => <div key={i} className="sh-row"><span>{thaiDateTime(a.t)}</span><span style={{ whiteSpace: "pre-line" }}>{a.action}</span><span>{a.user}</span></div>)}
        </div>
        {items.length <= 1 && <div className="sh-empty"><I.FileBlank size={28} /><b>ยังไม่มีการเปลี่ยนแปลงที่บันทึกเพิ่มเติม</b><small>การเปลี่ยนแปลงการตั้งค่าจะแสดงที่นี่</small></div>}
      </div>
    </section>
  );
}

/* ---------------- แหล่งข้อมูล ---------------- */
function Sources() {
  const app = useApp();
  const t = useSourceTools();
  return (
    <div className="src-page">
      <p className="sub" style={{ margin: "18px 0 14px" }}>เชื่อมข้อมูลจาก 5 ระบบที่แยกกันอยู่ เข้ามาไว้ในที่เดียว (Connect) ข้อมูลประมวลผลในเบราว์เซอร์ของคุณเท่านั้น ไม่ถูกส่งไปยังเซิร์ฟเวอร์ใด ๆ อัปโหลดไฟล์ CSV ตามเทมเพลตเพื่อแทนที่ข้อมูลตัวอย่าง</p>
      <div className="flow">
        {SOURCES.map((s, i) => {
          const m = app.meta[s.key];
          return (
            <div key={s.key} className="flow-col">
              <div className={"flow-top" + (i === 4 ? " last" : "")}>{["Premiums Collected", "Claims Occur", "Claims Assessed", "Claims Paid", "Cash Outflow"][i]}</div>
              <div className="flow-sys">{s.system}</div>
              <div className="flow-body">
                <p>{s.desc}</p>
                <div className={"flow-st " + m.origin}>{m.origin === "upload" ? `✓ ${m.fileName}` : "ใช้ข้อมูลตัวอย่าง"}</div>
                <small>{m.rows.toLocaleString()} แถว · อัปเดต {thaiDateTime(m.updatedAt)}</small>
                <button className="btn mbtn" onClick={() => t.pick(s.key)}><I.Download size={16} />อัปโหลด CSV</button>
                <div className="flow-links">
                  <button className="link" onClick={() => t.template(s.key)}>เทมเพลต</button>
                  <button className="link" onClick={() => t.current(s.key)}>ดาวน์โหลดข้อมูล</button>
                  <button className="link" onClick={() => t.runCheck(s.key)}>ตรวจสอบ</button>
                  {m.origin === "upload" && <button className="link red" onClick={() => { app.resetSource(s.key); app.toast("กลับไปใช้ข้อมูลตัวอย่างแล้ว"); }}>ใช้ข้อมูลตัวอย่าง</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <section className="card st-card" style={{ marginTop: 18, paddingBottom: 18 }}>
        <h3 className="card-title">รูปแบบไฟล์</h3>
        <table className="tbl mtbl" style={{ marginTop: 10 }}>
          <thead><tr><th>ไฟล์</th><th>ระบบ</th><th>คอลัมน์</th></tr></thead>
          <tbody>{SOURCES.map((s) => <tr key={s.key}><td>{s.file}</td><td className="th">{s.system}</td><td style={{ fontFamily: "monospace", fontSize: 12.5 }}>{s.columns.join(", ")}</td></tr>)}</tbody>
        </table>
        <p className="muted small">วันที่ใช้รูปแบบ YYYY-MM-DD (รองรับ วว/ดด/ปปปป และปี พ.ศ.) · line: motor, health, property หรือภาษาไทย · claims.status: approved, review, survey, docs, closed · payments.status: paid, scheduled · ledger.type: balance, premium_receipt, reinsurance_recovery, other_receipt, expense, other_payment · ledger.status: actual, expected</p>
      </section>
      {t.ui}
    </div>
  );
}

/* ---------------- บริษัท + AI ---------------- */
function Company() {
  const app = useApp();
  const s = app.settings;
  const [name, setName] = useState(s.company);
  const [key, setKey] = useState(s.apiKey);
  const [model, setModel] = useState(s.model);
  const [use, setUse] = useState(s.useClaude);
  const [testing, setTesting] = useState("");
  const [confirm, setConfirm] = useState(false);
  const test = async () => {
    setTesting("กำลังทดสอบ…");
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model, max_tokens: 20, messages: [{ role: "user", content: "ตอบว่า OK" }] }) });
      setTesting(r.ok ? "✓ เชื่อมต่อสำเร็จ" : `✗ ${r.status}: ${(await r.text()).slice(0, 120)}`);
    } catch (e: any) { setTesting(`✗ ${e.message}`); }
  };
  return (
    <div className="st" style={{ gridTemplateColumns: "1fr 1fr" }}>
      <section className="card st-card" style={{ paddingBottom: 20 }}>
        <h3 className="card-title">ข้อมูลบริษัท</h3>
        <div className="sub">ชื่อที่แสดงในหัวหน้าเว็บและรายงาน</div>
        <label className="mfield" style={{ marginTop: 16 }}><span>ชื่อบริษัท</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <button className="btn mbtn" style={{ marginTop: 14 }} onClick={() => { app.saveSettings({ company: name }, `เปลี่ยนชื่อบริษัทเป็น ${name}`); app.toast("บันทึกแล้ว"); }}>บันทึก</button>
        <h3 className="card-title" style={{ marginTop: 30 }}>ข้อมูลในเบราว์เซอร์</h3>
        <div className="sub">การตั้งค่า ไฟล์ที่อัปโหลด รายงาน และแชท ถูกเก็บในเบราว์เซอร์นี้เท่านั้น</div>
        <button className="btn btn-outline mbtn" style={{ marginTop: 14 }} onClick={() => setConfirm(true)}>ล้างข้อมูลทั้งหมดและเริ่มใหม่</button>
        {confirm && <Modal title="ล้างข้อมูลทั้งหมด?" onClose={() => setConfirm(false)} footer={<><button className="btn btn-ghost mbtn" onClick={() => setConfirm(false)}>ยกเลิก</button><button className="btn mbtn" onClick={() => { try { Object.keys(localStorage).filter((k) => k.startsWith("cbt.")).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ } location.reload(); }}>ล้างข้อมูล</button></>}><p>ไฟล์ที่อัปโหลด การตั้งค่า รายงานที่สร้าง ประวัติ และแชท จะถูกลบ แล้วกลับไปใช้ข้อมูลตัวอย่าง</p></Modal>}
      </section>
      <FundingSettings />
      <section className="card st-card" style={{ paddingBottom: 20 }}>
        <h3 className="card-title">AI Concierge</h3>
        <div className="sub">ค่าเริ่มต้น AI Concierge วิเคราะห์และตอบจากข้อมูลด้วยระบบในเครื่อง (ไม่ต้องใช้คีย์) เปิดใช้ Claude เพื่อให้เรียบเรียงคำตอบภาษาธรรมชาติจากตัวเลขเดียวกัน</div>
        <div className="st-toggle" style={{ marginTop: 16 }}>
          <button type="button" className={"toggle" + (use ? " on" : "")} aria-pressed={use} aria-label="ใช้ Claude" onClick={() => setUse(!use)} />
          <span><b>ใช้ Claude API</b><small>ส่งเฉพาะคำถามและตัวเลขสรุปที่คำนวณแล้ว ไม่ส่งไฟล์ข้อมูลดิบ</small></span>
        </div>
        <label className="mfield" style={{ marginTop: 14 }}><span>Anthropic API key</span><input type="password" value={key} placeholder="sk-ant-..." onChange={(e) => setKey(e.target.value)} autoComplete="off" /></label>
        <label className="mfield"><span>โมเดล</span><input value={model} onChange={(e) => setModel(e.target.value)} /></label>
        <p className="muted small">คีย์ถูกเก็บในเบราว์เซอร์นี้เท่านั้นและส่งตรงไปที่ api.anthropic.com อย่าใช้คีย์นี้บนเครื่องสาธารณะ</p>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button className="btn mbtn" onClick={() => { app.saveSettings({ apiKey: key, model, useClaude: use && !!key }, `ตั้งค่า AI Concierge: ${use && key ? `ใช้ Claude (${model})` : "ระบบในเครื่อง"}`); app.toast(use && !key ? "ต้องใส่ API key ก่อนเปิดใช้ Claude" : "บันทึกแล้ว"); }}>บันทึก</button>
          <button className="btn btn-outline mbtn" disabled={!key} onClick={test}>ทดสอบการเชื่อมต่อ</button>
          <span className="small">{testing}</span>
        </div>
      </section>
    </div>
  );
}

/* ---------------- สิทธิ์ผู้ใช้ ---------------- */
type U = { name: string; email: string; role: string; alerts: boolean };
function Users() {
  const app = useApp();
  const [users, setUsers] = useState<U[]>(() => { try { return JSON.parse(localStorage.getItem("cbt.users") ?? "") } catch { return [{ name: "Finance Admin", email: "finance@company.co.th", role: "Finance Admin", alerts: true }, { name: "CFO", email: "cfo@company.co.th", role: "ผู้บริหาร (ดูอย่างเดียว)", alerts: true }, { name: "ฝ่ายสินไหม", email: "claims@company.co.th", role: "Claims / Actuarial", alerts: false }]; } });
  const [add, setAdd] = useState<U | null>(null);
  const persist = (u: U[]) => { setUsers(u); try { localStorage.setItem("cbt.users", JSON.stringify(u)); } catch { /* ignore */ } };
  const ROLES = ["Finance Admin", "ผู้บริหาร (ดูอย่างเดียว)", "Claims / Actuarial", "IT / Data"];
  return (
    <section className="card st-card" style={{ marginTop: 20, paddingBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><h3 className="card-title">สิทธิ์ผู้ใช้</h3><div className="sub">กำหนดบทบาทและผู้ที่ได้รับการแจ้งเตือน (เวอร์ชันสาธิตนี้ยังไม่มีระบบเข้าสู่ระบบ)</div></div>
        <button className="btn mbtn" onClick={() => setAdd({ name: "", email: "", role: ROLES[0], alerts: true })}><I.Plus size={18} />เพิ่มผู้ใช้</button>
      </div>
      <table className="tbl mtbl" style={{ marginTop: 14 }}>
        <thead><tr><th>ชื่อ</th><th>อีเมล</th><th>บทบาท</th><th>รับการแจ้งเตือน</th><th /></tr></thead>
        <tbody>{users.map((u, i) => (
          <tr key={i}>
            <td className="th">{u.name}</td><td>{u.email}</td>
            <td><select className="isel" value={u.role} onChange={(e) => { const n = [...users]; n[i] = { ...u, role: e.target.value }; persist(n); app.log(`เปลี่ยนบทบาท ${u.name} เป็น ${e.target.value}`); }}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></td>
            <td><button type="button" className={"toggle sm" + (u.alerts ? " on" : "")} aria-pressed={u.alerts} aria-label="รับการแจ้งเตือน" onClick={() => { const n = [...users]; n[i] = { ...u, alerts: !u.alerts }; persist(n); }} /></td>
            <td><Menu items={[{ label: "ลบผู้ใช้", danger: true, onClick: () => { persist(users.filter((_, j) => j !== i)); app.log(`ลบผู้ใช้ ${u.name}`); app.toast("ลบผู้ใช้แล้ว"); } }]} /></td>
          </tr>
        ))}</tbody>
      </table>
      {add && <Modal title="เพิ่มผู้ใช้" onClose={() => setAdd(null)} footer={<><button className="btn btn-ghost mbtn" onClick={() => setAdd(null)}>ยกเลิก</button><button className="btn mbtn" disabled={!add.name || !add.email.includes("@")} onClick={() => { persist([...users, add]); app.log(`เพิ่มผู้ใช้ ${add.name} (${add.role})`); setAdd(null); app.toast("เพิ่มผู้ใช้แล้ว"); }}>เพิ่ม</button></>}>
        <label className="mfield"><span>ชื่อ</span><input value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} /></label>
        <label className="mfield"><span>อีเมล</span><input type="email" value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} /></label>
        <label className="mfield"><span>บทบาท</span><select value={add.role} onChange={(e) => setAdd({ ...add, role: e.target.value })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>
      </Modal>}
    </section>
  );
}

export { fmtM };

/* ---------------- วงเงิน O/D + อัตราดอกเบี้ยธนาคาร ---------------- */
function FundingSettings() {
  const app = useApp();
  const [od, setOd] = useState(app.settings.od);
  useEffect(() => setOd(app.settings.od), [app.settings.od]);
  const [banks, setBanks] = useState(app.settings.banks);
  const setB = (i: number, k: string, v: string) => setBanks(banks.map((b, j) => (j === i ? { ...b, [k]: k === "bank" || k === "product" ? v : +v || 0 } : b)));
  return (
    <section className="card st-card" style={{ paddingBottom: 20, gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><h3 className="card-title">แหล่งเงินทุนระยะสั้น</h3><div className="sub">ใช้เมื่อขาดทุนจากการรับประกัน: ระบบเสนอ O/D ก่อนถ้าวงเงินพอ ถ้าไม่พอ AI เปรียบเทียบดอกเบี้ยธนาคารให้เลือกกู้</div></div>
        <button className="btn mbtn" onClick={() => app.setFunding(true)}>เปิดหน้าจัดหาเงินทุน</button>
      </div>
      <div className="mgrid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginTop: 8 }}>
        <label className="mfield"><span>วงเงินเบิกเกินบัญชี (ล้านบาท)</span><input type="number" min={0} value={od.limitM} onChange={(e) => setOd({ ...od, limitM: +e.target.value || 0 })} /></label>
        <label className="mfield"><span>ใช้ไปแล้ว (ล้านบาท)</span><input type="number" min={0} value={od.usedM} onChange={(e) => setOd({ ...od, usedM: +e.target.value || 0 })} /></label>
        <label className="mfield"><span>ดอกเบี้ย O/D (% ต่อปี)</span><input type="number" step="0.05" value={od.rate} onChange={(e) => setOd({ ...od, rate: +e.target.value || 0 })} /></label>
      </div>
      <table className="tbl mtbl"><thead><tr><th>ธนาคาร</th><th>ผลิตภัณฑ์</th><th>ดอกเบี้ย %/ปี</th><th>ค่าธรรมเนียม %</th><th>วงเงินสูงสุด (ล้านบาท)</th><th /></tr></thead>
        <tbody>{banks.map((b, i) => (
          <tr key={i}>
            <td><input className="isel" value={b.bank} onChange={(e) => setB(i, "bank", e.target.value)} /></td>
            <td><input className="isel" style={{ width: 230 }} value={b.product} onChange={(e) => setB(i, "product", e.target.value)} /></td>
            <td><input className="isel" style={{ width: 80 }} type="number" step="0.05" value={b.rate} onChange={(e) => setB(i, "rate", e.target.value)} /></td>
            <td><input className="isel" style={{ width: 80 }} type="number" step="0.05" value={b.fee} onChange={(e) => setB(i, "fee", e.target.value)} /></td>
            <td><input className="isel" style={{ width: 90 }} type="number" value={b.maxM} onChange={(e) => setB(i, "maxM", e.target.value)} /></td>
            <td><button className="link red" onClick={() => setBanks(banks.filter((_, j) => j !== i))}>ลบ</button></td>
          </tr>
        ))}</tbody>
      </table>
      <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
        <button className="btn btn-outline mbtn" onClick={() => setBanks([...banks, { bank: "ธนาคารใหม่", product: "เงินกู้ระยะสั้น", rate: 6.5, fee: 0, maxM: 50 }])}>เพิ่มธนาคาร</button>
        <button className="btn mbtn" onClick={() => { app.saveSettings({ od, banks }, `แก้ไขแหล่งเงินทุน: O/D ${od.limitM} ล้าน (ใช้ ${od.usedM}) และอัตราดอกเบี้ย ${banks.length} ธนาคาร`); app.toast("บันทึกแหล่งเงินทุนแล้ว"); }}>บันทึก</button>
      </div>
      {app.loans.length > 0 && <>
        <h4 className="mh">เงินกู้ที่บันทึกไว้ (รวมในพยากรณ์เงินสดแล้ว)</h4>
        <table className="tbl mtbl"><thead><tr><th>แหล่ง</th><th>จำนวน</th><th>ดอกเบี้ย</th><th>เบิก</th><th>ชำระคืน</th><th /></tr></thead>
          <tbody>{app.loans.map((l) => (
            <tr key={l.id}><td className="th">{l.source}</td><td>{fmtM(l.amount)}</td><td>{l.rate}% · {fmtM(l.interest, 2)}</td><td>{thaiDate(l.drawDate)}</td><td>{thaiDate(addDays(l.drawDate, l.termDays))}</td>
              <td><button className="link red" onClick={() => { app.cancelLoan(l.id); if (l.source.includes("O/D")) app.saveSettings({ od: { ...app.settings.od, usedM: Math.max(0, app.settings.od.usedM - l.amount / 1e6) } }); app.log(`ยกเลิกเงินกู้ ${l.source} ${fmtM(l.amount)}`); app.toast("ยกเลิกเงินกู้แล้ว"); }}>ยกเลิก</button></td></tr>
          ))}</tbody>
        </table>
      </>}
    </section>
  );
}
