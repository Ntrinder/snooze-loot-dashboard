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
