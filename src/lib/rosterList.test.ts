import { describe, it, expect } from 'vitest';
import { mergeRosterList, isRole } from './rosterList';
import type { RosterEntry } from './types';

describe('mergeRosterList', () => {
  const roster: RosterEntry[] = [{ player: 'Azurepath', role: 'caster-dps', dead: false }];

  it('unions award players with roster and marks unassigned as null', () => {
    const list = mergeRosterList(['Fennie', 'Azurepath'], roster);
    expect(list).toEqual([
      { player: 'Azurepath', role: 'caster-dps', dead: false },
      { player: 'Fennie', role: null, dead: false },
    ]);
  });
  it('includes roster players even if absent from awards', () => {
    const list = mergeRosterList([], roster);
    expect(list).toEqual([{ player: 'Azurepath', role: 'caster-dps', dead: false }]);
  });
  it('carries the dead flag through for roster players', () => {
    const list = mergeRosterList(['Fennie'], [{ player: 'Fennie', role: 'healer', dead: true }]);
    expect(list).toEqual([{ player: 'Fennie', role: 'healer', dead: true }]);
  });
  it('dedupes and sorts', () => {
    const list = mergeRosterList(['Zed', 'Ana', 'Zed'], []);
    expect(list.map((e) => e.player)).toEqual(['Ana', 'Zed']);
  });
});

describe('isRole', () => {
  it('accepts valid roles only', () => {
    expect(isRole('caster-dps')).toBe(true);
    expect(isRole('healer')).toBe(true);
    expect(isRole('bard')).toBe(false);
    expect(isRole(null)).toBe(false);
  });
});
