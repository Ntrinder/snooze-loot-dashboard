'use client';

export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="radiogroup" style={{ display: 'inline-flex', gap: 2, padding: 2, background: 'var(--color-neutral-800)', borderRadius: 'var(--radius-md)' }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            style={{
              border: 0, cursor: 'pointer', fontSize: 13, padding: '6px 12px', borderRadius: 'var(--radius-sm)',
              background: active ? 'var(--color-accent-800)' : 'transparent',
              color: active ? 'var(--color-accent-300)' : 'var(--color-text)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
