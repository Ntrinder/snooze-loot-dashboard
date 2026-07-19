import { NextResponse } from 'next/server';
import { getDb } from '../../../db/client';
import { drizzleStores } from '../../../db/stores';
import { mergeRosterList, isRole } from '../../../lib/rosterList';

export const dynamic = 'force-dynamic';

export async function GET() {
  const store = drizzleStores(getDb());
  const [players, roster] = await Promise.all([store.distinctPlayers(), store.allRoster()]);
  return NextResponse.json(mergeRosterList(players, roster), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { player?: unknown; role?: unknown } | null;
  if (!body || typeof body.player !== 'string' || !body.player) {
    return NextResponse.json({ error: 'player is required' }, { status: 400 });
  }
  if (body.role !== null && !isRole(body.role)) {
    return NextResponse.json({ error: 'invalid role' }, { status: 400 });
  }
  await drizzleStores(getDb()).setRole(body.player, body.role as Parameters<ReturnType<typeof drizzleStores>['setRole']>[1]);
  return NextResponse.json({ ok: true });
}
