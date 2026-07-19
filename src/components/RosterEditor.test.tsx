import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RosterEditor } from './RosterEditor';
import type { RosterListEntry } from '../lib/rosterList';

const initial: RosterListEntry[] = [
  { player: 'Azurepath', role: 'caster-dps', dead: false },
  { player: 'Fennie', role: null, dead: false },
];

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }) as Response));
});

describe('RosterEditor', () => {
  it('renders every player with its current role selected', () => {
    render(<RosterEditor initial={initial} />);
    expect(screen.getByText('Azurepath')).toBeTruthy();
    const fennie = screen.getByLabelText('specialty for Fennie') as HTMLSelectElement;
    expect(fennie.value).toBe('');
  });

  it('POSTs the new role on change', async () => {
    render(<RosterEditor initial={initial} />);
    const fennie = screen.getByLabelText('specialty for Fennie') as HTMLSelectElement;
    fireEvent.change(fennie, { target: { value: 'healer' } });
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/roster', expect.objectContaining({ method: 'POST' })));
    const body = JSON.parse((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).toEqual({ player: 'Fennie', role: 'healer' });
  });

  it('sends role null when set to Unassigned', async () => {
    render(<RosterEditor initial={initial} />);
    const azure = screen.getByLabelText('specialty for Azurepath') as HTMLSelectElement;
    fireEvent.change(azure, { target: { value: '' } });
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const body = JSON.parse((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).toEqual({ player: 'Azurepath', role: null });
  });

  it('POSTs the dead flag when the checkbox is toggled', async () => {
    render(<RosterEditor initial={initial} />);
    const deadBox = screen.getByLabelText('dead Fennie') as HTMLInputElement;
    expect(deadBox.checked).toBe(false);
    fireEvent.click(deadBox);
    await waitFor(() => expect(deadBox.checked).toBe(true));
    const body = JSON.parse((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).toEqual({ player: 'Fennie', dead: true });
  });

  it('reverts the dead checkbox on a failed save', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) }) as Response));
    render(<RosterEditor initial={initial} />);
    const deadBox = screen.getByLabelText('dead Azurepath') as HTMLInputElement;
    fireEvent.click(deadBox);
    await waitFor(() => expect(deadBox.checked).toBe(false));
    expect(screen.getByText('save failed')).toBeTruthy();
  });

  it('reverts only the failed row, leaving other players untouched', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) }) as Response));
    render(<RosterEditor initial={initial} />);
    const fennie = screen.getByLabelText('specialty for Fennie') as HTMLSelectElement;
    const azure = screen.getByLabelText('specialty for Azurepath') as HTMLSelectElement;
    fireEvent.change(fennie, { target: { value: 'healer' } });

    await waitFor(() => expect(fennie.value).toBe(''));
    expect(screen.getByText('save failed')).toBeTruthy();
    expect(azure.value).toBe('caster-dps');
  });
});
