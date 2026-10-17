import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fmtM, get } from "../api";
import { ForecastChart } from "../components/charts";
import { Banner, Chip, Concierge, Gap, Header, Icon, Kpi, SourceFoot, useData } from "../components/ui";

export default function Overview() {
  const { summary, market } = useData();
  const [fc, setFc] = useState<any>(null);
  const [claims, setClaims] = useState<any>(null);
  useEffect(() => { get("/api/companies/NKI/forecast").then(setFc); get("/api/companies/NKI/claims").then(setClaims); }, []);
  if (!summary || !market) return null;
  const a = summary.actual;
  const p = summary.previous;
  const prem25 = market.direct_premiums.find((x: any) => x.period === "2025" && x.source === "SRIKRUNG-IPRB-TIRD");

  return (
    <>
      <Header title="ภาพรวมกระแสเงินสด" />
      <div className="row">
        <div className="col-main">
          {summary.alerts.slice(0, 1).map((al: any) => (
            <Banner key={al.metric} level={al.level} action={<Link className="btn" to="/forecast">ดูรายละเอียด →</Link>}>{al.message}</Banner>
          ))}
          <div className="grid4">
            <Kpi icon={Icon.wallet} label="เงินสดจากการดำเนินงาน" value={fmtM(a.cfo)} status="actual" sub={`2567: ${fmtM(p.cfo)}`} />
            <Kpi icon={Icon.doc} label="ค่าใช้จ่ายบริการประกันภัย" value={fmtM(a.insurance_service_expenses)} status="actual" sub={`+${summary.derived.expense_growth.value}% YoY`} />
            <Kpi icon={Icon.bars} label="ผลการบริการประกันภัย" value={fmtM(a.insurance_service_result)} status="actual" neg={a.insurance_service_result < 0} />
            <Kpi icon={Icon.shield} label="อัตราส่วนเงินกองทุน (CAR)" value={`${a.car_pct}%`} status="actual" sub={a.car_audited ? "" : "ยังไม่ผ่านผู้สอบบัญชี"} />
          </div>

          <section className="card">
            <div className="card-head"><h2>คาดการณ์เงินสด 30 วัน</h2>{fc?.available && <Chip kind="forecast" />}</div>
            {fc?.available
              ? <ForecastChart data={fc} threshold={fc.threshold} />
              : <Gap title="ข้อมูลเงินสดรายวันเป็นข้อมูลภายในบริษัท" body="บริษัทจดทะเบียนเปิดเผยกระแสเงินสดเป็นรายไตรมาส/รายปีเท่านั้น — อัปโหลดข้อมูลเคลม การจ่าย และยอดเงินสดต้นงวดในหน้าตั้งค่าเพื่อแสดงคาดการณ์" />}
          </section>

          <section className="card">
            <div className="card-head"><h2>บริบทตลาดประกันวินาศภัยไทย</h2><Chip kind="actual" /></div>
            <div className="grid4">
              <div><div className="muted">เบี้ยรับโดยตรง ปี 2568</div><div style={{ fontSize: 22, fontWeight: 700 }}>฿{(prem25.value / 1000).toFixed(1)}B</div><div className="muted">+2.33% YoY [IPRB/TIRD]</div></div>
              <div><div className="muted">จำนวนกรมธรรม์ ปี 2568</div><div style={{ fontSize: 22, fontWeight: 700 }}>{market.policies_million[1].value} ล้านฉบับ</div><div className="muted">2567: {market.policies_million[0].value}</div></div>
              <div><div className="muted">ค่าสินไหมเกิดขึ้นทั้งตลาด 2568</div><div style={{ fontSize: 22, fontWeight: 700 }}>฿{(market.claims_incurred_2025.value / 1000).toFixed(1)}B</div><div className="muted">TFRS 17 [Milliman]</div></div>
              <div><div className="muted">เบี้ยประกันสุขภาพ 2568</div><div style={{ fontSize: 22, fontWeight: 700 }}>+{market.health_growth_2025_pct.value}%</div><div className="muted">โตเร็วที่สุด [Milliman]</div></div>
            </div>
          </section>

          <section className="card">
            <div className="card-head"><h2>รายการจ่ายที่กำลังจะถึง</h2></div>
            {claims?.available && claims.scheduled.length ? (
              <div className="scroll-x"><table className="t"><thead><tr><th>วันที่</th><th>ประเภท</th><th className="num">จำนวนเงิน</th><th>สถานะ</th></tr></thead>
                <tbody>{claims.scheduled.slice(0, 5).map((s: any) => <tr key={s.claim_id + s.due_date}><td>{s.due_date}</td><td>{s.line}</td><td className="num">฿{Number(s.amount).toLocaleString()}</td><td><Chip kind="warn">{s.status || "รอดำเนินการ"}</Chip></td></tr>)}</tbody></table></div>
            ) : <Gap height={120} title="กำหนดจ่ายเคลมรายรายการเป็นข้อมูลภายใน" body="อัปโหลด scheduled.csv เพื่อแสดงรายการจ่ายที่อนุมัติแล้ว" />}
          </section>
          <SourceFoot ids={["NKI-FH", "SRIKRUNG-IPRB-TIRD", "MILLIMAN-2026"]} />
        </div>
        <div className="col-side">
          <Concierge suggestions={["เดือนนี้ต้องเตรียมเงินเพิ่มเท่าไร?", "ทำไมผลการบริการประกันภัยปี 2568 ติดลบ?", "อัตราค่าสินไหมสุขภาพของตลาดเป็นเท่าไร?"]} />
        </div>
      </div>
    </>
  );
}
