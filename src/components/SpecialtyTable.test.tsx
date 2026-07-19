import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpecialtyTable, sortRows } from './SpecialtyTable';
import type { SpecialtyTable as ST, PlayerRow } from '../lib/compute';

const rows: PlayerRow[] = [
  { player: 'Alpha', className: 'MAGE', received: 5, tierCount: 2, weeksSinceLast: 1, recencyLabel: '1 wk ago', heatmap: 73, items: [{ label: 'Sextant', itemId: 1, quality: 4, icon: 'inv_x', isTier: false }] },
  { player: 'Bravo', className: 'PRIEST', received: 2, tierCount: 0, weeksSinceLast: 6, recencyLabel: '6 wks ago', heatmap: 40, items: [] },
];
const table: ST = { role: 'caster-dps', rows, maxItems: 1 };

describe('sortRows', () => {
  it('sorts ascending by received', () => {
    expect(sortRows(rows, 'received', 'asc').map((r) => r.player)).toEqual(['Bravo', 'Alpha']);
  });
  it('sorts descending by weeks', () => {
    expect(sortRows(rows, 'weeks', 'desc').map((r) => r.player)).toEqual(['Bravo', 'Alpha']);
  });
  it('maintains stable ascending tie-break on descending sort', () => {
    const tiedRows: PlayerRow[] = [
      { player: 'Zeta', className: 'ROGUE', received: 5, tierCount: 2, weeksSinceLast: 1, recencyLabel: '1 wk ago', heatmap: 60, items: [] },
      { player: 'Alpha', className: 'MAGE', received: 5, tierCount: 3, weeksSinceLast: 2, recencyLabel: '2 wks ago', heatmap: 70, items: [] },
    ];
    expect(sortRows(tiedRows, 'received', 'desc').map((r) => r.player)).toEqual(['Alpha', 'Zeta']);
  });
});

describe('SpecialtyTable', () => {
  it('renders player names and the received pill', () => {
    render(<SpecialtyTable table={table} sortKey="received" sortDir="asc" onSort={() => {}} />);
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Bravo')).toBeTruthy();
    expect(screen.getByText('Sextant')).toBeTruthy();
  });
});
