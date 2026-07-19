import type { Role, RosterEntry } from './types';
import { ROLES } from './types';

export interface RosterListEntry {
  player: string;
  role: Role | null;
}

export function isRole(v: unknown): v is Role {
  return typeof v === 'string' && (ROLES as string[]).includes(v);
}

export function mergeRosterList(players: string[], roster: RosterEntry[]): RosterListEntry[] {
  const roleOf = new Map<string, Role>();
  for (const r of roster) roleOf.set(r.player, r.role);
  const all = new Set<string>([...players, ...roster.map((r) => r.player)]);
  return [...all]
    .sort((a, b) => a.localeCompare(b))
    .map((player) => ({ player, role: roleOf.get(player) ?? null }));
}
