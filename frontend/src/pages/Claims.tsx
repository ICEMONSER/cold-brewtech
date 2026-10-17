import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Kpi, PageHeader, Pill } from "../components/Shell";
import { Dropdown, Menu, Modal } from "../components/ui";
import * as I from "../components/icons";
import { claimRows, insights, underwriting, type ClaimRow } from "../engine/analytics";
import { downloadText, toCSV } from "../engine/csv";
import { forecast } from "../engine/forecast";
import { fmtBaht, fmtInt, fmtM, lineLabel, mNum, STATUS_TH, STATUS_TONE, thaiDate } from "../engine/format";
import type { Datasets } from "../engine/types";
import { useApp } from "../store";

type SortKey = "claim_id" | "line" | "reserve" | "dueIn" | "status";

export default function Claims() {
  const { ds, today, threshold, horizon, setHorizon, toast } = useApp();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const [line, setLine] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [sort, setSort] = useState<{ k: SortKey; asc: boolean }>(sp.get("due") ? { k: "dueIn", asc: true } : { k: "claim_id", asc: true });
  const [all, setAll] = useState(!!sp.get("due"));
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<ClaimRow | null>(null);
  useEffect(() => { const x = sp.get("q"); if (x) setQ(x); }, [sp]);

  const lines = useMemo(() => [...new Set(ds.claims.map((c) => c.line))], [ds]);
  const fds: Datasets = useMemo(() => line === "all" ? ds : {
    ...ds, policies: ds.policies.filter((p) => p.line === line), claims: ds.claims.filter((c) => c.line === line),
  }, [ds, line]);
  const f = useMemo(() => forecast(fds, { horizon, today, threshold }), [fds, horizon, today, threshold]);
  const uw = useMemo(() => underwriting(fds, today), [fds, today]);
  const rowsAll = useMemo(() => claimRows(fds, today), [fds, today]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    let r = rowsAll.filter((x) => (status === "all" || x.status === status) && (!s || x.claim_id.toLowerCase().includes(s) || lineLabel(x.line).includes(s) || x.line.includes(s) || String(Math.round(x.reserve)).includes(s.replace(/[,฿]/g, "")) || (STATUS_TH[x.status] ?? "").includes(s)));
    const dir = sort.asc ? 1 : -1;
    r = [...r].sort((a, b) => { const va = a[sort.k] ?? 1e9, vb = b[sort.k] ?? 1e9; return (va < vb ? -1 : va > vb ? 1 : 0) * dir; });
    return r;
  }, [rowsAll, status, q, sort]);
  const expected = useMemo(() => {
    const out: Record<string, number> = {};
    for (const c of f.contributors) if (status === "all" || c.status === status) out[c.line] = (out[c.line] ?? 0) + c.amount;
    return out;
  }, [f, status]);
  const expTotal = Object.values(expected).reduce((a, b) => a + b, 0);
  const ins = useMemo(() => insights(fds, f, today), [fds, f, today]);

  const byType = lines.filter((l) => line === "all" || l === line).map((l) => ({ l, v: expected[l] ?? 0 })).sort((a, b) => b.v - a.v).slice(0, 4);
  const bmax = Math.max(...byType.map((b) => b.v), 1);
  const bStep = [5, 10, 20, 25, 50].map((x) => x * 1e6).find((s) => s * 3 >= bmax) ?? Math.ceil(bmax / 3e7) * 1e7;
  const Yb = (v: number) => 240 - (v / (bStep * 3)) * 160;
  const slots = byType.length, bx = (i: number) => 50 + (489 / slots) * (i + 0.5);

  const wmax = Math.max(uw.earned, uw.incurred + uw.expenses, 1);
  const wStep = [25, 50, 100, 200, 250, 500].map((x) => x * 1e6).find((s) => s * 3 >= wmax) ?? Math.ceil(wmax / 3e8) * 1e8;
  const Yw = (v: number) => 173 - (v / wStep) * 36.5;
  const wb = [
    { x: 81, y0: 0, y1: uw.earned, fill: "#6b111c", label: fmtM(uw.earned, 0), lt: true },
    { x: 197, y0: uw.earned, y1: uw.earned - uw.incurred, fill: "#f2a5a8", label: `-${fmtM(uw.incurred, 0)}` },
    { x: 312, y0: uw.earned - uw.incurred, y1: uw.result, fill: "#f2a5a8", label: `-${fmtM(uw.expenses, 0)}` },
    { x: 428, y0: 0, y1: uw.result, fill: uw.result < 0 ? "#ef8f94" : "#7cc79a", label: fmtM(uw.result, 0) },
  ];

  const PAGE = all ? 12 : 5;
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.ceil(rows.length / PAGE);
  const sortBy = (k: SortKey) => { setSort((s) => ({ k, asc: s.k === k ? !s.asc : true })); setPage(0); };
  const exportRows = (rs: ClaimRow[], name: string) => {
    downloadText(name, toCSV(["claim_id", "policy_id", "line", "loss_date", "reported_date", "status", "reserve", "due_date", "due_kind"], rs.map((r) => ({ ...r, reserve: Math.round(r.reserve), due_date: r.dueDate, due_kind: r.dueKind }))));
    toast(`ดาวน์โหลด ${rs.length.toLocaleString()} รายการแล้ว`);
  };
  const Th = ({ k, children, style }: { k: SortKey; children: any; style?: any }) => (
    <th style={style}><button className="th-sort" onClick={() => sortBy(k)}>{children}{sort.k === k && <span>{sort.asc ? " ▲" : " ▼"}</span>}</button></th>
  );

  return (
    <>
      <PageHeader title="วิเคราะห์เคลม" />
      <section className="card filters" style={{ marginTop: -8 }}>
        <div><div className="field-label">ประเภทประกัน</div><Dropdown label="ประเภทประกัน" w={291} className="sel-40" value={line} onChange={(v) => { setLine(v); setPage(0); }} options={[{ value: "all", label: "ทั้งหมด" }, ...lines.map((l) => ({ value: l, label: lineLabel(l) }))]} /></div>
        <div><div className="field-label">สถานะเคลม</div><Dropdown label="สถานะเคลม" w={291} className="sel-40" value={status} onChange={(v) => { setStatus(v); setPage(0); }} options={[{ value: "all", label: "ทั้งหมด" }, ...["approved", "review", "survey", "docs"].map((s) => ({ value: s, label: STATUS_TH[s] }))]} /></div>
        <div><div className="field-label">ช่วงเวลา</div><Dropdown label="ช่วงเวลา" w={307} className="sel-40" value={horizon} onChange={setHorizon} options={[30, 60, 90].map((d) => ({ value: d, label: `${d} วันข้างหน้า` }))} /></div>
      </section>

      <div className="cl-kpis">
        <Kpi className="circ" icon={<I.Doc size={24} />} label="เคลมเปิดอยู่" value={`${fmtInt(rows.length)} รายการ`} onClick={() => { setAll(true); setPage(0); }} />
        <Kpi className="circ" icon={<I.Coins size={24} />} label="คาดการณ์จ่ายเคลม" value={fmtM(expTotal, 0)} unit="ล้านบาท" />
        <Kpi className="circ" icon={<I.Shield size={24} />} label="ค่าสินไหมเกิดขึ้น" info={`ค่าสินไหมของเคลมที่เกิดเหตุใน 30 วันที่ผ่านมา (จ่ายแล้ว + สำรอง) ตั้งแต่ ${thaiDate(uw.from)}`} value={fmtM(uw.incurred, 0)} unit="ล้านบาท" />
        <Kpi className="circ" icon={<I.Bars4 size={24} />} label="Combined Ratio" info="(ค่าสินไหมเกิดขึ้น + ค่าใช้จ่ายในการรับประกัน) ÷ เบี้ยประกันรับรู้รายได้ ใน 30 วันที่ผ่านมา มากกว่า 100% คือขาดทุนจากการรับประกัน" value={`${(uw.combined * 100).toFixed(1)}%`} />
      </div>

      <div className="cl-row">
        <section className="card rel">
          <h3 className="card-title" style={{ position: "absolute", left: 18, top: 13 }}>คาดการณ์ยอดจ่ายตามประเภท</h3>
          <span className="unit" style={{ position: "absolute", left: 19, top: 44 }}>ล้านบาท</span>
          <svg className="chart" width="560" height="314" viewBox="0 0 560 314" style={{ position: "absolute", left: 0, top: 0 }}>
            {[0, 1, 2, 3].map((k) => (
              <g key={k}><line x1="50" x2="539" y1={Yb(k * bStep)} y2={Yb(k * bStep)} stroke={k ? "#eceef1" : "#cfd2d7"} /><text x="36" y={Yb(k * bStep) + 5} textAnchor="end" className="tick" fontSize="14">{mNum(k * bStep)}</text></g>
            ))}
            <line x1="50" x2="50" y1={Yb(bStep * 3)} y2="240" stroke="#e3e5e9" />
            {byType.map((b, i) => (
              <g key={b.l} className="bar-click" onClick={() => { setLine(b.l); setPage(0); }}>
                <title>{`${lineLabel(b.l)}: ${fmtBaht(b.v)} — คลิกเพื่อกรอง`}</title>
                <rect x={bx(i) - 46} y={Yb(b.v)} width="92" height={240 - Yb(b.v)} fill="#8b1a24" />
                <text x={bx(i)} y={Yb(b.v) - 11} textAnchor="middle" fontSize="15" fontWeight="700" fill="#16181d">{fmtM(b.v, 0)}</text>
                <text x={bx(i)} y="266" textAnchor="middle" fontSize="15" fill="#2b2f38">{lineLabel(b.l)}</text>
                <text x={bx(i)} y="287" textAnchor="middle" fontSize="14" fill="#5d6370">({expTotal ? Math.round((b.v / expTotal) * 100) : 0}%)</text>
              </g>
            ))}
          </svg>
          <div className="total-box"><div className="t1">รวมทั้งสิ้น</div><div className="t2">{fmtM(expTotal, 0)}</div><div className="t3">ล้านบาท</div></div>
        </section>

        <section className="card rel">
          <h3 className="card-title" style={{ position: "absolute", left: 16, top: 14, display: "flex", alignItems: "center", gap: 10 }}>ผลการรับประกัน (Underwriting) <InfoBtn /></h3>
          <span className="th" style={{ position: "absolute", right: 16, top: 19, fontSize: 14.5, color: "#2b2f38" }}>หน่วย: ล้านบาท</span>
          <svg className="chart" width="535" height="314" viewBox="0 0 535 314" style={{ position: "absolute", left: 0, top: 0 }}>
            {[3, 2, 1, 0, -1].map((k) => (
              <g key={k}><line x1="58" x2="520" y1={Yw(k * wStep)} y2={Yw(k * wStep)} stroke={k === 0 ? "#c8ccd2" : "#eceef1"} /><text x="46" y={Yw(k * wStep) + 5} textAnchor="end" className="tick" fontSize="14">{mNum(k * wStep)}</text></g>
            ))}
            <line x1="58" x2="58" y1={Yw(wStep * 3)} y2={Yw(-wStep)} stroke="#e3e5e9" />
            {wb.map((b, i) => {
              const yTop = Yw(Math.max(b.y0, b.y1)), yBot = Yw(Math.min(b.y0, b.y1));
              return (
                <g key={i}>
                  <title>{b.label}</title>
                  <rect x={b.x} y={yTop} width="70" height={Math.max(2, yBot - yTop)} fill={b.fill} />
                  {i < 3 && <line x1={b.x + 70} x2={wb[i + 1].x} y1={Yw(b.y1)} y2={Yw(b.y1)} stroke="#c9ccd2" />}
                  <text x={b.x + 35} y={b.lt ? yTop - 10 : yBot + 19} textAnchor="middle" fontSize={b.lt ? 15 : 14} fontWeight={b.lt ? 700 : 400} fill={b.lt ? "#16181d" : "#b4232c"}>{b.label}</text>
                </g>
              );
            })}
            {[[116, ["เบี้ยประกัน", "รับรู้รายได้"]], [232, ["ค่าสินไหม", "เกิดขึ้น", "(Underwriting)"]], [347, ["ค่าใช้จ่าย", "ในการรับประกัน"]], [463, ["ผลรับประกัน"]]].map(([x, ls]) => (
              <text key={x as number} x={x as number} y="231" textAnchor="middle" fontSize="13.5" fill="#2b2f38">{(ls as string[]).map((l, i) => <tspan key={i} x={x as number} dy={i ? 18 : 0}>{l}</tspan>)}</text>
            ))}
          </svg>
          <div className="th" style={{ position: "absolute", left: 18, bottom: 12, fontSize: 13.5, color: "#5d6370" }}>ผลรับประกันไม่รวมรายได้ลงทุน และอาจแตกต่างจากกระแสเงินสดจ่ายเคลม</div>
        </section>
      </div>

      <div className={"cl-row b" + (all ? " grow" : "")}>
        <section className={"card cl-table" + (all ? " all" : "")}>
          <div className="cl-table-head">
            <h3 className="card-title">รายละเอียดเคลม{(line !== "all" || status !== "all" || q) && <span className="muted small"> · {fmtInt(rows.length)} รายการ</span>}</h3>
            <label className="search"><I.Search size={19} /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="ค้นหารหัสเคลม ประเภท หรือจำนวนเงิน..." /></label>
          </div>
          <table className="tbl">
            <colgroup><col style={{ width: 114 }} /><col style={{ width: 116 }} /><col style={{ width: 150 }} /><col style={{ width: 126 }} /><col /><col style={{ width: 50 }} /></colgroup>
            <thead><tr><Th k="claim_id">รหัสเคลม</Th><Th k="line">ประเภท</Th><Th k="reserve">ประมาณการจ่าย<br />(บาท)</Th><Th k="dueIn">กำหนดจ่าย</Th><Th k="status">สถานะ</Th><th /></tr></thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.claim_id} className="row-click" onClick={() => setDetail(c)}>
                  <td>{c.claim_id}</td><td className="th">{lineLabel(c.line)}</td><td style={{ textAlign: "right", paddingRight: 46 }}>{fmtBaht(c.reserve)}</td>
                  <td className="th" title={c.dueKind === "expected" ? "คาดการณ์จากประวัติการจ่าย" : "กำหนดจ่ายแล้ว"}>{c.dueIn == null ? "-" : c.dueIn === 0 ? "วันนี้" : `อีก ${c.dueIn} วัน`}{c.dueKind === "expected" && <span className="est">*</span>}</td>
                  <td><Pill tone={STATUS_TONE[c.status] ?? "review"}>{STATUS_TH[c.status] ?? c.status}</Pill></td>
                  <td><Menu items={[
                    { label: "ดูรายละเอียด", onClick: () => setDetail(c) },
                    { label: "คัดลอกรหัสเคลม", onClick: () => { navigator.clipboard?.writeText(c.claim_id); toast(`คัดลอก ${c.claim_id} แล้ว`); } },
                    { label: "ดาวน์โหลดข้อมูลเคลม (CSV)", onClick: () => exportRows([c], `${c.claim_id}.csv`) },
                  ]} /></td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={6} className="muted" style={{ textAlign: "center", height: 80 }}>ไม่พบเคลมที่ตรงกับเงื่อนไข</td></tr>}
            </tbody>
          </table>
          <div className="foot">
            {pages > 1 && <div className="pager"><button disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button><span>{page + 1} / {pages}</span><button disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>›</button></div>}
            {all && <button className="link" onClick={() => exportRows(rows, "claims-open.csv")}><I.Download size={15} />ดาวน์โหลด CSV</button>}
            <button className="link" onClick={() => { setAll(!all); setPage(0); }}>{all ? "แสดงแบบย่อ" : "ดูรายการเคลมทั้งหมด"} <I.ArrowRight size={16} /></button>
          </div>
        </section>

        <section className="card insights">
          <h3 className="card-title"><span style={{ color: "#8b1a24", display: "inline-flex" }}><I.Bulb size={25} /></span>ข้อมูลเชิงลึก</h3>
          {ins.map((x) => x.tone === "warn" ? (
            <div key={x.title} className="ins-alert"><span className="bang">!</span><div><b>{x.title}</b><p>{x.body}</p></div></div>
          ) : (
            <div key={x.title} className="ins-item"><span className="ins-ico">{x.icon === "bars" ? <I.Bars4 size={21} /> : <I.Coins size={21} />}</span><div><b>{x.title}</b><p>{x.body}</p></div></div>
          ))}
        </section>
      </div>

      {detail && <ClaimModal c={detail} ds={ds} onClose={() => setDetail(null)} onScenario={() => nav("/scenario")} />}
    </>
  );
}

function InfoBtn() {
  const [o, setO] = useState(false);
  return (
    <>
      <button className="i-mark plain" aria-label="วิธีคำนวณ" onClick={() => setO(true)}><I.Info size={18} /></button>
      {o && <Modal title="ผลการรับประกันคำนวณอย่างไร" onClose={() => setO(false)}>
        <p>ใช้ข้อมูล 30 วันที่ผ่านมา:</p>
        <ul>
          <li><b>เบี้ยประกันรับรู้รายได้</b> = เบี้ยของแต่ละกรมธรรม์ × จำนวนวันที่คุ้มครองในช่วง ÷ ระยะเวลากรมธรรม์ (Policy System)</li>
          <li><b>ค่าสินไหมเกิดขึ้น</b> = เคลมที่เกิดเหตุในช่วง: จ่ายแล้ว + สำรองคงเหลือ (Claims + Payment + Actuarial)</li>
          <li><b>ค่าใช้จ่ายในการรับประกัน</b> = รายการ type=expense ในบัญชี (Accounting)</li>
          <li><b>ผลรับประกัน</b> = เบี้ยรับรู้ − ค่าสินไหมเกิดขึ้น − ค่าใช้จ่าย</li>
        </ul>
      </Modal>}
    </>
  );
}

function ClaimModal({ c, ds, onClose, onScenario }: { c: ClaimRow; ds: Datasets; onClose: () => void; onScenario: () => void }) {
  const pol = ds.policies.find((p) => p.policy_id === c.policy_id);
  const pays = ds.payments.filter((p) => p.claim_id === c.claim_id);
  return (
    <Modal title={`เคลม ${c.claim_id}`} onClose={onClose} footer={<><button className="btn btn-ghost mbtn" onClick={onClose}>ปิด</button><button className="btn mbtn" onClick={onScenario}>จำลองผลกระทบ</button></>}>
      <div className="kv">
        <div><span>ประเภท</span><b>{lineLabel(c.line)}</b></div>
        <div><span>สถานะ</span><b><Pill tone={STATUS_TONE[c.status] ?? "review"}>{STATUS_TH[c.status] ?? c.status}</Pill></b></div>
        <div><span>วันที่เกิดเหตุ</span><b>{thaiDate(c.loss_date)}</b></div>
        <div><span>วันที่แจ้งเคลม</span><b>{thaiDate(c.reported_date)}</b></div>
        <div><span>ยอดเรียกร้อง</span><b>{fmtBaht(c.claimed_amount)}</b></div>
        <div><span>สำรองค่าสินไหม (Actuarial)</span><b>{fmtBaht(c.reserve)}</b></div>
        <div><span>{c.dueKind === "scheduled" ? "กำหนดจ่าย (Payment)" : "คาดว่าจะจ่าย (โมเดล)"}</span><b>{c.dueDate ? `${thaiDate(c.dueDate)} (อีก ${c.dueIn} วัน)` : "-"}</b></div>
        <div><span>กรมธรรม์</span><b>{pol ? `${pol.policy_id} · เบี้ย ${fmtBaht(pol.premium)} · ทุน ${fmtM(pol.sum_insured)}` : c.policy_id || "-"}</b></div>
      </div>
      <h4 className="mh">รายการจ่าย</h4>
      {pays.length ? <table className="tbl mtbl"><thead><tr><th>วันที่</th><th>สถานะ</th><th style={{ textAlign: "right" }}>จำนวนเงิน</th></tr></thead><tbody>{pays.map((p, i) => <tr key={i}><td>{thaiDate(p.payment_date)}</td><td className="th">{p.status === "paid" ? "จ่ายแล้ว" : "กำหนดจ่าย"}</td><td style={{ textAlign: "right" }}>{fmtBaht(p.amount)}</td></tr>)}</tbody></table> : <p className="muted">ยังไม่มีรายการจ่าย วันที่คาดว่าจะจ่ายคำนวณจากระยะเวลาจ่ายในอดีตของเคลม{lineLabel(c.line)}</p>}
    </Modal>
  );
}
