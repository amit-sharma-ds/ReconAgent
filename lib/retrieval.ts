import type { Reconciliation } from './types';

export type RetrievedEvidence = {
  record: Reconciliation;
  score: number;
  sources: string[];
};

function tokens(value: string) {
  return value.toLowerCase().split(/[^a-z0-9_₹.-]+/).filter(token => token.length > 2);
}

export function retrieveEvidence(question: string, records: Reconciliation[], limit = 3): RetrievedEvidence[] {
  const query = tokens(question);
  return records.map(record => {
    const searchable = [
      record.settlement.id,
      record.settlement.receipt,
      record.settlement.status,
      record.ledger?.id ?? '',
      record.ledger?.receipt ?? '',
      record.ledger?.note ?? '',
      record.rule,
      record.reason,
    ].join(' ').toLowerCase();
    const matches = query.filter(token => searchable.includes(token));
    const exactReference = query.some(token => token === record.settlement.receipt.toLowerCase() || token === record.settlement.id.toLowerCase());
    const score = matches.length * 12 + (exactReference ? 60 : 0) + (record.rule === 'unmatched' && /missing|unmatched|review|exception/i.test(question) ? 8 : 0);
    return {
      record,
      score,
      sources: ['settlement', ...(record.ledger ? ['merchant ledger'] : []), 'reconciliation rules', 'audit trail'],
    };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}