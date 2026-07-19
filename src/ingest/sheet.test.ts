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
