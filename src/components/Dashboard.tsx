'use client';
import { useEffect, useState } from 'react';
import type { DashboardData } from '../server/dashboard';
import type { Role, Phase } from '../lib/types';
import { ROLES, ROLE_LABELS } from '../lib/types';
import { Nav } from './Nav';
import { Segmented } from './Segmented';
import { SpecialtyTable } from './SpecialtyTable';
import { TrendsView } from './TrendsView';

export type SortKey = 'received' | 'tierCount' | 'weeks';
export type SortDir = 'asc' | 'desc';

export function Dashboard({ initial }: { initial: DashboardData }) {
  const [data, setData] = useState(initial);
  const [mode, setMode] = useState<'table' | 'trends'>('table');
  const [role, setRole] = useState<Role>('caster-dps');
  const [phase, setPhase] = useState<Phase>('all');
  const [sortKey, setSortKey] = useState<SortKey>('received');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Fetch on phase change, then keep polling for that phase.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/data?phase=${phase}`, { cache: 'no-store' });
        if (res.ok && !cancelled) setData(await res.json());
      } catch { /* keep last good data */ }
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, [phase]);

  return (
    <>
      <Nav ingest={data.ingest} />
      <main className="page">
        <header style={{ padding: 'var(--space-6) 0' }}>
          <h1 style={{ fontSize: 28, fontWeight: 500, margin: 0 }}>Decision surface</h1>
          <p className="muted" style={{ maxWidth: '62ch' }}>
            Least-looted floats to the top. Only Mainspec/Need awards count.
          </p>
        </header>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
          <Segmented options={[{ value: 'table', label: 'Specialty tables' }, { value: 'trends', label: 'Breakdowns & trends' }]} value={mode} onChange={setMode} />
          {mode === 'table' && (
            <Segmented options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} value={role} onChange={setRole} />
          )}
          {data.hasPhase2 && (
            <Segmented
              options={[{ value: 'all', label: 'All' }, { value: 'phase1', label: 'Phase 1' }, { value: 'phase2', label: 'Phase 2' }]}
              value={phase}
              onChange={setPhase}
            />
          )}
        </div>
        {mode === 'table'
          ? <div className="card elev-sm" style={{ overflow: 'hidden' }}>
              <SpecialtyTable
                table={data.tables[role]}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={(k) => { if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); else { setSortKey(k); setSortDir('asc'); } }}
              />
            </div>
          : <TrendsView trends={data.trends} />}
      </main>
    </>
  );
}
