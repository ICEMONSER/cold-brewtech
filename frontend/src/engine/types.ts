/* The five internal systems the concierge connects (deck: "Connect"). */
export type Policy = { policy_id: string; line: string; start_date: string; end_date: string; premium: number; sum_insured: number };
export type Claim = { claim_id: string; policy_id: string; line: string; loss_date: string; reported_date: string; status: string; claimed_amount: number };
export type Reserve = { claim_id: string; reserve_amount: number; valuation_date: string };
export type Payment = { claim_id: string; payment_date: string; amount: number; status: "paid" | "scheduled" };
export type LedgerType = "balance" | "premium_receipt" | "reinsurance_recovery" | "other_receipt" | "expense" | "other_payment";
export type Ledger = { date: string; type: LedgerType; amount: number; status: "actual" | "expected"; description: string };

export type SourceKey = "policies" | "claims" | "reserves" | "payments" | "ledger";
export type Datasets = { policies: Policy[]; claims: Claim[]; reserves: Reserve[]; payments: Payment[]; ledger: Ledger[] };
export type SourceMeta = { origin: "sample" | "upload"; fileName?: string; updatedAt: number; rows: number };

export const SOURCES: { key: SourceKey; system: string; th: string; file: string; columns: string[]; desc: string }[] = [
  { key: "policies", system: "Policy System", th: "กรมธรรม์", file: "policies.csv", columns: ["policy_id", "line", "start_date", "end_date", "premium", "sum_insured"], desc: "จำนวนกรมธรรม์ เบี้ยประกันที่ได้รับ วันเริ่ม-สิ้นสุดกรมธรรม์" },
  { key: "claims", system: "Claims Management System", th: "เคลม", file: "claims.csv", columns: ["claim_id", "policy_id", "line", "loss_date", "reported_date", "status", "claimed_amount"], desc: "จำนวนเคลม วันที่เกิดเหตุ ประเภทเคลม สถานะ" },
  { key: "reserves", system: "Actuarial System", th: "สำรองสินไหม", file: "reserves.csv", columns: ["claim_id", "reserve_amount", "valuation_date"], desc: "ประมาณการค่าสินไหมคงค้างของแต่ละเคลม" },
  { key: "payments", system: "Payment System", th: "การจ่าย", file: "payments.csv", columns: ["claim_id", "payment_date", "amount", "status"], desc: "จำนวนเงินที่จ่ายจริง วันที่จ่าย และรายการที่กำหนดจ่าย (scheduled)" },
  { key: "ledger", system: "Accounting / Bank Data", th: "บัญชี", file: "ledger.csv", columns: ["date", "type", "amount", "status", "description"], desc: "ยอดเงินสดคงเหลือ เงินรับ-จ่ายจริง และที่คาดว่าจะเกิด" },
];
