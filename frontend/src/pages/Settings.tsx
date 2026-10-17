import { useState } from "react";
import { PageHeader } from "../components/Shell";
import * as I from "../components/icons";

export default function Settings() {
  const [tab, setTab] = useState(2);
  const [reserve, setReserve] = useState(40);
  const [lead, setLead] = useState(7);
  const [rules, setRules] = useState([true, true]);
  const [inApp, setInApp] = useState(true);
  const [email, setEmail] = useState(false);
  const short = 40 - 32 + (reserve - 40);

  return (
    <>
      <PageHeader title="ตั้งค่าระบบ" />
      <div className="tabs st-tabs">
        {["บริษัท", "แหล่งข้อมูล", "การแจ้งเตือน", "สิทธิ์ผู้ใช้"].map((t, i) => (
          <button key={t} className={tab === i ? "on" : ""} onClick={() => setTab(i)} style={{ marginLeft: [26, 51, 50, 50][i] }}>{t}</button>
        ))}
      </div>

      <div className="st">
        <div className="st-left">
          <section className="card st-card">
            <h3 className="card-title">เกณฑ์สภาพคล่อง</h3>
            <div className="sub">กำหนดเกณฑ์สำหรับการแจ้งเตือนความเสี่ยงด้านสภาพคล่อง</div>
            <div className="st-fields">
              <div>
                <div className="field-label">เงินสำรองขั้นต่ำ</div>
                <div className="input"><input type="number" value={reserve} onChange={(e) => setReserve(+e.target.value || 0)} aria-label="เงินสำรองขั้นต่ำ" /><span className="suffix" style={{ width: 87 }}>ล้านบาท</span></div>
                <div className="hint">แจ้งเตือนเมื่อเงินสดต่ำกว่าเกณฑ์นี้</div>
              </div>
              <div>
                <div className="field-label">ระยะเวลาเตือนล่วงหน้า</div>
                <div className="input"><input type="number" value={lead} onChange={(e) => setLead(+e.target.value || 0)} aria-label="ระยะเวลาเตือนล่วงหน้า (วัน)" /><span className="suffix" style={{ width: 53, justifyContent: "center", padding: 0 }}>วัน</span></div>
                <div className="hint">แจ้งเตือนล่วงหน้าก่อนถึงวันที่คาดว่าจะต่ำกว่าเกณฑ์</div>
              </div>
            </div>
          </section>

          <section className="card st-card st-rules">
            <div className="st-col">
              <h3 className="card-title">กฎแจ้งเตือน</h3>
              <div className="sub">เลือกเหตุการณ์ที่ต้องการรับการแจ้งเตือน</div>
              {[["เงินสดต่ำกว่าเกณฑ์สภาพคล่อง", "แจ้งเตือนเมื่อมีการคาดการณ์ว่าเงินสดจะต่ำกว่าเงินสำรองขั้นต่ำ"], ["ข้อมูลไม่อัปเดตเกิน 24 ชั่วโมง", "แจ้งเตือนเมื่อแหล่งข้อมูลไม่ได้รับการอัปเดตตามเวลาที่กำหนด"]].map(([t, d], i) => (
                <label key={t} className="st-check" style={{ marginTop: i ? 25 : 23 }}>
                  <button type="button" className={"cbox" + (rules[i] ? "" : " off")} aria-pressed={rules[i]} onClick={() => setRules(rules.map((v, j) => (j === i ? !v : v)))}>{rules[i] && <I.Check size={16} />}</button>
                  <span><b>{t}</b><small>{d}</small></span>
                </label>
              ))}
            </div>
            <div className="st-col right">
              <h3 className="card-title">ช่องทางแจ้งเตือน</h3>
              <div className="sub">เลือกช่องทางที่ต้องการรับการแจ้งเตือน</div>
              <div className="st-toggle" style={{ marginTop: 19 }}>
                <button type="button" className={"toggle" + (inApp ? " on" : "")} aria-pressed={inApp} onClick={() => setInApp(!inApp)} aria-label="ในระบบ" />
                <span><b>ในระบบ</b><small>แสดงการแจ้งเตือนในระบบ (สำหรับผู้ใช้ที่มีสิทธิ์)</small></span>
              </div>
              <div className="st-toggle" style={{ marginTop: 22 }}>
                <button type="button" className={"toggle" + (email ? " on" : "")} aria-pressed={email} onClick={() => setEmail(!email)} aria-label="อีเมล" />
                <span><b>อีเมล</b><small>ส่งอีเมลแจ้งเตือน (ตัวอย่างการใช้งานเท่านั้น)</small></span>
              </div>
              <div className="st-actions">
                <button className="btn">บันทึกการตั้งค่า</button>
                <button className="btn btn-ghost st-cancel">ยกเลิก</button>
              </div>
            </div>
          </section>
        </div>

        <section className="card st-prev">
          <div className="sp-head"><h3 className="card-title">ตัวอย่างการแจ้งเตือน</h3><span><I.Eye size={20} />ดูตัวอย่างจากการตั้งค่าปัจจุบัน</span></div>
          <div className="sp-alert">
            <div className="sp-top"><span className="bang">!</span><b>วันที่ 20 เงินสดอาจต่ำกว่าเกณฑ์<br />{short} ล้านบาท</b></div>
            <p>จากการคาดการณ์เงินสด 30 วัน คาดว่าเงินสดจะต่ำกว่าเกณฑ์สภาพคล่อง {reserve} ล้านบาท ในวันที่ 20 โดยมีเงินสดต่ำสุดที่ 32 ล้านบาท (ต่ำกว่าเกณฑ์ {short} ล้านบาท)</p>
          </div>
          <dl className="sp-dl">
            <div><dt>แหล่งข้อมูล</dt><dd>พยากรณ์เงินสด 30 วัน</dd></div>
            <div><dt>สิทธิ์ผู้ใช้ที่เห็นการแจ้งเตือน</dt><dd>Finance Admin</dd></div>
            <div><dt>ช่องทางการแจ้งเตือน</dt><dd>{[inApp && "ในระบบ", email && "อีเมล"].filter(Boolean).join(", ") || "-"}</dd></div>
          </dl>
        </section>
      </div>

      <div className="st-bottom">
        <section className="card st-conn">
          <h3 className="card-title">สถานะการเชื่อมต่อข้อมูล</h3>
          <table className="tbl">
            <colgroup><col style={{ width: 136 }} /><col style={{ width: 144 }} /><col style={{ width: 143 }} /><col style={{ width: 113 }} /><col style={{ width: 118 }} /><col /></colgroup>
            <thead><tr><th>แหล่งข้อมูล</th><th>สถานะ</th><th>ข้อมูลล่าสุด</th><th>อัปเดตล่าสุด</th><th>การดำเนินการ</th><th /></tr></thead>
            <tbody>
              {[[<I.Doc size={20} />, "กรมธรรม์"], [<I.Shield size={20} />, "เคลม"], [<I.Bars4 size={20} />, "บัญชี"]].map(([ic, n]) => (
                <tr key={n as string}>
                  <td><span className="st-src">{ic}{n}</span></td>
                  <td className="th"><span className="st-dot" />ข้อมูลตัวอย่าง</td>
                  <td className="th">ข้อมูลถึงปัจจุบัน</td>
                  <td>09:00</td>
                  <td><span className="pill check">ตรวจสอบ</span></td>
                  <td><button className="dots" aria-label="เพิ่มเติม"><I.Dots size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card st-hist">
          <div className="sh-head"><h3 className="card-title">ประวัติการเปลี่ยนแปลง</h3><button className="select sh-sel"><I.Refresh size={18} /><span>ทั้งหมด</span><I.Chevron size={18} /></button></div>
          <div className="sh-box">
            <div className="sh-row hd"><span>เวลา</span><span>รายการ</span><span>ผู้ดำเนินการ</span></div>
            <div className="sh-row"><span>5 พ.ย. 2567&nbsp;&nbsp;10:24</span><span>แก้ไขเกณฑ์สภาพคล่องขั้นต่ำ<br />จาก 30 เป็น 40 ล้านบาท</span><span>Finance Admin</span></div>
            <div className="sh-empty"><I.FileBlank size={28} /><b>ยังไม่มีการเปลี่ยนแปลงที่บันทึกเพิ่มเติม</b><small>การเปลี่ยนแปลงการตั้งค่าจะแสดงที่นี่</small></div>
          </div>
        </section>
      </div>
    </>
  );
}
