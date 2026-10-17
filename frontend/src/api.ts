export const API = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";

export async function get<T = any>(path: string): Promise<T> {
  const r = await fetch(API + path);
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}
export async function send<T = any>(path: string, body: unknown, method = "POST"): Promise<T> {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}
export async function upload(path: string, file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(API + path, { method: "POST", body: fd });
  const j = await r.json();
  if (!r.ok) throw new Error(j.detail || r.statusText);
  return j;
}

export const fmtM = (v: number | null | undefined, digits = 1) =>
  v == null ? "—" : `${v < 0 ? "-" : ""}฿${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}M`;
export const fmtN = (v: number | null | undefined, digits = 2) =>
  v == null ? "—" : v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
