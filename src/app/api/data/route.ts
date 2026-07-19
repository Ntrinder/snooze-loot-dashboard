import { NextResponse } from 'next/server';
import { getDb } from '../../../db/client';
import { drizzleStores } from '../../../db/stores';
import { buildDashboard } from '../../../server/dashboard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await buildDashboard(drizzleStores(getDb()), new Date());
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
