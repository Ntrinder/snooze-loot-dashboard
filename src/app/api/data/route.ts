import { NextResponse } from 'next/server';
import { getDb } from '../../../db/client';
import { drizzleStores } from '../../../db/stores';
import { buildDashboard } from '../../../server/dashboard';
import type { Phase } from '../../../lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams.get('phase');
  const phase: Phase = p === 'phase1' || p === 'phase2' ? p : 'all';
  const data = await buildDashboard(drizzleStores(getDb()), new Date(), phase);
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
