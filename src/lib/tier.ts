const TIER_RE =
  /^(Helm|Crown|Cowl|Pauldrons|Mantle|Chestguard|Robe|Breastplate|Gloves|Gauntlets|Handguards|Leggings) of the (Fallen|Vanquished) (Champion|Hero|Defender)$/;

const SLOT: Record<string, string> = {
  Helm: 'Head', Crown: 'Head', Cowl: 'Head',
  Pauldrons: 'Shoulders', Mantle: 'Shoulders',
  Chestguard: 'Chest', Robe: 'Chest', Breastplate: 'Chest',
  Gloves: 'Gloves', Gauntlets: 'Gloves', Handguards: 'Gloves',
  Leggings: 'Legs',
};

export function tierSlot(name: string): string | null {
  const m = TIER_RE.exec(name.trim());
  return m ? SLOT[m[1]] : null;
}

export function isTier(name: string): boolean {
  return tierSlot(name) !== null;
}

export function itemLabel(name: string): string {
  const slot = tierSlot(name);
  return slot ? `Tier ${slot}` : name;
}
