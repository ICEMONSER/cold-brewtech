import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "@fontsource/noto-sans-thai/300.css";
import "@fontsource/noto-sans-thai/400.css";
import "@fontsource/noto-sans-thai/500.css";
import "@fontsource/noto-sans-thai/600.css";
import "@fontsource/noto-sans-thai/700.css";
import "@fontsource/noto-sans-thai/800.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/crimson-pro/500.css";
import "./styles.css";
import { useEffect } from "react";
import { Sidebar } from "./components/Shell";
import { Toasts } from "./components/ui";
import { FundingWatcher } from "./components/Funding";
import { AppProvider, useApp } from "./store";
import Overview from "./pages/Overview";
import Forecast from "./pages/Forecast";
import Claims from "./pages/Claims";
import Scenario from "./pages/Scenario";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

/** Scheduled report: when the app is opened after the scheduled time, prepare the report and notify. */
function ScheduleWatcher() {
  const app = useApp();
  useEffect(() => {
    const s = app.settings.schedule;
    if (!s.enabled) return;
    const now = new Date();
    const [hh, mm] = s.time.split(":").map(Number);
    const due = new Date(now); due.setHours(hh, mm, 0, 0);
    due.setDate(due.getDate() - ((due.getDay() - s.weekday + 7) % 7));
    if (due > now) due.setDate(due.getDate() - 7);
    let last = 0; try { last = Number(localStorage.getItem("cbt.lastScheduled") ?? 0); } catch { /* ignore */ }
    if (last >= due.getTime()) return;
    try { localStorage.setItem("cbt.lastScheduled", String(Date.now())); } catch { /* ignore */ }
    const titles: Record<string, string> = { forecast: `พยากรณ์เงินสด ${app.horizon} วัน`, claims: "สรุปสินไหม", scenario: "วิเคราะห์สถานการณ์เคลม +10%", underwriting: "ผลการรับประกัน" };
    const r = app.addReport({ kind: s.report as any, title: `${titles[s.report]} (ตามกำหนด)`, desc: `รายงานตามกำหนดสำหรับ ${s.recipients}` });
    app.addSend({ t: Date.now(), report: r.title, to: s.recipients, channel: "ในระบบ", status: "พร้อมดาวน์โหลด" });
    app.toast("รายงานตามกำหนดพร้อมแล้วที่หน้ารายงาน");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function App() {
  return (
    <AppProvider>
    <ScheduleWatcher />
    <Toasts />
    <FundingWatcher />
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <div className="app">
        <Sidebar />
        <main className="main">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/claims" element={<Claims />} />
            <Route path="/scenario" element={<Scenario />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
    </AppProvider>
  );
}

/* Fit the 1586-px design to any screen width: scale the whole page proportionally. */
const DESIGN_W = 1586;
function fit() {
  const root = document.documentElement;
  root.style.zoom = "1";
  const w = root.clientWidth || window.innerWidth; // excludes the vertical scrollbar
  const z = Math.min(2.4, Math.max(0.5, w / DESIGN_W));
  root.style.zoom = String(z);
  root.style.setProperty("--z", String(z));
}
fit();
window.addEventListener("resize", fit);

createRoot(document.getElementById("root")!).render(<App />);
