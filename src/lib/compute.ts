import type { Award, RosterEntry, ItemMeta, Role } from './types';
import { ROLES } from './types';
import { itemLabel, isTier } from './tier';
import { weeksSince, recencyLabel } from './recency';

export interface ItemCell {
  label: string;
  itemId: number | null;
  quality: number | null;
  icon: string | null;
  isTier: boolean;
}

export interface PlayerRow {
  player: string;
  className: string;
  received: number;
  tierCount: number;
  weeksSinceLast: number | null;
  recencyLabel: string;
  heatmap: number;
  items: ItemCell[];
}

export interface SpecialtyTable {
  role: Role;
  rows: PlayerRow[];
  maxItems: number;
}

export function computeTables(
  awards: Award[],
  roster: RosterEntry[],
  meta: Map<number, ItemMeta>,
  now: Date,
): Record<Role, SpecialtyTable> {
  const roleOf = new Map<string, Role>();
  for (const r of roster) if (r.role && !r.dead) roleOf.set(r.player, r.role);

  const byPlayer = new Map<string, Award[]>();
  for (const a of awards) {
    if (a.response !== 'Mainspec/Need') continue;
    if (!roleOf.has(a.player)) continue;
    (byPlayer.get(a.player) ?? byPlayer.set(a.player, []).get(a.player)!).push(a);
  }

  const rowsByRole: Record<Role, PlayerRow[]> = {
    'caster-dps': [], 'melee-dps': [], tank: [], healer: [],
  };

  for (const [player, list] of byPlayer) {
    list.sort((x, y) => x.awardedAt.getTime() - y.awardedAt.getTime());
    const items: ItemCell[] = list.map((a) => {
      const m = a.itemId !== null ? meta.get(a.itemId) : undefined;
      return {
        label: itemLabel(a.item),
        itemId: a.itemId,
        quality: m ? m.quality : null,
        icon: m ? m.icon : null,
        isTier: isTier(a.item),
      };
    });
    const last = list[list.length - 1].awardedAt;
    const weeks = weeksSince(last, now);
    const row: PlayerRow = {
      player,
      className: list[list.length - 1].className,
      received: list.length,
      tierCount: items.filter((i) => i.isTier).length,
      weeksSinceLast: weeks,
      recencyLabel: recencyLabel(weeks),
      heatmap: 0,
      items,
    };
    rowsByRole[roleOf.get(player)!].push(row);
  }

  const tables = {} as Record<Role, SpecialtyTable>;
  for (const role of ROLES) {
    const rows = rowsByRole[role];
    const maxReceived = rows.reduce((m, r) => Math.max(m, r.received), 0);
    for (const r of rows) {
      r.heatmap = maxReceived === 0 ? 0 : 18 + (r.received / maxReceived) * 55;
    }
    rows.sort((a, b) => a.received - b.received || a.player.localeCompare(b.player));
    tables[role] = { role, rows, maxItems: rows.reduce((m, r) => Math.max(m, r.items.length), 0) };
  }
  return tables;
}
