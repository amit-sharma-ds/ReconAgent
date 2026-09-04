import { NextResponse } from 'next/server';
import { demoLedger, demoSettlements } from '@/lib/demo-data';
import { reconcile } from '@/lib/reconcile';
import { retrieveEvidence } from '@/lib/retrieval';
import type { Reconciliation } from '@/lib/types';
import { metrics } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  metrics.state.guideRequests += 1;
  try {
    const body = await request.json() as { question?: string; records?: Reconciliation[] };
    const question = body.question?.trim();
    if (!question) return NextResponse.json({ error: 'A question is required.' }, { status: 400 });

    const records = body.records
      ? body.records
      : reconcile(demoSettlements, demoLedger);
    const evidence = retrieveEvidence(question, records);
    const top = evidence[0]?.record;
    const answer = top
      ? `${top.settlement.receipt} is ${top.rule === 'exact' ? 'an exact match and can be auto-resolved' : 'kept in the human review queue'}. ${top.reason} Confidence is ${top.confidence}%.`
      : 'I could not find matching evidence for that question. Try a receipt such as recon-demo-007 or ask about fees, dates, or unmatched records.';

    return NextResponse.json({ answer, evidence: evidence.map(item => ({ receipt: item.record.settlement.receipt, rule: item.record.rule, confidence: item.record.confidence, reason: item.record.reason, sources: item.sources, score: item.score })) });
  } catch {
    metrics.state.errors += 1;
    return NextResponse.json({ error: 'Unable to retrieve reconciliation evidence.' }, { status: 400 });
  }
}