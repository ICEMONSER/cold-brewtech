import { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { fmtM, hhmm } from "../engine/format";
import { SOURCES } from "../engine/types";
import { useApp } from "../store";
import { Dropdown, Popover } from "./ui";
import * as I from "./icons";

const NAV = [
  { to: "/", label: "ภาพรวม", icon: <I.Home size={23} /> },
  { to: "/forecast", label: "พยากรณ์เงินสด", icon: <I.BarsSolid size={22} /> },
  { to: "/claims", label: "วิเคราะห์เคลม", icon: <I.Doc size={22} /> },
  { to: "/scenario", label: "จำลองสถานการณ์", icon: <I.Wave size={22} /> },
  { to: "/reports", label: "รายงาน", icon: <I.Doc size={22} /> },
  { to: "/settings", label: "ตั้งค่า", icon: <I.Gear size={24} /> },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <svg className="brand-leaf" width="34" height="36" viewBox="0 0 34 36" aria-hidden="true">
          <defs>
            <linearGradient id="lg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#e9b78c" /><stop offset="1" stopColor="#f6d6b4" /></linearGradient>
          </defs>
          <path d="M31 2C17 3 5 9 3.6 20.5c-.4 3.4.4 6.4 1.9 8.6C17 29 30 20 31 2Z" fill="url(#lg)" />
          <path d="M3 34c3-8 9-17 22-26" stroke="#430e17" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </svg>
        <div>
          <div className="brand-name">บัญชีจัง วิศวะคุง</div>
          <div className="brand-sub">AI Insurance Cash Flow Concierge</div>
        </div>
      </div>
      <nav>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end className={({ isActive }) => "nav" + (isActive ? " active" : "")}>
            <span className="nav-ico">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export function PageHeader({ title, selects, gap = 105 }: { title: string; selects?: [number, number]; gap?: number }) {
  const [w1, w2] = selects ?? [208, 220];
  const { settings, horizon, setHorizon, loadedAt, refresh, toast } = useApp();
  const nav = useNavigate();
  return (
    <header className="page-head">
      <h1>{title}</h1>
      <div className="head-selects" style={{ marginRight: gap }}>
        <Dropdown label="บริษัท" icon={<I.Building size={20} />} w={w1} value="a" options={[{ value: "a", label: settings.company }]} onChange={() => {}} footer={{ label: "แก้ไขข้อมูลบริษัท…", onClick: () => nav("/settings?tab=company") }} />
        <Dropdown label="ช่วงเวลา" icon={<I.Calendar size={21} />} w={w2} value={horizon} onChange={(v) => setHorizon(v)} options={[30, 60, 90].map((d) => ({ value: d, label: `${d} วันข้างหน้า` }))} />
      </div>
      <button type="button" className="updated" title="คำนวณใหม่จากข้อมูลล่าสุด" onClick={() => { refresh(); toast("คำนวณใหม่จากข้อมูลล่าสุดแล้ว"); }}><span className="live" />อัปเดตล่าสุด {hhmm(loadedAt)}</button>
    </header>
  );
}

export function AlertBanner({ children, action = true, className = "" }: { children: ReactNode; action?: boolean; className?: string }) {
  return (
    <div className={"alert " + className} role="status">
      <span className="bang">!</span>
      <strong>{children}</strong>
      {action && (
        <NavLink to="/forecast" className="btn btn-sm">
          ดูรายละเอียด <I.ArrowRight size={16} />
        </NavLink>
      )}
    </div>
  );
}

/** Banner driven by the live forecast and the alert rules in Settings. */
export function LiveAlert({ className = "" }: { className?: string }) {
  const { fc, settings, meta, setFunding } = useApp();
  const stale = settings.rules.stale && Object.values(meta).some((m) => m.origin === "upload" && Date.now() - m.updatedAt > 24 * 3600e3);
  if (!settings.channels.inApp) return null;
  if (settings.rules.below && fc.breach && !fc.breach.earlyWarning)
    return (
      <div className={"alert " + className} role="status">
        <span className="bang">!</span>
        <strong>วันที่ {fc.breach.day} เงินสดอาจต่ำกว่าเกณฑ์ <em>{fmtM(fc.breach.shortfall)}</em></strong>
        {!className.includes("alert-in") && <button className="btn btn-sm btn-outline fund-btn" onClick={() => setFunding(true)}>จัดหาเงินทุน</button>}
        <NavLink to="/forecast" className="btn btn-sm">ดูรายละเอียด <I.ArrowRight size={16} /></NavLink>
      </div>
    );
  if (settings.rules.below && fc.breach?.earlyWarning)
    return <AlertBanner className={className}>เฝ้าระวัง: วันที่ {fc.breach.day} เงินสดอาจแตะเกณฑ์ (ช่วงความไม่แน่นอน)</AlertBanner>;
  if (stale) return <AlertBanner className={className}>ข้อมูลบางแหล่งไม่ได้อัปเดตเกิน 24 ชั่วโมง</AlertBanner>;
  return (
    <div className={"alert ok " + className} role="status">
      <span className="bang okb"><I.Check size={16} /></span>
      <strong>เงินสดสูงกว่าเกณฑ์ตลอด {fc.horizon} วัน (ต่ำสุด {fmtM(fc.trough.cash)} วันที่ {fc.trough.day})</strong>
      <NavLink to="/forecast" className="btn btn-sm">ดูรายละเอียด <I.ArrowRight size={16} /></NavLink>
    </div>
  );
}

export function Kpi({ icon, tone = "rose", label, value, unit, sub, info, className = "", onClick }: { icon: ReactNode; tone?: string; label: string; value: string; unit?: string; sub?: string; info?: string; className?: string; onClick?: () => void }) {
  return (
    <div className={"card kpi " + className + (onClick ? " click" : "")} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={(e) => onClick && e.key === "Enter" && onClick()}>
      <span className={"kpi-ico " + tone}>{icon}</span>
      <div className="kpi-body">
        <div className="kpi-label">{label}{info && <span onClick={(e) => e.stopPropagation()}><Popover w={280} trigger={<span className="i-mark"><I.Info size={17} /></span>}><div className="pop-b"><p style={{ margin: 0 }}>{info}</p></div></Popover></span>}</div>
        <div className="kpi-value">{value}{unit && <small>{unit}</small>}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

export function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={"pill " + tone}>{children}</span>;
}

export function InfoTip({ text, size = 17 }: { text: string; size?: number }) {
  return <Popover w={280} trigger={<span className="i-mark"><I.Info size={size} /></span>}><div className="pop-b"><p style={{ margin: 0 }}>{text}</p></div></Popover>;
}
