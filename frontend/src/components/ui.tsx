import { createContext, ReactNode, useContext, useState } from "react";
import { NavLink } from "react-router-dom";
import { send } from "../api";

/* ---------- shared data context ---------- */
export type Ctx = { summary: any; market: any; sources: Record<string, any>; company: string; reload: () => void };
export const DataCtx = createContext<Ctx>(null as any);
export const useData = () => useContext(DataCtx);

/* ---------- icons (inline stroke SVG, aria-hidden) ---------- */
const I = (d: ReactNode, fill = false) => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth="1.7">{d}</svg>
);
export const Icon = {
  home: I(<path d="M3 11.5 12 4l9 7.5V21h-6.5v-6h-5v6H3z" />, true),
  bars: I(<><rect x="4" y="13" width="3.5" height="8" rx="1" /><rect x="10.25" y="8" width="3.5" height="13" rx="1" /><rect x="16.5" y="4" width="3.5" height="17" rx="1" /></>, true),
  doc: I(<><path d="M6 3h8.5L19 7.5V21H6z" /><path d="M9 12h7M9 16h7" /></>),
  wave: I(<path d="M2 15c2.5-5 4.5-5 6.5-1s4 6 6.5 1 4-5 7-3" strokeWidth="2" />),
  gear: I(<><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>),
  wallet: I(<><path d="M4 7h14a2 2 0 0 1 2 2v10H6a2 2 0 0 1-2-2z" /><path d="M15 13h5v4h-5z" /></>),
  shield: I(<><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="M12 8v5M12 16v.5" /></>),
  spark: I(<path d="M12 3c1 6 3 8 9 9-6 1-8 3-9 9-1-6-3-8-9-9 6-1 8-3 9-9Z" />, true),
  send: I(<><path d="M21 3 3 10.5l7 2.5 2.5 7z" /><path d="m10 13 5-5" /></>),
};

/* ---------- layout ---------- */
const NAV = [
  ["/", "ภาพรวม", Icon.home], ["/forecast", "พยากรณ์เงินสด", Icon.bars], ["/claims", "วิเคราะห์เคลม", Icon.doc],
  ["/scenario", "จำลองสถานการณ์", Icon.wave], ["/reports", "รายงาน", Icon.doc], ["/settings", "ตั้งค่า", Icon.gear],
] as const;

export function Sidebar() {
  return (
    <nav className="sidebar" aria-label="เมนูหลัก">
      <div className="brand">
        <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><path d="M30 3C15 4 5 12 4 29c14-1 24-10 26-26Z" fill="#F0C9A6" /><path d="M5 29 24 10" stroke="#5A141E" strokeWidth="1.4" /></svg>
        <div><div className="brand-name">Cold BrewTech</div><div className="brand-sub">AI Insurance Cash Flow Concierge</div></div>
      </div>
      <div className="nav">
        {NAV.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>{icon}{label}</NavLink>
        ))}
      </div>
    </nav>
  );
}

export function Header({ title }: { title: string }) {
  const { summary } = useData();
  return (
    <header className="header">
      <div className="grow"><h1>{title}</h1><Chip kind="actual">ข้อมูลจริง (สาธารณะ)</Chip></div>
      <select className="select" aria-label="บริษัท" defaultValue="NKI"><option value="NKI">{summary?.company?.name_th ?? "…"} (NKI)</option></select>
      <select className="select" aria-label="งวดข้อมูล" defaultValue="2025"><option value="2025">ปี 2568 (FY2025)</option></select>
      <span className="updated"><span className="dot" aria-hidden="true" />ข้อมูล ณ 31 ธ.ค. 2568</span>
    </header>
  );
}

/* ---------- atoms ---------- */
const CHIP_LABEL: Record<string, string> = { actual: "จริง", forecast: "พยากรณ์", derived: "คำนวณ", gap: "ไม่มีข้อมูลสาธารณะ" };
export function Chip({ kind, children }: { kind: string; children?: ReactNode }) {
  return <span className={`chip ${kind}`}>{children ?? CHIP_LABEL[kind] ?? kind}</span>;
}

export function Kpi({ icon, label, value, status, neg, sub }: { icon: ReactNode; label: string; value: string; status: string; neg?: boolean; sub?: string }) {
  return (
    <div className="card kpi">
      <span className="ico">{icon}</span>
      <div>
        <div className="label">{label}</div>
        <div className={`value ${neg ? "neg" : ""}`}>{value}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}><Chip kind={status} />{sub && <span className="muted">{sub}</span>}</div>
      </div>
    </div>
  );
}

export function Gap({ title, body, height = 260 }: { title: string; body: string; height?: number }) {
  return (
    <div className="gapwrap" role="note" style={{ minHeight: height }}>
      <div className="gap-box"><Chip kind="gap" /><b>{title}</b><div className="muted" style={{ marginTop: 6, lineHeight: 1.55 }}>{body}</div></div>
    </div>
  );
}

export function Banner({ level = "warning", children, action }: { level?: string; children: ReactNode; action?: ReactNode }) {
  return <div role="status" className={`banner ${level}`}><span className="bang" aria-hidden="true">!</span><strong>{children}</strong>{action}</div>;
}

export function SourceFoot({ ids }: { ids: string[] }) {
  const { sources } = useData();
  return (
    <footer className="foot">
      แหล่งข้อมูล: {ids.map((id, i) => sources[id] && (
        <span key={id}>{i > 0 && " · "}[{id}] <a href={sources[id].url} target="_blank" rel="noreferrer">{sources[id].title}</a></span>
      ))}
    </footer>
  );
}

/* ---------- AI concierge ---------- */
export function Concierge({ suggestions }: { suggestions: string[] }) {
  const { company } = useData();
  const [q, setQ] = useState("");
  const [log, setLog] = useState<{ role: string; content: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<string>("");
  async function ask(text: string) {
    if (!text.trim()) return;
    setBusy(true);
    setLog((l) => [...l, { role: "user", content: text }]);
    setQ("");
    try {
      const r = await send("/api/concierge/ask", { question: text, company, history: log });
      setMode(r.mode);
      setLog((l) => [...l, { role: "assistant", content: r.answer }]);
    } catch (e: any) {
      setLog((l) => [...l, { role: "assistant", content: `เชื่อมต่อ API ไม่ได้ (${e.message})` }]);
    } finally { setBusy(false); }
  }
  return (
    <aside className="card concierge" aria-label="AI Concierge">
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--maroon-700)" }}>
        {Icon.spark}<h2 style={{ color: "#6A1520" }}>AI Concierge</h2><Chip kind="warn">Beta</Chip>
        {mode && <span className="muted" style={{ marginLeft: "auto" }}>{mode === "claude" ? "Claude" : "offline"}</span>}
      </div>
      <div aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {log.map((m, i) => <div key={i} className={m.role === "user" ? "msg-user" : "msg-ai"}>{m.content}</div>)}
        {busy && <div className="muted">กำลังวิเคราะห์…</div>}
      </div>
      {log.length === 0 && suggestions.map((s) => (
        <button type="button" key={s} className="suggest" onClick={() => ask(s)}>{s}<span aria-hidden="true">›</span></button>
      ))}
      <form className="ask" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <input aria-label="ถามเกี่ยวกับกระแสเงินสด" placeholder="ถามเกี่ยวกับกระแสเงินสด..." value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn" style={{ width: 48, padding: 0, background: "var(--maroon-600)" }} aria-label="ส่งคำถาม" disabled={busy}>{Icon.send}</button>
      </form>
      <div className="muted">คำตอบอ้างอิงเฉพาะข้อมูลที่ระบบมี พร้อมระบุสถานะ จริง / พยากรณ์ / คำนวณ</div>
    </aside>
  );
}
