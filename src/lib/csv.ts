import Papa from 'papaparse';
import type { Award } from './types';

export function stripRealm(name: string): string {
  const i = name.indexOf('-');
  return i === -1 ? name : name.slice(0, i);
}

export function stripBrackets(s: string): string {
  return s.replace(/^\[/, '').replace(/\]$/, '').trim();
}

export function parseAwardedAt(date: string, time: string): Date {
  const [m, d, y] = date.split('/').map((n) => parseInt(n, 10));
  const [hh = 0, mm = 0, ss = 0] = (time || '').split(':').map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d, hh, mm, ss);
}

interface RawRow {
  player: string;
  date: string;
  time: string;
  item: string;
  itemID: string;
  itemString: string;
  response: string;
  class: string;
  instance: string;
  boss: string;
  note: string;
}

export function parseAwards(csv: string): Award[] {
  const { data } = Papa.parse<RawRow>(csv, { header: true, skipEmptyLines: true });
  const out: Award[] = [];
  for (const r of data) {
    if (!r.player || !r.date) continue;
    const id = parseInt(r.itemID, 10);
    out.push({
      player: stripRealm(r.player),
      awardedAt: parseAwardedAt(r.date, r.time),
      item: stripBrackets(r.item || ''),
      itemId: Number.isInteger(id) ? id : null,
      itemString: r.itemString || '',
      response: r.response || '',
      className: (r.class || '').toUpperCase(),
      instance: r.instance || '',
      boss: r.boss || '',
      note: r.note || '',
    });
  }
  return out;
}
