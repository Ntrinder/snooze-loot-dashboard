import { NextResponse } from 'next/server';
import { getDb } from '../../../db/client';
import { drizzleStores } from '../../../db/stores';
import { mergeRosterList, isRole, isRaid } from '../../../lib/rosterList';

export const dynamic = 'force-dynamic';

export async function GET() {
  const store = drizzleStores(getDb());
  const [players, roster] = await Promise.all([store.distinctPlayers(), store.allRoster()]);
  return NextResponse.json(mergeRosterList(players, roster), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { player?: unknown; role?: unknown; dead?: unknown; raid?: unknown } | null;
  if (!body || typeof body.player !== 'string' || !body.player) {
    return NextResponse.json({ error: 'player is required' }, { status: 400 });
  }
  const store = drizzleStores(getDb());
  if (typeof body.dead === 'boolean') {
    await store.setDead(body.player, body.dead);
    return NextResponse.json({ ok: true });
  }
  if ('raid' in body) {
    if (body.raid !== null && !isRaid(body.raid)) {
      return NextResponse.json({ error: 'invalid raid' }, { status: 400 });
    }
    await store.setRaid(body.player, body.raid as Parameters<typeof store.setRaid>[1]);
    return NextResponse.json({ ok: true });
  }
  if ('role' in body) {
    if (body.role !== null && !isRole(body.role)) {
      return NextResponse.json({ error: 'invalid role' }, { status: 400 });
    }
    await store.setRole(body.player, body.role as Parameters<typeof store.setRole>[1]);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
}
