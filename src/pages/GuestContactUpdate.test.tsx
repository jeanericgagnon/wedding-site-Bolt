import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', () => ({
  useParams: () => ({ token: 'maya-leo' }),
}));

vi.mock('../components/guest/GuestJourneyCompanion', () => ({
  GuestJourneyCompanion: () => null,
}));

describe('GuestContactUpdate', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    window.history.replaceState({}, '', '/guest-contact/maya-leo?invite_token=invite-123');
  });

  it('prefills the guest record from the invitation link before manual search', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        matches: [
          {
            id: 'guest-1',
            name: 'Maya Lopez',
            household_id: 'household-1',
            household_size: 2,
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { GuestContactUpdate } = await import('./GuestContactUpdate');
    render(<GuestContactUpdate />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/guest-contact-lookup',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ site_ref: 'maya-leo', invite_token: 'invite-123' }),
      }),
    );

    expect(await screen.findByDisplayValue('Maya Lopez')).toBeInTheDocument();
    expect(screen.getByText('Apply these updates to my whole party (2 guests)')).toBeInTheDocument();
  });
});
