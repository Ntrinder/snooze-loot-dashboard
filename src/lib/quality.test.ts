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
