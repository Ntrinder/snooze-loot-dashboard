import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseAwards } from '../lib/csv';
import { buildDashboard, filterByPhase, filterRosterByRaid } from './dashboard';
import type { ReadStore, RunRecord } from '../db/stores';
import type { RosterEntry, Award } from '../lib/types';

const csv = readFileSync(path.join(__dirname, '../../tests/fixtures/dump.csv'), 'utf8');
const roster: RosterEntry[] = [
  { player: 'Fennie', role: 'caster-dps', dead: false, raid: 1 },
  { player: 'Azurepath', role: 'caster-dps', dead: false, raid: 2 },
];
const now = new Date(2026, 2, 22, 12, 0, 0);

function store(run: RunRecord | null, phase2Start: string | null = null): ReadStore {
  return {
    allAwards: async () => parseAwards(csv),
    allItemMeta: async () => [{ itemId: 28776, name: "Liar's Tongue Gloves", quality: 3, icon: 'inv_gloves_25' }],
    allRoster: async () => roster,
    distinctPlayers: async () => [...new Set(parseAwards(csv).map((a) => a.player))].sort(),
    getConfig: async (key) => (key === 'phase2_start' ? phase2Start : null),
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

  it('hasPhase2 is false and phase echoed when no boundary is configured', async () => {
    const data = await buildDashboard(store(null), now, 'phase2');
    expect(data.hasPhase2).toBe(false);
    expect(data.phase).toBe('phase2');
  });

  it('splits awards by the configured phase-2 boundary', async () => {
    const boundary = new Date(2026, 2, 1).toISOString(); // Mar 1 — awards before are Phase 1
    const ok: RunRecord = { ranAt: now, status: 'ok', awardsSeen: 0, awardsNew: 0, itemsEnriched: 0, errorMessage: null };
    const p1 = await buildDashboard(store(ok, boundary), now, 'phase1');
    const p2 = await buildDashboard(store(ok, boundary), now, 'phase2');
    const all = await buildDashboard(store(ok, boundary), now, 'all');
    expect(p1.hasPhase2).toBe(true);
    expect(p1.trends.awardsThisSeason).toBe(2); // two 2/22 mainspec awards
    expect(p2.trends.awardsThisSeason).toBe(2); // two 3/1 mainspec awards
    expect(all.trends.awardsThisSeason).toBe(4);
  });

  it('hasRaids is true when any player has a raid, and defaults to both', async () => {
    const data = await buildDashboard(store(null), now);
    expect(data.hasRaids).toBe(true);
    expect(data.raid).toBe('both');
    expect(data.tables['caster-dps'].rows.length).toBe(2);
  });

  it('filters the roster to the selected raid', async () => {
    const r1 = await buildDashboard(store(null), now, 'all', 'raid1');
    const r2 = await buildDashboard(store(null), now, 'all', 'raid2');
    expect(r1.raid).toBe('raid1');
    expect(r1.tables['caster-dps'].rows.map((row) => row.player)).toEqual(['Fennie']);
    expect(r2.tables['caster-dps'].rows.map((row) => row.player)).toEqual(['Azurepath']);
  });
});

describe('filterRosterByRaid', () => {
  const r: RosterEntry[] = [
    { player: 'A', role: 'tank', dead: false, raid: 1 },
    { player: 'B', role: 'healer', dead: false, raid: 2 },
    { player: 'C', role: 'tank', dead: false, raid: null },
  ];
  it('returns everyone for "both"', () => {
    expect(filterRosterByRaid(r, 'both').map((e) => e.player)).toEqual(['A', 'B', 'C']);
  });
  it('keeps only the matching raid, dropping unassigned', () => {
    expect(filterRosterByRaid(r, 'raid1').map((e) => e.player)).toEqual(['A']);
    expect(filterRosterByRaid(r, 'raid2').map((e) => e.player)).toEqual(['B']);
  });
});

describe('filterByPhase', () => {
  const a = (d: Date): Award => ({
    player: 'x', awardedAt: d, item: 'i', itemId: null, itemString: '', response: 'Mainspec/Need',
    className: 'MAGE', instance: '', boss: '', note: '',
  });
  const boundary = new Date(2026, 4, 31);
  const before = a(new Date(2026, 3, 19));
  const after = a(new Date(2026, 5, 1));

  it('returns everything for "all"', () => {
    expect(filterByPhase([before, after], 'all', boundary)).toHaveLength(2);
  });
  it('phase1 keeps awards strictly before the boundary', () => {
    expect(filterByPhase([before, after], 'phase1', boundary)).toEqual([before]);
  });
  it('phase2 keeps awards on/after the boundary', () => {
    expect(filterByPhase([before, after], 'phase2', boundary)).toEqual([after]);
  });
  it('with no boundary, phase1 is everything and phase2 is empty', () => {
    expect(filterByPhase([before, after], 'phase1', null)).toHaveLength(2);
    expect(filterByPhase([before, after], 'phase2', null)).toHaveLength(0);
  });
});
