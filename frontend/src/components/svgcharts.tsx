/* Hand-drawn SVG charts that reproduce the approved Cold BrewTech design. */
const MAROON = "#7E1A27";
const ORANGE = "#F09A1F";
const GRID = "#ECECEC";
const AX = "#333";

type Pt = { day: number; cash: number; low: number; high: number };

const fmt = (v: number) => `฿${Math.round(v)}M`;

export function CashChart({
  series, compare, threshold, height = 300, actualUntil, ymax = 160, ticks = [1, 10, 20, 30], compactLegend,
}: {
  series: Pt[]; compare?: Pt[]; threshold: number; height?: number; actualUntil?: number; ymax?: number; ticks?: number[]; compactLegend?: boolean;
}) {
  const W = 1000, H = height, L = 52, R = 70, T = 24, B = 34;
  const n = series.length - 1;
  const x = (d: number) => L + (d / n) * (W - L - R);
  const y = (v: number) => T + (1 - v / ymax) * (H - T - B);
  const path = (pts: Pt[], key: "cash" | "low" | "high") => pts.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
  const band = (pts: Pt[]) => `${path(pts, "high")} ${[...pts].reverse().map((p) => `L${x(p.day).toFixed(1)},${y(p.low).toFixed(1)}`).join(" ")} Z`;
  const trough = series.reduce((m, p) => (p.cash < m.cash ? p : m), series[0]);
  const last = series[n];
  const below = trough.cash < threshold;
  const yTicks = [0, 40, 80, 120, 160].filter((v) => v <= ymax);
  const split = actualUntil ?? 0;
  const actual = split ? series.slice(0, split + 1) : series;
  const fc = split ? series.slice(split) : [];
  const cTrough = compare?.reduce((m, p) => (p.cash < m.cash ? p : m), compare[0]);
  const dots = series.filter((p) => p.day % 3 === 0 || p.day === trough.day || p.day === 0 || p.day === n);
  const label = `กราฟคาดการณ์เงินสด ${n} วัน เริ่ม ${fmt(series[0].cash)} ต่ำสุด ${fmt(trough.cash)} วันที่ ${trough.day} สิ้นงวด ${fmt(last.cash)}`;

  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ width: "100%", height: "auto", display: "block" }}>
        {yTicks.map((v) => <g key={v}><line x1={L} x2={W - R + 10} y1={y(v)} y2={y(v)} stroke={GRID} /><text x={L - 10} y={y(v) + 4} fontSize="13" fill={AX} textAnchor="end">{v}</text></g>)}
        {ticks.map((d) => <g key={d}><line x1={x(d)} x2={x(d)} y1={T} y2={H - B} stroke={GRID} /><text x={x(d)} y={H - 10} fontSize="13" fill={AX} textAnchor="middle">วันที่ {d}</text></g>)}
        <path d={band(series)} fill="#F7DADD" opacity={0.9} />
        {compare && <path d={band(compare)} fill="#FCE9CF" opacity={0.75} />}
        <line x1={L} x2={W - R + 10} y1={y(threshold)} y2={y(threshold)} stroke="#777" strokeDasharray="6 5" />
        <text x={L + 8} y={y(threshold) - 7} fontSize="13" fill={AX}>เกณฑ์เงินสำรองขั้นต่ำ ฿{threshold}M</text>
        <path d={path(actual, "cash")} fill="none" stroke={MAROON} strokeWidth={2.6} />
        {fc.length > 0 && <path d={path(fc, "cash")} fill="none" stroke={MAROON} strokeWidth={2.4} strokeDasharray="9 6" />}
        {compare && <path d={path(compare, "cash")} fill="none" stroke={ORANGE} strokeWidth={2.4} />}
        {compare && compare.filter((p) => p.day % 3 === 0 || p.day === cTrough!.day).map((p) => <circle key={p.day} cx={x(p.day)} cy={y(p.cash)} r={p.day === cTrough!.day ? 5.5 : 3.5} fill={ORANGE} />)}
        {dots.map((p) => <circle key={p.day} cx={x(p.day)} cy={y(p.cash)} r={p.day === trough.day || p.day === 0 || p.day === n ? 6 : 4} fill={MAROON} />)}
        <text x={x(0) + 6} y={y(series[0].cash) - 14} fontSize="14" fontWeight="700" fill="#1A1A1A">{fmt(series[0].cash)}</text>
        <text x={x(n)} y={y(last.cash) - 14} fontSize="14" fontWeight="700" fill="#1A1A1A" textAnchor="middle">{fmt(last.cash)}</text>
        {compare && <text x={x(n) + 8} y={y(compare[n].cash) + 18} fontSize="14" fontWeight="700" fill="#D9820C">{`฿${compare[n].cash.toFixed(1)}M`}</text>}
        {!compare && <text x={x(trough.day)} y={y(trough.cash) + 26} fontSize="14" fontWeight="700" fill="#1A1A1A" textAnchor="middle">{fmt(trough.cash)}</text>}
        {below && !compare && (
          <g>
            <path d={`M${x(trough.day) - 62},${y(trough.cash) - 86}h124v46h-54l-8,13-8,-13h-54z`} fill={MAROON} />
            <text x={x(trough.day)} y={y(trough.cash) - 66} fontSize="13" fill="#fff" textAnchor="middle">ต่ำกว่าเกณฑ์ ฿{Math.round(threshold - trough.cash)}M</text>
            <text x={x(trough.day)} y={y(trough.cash) - 48} fontSize="13" fill="#fff" textAnchor="middle">วันที่ {trough.day}</text>
          </g>
        )}
        {compare && (
          <g>
            <path d={`M${x(trough.day) - 40},${y(trough.cash) - 62}h80v40h-32l-8,12-8,-12h-32z`} fill={MAROON} />
            <text x={x(trough.day)} y={y(trough.cash) - 46} fontSize="12" fill="#fff" textAnchor="middle">กรณีฐาน</text>
            <text x={x(trough.day)} y={y(trough.cash) - 30} fontSize="13" fontWeight="600" fill="#fff" textAnchor="middle">{fmt(trough.cash)}</text>
            <path d={`M${x(cTrough!.day) - 46},${y(cTrough!.cash) + 18}h38l8,-10 8,10h38v40h-92z`} fill="#F4A62A" />
            <text x={x(cTrough!.day)} y={y(cTrough!.cash) + 35} fontSize="12" fill="#1A1205" textAnchor="middle">สถานการณ์</text>
            <text x={x(cTrough!.day)} y={y(cTrough!.cash) + 51} fontSize="13" fontWeight="600" fill="#1A1205" textAnchor="middle">{`฿${cTrough!.cash.toFixed(1)}M`}</text>
          </g>
        )}
      </svg>
      <figcaption className="legend">
        {split ? <><span><i className="ln" />เงินสดจริง (ย้อนหลัง)</span><span><i className="ln dash" />คาดการณ์เงินสด</span></>
          : compare ? <><span><i className="ln" />กรณีฐาน (Base Case)</span><span><i className="ln orange" />สถานการณ์</span></>
          : <span><i className="ln" />คาดการณ์เงินสด</span>}
        {!compactLegend && <span><i className="sw" />ช่วงความไม่แน่นอน</span>}
        <span><i className="ln dash grey" />เกณฑ์เงินสำรองขั้นต่ำ</span>
      </figcaption>
    </figure>
  );
}

export function WeeklyBars({ rows, height = 230 }: { rows: { label: string; inflow: number; outflow: number }[]; height?: number }) {
  const W = 560, H = height, L = 36, T = 20, B = 34, max = 40;
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const slot = (W - L - 10) / rows.length, bw = slot * 0.3;
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={rows.map((r) => `${r.label} รับ ${r.inflow.toFixed(0)} จ่าย ${r.outflow.toFixed(0)} ล้านบาท`).join(", ")} style={{ width: "100%", height: "auto" }}>
        {[0, 10, 20, 30, 40].map((v) => <g key={v}><line x1={L} x2={W - 6} y1={y(v)} y2={y(v)} stroke={v ? GRID : "#BBB"} /><text x={L - 8} y={y(v) + 4} fontSize="12" fill={AX} textAnchor="end">{v}</text></g>)}
        {rows.map((r, i) => {
          const cx = L + slot * i + slot / 2;
          return (
            <g key={r.label}>
              <rect x={cx - bw - 2} y={y(r.inflow)} width={bw} height={y(0) - y(r.inflow)} rx={2} fill="#9ED8B3" />
              <rect x={cx + 2} y={y(r.outflow)} width={bw} height={y(0) - y(r.outflow)} rx={2} fill="#F2939C" />
              <text x={cx - bw / 2 - 2} y={y(r.inflow) - 6} fontSize="11" fontWeight="600" textAnchor="middle">฿{Math.round(r.inflow)}M</text>
              <text x={cx + bw / 2 + 2} y={y(r.outflow) - 6} fontSize="11" fontWeight="600" textAnchor="middle">฿{Math.round(r.outflow)}M</text>
              <text x={cx} y={H - 10} fontSize="12" fill={AX} textAnchor="middle">{r.label}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="legend"><span><i className="dot g" />เงินรับคาดการณ์</span><span><i className="dot r" />เงินจ่ายเคลม (กระแสเงินสด)</span></figcaption>
    </figure>
  );
}

export function ColumnBars({ rows, total, height = 250 }: { rows: { label: string; value: number }[]; total: number; height?: number }) {
  const W = 560, H = height, L = 36, T = 26, B = 50, max = 60;
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const slot = (W - L) / rows.length, bw = slot * 0.5;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={rows.map((r) => `${r.label} ${r.value} ล้านบาท`).join(", ")} style={{ width: "100%", height: "auto" }}>
      {[0, 20, 40, 60].map((v) => <g key={v}><line x1={L} x2={W} y1={y(v)} y2={y(v)} stroke={v ? GRID : "#BBB"} /><text x={L - 8} y={y(v) + 4} fontSize="12" fill={AX} textAnchor="end">{v}</text></g>)}
      {rows.map((r, i) => {
        const cx = L + slot * i + slot / 2;
        return (
          <g key={r.label}>
            <rect x={cx - bw / 2} y={y(r.value)} width={bw} height={y(0) - y(r.value)} fill="#8E1A2A" />
            <text x={cx} y={y(r.value) - 8} fontSize="14" fontWeight="700" textAnchor="middle">฿{r.value}M</text>
            <text x={cx} y={H - 28} fontSize="14" textAnchor="middle">{r.label}</text>
            <text x={cx} y={H - 10} fontSize="13" textAnchor="middle">({Math.round((r.value / total) * 100)}%)</text>
          </g>
        );
      })}
    </svg>
  );
}

export function WaterfallSvg({ steps, height = 250, ymin = -50, ymax = 150 }: { steps: { label: string[]; value: number; kind: "total" | "delta" | "result" }[]; height?: number; ymin?: number; ymax?: number }) {
  const W = 520, H = height, L = 46, T = 22, B = 62;
  const y = (v: number) => T + ((ymax - v) / (ymax - ymin)) * (H - T - B);
  const slot = (W - L) / steps.length, bw = slot * 0.62;
  let run = 0;
  const bars = steps.map((s) => {
    let a: number, b: number;
    if (s.kind === "total") { a = 0; b = s.value; run = s.value; }
    else if (s.kind === "delta") { a = run; b = run + s.value; run = b; }
    else { a = 0; b = s.value; }
    return { ...s, top: Math.max(a, b), bot: Math.min(a, b) };
  });
  const color = (s: (typeof bars)[number]) => (s.kind === "total" ? "#6E1220" : s.kind === "result" ? "#E86B78" : s.value < 0 ? "#F2A3AA" : "#9ED8B3");
  const ticks = []; for (let v = ymin; v <= ymax; v += 50) ticks.push(v);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={steps.map((s) => `${s.label.join(" ")} ${s.value}`).join(", ")} style={{ width: "100%", height: "auto" }}>
      {ticks.map((v) => <g key={v}><line x1={L} x2={W} y1={y(v)} y2={y(v)} stroke={v === 0 ? "#BBB" : GRID} /><text x={L - 8} y={y(v) + 4} fontSize="12" fill={AX} textAnchor="end">{v}</text></g>)}
      {bars.map((s, i) => {
        const cx = L + slot * i + slot / 2;
        const lbl = s.kind === "total" ? `฿${s.value}M` : `${s.value < 0 ? "-" : "+"}฿${Math.abs(s.value)}M`;
        return (
          <g key={i}>
            <rect x={cx - bw / 2} y={y(s.top)} width={bw} height={Math.max(2, y(s.bot) - y(s.top))} fill={color(s)} />
            <text x={cx} y={s.kind === "total" ? y(s.top) - 8 : y(s.bot) + 18} fontSize="13" fontWeight={s.kind === "total" ? 700 : 500} fill={s.kind === "total" ? "#1A1A1A" : "#7E1A27"} textAnchor="middle">{lbl}</text>
            {s.label.map((t, k) => <text key={k} x={cx} y={H - B + 22 + k * 15} fontSize="12" textAnchor="middle">{t}</text>)}
          </g>
        );
      })}
    </svg>
  );
}
