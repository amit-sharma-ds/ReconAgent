import { PrismaClient } from '@prisma/client';
import type { LedgerEntry, Settlement } from './types';
import type { Reconciliation } from './types';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const databaseUrl = process.env.DATABASE_URL ?? 'file:/tmp/reconagent.db';
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ datasources: { db: { url: databaseUrl } } });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function saveBatch(settlements: Settlement[], ledger: LedgerEntry[], source: string) {
  try {
    await prisma.$transaction([
      ...settlements.map((settlement) => prisma.settlement.upsert({
        where: { id: settlement.id },
        update: { ...settlement, source },
        create: { ...settlement, source },
      })),
      ...ledger.map((entry) => prisma.ledgerEntry.upsert({
        where: { id: entry.id },
        update: entry,
        create: entry,
      })),
    ]);

    const [storedSettlements, storedLedger] = await Promise.all([
      prisma.settlement.findMany({ where: { id: { in: settlements.map(({ id }) => id) } } }),
      prisma.ledgerEntry.findMany(),
    ]);

    return {
      settlements: storedSettlements.map(({ id, amount, created_at, receipt, status }) => ({ id, amount, created_at, receipt, status })),
      ledger: storedLedger.map(({ id, amount, date, receipt, note }) => ({ id, amount, date, receipt, note: note ?? undefined })),
    } satisfies { settlements: Settlement[]; ledger: LedgerEntry[] };
  } catch {
    // Keep the public demo usable until a managed DATABASE_URL is configured.
    return { settlements, ledger };
  }
}

export async function saveRun(source: string, records: Reconciliation[]) {
  const matched = records.filter(record => record.rule === 'exact').length;
  const runId = `run_${Date.now()}`;
  try {
    await prisma.reconciliationRun.create({
      data: {
        id: runId,
        source,
        total: records.length,
        matched,
        exceptions: records.length - matched,
        matchRate: records.length ? Math.round(matched / records.length * 100) : 0,
        cases: {
          create: records.map((record, index) => ({
            id: `${runId}_${index}_${record.settlement.id}`,
            settlementId: record.settlement.id,
            ledgerId: record.ledger?.id,
            status: record.status,
            rule: record.rule,
            confidence: record.confidence,
            reason: record.reason,
            auditJson: JSON.stringify(record.audit),
          })),
        },
      },
    });
  } catch {
    // Persistence becomes active automatically when DATABASE_URL is supplied.
  }
  return runId;
}