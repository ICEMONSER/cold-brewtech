import { useEffect, useState } from "react";
import { fmtM, fmtN, get } from "../api";
import { ForecastChart } from "../components/charts";
import { Banner, Chip, Gap, Header, Icon, Kpi, SourceFoot, useData } from "../components/ui";

export default function Forecast() {
  const { summary } = useData();
  const [h, setH] = useState(30);
  const [fc, setFc] = useState<any>(null);
  useEffect(() => { get(`/api/companies/NKI/forecast?horizon=${h}`).then(setFc); }, [h]);
  if (!summary) return null;
  const a = summary.actual, p = summary.previous, d = summary.derived;

  return (
    <>
      <Header title="พยากรณ์เงินสด" />
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <span className="muted">ช่วงเวลา</span>
        <div className="seg" role="group" aria-label="ช่วงเวลา">
          {[30, 60, 90].map((n) => <button key={n} type="button" aria-pressed={h === n} className={h === n ? "on" : ""} onClick={() => setH(n)}>{n} วัน</button>)}
        </div>
        <button className="btn no-print" style={{ marginLeft: "auto" }} onClick={() => window.print()}>ส่งออกรายงาน</button>
      </div>

      <div className="grid4">
        <Kpi icon={Icon.wallet} label="กระแสเงินสดจากการดำเนินงาน" value={fmtM(a.cfo)} status="actual" sub={`2567: ${fmtM(p.cfo)}`} />
        <Kpi icon={Icon.bars} label="กระแสเงินสดจากการลงทุน" value={fmtM(a.cfi)} status="actual" neg />
        <Kpi icon={Icon.doc} label="กระแสเงินสดจากการจัดหาเงิน" value={fmtM(a.cff)} status="actual" neg />
        <Kpi icon={Icon.shield} label="เงินสดเพิ่มขึ้นสุทธิ" value={fmtM(d.net_cash_change.value, 2)} status="derived" sub="CFO+CFI+CFF" />
      </div>

      <section className="card">
        <div className="card-head">
          <div><h2>คาดการณ์เงินสด {h} วัน</h2><div className="muted">ล้านบาท</div></div>
          {fc?.breach && <Banner level={fc.breach.kind === "expected" ? "critical" : "warning"}>วันที่ {fc.breach.date} เงินสดอาจต่ำกว่าเกณฑ์ ฿{fc.threshold}M</Banner>}
          {!fc?.breach && a.liquidity_ratio_x < 1 && <Banner>อัตราส่วนสภาพคล่อง {a.liquidity_ratio_x} เท่า (2567: {p.liquidity_ratio_x})</Banner>}
        </div>
        {fc?.available ? <ForecastChart data={fc} threshold={fc.threshold} height={320} />
          : <Gap title="ไม่มีข้อมูลเงินสดรายวันของบริษัท" body={`ต้องการ: ${fc?.missing?.join(", ") ?? "…"}. ${fc?.reason ?? ""}`} />}
      </section>

      <div className="row">
        <section className="card" style={{ flex: "1.5 1 420px" }}>
          <h3>เงินรับและเงินจ่าย (คาดการณ์)</h3>
          {fc?.available ? (
            <table className="t" style={{ marginTop: 10 }}><tbody>
              <tr><td>เงินสดต้นงวด (ข้อมูลบริษัท)</td><td className="num">{fmtN(fc.opening_cash)}</td></tr>
              <tr><td>(+) เงินรับคาดการณ์</td><td className="num">{fmtN(fc.expected_receipts)}</td></tr>
              <tr><td>(−) จ่ายเคลมตามกำหนด</td><td className="num">{fmtN(fc.scheduled_payments)}</td></tr>
              <tr><td>(−) จ่ายเคลมคาดการณ์จากเงินสำรอง</td><td className="num">{fmtN(fc.expected_claim_payments)} ± {fmtN(fc.sigma_90)}</td></tr>
              <tr className="hl"><td>เงินสดต่ำสุด ({fc.trough.date})</td><td className="num">{fmtN(fc.trough.cash)}</td></tr>
            </tbody></table>
          ) : <Gap height={180} title="ไม่มีข้อมูลรับ–จ่ายรายสัปดาห์" body="ข้อมูลระดับวัน/สัปดาห์เป็นข้อมูลภายในบริษัท" />}
        </section>
        <section className="card" style={{ flex: "1 1 340px" }}>
          <div className="card-head"><h3>งบกระแสเงินสด ปี 2568</h3><Chip kind="actual" /></div>
          <table className="t"><thead><tr><th>รายการ</th><th className="num">2568</th><th className="num">2567</th></tr></thead><tbody>
            <tr><td>กิจกรรมดำเนินงาน</td><td className="num">{fmtN(a.cfo)}</td><td className="num">{fmtN(p.cfo)}</td></tr>
            <tr><td>กิจกรรมลงทุน</td><td className="num">{fmtN(a.cfi)}</td><td className="num">{fmtN(p.cfi)}</td></tr>
            <tr><td>กิจกรรมจัดหาเงิน</td><td className="num">{fmtN(a.cff)}</td><td className="num">{fmtN(p.cff)}</td></tr>
            <tr className="hl"><td>เพิ่มขึ้นสุทธิ (คำนวณ)</td><td className="num">{fmtN(d.net_cash_change.value)}</td><td className="num">{fmtN(p.cfo + p.cfi + p.cff)}</td></tr>
          </tbody></table>
        </section>
      </div>
      <SourceFoot ids={["NKI-FH"]} />
    </>
  );
}
