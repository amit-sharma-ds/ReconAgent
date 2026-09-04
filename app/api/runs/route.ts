import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const runs = await prisma.reconciliationRun.findMany({ orderBy: { createdAt: 'desc' }, take: 20, include: { _count: { select: { cases: true } } } });
  return NextResponse.json({ runs });
}