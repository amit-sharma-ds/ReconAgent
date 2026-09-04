import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { caseId?: string; decision?: 'approved' | 'rejected'; note?: string };
    if (!body.caseId || !body.decision || !/^[a-zA-Z0-9_-]{1,240}$/.test(body.caseId)) return NextResponse.json({ error: 'Valid caseId and decision are required.' }, { status: 400 });
    const review = await prisma.reconciliationCase.update({
      where: { id: body.caseId },
      data: { reviewStatus: body.decision, reviewNote: body.note?.trim().slice(0, 1_000) || null, reviewedAt: new Date() },
    });
    return NextResponse.json({ review });
  } catch {
    return NextResponse.json({ error: 'Review case not found.' }, { status: 404 });
  }
}