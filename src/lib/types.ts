export type Role = 'caster-dps' | 'melee-dps' | 'tank' | 'healer';

export const ROLES: Role[] = ['caster-dps', 'melee-dps', 'tank', 'healer'];

export const ROLE_LABELS: Record<Role, string> = {
  'caster-dps': 'Casters',
  'melee-dps': 'Melee',
  tank: 'Tanks',
  healer: 'Healers',
};

export interface Award {
  player: string;
  awardedAt: Date;
  item: string;
  itemId: number | null;
  itemString: string;
  response: string;
  className: string;
  instance: string;
  boss: string;
  note: string;
}

export type Raid = 1 | 2;

export interface RosterEntry {
  player: string;
  role: Role | null;
  dead: boolean;
  raid: Raid | null;
}

export type Phase = 'all' | 'phase1' | 'phase2';
export type RaidFilter = 'both' | 'raid1' | 'raid2';

export interface ItemMeta {
  itemId: number;
  name: string;
  quality: number; // 0..5 (poor..legendary)
  icon: string; // Wowhead icon slug
}
