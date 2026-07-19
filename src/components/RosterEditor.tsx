'use client';
import { useState } from 'react';
import type { Role } from '../lib/types';
import { ROLES, ROLE_LABELS } from '../lib/types';
import type { RosterListEntry } from '../lib/rosterList';

export function RosterEditor({ initial }: { initial: RosterListEntry[] }) {
  const [rows, setRows] = useState(initial);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  async function save(player: string, role: Role | null) {
    const prev = rows;
    setRows((rs) => rs.map((r) => (r.player === player ? { ...r, role } : r)));
    setFailed((f) => ({ ...f, [player]: false }));
    try {
      const res = await fetch('/api/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player, role }),
      });
      if (!res.ok) throw new Error('bad status');
    } catch {
      setRows(prev); // revert
      setFailed((f) => ({ ...f, [player]: true }));
    }
  }

  return (
    <main className="page">
      <header style={{ padding: 'var(--space-6) 0' }}>
        <h1 style={{ fontSize: 28, fontWeight: 500, margin: 0 }}>Roster</h1>
        <p className="muted" style={{ maxWidth: '62ch' }}>
          Assign each player a specialty. Players appear here automatically once they receive loot.
          Unassigned players are hidden from the decision tables.
        </p>
      </header>
      <div className="card elev-sm" style={{ overflow: 'hidden' }}>
        <table className="table" style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
          <tbody>
            {rows.map((r) => (
              <tr key={r.player}>
                <td style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', fontWeight: 500 }}>
                  {r.player}
                  {failed[r.player] && <span style={{ color: '#ff8000', marginLeft: 8, fontSize: 12 }}>save failed</span>}
                </td>
                <td style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
                  <select
                    aria-label={`specialty for ${r.player}`}
                    value={r.role ?? ''}
                    onChange={(e) => save(r.player, e.target.value === '' ? null : (e.target.value as Role))}
                    style={{ background: 'var(--color-neutral-800)', color: 'var(--color-text)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px 8px' }}
                  >
                    <option value="">Unassigned</option>
                    {ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
