import { useEffect, useState } from "react";
import { fmtM, get } from "../api";
import { HBar, Waterfall } from "../components/charts";
import { Banner, Chip, Gap, Header, Icon, Kpi, SourceFoot, useData } from "../components/ui";

export default function Claims() {
  const { summary, market } = useData();
  const [claims, setClaims] = useState<any>(null);
  const [q, setQ] = useState("");
  useEffect(() => { get("/api/companies/NKI/claims").then(setClaims); }, []);
  if (!summary || !market) return null;
  const a = summary.actual, d = summary.derived;
  const rows = claims?.available ? claims.rows.filter((r: any) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase())) : [];

  return (
    <>
      <Header title="วิเคราะห์เคลม" />
      <div className="grid4">
        <Kpi icon={Icon.doc} label="เคลมเปิดอยู่" value={claims?.available ? String(claims.rows.filter((r: any) => r.status !== "closed").length) : "ไม่เปิดเผย"} status={claims?.available ? "actual" : "gap"} />
        <Kpi icon={Icon.wallet} label="ค่าใช้จ่ายบริการประกันภัย" value={fmtM(a.insurance_service_expenses)} status="actual" />
        <Kpi icon={Icon.bars} label="รายได้จากการประกันภัย" value={fmtM(a.insurance_revenue)} status="actual" sub={`${d.revenue_growth.value}% YoY`} />
        <Kpi icon={Icon.shield} label="Combined Ratio" value={`${a.combined_ratio_pct}%`} status="actual" neg={a.combined_ratio_pct > 100} />
      </div>

      <div className="row">
        <section className="card" style={{ flex: "999 1 520px" }}>
          <div className="card-head"><h2>อัตราค่าสินไหมของตลาดตามประเภท ปี 2567</h2><Chip kind="actual" /></div>
          <div className="muted">NKI ไม่เปิดเผยค่าสินไหมแยกประเภท จึงแสดงค่าอ้างอิงทั้งตลาด [TIRD-2024]</div>
          <HBar unit="%" rows={market.loss_ratio_2024_pct.map((r: any) => ({ label: r.line, value: r.value }))} height={260} />
        </section>
        <section className="card" style={{ flex: "1 1 420px" }}>
          <div className="card-head"><h2>ผลการบริการประกันภัย ปี 2568</h2><span className="muted">ล้านบาท</span></div>
          <Waterfall revenue={a.insurance_revenue} expenses={a.insurance_service_expenses} reins={a.net_reinsurance_result} result={a.insurance_service_result} />
          <div className="muted">ตรวจสอบสูตร: {d.service_result_check.formula} = {d.service_result_check.value} (ตรงกับที่บริษัทเปิดเผย)</div>
        </section>
      </div>

      <div className="row">
        <section className="card" style={{ flex: "999 1 520px" }}>
          <div className="card-head"><h2>รายละเอียดเคลม</h2>
            <input className="select" type="search" aria-label="ค้นหาเคลม" placeholder="ค้นหารหัสเคลม ประเภท หรือจำนวนเงิน..." value={q} onChange={(e) => setQ(e.target.value)} disabled={!claims?.available} /></div>
          {claims?.available ? (
            <div className="scroll-x"><table className="t"><thead><tr><th>รหัสเคลม</th><th>ประเภท</th><th>วันที่รับแจ้ง</th><th className="num">สำรองค่าสินไหม (บาท)</th><th>สถานะ</th></tr></thead>
              <tbody>{rows.slice(0, 50).map((r: any) => <tr key={r.claim_id}><td>{r.claim_id}</td><td>{r.line}</td><td>{r.reported_date}</td><td className="num">{Number(r.reserve_amount).toLocaleString()}</td><td>{r.status}</td></tr>)}</tbody></table></div>
          ) : <Gap height={180} title="รายละเอียดเคลมรายรายการเป็นข้อมูลภายในบริษัท" body="อัปโหลด claims.csv ในหน้าตั้งค่าเพื่อแสดงรายการ" />}
        </section>
        <section className="card" style={{ flex: "1 1 420px", display: "flex", flexDirection: "column", gap: 12 }}>
          <h2>ข้อมูลเชิงลึก</h2>
          <Banner>ค่าใช้จ่ายบริการประกันภัยเพิ่มขึ้น {d.expense_growth.value}% ขณะที่รายได้เปลี่ยนแปลง {d.revenue_growth.value}%</Banner>
          <div><b>อัตราส่วนค่าใช้จ่ายต่อรายได้ (proxy)</b><div className="muted">{d.gross_expense_ratio.value}% — {d.gross_expense_ratio.note}</div></div>
          <div><b>ปัจจัยภายนอก</b><div className="muted">อุทกภัยภาคใต้ปลายปี 2568: ความเสียหายรถยนต์ทั้งตลาด ฿{(market.southern_flood_2025.motor_losses / 1000).toFixed(1)}B จาก {market.southern_flood_2025.motor_vehicles.toLocaleString()} คัน (ณ 15 ธ.ค. 2568) [Milliman] — ไม่มีข้อมูลสาธารณะว่าส่วนใดเป็นของ NKI</div></div>
        </section>
      </div>
      <SourceFoot ids={["NKI-FH", "TIRD-2024", "MILLIMAN-2026"]} />
    </>
  );
}
