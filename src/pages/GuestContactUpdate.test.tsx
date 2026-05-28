import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routeTokenRef = {
  current: 'maya-leo',
};

vi.mock('react-router-dom', () => ({
  useParams: () => ({ token: routeTokenRef.current }),
}));

vi.mock('../components/guest/GuestJourneyCompanion', () => ({
  GuestJourneyCompanion: () => null,
}));

describe('GuestContactUpdate', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    routeTokenRef.current = 'maya-leo';
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

  it('asks for the invitation link before live contact updates when invite context is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState({}, '', '/guest-contact/maya-leo');

    const { GuestContactUpdate } = await import('./GuestContactUpdate');
    render(<GuestContactUpdate />);

    expect(screen.getByText('Please use the contact update link from your invitation email.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Find' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save update' })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps invite-prefill lookup failures guest-safe instead of surfacing backend detail', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'functions/v1/guest-contact-lookup bucket policy denied invite_token access',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { GuestContactUpdate } = await import('./GuestContactUpdate');
    render(<GuestContactUpdate />);

    expect(await screen.findByText('Couldn’t complete that search. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText(/bucket|policy|invite_token|functions\/v1/i)).not.toBeInTheDocument();
  });

  it('keeps manual lookup failures guest-safe instead of surfacing backend detail', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Supabase relation guests does not exist',
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { GuestContactUpdate } = await import('./GuestContactUpdate');
    render(<GuestContactUpdate />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(screen.getByPlaceholderText('Search your full name'), { target: { value: 'Maya Lopez' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find' }));

    expect(await screen.findByText('Couldn’t complete that search. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText(/supabase|relation|guests/i)).not.toBeInTheDocument();
  });
});
