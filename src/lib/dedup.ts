import { createHash } from 'node:crypto';
import type { Award } from './types';

export function dedupKey(a: Pick<Award, 'player' | 'awardedAt' | 'itemId' | 'response'>): string {
  const parts = [a.player, a.awardedAt.toISOString(), a.itemId ?? '', a.response].join('|');
  return createHash('sha1').update(parts).digest('hex');
}
