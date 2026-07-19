import { getDb } from '../db/client';
import { drizzleStores } from '../db/stores';
import { buildDashboard } from '../server/dashboard';
import { Dashboard } from '../components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const data = await buildDashboard(drizzleStores(getDb()), new Date());
  return <Dashboard initial={data} />;
}
