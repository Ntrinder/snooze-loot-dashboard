import { getDb } from '../db/client';
import { drizzleStores } from '../db/stores';
import { fetchSheetCsv } from './sheet';
import { fetchItemMeta } from './wowhead';
import { runIngest } from './run';

async function main() {
  const store = drizzleStores(getDb());
  const rec = await runIngest({
    store,
    fetchCsv: () => fetchSheetCsv(),
    fetchItem: (id) => fetchItemMeta(id),
    now: () => new Date(),
  });
  console.log(`ingest ok: seen=${rec.awardsSeen} new=${rec.awardsNew} enriched=${rec.itemsEnriched}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('ingest failed:', err);
  process.exit(1);
});
