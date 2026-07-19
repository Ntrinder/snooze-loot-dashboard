import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseAwards } from './csv';
import { computeTables } from './compute';
import type { RosterEntry, ItemMeta } from './types';

const csv = readFileSync(path.join(__dirname, '../../tests/fixtures/dump.csv'), 'utf8');
const awards = parseAwards(csv);
const now = new Date(2026, 2, 22, 12, 0, 0);

const roster: RosterEntry[] = [
  { player: 'Fennie', role: 'caster-dps', dead: false },
  { player: 'Azurepath', role: 'caster-dps', dead: false },
  { player: 'Kouzbee', role: 'tank', dead: false },
  { player: 'Boonage', role: 'healer', dead: false },
];

const meta = new Map<number, ItemMeta>([
  [28776, { itemId: 28776, name: "Liar's Tongue Gloves", quality: 3, icon: 'inv_gloves_25' }],
]);

describe('computeTables', () => {
  const tables = computeTables(awards, roster, meta, now);

  it('groups casters and excludes Offspec/Greed', () => {
    const casters = tables['caster-dps'].rows;
    const azure = casters.find((r) => r.player === 'Azurepath')!;
    // Azure has 2 Mainspec/Need (Belt, Robe) — the Offspec trinket is excluded
    expect(azure.received).toBe(2);
    expect(azure.items.map((i) => i.label)).toEqual(['Belt of Divine Inspiration', 'Tier Chest']);
  });

  it('counts tier tokens', () => {
    const fennie = tables['caster-dps'].rows.find((r) => r.player === 'Fennie')!;
    // Fennie: Liar's Tongue Gloves + Cowl of the Fallen Hero (tier)
    expect(fennie.received).toBe(2);
    expect(fennie.tierCount).toBe(1);
  });

  it('sorts ascending by received (least-looted first)', () => {
    const received = tables['caster-dps'].rows.map((r) => r.received);
    expect(received).toEqual([...received].sort((a, b) => a - b));
  });

  it('attaches item meta when known and null when unknown', () => {
    const fennie = tables['caster-dps'].rows.find((r) => r.player === 'Fennie')!;
    const gloves = fennie.items.find((i) => i.itemId === 28776)!;
    expect(gloves.quality).toBe(3);
    expect(gloves.icon).toBe('inv_gloves_25');
    const cowl = fennie.items.find((i) => i.isTier)!;
    expect(cowl.quality).toBeNull();
  });

  it('computes heatmap relative to the specialty max', () => {
    const rows = tables['caster-dps'].rows;
    const max = Math.max(...rows.map((r) => r.received));
    const top = rows.find((r) => r.received === max)!;
    expect(top.heatmap).toBeCloseTo(18 + 55, 5);
  });

  it('produces an entry for every role', () => {
    expect(Object.keys(tables).sort()).toEqual(['caster-dps', 'healer', 'melee-dps', 'tank']);
    expect(tables['melee-dps'].rows).toHaveLength(0);
  });

  it('excludes dead players even when they have a role', () => {
    const withDead = roster.map((r) => (r.player === 'Fennie' ? { ...r, dead: true } : r));
    const t = computeTables(awards, withDead, meta, now);
    expect(t['caster-dps'].rows.map((r) => r.player)).not.toContain('Fennie');
    expect(t['caster-dps'].rows.map((r) => r.player)).toContain('Azurepath');
  });

  it('excludes players with no role assigned', () => {
    const noRole: RosterEntry[] = [{ player: 'Fennie', role: null, dead: false }];
    const t = computeTables(awards, noRole, meta, now);
    expect(t['caster-dps'].rows).toHaveLength(0);
  });
});
