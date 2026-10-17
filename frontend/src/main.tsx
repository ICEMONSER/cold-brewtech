import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { API, get } from "./api";
import { DataCtx, Sidebar } from "./components/ui";
import Claims from "./pages/Claims";
import Forecast from "./pages/Forecast";
import Overview from "./pages/Overview";
import Reports from "./pages/Reports";
import Scenario from "./pages/Scenario";
import Settings from "./pages/Settings";
import { DemoClaims, DemoForecast, DemoOverview, DemoReports, DemoScenario, DemoSettings } from "./pages/Demo";
import { DEFAULT_THRESHOLD } from "./demo";
import type { Mode } from "./components/ui";
import "./styles.css";

function App() {
  const [state, setState] = useState<any>({ summary: null, market: null, sources: {} });
  const [err, setErr] = useState("");
  const [mode, setModeState] = useState<Mode>(() => { try { return (localStorage.getItem("cbt-mode") as Mode) || "demo"; } catch { return "demo"; } });
  const setMode = (m: Mode) => { setModeState(m); try { localStorage.setItem("cbt-mode", m); } catch { /* storage unavailable */ } };
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const demo = mode === "demo";
  const load = useCallback(() => {
    Promise.all([get("/api/companies/NKI/summary"), get("/api/market"), get("/api/sources")])
      .then(([summary, market, sources]) => { setState({ summary, market, sources }); setErr(""); })
      .catch((e) => setErr(`เชื่อมต่อ backend ไม่ได้ที่ ${API} (${e.message}) — รัน uvicorn ก่อน`));
  }, []);
  useEffect(load, [load]);
  return (
    <DataCtx.Provider value={{ ...state, company: "NKI", reload: load, mode, setMode, threshold, setThreshold }}>
      <BrowserRouter>
        <div className="app">
          <Sidebar />
          <main className="main">
            {err && !demo && <div className="banner critical" role="alert"><span className="bang">!</span><strong>{err}</strong></div>}
            <Routes>
              <Route path="/" element={demo ? <DemoOverview /> : <Overview />} />
              <Route path="/forecast" element={demo ? <DemoForecast /> : <Forecast />} />
              <Route path="/claims" element={demo ? <DemoClaims /> : <Claims />} />
              <Route path="/scenario" element={demo ? <DemoScenario /> : <Scenario />} />
              <Route path="/reports" element={demo ? <DemoReports /> : <Reports />} />
              <Route path="/settings" element={demo ? <DemoSettings /> : <Settings />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </DataCtx.Provider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
