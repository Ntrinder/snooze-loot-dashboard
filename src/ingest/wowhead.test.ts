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
