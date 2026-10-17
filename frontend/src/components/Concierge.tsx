/* AI Concierge chat: Retrieve → Reason → Act, grounded in the connected data. */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { answer, askClaude, type Act, type Answer } from "../engine/concierge";
import { useApp, type ChatMsg } from "../store";
import * as I from "./icons";
import { InfoTip } from "./Shell";

export const SUGGESTIONS = ["มีวิธีเพิ่มสภาพคล่องอะไรบ้าง?", "ถ้าเลื่อนจ่ายเคลมบางรายการได้หรือไม่?", "ความเสี่ยงหลักที่ทำให้เงินสดต่ำกว่าเกณฑ์คืออะไร?"];
const FIRST_Q = "เดือนนี้ต้องเตรียมเงินเพิ่มเท่าไร?";

export function useConcierge() {
  const app = useApp();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const ask = async (q: string) => {
    if (!q.trim() || busy) return;
    const u: ChatMsg = { id: `u${Date.now()}`, role: "user", text: q.trim(), t: Date.now() };
    const a = answer(q, { ds: app.ds, today: app.today, threshold: app.threshold, horizon: app.horizon });
    let text = a.text, mode = "local";
    app.setChat((m) => [...m, u]);
    if (app.settings.useClaude && app.settings.apiKey) {
      setBusy(true);
      try { text = await askClaude(q, a, app.chat.map((m) => ({ role: m.role, text: m.text })), app.settings.apiKey, app.settings.model, app.settings.company); mode = "claude"; }
      catch (e: any) { app.toast(`เรียก Claude ไม่สำเร็จ ใช้คำตอบจากระบบแทน (${String(e.message).slice(0, 60)})`); }
      setBusy(false);
    }
    app.setChat((m) => [...m, { id: `a${Date.now()}`, role: "ai", text, t: Date.now(), steps: { ...a.steps, sources: a.sources, mode } }]);
  };
  const act = (x: Act) => {
    if (x.kind === "nav" && x.to) nav(x.to);
    if (x.kind === "scenario") { app.setPendingScenario({ shock: x.shock ?? 0, delay: x.delay ?? 0 }); nav("/scenario"); }
    if (x.kind === "report") {
      const kind = (x.report ?? "forecast") as any;
      const titles: Record<string, string> = { forecast: `พยากรณ์เงินสด ${app.horizon} วัน`, scenario: `วิเคราะห์สถานการณ์เคลม ${(x.shock ?? 10) >= 0 ? "+" : ""}${x.shock ?? 10}%`, underwriting: "ผลการรับประกัน", claims: "สรุปสินไหม" };
      const r = app.addReport({ kind, title: titles[kind], desc: "สร้างโดย AI Concierge", params: { shock: x.shock ?? 10, delay: 0, horizon: app.horizon } });
      app.toast("สร้างรายงานแล้ว"); nav(`/reports?id=${r.id}`);
    }
  };
  return { ask, act, busy };
}

function AnswerBody({ m, onAct, compact }: { m: ChatMsg; onAct: (a: Act) => void; compact?: boolean }) {
  const { setChat, toast } = useApp();
  const [open, setOpen] = useState(false);
  const st = m.steps as (Answer["steps"] & { sources: Answer["sources"]; mode: string }) | undefined;
  const fb = (v: 1 | -1) => { setChat((all) => all.map((x) => (x.id === m.id ? { ...x, feedback: x.feedback === v ? undefined : v } : x))); toast(v === 1 ? "ขอบคุณสำหรับคำติชม" : "บันทึกคำติชมแล้ว เราจะนำไปปรับปรุง"); };
  return (
    <div className="bubble-a">
      <p>{m.text}</p>
      {st && (
        <>
          <hr />
          <div className="src-h">แหล่งข้อมูล{st.mode === "claude" && <span className="mode">· เรียบเรียงโดย Claude</span>}</div>
          <div className="src"><I.Doc size={18} />{st.sources.length ? st.sources.map((s, i) => <span key={s.label} className="src-i">{i > 0 && <span className="sep">•</span>}<Link to={s.to}>{s.label}</Link></span>) : <span className="muted">—</span>}</div>
          {!compact && (st.act.length > 0 || st.reason.length > 0) && (
            <>
              <button className="steps-t" onClick={() => setOpen(!open)}>{open ? "ซ่อน" : "ดู"}ขั้นตอน Retrieve → Reason → Act <I.Chevron size={14} /></button>
              {open && (
                <div className="steps">
                  {st.retrieve.length > 0 && <div><b>Retrieve</b><ul>{st.retrieve.map((r, i) => <li key={i}><em>{r.source}</em> — {r.detail}</li>)}</ul></div>}
                  <div><b>Reason</b><ul>{st.reason.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
                </div>
              )}
              {st.act.length > 0 && <div className="acts">{st.act.map((a) => <button key={a.label} className="act" onClick={() => onAct(a)}>{a.label}</button>)}</div>}
            </>
          )}
          <div className="fb">
            <button aria-label="มีประโยชน์" className={m.feedback === 1 ? "on" : ""} onClick={() => fb(1)}><I.ThumbUp /></button>
            <button aria-label="ไม่มีประโยชน์" className={m.feedback === -1 ? "on" : ""} onClick={() => fb(-1)}><I.ThumbDown /></button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ConciergePanel() {
  const app = useApp();
  const { ask, act, busy } = useConcierge();
  const [q, setQ] = useState("");
  const thread = useRef<HTMLDivElement>(null);
  // Seed the conversation with the reference question, answered from live data.
  useEffect(() => { if (!app.chat.length) ask(FIRST_Q); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // keep the latest question at the top of the thread
  useEffect(() => {
    const el = thread.current; if (!el) return;
    const qs = el.querySelectorAll(".cg-q");
    const last = qs[qs.length - 1] as HTMLElement | undefined;
    el.scrollTo({ top: last ? last.offsetTop - el.offsetTop - 8 : 0, behavior: "smooth" });
  }, [app.chat.length, busy]);
  const clear = () => { app.setChat(() => []); setTimeout(() => ask(FIRST_Q), 0); };
  return (
    <>
      <div className="cg-head">
        <I.Sparkle size={32} /><h2>AI Concierge</h2><span className="beta">Beta</span>
        {app.chat.length > 2 && <button className="cg-clear" onClick={clear} title="เริ่มบทสนทนาใหม่">ล้างแชท</button>}
      </div>
      <div className="cg-thread" ref={thread}>
        {app.chat.map((m) => m.role === "user"
          ? <div key={m.id} className="cg-q"><span className="who"><I.User size={24} /></span><div className="bubble-q">{m.text}</div></div>
          : <div key={m.id} className="cg-a"><span className="cg-avatar"><I.Leaf size={20} /></span><AnswerBody m={m} onAct={act} /></div>)}
        {busy && <div className="cg-a"><span className="cg-avatar"><I.Leaf size={20} /></span><div className="bubble-a"><p className="typing">กำลังวิเคราะห์ข้อมูล…</p></div></div>}
      </div>
      <div className="sugg">
        {SUGGESTIONS.map((s) => <button key={s} onClick={() => ask(s)} disabled={busy}>{s}<I.ChevronRight size={18} /></button>)}
      </div>
      <form className="ask" onSubmit={(e) => { e.preventDefault(); ask(q); setQ(""); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ถามเกี่ยวกับกระแสเงินสด..." aria-label="ถามเกี่ยวกับกระแสเงินสด" />
        <button aria-label="ส่ง" disabled={busy}><I.Send size={20} /></button>
      </form>
    </>
  );
}

export function WhatIf() {
  const app = useApp();
  const nav = useNavigate();
  const STOPS = [{ v: 0, at: 5 }, { v: 5, at: 66 }, { v: 10, at: 126 }, { v: 20, at: 232 }, { v: 30, at: 328 }];
  const [i, setI] = useState(2);
  return (
    <div className="whatif">
      <div className="whatif-head">
        <span className="ico"><I.Bars4 size={22} /></span>
        <b>หากยอดเคลมเพิ่มขึ้น</b>
        <InfoTip size={18} text="ปรับยอดจ่ายเคลมทุกรายการตามเปอร์เซ็นต์ที่เลือก แล้วดูผลกระทบต่อเงินสดในหน้าจำลองสถานการณ์" />
        <span className="pct">{STOPS[i].v}%</span>
      </div>
      <div style={{ padding: "16px 6px 0" }}>
        <div className="slider" style={{ width: 338 }}>
          <div className="track" /><div className="fill" style={{ width: STOPS[i].at }} /><div className="knob" style={{ left: STOPS[i].at }} />
          <input type="range" min={0} max={4} value={i} onChange={(e) => setI(+e.target.value)} aria-label="ยอดเคลมเพิ่มขึ้น" />
        </div>
        <div className="ticks" style={{ marginTop: 4, width: 338 }}>{STOPS.map((s, k) => <span key={s.v} style={{ left: s.at, cursor: "pointer" }} onClick={() => setI(k)}>{s.v}%</span>)}</div>
      </div>
      <button className="btn" style={{ width: "100%", height: 42, marginTop: 23 }} onClick={() => { app.setPendingScenario({ shock: STOPS[i].v, delay: 0 }); nav("/scenario"); }}>จำลองผลกระทบ</button>
    </div>
  );
}
