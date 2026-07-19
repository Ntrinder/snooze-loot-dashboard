import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseAwards } from './csv';
import { computeTrends } from './trends';
import type { RosterEntry } from './types';

const csv = readFileSync(path.join(__dirname, '../../tests/fixtures/dump.csv'), 'utf8');
const awards = parseAwards(csv);
const now = new Date(2026, 2, 22, 12, 0, 0);

const roster: RosterEntry[] = [
  { player: 'Fennie', role: 'caster-dps', dead: false, raid: null },
  { player: 'Azurepath', role: 'caster-dps', dead: false, raid: null },
  { player: 'Kouzbee', role: 'tank', dead: false, raid: null },
  { player: 'Boonage', role: 'healer', dead: false, raid: null },
];

describe('computeTrends', () => {
  const t = computeTrends(awards, roster, now);

  it('counts only Mainspec/Need from rostered players', () => {
    // Fennie 2, Azure 2, Kouzbee 1, Boonage 1 = 6 (Offspec trinket excluded)
    expect(t.awardsThisSeason).toBe(6);
  });
  it('computes tier share', () => {
    // Tier tokens: Boonage Pauldrons, Azure Robe, Fennie Cowl = 3 of 6
    expect(t.tierShare).toBeCloseTo(0.5, 5);
  });
  it('breaks down by specialty', () => {
    const caster = t.bySpecialty.find((b) => b.role === 'caster-dps')!;
    expect(caster.received).toBe(4);
    expect(caster.tier).toBe(2);
  });
  it('breaks down by class sorted desc', () => {
    const received = t.byClass.map((c) => c.received);
    expect(received).toEqual([...received].sort((a, b) => b - a));
  });
  it('surfaces heaviest and droughts (top 5)', () => {
    expect(t.heaviest.length).toBeLessThanOrEqual(5);
    expect(t.heaviest[0].value).toBeGreaterThanOrEqual(t.heaviest[t.heaviest.length - 1].value);
    expect(t.longestDrought).not.toBeNull();
  });
  it('does not leak internal _weeks field into heaviest or longestDroughts', () => {
    const expectedKeys = ['className', 'label', 'player', 'role', 'value'];
    expect(Object.keys(t.heaviest[0]).sort()).toEqual(expectedKeys);
    expect(Object.keys(t.longestDroughts[0]).sort()).toEqual(expectedKeys);
  });
  it('buckets weekly activity oldest-first', () => {
    expect(t.weekly.length).toBeGreaterThan(0);
    expect(t.weekly.length).toBeLessThanOrEqual(10);
  });
});
