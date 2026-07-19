# Snooze Loot Dashboard — Design Spec

**Date:** 2026-07-19
**Status:** Approved design, pre-implementation
**Owner:** Niall (Ntrinder) — caster-DPS loot expert on the guild loot council

## 1. Purpose

Replace the manual weekly rebuild of the guild's loot-council decision tables with a
zero-effort live web dashboard. A RCLootCouncil (RCLC) addon logs every loot award into a
**public Google Sheet the council does not own**. Today a councillor hand-tallies, transposes,
sorts, and colour-codes that data into per-specialty tables each week. This app does that
automatically: it reads the public sheet on a schedule, stores the data in a database, and
serves an always-current React dashboard the council consults live during raids (~30 seconds
per loot decision).

The full product/UI brief lives in `docs/design-handoff/` (README + `Loot Dashboard.html`
prototype). This spec is the technical design; the handoff README is the authoritative UI spec.

## 2. Constraints (non-negotiable)

- **Fully external / read-only source.** The source sheet is not ours — no bound scripts, no
  write-back. We only read its public CSV export. It must degrade gracefully if the layout shifts.
- **No exposed secrets.** The Google Sheet and Wowhead are both public (no API keys). The only
  secret in the system is `DATABASE_URL`, injected by Railway, never committed, never shipped to
  the client bundle. `.env` is gitignored from the first commit.
- **Do not touch the existing Railway project.** All infrastructure goes in a brand-new Railway
  project.
- **Data rules are fixed** (from the source brief): only `response = "Mainspec/Need"` awards count.

## 3. Architecture

```
Public RCLC CSV export ──(scheduled fetch, no auth)──► ingest script ──► Postgres
                                                            │                 │
                    Wowhead (item ID → name/quality/icon, once) ─┘                 ▼
                                                              Next.js server (compute) ──► React UI
```

- **Framework:** Next.js (App Router) + TypeScript + React — single repo. Matches the prototype's
  native React stack. The web UI, the server-side compute layer, and the ingest script all live here.
- **Database:** Postgres on Railway. **Drizzle ORM** for a typed schema + SQL migrations.
- **Package manager:** pnpm (installed via `npm i -g pnpm`; fall back to npm if needed).
- **Testing:** Vitest.

### Deployment topology (Railway, new project)

Two services sharing one Postgres instance:

1. **web** — the Next.js app (serves the dashboard, runs the server-side compute on read).
2. **ingest** — the same repo/image, started with `pnpm ingest`, run on a Railway **cron schedule**
   (default every 20 min). It writes to the shared Postgres.

`DATABASE_URL` is a Railway reference variable shared by both services. There is no public trigger
endpoint for ingest (it is a scheduled command), so there is no trigger secret to leak.

## 4. Data model (Postgres / Drizzle)

- **`awards`** — one row per RCLC award.
  - Mirrors the useful CSV columns: `player`, `awarded_at` (timestamp derived from the sheet's
    `date` + `time`), `item`, `item_id`, `item_string`, `response`, `class`, `instance`, `boss`, `note`.
  - **`dedup_key`** (unique index): a stable hash of `player + awarded_at + item_id + response`.
    The source sheet accumulates by appending and has no award-ID column, so ingest upserts on
    `dedup_key` → re-ingesting the whole sheet is idempotent (no duplicates).
- **`item_meta`** — `item_id` (PK) → `name`, `quality` (int), `icon` (string), `fetched_at`.
  Enriched from Wowhead **once per new item ID**, then cached forever (item data is immutable).
- **`roster`** — `player` (PK) → `role` (`caster-dps | melee-dps | tank | healer`), `active` (bool).
  Edited via the in-app **`/roster` page** (see §7), which lists every distinct player seen in the
  dump with a specialty dropdown. A row exists only for an assigned player; unassigning removes it.
  This table is the source of truth for player → role.
- **`ingest_runs`** — `id`, `ran_at`, `status` (`ok | error`), `awards_seen`, `awards_new`,
  `items_enriched`, `error_message`. Powers the nav bar's **stale / error indicator**.

## 5. Ingest pipeline (`pnpm ingest`)

1. **Fetch** the public CSV export URL (with a real `User-Agent`; tolerate transient failure).
2. **Parse** CSV → typed award rows.
3. **Upsert `awards`** on `dedup_key`.
4. **Enrich items:** for each `item_id` not already in `item_meta`, fetch Wowhead's tooltip JSON
   (`https://nether.wowhead.com/tbc/tooltip/item/<id>`) once and store name/quality/icon. Failures
   are logged per item and never abort the run; a missing item simply renders as plain text later.
5. **Record** an `ingest_runs` row (status + counts, or the error).

Ingest does **not** manage the roster — that is owned by the `/roster` page (§7). New players simply
appear as `awards` rows; the roster page surfaces them for specialty assignment.

## 6. Compute layer (server-side, pure, unit-tested)

Pure functions over DB rows, invoked by the server on read and served as JSON. Sort / mode /
specialty switching stay instant on the client.

Per specialty:
- Filter to `response = "Mainspec/Need"` only (excludes offspec, greed, disenchant, pass, etc.).
- Join `roster` by role; include only active players of that role.
- Per player: award count, tier count, chronological item list, weeks-since-last-award.
- Sort ascending by award count (least-looted floats to top — matches the source spreadsheet).
- Heatmap intensity per the handoff: `18 + (value/max)*55` percent accent tint.

**Tier detection (pure string regex, no dictionary):**
`^(Helm|Crown|Cowl|Pauldrons|Mantle|Chestguard|Robe|Breastplate|Gloves|Gauntlets|Handguards|Leggings) of the (Fallen|Vanquished) (Champion|Hero|Defender)$`
→ slot map: Helm/Crown/Cowl → Head; Pauldrons/Mantle → Shoulders;
Chestguard/Robe/Breastplate → Chest; Gloves/Gauntlets/Handguards → Gloves; Leggings → Legs.
Non-matching items display their real name.

**Recency:** `floor(days_since_last_award / 7)` → "This week" / "1 wk ago" / "N wks ago",
computed relative to current date.

The **Breakdowns & trends** view is computed from the same data: season totals, tier share,
per-specialty and per-class distributions, longest-drought and heaviest-looted leaderboards, and
weekly activity (last 10 weeks). See the handoff README §"Breakdowns & trends" for exact cards.

## 7. Frontend

Port the two views from the prototype into React components, high-fidelity per the handoff:

- **Specialty tables** (default): nav bar with auto-refresh tag + stale/error indicator, mode
  switcher, specialty switcher (Casters/Melee/Tanks/Healers), and the frozen-column decision table
  (sticky Name + Received columns, heatmapped Received pill, dynamic item columns, item icons +
  quality colours, client-side sortable headers).
- **Breakdowns & trends:** stat cards, bar charts by specialty/class, drought/heaviest leaderboards,
  weekly activity chart.

Nocturne design tokens (colours, type, spacing, radii from the handoff README) are ported as CSS
custom properties. Item icons load from `https://wow.zamimg.com/images/wow/icons/medium/<icon>.jpg`
using the icon slug already cached in `item_meta`; a missing icon degrades to plain coloured text
and never breaks a row. A lightweight loading skeleton covers the initial data load.

**Roster page (`/roster`).** A simple management page listing every distinct player that appears in
`awards` (left join to `roster` for the current assignment), each row a `<select>` of the four
specialties plus an "Unassigned" option. Changing a dropdown autosaves via `POST /api/roster`
(`{ player, role | null }`): a role upserts the roster row, "Unassigned" deletes it. No auth in v1
(low-stakes, link-shared); a shared passphrase can be layered on later. Unassigned players are
excluded from the decision tables and trends, unchanged.

## 8. Repository

- New **public** GitHub repo `Ntrinder/snooze-loot-dashboard`.
- The design handoff bundle (`README.md`, `Loot Dashboard.html`) is copied into `docs/design-handoff/`.
- `.env` gitignored; `.env.example` documents `DATABASE_URL` only.

## 9. Out of scope (v1 / YAGNI)

- No auth on the roster editor in v1 (link-shared, low-stakes; shared-passphrase gating deferred).
- No per-boss views, filters, or historical season switching beyond the trends cards.
- No write access of any kind to the source sheet.
- No item-centric "candidate compare" mode (deferred; the per-specialty tables are the v1 surface).

## 10. Success criteria

1. **Zero weekly effort** — opening the dashboard shows the current week's tables, already built.
2. **Fully external** — reads only the public source; degrades gracefully if it shifts.
3. **Fast to consult live** — sortable, heatmapped, scannable in seconds.
4. **Faithful** — same columns, sort, heatmap, tier shortnames as the hand-built table, plus recency.
5. **No exposed secrets** — only `DATABASE_URL`, never committed or client-shipped.
