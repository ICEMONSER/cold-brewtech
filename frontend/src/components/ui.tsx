/* Interactive primitives: dropdown select, kebab/action menus, modal, toasts, popover. */
import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../store";
import * as I from "./icons";

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", h); document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [open, close]);
  return ref;
}

export type Opt<T> = { value: T; label: string };
export function Dropdown<T extends string | number>({ value, options, onChange, icon, w, className = "", label, footer }: { value: T; options: Opt<T>[]; onChange: (v: T) => void; icon?: ReactNode; w?: number; className?: string; label?: string; footer?: { label: string; onClick: () => void } }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const cur = options.find((o) => o.value === value);
  return (
    <div className="dd" ref={ref} style={w ? { width: w } : undefined}>
      <button type="button" className={"select " + className} style={{ width: "100%" }} aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen(!open)}>
        {icon && <span className="sel-ico">{icon}</span>}
        <span className="sel-txt">{cur?.label ?? String(value)}</span>
        <span className="sel-chev" style={{ transform: open ? "rotate(180deg)" : undefined }}><I.Chevron /></span>
      </button>
      {open && (
        <div className="dd-menu" role="listbox">
          {options.map((o) => (
            <button key={String(o.value)} type="button" role="option" aria-selected={o.value === value} className={"dd-item" + (o.value === value ? " on" : "")} onClick={() => { onChange(o.value); setOpen(false); }}>
              {o.label}{o.value === value && <I.Check size={14} />}
            </button>
          ))}
          {footer && <button type="button" className="dd-item foot" onClick={() => { setOpen(false); footer.onClick(); }}>{footer.label}</button>}
        </div>
      )}
    </div>
  );
}

export type MenuItem = { label: string; onClick: () => void; danger?: boolean; icon?: ReactNode };
export function Menu({ items, trigger, align = "right", label = "เพิ่มเติม" }: { items: MenuItem[]; trigger?: ReactNode; align?: "left" | "right"; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  return (
    <div className="dd inline" ref={ref} onClick={(e) => e.stopPropagation()}>
      {trigger ? <span onClick={() => setOpen(!open)}>{trigger}</span> : <button type="button" className="dots" aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)}><I.Dots size={18} /></button>}
      {open && (
        <div className={"dd-menu menu " + align} role="menu">
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" className={"dd-item" + (it.danger ? " danger" : "")} onClick={() => { setOpen(false); it.onClick(); }}>
              {it.icon}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, [onClose]);
  return createPortal(
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={"modal" + (wide ? " wide" : "")} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-h"><h3>{title}</h3><button className="x" aria-label="ปิด" onClick={onClose}>×</button></div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Toasts() {
  const { toasts } = useApp();
  return createPortal(<div className="toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className="toast"><I.Check size={15} />{t.msg}</div>)}</div>, document.body);
}

export function Popover({ trigger, children, w = 320 }: { trigger: ReactNode; children: ReactNode; w?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  return (
    <span className="dd inline" ref={ref}>
      <span role="button" tabIndex={0} style={{ cursor: "pointer", display: "inline-flex" }} onClick={() => setOpen(!open)} onKeyDown={(e) => e.key === "Enter" && setOpen(!open)}>{trigger}</span>
      {open && <div className="dd-menu pop" style={{ width: w }}>{children}</div>}
    </span>
  );
}

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="mfield"><span>{label}</span>{children}</label>
);
