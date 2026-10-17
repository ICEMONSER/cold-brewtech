import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const MAROON = "#7E1A27";

export function ForecastChart({ data, threshold, height = 300 }: { data: any; threshold: number | null; height?: number }) {
  const rows = data.series.map((r: any) => ({ ...r, band: [r.low, r.high], d: r.date.slice(5) }));
  return (
    <div role="img" aria-label={`พยากรณ์เงินสด ${data.horizon_days} วัน ต่ำสุด ${data.trough.cash} ล้านบาท วันที่ ${data.trough.date}`}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={rows} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#ECECEC" vertical={false} />
          <XAxis dataKey="d" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 12 }} width={56} unit="M" />
          <Tooltip formatter={(v: any) => (Array.isArray(v) ? `${v[0]} – ${v[1]}` : v)} />
          <Legend />
          <Area dataKey="band" name="ช่วงความไม่แน่นอน 90%" fill="#F7DADD" stroke="none" />
          <Line dataKey="cash" name="คาดการณ์เงินสด" stroke={MAROON} strokeWidth={2.4} dot={false} />
          {threshold != null && <ReferenceLine y={threshold} stroke="#555" strokeDasharray="6 5" label={{ value: `เกณฑ์ขั้นต่ำ ฿${threshold}M`, position: "insideTopLeft", fontSize: 12 }} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Waterfall({ revenue, expenses, reins, result, height = 260 }: { revenue: number; expenses: number; reins: number; result: number; height?: number }) {
  // floating bars: [start, end]
  const afterExp = revenue - expenses;
  const rows = [
    { name: "รายได้", v: [0, revenue], label: revenue, c: "#6E1220" },
    { name: "ค่าใช้จ่ายบริการ", v: [afterExp, revenue], label: -expenses, c: "#F2A3AA" },
    { name: "ประกันภัยต่อ", v: [afterExp, afterExp + reins].sort((a, b) => a - b), label: reins, c: reins >= 0 ? "#9ED8B3" : "#F2A3AA" },
    { name: "ผลลัพธ์", v: [Math.min(0, result), Math.max(0, result)], label: result, c: "#E86B78" },
  ];
  return (
    <div role="img" aria-label={`รายได้ ${revenue} ค่าใช้จ่าย ${expenses} ประกันภัยต่อ ${reins} ผลลัพธ์ ${result} ล้านบาท`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} margin={{ top: 22, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#ECECEC" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
          <YAxis tick={{ fontSize: 12 }} width={60} />
          <ReferenceLine y={0} stroke="#999" />
          <Bar dataKey="v" isAnimationActive={false}>
            {rows.map((r) => <Cell key={r.name} fill={r.c} />)}
            <LabelList dataKey="label" position="top" formatter={(v: number) => `${v > 0 ? "+" : ""}${v.toLocaleString()}`} style={{ fontSize: 12, fontWeight: 600, fill: "#1A1A1A" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HBar({ rows, unit = "", height = 240, color = MAROON }: { rows: { label: string; value: number }[]; unit?: string; height?: number; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 60, bottom: 0, left: 8 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={190} tick={{ fontSize: 12 }} />
        <Bar dataKey="value" fill={color} isAnimationActive={false}>
          <LabelList dataKey="value" position="right" formatter={(v: number) => `${v.toLocaleString()}${unit}`} style={{ fontSize: 12 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
