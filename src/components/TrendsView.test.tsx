import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendsView } from './TrendsView';
import type { TrendsData } from '../lib/trends';

const trends: TrendsData = {
  awardsThisSeason: 6,
  tierShare: 0.5,
  longestDrought: { player: 'Bravo', className: 'PRIEST', role: 'healer', value: 6, label: '6 wks ago' },
  bySpecialty: [{ role: 'caster-dps', label: 'Casters', received: 4, tier: 2 }],
  byClass: [{ className: 'WARLOCK', received: 2, tier: 1, players: 1 }],
  longestDroughts: [{ player: 'Bravo', className: 'PRIEST', role: 'healer', value: 6, label: '6 wks ago' }],
  heaviest: [{ player: 'Alpha', className: 'MAGE', role: 'caster-dps', value: 5, label: '1 wk ago' }],
  weekly: [{ weekStart: 'Feb 22', count: 4 }, { weekStart: 'Mar 1', count: 2 }],
};

describe('TrendsView', () => {
  it('renders season totals and section labels', () => {
    render(<TrendsView trends={trends} />);
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText(/50%/)).toBeTruthy();
    expect(screen.getByText(/Awards by specialty/i)).toBeTruthy();
    expect(screen.getByText(/Heaviest looted/i)).toBeTruthy();
  });
});
