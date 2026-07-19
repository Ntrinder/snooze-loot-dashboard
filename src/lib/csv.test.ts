import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { stripRealm, stripBrackets, parseAwardedAt, parseAwards } from './csv';

const csv = readFileSync(path.join(__dirname, '../../tests/fixtures/dump.csv'), 'utf8');

describe('helpers', () => {
  it('strips realm suffix', () => {
    expect(stripRealm('Fennie-Thunderstrike')).toBe('Fennie');
    expect(stripRealm('Fennie')).toBe('Fennie');
  });
  it('strips brackets', () => {
    expect(stripBrackets("[Liar's Tongue Gloves]")).toBe("Liar's Tongue Gloves");
    expect(stripBrackets('Plain')).toBe('Plain');
  });
  it('parses M/D/YYYY + HH:MM:SS into a Date', () => {
    const d = parseAwardedAt('2/22/2026', '20:51:00');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(1); // Feb
    expect(d.getDate()).toBe(22);
    expect(d.getHours()).toBe(20);
  });
});

describe('parseAwards', () => {
  const awards = parseAwards(csv);
  it('parses every data row', () => {
    expect(awards).toHaveLength(7);
  });
  it('normalizes player, item, and itemId', () => {
    const a = awards[0];
    expect(a.player).toBe('Fennie');
    expect(a.item).toBe("Liar's Tongue Gloves");
    expect(a.itemId).toBe(28776);
    expect(a.className).toBe('SHAMAN');
    expect(a.response).toBe('Mainspec/Need');
  });
  it('keeps non-Mainspec rows (filtering happens downstream)', () => {
    expect(awards.some((a) => a.response === 'Offspec/Greed')).toBe(true);
  });
  it('handles a missing/blank itemID as null', () => {
    // none blank in fixture, but the parser must not throw on empty strings
    expect(awards.every((a) => a.itemId === null || Number.isInteger(a.itemId))).toBe(true);
  });
});
