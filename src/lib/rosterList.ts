import type { Role, Raid, RosterEntry } from './types';
import { ROLES } from './types';

export interface RosterListEntry {
  player: string;
  role: Role | null;
  dead: boolean;
  raid: Raid | null;
}

export function isRole(v: unknown): v is Role {
  return typeof v === 'string' && (ROLES as string[]).includes(v);
}

export function isRaid(v: unknown): v is Raid {
  return v === 1 || v === 2;
}

export function mergeRosterList(players: string[], roster: RosterEntry[]): RosterListEntry[] {
  const byPlayer = new Map<string, RosterEntry>();
  for (const r of roster) byPlayer.set(r.player, r);
  const all = new Set<string>([...players, ...roster.map((r) => r.player)]);
  return [...all]
    .sort((a, b) => a.localeCompare(b))
    .map((player) => {
      const r = byPlayer.get(player);
      return { player, role: r?.role ?? null, dead: r?.dead ?? false, raid: r?.raid ?? null };
    });
}
