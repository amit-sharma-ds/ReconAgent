import type { Settlement } from './types';

type RazorpayOrder = {
  id: string;
  amount: number;
  created_at: number;
  receipt?: string;
  status: string;
};

export async function getRazorpayTestOrders(): Promise<Settlement[]> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error('Razorpay test-mode credentials are not configured.');
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders?count=100', {
    headers: { Authorization: `Basic ${auth}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Razorpay API returned ${response.status}.`);
  const body = await response.json() as { items: RazorpayOrder[] };
  return body.items.slice(0, 50).map(order => ({
    id: order.id,
    amount: order.amount,
    created_at: order.created_at,
    receipt: order.receipt || order.id,
    status: order.status,
  }));
}
