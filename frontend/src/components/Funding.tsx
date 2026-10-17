/* Funding popup: when underwriting makes a loss, propose the overdraft (if room is left),
 * otherwise compare bank loan offers by total cost and let the user choose. */
import { useEffect, useMemo, useState } from "react";
import { underwriting } from "../engine/analytics";
import { forecast } from "../engine/forecast";
import { addDays, fmtBaht, fmtM, mNum, thaiDate } from "../engine/format";
import { useApp } from "../store";
import { Modal } from "./ui";

export function useFundingNeed() {
  const { ds, today, threshold, horizon, loans } = useApp();
  return useMemo(() => {
    const uw = underwriting(ds, today);
    const f = forecast(ds, { horizon, today, threshold });
    const shortfall = f.breach && !f.breach.earlyWarning ? f.breach.shortfall : 0;
    const loss = Math.max(0, -uw.result);
    const need = shortfall > 0 ? Math.ceil(shortfall / 1e6) * 1e6 : Math.ceil(loss / 1e6) * 1e6;
    const firstBreach = f.series.find((p) => p.cash < threshold)?.day;
    const drawDay = Math.max(2, (firstBreach ?? 2) - 1);
    return { uw, f, shortfall, loss, need, drawDay, show: uw.result < 0 && need > 0 && (shortfall > 0 || loans.length === 0) };
  }, [ds, today, threshold, horizon, loans.length]);
}

type Opt = { key: string; source: string; product: string; rate: number; fee: number; ok: boolean; why?: string; od?: boolean };

export function FundingWatcher() {
  const app = useApp();
  const n = useFundingNeed();
  useEffect(() => {
    let seen = false; try { seen = sessionStorage.getItem("cbt.fundingSeen") === "1"; } catch { /* ignore */ }
    if (n.show && !seen) app.setFunding(true);
  }, [n.show]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => { app.setFunding(false); try { sessionStorage.setItem("cbt.fundingSeen", "1"); } catch { /* ignore */ } };
  return (
    <>
      {app.funding && <FundingModal onClose={close} />}
      {/* "ไว้ภายหลัง" docks the request as a tab with a red dot; click to reopen and confirm any time */}
      {n.show && !app.funding && (
        <button className="fund-dock" onClick={() => app.setFunding(true)} aria-label="เปิดหน้าจัดหาเงินทุนเพื่อยืนยันกู้">
          <span className="fund-dot" aria-hidden="true" />
          <span className="fund-dock-t">รอยืนยันกู้เงิน</span>
          <span className="fund-dock-v">{fmtM(n.need)}</span>
          <span className="fund-dock-s">ขาดทุนรับประกัน {fmtM(n.uw.result)} · กดเพื่อเลือกแหล่งกู้</span>
        </button>
      )}
    </>
  );
}

function FundingModal({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const n = useFundingNeed();
  const od = app.settings.od;
  const odLeft = Math.max(0, od.limitM - od.usedM) * 1e6;
  const [amountM, setAmountM] = useState(Math.max(1, n.need / 1e6));
  const [term, setTerm] = useState(30);
  const amount = amountM * 1e6;
  const odOk = odLeft >= amount;

  const opts: (Opt & { cost: number; interest: number })[] = useMemo(() => {
    const list: Opt[] = [
      { key: "od", source: "วงเงินเบิกเกินบัญชี (O/D)", product: `คงเหลือ ${fmtM(odLeft)} จากวงเงิน ${fmtM(od.limitM * 1e6)}`, rate: od.rate, fee: 0, ok: odOk, why: odOk ? undefined : `วงเงินคงเหลือ ${fmtM(odLeft)} ไม่พอ`, od: true },
      ...app.settings.banks.map((b, i) => ({ key: `b${i}`, source: b.bank, product: b.product, rate: b.rate, fee: b.fee, ok: b.maxM * 1e6 >= amount, why: b.maxM * 1e6 >= amount ? undefined : `วงเงินสูงสุด ${b.maxM} ล้านบาท` })),
    ];
    return list.map((o) => { const interest = (amount * (o.rate / 100) * term) / 365; return { ...o, interest, cost: interest + (amount * o.fee) / 100 }; });
  }, [app.settings.banks, od, odLeft, odOk, amount, term]);
  const banks = opts.filter((o) => !o.od && o.ok).sort((a, b) => a.cost - b.cost);
  const best = odOk ? opts[0] : banks[0];
  const [pick, setPick] = useState<string | undefined>(best?.key);
  useEffect(() => { setPick(best?.key); }, [best?.key]);
  const chosen = opts.find((o) => o.key === pick && o.ok);

  const drawDate = addDays(app.today, n.drawDay - 1);
  const after = useMemo(() => {
    if (!chosen) return null;
    const ds = { ...app.ds, ledger: [...app.ds.ledger, { date: drawDate, type: "other_receipt" as const, amount: amount * (1 - chosen.fee / 100), status: "expected" as const, description: "loan" }, { date: addDays(drawDate, term), type: "other_payment" as const, amount: amount + chosen.interest, status: "expected" as const, description: "repay" }] };
    return forecast(ds, { horizon: app.horizon, today: app.today, threshold: app.threshold });
  }, [chosen, app.ds, drawDate, amount, term, app.horizon, app.today, app.threshold]);

  const confirm = () => {
    if (!chosen) return;
    app.addLoan({ source: chosen.source, product: chosen.product, amount, rate: chosen.rate, fee: chosen.fee, drawDate, termDays: term, interest: chosen.interest });
    if (chosen.od) app.saveSettings({ od: { ...od, usedM: od.usedM + amountM } });
    app.log(`อนุมัติกู้ ${chosen.source} ${amountM} ล้านบาท ดอกเบี้ย ${chosen.rate}% ระยะ ${term} วัน (เบิก ${thaiDate(drawDate)})`);
    app.toast(`บันทึกการกู้ ${fmtM(amount)} กับ ${chosen.source} แล้ว ใส่ในพยากรณ์เงินสดเรียบร้อย`);
    onClose();
  };

  const second = banks[1];
  return (
    <Modal wide title="ขาดทุนจากการรับประกัน — จัดหาเงินทุน" onClose={onClose}
      footer={<><button className="btn btn-ghost mbtn" onClick={onClose}>ไว้ภายหลัง</button><button className="btn mbtn" disabled={!chosen} onClick={confirm}>{chosen ? `ยืนยันกู้ ${fmtM(amount)} กับ ${chosen.od ? "O/D" : chosen.source}` : "เลือกแหล่งเงินกู้"}</button></>}>
      <div className="fund-sum">
        <div><small>ผลรับประกัน 30 วัน</small><b className="red">{fmtM(n.uw.result)}</b><em>Combined Ratio {(n.uw.combined * 100).toFixed(0)}%</em></div>
        <div><small>เงินสดต่ำสุด</small><b>{fmtM(n.f.trough.cash)}</b><em>วันที่ {n.f.trough.day} · เกณฑ์ {fmtM(app.threshold)}</em></div>
        <div><small>เงินที่ต้องจัดหา</small><b className="red">{fmtM(n.need)}</b><em>{n.shortfall > 0 ? `ปิดช่องว่างสภาพคล่อง ${fmtM(n.shortfall)}` : "ชดเชยผลขาดทุน"}</em></div>
      </div>

      <div className={"fund-ai" + (odOk ? " od" : "")}>
        <b>✦ AI แนะนำ</b>
        {odOk
          ? <p>ยังมีวงเงินเบิกเกินบัญชีเหลือ {fmtM(odLeft)} เพียงพอ แนะนำเบิก O/D {fmtM(amount)} วันที่ {thaiDate(drawDate)} ก่อนเงินสดต่ำกว่าเกณฑ์ ไม่มีค่าธรรมเนียม ยืดหยุ่นชำระคืนได้เมื่อเงินรับเข้า ดอกเบี้ยประมาณ {fmtBaht(opts[0].interest)} ({od.rate}% ต่อปี, {term} วัน)</p>
          : best
            ? <p>วงเงิน O/D เหลือ {fmtM(odLeft)} ไม่พอ จึงเปรียบเทียบเงินกู้ระยะสั้น {banks.length} ธนาคาร ด้วยต้นทุนรวม (ดอกเบี้ย {term} วัน + ค่าธรรมเนียม) <b>{best.source}</b> ถูกที่สุด {fmtBaht(best.cost)} ({best.rate}%{best.fee ? ` + ค่าธรรมเนียม ${best.fee}%` : ""}){second ? ` ประหยัดกว่าอันดับ 2 (${second.source}) ${fmtBaht(second.cost - best.cost)}` : ""}</p>
            : <p>ไม่มีแหล่งเงินกู้ที่มีวงเงินพอสำหรับ {fmtM(amount)} ลองลดจำนวนเงินหรือแก้ไขข้อมูลธนาคารในตั้งค่า</p>}
      </div>

      <div className="fund-ctl">
        <label className="mfield"><span>จำนวนเงินกู้ (ล้านบาท)</span><input type="number" min={1} value={amountM} onChange={(e) => setAmountM(Math.max(1, +e.target.value || 1))} /></label>
        <label className="mfield"><span>ระยะเวลากู้</span><select value={term} onChange={(e) => setTerm(+e.target.value)}>{[30, 60, 90, 180].map((d) => <option key={d} value={d}>{d} วัน</option>)}</select></label>
        <label className="mfield"><span>วันที่เบิกเงิน</span><input readOnly value={`${thaiDate(drawDate)} (วันที่ ${n.drawDay})`} /></label>
      </div>

      <table className="tbl mtbl fund-tbl">
        <thead><tr><th /><th>แหล่งเงินกู้</th><th style={{ textAlign: "right" }}>ดอกเบี้ย/ปี</th><th style={{ textAlign: "right" }}>ค่าธรรมเนียม</th><th style={{ textAlign: "right" }}>ต้นทุนรวม {term} วัน</th><th /></tr></thead>
        <tbody>
          {[opts[0], ...opts.filter((o) => !o.od).sort((a, b) => (a.ok === b.ok ? a.cost - b.cost : a.ok ? -1 : 1))].map((o) => (
            <tr key={o.key} className={(o.ok ? "row-click" : "dis") + (pick === o.key ? " sel" : "")} onClick={() => o.ok && setPick(o.key)}>
              <td><input type="radio" name="fund" checked={pick === o.key} disabled={!o.ok} onChange={() => setPick(o.key)} aria-label={o.source} /></td>
              <td><b className="th">{o.source}</b><div className="muted small">{o.product}</div></td>
              <td style={{ textAlign: "right" }}>{o.rate.toFixed(2)}%</td>
              <td style={{ textAlign: "right" }}>{o.fee ? `${o.fee}%` : "-"}</td>
              <td style={{ textAlign: "right" }}>{o.ok ? fmtBaht(o.cost) : <span className="red small">{o.why}</span>}</td>
              <td>{best?.key === o.key && <span className="pill ok">AI แนะนำ</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {after && chosen && <p className="fund-after">หลังกู้: เงินสดต่ำสุด <b>{fmtM(n.f.trough.cash)} → {fmtM(after.trough.cash)}</b> {after.trough.cash >= app.threshold ? <span className="green">ไม่ต่ำกว่าเกณฑ์</span> : <span className="red">ยังต่ำกว่าเกณฑ์ {fmtM(app.threshold - after.trough.cash)}</span>} · ชำระคืน {fmtM(amount + chosen.interest, 2)} วันที่ {thaiDate(addDays(drawDate, term))}</p>}
      <p className="muted small">อัตราดอกเบี้ยธนาคารเป็นค่าตัวอย่าง แก้ไขให้ตรงกับข้อเสนอจริงได้ที่ ตั้งค่า → บริษัท · ต้นทุนรวม = เงินกู้ × อัตราดอกเบี้ย × วัน/365 + ค่าธรรมเนียม · ผลขาดทุน {mNum(n.loss)} ล้านบาท</p>
    </Modal>
  );
}
