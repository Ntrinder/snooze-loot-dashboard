import { and, desc, eq, isNull } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { awards, itemMeta, roster, ingestRuns, config } from './schema';
import type { Award, ItemMeta, RosterEntry, Role, Raid } from '../lib/types';
import { dedupKey } from '../lib/dedup';

export interface RunRecord {
  ranAt: Date;
  status: 'ok' | 'error';
  awardsSeen: number;
  awardsNew: number;
  itemsEnriched: number;
  errorMessage: string | null;
}

export interface WriteStore {
  upsertAwards(a: Award[]): Promise<number>;
  knownItemIds(): Promise<Set<number>>;
  insertItemMeta(m: ItemMeta): Promise<void>;
  setRole(player: string, role: Role | null): Promise<void>;
  setDead(player: string, dead: boolean): Promise<void>;
  setRaid(player: string, raid: Raid | null): Promise<void>;
  setConfig(key: string, value: string): Promise<void>;
  recordRun(run: RunRecord): Promise<void>;
}

export interface ReadStore {
  allAwards(): Promise<Award[]>;
  allItemMeta(): Promise<ItemMeta[]>;
  allRoster(): Promise<RosterEntry[]>;
  distinctPlayers(): Promise<string[]>;
  getConfig(key: string): Promise<string | null>;
  lastRun(): Promise<RunRecord | null>;
}

// A roster row with no role, not dead, and no raid carries no information — drop it.
const emptyRow = (player: string) =>
  and(eq(roster.player, player), isNull(roster.role), eq(roster.dead, false), isNull(roster.raid));

export function drizzleStores(db: PostgresJsDatabase<typeof schema>): WriteStore & ReadStore {
  return {
    async upsertAwards(list) {
      if (!list.length) return 0;
      const rows = list.map((a) => ({
        dedupKey: dedupKey(a),
        player: a.player,
        awardedAt: a.awardedAt,
        item: a.item,
        itemId: a.itemId,
        itemString: a.itemString,
        response: a.response,
        className: a.className,
        instance: a.instance,
        boss: a.boss,
        note: a.note,
      }));
      const inserted = await db.insert(awards).values(rows).onConflictDoNothing({ target: awards.dedupKey }).returning({ id: awards.id });
      return inserted.length;
    },
    async knownItemIds() {
      const rows = await db.select({ id: itemMeta.itemId }).from(itemMeta);
      return new Set(rows.map((r) => r.id));
    },
    async insertItemMeta(m) {
      await db.insert(itemMeta).values(m).onConflictDoNothing({ target: itemMeta.itemId });
    },
    async setRole(player, role) {
      await db.insert(roster).values({ player, role, dead: false })
        .onConflictDoUpdate({ target: roster.player, set: { role } });
      await db.delete(roster).where(emptyRow(player));
    },
    async setDead(player, dead) {
      await db.insert(roster).values({ player, role: null, dead })
        .onConflictDoUpdate({ target: roster.player, set: { dead } });
      await db.delete(roster).where(emptyRow(player));
    },
    async setRaid(player, raid) {
      await db.insert(roster).values({ player, role: null, dead: false, raid })
        .onConflictDoUpdate({ target: roster.player, set: { raid } });
      await db.delete(roster).where(emptyRow(player));
    },
    async setConfig(key, value) {
      await db.insert(config).values({ key, value })
        .onConflictDoUpdate({ target: config.key, set: { value } });
    },
    async recordRun(run) {
      await db.insert(ingestRuns).values({
        ranAt: run.ranAt, status: run.status, awardsSeen: run.awardsSeen,
        awardsNew: run.awardsNew, itemsEnriched: run.itemsEnriched, errorMessage: run.errorMessage,
      });
    },
    async allAwards() {
      const rows = await db.select().from(awards);
      return rows.map((r) => ({
        player: r.player, awardedAt: r.awardedAt, item: r.item, itemId: r.itemId,
        itemString: r.itemString, response: r.response, className: r.className,
        instance: r.instance, boss: r.boss, note: r.note,
      }));
    },
    async allItemMeta() {
      const rows = await db.select().from(itemMeta);
      return rows.map((r) => ({ itemId: r.itemId, name: r.name, quality: r.quality, icon: r.icon }));
    },
    async allRoster() {
      const rows = await db.select().from(roster);
      return rows.map((r) => ({ player: r.player, role: (r.role as Role | null), dead: r.dead, raid: (r.raid as Raid | null) }));
    },
    async distinctPlayers() {
      const rows = await db.selectDistinct({ player: awards.player }).from(awards);
      return rows.map((r) => r.player).sort((a, b) => a.localeCompare(b));
    },
    async getConfig(key) {
      const [r] = await db.select().from(config).where(eq(config.key, key)).limit(1);
      return r?.value ?? null;
    },
    async lastRun() {
      const [r] = await db.select().from(ingestRuns).orderBy(desc(ingestRuns.ranAt)).limit(1);
      if (!r) return null;
      return { ranAt: r.ranAt, status: r.status as 'ok' | 'error', awardsSeen: r.awardsSeen, awardsNew: r.awardsNew, itemsEnriched: r.itemsEnriched, errorMessage: r.errorMessage };
    },
  };
}
