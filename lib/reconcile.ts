import { LedgerEntry, Reconciliation, Settlement } from './types';

const day = 86_400_000;
const asDate = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10);

export function reconcile(settlements: Settlement[], ledger: LedgerEntry[]): Reconciliation[] {
  const used = new Set<string>();
  return settlements.map((settlement) => {
    const date = asDate(settlement.created_at);
    let entry = ledger.find((l) => !used.has(l.id) && l.receipt === settlement.receipt && l.amount === settlement.amount && l.date === date);
    let rule: Reconciliation['rule'] = 'exact';
    let confidence = 100;
    let reason = 'Exact amount, date and receipt match.';
    if (!entry) {
      entry = ledger.find((l) => !used.has(l.id) && Math.abs(l.amount - settlement.amount) <= Math.max(100, settlement.amount * 0.025) && Math.abs(new Date(l.date).getTime() - new Date(date).getTime()) <= day && (l.receipt === settlement.receipt || Math.abs(l.amount - settlement.amount) <= 50));
      rule = entry ? 'fuzzy' : 'unmatched';
      if (entry) {
        const delta = settlement.amount - entry.amount;
        const dateDelta = Math.round((new Date(entry.date).getTime() - new Date(date).getTime()) / day);
        confidence = Math.max(76, 96 - Math.round(Math.abs(delta) / 20) - Math.abs(dateDelta) * 5);
        reason = delta ? `Amount mismatch: ₹${(Math.abs(delta) / 100).toFixed(2)} difference likely due to fee not logged.` : `Date offset of ${Math.abs(dateDelta)} day likely due to settlement timing.`;
      } else { confidence = 0; reason = 'No corresponding merchant ledger entry was found.'; }
    }
    if (entry) used.add(entry.id);
    const now = new Date().toISOString();
    return { settlement, ledger: entry, status: rule === 'exact' ? 'matched' : 'exception', rule, confidence, reason, audit: [{ at: now, event: 'Settlement record ingested' }, { at: now, event: rule === 'exact' ? 'Exact rule matched receipt, amount and date' : rule === 'fuzzy' ? 'Fuzzy rule matched amount tolerance and date window' : 'No candidate passed matching rules' }] };
  });
}
