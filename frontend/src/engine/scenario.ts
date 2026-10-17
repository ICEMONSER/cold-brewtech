/* Scenario mitigation actions applied to a copy of the data. */
import { addDays } from "./format";
import type { Datasets } from "./types";

export type Action = { id: string; kind: "credit" | "sell" | "defer" | "collect"; amount: number; day: number; label: string };

export function applyActions(ds: Datasets, acts: Action[], today: string, troughDay: number): Datasets {
  if (!acts.length) return ds;
  const ledger = [...ds.ledger];
  let payments = ds.payments;
  for (const a of acts) {
    if (a.kind === "defer") {
      // postpone the largest approved payments due on/before the trough until after it
      const cutoff = addDays(today, troughDay - 1);
      const cands = ds.payments.filter((p) => p.status === "scheduled" && p.payment_date <= cutoff).sort((x, y) => y.amount - x.amount);
      const pick = new Set<typeof cands[number]>(); let acc = 0;
      for (const p of cands) { if (acc >= a.amount) break; pick.add(p); acc += p.amount; }
      payments = payments.map((p) => (pick.has(p) ? { ...p, payment_date: addDays(today, a.day - 1) } : p));
    } else {
      ledger.push({ date: addDays(today, a.day - 1), type: a.kind === "collect" ? "premium_receipt" : "other_receipt", amount: a.amount, status: "expected", description: a.label });
    }
  }
  return { ...ds, ledger, payments };
}
