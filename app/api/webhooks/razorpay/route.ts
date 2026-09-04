import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

type RazorpayWebhook = {
  event?: string;
  payload?: { order?: { entity?: { id?: string; amount?: number; created_at?: number; receipt?: string; status?: string } } };
};

function validSignature(body: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const body = await request.text();
  if (!secret || !validSignature(body, request.headers.get('x-razorpay-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid Razorpay webhook signature.' }, { status: 401 });
  }

  try {
    const webhook = JSON.parse(body) as RazorpayWebhook;
    const order = webhook.payload?.order?.entity;
    if (!order?.id || typeof order.amount !== 'number' || typeof order.created_at !== 'number') {
      return NextResponse.json({ received: true, ignored: true });
    }
    await prisma.settlement.upsert({
      where: { id: order.id },
      update: { amount: order.amount, created_at: order.created_at, receipt: order.receipt || order.id, status: order.status || webhook.event || 'received', source: 'razorpay-webhook' },
      create: { id: order.id, amount: order.amount, created_at: order.created_at, receipt: order.receipt || order.id, status: order.status || webhook.event || 'received', source: 'razorpay-webhook' },
    });
    return NextResponse.json({ received: true, orderId: order.id });
  } catch {
    return NextResponse.json({ error: 'Malformed Razorpay webhook.' }, { status: 400 });
  }
}