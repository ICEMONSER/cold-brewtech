import { createContext, ReactNode, useContext, useState } from "react";
import { NavLink } from "react-router-dom";
import { send } from "../api";

/* ---------- shared data context ---------- */
export type Mode = "demo" | "real";
export type Ctx = {
  summary: any; market: any; sources: Record<string, any>; company: string; reload: () => void;
  mode: Mode; setMode: (m: Mode) => void; threshold: number; setThreshold: (v: number) => void;
};
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
  building: I(<path d="M4 21V4h10v17M14 9h6v12M2 21h20M7 8h1M10 8h1M7 12h1M10 12h1M7 16h1M10 16h1" />),
  calendar: I(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4" /></>),
  chevron: I(<path d="m6 9 6 6 6-6" strokeWidth="2" />),
  info: I(<><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>),
  inArrow: I(<path d="M14 4h5v16h-5M3 12h11M10 8l4 4-4 4" />),
  outArrow: I(<path d="M10 4H5v16h5M9 12h12M17 8l4 4-4 4" />),
  coins: I(<><ellipse cx="12" cy="6" rx="7" ry="2.5" /><path d="M5 6v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 10v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4M5 14v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4" /></>),
  trend: I(<path d="m3 17 6-6 4 4 8-8" strokeWidth="2" />),
  download: I(<path d="M12 3v12M7 10l5 5 5-5M4 17v4h16v-4" />),
  calc: I(<><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M7 7h10M7 11h2M11 11h2M15 11h2M7 15h2M11 15h2M15 15h2M7 18.5h2M11 18.5h2M15 18.5h2" /></>),
  reset: I(<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4" strokeWidth="2" />),
  save: I(<><path d="M5 3h11l3 3v15H5z" /><path d="M8 3v5h7V3M8 14h8v7H8z" /></>),
  bulb: I(<><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" /></>),
  eye: I(<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>),
  plus: I(<path d="M12 5v14M5 12h14" strokeWidth="2" />),
  search: I(<><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>),
  clock: I(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  user: I(<><circle cx="12" cy="8" r="4.5" /><path d="M3 21c1-5 4.5-7 9-7s8 2 9 7z" /></>, true),
  thumb: I(<path d="M7 10v10H4V10zM7 10l4-7c2 0 3 1 2.5 3L13 9h6a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 17.7 20H7" />),
  leaf: (<svg width="22" height="22" viewBox="0 0 34 34" aria-hidden="true"><path d="M30 3C15 4 5 12 4 29c14-1 24-10 26-26Z" fill="#8E2330" /><path d="M5 29 24 10" stroke="#FCECEA" strokeWidth="1.6" /></svg>),
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
  const { summary, mode, setMode } = useData();
  const demo = mode === "demo";
  return (
    <header className="header">
      <div className="grow">
        <h1>{title}</h1>
        {demo ? <span className="chip warn" title="ตัวเลขทั้งหมดในโหมดนี้เป็นข้อมูลสมมติเพื่อสาธิต">ข้อมูลสมมติ {Icon.info}</span>
          : <span className="chip actual" title="ข้อมูลจากแหล่งสาธารณะ พร้อมระบุแหล่งที่มา">ข้อมูลจริง (สาธารณะ) {Icon.info}</span>}
      </div>
      <label className="picker"><span className="sr">บริษัท</span>{Icon.building}
        <select aria-label="บริษัท" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
          <option value="demo">บริษัทประกัน A (ตัวอย่าง)</option>
          <option value="real">{summary?.company?.name_th ?? "นวกิจประกันภัย"} (NKI)</option>
        </select>{Icon.chevron}</label>
      <label className="picker"><span className="sr">ช่วงเวลา</span>{Icon.calendar}
        <select aria-label="ช่วงเวลา" defaultValue="30">{demo ? <option value="30">30 วันข้างหน้า</option> : <option value="30">ปี 2568 (FY2025)</option>}</select>{Icon.chevron}</label>
      <span className="updated"><span className="dot" aria-hidden="true" />{demo ? "อัปเดตล่าสุด 09:00" : "ข้อมูล ณ 31 ธ.ค. 2568"}</span>
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
type Msg = { role: string; content: string; sources?: string[] };

export function Concierge({ suggestions, seed = [], facts, children, compact }: { suggestions: string[]; seed?: Msg[]; facts?: unknown; children?: ReactNode; compact?: boolean }) {
  const { company, mode } = useData();
  const [q, setQ] = useState("");
  const [log, setLog] = useState<Msg[]>(seed);
  const [busy, setBusy] = useState(false);
  async function ask(text: string) {
    if (!text.trim()) return;
    setBusy(true);
    const history = log.map(({ role, content }) => ({ role, content }));
    setLog((l) => [...l, { role: "user", content: text }]);
    setQ("");
    try {
      const r = await send("/api/concierge/ask", { question: text, company, history, mode, demo_facts: mode === "demo" ? facts : undefined });
      setLog((l) => [...l, { role: "assistant", content: r.answer, sources: r.sources }]);
    } catch (e: any) {
      setLog((l) => [...l, { role: "assistant", content: `เชื่อมต่อ API ไม่ได้ (${e.message})` }]);
    } finally { setBusy(false); }
  }
  return (
    <aside className="card concierge" aria-label="AI Concierge">
      <div className="cc-head">{Icon.spark}<h2>AI Concierge</h2><span className="chip warn round">Beta</span></div>
      <div aria-live="polite" className="cc-log">
        {log.map((m, i) => m.role === "user"
          ? <div key={i} className="cc-user"><span className="avatar">{Icon.user}</span><div className="msg-user">{m.content}</div></div>
          : <div key={i} className="cc-ai"><span className="ai-ico">{Icon.leaf}</span><div className="msg-ai">{m.content}
              {m.sources && m.sources.length > 0 && <div className="cc-src"><div>แหล่งข้อมูล</div><div>{Icon.doc}{m.sources.map((s, k) => <span key={s}>{k > 0 && " • "}<a href="#">{s}</a></span>)}</div>
                <div className="cc-thumbs"><button type="button" aria-label="มีประโยชน์">{Icon.thumb}</button><button type="button" aria-label="ไม่มีประโยชน์" className="flip">{Icon.thumb}</button></div></div>}
            </div></div>)}
        {busy && <div className="muted">กำลังวิเคราะห์…</div>}
      </div>
      <div className="cc-suggest">
        {suggestions.map((s) => <button type="button" key={s} className="suggest" onClick={() => ask(s)}>{s}<span aria-hidden="true">›</span></button>)}
      </div>
      <form className="ask" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <input aria-label="ถามเกี่ยวกับกระแสเงินสด" placeholder="ถามเกี่ยวกับกระแสเงินสด..." value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn send" aria-label="ส่งคำถาม" disabled={busy}>{Icon.send}</button>
      </form>
      {!compact && children}
    </aside>
  );
}
