import type { Award, RosterEntry, Role } from './types';
import { ROLES, ROLE_LABELS } from './types';
import { isTier } from './tier';
import { weeksSince, recencyLabel } from './recency';

export interface SpecialtyBar { role: Role; label: string; received: number; tier: number }
export interface ClassBar { className: string; received: number; tier: number; players: number }
export interface LeaderRow { player: string; className: string; role: Role; value: number; label: string }
export interface WeekBar { weekStart: string; count: number }
export interface TrendsData {
  awardsThisSeason: number;
  tierShare: number;
  longestDrought: LeaderRow | null;
  bySpecialty: SpecialtyBar[];
  byClass: ClassBar[];
  longestDroughts: LeaderRow[];
  heaviest: LeaderRow[];
  weekly: WeekBar[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function weekStartOf(d: Date): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - s.getDay()); // Sunday-start week
  return s;
}

export function computeTrends(awards: Award[], roster: RosterEntry[], now: Date): TrendsData {
  const roleOf = new Map<string, Role>();
  for (const r of roster) if (r.active) roleOf.set(r.player, r.role);

  const relevant = awards.filter((a) => a.response === 'Mainspec/Need' && roleOf.has(a.player));

  const perPlayer = new Map<string, { className: string; role: Role; count: number; last: Date }>();
  for (const a of relevant) {
    const role = roleOf.get(a.player)!;
    const cur = perPlayer.get(a.player);
    if (!cur) perPlayer.set(a.player, { className: a.className, role, count: 1, last: a.awardedAt });
    else {
      cur.count++;
      if (a.awardedAt > cur.last) { cur.last = a.awardedAt; cur.className = a.className; }
    }
  }

  const tierTotal = relevant.filter((a) => isTier(a.item)).length;

  const bySpecialty: SpecialtyBar[] = ROLES.map((role) => {
    const rows = relevant.filter((a) => roleOf.get(a.player) === role);
    return { role, label: ROLE_LABELS[role], received: rows.length, tier: rows.filter((a) => isTier(a.item)).length };
  });

  const classMap = new Map<string, { received: number; tier: number; players: Set<string> }>();
  for (const a of relevant) {
    const c = classMap.get(a.className) ?? { received: 0, tier: 0, players: new Set() };
    c.received++; if (isTier(a.item)) c.tier++; c.players.add(a.player);
    classMap.set(a.className, c);
  }
  const byClass: ClassBar[] = [...classMap.entries()]
    .map(([className, c]) => ({ className, received: c.received, tier: c.tier, players: c.players.size }))
    .sort((x, y) => y.received - x.received);

  const leaders: LeaderRow[] = [...perPlayer.entries()].map(([player, p]) => {
    const weeks = weeksSince(p.last, now);
    return { player, className: p.className, role: p.role, value: p.count, label: recencyLabel(weeks), _weeks: weeks } as LeaderRow & { _weeks: number };
  });
  const heaviest = [...leaders].sort((a, b) => b.value - a.value).slice(0, 5);
  const droughts = [...(leaders as (LeaderRow & { _weeks: number })[])]
    .sort((a, b) => b._weeks - a._weeks)
    .slice(0, 5)
    .map((l) => ({ player: l.player, className: l.className, role: l.role, value: l._weeks, label: l.label }));

  // weekly buckets
  const buckets = new Map<number, number>();
  for (const a of relevant) buckets.set(+weekStartOf(a.awardedAt), (buckets.get(+weekStartOf(a.awardedAt)) ?? 0) + 1);
  const weekly: WeekBar[] = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(-10)
    .map(([ts, count]) => { const d = new Date(ts); return { weekStart: `${MONTHS[d.getMonth()]} ${d.getDate()}`, count }; });

  return {
    awardsThisSeason: relevant.length,
    tierShare: relevant.length ? tierTotal / relevant.length : 0,
    longestDrought: droughts[0] ?? null,
    bySpecialty,
    byClass,
    longestDroughts: droughts,
    heaviest,
    weekly,
  };
}
