import { pgTable, serial, text, integer, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const awards = pgTable(
  'awards',
  {
    id: serial('id').primaryKey(),
    dedupKey: text('dedup_key').notNull().unique(),
    player: text('player').notNull(),
    awardedAt: timestamp('awarded_at', { withTimezone: true }).notNull(),
    item: text('item').notNull(),
    itemId: integer('item_id'),
    itemString: text('item_string').notNull().default(''),
    response: text('response').notNull(),
    className: text('class_name').notNull(),
    instance: text('instance').notNull().default(''),
    boss: text('boss').notNull().default(''),
    note: text('note').notNull().default(''),
  },
  (t) => ({ playerIdx: index('awards_player_idx').on(t.player) }),
);

export const itemMeta = pgTable('item_meta', {
  itemId: integer('item_id').primaryKey(),
  name: text('name').notNull(),
  quality: integer('quality').notNull().default(0),
  icon: text('icon').notNull().default(''),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
});

export const roster = pgTable('roster', {
  player: text('player').primaryKey(),
  role: text('role'),
  dead: boolean('dead').notNull().default(false),
});

export const config = pgTable('config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const ingestRuns = pgTable('ingest_runs', {
  id: serial('id').primaryKey(),
  ranAt: timestamp('ran_at', { withTimezone: true }).notNull().defaultNow(),
  status: text('status').notNull(),
  awardsSeen: integer('awards_seen').notNull().default(0),
  awardsNew: integer('awards_new').notNull().default(0),
  itemsEnriched: integer('items_enriched').notNull().default(0),
  errorMessage: text('error_message'),
});
