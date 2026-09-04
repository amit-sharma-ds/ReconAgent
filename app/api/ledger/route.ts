import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function parseCsv(csv: string) {
  if (csv.length > 5_000_000) throw new Error('CSV file is too large. Maximum size is 5 MB.');
  const rows = csv.trim().split(/\r?\n/).map(row => row.split(',').map(value => value.trim().replace(/^"|"$/g, '')));
  const header = rows.shift()?.map(value => value.toLowerCase());
  if (!header?.includes('id') || !header.includes('receipt') || !header.includes('amount') || !header.includes('date')) throw new Error('CSV must include id, receipt, amount and date columns.');
  const parsed = rows.filter(row => row.length >= header.length).map(row => Object.fromEntries(header.map((key, index) => [key, row[index]])));
  if (!parsed.length || parsed.length > 50_000) throw new Error('CSV must contain between 1 and 50,000 data rows.');
  return parsed;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { csv?: string };
    if (!body.csv) return NextResponse.json({ error: 'CSV content is required.' }, { status: 400 });
    const rows = parseCsv(body.csv);
    const entries = rows.map(row => ({ id: row.id?.slice(0, 120), receipt: row.receipt?.slice(0, 120), amount: Number(row.amount), date: row.date, note: row.note?.slice(0, 500) || null }));
    if (entries.some(entry => !entry.id || !entry.receipt || !Number.isInteger(entry.amount) || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date))) throw new Error('Each row needs valid id, receipt, integer paise amount and YYYY-MM-DD date.');
    await prisma.$transaction(entries.map(entry => prisma.ledgerEntry.upsert({ where: { id: entry.id }, update: entry, create: entry })));
    return NextResponse.json({ imported: entries.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to import ledger CSV.' }, { status: 400 });
  }
}