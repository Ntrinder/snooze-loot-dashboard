import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseAwards } from '../lib/csv';
import { buildDashboard } from './dashboard';
import type { ReadStore, RunRecord } from '../db/stores';
import type { RosterEntry } from '../lib/types';

const csv = readFileSync(path.join(__dirname, '../../tests/fixtures/dump.csv'), 'utf8');
const roster: RosterEntry[] = [
  { player: 'Fennie', role: 'caster-dps', active: true },
  { player: 'Azurepath', role: 'caster-dps', active: true },
];
const now = new Date(2026, 2, 22, 12, 0, 0);

function store(run: RunRecord | null): ReadStore {
  return {
    allAwards: async () => parseAwards(csv),
    allItemMeta: async () => [{ itemId: 28776, name: "Liar's Tongue Gloves", quality: 3, icon: 'inv_gloves_25' }],
    allRoster: async () => roster,
    distinctPlayers: async () => [...new Set(parseAwards(csv).map((a) => a.player))].sort(),
    lastRun: async () => run,
  };
}

describe('buildDashboard', () => {
  it('assembles tables + trends + ok ingest status', async () => {
    const ranAt = new Date(2026, 2, 22, 11, 30, 0); // 30 min before now
    const data = await buildDashboard(store({ ranAt, status: 'ok', awardsSeen: 7, awardsNew: 7, itemsEnriched: 6, errorMessage: null }), now);
    expect(data.ingest.status).toBe('ok');
    expect(data.ingest.ageMinutes).toBe(30);
    expect(data.tables['caster-dps'].rows.length).toBe(2);
    expect(data.trends.awardsThisSeason).toBe(4);
  });

  it('reports "never" when there is no run', async () => {
    const data = await buildDashboard(store(null), now);
    expect(data.ingest.status).toBe('never');
    expect(data.ingest.ageMinutes).toBeNull();
  });
});
