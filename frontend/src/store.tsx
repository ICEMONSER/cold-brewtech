/* App state: merged datasets (sample + uploaded), settings, history — persisted in the browser. */
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { forecast, type Forecast } from "./engine/forecast";
import { addDays, todayISO } from "./engine/format";
import type { Action } from "./engine/scenario";
import { sampleData } from "./engine/sample";
import type { Datasets, Ledger, SourceKey, SourceMeta } from "./engine/types";

export type Settings = {
  company: string; reserveM: number; leadDays: number;
  rules: { below: boolean; stale: boolean }; channels: { inApp: boolean; email: boolean }; email: string;
  apiKey: string; model: string; useClaude: boolean;
  schedule: { enabled: boolean; weekday: number; time: string; recipients: string; report: string };
  od: { limitM: number; usedM: number; rate: number }; banks: Bank[];
};
export type Audit = { t: number; action: string; user: string };
export type ReportItem = { id: string; kind: "forecast" | "claims" | "scenario" | "underwriting"; title: string; desc: string; createdAt: number; params?: any };
export type SavedScenario = { id: string; t: number; shock: number; delay: number; reserveM: number; closing: number; trough: number; troughDay: number; short: number };
export type ChatMsg = { id: string; role: "user" | "ai"; text: string; t: number; steps?: any; feedback?: 1 | -1 };
export type Bank = { bank: string; product: string; rate: number; fee: number; maxM: number };
export type Loan = { id: string; t: number; source: string; product: string; amount: number; rate: number; fee: number; drawDate: string; termDays: number; interest: number };
export const DEFAULT_BANKS: Bank[] = [
  { bank: "ธนาคารกรุงเทพ", product: "ตั๋วสัญญาใช้เงิน (P/N) ระยะสั้น", rate: 6.1, fee: 0.1, maxM: 800 },
  { bank: "ธนาคารกสิกรไทย", product: "เงินกู้ระยะสั้นธุรกิจ", rate: 6.25, fee: 0, maxM: 500 },
  { bank: "ธนาคารไทยพาณิชย์", product: "สินเชื่อหมุนเวียนระยะสั้น", rate: 5.95, fee: 0.25, maxM: 600 },
  { bank: "ธนาคารกรุงไทย", product: "P/N วงเงินหมุนเวียน", rate: 6.4, fee: 0, maxM: 1000 },
  { bank: "ธนาคารกรุงศรีอยุธยา", product: "เงินกู้ระยะสั้น", rate: 6.3, fee: 0.05, maxM: 300 },
];
/** What the funding popup is financing: the base plan, or the scenario being simulated. */
export type FundCtx = {
  key: string; kind: "base" | "scenario"; title: string; dockLabel: string;
  need: number; shortfall: number; troughCash: number; troughDay: number; drawDay: number; threshold: number;
  headline: { label: string; value: string; sub: string };
  sim: (extra: Ledger[]) => Forecast;
};
export type ScenarioReq = { shock: number; delay: number; reserveM: number; actions: Action[]; label: string; horizon: number };
export type SendLog = { t: number; report: string; to: string; channel: string; status: string };

const DEFAULT_SETTINGS: Settings = {
  company: "กรุงเทพประกันภัย", reserveM: 500, leadDays: 7, rules: { below: true, stale: true }, channels: { inApp: true, email: false }, email: "finance@company.co.th",
  apiKey: "", model: "claude-sonnet-5-5", useClaude: false,
  schedule: { enabled: false, weekday: 1, time: "09:00", recipients: "ทีม Finance", report: "forecast" },
  od: { limitM: 300, usedM: 250, rate: 7.25 }, banks: DEFAULT_BANKS,
};

/* Data version: when the sample basis changes (now BKI FY2024), reset values tied to the old scale. */
const DATA_VERSION = "bki-2024";
try {
  if (localStorage.getItem("cbt.dataVersion") !== DATA_VERSION) {
    ["cbt.loans", "cbt.chat", "cbt.scenarios", "cbt.audit"].forEach((k) => localStorage.removeItem(k));
    const st = JSON.parse(localStorage.getItem("cbt.settings") ?? "null");
    if (st) { delete st.company; delete st.reserveM; delete st.od; delete st.banks; localStorage.setItem("cbt.settings", JSON.stringify(st)); }
    localStorage.setItem("cbt.dataVersion", DATA_VERSION);
  }
} catch { /* storage unavailable */ }

const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? { ...d, ...JSON.parse(v) } : d; } catch { return d; } };
const loadArr = <T,>(k: string, d: T[]): T[] => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

type Ctx = {
  today: string; ds: Datasets; meta: Record<SourceKey, SourceMeta>; fc: Forecast; horizon: number; setHorizon: (h: number) => void;
  threshold: number; settings: Settings; saveSettings: (s: Partial<Settings>, auditMsg?: string) => void;
  upload: (k: SourceKey, rows: any[], fileName: string) => boolean; resetSource: (k: SourceKey) => void; refresh: () => void; loadedAt: number;
  audit: Audit[]; log: (a: string) => void;
  reports: ReportItem[]; addReport: (r: Omit<ReportItem, "id" | "createdAt">) => ReportItem; removeReport: (id: string) => void;
  scenarios: SavedScenario[]; saveScenario: (s: Omit<SavedScenario, "id" | "t">) => void;
  loans: Loan[]; addLoan: (l: Omit<Loan, "id" | "t">) => void; cancelLoan: (id: string) => void; baseDs: Datasets;
  funding: boolean; setFunding: (v: boolean) => void;
  scenarioReq: ScenarioReq | null; setScenarioReq: (c: ScenarioReq | null) => void;
  chat: ChatMsg[]; setChat: (f: (m: ChatMsg[]) => ChatMsg[]) => void;
  sends: SendLog[]; addSend: (s: SendLog) => void;
  toast: (msg: string) => void; toasts: { id: number; msg: string }[];
  pendingScenario: { shock?: number; delay?: number } | null; setPendingScenario: (p: { shock?: number; delay?: number } | null) => void;
};
const C = createContext<Ctx>(null as any);
export const useApp = () => useContext(C);

export const DEFAULT_REPORTS: ReportItem[] = [
  { id: "r-forecast", kind: "forecast", title: "พยากรณ์เงินสด 30 วัน", desc: "ประมาณการกระแสเงินสดและสภาพคล่อง", createdAt: 0 },
  { id: "r-claims", kind: "claims", title: "สรุปสินไหม", desc: "สินไหมที่เกิดขึ้น (Incurred) และการจ่ายเงินสด", createdAt: -1 },
  { id: "r-scenario", kind: "scenario", title: "วิเคราะห์สถานการณ์เคลม +10%", desc: "ผลกระทบต่อเงินสดและสภาพคล่อง", createdAt: -20, params: { shock: 10, delay: 0 } },
  { id: "r-uw", kind: "underwriting", title: "ผลการรับประกัน", desc: "เบี้ยประกัน รายจ่าย และอัตราส่วนรวม", createdAt: -1.5 },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [today, setToday] = useState(todayISO);
  const [loadedAt, setLoadedAt] = useState(() => Date.now());
  const sample = useMemo(() => sampleData(today), [today]);
  const [uploads, setUploads] = useState<Partial<Datasets>>(() => loadArr("cbt.uploads", {} as any) as any);
  const [uploadMeta, setUploadMeta] = useState<Partial<Record<SourceKey, SourceMeta>>>(() => load("cbt.uploadMeta", {}));
  const [settings, setSettings] = useState<Settings>(() => { const s = load("cbt.settings", DEFAULT_SETTINGS); return { ...DEFAULT_SETTINGS, ...s, od: { ...DEFAULT_SETTINGS.od, ...s.od }, banks: s.banks?.length ? s.banks : DEFAULT_BANKS, rules: { ...DEFAULT_SETTINGS.rules, ...s.rules }, channels: { ...DEFAULT_SETTINGS.channels, ...s.channels }, schedule: { ...DEFAULT_SETTINGS.schedule, ...s.schedule } }; });
  const [horizon, setH] = useState<number>(() => load("cbt.view", { horizon: 30 }).horizon);
  const [audit, setAudit] = useState<Audit[]>(() => loadArr("cbt.audit", [{ t: Date.UTC(2024, 10, 5, 3, 24), action: "แก้ไขเกณฑ์สภาพคล่องขั้นต่ำ\nจาก 400 เป็น 500 ล้านบาท", user: "Finance Admin" }]));
  const [created, setCreated] = useState<ReportItem[]>(() => loadArr("cbt.reports", []));
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => loadArr("cbt.scenarios", []));
  const [chat, setChatState] = useState<ChatMsg[]>(() => loadArr("cbt.chat", []));
  const [loans, setLoans] = useState<Loan[]>(() => loadArr("cbt.loans", []));
  const [funding, setFunding] = useState(false);
  const [scenarioReq, setScenarioReqS] = useState<ScenarioReq | null>(() => { try { return JSON.parse(localStorage.getItem("cbt.scenarioReq") ?? "null"); } catch { return null; } });
  const setScenarioReq = (c: ScenarioReq | null) => { setScenarioReqS(c); try { c ? localStorage.setItem("cbt.scenarioReq", JSON.stringify(c)) : localStorage.removeItem("cbt.scenarioReq"); } catch { /* ignore */ } };
  const [sends, setSends] = useState<SendLog[]>(() => loadArr("cbt.sends", []));
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [pendingScenario, setPendingScenario] = useState<{ shock?: number; delay?: number } | null>(null);
  const tid = useRef(0);

  const toast = useCallback((msg: string) => {
    const id = ++tid.current;
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  const log = useCallback((action: string) => setAudit((a) => { const n = [{ t: Date.now(), action, user: "Finance Admin" }, ...a].slice(0, 100); save("cbt.audit", n); return n; }), []);

  const baseDs: Datasets = useMemo(() => ({
    policies: uploads.policies ?? sample.policies, claims: uploads.claims ?? sample.claims, reserves: uploads.reserves ?? sample.reserves,
    payments: uploads.payments ?? sample.payments, ledger: uploads.ledger ?? sample.ledger,
  }), [uploads, sample]);
  // approved loans: drawdown (receipt) and repayment of principal + interest (payment)
  const ds: Datasets = useMemo(() => loans.length ? {
    ...baseDs,
    ledger: [...baseDs.ledger, ...loans.flatMap((l) => [
      { date: l.drawDate, type: "other_receipt" as const, amount: l.amount * (1 - l.fee / 100), status: "expected" as const, description: `เบิกเงินกู้ ${l.source}` },
      { date: addDays(l.drawDate, l.termDays), type: "other_payment" as const, amount: l.amount + l.interest, status: "expected" as const, description: `ชำระคืนเงินกู้ ${l.source}` },
    ])],
  } : baseDs, [baseDs, loans]);
  const meta = useMemo(() => {
    const m = {} as Record<SourceKey, SourceMeta>;
    (["policies", "claims", "reserves", "payments", "ledger"] as SourceKey[]).forEach((k) => {
      m[k] = uploads[k] ? uploadMeta[k] ?? { origin: "upload", updatedAt: Date.now(), rows: (uploads[k] as any[]).length } : { origin: "sample", updatedAt: loadedAt, rows: (sample[k] as any[]).length };
    });
    return m;
  }, [uploads, uploadMeta, sample, loadedAt]);

  const threshold = settings.reserveM * 1e6;
  const fc = useMemo(() => forecast(ds, { horizon, today, threshold }), [ds, horizon, today, threshold]);

  // keep "today" fresh if the tab stays open past midnight
  useEffect(() => { const t = setInterval(() => { const n = todayISO(); if (n !== today) setToday(n); }, 60000); return () => clearInterval(t); }, [today]);

  const ctx: Ctx = {
    today, ds, meta, fc, horizon, threshold, settings, loadedAt, audit, log, scenarios, chat, sends, toast, toasts, pendingScenario, setPendingScenario,
    setHorizon: (h) => { setH(h); save("cbt.view", { horizon: h }); },
    saveSettings: (s, msg) => setSettings((cur) => { const n = { ...cur, ...s }; save("cbt.settings", n); if (msg) log(msg); return n; }),
    upload: (k, rows, fileName) => {
      const nu = { ...uploads, [k]: rows }, nm = { ...uploadMeta, [k]: { origin: "upload" as const, fileName, updatedAt: Date.now(), rows: rows.length } };
      setUploads(nu); setUploadMeta(nm);
      const ok = save("cbt.uploads", nu) && save("cbt.uploadMeta", nm);
      log(`นำเข้าข้อมูล ${fileName} (${rows.length.toLocaleString()} แถว)`);
      return ok;
    },
    resetSource: (k) => {
      const nu = { ...uploads }; delete nu[k]; const nm = { ...uploadMeta }; delete nm[k];
      setUploads(nu); setUploadMeta(nm); save("cbt.uploads", nu); save("cbt.uploadMeta", nm);
      log(`กลับไปใช้ข้อมูลตัวอย่างสำหรับ ${k}`);
    },
    refresh: () => { setToday(todayISO()); setLoadedAt(Date.now()); },
    reports: [...created, ...DEFAULT_REPORTS],
    addReport: (r) => { const item = { ...r, id: `r-${Date.now()}`, createdAt: Date.now() }; setCreated((c) => { const n = [item, ...c]; save("cbt.reports", n); return n; }); return item; },
    removeReport: (id) => setCreated((c) => { const n = c.filter((x) => x.id !== id); save("cbt.reports", n); return n; }),
    loans, baseDs, funding, setFunding, scenarioReq, setScenarioReq,
    addLoan: (l) => setLoans((c) => { const n = [...c, { ...l, id: `l-${Date.now()}`, t: Date.now() }]; save("cbt.loans", n); return n; }),
    cancelLoan: (id) => setLoans((c) => { const n = c.filter((x) => x.id !== id); save("cbt.loans", n); return n; }),
    saveScenario: (s) => setScenarios((c) => { const n = [{ ...s, id: `s-${Date.now()}`, t: Date.now() }, ...c].slice(0, 50); save("cbt.scenarios", n); return n; }),
    setChat: (f) => setChatState((c) => { const n = f(c).slice(-60); save("cbt.chat", n); return n; }),
    addSend: (s) => setSends((c) => { const n = [s, ...c].slice(0, 100); save("cbt.sends", n); return n; }),
  };
  return <C.Provider value={ctx}>{children}</C.Provider>;
}
