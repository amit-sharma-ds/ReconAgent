import { NextResponse } from 'next/server';
import { reconcile } from '@/lib/reconcile';
import { demoLedger, demoSettlements } from '@/lib/demo-data';
import { getRazorpayTestOrders } from '@/lib/razorpay';
import type { LedgerEntry, Settlement } from '@/lib/types';

function demoLedgerFor(settlements: Settlement[]): LedgerEntry[] {
  return settlements.flatMap((settlement, index) => {
    if (index % 13 === 0) return [];
    const date = new Date(settlement.created_at * 1000);
    if (index % 11 === 0) date.setDate(date.getDate() + 1);
    return [{
      id: `ledger_${settlement.id}`,
      receipt: settlement.receipt,
      amount: index % 9 === 0 ? settlement.amount - Math.min(120, Math.round(settlement.amount * 0.018)) : settlement.amount,
      date: date.toISOString().slice(0, 10),
      note: 'Demo merchant ledger — replace with uploaded CSV in production',
    }];
  });
}

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get('source') === 'razorpay' ? 'razorpay' : 'demo';
  try {
    const settlements = source === 'razorpay' ? await getRazorpayTestOrders() : demoSettlements;
    if (!settlements.length) return NextResponse.json({ error: 'No Razorpay test orders found. Run the seed script first.', source }, { status: 404 });
    const records = reconcile(settlements, source === 'razorpay' ? demoLedgerFor(settlements) : demoLedger);
  const exact = records.filter(r => r.rule === 'exact').length;
    return NextResponse.json({ records, source, summary: { total: records.length, matched: exact, exceptions: records.length - exact, matchRate: Math.round(exact / records.length * 100), generatedAt: new Date().toISOString() } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load Razorpay data.', source }, { status: 502 });
  }
}
