import type { TrendsData, SpecialtyBar, ClassBar, LeaderRow, WeekBar } from '../lib/trends';

const card: React.CSSProperties = { padding: 'var(--space-5)' };

function Bar({ label, value, max, caption, fill, labelW = 90 }: { label: string; value: number; max: number; caption: string; fill: string; labelW?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `${labelW}px 1fr 130px`, alignItems: 'center', gap: 'var(--space-4)', padding: '4px 0' }}>
      <span style={{ fontSize: 13 }}>{label}</span>
      <span style={{ height: 10, borderRadius: 999, background: 'var(--color-neutral-800)' }}>
        <span style={{ display: 'block', height: 10, borderRadius: 999, width: `${max ? (value / max) * 100 : 0}%`, background: fill }} />
      </span>
      <span className="muted" style={{ fontSize: 12, textAlign: 'right' }}>{caption}</span>
    </div>
  );
}

function Leaders({ title, rows, tagClass, format }: { title: string; rows: LeaderRow[]; tagClass: string; format: (r: LeaderRow) => string }) {
  return (
    <div className="card elev-sm" style={card}>
      <div className="kicker" style={{ marginBottom: 'var(--space-3)' }}>{title}</div>
      {rows.map((r) => (
        <div key={r.player} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
          <span>{r.player} <span className="muted" style={{ fontSize: 12 }}>· {r.className} · {r.role}</span></span>
          <span className={`tag ${tagClass}`}>{format(r)}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendsView({ trends }: { trends: TrendsData }) {
  const specMax = Math.max(1, ...trends.bySpecialty.map((b) => b.received));
  const classMax = Math.max(1, ...trends.byClass.map((b) => b.received));
  const weekMax = Math.max(1, ...trends.weekly.map((w) => w.count));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-5)' }}>
        <div className="card elev-sm" style={card}>
          <div className="kicker">Awards this season</div>
          <div style={{ fontSize: 32, fontFamily: 'var(--font-heading)' }}>{trends.awardsThisSeason}</div>
        </div>
        <div className="card elev-sm" style={card}>
          <div className="kicker">Tier share</div>
          <div style={{ fontSize: 32 }}>{Math.round(trends.tierShare * 100)}%</div>
        </div>
        <div className="card elev-sm" style={card}>
          <div className="kicker">Longest current drought</div>
          <div style={{ fontSize: 22 }}>{trends.longestDrought ? `${trends.longestDrought.player}` : '—'}</div>
          <div className="muted" style={{ fontSize: 12 }}>{trends.longestDrought ? `${trends.longestDrought.role} · ${trends.longestDrought.label}` : ''}</div>
        </div>
      </div>

      <div className="card elev-sm" style={card}>
        <div className="kicker" style={{ marginBottom: 'var(--space-3)' }}>Awards by specialty</div>
        {trends.bySpecialty.map((b: SpecialtyBar) => (
          <Bar key={b.role} label={b.label} value={b.received} max={specMax} caption={`${b.received} received · ${b.tier} tier`} fill="var(--color-accent)" />
        ))}
      </div>

      <div className="card elev-sm" style={card}>
        <div className="kicker" style={{ marginBottom: 'var(--space-3)' }}>Awards by class</div>
        {trends.byClass.map((b: ClassBar) => (
          <Bar key={b.className} label={b.className} value={b.received} max={classMax} caption={`${b.received} received · ${b.tier} tier · ${b.players}p`} fill="var(--color-accent-400)" labelW={110} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
        <Leaders title="Longest droughts" rows={trends.longestDroughts} tagClass="tag-outline" format={(r) => r.label} />
        <Leaders title="Heaviest looted" rows={trends.heaviest} tagClass="tag-accent" format={(r) => `${r.value}`} />
      </div>

      <div className="card elev-sm" style={card}>
        <div className="kicker" style={{ marginBottom: 'var(--space-3)' }}>Weekly award activity</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-3)', height: 120 }}>
          {trends.weekly.map((w: WeekBar) => (
            <div key={w.weekStart} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
              <span style={{ fontSize: 11 }} className="muted">{w.count}</span>
              <span style={{ width: '100%', maxWidth: 28, height: `${(w.count / weekMax) * 92}px`, background: 'var(--color-accent-700)', borderRadius: '4px 4px 0 0' }} />
              <span style={{ fontSize: 11, marginTop: 4 }} className="muted">{w.weekStart}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
