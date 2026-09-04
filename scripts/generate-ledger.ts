import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { LedgerEntry, Settlement } from '../lib/types';
async function main() {
  const settlements: Settlement[] = JSON.parse(await readFile(path.join(process.cwd(), 'data', 'settlements.json'), 'utf8'));
  const ledger: LedgerEntry[] = settlements.flatMap((s, i) => {
    if ([0, 13, 26, 39].includes(i)) return []; // missing
    const d = new Date(s.created_at * 1000); if ([8, 27, 44].includes(i)) d.setDate(d.getDate() + 1);
    const amount = [6, 19, 33].includes(i) ? s.amount - Math.min(120, Math.round(s.amount * .018)) : s.amount;
    const entry = { id: `led_${String(i + 1).padStart(3, '0')}`, amount, date: d.toISOString().slice(0, 10), receipt: s.receipt, note: i % 6 === 0 ? 'Net settlement posted' : 'Order payment' };
    return i === 23 ? [entry, { ...entry, id: `${entry.id}_duplicate`, note: 'Duplicate import' }] : [entry];
  });
  await writeFile(path.join(process.cwd(), 'data', 'ledger.json'), JSON.stringify(ledger, null, 2));
  await writeFile(path.join(process.cwd(), 'data', 'ledger.csv'), ['id,amount,date,receipt,note', ...ledger.map(l => `${l.id},${l.amount},${l.date},${l.receipt},${l.note}`)].join('\n'));
  console.log(`Generated ${ledger.length} ledger entries.`);
}
main();
