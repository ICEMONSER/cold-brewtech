import { useEffect, useState } from "react";
import { fmtN, send } from "../api";
import { Chip, Header, SourceFoot } from "../components/ui";

export default function Scenario() {
  const [shock, setShock] = useState(10);
  const [res, setRes] = useState<any>(null);
  useEffect(() => { const t = setTimeout(() => send("/api/scenario", { company: "NKI", expense_shock_pct: shock }).then(setRes), 200); return () => clearTimeout(t); }, [shock]);

  const rows: [string, string][] = [["ค่าใช้จ่ายบริการประกันภัย", "insurance_service_expenses"], ["ผลการบริการประกันภัย", "insurance_service_result"], ["กระแสเงินสดจากการดำเนินงาน", "cfo"], ["ส่วนของผู้ถือหุ้น (ก่อนภาษี)", "equity"]];
  return (
    <>
      <Header title="จำลองสถานการณ์" />
      <div className="row">
        <section className="card" style={{ flex: "1 1 280px", maxWidth: 320, display: "flex", flexDirection: "column", gap: 16 }}>
          <div><h2>การเปลี่ยนแปลงสมมติฐาน</h2><div className="muted">ปรับตัวแปรบนข้อมูลจริงปี 2568 ของ NKI</div></div>
          <label className="field">
            <span style={{ display: "flex", justifyContent: "space-between" }}>ค่าใช้จ่ายบริการประกันภัยเปลี่ยนแปลง <Chip kind="warn">{shock > 0 ? "+" : ""}{shock}%</Chip></span>
            <input type="range" min={-20} max={30} step={1} value={shock} onChange={(e) => setShock(+e.target.value)} />
            <span className="muted" style={{ display: "flex", justifyContent: "space-between" }}><span>-20%</span><span>0%</span><span>+30%</span></span>
          </label>
          <button className="btn plain" onClick={() => setShock(0)}>รีเซ็ต</button>
        </section>

        <section className="card" style={{ flex: "999 1 560px" }}>
          <div className="card-head"><div><h2>ผลการจำลองสถานการณ์</h2><div className="muted">เทียบกับข้อมูลจริงปี 2568 (หน่วย: ล้านบาท)</div></div><Chip kind="derived" /></div>
          {res && <>
            <div className="scroll-x"><table className="t"><thead><tr><th>รายการ</th><th className="num">กรณีฐาน (จริง)</th><th className="num">สถานการณ์ ({shock > 0 ? "+" : ""}{shock}%)</th><th className="num">ผลต่าง</th></tr></thead><tbody>
              {rows.map(([label, k]) => {
                const diff = res.scenario[k] - res.base[k];
                return <tr key={k}><td>{label}</td><td className="num">{fmtN(res.base[k])}</td><td className={`num ${res.scenario[k] < 0 ? "neg" : ""}`}>{fmtN(res.scenario[k])}</td><td className="num">{diff > 0 ? "+" : ""}{fmtN(diff)}</td></tr>;
              })}
            </tbody></table></div>
            <p className="muted">สูตร: Δ = ค่าใช้จ่าย × {shock}% = {fmtN(res.delta)} ล้านบาท</p>
            <h3 style={{ marginTop: 14 }}>สมมติฐานและข้อจำกัด</h3>
            <ul className="muted" style={{ lineHeight: 1.7 }}>{res.assumptions.map((x: string) => <li key={x}>{x}</li>)}</ul>
          </>}
        </section>
      </div>
      <SourceFoot ids={["NKI-FH"]} />
    </>
  );
}
