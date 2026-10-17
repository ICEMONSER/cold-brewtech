/* Data-driven cash chart: line + uncertainty band, threshold, labels, breach callout, hover tooltip. */
import { useState } from "react";
import type { DayPoint } from "../engine/forecast";
import { fmtM, thaiDate } from "../engine/format";

type S = { pts: DayPoint[]; color: string; band: string; bandOpacity?: number; dashFrom?: number; dashed?: boolean };
type Props = {
  w: number; h: number; x0: number; x1: number; yTop: number; yZero: number; yTickX: number; xTickY: number;
  series: S[]; threshold: number; tickSize?: number; labelSize?: number; thresholdLabel?: string;
  history?: { day: number; cash: number }[];
  callout?: "breach" | "scenario" | "none"; compact?: boolean;
};

function path(p: [number, number][]) {
  if (p.length < 2) return "";
  const n = p.length, dx: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx.push(p[i + 1][0] - p[i][0]); m.push((p[i + 1][1] - p[i][1]) / dx[i]); }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]));
  t.push(m[n - 2]);
  let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) { const h = dx[i] / 3; d += ` C${(p[i][0] + h).toFixed(1)},${(p[i][1] + t[i] * h).toFixed(1)} ${(p[i + 1][0] - h).toFixed(1)},${(p[i + 1][1] - t[i + 1] * h).toFixed(1)} ${p[i + 1][0].toFixed(1)},${p[i + 1][1].toFixed(1)}`; }
  return d;
}

export default function LiveChart(pr: Props) {
  const main = pr.series[0].pts;
  const H = main.length;
  const dMin = pr.history?.length ? pr.history[0].day : 1;
  const X = (d: number) => pr.x0 + ((d - dMin) / (H - dMin)) * (pr.x1 - pr.x0);
  const allHigh = Math.max(...pr.series.flatMap((s) => s.pts.map((p) => p.high)), ...(pr.history ?? []).map((p) => p.cash), pr.threshold);
  const allLow = Math.min(...pr.series.flatMap((s) => s.pts.map((p) => p.low)), 0);
  const step = Math.max(40e6, Math.ceil(allHigh / 4 / 40e6) * 40e6);
  const yMax = step * 4;
  const yMin = allLow < 0 ? -step : 0;
  const Y = (v: number) => pr.yZero - ((v - 0) / yMax) * (pr.yZero - pr.yTop);
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step).concat(yMin < 0 ? [yMin] : []);
  const ts = pr.tickSize ?? 14, ls = pr.labelSize ?? 14;
  const left = pr.x0 - 14, right = pr.x1 + 18;
  const every = Math.max(1, Math.round(H / 12));
  const xt = H <= 30 ? [1, 10, 20, H] : H <= 60 ? [1, 15, 30, 45, H] : [1, 30, 60, H];
  const xTicks = pr.history?.length ? [{ d: dMin, l: `${-dMin + 1} วันก่อน` }, { d: 1, l: "วันนี้" }, ...xt.slice(1).map((d) => ({ d, l: `วันที่ ${d}` }))] : xt.map((d) => ({ d, l: `วันที่ ${d}` }));
  const [hover, setHover] = useState<number | null>(null);

  const s0 = pr.series[0];
  const trough = main.reduce((m, p) => (p.cash < m.cash ? p : m), main[0]);
  const last = main[H - 1];
  const breach = trough.cash < pr.threshold;

  const band = (s: S) => {
    const up = s.pts.map((p) => [X(p.day), Y(p.high)] as [number, number]);
    const lo = s.pts.map((p) => [X(p.day), Y(p.low)] as [number, number]).reverse();
    return path(up) + " L" + lo.map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" L") + " Z";
  };
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * pr.w;
    const d = Math.round(dMin + ((x - pr.x0) / (pr.x1 - pr.x0)) * (H - dMin));
    setHover(d >= 1 && d <= H ? d : null);
  };
  const hp = hover ? main[hover - 1] : null;
  const s1p = hover && pr.series[1] ? pr.series[1].pts[hover - 1] : null;

  // callout box above trough
  const cw = pr.compact ? 112 : 124, ch = pr.compact ? 42 : 46;
  const tx = X(trough.day), ty = Y(trough.cash);
  const cx = Math.min(Math.max(tx - cw / 2, pr.x0), pr.x1 - cw), cy = ty - ch - 22;

  // --- label placement without collisions (callout, start/end values, threshold label) ---
  type Box = { l: number; t: number; r: number; b: number };
  const hit = (p: Box, q: Box) => p.l < q.r && q.l < p.r && p.t < q.b && q.t < p.b;
  const tw = (t: string, size = ls) => t.length * size * 0.56;
  const calloutBox: Box | null = pr.callout !== "none" && pr.callout !== "scenario" ? { l: cx - 4, t: cy - 4, r: cx + cw + 4, b: ty } : null;
  const startTxt = fmtM(main[0].cash);
  let startY = Y(main[0].cash) - 24;
  const startBox = (y: number): Box => ({ l: X(1) + 4, t: y - ls, r: X(1) + 4 + tw(startTxt), b: y + 3 });
  if (calloutBox && hit(startBox(startY), calloutBox)) startY = Y(main[0].cash) + 26;
  const endTxt = fmtM(last.cash);
  const endBox: Box = { l: Math.min(X(H) + 20, pr.w - 2) - tw(endTxt), t: Y(last.cash) - 18 - ls, r: Math.min(X(H) + 20, pr.w - 2), b: Y(last.cash) - 15 };
  const thrTxt = pr.thresholdLabel ?? `เกณฑ์เงินสำรองขั้นต่ำ ${fmtM(pr.threshold)}`;
  const thrW = tw(thrTxt);
  const thrCands = [
    { x: X(dMin) + 2, y: Y(pr.threshold) - 8, anchor: "start" as const },
    { x: X(H) - 4, y: Y(pr.threshold) - 8, anchor: "end" as const },
    { x: X(dMin) + 2, y: Y(pr.threshold) + ls + 6, anchor: "start" as const },
    { x: X(H) - 4, y: Y(pr.threshold) + ls + 6, anchor: "end" as const },
  ];
  const thrBox = (c: typeof thrCands[number]): Box => ({ l: c.anchor === "start" ? c.x : c.x - thrW, t: c.y - ls, r: c.anchor === "start" ? c.x + thrW : c.x, b: c.y + 3 });
  const blockers = [calloutBox, startBox(startY), endBox].filter(Boolean) as Box[];
  const thr = thrCands.find((c) => !blockers.some((bx) => hit(thrBox(c), bx))) ?? thrCands[0];

  return (
    <svg className="chart" viewBox={`0 0 ${pr.w} ${pr.h}`} width={pr.w} height={pr.h} role="img" aria-label="กราฟคาดการณ์เงินสด" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={left} x2={right} y1={Y(t)} y2={Y(t)} stroke={t === 0 ? "#cfd2d7" : "#eceef1"} />
          <text x={pr.yTickX} y={Y(t) + 5} textAnchor="end" className="tick" fontSize={ts}>{Math.round(t / 1e6)}</text>
        </g>
      ))}
      <line x1={left} x2={left} y1={pr.yTop - 4} y2={pr.yZero} stroke="#e3e5e9" />
      {xTicks.map((t) => <line key={"v" + t.d} x1={X(t.d)} x2={X(t.d)} y1={pr.yTop} y2={pr.yZero + 6} stroke="#f0f1f3" />)}
      {xTicks.map((t, i) => <text key={"t" + t.d} x={X(t.d)} y={pr.xTickY} textAnchor={i === xTicks.length - 1 && X(t.d) > pr.x1 - 10 ? "middle" : "middle"} className="tick" fontSize={ts}>{t.l}</text>)}
      {/* days below the threshold: red shading + status strip (green = above, red = below) */}
      {main.map((p, i) => {
        const below = pr.series.some((s) => s.pts[i] && s.pts[i].cash < pr.threshold);
        const x0 = X(Math.max(1, p.day - 0.5)), x1 = X(Math.min(H, p.day + 0.5));
        return (
          <g key={"z" + p.day}>
            {below && <rect x={x0} y={pr.yTop} width={x1 - x0} height={pr.yZero - pr.yTop} fill="#e5484d" opacity=".09" />}
            <rect x={x0} y={pr.yZero + 3} width={x1 - x0 + 0.3} height="6" fill={below ? "#d93a3a" : "#3fb37f"}><title>{`วันที่ ${p.day}: ${below ? "ต่ำกว่าเกณฑ์" : "สูงกว่าเกณฑ์"}`}</title></rect>
          </g>
        );
      })}
      {pr.series.map((s, i) => <path key={"b" + i} d={band(s)} fill={s.band} opacity={s.bandOpacity ?? 1} />)}
      <line x1={left} x2={right} y1={Y(pr.threshold)} y2={Y(pr.threshold)} stroke="#6b7180" strokeWidth="1.1" strokeDasharray="5 4" />
      <text x={thr.x} y={thr.y} textAnchor={thr.anchor} fontSize={ls} fill="#2b2f38" paintOrder="stroke" stroke="#fff" strokeWidth={3}>{thrTxt}</text>
      {pr.history && <path d={path(pr.history.map((p) => [X(p.day), Y(p.cash)]))} fill="none" stroke={s0.color} strokeWidth="2.3" />}
      {pr.series.map((s, i) => {
        const px = s.pts.map((p) => [X(p.day), Y(p.cash)] as [number, number]);
        if (s.dashFrom) {
          const k = s.pts.findIndex((p) => p.day >= s.dashFrom!);
          return <g key={"l" + i}><path d={path(px.slice(0, k + 1))} fill="none" stroke={s.color} strokeWidth="2.2" /><path d={path(px.slice(k))} fill="none" stroke={s.color} strokeWidth="2.2" strokeDasharray="7 5" /></g>;
        }
        return <path key={"l" + i} d={path(px)} fill="none" stroke={s.color} strokeWidth="2.2" strokeDasharray={s.dashed ? "7 5" : undefined} />;
      })}
      {pr.history?.filter((_, i) => i % 2 === 0).map((p) => <circle key={"h" + p.day} cx={X(p.day)} cy={Y(p.cash)} r={3.4} fill={s0.color} />)}
      {pr.series.map((s, i) => {
        const tr = s.pts.reduce((m, p) => (p.cash < m.cash ? p : m), s.pts[0]);
        return (
          <g key={"d" + i}>
            {s.pts.map((p) => {
              const big = p.day === 1 || p.day === H || p.day === tr.day;
              if (!big && (p.day - 1) % every !== 0) return null;
              return <circle key={p.day} cx={X(p.day)} cy={Y(p.cash)} r={big ? 6 : 3.4} fill={s.color} stroke={big ? "#fff" : "none"} strokeWidth={big ? 2 : 0} />;
            })}
          </g>
        );
      })}
      <text x={X(1) + 4} y={startY} fontSize={ls} fontWeight={700} fill="#16181d" paintOrder="stroke" stroke="#fff" strokeWidth={3}>{startTxt}</text>
      <text x={Math.min(X(H) + 20, pr.w - 2)} y={Y(last.cash) - 18} fontSize={ls} fontWeight={700} fill="#16181d" textAnchor="end">{fmtM(last.cash)}</text>
      {pr.series[1] && (() => { const l2 = pr.series[1].pts[H - 1]; return <text x={Math.min(X(H) + 26, pr.w - 2)} y={Y(l2.cash) + 22} fontSize={ls} fontWeight={700} fill="#e8890c" textAnchor="end">{fmtM(l2.cash)}</text>; })()}
      {pr.callout !== "scenario" && (ty + 28 > pr.yZero - 2 ? <text x={tx + 10} y={ty + 5} fontSize={ls} fontWeight={700} fill="#16181d" paintOrder="stroke" stroke="#fff" strokeWidth={3}>{fmtM(trough.cash)}</text> : <text x={tx} y={ty + 28} fontSize={ls} fontWeight={700} fill="#16181d" textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth={3}>{fmtM(trough.cash)}</text>)}
      {pr.callout !== "none" && pr.callout !== "scenario" && (
        <g>
          <path d={`M${cx + 3},${cy} h${cw - 6} q3,0 3,3 v${ch - 6} q0,3 -3,3 H${tx + 7} L${tx},${ty - 9} L${tx - 7},${cy + ch} H${cx + 3} q-3,0 -3,-3 v${-(ch - 6)} q0,-3 3,-3 Z`} fill={breach ? "#8b1a24" : "#2b2f38"} />
          <text x={cx + cw / 2} y={cy + ch / 3 + 5} textAnchor="middle" fill="#fff" fontSize={pr.compact ? 12 : 13} fontWeight={500}>{breach ? `ต่ำกว่าเกณฑ์ ${fmtM(pr.threshold - trough.cash)}` : `ต่ำสุด ${fmtM(trough.cash)}`}</text>
          <text x={cx + cw / 2} y={cy + (2 * ch) / 3 + 5} textAnchor="middle" fill="#fff" fontSize={pr.compact ? 12 : 13}>วันที่ {trough.day}</text>
        </g>
      )}
      {pr.callout === "scenario" && pr.series[1] && (() => {
        const t2 = pr.series[1].pts.reduce((m, p) => (p.cash < m.cash ? p : m), pr.series[1].pts[0]);
        const bx = X(trough.day) - 40, by = Y(trough.cash) - 60;
        const sx = X(t2.day), sy = Y(t2.cash);
        return (
          <g>
            <path d={`M${bx + 3},${by} h74 q3,0 3,3 v36 q0,3 -3,3 H${X(trough.day) + 6} L${X(trough.day)},${Y(trough.cash) - 8} L${X(trough.day) - 6},${by + 42} H${bx + 3} q-3,0 -3,-3 v-36 q0,-3 3,-3 Z`} fill="#8b1a24" />
            <text x={bx + 40} y={by + 17} textAnchor="middle" fill="#fff" fontSize="12.5">กรณีฐาน</text>
            <text x={bx + 40} y={by + 34} textAnchor="middle" fill="#fff" fontSize="12.5" fontWeight="600">{fmtM(trough.cash)}</text>
            <path d={`M${sx + 3},${sy + 2} L${sx + 18},${sy + 12} H${sx + 98} v40 H${sx + 18} V${sy + 22} Z`} fill="#f2a530" />
            <text x={sx + 58} y={sy + 28} textAnchor="middle" fill="#fff" fontSize="12.5">สถานการณ์</text>
            <text x={sx + 58} y={sy + 46} textAnchor="middle" fill="#fff" fontSize="12.5" fontWeight="600">{fmtM(t2.cash)}</text>
          </g>
        );
      })()}
      {hp && (
        <g pointerEvents="none">
          <line x1={X(hp.day)} x2={X(hp.day)} y1={pr.yTop} y2={pr.yZero} stroke="#8b1a24" strokeOpacity=".35" />
          {(() => {
            const bw = 178, bh = s1p ? 96 : 80, bx = X(hp.day) + (X(hp.day) > pr.w / 2 ? -bw - 10 : 10), by = pr.yTop + 2;
            return (
              <g>
                <rect x={bx} y={by} width={bw} height={bh} rx="6" fill="#fff" stroke="#e1e3e7" />
                <text x={bx + 10} y={by + 18} fontSize="12" fill="#5d6370">วันที่ {hp.day} · {thaiDate(hp.date)}</text>
                <text x={bx + 10} y={by + 37} fontSize="13.5" fontWeight="700" fill="#16181d">เงินสด {fmtM(hp.cash)}</text>
                <text x={bx + 10} y={by + 55} fontSize="12" fill="#1e9257">รับ {fmtM(hp.receipts)}</text>
                <text x={bx + 92} y={by + 55} fontSize="12" fill="#b4232c">จ่ายเคลม {fmtM(hp.claims)}</text>
                <text x={bx + 10} y={by + 72} fontSize="11.5" fill="#7d828d">ช่วง 90%: {fmtM(hp.low)} – {fmtM(hp.high)}</text>
                {s1p && <text x={bx + 10} y={by + 89} fontSize="12" fill="#e8890c" fontWeight="600">สถานการณ์ {fmtM(s1p.cash)}</text>}
              </g>
            );
          })()}
        </g>
      )}
    </svg>
  );
}
