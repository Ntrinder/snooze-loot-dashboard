const COLORS: Record<number, string> = {
  0: '#9d9d9d',
  1: '#e9e9ed',
  2: '#1eff00',
  3: '#3d9eff',
  4: 'var(--color-accent-300)',
  5: '#ff8000',
};

export function qualityColor(quality: number | null): string {
  if (quality === null) return 'var(--color-text)';
  return COLORS[quality] ?? 'var(--color-text)';
}
