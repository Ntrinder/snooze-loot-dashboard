import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Nav } from './Nav';

describe('Nav', () => {
  it('shows a stale indicator when ingest is not ok', () => {
    render(<Nav ingest={{ status: 'error', ranAt: null, ageMinutes: null, error: 'boom' }} />);
    expect(screen.getByText(/stale|error|failed/i)).toBeTruthy();
  });
  it('shows the auto-refresh tag when ok', () => {
    render(<Nav ingest={{ status: 'ok', ranAt: '2026-03-22T11:30:00Z', ageMinutes: 10, error: null }} />);
    expect(screen.getByText(/every 20 min/i)).toBeTruthy();
  });
});
