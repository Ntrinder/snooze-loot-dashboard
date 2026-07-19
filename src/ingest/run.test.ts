import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runIngest } from './run';
import type { WriteStore, RunRecord } from '../db/stores';

const csv = readFileSync(path.join(__dirname, '../../tests/fixtures/dump.csv'), 'utf8');

function fakeStore(known: number[] = []): WriteStore & { meta: number[]; runs: RunRecord[] } {
  const meta = [...known];
  const runs: RunRecord[] = [];
  return {
    meta, runs,
    upsertAwards: vi.fn(async (a) => a.length),
    knownItemIds: vi.fn(async () => new Set(meta)),
    insertItemMeta: vi.fn(async (m) => { meta.push(m.itemId); }),
    setRole: vi.fn(async () => {}),
    setDead: vi.fn(async () => {}),
    setConfig: vi.fn(async () => {}),
    recordRun: vi.fn(async (r) => { runs.push(r); }),
  };
}

describe('runIngest', () => {
  it('parses, upserts, enriches unknown items, and records an ok run', async () => {
    const store = fakeStore([28776]); // 28776 already known
    const fetchItem = vi.fn(async (id: number) => ({ name: `Item ${id}`, quality: 4, icon: 'x' }));
    const rec = await runIngest({ store, fetchCsv: async () => csv, fetchItem, now: () => new Date(2026, 2, 22) });

    expect(rec.status).toBe('ok');
    expect(rec.awardsSeen).toBe(7);
    expect(store.upsertAwards).toHaveBeenCalledOnce();
    // ingest never touches the roster
    expect(store.setRole).not.toHaveBeenCalled();
    // 6 distinct item IDs in fixture, minus the 1 already known = 6 enrichment fetches
    expect(fetchItem).toHaveBeenCalledTimes(6);
    expect(rec.itemsEnriched).toBe(6);
    expect(store.runs[0].status).toBe('ok');
  });

  it('records an error run and rethrows on failure', async () => {
    const store = fakeStore();
    await expect(
      runIngest({ store, fetchCsv: async () => { throw new Error('down'); }, fetchItem: async () => null, now: () => new Date() }),
    ).rejects.toThrow('down');
    expect(store.runs[0].status).toBe('error');
    expect(store.runs[0].errorMessage).toContain('down');
  });
});
