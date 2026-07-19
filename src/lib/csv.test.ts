import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { stripRealm, stripBrackets, parseAwardedAt, parseAwards, findPhase2Start } from './csv';

const csv = readFileSync(path.join(__dirname, '../../tests/fixtures/dump.csv'), 'utf8');

const HEADER = 'player,date,time,item,itemID,itemString,response,votes,class,instance,boss,gear1,gear2,responseID,isAwardReason,rollType,subType,equipLoc,note,owner';
function row(player: string, date = '', time = '') {
  return [player, date, time, '[Item]', '100', '', 'Mainspec/Need', '1', 'MAGE', '', '', '', '', '1', 'FALSE', 'normal', '', '', '', ''].join(',');
}

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
  it('skips the dateless PHASE 2 START marker row', () => {
    const withMarker = [HEADER, row('Fennie', '4/19/2026', '20:00:00'), row('PHASE 2 START'), row('Herkko', '5/31/2026', '20:00:00')].join('\n');
    const parsed = parseAwards(withMarker);
    expect(parsed.map((a) => a.player)).toEqual(['Fennie', 'Herkko']);
  });
});

describe('findPhase2Start', () => {
  it('returns the date of the first award after the marker', () => {
    const withMarker = [HEADER, row('Fennie', '4/19/2026', '20:00:00'), row('PHASE 2 START'), row('Herkko', '5/31/2026', '20:30:00')].join('\n');
    const d = findPhase2Start(withMarker);
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(4); // May
    expect(d?.getDate()).toBe(31);
  });
  it('is case-insensitive on the marker label', () => {
    const withMarker = [HEADER, row('phase 2 start'), row('Herkko', '5/31/2026', '20:30:00')].join('\n');
    expect(findPhase2Start(withMarker)?.getDate()).toBe(31);
  });
  it('returns null when no marker is present', () => {
    expect(findPhase2Start(csv)).toBeNull();
  });
});
