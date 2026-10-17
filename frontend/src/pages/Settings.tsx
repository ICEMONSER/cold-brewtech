import { useEffect, useState } from "react";
import { get, send, upload } from "../api";
import { Chip, Header, SourceFoot, useData } from "../components/ui";

const FIELDS: [string, string, string, string][] = [
  ["car_min_pct", "เกณฑ์ CAR ขั้นต่ำ (กำกับดูแล)", "%", "ค่าเริ่มต้น 140% [BKI-2024] — ยืนยันกับประกาศ คปภ."],
  ["car_internal_target_pct", "เป้าหมาย CAR ภายในบริษัท", "%", "ตั้งตามนโยบายคณะกรรมการ"],
  ["combined_ratio_max_pct", "Combined Ratio สูงสุด", "%", ">100% = ขาดทุนจากการรับประกัน"],
  ["liquidity_ratio_min_x", "อัตราส่วนสภาพคล่องขั้นต่ำ", "เท่า", "ค่าทั่วไป 1.0 — ปรับตามนิยามของบริษัท"],
  ["min_cash_threshold", "เงินสำรองขั้นต่ำ (เงินสด)", "ล้านบาท", "ไม่มีค่าเริ่มต้น — บริษัทต้องกำหนดเอง"],
  ["alert_lead_days", "ระยะเวลาเตือนล่วงหน้า", "วัน", ""],
];

export default function Settings() {
  const { reload } = useData();
  const [s, setS] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [opening, setOpening] = useState("");
  const load = () => get("/api/settings").then((r) => { setS(r.settings); setAudit(r.audit); });
  useEffect(() => { load(); }, []);
  if (!s) return null;

  async function save() {
    await send("/api/settings", s, "PUT");
    setMsg("บันทึกแล้ว"); load(); reload();
  }
  async function onFile(kind: string, f?: File) {
    if (!f) return;
    try { const r = await upload(`/api/companies/NKI/upload/${kind}`, f); setMsg(`${kind}: นำเข้า ${r.rows} แถว`); reload(); }
    catch (e: any) { setMsg(`${kind}: ${e.message}`); }
  }

  return (
    <>
      <Header title="ตั้งค่าระบบ" />
      <div className="row">
        <section className="card" style={{ flex: "999 1 560px" }}>
          <h2>เกณฑ์สภาพคล่องและเงินกองทุน</h2>
          <div className="muted">กำหนดเกณฑ์สำหรับการแจ้งเตือน — ทุกค่าแก้ไขได้และบันทึกประวัติ</div>
          <div className="grid2" style={{ marginTop: 14 }}>
            {FIELDS.map(([k, label, unit, hint]) => (
              <label key={k} className="field">{label}
                <span className="unit-input"><input type="number" value={s[k] ?? ""} onChange={(e) => setS({ ...s, [k]: e.target.value === "" ? null : +e.target.value })} /><span>{unit}</span></span>
                <span className="muted">{hint}</span>
              </label>))}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center" }}>
            <button className="btn" onClick={save}>บันทึกการตั้งค่า</button>
            <button className="btn plain" onClick={load}>ยกเลิก</button>
            <span role="status" className="muted">{msg}</span>
          </div>
        </section>

        <section className="card" style={{ flex: "1 1 380px" }}>
          <h2>แหล่งข้อมูลภายในบริษัท</h2>
          <div className="muted">ใช้สำหรับพยากรณ์รายวัน — ไฟล์ CSV ตามแม่แบบใน backend/templates</div>
          <label className="field" style={{ marginTop: 12 }}>เงินสดต้นงวด (ล้านบาท)
            <span className="unit-input"><input type="number" value={opening} onChange={(e) => setOpening(e.target.value)} /><span>ล้านบาท</span></span>
          </label>
          <button className="btn ghost" style={{ marginTop: 8 }} onClick={async () => { await send("/api/companies/NKI/opening-cash", { value: opening === "" ? null : +opening }, "PUT"); setMsg("บันทึกเงินสดต้นงวดแล้ว"); reload(); }}>บันทึกเงินสดต้นงวด</button>
          {["claims", "payments", "scheduled", "receipts"].map((k) => (
            <label key={k} className="field" style={{ marginTop: 12 }}>{k}.csv
              <input type="file" accept=".csv" onChange={(e) => onFile(k, e.target.files?.[0])} />
            </label>))}
        </section>
      </div>

      <div className="row">
        <section className="card" style={{ flex: "999 1 560px" }}>
          <h2>สถานะการเชื่อมต่อข้อมูล</h2>
          <table className="t" style={{ marginTop: 10 }}><thead><tr><th>แหล่งข้อมูล</th><th>สถานะ</th><th>ข้อมูลล่าสุด</th></tr></thead><tbody>
            <tr><td>งบการเงิน NKI [NKI-FH]</td><td><Chip kind="actual">ข้อมูลสาธารณะ</Chip></td><td>FY2568</td></tr>
            <tr><td>สถิติตลาด IPRB/TIRD, OIC, Milliman</td><td><Chip kind="actual">ข้อมูลสาธารณะ</Chip></td><td>FY2568</td></tr>
            <tr><td>ระบบเคลม / บัญชี / ธนาคาร ของบริษัท</td><td><Chip kind="gap">อัปโหลดด้วยตนเอง</Chip></td><td>—</td></tr>
          </tbody></table>
        </section>
        <section className="card" style={{ flex: "1 1 380px" }}>
          <h2>ประวัติการเปลี่ยนแปลง</h2>
          {audit.length ? <table className="t" style={{ marginTop: 10 }}><thead><tr><th>เวลา</th><th>รายการ</th></tr></thead>
            <tbody>{audit.map((x, i) => <tr key={i}><td>{x.ts}</td><td style={{ wordBreak: "break-all" }}>{x.item}</td></tr>)}</tbody></table>
            : <p className="muted">ยังไม่มีการเปลี่ยนแปลงที่บันทึก</p>}
        </section>
      </div>
      <SourceFoot ids={["BKI-2024", "NKI-FH"]} />
    </>
  );
}
