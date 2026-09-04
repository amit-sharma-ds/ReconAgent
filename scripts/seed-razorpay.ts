import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
if (!keyId || !keySecret || keyId === 'your_key_id_here') throw new Error('Add Razorpay Test Mode keys to .env.local before seeding.');
const auth = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
const call = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, { ...init, headers: { Authorization: auth, 'Content-Type': 'application/json', ...init?.headers } });
  if (!response.ok) throw new Error(`Razorpay ${response.status}: ${await response.text()}`);
  return response.json();
};
async function main() {
  for (let i = 1; i <= 50; i++) await call('https://api.razorpay.com/v1/orders', { method: 'POST', body: JSON.stringify({ amount: 5000 + (i * 1379) % 45000, currency: 'INR', receipt: `recon-demo-${String(i).padStart(3, '0')}`, notes: { source: 'ReconAgent demo' } }) });
  const all = await call('https://api.razorpay.com/v1/orders?count=100') as { items: unknown[] };
  const rows = all.items.filter((o: any) => o.receipt?.startsWith('recon-demo-')).map((o: any) => ({ id: o.id, amount: o.amount, created_at: o.created_at, receipt: o.receipt, status: o.status }));
  await mkdir(path.join(process.cwd(), 'data'), { recursive: true });
  await writeFile(path.join(process.cwd(), 'data', 'settlements.json'), JSON.stringify(rows, null, 2));
  console.log(`Saved ${rows.length} Razorpay test orders to data/settlements.json`);
}
main();
