import { NextResponse } from 'next/server';
import { getDb } from '../../../db/client';
import { drizzleStores } from '../../../db/stores';
import { buildDashboard } from '../../../server/dashboard';
import type { Phase, RaidFilter } from '../../../lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const p = params.get('phase');
  const phase: Phase = p === 'phase1' || p === 'phase2' ? p : 'all';
  const r = params.get('raid');
  const raid: RaidFilter = r === 'raid1' || r === 'raid2' ? r : 'both';
  const data = await buildDashboard(drizzleStores(getDb()), new Date(), phase, raid);
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
