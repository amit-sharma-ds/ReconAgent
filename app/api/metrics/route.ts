import { NextResponse } from 'next/server';
import { metrics } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

export async function GET() {
  return new NextResponse(metrics.prometheus(), { headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' } });
}