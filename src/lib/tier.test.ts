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
