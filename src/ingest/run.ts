import type { WriteStore, RunRecord } from '../db/stores';
import { parseAwards, findPhase2Start } from '../lib/csv';

export interface IngestDeps {
  store: WriteStore;
  fetchCsv: () => Promise<string>;
  fetchItem: (id: number) => Promise<{ name: string; quality: number; icon: string } | null>;
  now: () => Date;
}

export async function runIngest(deps: IngestDeps): Promise<RunRecord> {
  const { store, fetchCsv, fetchItem, now } = deps;
  let awardsSeen = 0;
  let awardsNew = 0;
  let itemsEnriched = 0;
  try {
    const csv = await fetchCsv();
    const awards = parseAwards(csv);
    awardsSeen = awards.length;

    awardsNew = await store.upsertAwards(awards);

    const phase2Start = findPhase2Start(csv);
    if (phase2Start) await store.setConfig('phase2_start', phase2Start.toISOString());

    const known = await store.knownItemIds();
    const wanted = [...new Set(awards.map((a) => a.itemId).filter((id): id is number => id !== null))].filter((id) => !known.has(id));
    for (const id of wanted) {
      const meta = await fetchItem(id);
      if (meta) { await store.insertItemMeta({ itemId: id, ...meta }); itemsEnriched++; }
    }

    const rec: RunRecord = { ranAt: now(), status: 'ok', awardsSeen, awardsNew, itemsEnriched, errorMessage: null };
    await store.recordRun(rec);
    return rec;
  } catch (err) {
    const rec: RunRecord = { ranAt: now(), status: 'error', awardsSeen, awardsNew, itemsEnriched, errorMessage: err instanceof Error ? err.message : String(err) };
    await store.recordRun(rec);
    throw err;
  }
}
