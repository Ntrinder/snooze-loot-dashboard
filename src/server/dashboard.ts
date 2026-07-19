import type { ReadStore } from '../db/stores';
import type { Role, ItemMeta, Phase, Award } from '../lib/types';
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
  phase: Phase;
  hasPhase2: boolean;
}

export function filterByPhase(awards: Award[], phase: Phase, boundary: Date | null): Award[] {
  if (phase === 'all') return awards;
  if (!boundary) return phase === 'phase1' ? awards : [];
  return awards.filter((a) => (phase === 'phase1' ? a.awardedAt < boundary : a.awardedAt >= boundary));
}

export async function buildDashboard(store: ReadStore, now: Date, phase: Phase = 'all'): Promise<DashboardData> {
  const [awards, metaRows, roster, run, phase2Raw] = await Promise.all([
    store.allAwards(), store.allItemMeta(), store.allRoster(), store.lastRun(), store.getConfig('phase2_start'),
  ]);
  const boundary = phase2Raw ? new Date(phase2Raw) : null;
  const filtered = filterByPhase(awards, phase, boundary);
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
    tables: computeTables(filtered, roster, meta, now),
    trends: computeTrends(filtered, roster, now),
    phase,
    hasPhase2: boundary !== null,
  };
}
