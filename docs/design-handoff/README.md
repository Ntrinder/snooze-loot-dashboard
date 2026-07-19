# Handoff: Snooze Loot Dashboard (Option 2 — TS service + web dashboard)

## Overview
A live decision surface for a WoW raid guild's loot council. It reads the guild's public RCLC (RCLootCouncil) award-log Google Sheet (CSV export, no auth) on a schedule, joins a small maintained roster (player → specialty role), and renders:
1. A per-specialty ("Casters" / "Melee" / "Tanks" / "Healers") decision table — one row per player, sorted least-looted-first, heatmapped, with chronological item history — so the council can decide who gets a drop in ~30 seconds during a live raid.
2. A "Breakdowns & trends" tab with season-level analysis: totals, tier share, per-specialty and per-class award distribution, longest-drought and heaviest-looted leaderboards, and a weekly activity chart.

This replaces a manual weekly spreadsheet rebuild (tally/transpose/sort/colour by hand).

## About the Design Files
The file in this bundle (`Loot Dashboard.html`) is a **design reference built in HTML/CSS** — a working prototype of the intended look, layout, and interactions, not production code to copy directly. It uses a static, fabricated dataset (fictional players/items) baked into the page's JS for demonstration.

**The task is to recreate this design in the target codebase's real environment** — likely a small TypeScript service + web frontend (per the project's Option 2 direction: a cron/scheduled job that fetches the public CSV, computes the tables, and serves a dashboard) — using whatever frontend framework/stack the target repo already uses, or the most appropriate modern stack (e.g. Next.js/Vite + React or Vue) if starting fresh. Do not simply embed this HTML file as-is; rebuild the UI with real data fetching, the actual roster config, and the target app's component patterns.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, and component styling below are final — implement pixel-close. Layout, copy, and interaction behavior should be treated as the spec.

## Design System
Built on a dark, compact design system called "Nocturne." Every token is a CSS custom property; treat the values below as source of truth if the target codebase doesn't already import the system's stylesheet.

### Colors
- Background: `--color-bg` = `#161826` (near-neutral dark blue-grey; never pure black)
- Text: `--color-text` = `#e9e9ed`
- Accent (single hue, mono scheme): base `#9184d9` (a blurple), with tonal ramps `--color-accent-100…900` and `--color-neutral-100…900` generated in OKLCH (same perceptual lightness per step across ramps). On the dark ground: use 700–900 steps for tinted fills/borders, 500 as base, 100–300 for text-on-tint.
- Heatmap cells (the "# Received" pill): `color-mix(in oklch, var(--color-accent) X%, transparent)` where X = 18 + (value/max)*55 — a continuous accent-tint intensity, not a separate hue.
- Item quality colors (WoW convention, used only for item-name text/icon borders pulled from the Wowhead API — not part of Nocturne): poor `#9d9d9d`, common `#e9e9ed`, uncommon `#1eff00`, rare `#3d9eff`, epic → reuse `--color-accent-300`, legendary `#ff8000`.

### Type
- Font: Inter for both headings (`--font-heading`) and body (`--font-body`), medium weight, never bolded past 500 for headings.
- Page title: 28px, weight 500.
- Card kicker labels: small caps, ~11px, uppercase, letter-spacing 0.1em, opacity 0.55.
- Body/table text: 13–14px.
- Stat numbers (Trends cards): 22–32px, `--font-heading`.

### Spacing / radius
- Use the system's compact spacing scale (`--space-1…10`, density ~0.7×) and 8px-based `--radius-sm/md/lg`.
- Page content max-width: 1180px, centered, with `--space-8` horizontal padding.

### Components (from the Nocturne system — reuse equivalents in target stack)
- `.nav` — header bar: brand text left, an outlined tag ("Auto-refreshed · every 20 min"), right-aligned meta text.
- `.seg` / `.seg-opt` — segmented control (native radio group styling) for the Mode switcher (Specialty tables / Breakdowns & trends) and the Specialty switcher (Casters/Melee/Tanks/Healers).
- `.card` + `.elev-sm/md` — surface-filled content cards with soft shadow, used for every content block.
- `.table` — themed data table (faint row separators, small-caps header).
- `.tag` / `.tag-accent` / `.tag-outline` / `.tag-neutral` — small pill labels.
- Buttons are outlined, never solid-filled (not heavily used on this page, but any future actions should follow `.btn-primary`/`.btn-ghost` conventions — accent-outline primary, never a filled button).

## Screens / Views

### 1. Specialty tables (default view)
**Purpose:** the live, per-raid decision table.

**Layout:**
- Nav bar (see above).
- Page header: H1 "Decision surface" + one-line description paragraph (max ~62ch, opacity 0.65).
- Controls row (flex, gap `--space-4`, wraps): Mode `.seg` switcher, then (only visible in table mode) a Specialty `.seg` switcher with 4 options: Casters / Melee / Tanks / Healers.
- Table card (`.card.elev-sm`, no padding, `overflow:hidden`), containing a horizontally-scrolling (`overflow-x:auto`) `<table class="table">`.

**Table columns (in order):**
1. **Name** — sticky/frozen to the left edge (`position: sticky; left: 0`), fixed width 110px, opaque background so scrolled content doesn't show through.
2. **Received** — also frozen, immediately to the right of Name (`left: 110px`), fixed width 90px, opaque background. Cell shows a pill: `min-width:28px`, padded, background = the heatmap tint described above (intensity relative to the max "# Received" value in the currently-shown specialty).
3. **Class** — plain muted text.
4. **Tier** — count of tier-token items among the player's Mainspec/Need awards. Muted, right-aligned.
5. **Last drop** — recency label: "This week" / "1 wk ago" / "N wks ago", muted, right-aligned.
6. **Item columns (1..N, dynamic count)** — N = the max item count among players currently shown in this specialty (NOT a fixed cap — a heavy-loot player must not have their history truncated). Each cell, if populated: an inline-flex row of [16×16 item icon with a 1px border colored by item quality] + item label, colored by item quality; if the item is a known tier token, label reads "Tier <Slot>" (Head/Shoulders/Chest/Gloves/Legs) instead of the literal name, colored with `--color-accent-300` as a fallback when no quality color is available.
   - Header cells for these columns are plain column numbers (1, 2, 3…), de-emphasized (opacity 0.5).

**Sorting:** Received, Tier, and Last-drop column headers are clickable (`cursor:pointer`) and toggle ascending/descending client-side sort (default: ascending by Received — least-looted floats to the top, matching the source spreadsheet's convention). An arrow glyph (↑/↓) appears next to the active sort column's header label.

**Row data source:** for a given specialty, only awards where `response = "Mainspec/Need"` count toward "# Received", tier count, item columns, and recency — everything else (offspec, greed, disenchant, pass, etc.) is excluded entirely, matching the source brief's rules.

**Item icon/quality data:** fetched live client-side from Wowhead's public tooltip JSON endpoint (`https://nether.wowhead.com/tbc/tooltip/item/<itemID>`, no auth) for items whose in-game item ID is known; icon image at `https://wow.zamimg.com/images/wow/icons/medium/<icon>.jpg`. Items without a resolvable ID degrade gracefully to plain colored text with no icon — this must never break the row.

### 2. Breakdowns & trends
**Purpose:** season-level analysis, secondary to the live table.

**Layout (single column of full-width and half-width cards, `--space-5` gap):**
1. **Row of 3 stat cards** (`grid-template-columns: repeat(3,1fr)`): "Awards this season" (big number), "Tier share" (big percentage), "Longest current drought" (player name + specialty + recency label).
2. **"Awards by specialty"** card: one horizontal bar per specialty (`grid-template-columns: 90px 1fr 90px` — label / bar / "N received · M tier" caption). Bar fill = `--color-accent`, track = `--color-neutral-800`, height 10px, rounded.
3. **"Awards by class"** card: same bar pattern, one row per WoW class present in the data, sorted descending by awards received, caption adds player count ("N received · M tier · Pp"). Bar fill = `--color-accent-400` (slightly lighter, to visually distinguish from the specialty chart above it). Label column widened to 110px for longer class names.
4. **Two-column row:** "Longest droughts" (top 5 by weeks-since-last-award, each row: name · class · specialty, with an outlined tag showing the recency label) and "Heaviest looted" (top 5 by received count, same row layout, with an accent-filled tag showing the count).
5. **"Weekly award activity"** card: a simple bar chart, one bar per week (last 10 weeks with any awards), height 120px container, bars bottom-aligned, count label above each bar, week-start date label below (e.g. "Jun 15"). Bar fill = `--color-accent-700`.

## Interactions & Behavior
- Mode switch (Specialty tables ↔ Breakdowns & trends) and specialty switch are instant, client-side, no network round-trip once data is loaded.
- Column header clicks re-sort the currently visible specialty table instantly.
- No modals, no forms, no navigation away from the single page in this version.
- No loading/error states are designed yet for the *initial* data load (CSV fetch + roster join) — the target implementation should add a lightweight loading skeleton for the table and a visible (not silent) error/stale-data indicator in the nav bar if the scheduled fetch fails, since "degrades gracefully" is an explicit product requirement from the design brief.
- Wowhead icon fetches are per-item, fire-and-forget, and must fail silently per item (already designed this way) — a failed icon fetch should never block or blank the row's text.

## State Management
Minimal client state needed:
- `mode`: `'table' | 'trends'`
- `role` (selected specialty): `'caster-dps' | 'melee-dps' | 'tank' | 'healer'`
- `sortKey`: `'received' | 'tierCount' | 'weeks'`, `sortDir`: `'asc' | 'desc'`
- `itemMeta`: a cache keyed by item ID of `{ name, quality, icon }`, populated asynchronously from the Wowhead endpoint and merged into row rendering as it arrives.

Server/data-layer state (per the design brief this UI sits on top of):
- Raw award rows parsed from the public RCLC CSV export (`player, date, time, item, itemID, itemString, response, votes, class, instance, boss, gear1, gear2, responseID, isAwardReason, rollType, subType, equipLoc, note, owner`).
- A maintained roster mapping `player → role (+ active flag)`, edited rarely by the requester — this is the one input that cannot be derived from the data and must be a small owned config (JSON/DB row) editable by the council.
- Computed, per specialty: filtered to `response = "Mainspec/Need"`, joined to roster by role, then per player: award count, tier count (derived from item-name pattern, see below), chronological item list, weeks-since-last-award. Sorted ascending by award count as the default.

### Tier-token detection (no dictionary needed — pure string pattern)
An item is a tier token if its name matches `^(Helm|Crown|Cowl|Pauldrons|Mantle|Chestguard|Robe|Breastplate|Gloves|Gauntlets|Handguards|Leggings) of the (Fallen|Vanquished) (Champion|Hero|Defender)$`. Map the leading word to a slot: Helm/Crown/Cowl → Head; Pauldrons/Mantle → Shoulders; Chestguard/Robe/Breastplate → Chest; Gloves/Gauntlets/Handguards → Gloves; Leggings → Legs. Non-matching items display their real name.

## Design Tokens
See the Colors/Type/Spacing sections above — all values are CSS custom properties from the bound "Nocturne" design system. If the target codebase doesn't already have this token sheet, request the system's `styles.css` from this project rather than re-deriving values by eye.

## Assets
- No custom illustration/icon assets — item icons are fetched live from Wowhead's public CDN (`wow.zamimg.com`) at render time, keyed by real WoW item IDs.
- Uses Phosphor icons conventionally elsewhere in this design system (none are load-bearing on this particular page).

## Files
- `Loot Dashboard.html` — the full working HTML/CSS/JS prototype (self-contained; open directly in a browser). Contains fabricated placeholder data (fictional players, classes, and a subset of real Burning Crusade Classic item IDs used to demonstrate the Wowhead icon integration) — replace entirely with live data in the real implementation.
