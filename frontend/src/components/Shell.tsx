import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
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
          <div className="brand-name">Cold BrewTech</div>
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

export function Select({ icon, children, w, className = "" }: { icon?: ReactNode; children: ReactNode; w?: number; className?: string }) {
  return (
    <button type="button" className={"select " + className} style={w ? { width: w } : undefined}>
      {icon && <span className="sel-ico">{icon}</span>}
      <span className="sel-txt">{children}</span>
      <span className="sel-chev"><I.Chevron /></span>
    </button>
  );
}

export function SampleChip({ small }: { small?: boolean }) {
  return (
    <span className={"chip" + (small ? " sm" : "")}>
      ข้อมูลสมมติ <I.Info size={small ? 13 : 17} />
    </span>
  );
}

export function PageHeader({ title, selects, gap = 105 }: { title: string; selects?: [number, number]; gap?: number }) {
  const [w1, w2] = selects ?? [208, 220];
  return (
    <header className="page-head">
      <h1>{title}</h1>
      <SampleChip />
      <div className="head-selects" style={{ marginRight: gap }}>
        <Select icon={<I.Building size={20} />} w={w1}>บริษัทประกัน A</Select>
        <Select icon={<I.Calendar size={21} />} w={w2}>30 วันข้างหน้า</Select>
      </div>
      <div className="updated"><span className="live" />อัปเดตล่าสุด 09:00</div>
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

export function Kpi({ icon, tone = "rose", label, value, unit, sub, info, className = "" }: { icon: ReactNode; tone?: string; label: string; value: string; unit?: string; sub?: string; info?: boolean; className?: string }) {
  return (
    <div className={"card kpi " + className}>
      <span className={"kpi-ico " + tone}>{icon}</span>
      <div className="kpi-body">
        <div className="kpi-label">{label}{info && <span className="i-mark"><I.Info size={17} /></span>}</div>
        <div className="kpi-value">{value}{unit && <small>{unit}</small>}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

export function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={"pill " + tone}>{children}</span>;
}
