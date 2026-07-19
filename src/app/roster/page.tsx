import { getDb } from '../../db/client';
import { drizzleStores } from '../../db/stores';
import { mergeRosterList } from '../../lib/rosterList';
import { RosterEditor } from '../../components/RosterEditor';

export const dynamic = 'force-dynamic';

export default async function RosterPage() {
  const store = drizzleStores(getDb());
  const [players, roster] = await Promise.all([store.distinctPlayers(), store.allRoster()]);
  return <RosterEditor initial={mergeRosterList(players, roster)} />;
}
