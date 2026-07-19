'use client';
import type { SpecialtyTable as ST, PlayerRow } from '../lib/compute';
import type { SortKey, SortDir } from './Dashboard';
import { ItemCellView } from './ItemCellView';

export function sortRows(rows: PlayerRow[], key: SortKey, dir: SortDir): PlayerRow[] {
  const val = (r: PlayerRow) => (key === 'received' ? r.received : key === 'tierCount' ? r.tierCount : (r.weeksSinceLast ?? -1));
  const sorted = [...rows].sort((a, b) => val(a) - val(b) || a.player.localeCompare(b.player));
  return dir === 'asc' ? sorted : sorted.reverse();
}

const frozen: React.CSSProperties = { position: 'sticky', background: 'var(--surface)', zIndex: 1 };
const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.55, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '8px 12px', borderTop: '1px solid var(--border)', whiteSpace: 'nowrap' };

function arrow(active: boolean, dir: SortDir) { return active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''; }

export function SpecialtyTable({ table, sortKey, sortDir, onSort }: {
  table: ST; sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void;
}) {
  const rows = sortRows(table.rows, sortKey, sortDir);
  const itemCols = Array.from({ length: table.maxItems }, (_, i) => i);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table" style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ ...th, ...frozen, left: 0, width: 110 }}>Name</th>
            <th style={{ ...th, ...frozen, left: 110, width: 90, cursor: 'pointer' }} onClick={() => onSort('received')}>Received{arrow(sortKey === 'received', sortDir)}</th>
            <th style={th}>Class</th>
            <th style={{ ...th, cursor: 'pointer', textAlign: 'right' }} onClick={() => onSort('tierCount')}>Tier{arrow(sortKey === 'tierCount', sortDir)}</th>
            <th style={{ ...th, cursor: 'pointer', textAlign: 'right' }} onClick={() => onSort('weeks')}>Last drop{arrow(sortKey === 'weeks', sortDir)}</th>
            {itemCols.map((i) => <th key={i} style={{ ...th, opacity: 0.5 }}>{i + 1}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.player}>
              <td style={{ ...td, ...frozen, left: 0, width: 110, fontWeight: 500 }}>{r.player}</td>
              <td style={{ ...td, ...frozen, left: 110, width: 90 }}>
                <span style={{ display: 'inline-block', minWidth: 28, textAlign: 'center', padding: '2px 8px', borderRadius: 999, background: `color-mix(in oklch, var(--color-accent) ${r.heatmap}%, transparent)` }}>{r.received}</span>
              </td>
              <td style={{ ...td }} className="muted">{r.className}</td>
              <td style={{ ...td, textAlign: 'right' }} className="muted">{r.tierCount}</td>
              <td style={{ ...td, textAlign: 'right' }} className="muted">{r.recencyLabel}</td>
              {itemCols.map((i) => <td key={i} style={td}>{r.items[i] ? <ItemCellView cell={r.items[i]} /> : null}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
