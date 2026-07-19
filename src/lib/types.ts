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

export interface RosterEntry {
  player: string;
  role: Role | null;
  dead: boolean;
}

export type Phase = 'all' | 'phase1' | 'phase2';

export interface ItemMeta {
  itemId: number;
  name: string;
  quality: number; // 0..5 (poor..legendary)
  icon: string; // Wowhead icon slug
}
