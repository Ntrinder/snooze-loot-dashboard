const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function weeksSince(last: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - last.getTime()) / WEEK_MS));
}

export function recencyLabel(weeks: number | null): string {
  if (weeks === null) return '—';
  if (weeks <= 0) return 'This week';
  if (weeks === 1) return '1 wk ago';
  return `${weeks} wks ago`;
}
