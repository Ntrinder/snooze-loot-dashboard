import type { IngestStatus } from '../server/dashboard';

export function Nav({ ingest }: { ingest: IngestStatus }) {
  const stale = ingest.status !== 'ok' || (ingest.ageMinutes ?? 0) > 40;
  return (
    <nav className="nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-5) var(--space-8)' }}>
      <strong style={{ fontWeight: 500 }}>Snooze Loot</strong>
      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
        {stale ? (
          <span className="tag tag-outline" style={{ color: '#ff8000' }}>
            {ingest.status === 'error' ? 'Ingest failed — data may be stale' : 'Data may be stale'}
          </span>
        ) : (
          <span className="tag tag-outline">Auto-refreshed · every 20 min</span>
        )}
        <span className="muted" style={{ fontSize: 12 }}>
          {ingest.ranAt ? `updated ${ingest.ageMinutes}m ago` : 'no data yet'}
        </span>
      </div>
    </nav>
  );
}
