/* 30-day cash chart drawn in the card's own pixel space, so it lines up with the reference screens. */
import { ReactNode } from "react";

export type Pt = [number, number]; // [day, ฿M]

export type Series = {
  pts: Pt[];
  color: string;
  width?: number;
  dashFrom?: number; // draw solid up to this day, dashed after (forecast)
  dashed?: boolean;
  dot?: number; // radius of the small dots
  big?: number[]; // days that get a larger dot
  bigR?: number;
  bigStroke?: string;
  band?: { color: string; half: (day: number) => number; opacity?: number };
};

export type Callout = { x: number; y: number; w: number; h: number; tip: number; tipY: number; fill: string; lines: string[]; size?: number };
export type Label = { x: number; y: number; text: string; color?: string; size?: number; weight?: number; anchor?: "start" | "middle" | "end" };

type Props = {
  w: number;
  h: number;
  x0: number; // px of day 1
  x1: number; // px of last day
  days?: number;
  yZero: number; // px of 0
  yTop: number; // px of yMax
  yMax?: number;
  yTicks?: number[];
  yTickX?: number; // right edge of y-tick labels
  xTicks: { day: number; label: string; dx?: number }[];
  xTickY: number;
  gridRight?: number;
  vGrid?: number[];
  threshold?: { value: number; color?: string; label?: Label };
  series: Series[];
  labels?: Label[];
  callouts?: Callout[];
  tickSize?: number;
  children?: ReactNode;
};

function monotone(p: [number, number][]) {
  if (p.length < 2) return "";
  const n = p.length;
  const dx: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx.push(p[i + 1][0] - p[i][0]); m.push((p[i + 1][1] - p[i][1]) / dx[i]); }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]));
  t.push(m[n - 2]);
  let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${(p[i][0] + h).toFixed(1)},${(p[i][1] + t[i] * h).toFixed(1)} ${(p[i + 1][0] - h).toFixed(1)},${(p[i + 1][1] - t[i + 1] * h).toFixed(1)} ${p[i + 1][0].toFixed(1)},${p[i + 1][1].toFixed(1)}`;
  }
  return d;
}

export default function CashChart(pr: Props) {
  const days = pr.days ?? 30;
  const yMax = pr.yMax ?? 160;
  const X = (d: number) => pr.x0 + ((d - 1) / (days - 1)) * (pr.x1 - pr.x0);
  const Y = (v: number) => pr.yZero - (v / yMax) * (pr.yZero - pr.yTop);
  const ticks = pr.yTicks ?? [0, 40, 80, 120, 160];
  const right = pr.gridRight ?? pr.x1 + 18;
  const left = pr.x0 - 14;
  const ts = pr.tickSize ?? 14;

  const bandPath = (s: Series) => {
    if (!s.band) return "";
    const samples: number[] = [];
    const a = s.pts[0][0], b = s.pts[s.pts.length - 1][0];
    for (let d = a; d <= b + 1e-6; d += 0.5) samples.push(d);
    const curve = (d: number) => interp(s.pts, d);
    const up = samples.map((d) => [X(d), Y(curve(d) + s.band!.half(d))] as [number, number]);
    const lo = samples.map((d) => [X(d), Y(curve(d) - s.band!.half(d))] as [number, number]).reverse();
    return monotone(up) + " L" + lo.map((q) => q.join(",")).join(" L") + " Z";
  };

  return (
    <svg className="chart" viewBox={`0 0 ${pr.w} ${pr.h}`} width={pr.w} height={pr.h} role="img">
      {/* grid */}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={left} x2={right} y1={Y(t)} y2={Y(t)} stroke={t === 0 ? "#cfd2d7" : "#eceef1"} strokeWidth="1" />
          <text x={pr.yTickX ?? left - 10} y={Y(t) + 5} textAnchor="end" className="tick" fontSize={ts}>{t}</text>
        </g>
      ))}
      <line x1={left} x2={left} y1={pr.yTop - 4} y2={pr.yZero} stroke="#e3e5e9" />
      {(pr.vGrid ?? pr.xTicks.map((x) => x.day)).map((d) => (
        <line key={d} x1={X(d)} x2={X(d)} y1={pr.yTop} y2={pr.yZero + 6} stroke="#f0f1f3" />
      ))}
      {pr.xTicks.map((x) => (
        <text key={x.day} x={X(x.day) + (x.dx ?? 0)} y={pr.xTickY} textAnchor="middle" className="tick" fontSize={ts}>{x.label}</text>
      ))}
      {/* bands */}
      {pr.series.map((s, i) => s.band && <path key={"b" + i} d={bandPath(s)} fill={s.band.color} opacity={s.band.opacity ?? 1} />)}
      {/* threshold */}
      {pr.threshold && (
        <>
          <line x1={left} x2={right} y1={Y(pr.threshold.value)} y2={Y(pr.threshold.value)} stroke={pr.threshold.color ?? "#6b7180"} strokeWidth="1.1" strokeDasharray="5 4" />
          {pr.threshold.label && <Txt {...pr.threshold.label} />}
        </>
      )}
      {/* lines */}
      {pr.series.map((s, i) => {
        const px = s.pts.map(([d, v]) => [X(d), Y(v)] as [number, number]);
        const sw = s.width ?? 2.2;
        if (s.dashFrom != null) {
          const k = s.pts.findIndex(([d]) => d >= s.dashFrom!);
          return (
            <g key={"l" + i}>
              <path d={monotone(px.slice(0, k + 1))} fill="none" stroke={s.color} strokeWidth={sw} />
              <path d={monotone(px.slice(k))} fill="none" stroke={s.color} strokeWidth={sw} strokeDasharray="7 5" />
            </g>
          );
        }
        return <path key={"l" + i} d={monotone(px)} fill="none" stroke={s.color} strokeWidth={sw} strokeDasharray={s.dashed ? "7 5" : undefined} />;
      })}
      {pr.series.map((s, i) => (
        <g key={"d" + i}>
          {s.pts.map(([d, v]) => {
            const big = s.big?.includes(d);
            return <circle key={d} cx={X(d)} cy={Y(v)} r={big ? s.bigR ?? 6 : s.dot ?? 3.6} fill={s.color} stroke={big ? s.bigStroke ?? "#fff" : "none"} strokeWidth={big ? 2 : 0} />;
          })}
        </g>
      ))}
      {pr.labels?.map((l, i) => <Txt key={i} {...l} />)}
      {pr.callouts?.map((c, i) => (
        <g key={i}>
          <path d={`M${c.x + 3},${c.y} h${c.w - 6} q3,0 3,3 v${c.h - 6} q0,3 -3,3 H${c.tip + 7} L${c.tip},${c.tipY} L${c.tip - 7},${c.y + c.h} H${c.x + 3} q-3,0 -3,-3 v${-(c.h - 6)} q0,-3 3,-3 Z`} fill={c.fill} />
          {c.lines.map((t, j) => (
            <text key={j} x={c.x + c.w / 2} y={c.y + (c.h / (c.lines.length + 1)) * (j + 1) + 5} textAnchor="middle" fill="#fff" fontSize={c.size ?? 12.5} fontWeight={j === 0 ? 500 : 400}>{t}</text>
          ))}
        </g>
      ))}
      {pr.children}
    </svg>
  );
}

function Txt({ x, y, text, color = "#1f2430", size = 14, weight = 400, anchor = "start" }: Label) {
  return <text x={x} y={y} fill={color} fontSize={size} fontWeight={weight} textAnchor={anchor}>{text}</text>;
}

export function interp(pts: Pt[], d: number) {
  if (d <= pts[0][0]) return pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, va] = pts[i], [b, vb] = pts[i + 1];
    if (d <= b) { const t = (d - a) / (b - a); const s = t * t * (3 - 2 * t); return va + (vb - va) * (0.5 * t + 0.5 * s); }
  }
  return pts[pts.length - 1][1];
}

/* Legend row in HTML, placed below charts. */
export function Legend({ items, gap = 30 }: { items: { kind: "line-dot" | "dash" | "band" | "thr" | "dot" | "swatch"; color: string; label: string }[]; gap?: number }) {
  return (
    <div className="legend" style={{ gap }}>
      {items.map((it) => (
        <span key={it.label} className="lg">
          {it.kind === "line-dot" && <svg width="46" height="12"><line x1="2" x2="44" y1="6" y2="6" stroke={it.color} strokeWidth="2.4" /><circle cx="23" cy="6" r="4.6" fill={it.color} /></svg>}
          {it.kind === "dash" && <svg width="40" height="12"><line x1="2" x2="38" y1="6" y2="6" stroke={it.color} strokeWidth="2.2" strokeDasharray="7 5" /></svg>}
          {it.kind === "band" && <span className="lg-band" style={{ background: it.color }} />}
          {it.kind === "thr" && <svg width="34" height="12"><line x1="1" x2="33" y1="6" y2="6" stroke={it.color} strokeWidth="1.4" strokeDasharray="6 5" /></svg>}
          {it.kind === "dot" && <span className="lg-dot" style={{ background: it.color }} />}
          {it.label}
        </span>
      ))}
    </div>
  );
}
