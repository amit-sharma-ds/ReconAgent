export type Settlement = { id: string; amount: number; created_at: number; receipt: string; status: string };
export type LedgerEntry = { id: string; amount: number; date: string; receipt: string; note?: string };
export type Reconciliation = { settlement: Settlement; ledger?: LedgerEntry; status: 'matched' | 'exception'; rule: 'exact' | 'fuzzy' | 'unmatched'; confidence: number; reason: string; audit: { at: string; event: string }[] };
