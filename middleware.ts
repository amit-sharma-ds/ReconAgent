import { NextRequest, NextResponse } from 'next/server';

type Bucket = { count: number; resetAt: number };
const globalForRateLimit = globalThis as unknown as { apiBuckets?: Map<string, Bucket> };
const buckets = globalForRateLimit.apiBuckets ?? new Map<string, Bucket>();
if (process.env.NODE_ENV !== 'production') globalForRateLimit.apiBuckets = buckets;

const limits: Record<string, number> = {
  '/api/guide': 30,
  '/api/ledger': 10,
  '/api/review': 60,
  '/api/reconcile': 30,
};

export function middleware(request: NextRequest) {
  const limit = limits[request.nextUrl.pathname] ?? 120;
  const client = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const key = `${client}:${request.nextUrl.pathname}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) buckets.set(key, { count: 1, resetAt: now + 60_000 });
  else if (bucket.count >= limit) return NextResponse.json({ error: 'Rate limit exceeded. Try again shortly.' }, { status: 429, headers: { 'Retry-After': '60' } });
  else bucket.count += 1;

  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

export const config = { matcher: ['/api/:path*'] };