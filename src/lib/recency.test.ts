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
