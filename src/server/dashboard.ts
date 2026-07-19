import type { ReadStore } from '../db/stores';
import type { Role, ItemMeta } from '../lib/types';
import { computeTables, type SpecialtyTable } from '../lib/compute';
import { computeTrends, type TrendsData } from '../lib/trends';

export interface IngestStatus {
  status: 'ok' | 'error' | 'never';
  ranAt: string | null;
  ageMinutes: number | null;
  error: string | null;
}

export interface DashboardData {
  generatedAt: string;
  ingest: IngestStatus;
  tables: Record<Role, SpecialtyTable>;
  trends: TrendsData;
}

export async function buildDashboard(store: ReadStore, now: Date): Promise<DashboardData> {
  const [awards, metaRows, roster, run] = await Promise.all([
    store.allAwards(), store.allItemMeta(), store.allRoster(), store.lastRun(),
  ]);
  const meta = new Map<number, ItemMeta>(metaRows.map((m) => [m.itemId, m]));

  const ingest: IngestStatus = run
    ? {
        status: run.status,
        ranAt: run.ranAt.toISOString(),
        ageMinutes: Math.round((now.getTime() - run.ranAt.getTime()) / 60000),
        error: run.errorMessage,
      }
    : { status: 'never', ranAt: null, ageMinutes: null, error: null };

  return {
    generatedAt: now.toISOString(),
    ingest,
    tables: computeTables(awards, roster, meta, now),
    trends: computeTrends(awards, roster, now),
  };
}
