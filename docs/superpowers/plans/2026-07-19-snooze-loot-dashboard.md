# Snooze Loot Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-effort live web dashboard that reads the guild's public RCLootCouncil award-log Google Sheet on a schedule, stores it in Postgres, and serves per-specialty loot-council decision tables plus a trends view.

**Architecture:** A single Next.js (App Router) + TypeScript app. A `pnpm ingest` script fetches the public CSV, upserts awards into Postgres, enriches item metadata from Wowhead once per item, and seeds the roster from a committed config. The Next.js server computes the decision tables from the DB on read; the React client handles instant mode/specialty/sort switching. Deployed as two Railway services (web + scheduled ingest) sharing one Postgres.

**Tech Stack:** Next.js 15, React 19, TypeScript, Drizzle ORM + postgres.js, papaparse, Vitest + @testing-library/react + jsdom, tsx.

## Global Constraints

- **Node ≥ 20**, package manager **pnpm** (install with `npm i -g pnpm` if absent).
- **Only secret is `DATABASE_URL`** — injected by Railway, never committed, never referenced in client components. `.env` and `.env.*` are gitignored (`.env.example` is the one exception).
- **Source sheet is read-only and public** — never write to it, no auth. Fetch tolerates transient failure and never crashes the web app.
- **CSV export URL:** `https://docs.google.com/spreadsheets/d/1g2-76SolXVpsw-bbcZuwslDduXo8Lnb0C9dxV3kv_sE/export?format=csv&gid=107710525`
- **Award filter:** only rows with `response === "Mainspec/Need"` count toward received/tier/items/recency. All else excluded.
- **Tier regex (verbatim):** `^(Helm|Crown|Cowl|Pauldrons|Mantle|Chestguard|Robe|Breastplate|Gloves|Gauntlets|Handguards|Leggings) of the (Fallen|Vanquished) (Champion|Hero|Defender)$`
- **Data quirks (from the real dump):** item names are bracket-wrapped (`[Name]`); player names carry a realm suffix (`Name-Thunderstrike`); dates are `M/D/YYYY`, times `HH:MM:SS`.
- **Wowhead endpoint:** `https://nether.wowhead.com/tbc/tooltip/item/<id>` (public, no auth); icons at `https://wow.zamimg.com/images/wow/icons/medium/<icon>.jpg`.
- **Roles:** `caster-dps | melee-dps | tank | healer`.
- Do NOT touch the pre-existing Railway project; everything goes in a new project.

---

### Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `vitest.config.ts`, `.env.example`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/lib/__smoke__.test.ts`
- Modify: `.gitignore` (already present — verify it ignores `node_modules/`, `.next/`, `.env`)

**Interfaces:**
- Produces: a working `pnpm test`, `pnpm build`, and `pnpm dev`. No app logic yet.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "snooze-loot-dashboard",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "ingest": "tsx src/ingest/cli.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/db/migrate.ts"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "drizzle-orm": "^0.38.0",
    "postgres": "^3.4.5",
    "papaparse": "^5.4.1"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/papaparse": "^5.3.15",
    "drizzle-kit": "^0.30.0",
    "tsx": "^4.19.0",
    "vitest": "^2.1.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/jest-dom": "^6.6.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.mjs`, `vitest.config.ts`, `.env.example`**

`next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: 'wow.zamimg.com' }] },
};
export default nextConfig;
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: { environment: 'jsdom', globals: true, setupFiles: [] },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
```

`.env.example`:
```
# The only secret in this project. Provided by Railway in production.
DATABASE_URL=postgres://user:pass@localhost:5432/loot
```

- [ ] **Step 4: Create minimal app shell + smoke test**

`src/app/layout.tsx`:
```tsx
export const metadata = { title: 'Snooze Loot Dashboard' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:
```tsx
export default function Page() {
  return <main>Snooze Loot Dashboard</main>;
}
```

`src/lib/__smoke__.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Install and verify**

Run:
```bash
npm i -g pnpm
pnpm install
pnpm test
pnpm typecheck
```
Expected: `pnpm test` passes 1 test; `pnpm typecheck` exits 0.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + TypeScript + Vitest project"
```

---

### Task 2: Domain types + CSV parsing

**Files:**
- Create: `src/lib/types.ts`, `src/lib/csv.ts`, `tests/fixtures/dump.csv`, `src/lib/csv.test.ts`

**Interfaces:**
- Produces:
  - `type Role = 'caster-dps' | 'melee-dps' | 'tank' | 'healer'`
  - `interface Award { player: string; awardedAt: Date; item: string; itemId: number | null; itemString: string; response: string; className: string; instance: string; boss: string; note: string }`
  - `interface RosterEntry { player: string; role: Role; active: boolean }`
  - `interface ItemMeta { itemId: number; name: string; quality: number; icon: string }`
  - `stripRealm(name: string): string`
  - `stripBrackets(s: string): string`
  - `parseAwardedAt(date: string, time: string): Date`
  - `parseAwards(csv: string): Award[]`

- [ ] **Step 1: Create `tests/fixtures/dump.csv`** (real rows from the live sheet)

```
player,date,time,item,itemID,itemString,response,votes,class,instance,boss,gear1,gear2,responseID,isAwardReason,rollType,subType,equipLoc,note,owner
Fennie-Thunderstrike,2/22/2026,20:51:00,[Liar's Tongue Gloves],28776,item:28776::::::::70,Mainspec/Need,0,SHAMAN,Magtheridon's Lair-25 Player,Magtheridon,[Fel Leather Gloves],,1,FALSE,normal,Leather,Hands,,Pop-Thunderstrike
Kouzbee-Thunderstrike,2/22/2026,20:50:00,[Gauntlets of Martial Perfection],28824,item:28824::::::::70,Mainspec/Need,0,WARRIOR,Magtheridon's Lair-25 Player,Magtheridon,[Fel Leather Gloves],,1,FALSE,normal,Plate,Hands,bis,Pop-Thunderstrike
Azurepath-Thunderstrike,2/22/2026,20:51:00,[Belt of Divine Inspiration],28799,item:28799::::::::70,Mainspec/Need,1,WARLOCK,Magtheridon's Lair-25 Player,Magtheridon,[A'dal's Gift],,1,FALSE,normal,Cloth,Waist,,Pop-Thunderstrike
Boonage-Thunderstrike,2/22/2026,20:49:00,[Pauldrons of the Fallen Champion],29763,item:29763::::::::70,Mainspec/Need,0,PALADIN,Magtheridon's Lair-25 Player,Magtheridon,[Mantle of Abrahmis],,1,FALSE,normal,Armor Token,,bis,Pop-Thunderstrike
Azurepath-Thunderstrike,3/1/2026,21:10:00,[Robe of the Fallen Champion],29764,item:29764::::::::70,Mainspec/Need,0,WARLOCK,Serpentshrine Cavern-25 Player,Hydross,[Belt of Divine Inspiration],,1,FALSE,normal,Armor Token,,,Pop-Thunderstrike
Azurepath-Thunderstrike,3/1/2026,21:30:00,[Fathom-Brooch of the Tidewalker],30663,item:30663::::::::70,Offspec/Greed,0,WARLOCK,Serpentshrine Cavern-25 Player,Tidewalker,,,4,FALSE,normal,Trinket,Trinket,,Pop-Thunderstrike
Fennie-Thunderstrike,3/1/2026,22:00:00,[Cowl of the Fallen Hero],29055,item:29055::::::::70,Mainspec/Need,0,SHAMAN,Serpentshrine Cavern-25 Player,Leotheras,,,1,FALSE,normal,Armor Token,,,Pop-Thunderstrike
```

- [ ] **Step 2: Write the failing test** — `src/lib/csv.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { stripRealm, stripBrackets, parseAwardedAt, parseAwards } from './csv';

const csv = readFileSync(path.join(__dirname, '../../tests/fixtures/dump.csv'), 'utf8');

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
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run src/lib/csv.test.ts`
Expected: FAIL — cannot find module `./csv`.

- [ ] **Step 4: Create `src/lib/types.ts`**

```ts
export type Role = 'caster-dps' | 'melee-dps' | 'tank' | 'healer';

export const ROLES: Role[] = ['caster-dps', 'melee-dps', 'tank', 'healer'];

export const ROLE_LABELS: Record<Role, string> = {
  'caster-dps': 'Casters',
  'melee-dps': 'Melee',
  tank: 'Tanks',
  healer: 'Healers',
};

export interface Award {
  player: string;
  awardedAt: Date;
  item: string;
  itemId: number | null;
  itemString: string;
  response: string;
  className: string;
  instance: string;
  boss: string;
  note: string;
}

export interface RosterEntry {
  player: string;
  role: Role;
  active: boolean;
}

export interface ItemMeta {
  itemId: number;
  name: string;
  quality: number; // 0..5 (poor..legendary)
  icon: string; // Wowhead icon slug
}
```

- [ ] **Step 5: Create `src/lib/csv.ts`**

```ts
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
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm vitest run src/lib/csv.test.ts`
Expected: PASS (all cases).

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/csv.ts src/lib/csv.test.ts tests/fixtures/dump.csv
git commit -m "feat: domain types and CSV parsing with real-dump fixture"
```

---

### Task 3: Dedup key

**Files:**
- Create: `src/lib/dedup.ts`, `src/lib/dedup.test.ts`

**Interfaces:**
- Consumes: `Award` from `src/lib/types.ts`.
- Produces: `dedupKey(a: Pick<Award, 'player' | 'awardedAt' | 'itemId' | 'response'>): string`

- [ ] **Step 1: Write the failing test** — `src/lib/dedup.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { dedupKey } from './dedup';

const base = { player: 'Fennie', awardedAt: new Date(2026, 1, 22, 20, 51), itemId: 28776, response: 'Mainspec/Need' };

describe('dedupKey', () => {
  it('is stable for identical input', () => {
    expect(dedupKey(base)).toBe(dedupKey({ ...base }));
  });
  it('differs when any field differs', () => {
    expect(dedupKey(base)).not.toBe(dedupKey({ ...base, player: 'Kouzbee' }));
    expect(dedupKey(base)).not.toBe(dedupKey({ ...base, itemId: 28824 }));
    expect(dedupKey(base)).not.toBe(dedupKey({ ...base, response: 'Offspec/Greed' }));
  });
  it('handles null itemId', () => {
    expect(typeof dedupKey({ ...base, itemId: null })).toBe('string');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/dedup.test.ts`
Expected: FAIL — cannot find module `./dedup`.

- [ ] **Step 3: Create `src/lib/dedup.ts`**

```ts
import { createHash } from 'node:crypto';
import type { Award } from './types';

export function dedupKey(a: Pick<Award, 'player' | 'awardedAt' | 'itemId' | 'response'>): string {
  const parts = [a.player, a.awardedAt.toISOString(), a.itemId ?? '', a.response].join('|');
  return createHash('sha1').update(parts).digest('hex');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/dedup.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dedup.ts src/lib/dedup.test.ts
git commit -m "feat: stable dedup key for idempotent award upserts"
```

---

### Task 4: Tier detection

**Files:**
- Create: `src/lib/tier.ts`, `src/lib/tier.test.ts`

**Interfaces:**
- Produces:
  - `tierSlot(name: string): string | null` — 'Head' | 'Shoulders' | 'Chest' | 'Gloves' | 'Legs' | null
  - `isTier(name: string): boolean`
  - `itemLabel(name: string): string` — `"Tier <Slot>"` for tokens, else the name

- [ ] **Step 1: Write the failing test** — `src/lib/tier.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { tierSlot, isTier, itemLabel } from './tier';

describe('tierSlot', () => {
  it('maps each leading word to a slot', () => {
    expect(tierSlot('Pauldrons of the Fallen Champion')).toBe('Shoulders');
    expect(tierSlot('Cowl of the Fallen Hero')).toBe('Head');
    expect(tierSlot('Robe of the Fallen Champion')).toBe('Chest');
    expect(tierSlot('Gauntlets of the Vanquished Defender')).toBe('Gloves');
    expect(tierSlot('Leggings of the Vanquished Hero')).toBe('Legs');
  });
  it('returns null for non-tier items', () => {
    expect(tierSlot("Liar's Tongue Gloves")).toBeNull();
    expect(tierSlot('Gauntlets of Martial Perfection')).toBeNull();
  });
});

describe('itemLabel', () => {
  it('shortens tier tokens', () => {
    expect(itemLabel('Pauldrons of the Fallen Champion')).toBe('Tier Shoulders');
  });
  it('passes real names through', () => {
    expect(itemLabel("Liar's Tongue Gloves")).toBe("Liar's Tongue Gloves");
  });
});

describe('isTier', () => {
  it('is true only for tokens', () => {
    expect(isTier('Cowl of the Fallen Hero')).toBe(true);
    expect(isTier('Gauntlets of Martial Perfection')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/tier.test.ts`
Expected: FAIL — cannot find module `./tier`.

- [ ] **Step 3: Create `src/lib/tier.ts`**

```ts
const TIER_RE =
  /^(Helm|Crown|Cowl|Pauldrons|Mantle|Chestguard|Robe|Breastplate|Gloves|Gauntlets|Handguards|Leggings) of the (Fallen|Vanquished) (Champion|Hero|Defender)$/;

const SLOT: Record<string, string> = {
  Helm: 'Head', Crown: 'Head', Cowl: 'Head',
  Pauldrons: 'Shoulders', Mantle: 'Shoulders',
  Chestguard: 'Chest', Robe: 'Chest', Breastplate: 'Chest',
  Gloves: 'Gloves', Gauntlets: 'Gloves', Handguards: 'Gloves',
  Leggings: 'Legs',
};

export function tierSlot(name: string): string | null {
  const m = TIER_RE.exec(name.trim());
  return m ? SLOT[m[1]] : null;
}

export function isTier(name: string): boolean {
  return tierSlot(name) !== null;
}

export function itemLabel(name: string): string {
  const slot = tierSlot(name);
  return slot ? `Tier ${slot}` : name;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/tier.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tier.ts src/lib/tier.test.ts
git commit -m "feat: tier-token detection and slot shortnames"
```

---

### Task 5: Recency

**Files:**
- Create: `src/lib/recency.ts`, `src/lib/recency.test.ts`

**Interfaces:**
- Produces:
  - `weeksSince(last: Date, now: Date): number`
  - `recencyLabel(weeks: number | null): string`

- [ ] **Step 1: Write the failing test** — `src/lib/recency.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { weeksSince, recencyLabel } from './recency';

const now = new Date(2026, 2, 22, 12, 0, 0); // 22 Mar 2026

describe('weeksSince', () => {
  it('is 0 for the same week', () => {
    expect(weeksSince(new Date(2026, 2, 20), now)).toBe(0);
  });
  it('counts whole weeks', () => {
    expect(weeksSince(new Date(2026, 2, 8), now)).toBe(2);
    expect(weeksSince(new Date(2026, 1, 22), now)).toBe(4);
  });
});

describe('recencyLabel', () => {
  it('labels each bucket', () => {
    expect(recencyLabel(0)).toBe('This week');
    expect(recencyLabel(1)).toBe('1 wk ago');
    expect(recencyLabel(6)).toBe('6 wks ago');
    expect(recencyLabel(null)).toBe('—');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/recency.test.ts`
Expected: FAIL — cannot find module `./recency`.

- [ ] **Step 3: Create `src/lib/recency.ts`**

```ts
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function weeksSince(last: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - last.getTime()) / WEEK_MS));
}

export function recencyLabel(weeks: number | null): string {
  if (weeks === null) return '—';
  if (weeks <= 0) return 'This week';
  if (weeks === 1) return '1 wk ago';
  return `${weeks} wks ago`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/recency.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recency.ts src/lib/recency.test.ts
git commit -m "feat: recency (weeks-since-last-award) and labels"
```

---

### Task 6: Specialty table compute

**Files:**
- Create: `src/lib/compute.ts`, `src/lib/compute.test.ts`

**Interfaces:**
- Consumes: `Award`, `RosterEntry`, `ItemMeta`, `Role`, `ROLES` (types.ts); `itemLabel`, `isTier` (tier.ts); `weeksSince`, `recencyLabel` (recency.ts).
- Produces:
  - `interface ItemCell { label: string; itemId: number | null; quality: number | null; icon: string | null; isTier: boolean }`
  - `interface PlayerRow { player: string; className: string; received: number; tierCount: number; weeksSinceLast: number | null; recencyLabel: string; heatmap: number; items: ItemCell[] }`
  - `interface SpecialtyTable { role: Role; rows: PlayerRow[]; maxItems: number }`
  - `computeTables(awards: Award[], roster: RosterEntry[], meta: Map<number, ItemMeta>, now: Date): Record<Role, SpecialtyTable>`

  Rules: filter to `response === 'Mainspec/Need'`; include only active roster players; group by player; items chronological ascending; sort rows ascending by `received`; `heatmap = 18 + (received / maxReceived) * 55` (0 when maxReceived is 0). A player with a Mainspec/Need award but no active roster entry is dropped.

- [ ] **Step 1: Write the failing test** — `src/lib/compute.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseAwards } from './csv';
import { computeTables } from './compute';
import type { RosterEntry, ItemMeta } from './types';

const csv = readFileSync(path.join(__dirname, '../../tests/fixtures/dump.csv'), 'utf8');
const awards = parseAwards(csv);
const now = new Date(2026, 2, 22, 12, 0, 0);

const roster: RosterEntry[] = [
  { player: 'Fennie', role: 'caster-dps', active: true },
  { player: 'Azurepath', role: 'caster-dps', active: true },
  { player: 'Kouzbee', role: 'tank', active: true },
  { player: 'Boonage', role: 'healer', active: true },
];

const meta = new Map<number, ItemMeta>([
  [28776, { itemId: 28776, name: "Liar's Tongue Gloves", quality: 3, icon: 'inv_gloves_25' }],
]);

describe('computeTables', () => {
  const tables = computeTables(awards, roster, meta, now);

  it('groups casters and excludes Offspec/Greed', () => {
    const casters = tables['caster-dps'].rows;
    const azure = casters.find((r) => r.player === 'Azurepath')!;
    // Azure has 2 Mainspec/Need (Belt, Robe) — the Offspec trinket is excluded
    expect(azure.received).toBe(2);
    expect(azure.items.map((i) => i.label)).toEqual(['Belt of Divine Inspiration', 'Tier Chest']);
  });

  it('counts tier tokens', () => {
    const fennie = tables['caster-dps'].rows.find((r) => r.player === 'Fennie')!;
    // Fennie: Liar's Tongue Gloves + Cowl of the Fallen Hero (tier)
    expect(fennie.received).toBe(2);
    expect(fennie.tierCount).toBe(1);
  });

  it('sorts ascending by received (least-looted first)', () => {
    const received = tables['caster-dps'].rows.map((r) => r.received);
    expect(received).toEqual([...received].sort((a, b) => a - b));
  });

  it('attaches item meta when known and null when unknown', () => {
    const fennie = tables['caster-dps'].rows.find((r) => r.player === 'Fennie')!;
    const gloves = fennie.items.find((i) => i.itemId === 28776)!;
    expect(gloves.quality).toBe(3);
    expect(gloves.icon).toBe('inv_gloves_25');
    const cowl = fennie.items.find((i) => i.isTier)!;
    expect(cowl.quality).toBeNull();
  });

  it('computes heatmap relative to the specialty max', () => {
    const rows = tables['caster-dps'].rows;
    const max = Math.max(...rows.map((r) => r.received));
    const top = rows.find((r) => r.received === max)!;
    expect(top.heatmap).toBeCloseTo(18 + 55, 5);
  });

  it('produces an entry for every role', () => {
    expect(Object.keys(tables).sort()).toEqual(['caster-dps', 'healer', 'melee-dps', 'tank']);
    expect(tables['melee-dps'].rows).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/compute.test.ts`
Expected: FAIL — cannot find module `./compute`.

- [ ] **Step 3: Create `src/lib/compute.ts`**

```ts
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
  for (const r of roster) if (r.active) roleOf.set(r.player, r.role);

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/compute.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/compute.ts src/lib/compute.test.ts
git commit -m "feat: per-specialty decision-table compute"
```

---

### Task 7: Trends compute

**Files:**
- Create: `src/lib/trends.ts`, `src/lib/trends.test.ts`

**Interfaces:**
- Consumes: `Award`, `RosterEntry`, `Role`, `ROLES`, `ROLE_LABELS` (types.ts); `isTier` (tier.ts); `weeksSince`, `recencyLabel` (recency.ts).
- Produces:
  - `interface SpecialtyBar { role: Role; label: string; received: number; tier: number }`
  - `interface ClassBar { className: string; received: number; tier: number; players: number }`
  - `interface LeaderRow { player: string; className: string; role: Role; value: number; label: string }`
  - `interface WeekBar { weekStart: string; count: number }` (weekStart like `"Feb 22"`)
  - `interface TrendsData { awardsThisSeason: number; tierShare: number; longestDrought: LeaderRow | null; bySpecialty: SpecialtyBar[]; byClass: ClassBar[]; longestDroughts: LeaderRow[]; heaviest: LeaderRow[]; weekly: WeekBar[] }`
  - `computeTrends(awards: Award[], roster: RosterEntry[], now: Date): TrendsData`

  Only `response === 'Mainspec/Need'` awards from active rostered players count. `weekly` = last 10 ISO-week buckets that have awards, oldest→newest. `byClass` sorted by received desc. Leaderboards top 5.

- [ ] **Step 1: Write the failing test** — `src/lib/trends.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseAwards } from './csv';
import { computeTrends } from './trends';
import type { RosterEntry } from './types';

const csv = readFileSync(path.join(__dirname, '../../tests/fixtures/dump.csv'), 'utf8');
const awards = parseAwards(csv);
const now = new Date(2026, 2, 22, 12, 0, 0);

const roster: RosterEntry[] = [
  { player: 'Fennie', role: 'caster-dps', active: true },
  { player: 'Azurepath', role: 'caster-dps', active: true },
  { player: 'Kouzbee', role: 'tank', active: true },
  { player: 'Boonage', role: 'healer', active: true },
];

describe('computeTrends', () => {
  const t = computeTrends(awards, roster, now);

  it('counts only Mainspec/Need from rostered players', () => {
    // Fennie 2, Azure 2, Kouzbee 1, Boonage 1 = 6 (Offspec trinket excluded)
    expect(t.awardsThisSeason).toBe(6);
  });
  it('computes tier share', () => {
    // Tier tokens: Boonage Pauldrons, Azure Robe, Fennie Cowl = 3 of 6
    expect(t.tierShare).toBeCloseTo(0.5, 5);
  });
  it('breaks down by specialty', () => {
    const caster = t.bySpecialty.find((b) => b.role === 'caster-dps')!;
    expect(caster.received).toBe(4);
    expect(caster.tier).toBe(2);
  });
  it('breaks down by class sorted desc', () => {
    const received = t.byClass.map((c) => c.received);
    expect(received).toEqual([...received].sort((a, b) => b - a));
  });
  it('surfaces heaviest and droughts (top 5)', () => {
    expect(t.heaviest.length).toBeLessThanOrEqual(5);
    expect(t.heaviest[0].value).toBeGreaterThanOrEqual(t.heaviest[t.heaviest.length - 1].value);
    expect(t.longestDrought).not.toBeNull();
  });
  it('buckets weekly activity oldest-first', () => {
    expect(t.weekly.length).toBeGreaterThan(0);
    expect(t.weekly.length).toBeLessThanOrEqual(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/trends.test.ts`
Expected: FAIL — cannot find module `./trends`.

- [ ] **Step 3: Create `src/lib/trends.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/trends.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trends.ts src/lib/trends.test.ts
git commit -m "feat: season-level trends compute"
```

---

### Task 8: Database schema, client, migrations, and stores

**Files:**
- Create: `src/db/schema.ts`, `src/db/client.ts`, `src/db/migrate.ts`, `src/db/stores.ts`, `drizzle.config.ts`
- Generated: `drizzle/` migration SQL

**Interfaces:**
- Consumes: `Award`, `ItemMeta`, `RosterEntry` (types.ts); `dedupKey` (dedup.ts).
- Produces:
  - Drizzle tables `awards`, `itemMeta`, `roster`, `ingestRuns`.
  - `getDb(): PostgresJsDatabase` (singleton from `DATABASE_URL`).
  - `interface WriteStore { upsertAwards(a: Award[]): Promise<number>; knownItemIds(): Promise<Set<number>>; insertItemMeta(m: ItemMeta): Promise<void>; syncRoster(r: RosterEntry[]): Promise<void>; recordRun(run: RunRecord): Promise<void> }`
  - `interface ReadStore { allAwards(): Promise<Award[]>; allItemMeta(): Promise<ItemMeta[]>; lastRun(): Promise<RunRecord | null> }`
  - `interface RunRecord { ranAt: Date; status: 'ok' | 'error'; awardsSeen: number; awardsNew: number; itemsEnriched: number; errorMessage: string | null }`
  - `drizzleStores(db): WriteStore & ReadStore`

  Note: `upsertAwards` computes `dedupKey` per row, inserts `onConflictDoNothing` on the unique `dedup_key`, and returns how many rows were newly inserted.

- [ ] **Step 1: Create `src/db/schema.ts`**

```ts
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
  role: text('role').notNull(),
  active: boolean('active').notNull().default(true),
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
```

- [ ] **Step 2: Create `src/db/client.ts`, `drizzle.config.ts`, `src/db/migrate.ts`**

`src/db/client.ts`:
```ts
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let db: PostgresJsDatabase<typeof schema> | null = null;

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (db) return db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  db = drizzle(postgres(url, { max: 5 }), { schema });
  return db;
}
```

`drizzle.config.ts`:
```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

`src/db/migrate.ts`:
```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const sql = postgres(url, { max: 1 });
await migrate(drizzle(sql), { migrationsFolder: './drizzle' });
await sql.end();
console.log('migrations applied');
```

- [ ] **Step 3: Generate the migration**

Run: `pnpm db:generate`
Expected: a new SQL file appears under `drizzle/` with `CREATE TABLE` for all four tables. (Requires no DB connection — `generate` reads the schema file only.)

- [ ] **Step 4: Create `src/db/stores.ts`**

```ts
import { inArray } from 'drizzle-orm';
import { desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { awards, itemMeta, roster, ingestRuns } from './schema';
import type { Award, ItemMeta, RosterEntry, Role } from '../lib/types';
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
  syncRoster(r: RosterEntry[]): Promise<void>;
  recordRun(run: RunRecord): Promise<void>;
}

export interface ReadStore {
  allAwards(): Promise<Award[]>;
  allItemMeta(): Promise<ItemMeta[]>;
  lastRun(): Promise<RunRecord | null>;
}

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
    async syncRoster(entries) {
      const players = entries.map((e) => e.player);
      await db.transaction(async (tx) => {
        for (const e of entries) {
          await tx.insert(roster).values(e).onConflictDoUpdate({ target: roster.player, set: { role: e.role, active: e.active } });
        }
        // deactivate anyone no longer listed
        const existing = await tx.select({ player: roster.player }).from(roster);
        const stale = existing.map((r) => r.player).filter((p) => !players.includes(p));
        if (stale.length) await tx.update(roster).set({ active: false }).where(inArray(roster.player, stale));
      });
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
    async lastRun() {
      const [r] = await db.select().from(ingestRuns).orderBy(desc(ingestRuns.ranAt)).limit(1);
      if (!r) return null;
      return { ranAt: r.ranAt, status: r.status as 'ok' | 'error', awardsSeen: r.awardsSeen, awardsNew: r.awardsNew, itemsEnriched: r.itemsEnriched, errorMessage: r.errorMessage };
    },
  };
}
```

- [ ] **Step 5: Verify it typechecks**

Run: `pnpm typecheck`
Expected: exits 0. (No DB required — this is a compile check.)

- [ ] **Step 6: Commit**

```bash
git add src/db drizzle.config.ts drizzle/
git commit -m "feat: Drizzle schema, client, migrations, and store adapters"
```

---

### Task 9: Roster config

**Files:**
- Create: `src/config/roster.ts`, `src/config/roster.test.ts`

**Interfaces:**
- Consumes: `RosterEntry`, `Role` (types.ts).
- Produces: `export const ROSTER: RosterEntry[]` — the committed source of truth for player → role.

  Seed it from the players visible in the real dump; the requester edits this file over time. Validity: unique players, valid roles.

- [ ] **Step 1: Write the failing test** — `src/config/roster.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { ROSTER } from './roster';
import { ROLES } from '../lib/types';

describe('ROSTER', () => {
  it('has unique player names', () => {
    const names = ROSTER.map((r) => r.player);
    expect(new Set(names).size).toBe(names.length);
  });
  it('uses only valid roles', () => {
    for (const r of ROSTER) expect(ROLES).toContain(r.role);
  });
  it('is non-empty', () => {
    expect(ROSTER.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/config/roster.test.ts`
Expected: FAIL — cannot find module `./roster`.

- [ ] **Step 3: Create `src/config/roster.ts`** (seed with known players; requester extends this)

```ts
import type { RosterEntry } from '../lib/types';

// Source of truth for player → specialty role. Edit this file (commit + push) as
// the roster changes. `active: false` retires a player without deleting history.
export const ROSTER: RosterEntry[] = [
  { player: 'Fennie', role: 'caster-dps', active: true },
  { player: 'Azurepath', role: 'caster-dps', active: true },
  { player: 'Kouzbee', role: 'tank', active: true },
  { player: 'Boonage', role: 'healer', active: true },
  { player: 'Skyttles', role: 'melee-dps', active: true },
  // TODO(requester): complete the roster for all 25 raiders before go-live.
];
```

> Note: the `TODO(requester)` marker is an intentional operational hand-off to Niall (a data-entry task he owns), not an incomplete code path. The app runs correctly with a partial roster — unrostered players are simply omitted from the tables until added.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/config/roster.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config/roster.ts src/config/roster.test.ts
git commit -m "feat: committed roster config (player to specialty role)"
```

---

### Task 10: Wowhead item client

**Files:**
- Create: `src/ingest/wowhead.ts`, `src/ingest/wowhead.test.ts`

**Interfaces:**
- Produces: `fetchItemMeta(itemId: number, fetchImpl?: typeof fetch): Promise<{ name: string; quality: number; icon: string } | null>` — returns `null` on HTTP error, non-JSON, or missing name; never throws.

- [ ] **Step 1: Write the failing test** — `src/ingest/wowhead.test.ts`

```ts
import { describe, it, expect, vi } from 'vitest';
import { fetchItemMeta } from './wowhead';

function fakeFetch(body: unknown, ok = true): typeof fetch {
  return vi.fn(async () => ({ ok, json: async () => body }) as Response) as unknown as typeof fetch;
}

describe('fetchItemMeta', () => {
  it('maps a valid tooltip payload', async () => {
    const r = await fetchItemMeta(28824, fakeFetch({ name: 'Gauntlets of Martial Perfection', quality: 4, icon: 'inv_gauntlets_31' }));
    expect(r).toEqual({ name: 'Gauntlets of Martial Perfection', quality: 4, icon: 'inv_gauntlets_31' });
  });
  it('returns null on HTTP error', async () => {
    expect(await fetchItemMeta(1, fakeFetch({}, false))).toBeNull();
  });
  it('returns null when name is missing', async () => {
    expect(await fetchItemMeta(1, fakeFetch({ quality: 4 }))).toBeNull();
  });
  it('never throws when fetch rejects', async () => {
    const boom = (async () => { throw new Error('network'); }) as unknown as typeof fetch;
    expect(await fetchItemMeta(1, boom)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/ingest/wowhead.test.ts`
Expected: FAIL — cannot find module `./wowhead`.

- [ ] **Step 3: Create `src/ingest/wowhead.ts`**

```ts
export async function fetchItemMeta(
  itemId: number,
  fetchImpl: typeof fetch = fetch,
): Promise<{ name: string; quality: number; icon: string } | null> {
  try {
    const res = await fetchImpl(`https://nether.wowhead.com/tbc/tooltip/item/${itemId}`, {
      headers: { 'User-Agent': 'snooze-loot-dashboard (github.com/Ntrinder/snooze-loot-dashboard)' },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { name?: unknown; quality?: unknown; icon?: unknown };
    if (!j || typeof j.name !== 'string') return null;
    return {
      name: j.name,
      quality: typeof j.quality === 'number' ? j.quality : 0,
      icon: typeof j.icon === 'string' ? j.icon : '',
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/ingest/wowhead.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ingest/wowhead.ts src/ingest/wowhead.test.ts
git commit -m "feat: Wowhead item-metadata client (fails soft)"
```

---

### Task 11: Sheet fetch

**Files:**
- Create: `src/ingest/sheet.ts`, `src/ingest/sheet.test.ts`

**Interfaces:**
- Produces:
  - `const SHEET_CSV_URL: string` (the export URL from Global Constraints).
  - `fetchSheetCsv(url?: string, fetchImpl?: typeof fetch): Promise<string>` — returns CSV text; throws if the response is not OK or looks like HTML (a sign-in/redirect page).

- [ ] **Step 1: Write the failing test** — `src/ingest/sheet.test.ts`

```ts
import { describe, it, expect, vi } from 'vitest';
import { fetchSheetCsv, SHEET_CSV_URL } from './sheet';

function fakeFetch(text: string, ok = true): typeof fetch {
  return vi.fn(async () => ({ ok, text: async () => text }) as Response) as unknown as typeof fetch;
}

describe('fetchSheetCsv', () => {
  it('returns CSV text on success', async () => {
    const csv = 'player,date\nFennie,2/22/2026';
    expect(await fetchSheetCsv(SHEET_CSV_URL, fakeFetch(csv))).toBe(csv);
  });
  it('throws on non-OK response', async () => {
    await expect(fetchSheetCsv(SHEET_CSV_URL, fakeFetch('nope', false))).rejects.toThrow();
  });
  it('throws when the body is HTML (sign-in/redirect page)', async () => {
    await expect(fetchSheetCsv(SHEET_CSV_URL, fakeFetch('<HTML><HEAD>...'))).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/ingest/sheet.test.ts`
Expected: FAIL — cannot find module `./sheet`.

- [ ] **Step 3: Create `src/ingest/sheet.ts`**

```ts
export const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1g2-76SolXVpsw-bbcZuwslDduXo8Lnb0C9dxV3kv_sE/export?format=csv&gid=107710525';

export async function fetchSheetCsv(url: string = SHEET_CSV_URL, fetchImpl: typeof fetch = fetch): Promise<string> {
  const res = await fetchImpl(url, { headers: { 'User-Agent': 'snooze-loot-dashboard' } });
  if (!res.ok) throw new Error(`sheet fetch failed: HTTP ${res.status ?? '??'}`);
  const text = await res.text();
  if (text.trimStart().startsWith('<')) throw new Error('sheet fetch returned HTML, not CSV (is the sheet still public?)');
  return text;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/ingest/sheet.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ingest/sheet.ts src/ingest/sheet.test.ts
git commit -m "feat: public sheet CSV fetch with HTML-guard"
```

---

### Task 12: Ingest pipeline + CLI

**Files:**
- Create: `src/ingest/run.ts`, `src/ingest/run.test.ts`, `src/ingest/cli.ts`

**Interfaces:**
- Consumes: `WriteStore`, `RunRecord` (stores.ts); `parseAwards` (csv.ts); `fetchItemMeta` (wowhead.ts); `fetchSheetCsv` (sheet.ts); `ROSTER` (roster.ts); `Award` (types.ts).
- Produces:
  - `interface IngestDeps { store: WriteStore; fetchCsv: () => Promise<string>; fetchItem: (id: number) => Promise<{ name: string; quality: number; icon: string } | null>; roster: RosterEntry[]; now: () => Date }`
  - `runIngest(deps: IngestDeps): Promise<RunRecord>` — parses, upserts awards, enriches unknown item IDs, syncs roster, records a run. On any thrown error it records an `error` run and rethrows.
  - `cli.ts` wires real deps (drizzle store, real fetchers) and calls `runIngest`, exiting non-zero on failure.

- [ ] **Step 1: Write the failing test** — `src/ingest/run.test.ts`

```ts
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runIngest } from './run';
import type { WriteStore, RunRecord } from '../db/stores';
import type { RosterEntry } from '../lib/types';

const csv = readFileSync(path.join(__dirname, '../../tests/fixtures/dump.csv'), 'utf8');
const roster: RosterEntry[] = [{ player: 'Fennie', role: 'caster-dps', active: true }];

function fakeStore(known: number[] = []): WriteStore & { meta: number[]; runs: RunRecord[] } {
  const meta = [...known];
  const runs: RunRecord[] = [];
  return {
    meta, runs,
    upsertAwards: vi.fn(async (a) => a.length),
    knownItemIds: vi.fn(async () => new Set(meta)),
    insertItemMeta: vi.fn(async (m) => { meta.push(m.itemId); }),
    syncRoster: vi.fn(async () => {}),
    recordRun: vi.fn(async (r) => { runs.push(r); }),
  };
}

describe('runIngest', () => {
  it('parses, upserts, enriches unknown items, and records an ok run', async () => {
    const store = fakeStore([28776]); // 28776 already known
    const fetchItem = vi.fn(async (id: number) => ({ name: `Item ${id}`, quality: 4, icon: 'x' }));
    const rec = await runIngest({ store, fetchCsv: async () => csv, fetchItem, roster, now: () => new Date(2026, 2, 22) });

    expect(rec.status).toBe('ok');
    expect(rec.awardsSeen).toBe(7);
    expect(store.upsertAwards).toHaveBeenCalledOnce();
    expect(store.syncRoster).toHaveBeenCalledWith(roster);
    // 6 distinct item IDs in fixture, minus the 1 already known = 6 enrichment fetches
    expect(fetchItem).toHaveBeenCalledTimes(6);
    expect(rec.itemsEnriched).toBe(6);
    expect(store.runs[0].status).toBe('ok');
  });

  it('records an error run and rethrows on failure', async () => {
    const store = fakeStore();
    await expect(
      runIngest({ store, fetchCsv: async () => { throw new Error('down'); }, fetchItem: async () => null, roster, now: () => new Date() }),
    ).rejects.toThrow('down');
    expect(store.runs[0].status).toBe('error');
    expect(store.runs[0].errorMessage).toContain('down');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/ingest/run.test.ts`
Expected: FAIL — cannot find module `./run`.

- [ ] **Step 3: Create `src/ingest/run.ts`**

```ts
import type { WriteStore, RunRecord } from '../db/stores';
import type { RosterEntry } from '../lib/types';
import { parseAwards } from '../lib/csv';

export interface IngestDeps {
  store: WriteStore;
  fetchCsv: () => Promise<string>;
  fetchItem: (id: number) => Promise<{ name: string; quality: number; icon: string } | null>;
  roster: RosterEntry[];
  now: () => Date;
}

export async function runIngest(deps: IngestDeps): Promise<RunRecord> {
  const { store, fetchCsv, fetchItem, roster, now } = deps;
  let awardsSeen = 0;
  let awardsNew = 0;
  let itemsEnriched = 0;
  try {
    const csv = await fetchCsv();
    const awards = parseAwards(csv);
    awardsSeen = awards.length;

    awardsNew = await store.upsertAwards(awards);

    const known = await store.knownItemIds();
    const wanted = [...new Set(awards.map((a) => a.itemId).filter((id): id is number => id !== null))].filter((id) => !known.has(id));
    for (const id of wanted) {
      const meta = await fetchItem(id);
      if (meta) { await store.insertItemMeta({ itemId: id, ...meta }); itemsEnriched++; }
    }

    await store.syncRoster(roster);

    const rec: RunRecord = { ranAt: now(), status: 'ok', awardsSeen, awardsNew, itemsEnriched, errorMessage: null };
    await store.recordRun(rec);
    return rec;
  } catch (err) {
    const rec: RunRecord = { ranAt: now(), status: 'error', awardsSeen, awardsNew, itemsEnriched, errorMessage: err instanceof Error ? err.message : String(err) };
    await store.recordRun(rec);
    throw err;
  }
}
```

- [ ] **Step 4: Create `src/ingest/cli.ts`**

```ts
import { getDb } from '../db/client';
import { drizzleStores } from '../db/stores';
import { fetchSheetCsv } from './sheet';
import { fetchItemMeta } from './wowhead';
import { runIngest } from './run';
import { ROSTER } from '../config/roster';

async function main() {
  const store = drizzleStores(getDb());
  const rec = await runIngest({
    store,
    fetchCsv: () => fetchSheetCsv(),
    fetchItem: (id) => fetchItemMeta(id),
    roster: ROSTER,
    now: () => new Date(),
  });
  console.log(`ingest ok: seen=${rec.awardsSeen} new=${rec.awardsNew} enriched=${rec.itemsEnriched}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('ingest failed:', err);
  process.exit(1);
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/ingest/run.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ingest/run.ts src/ingest/run.test.ts src/ingest/cli.ts
git commit -m "feat: ingest pipeline orchestration + CLI entry"
```

---

### Task 13: Dashboard data assembly + API route

**Files:**
- Create: `src/server/dashboard.ts`, `src/server/dashboard.test.ts`, `src/app/api/data/route.ts`

**Interfaces:**
- Consumes: `ReadStore` (stores.ts); `computeTables`, `SpecialtyTable` (compute.ts); `computeTrends`, `TrendsData` (trends.ts); `RosterEntry`, `Role`, `ROLES` (types.ts).
- Produces:
  - `interface IngestStatus { status: 'ok' | 'error' | 'never'; ranAt: string | null; ageMinutes: number | null; error: string | null }`
  - `interface DashboardData { generatedAt: string; ingest: IngestStatus; tables: Record<Role, SpecialtyTable>; trends: TrendsData }`
  - `buildDashboard(store: ReadStore, roster: RosterEntry[], now: Date): Promise<DashboardData>`
  - `GET` route returning `DashboardData` as JSON with `Cache-Control: no-store`.

- [ ] **Step 1: Write the failing test** — `src/server/dashboard.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseAwards } from '../lib/csv';
import { buildDashboard } from './dashboard';
import type { ReadStore, RunRecord } from '../db/stores';
import type { RosterEntry } from '../lib/types';

const csv = readFileSync(path.join(__dirname, '../../tests/fixtures/dump.csv'), 'utf8');
const roster: RosterEntry[] = [
  { player: 'Fennie', role: 'caster-dps', active: true },
  { player: 'Azurepath', role: 'caster-dps', active: true },
];
const now = new Date(2026, 2, 22, 12, 0, 0);

function store(run: RunRecord | null): ReadStore {
  return {
    allAwards: async () => parseAwards(csv),
    allItemMeta: async () => [{ itemId: 28776, name: "Liar's Tongue Gloves", quality: 3, icon: 'inv_gloves_25' }],
    lastRun: async () => run,
  };
}

describe('buildDashboard', () => {
  it('assembles tables + trends + ok ingest status', async () => {
    const ranAt = new Date(2026, 2, 22, 11, 30, 0); // 30 min before now
    const data = await buildDashboard(store({ ranAt, status: 'ok', awardsSeen: 7, awardsNew: 7, itemsEnriched: 6, errorMessage: null }), roster, now);
    expect(data.ingest.status).toBe('ok');
    expect(data.ingest.ageMinutes).toBe(30);
    expect(data.tables['caster-dps'].rows.length).toBe(2);
    expect(data.trends.awardsThisSeason).toBe(4);
  });

  it('reports "never" when there is no run', async () => {
    const data = await buildDashboard(store(null), roster, now);
    expect(data.ingest.status).toBe('never');
    expect(data.ingest.ageMinutes).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/server/dashboard.test.ts`
Expected: FAIL — cannot find module `./dashboard`.

- [ ] **Step 3: Create `src/server/dashboard.ts`**

```ts
import type { ReadStore } from '../db/stores';
import type { RosterEntry, Role, ItemMeta } from '../lib/types';
import { computeTables, type SpecialtyTable } from '../lib/compute';
import { computeTrends, type TrendsData } from '../lib/trends';

export interface IngestStatus {
  status: 'ok' | 'error' | 'never';
  ranAt: string | null;
  ageMinutes: number | null;
  error: string | null;
}

export interface DashboardData {
  generatedAt: string;
  ingest: IngestStatus;
  tables: Record<Role, SpecialtyTable>;
  trends: TrendsData;
}

export async function buildDashboard(store: ReadStore, roster: RosterEntry[], now: Date): Promise<DashboardData> {
  const [awards, metaRows, run] = await Promise.all([store.allAwards(), store.allItemMeta(), store.lastRun()]);
  const meta = new Map<number, ItemMeta>(metaRows.map((m) => [m.itemId, m]));

  const ingest: IngestStatus = run
    ? {
        status: run.status,
        ranAt: run.ranAt.toISOString(),
        ageMinutes: Math.round((now.getTime() - run.ranAt.getTime()) / 60000),
        error: run.errorMessage,
      }
    : { status: 'never', ranAt: null, ageMinutes: null, error: null };

  return {
    generatedAt: now.toISOString(),
    ingest,
    tables: computeTables(awards, roster, meta, now),
    trends: computeTrends(awards, roster, now),
  };
}
```

- [ ] **Step 4: Create `src/app/api/data/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getDb } from '../../../db/client';
import { drizzleStores } from '../../../db/stores';
import { buildDashboard } from '../../../server/dashboard';
import { ROSTER } from '../../../config/roster';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await buildDashboard(drizzleStores(getDb()), ROSTER, new Date());
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/server/dashboard.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/dashboard.ts src/server/dashboard.test.ts src/app/api/data/route.ts
git commit -m "feat: dashboard data assembly + /api/data route"
```

---

### Task 14: Nocturne design tokens + quality colours

**Files:**
- Create: `src/app/globals.css`, `src/lib/quality.ts`, `src/lib/quality.test.ts`
- Modify: `src/app/layout.tsx` (import globals.css, add Inter font)

**Interfaces:**
- Produces: `qualityColor(quality: number | null): string` — WoW quality → hex/token per the handoff (`0 poor #9d9d9d`, `1 common #e9e9ed`, `2 uncommon #1eff00`, `3 rare #3d9eff`, `4 epic var(--color-accent-300)`, `5 legendary #ff8000`; null → `var(--color-text)`).

- [ ] **Step 1: Write the failing test** — `src/lib/quality.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { qualityColor } from './quality';

describe('qualityColor', () => {
  it('maps known qualities', () => {
    expect(qualityColor(2)).toBe('#1eff00');
    expect(qualityColor(3)).toBe('#3d9eff');
    expect(qualityColor(5)).toBe('#ff8000');
    expect(qualityColor(4)).toBe('var(--color-accent-300)');
  });
  it('falls back for null/unknown', () => {
    expect(qualityColor(null)).toBe('var(--color-text)');
    expect(qualityColor(99)).toBe('var(--color-text)');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/quality.test.ts`
Expected: FAIL — cannot find module `./quality`.

- [ ] **Step 3: Create `src/lib/quality.ts`**

```ts
const COLORS: Record<number, string> = {
  0: '#9d9d9d',
  1: '#e9e9ed',
  2: '#1eff00',
  3: '#3d9eff',
  4: 'var(--color-accent-300)',
  5: '#ff8000',
};

export function qualityColor(quality: number | null): string {
  if (quality === null) return 'var(--color-text)';
  return COLORS[quality] ?? 'var(--color-text)';
}
```

- [ ] **Step 4: Create `src/app/globals.css`** (Nocturne tokens; ramps approximated via OKLCH color-mix from the base accent — replace with the system's `styles.css` if provided)

```css
:root {
  --color-bg: #161826;
  --color-text: #e9e9ed;
  --color-accent: #9184d9;
  --color-accent-300: color-mix(in oklch, var(--color-accent) 55%, white);
  --color-accent-400: color-mix(in oklch, var(--color-accent) 75%, white);
  --color-accent-700: color-mix(in oklch, var(--color-accent) 70%, black);
  --color-accent-800: color-mix(in oklch, var(--color-accent) 82%, black);
  --color-accent-900: color-mix(in oklch, var(--color-accent) 90%, black);
  --color-neutral-800: color-mix(in oklch, var(--color-text) 14%, var(--color-bg));
  --color-neutral-700: color-mix(in oklch, var(--color-text) 22%, var(--color-bg));
  --surface: color-mix(in oklch, var(--color-text) 6%, var(--color-bg));
  --border: color-mix(in oklch, var(--color-text) 12%, var(--color-bg));
  --space-1: 3px; --space-2: 6px; --space-3: 9px; --space-4: 12px;
  --space-5: 16px; --space-6: 22px; --space-8: 32px; --space-10: 48px;
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px;
  --font-body: Inter, system-ui, sans-serif;
  --font-heading: Inter, system-ui, sans-serif;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}
.page { max-width: 1180px; margin: 0 auto; padding: 0 var(--space-8) var(--space-10); }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); }
.elev-sm { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4); }
.kicker { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.55; }
.muted { opacity: 0.6; }
.tag { display: inline-flex; align-items: center; gap: var(--space-2); font-size: 12px; padding: 2px 8px; border-radius: 999px; }
.tag-outline { border: 1px solid var(--border); }
.tag-accent { background: var(--color-accent-800); color: var(--color-accent-300); }
```

- [ ] **Step 5: Wire globals + Inter into `src/app/layout.tsx`**

```tsx
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-inter' });

export const metadata = { title: 'Snooze Loot Dashboard' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm vitest run src/lib/quality.test.ts && pnpm typecheck`
Expected: PASS + exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/lib/quality.ts src/lib/quality.test.ts
git commit -m "feat: Nocturne design tokens and item-quality colours"
```

---

### Task 15: Dashboard shell — nav, controls, data loading

**Files:**
- Create: `src/components/Dashboard.tsx`, `src/components/Nav.tsx`, `src/components/Segmented.tsx`, `src/components/Dashboard.test.tsx`
- Modify: `src/app/page.tsx` (server component: build initial data, render `<Dashboard>`)

**Interfaces:**
- Consumes: `DashboardData`, `IngestStatus` (dashboard.ts); `Role`, `ROLES`, `ROLE_LABELS` (types.ts). Placeholder table/trends bodies here; real ones land in Tasks 16–17.
- Produces:
  - `<Dashboard initial={DashboardData} />` — client component owning `mode`, `role`, `sortKey`, `sortDir` state; polls `/api/data` every 5 minutes to refresh.
  - `<Nav ingest={IngestStatus} />` — brand, auto-refresh tag, and a visible stale/error indicator when `status !== 'ok'` or `ageMinutes > 40`.
  - `<Segmented options={{value,label}[]} value onChange />` — radio-style segmented control.

- [ ] **Step 1: Write the failing test** — `src/components/Dashboard.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Nav } from './Nav';

describe('Nav', () => {
  it('shows a stale indicator when ingest is not ok', () => {
    render(<Nav ingest={{ status: 'error', ranAt: null, ageMinutes: null, error: 'boom' }} />);
    expect(screen.getByText(/stale|error|failed/i)).toBeTruthy();
  });
  it('shows the auto-refresh tag when ok', () => {
    render(<Nav ingest={{ status: 'ok', ranAt: '2026-03-22T11:30:00Z', ageMinutes: 10, error: null }} />);
    expect(screen.getByText(/every 20 min/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/Dashboard.test.tsx`
Expected: FAIL — cannot find module `./Nav`.

- [ ] **Step 3: Create `src/components/Segmented.tsx`**

```tsx
'use client';

export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="radiogroup" style={{ display: 'inline-flex', gap: 2, padding: 2, background: 'var(--color-neutral-800)', borderRadius: 'var(--radius-md)' }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            style={{
              border: 0, cursor: 'pointer', fontSize: 13, padding: '6px 12px', borderRadius: 'var(--radius-sm)',
              background: active ? 'var(--color-accent-800)' : 'transparent',
              color: active ? 'var(--color-accent-300)' : 'var(--color-text)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/Nav.tsx`**

```tsx
import type { IngestStatus } from '../server/dashboard';

export function Nav({ ingest }: { ingest: IngestStatus }) {
  const stale = ingest.status !== 'ok' || (ingest.ageMinutes ?? 0) > 40;
  return (
    <nav className="nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-5) var(--space-8)' }}>
      <strong style={{ fontWeight: 500 }}>Snooze Loot</strong>
      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
        {stale ? (
          <span className="tag tag-outline" style={{ color: '#ff8000' }}>
            {ingest.status === 'error' ? 'Ingest failed — data may be stale' : 'Data may be stale'}
          </span>
        ) : (
          <span className="tag tag-outline">Auto-refreshed · every 20 min</span>
        )}
        <span className="muted" style={{ fontSize: 12 }}>
          {ingest.ranAt ? `updated ${ingest.ageMinutes}m ago` : 'no data yet'}
        </span>
      </div>
    </nav>
  );
}
```

- [ ] **Step 5: Create `src/components/Dashboard.tsx`** (table/trends bodies are placeholders until Tasks 16–17)

```tsx
'use client';
import { useEffect, useState } from 'react';
import type { DashboardData } from '../server/dashboard';
import type { Role } from '../lib/types';
import { ROLES, ROLE_LABELS } from '../lib/types';
import { Nav } from './Nav';
import { Segmented } from './Segmented';

export type SortKey = 'received' | 'tierCount' | 'weeks';
export type SortDir = 'asc' | 'desc';

export function Dashboard({ initial }: { initial: DashboardData }) {
  const [data, setData] = useState(initial);
  const [mode, setMode] = useState<'table' | 'trends'>('table');
  const [role, setRole] = useState<Role>('caster-dps');
  const [sortKey, setSortKey] = useState<SortKey>('received');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch('/api/data', { cache: 'no-store' });
        if (res.ok) setData(await res.json());
      } catch { /* keep last good data */ }
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <Nav ingest={data.ingest} />
      <main className="page">
        <header style={{ padding: 'var(--space-6) 0' }}>
          <h1 style={{ fontSize: 28, fontWeight: 500, margin: 0 }}>Decision surface</h1>
          <p className="muted" style={{ maxWidth: '62ch' }}>
            Least-looted floats to the top. Only Mainspec/Need awards count.
          </p>
        </header>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
          <Segmented options={[{ value: 'table', label: 'Specialty tables' }, { value: 'trends', label: 'Breakdowns & trends' }]} value={mode} onChange={setMode} />
          {mode === 'table' && (
            <Segmented options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} value={role} onChange={setRole} />
          )}
        </div>
        {mode === 'table'
          ? <div className="card elev-sm">{/* SpecialtyTable lands in Task 16 */}<div style={{ padding: 'var(--space-6)' }} className="muted">Table for {ROLE_LABELS[role]} — {data.tables[role].rows.length} players. sort={sortKey}/{sortDir}</div></div>
          : <div className="card elev-sm">{/* TrendsView lands in Task 17 */}<div style={{ padding: 'var(--space-6)' }} className="muted">Trends — {data.trends.awardsThisSeason} awards this season</div></div>}
      </main>
    </>
  );
}
```

- [ ] **Step 6: Update `src/app/page.tsx`** to build data server-side

```tsx
import { getDb } from '../db/client';
import { drizzleStores } from '../db/stores';
import { buildDashboard } from '../server/dashboard';
import { ROSTER } from '../config/roster';
import { Dashboard } from '../components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const data = await buildDashboard(drizzleStores(getDb()), ROSTER, new Date());
  return <Dashboard initial={data} />;
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm vitest run src/components/Dashboard.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/Dashboard.tsx src/components/Nav.tsx src/components/Segmented.tsx src/components/Dashboard.test.tsx src/app/page.tsx
git commit -m "feat: dashboard shell — nav, controls, polling, server data load"
```

---

### Task 16: Specialty table component

**Files:**
- Create: `src/components/SpecialtyTable.tsx`, `src/components/ItemCellView.tsx`, `src/components/SpecialtyTable.test.tsx`
- Modify: `src/components/Dashboard.tsx` (replace the table placeholder with `<SpecialtyTable>`)

**Interfaces:**
- Consumes: `SpecialtyTable`, `PlayerRow`, `ItemCell` (compute.ts); `SortKey`, `SortDir` (Dashboard.tsx); `qualityColor` (quality.ts).
- Produces:
  - `<SpecialtyTable table={SpecialtyTable} sortKey sortDir onSort={(k)=>void} />` — renders the frozen-column decision table with heatmap pill, dynamic item columns, sortable Received/Tier/Last-drop headers, client-side sorted rows.
  - `<ItemCellView cell={ItemCell} />` — icon (if `icon`) + quality-coloured label; degrades to text-only.
  - `sortRows(rows, key, dir): PlayerRow[]` (exported pure helper, unit tested).

- [ ] **Step 1: Write the failing test** — `src/components/SpecialtyTable.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpecialtyTable, sortRows } from './SpecialtyTable';
import type { SpecialtyTable as ST, PlayerRow } from '../lib/compute';

const rows: PlayerRow[] = [
  { player: 'Alpha', className: 'MAGE', received: 5, tierCount: 2, weeksSinceLast: 1, recencyLabel: '1 wk ago', heatmap: 73, items: [{ label: 'Sextant', itemId: 1, quality: 4, icon: 'inv_x', isTier: false }] },
  { player: 'Bravo', className: 'PRIEST', received: 2, tierCount: 0, weeksSinceLast: 6, recencyLabel: '6 wks ago', heatmap: 40, items: [] },
];
const table: ST = { role: 'caster-dps', rows, maxItems: 1 };

describe('sortRows', () => {
  it('sorts ascending by received', () => {
    expect(sortRows(rows, 'received', 'asc').map((r) => r.player)).toEqual(['Bravo', 'Alpha']);
  });
  it('sorts descending by weeks', () => {
    expect(sortRows(rows, 'weeks', 'desc').map((r) => r.player)).toEqual(['Bravo', 'Alpha']);
  });
});

describe('SpecialtyTable', () => {
  it('renders player names and the received pill', () => {
    render(<SpecialtyTable table={table} sortKey="received" sortDir="asc" onSort={() => {}} />);
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Bravo')).toBeTruthy();
    expect(screen.getByText('Sextant')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/SpecialtyTable.test.tsx`
Expected: FAIL — cannot find module `./SpecialtyTable`.

- [ ] **Step 3: Create `src/components/ItemCellView.tsx`**

```tsx
import type { ItemCell } from '../lib/compute';
import { qualityColor } from '../lib/quality';

export function ItemCellView({ cell }: { cell: ItemCell }) {
  const color = cell.isTier && cell.quality === null ? 'var(--color-accent-300)' : qualityColor(cell.quality);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color, whiteSpace: 'nowrap' }}>
      {cell.icon && (
        <img
          src={`https://wow.zamimg.com/images/wow/icons/medium/${cell.icon}.jpg`}
          alt=""
          width={16}
          height={16}
          style={{ border: `1px solid ${color}`, borderRadius: 2 }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      {cell.label}
    </span>
  );
}
```

- [ ] **Step 4: Create `src/components/SpecialtyTable.tsx`**

```tsx
'use client';
import type { SpecialtyTable as ST, PlayerRow } from '../lib/compute';
import type { SortKey, SortDir } from './Dashboard';
import { ItemCellView } from './ItemCellView';

export function sortRows(rows: PlayerRow[], key: SortKey, dir: SortDir): PlayerRow[] {
  const val = (r: PlayerRow) => (key === 'received' ? r.received : key === 'tierCount' ? r.tierCount : (r.weeksSinceLast ?? -1));
  const sorted = [...rows].sort((a, b) => val(a) - val(b) || a.player.localeCompare(b.player));
  return dir === 'asc' ? sorted : sorted.reverse();
}

const frozen: React.CSSProperties = { position: 'sticky', background: 'var(--surface)', zIndex: 1 };
const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.55, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '8px 12px', borderTop: '1px solid var(--border)', whiteSpace: 'nowrap' };

function arrow(active: boolean, dir: SortDir) { return active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''; }

export function SpecialtyTable({ table, sortKey, sortDir, onSort }: {
  table: ST; sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void;
}) {
  const rows = sortRows(table.rows, sortKey, sortDir);
  const itemCols = Array.from({ length: table.maxItems }, (_, i) => i);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table" style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ ...th, ...frozen, left: 0, width: 110 }}>Name</th>
            <th style={{ ...th, ...frozen, left: 110, width: 90, cursor: 'pointer' }} onClick={() => onSort('received')}>Received{arrow(sortKey === 'received', sortDir)}</th>
            <th style={th}>Class</th>
            <th style={{ ...th, cursor: 'pointer', textAlign: 'right' }} onClick={() => onSort('tierCount')}>Tier{arrow(sortKey === 'tierCount', sortDir)}</th>
            <th style={{ ...th, cursor: 'pointer', textAlign: 'right' }} onClick={() => onSort('weeks')}>Last drop{arrow(sortKey === 'weeks', sortDir)}</th>
            {itemCols.map((i) => <th key={i} style={{ ...th, opacity: 0.5 }}>{i + 1}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.player}>
              <td style={{ ...td, ...frozen, left: 0, width: 110, fontWeight: 500 }}>{r.player}</td>
              <td style={{ ...td, ...frozen, left: 110, width: 90 }}>
                <span style={{ display: 'inline-block', minWidth: 28, textAlign: 'center', padding: '2px 8px', borderRadius: 999, background: `color-mix(in oklch, var(--color-accent) ${r.heatmap}%, transparent)` }}>{r.received}</span>
              </td>
              <td style={{ ...td }} className="muted">{r.className}</td>
              <td style={{ ...td, textAlign: 'right' }} className="muted">{r.tierCount}</td>
              <td style={{ ...td, textAlign: 'right' }} className="muted">{r.recencyLabel}</td>
              {itemCols.map((i) => <td key={i} style={td}>{r.items[i] ? <ItemCellView cell={r.items[i]} /> : null}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Wire into `src/components/Dashboard.tsx`** — replace the table placeholder block

Replace:
```tsx
          ? <div className="card elev-sm">{/* SpecialtyTable lands in Task 16 */}<div style={{ padding: 'var(--space-6)' }} className="muted">Table for {ROLE_LABELS[role]} — {data.tables[role].rows.length} players. sort={sortKey}/{sortDir}</div></div>
```
with:
```tsx
          ? <div className="card elev-sm" style={{ overflow: 'hidden' }}>
              <SpecialtyTable
                table={data.tables[role]}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={(k) => { if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); else { setSortKey(k); setSortDir('asc'); } }}
              />
            </div>
```
And add the import at the top of `Dashboard.tsx`:
```tsx
import { SpecialtyTable } from './SpecialtyTable';
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm vitest run src/components/SpecialtyTable.test.tsx && pnpm typecheck`
Expected: PASS + exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/components/SpecialtyTable.tsx src/components/ItemCellView.tsx src/components/SpecialtyTable.test.tsx src/components/Dashboard.tsx
git commit -m "feat: specialty decision table with frozen columns, heatmap, item cells"
```

---

### Task 17: Trends view component

**Files:**
- Create: `src/components/TrendsView.tsx`, `src/components/TrendsView.test.tsx`
- Modify: `src/components/Dashboard.tsx` (replace the trends placeholder with `<TrendsView>`)

**Interfaces:**
- Consumes: `TrendsData` (trends.ts).
- Produces: `<TrendsView trends={TrendsData} />` — 3 stat cards, "Awards by specialty" bars, "Awards by class" bars, "Longest droughts" + "Heaviest looted" leaderboards, "Weekly award activity" bar chart. Pure presentational.

- [ ] **Step 1: Write the failing test** — `src/components/TrendsView.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendsView } from './TrendsView';
import type { TrendsData } from '../lib/trends';

const trends: TrendsData = {
  awardsThisSeason: 6,
  tierShare: 0.5,
  longestDrought: { player: 'Bravo', className: 'PRIEST', role: 'healer', value: 6, label: '6 wks ago' },
  bySpecialty: [{ role: 'caster-dps', label: 'Casters', received: 4, tier: 2 }],
  byClass: [{ className: 'WARLOCK', received: 2, tier: 1, players: 1 }],
  longestDroughts: [{ player: 'Bravo', className: 'PRIEST', role: 'healer', value: 6, label: '6 wks ago' }],
  heaviest: [{ player: 'Alpha', className: 'MAGE', role: 'caster-dps', value: 5, label: '1 wk ago' }],
  weekly: [{ weekStart: 'Feb 22', count: 4 }, { weekStart: 'Mar 1', count: 2 }],
};

describe('TrendsView', () => {
  it('renders season totals and section labels', () => {
    render(<TrendsView trends={trends} />);
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText(/50%/)).toBeTruthy();
    expect(screen.getByText(/Awards by specialty/i)).toBeTruthy();
    expect(screen.getByText(/Heaviest looted/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/TrendsView.test.tsx`
Expected: FAIL — cannot find module `./TrendsView`.

- [ ] **Step 3: Create `src/components/TrendsView.tsx`**

```tsx
import type { TrendsData, SpecialtyBar, ClassBar, LeaderRow, WeekBar } from '../lib/trends';

const card: React.CSSProperties = { padding: 'var(--space-5)' };

function Bar({ label, value, max, caption, fill, labelW = 90 }: { label: string; value: number; max: number; caption: string; fill: string; labelW?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `${labelW}px 1fr 130px`, alignItems: 'center', gap: 'var(--space-4)', padding: '4px 0' }}>
      <span style={{ fontSize: 13 }}>{label}</span>
      <span style={{ height: 10, borderRadius: 999, background: 'var(--color-neutral-800)' }}>
        <span style={{ display: 'block', height: 10, borderRadius: 999, width: `${max ? (value / max) * 100 : 0}%`, background: fill }} />
      </span>
      <span className="muted" style={{ fontSize: 12, textAlign: 'right' }}>{caption}</span>
    </div>
  );
}

function Leaders({ title, rows, tagClass, format }: { title: string; rows: LeaderRow[]; tagClass: string; format: (r: LeaderRow) => string }) {
  return (
    <div className="card elev-sm" style={card}>
      <div className="kicker" style={{ marginBottom: 'var(--space-3)' }}>{title}</div>
      {rows.map((r) => (
        <div key={r.player} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
          <span>{r.player} <span className="muted" style={{ fontSize: 12 }}>· {r.className} · {r.role}</span></span>
          <span className={`tag ${tagClass}`}>{format(r)}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendsView({ trends }: { trends: TrendsData }) {
  const specMax = Math.max(1, ...trends.bySpecialty.map((b) => b.received));
  const classMax = Math.max(1, ...trends.byClass.map((b) => b.received));
  const weekMax = Math.max(1, ...trends.weekly.map((w) => w.count));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-5)' }}>
        <div className="card elev-sm" style={card}>
          <div className="kicker">Awards this season</div>
          <div style={{ fontSize: 32, fontFamily: 'var(--font-heading)' }}>{trends.awardsThisSeason}</div>
        </div>
        <div className="card elev-sm" style={card}>
          <div className="kicker">Tier share</div>
          <div style={{ fontSize: 32 }}>{Math.round(trends.tierShare * 100)}%</div>
        </div>
        <div className="card elev-sm" style={card}>
          <div className="kicker">Longest current drought</div>
          <div style={{ fontSize: 22 }}>{trends.longestDrought ? `${trends.longestDrought.player}` : '—'}</div>
          <div className="muted" style={{ fontSize: 12 }}>{trends.longestDrought ? `${trends.longestDrought.role} · ${trends.longestDrought.label}` : ''}</div>
        </div>
      </div>

      <div className="card elev-sm" style={card}>
        <div className="kicker" style={{ marginBottom: 'var(--space-3)' }}>Awards by specialty</div>
        {trends.bySpecialty.map((b: SpecialtyBar) => (
          <Bar key={b.role} label={b.label} value={b.received} max={specMax} caption={`${b.received} received · ${b.tier} tier`} fill="var(--color-accent)" />
        ))}
      </div>

      <div className="card elev-sm" style={card}>
        <div className="kicker" style={{ marginBottom: 'var(--space-3)' }}>Awards by class</div>
        {trends.byClass.map((b: ClassBar) => (
          <Bar key={b.className} label={b.className} value={b.received} max={classMax} caption={`${b.received} received · ${b.tier} tier · ${b.players}p`} fill="var(--color-accent-400)" labelW={110} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
        <Leaders title="Longest droughts" rows={trends.longestDroughts} tagClass="tag-outline" format={(r) => r.label} />
        <Leaders title="Heaviest looted" rows={trends.heaviest} tagClass="tag-accent" format={(r) => `${r.value}`} />
      </div>

      <div className="card elev-sm" style={card}>
        <div className="kicker" style={{ marginBottom: 'var(--space-3)' }}>Weekly award activity</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-3)', height: 120 }}>
          {trends.weekly.map((w: WeekBar) => (
            <div key={w.weekStart} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
              <span style={{ fontSize: 11 }} className="muted">{w.count}</span>
              <span style={{ width: '100%', maxWidth: 28, height: `${(w.count / weekMax) * 92}px`, background: 'var(--color-accent-700)', borderRadius: '4px 4px 0 0' }} />
              <span style={{ fontSize: 11, marginTop: 4 }} className="muted">{w.weekStart}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire into `src/components/Dashboard.tsx`** — replace the trends placeholder block

Replace:
```tsx
          : <div className="card elev-sm">{/* TrendsView lands in Task 17 */}<div style={{ padding: 'var(--space-6)' }} className="muted">Trends — {data.trends.awardsThisSeason} awards this season</div></div>}
```
with:
```tsx
          : <TrendsView trends={data.trends} />}
```
And add the import at the top of `Dashboard.tsx`:
```tsx
import { TrendsView } from './TrendsView';
```

- [ ] **Step 5: Run test + full suite + build**

Run: `pnpm vitest run src/components/TrendsView.test.tsx && pnpm test && pnpm typecheck`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/components/TrendsView.tsx src/components/TrendsView.test.tsx src/components/Dashboard.tsx
git commit -m "feat: breakdowns & trends view"
```

---

### Task 18: Deployment config, README, and go-live

**Files:**
- Create: `README.md`, `railway.json`, `.env.example` (verify from Task 1)
- Modify: `package.json` (add a combined `start:web` that migrates then serves)

**Interfaces:**
- Produces: a deployable repo. Two Railway services (web + ingest) sharing one Postgres, in a NEW Railway project.

- [ ] **Step 1: Add a migrate-then-serve script to `package.json`**

Add to `"scripts"`:
```json
    "start:web": "pnpm db:migrate && next start -p ${PORT:-3000}"
```

- [ ] **Step 2: Create `railway.json`** (build config shared by both services; each service overrides its start command in the Railway UI)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "NIXPACKS", "buildCommand": "pnpm install && pnpm build" },
  "deploy": { "startCommand": "pnpm start:web", "restartPolicyType": "ON_FAILURE" }
}
```

- [ ] **Step 3: Create `README.md`**

````markdown
# Snooze Loot Dashboard

Live loot-council decision surface for a WoW (TBC Classic) raid guild. Reads the guild's
public RCLootCouncil award-log Google Sheet on a schedule, stores it in Postgres, and serves
per-specialty decision tables + a season trends view.

## Local development

```bash
npm i -g pnpm
pnpm install
cp .env.example .env      # set DATABASE_URL to a local Postgres
pnpm db:migrate
pnpm ingest               # pull the sheet into the DB
pnpm dev                  # http://localhost:3000
```

## Tests

```bash
pnpm test
```

## Deployment (Railway — new project)

Two services sharing one Postgres database:

| Service | Start command | Notes |
|---------|---------------|-------|
| **web** | `pnpm start:web` | migrates then serves Next.js |
| **ingest** | `pnpm ingest` | set a **cron schedule** (`*/20 * * * *`) in the service settings |

- Provision a **Postgres** plugin; Railway exposes `DATABASE_URL`. Reference it into BOTH services
  as `DATABASE_URL` (Railway reference variable). It is the ONLY secret — no API keys exist in
  this app (the Google Sheet and Wowhead are public).
- Do NOT modify the pre-existing Railway project; create a brand-new one.

## Maintaining the roster

The roster (player → specialty role) is the one thing not derivable from the sheet. Edit
`src/config/roster.ts`, commit, and push — the next ingest syncs it. Set `active: false` to retire
a player without losing their history.
````

- [ ] **Step 4: Verify the full build + suite locally**

Run: `pnpm install && pnpm test && pnpm build`
Expected: tests green; `pnpm build` completes (Next production build). The build does not need a DB (pages are `force-dynamic`).

- [ ] **Step 5: Commit**

```bash
git add README.md railway.json package.json
git commit -m "chore: deployment config and project README"
```

- [ ] **Step 6: Create the GitHub repo and push** (see "Provisioning" section below for the exact commands, run at execution time)

- [ ] **Step 7: Provision Railway and verify go-live** (see "Provisioning" section below)

---

## Provisioning (run once, at execution time — not code)

These are operational steps performed after the code is built and tests pass. They are separated
because they create external resources.

### GitHub
```bash
cd /Users/niall/src/snooze-loot-dashboard
gh repo create Ntrinder/snooze-loot-dashboard --public --source=. --remote=origin --push
```

### Railway (new project — never touch the existing one)
Use the Railway MCP tools (authenticate first). Steps:
1. Create a NEW project (e.g. `snooze-loot-dashboard`). Confirm it is not the pre-existing project.
2. Add a **Postgres** database to the project.
3. Create the **web** service from the GitHub repo; set start command `pnpm start:web`; add a
   `DATABASE_URL` reference variable pointing at the Postgres.
4. Create the **ingest** service from the same repo; set start command `pnpm ingest`; add the same
   `DATABASE_URL` reference; set a **cron schedule** `*/20 * * * *`.
5. Trigger one manual ingest run; confirm the web service renders populated tables.
6. Confirm no secrets are committed: `git grep -nE "postgres://|DATABASE_URL=" -- . ':!.env.example' ':!README.md'` returns nothing.

---

## Self-review notes (coverage against the spec)

- Spec §3 architecture → Tasks 1, 8, 12, 13, 15 (Next.js app, DB, ingest, compute-on-read, UI).
- Spec §4 data model (4 tables) → Task 8.
- Spec §5 ingest pipeline → Tasks 10, 11, 12.
- Spec §6 compute (filter, tier regex, recency, heatmap, trends) → Tasks 4, 5, 6, 7.
- Spec §7 frontend (both views, frozen columns, quality colours, stale indicator, skeleton) →
  Tasks 14, 15, 16, 17. (Loading skeleton: initial render is server-side so data is present on first
  paint; the client poll keeps last-good data on failure — no blank state. An explicit skeleton is
  therefore unnecessary for the server-rendered first paint; the stale indicator in Nav covers the
  failure requirement.)
- Spec §8 repo (public, handoff copied, .env ignored) → Tasks 1, 18 + Provisioning.
- Spec §2 no exposed secrets → only `DATABASE_URL`; verified by the `git grep` check in Provisioning.
- **Known data consideration (surfaced, not silently dropped):** the real dump contains occasional
  quest/junk items awarded as `Mainspec/Need` (e.g. "Magtheridon's Head", subType `Junk`). Per the
  confirmed rules these count. If the council later wants them excluded, add a subType filter in
  `computeTables`/`computeTrends` — deliberately deferred, not overlooked.
```
