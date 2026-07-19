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
- **Start commands are per-service** (`pnpm start:web` vs `pnpm ingest`), set in each service's
  settings. `railway.json` deliberately defines only the shared **build**, not a `startCommand` —
  a single start command there would be forced onto both services.

## Maintaining the roster

The roster (player → specialty role) is the one thing not derivable from the sheet. Open the
**`/roster`** page: every player who has received loot appears with a specialty dropdown. Assign a
specialty (autosaves) or set "Unassigned" to hide them from the tables. No redeploy needed.
