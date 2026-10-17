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
import "./styles.css";

function App() {
  const [state, setState] = useState<any>({ summary: null, market: null, sources: {} });
  const [err, setErr] = useState("");
  const load = useCallback(() => {
    Promise.all([get("/api/companies/NKI/summary"), get("/api/market"), get("/api/sources")])
      .then(([summary, market, sources]) => { setState({ summary, market, sources }); setErr(""); })
      .catch((e) => setErr(`เชื่อมต่อ backend ไม่ได้ที่ ${API} (${e.message}) — รัน uvicorn ก่อน`));
  }, []);
  useEffect(load, [load]);
  return (
    <DataCtx.Provider value={{ ...state, company: "NKI", reload: load }}>
      <BrowserRouter>
        <div className="app">
          <Sidebar />
          <main className="main">
            {err && <div className="banner critical" role="alert"><span className="bang">!</span><strong>{err}</strong></div>}
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/forecast" element={<Forecast />} />
              <Route path="/claims" element={<Claims />} />
              <Route path="/scenario" element={<Scenario />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </DataCtx.Provider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
