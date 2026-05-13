import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let currentToken = 'invite-token-1';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(currentToken ? `token=${currentToken}` : '')],
  };
});

vi.mock('../components/layout', () => ({
  Header: () => <div>Header</div>,
  Footer: () => <div>Footer</div>,
}));

function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number }) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function renderEventRsvp() {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
  const mod = await import('./EventRSVP');
  render(<mod.default />);
  return mod;
}

describe('EventRSVP secure flow', () => {
  beforeEach(() => {
    currentToken = 'invite-token-1';
    vi.unstubAllEnvs();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('sanitizes internal event RSVP lookup and submit errors before showing guest copy', async () => {
    const { safeEventRsvpGuestError } = await import('./EventRSVP');

    expect(safeEventRsvpGuestError('missing-config')).toBe(
      "This invitation link isn't valid. Please use the link from your invitation email, or ask the couple for a new one.",
    );
    expect(
      safeEventRsvpGuestError('permission denied for table event_rsvps', 'Couldn’t save your RSVP. Please try again.'),
    ).toBe('Couldn’t save your RSVP. Please try again.');
    expect(
      safeEventRsvpGuestError('Google OAuth service_role api-key refresh failed', 'Couldn’t save your RSVP. Please try again.'),
    ).toBe('Couldn’t save your RSVP. Please try again.');
    expect(safeEventRsvpGuestError('That event is closed now.')).toBe('That event is closed now.');
  });

  it('loads guest event invitations from the server-side lookup flow', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({
      guest: { id: 'guest-1', name: 'Taylor' },
      eventRsvpSupport: true,
      rsvpSession: 'session-1',
      invitations: [
        {
          id: 'inv-1',
          guest_id: 'guest-1',
          event_id: 'event-1',
          itinerary_events: {
            id: 'event-1',
            event_name: 'Welcome Dinner',
            event_date: '2026-05-01',
            start_time: '18:00:00',
            end_time: null,
            location_name: 'The Loft',
            location_address: '123 Main St',
            description: 'Join us for drinks.',
          },
          event_rsvps: [],
        },
      ],
    }));

    await renderEventRsvp();

    expect(await screen.findByText('Hello, Taylor!')).toBeInTheDocument();
    expect(screen.getByText('Welcome Dinner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RSVP for this event' })).toBeInTheDocument();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/validate-rsvp-token',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer anon-key',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          action: 'event_lookup',
          inviteToken: 'invite-token-1',
        }),
      }),
    );
  });

  it('submits event RSVP updates with the short-lived RSVP session instead of the invite token', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({
        guest: { id: 'guest-1', name: 'Taylor' },
        eventRsvpSupport: true,
        rsvpSession: 'session-abc',
        invitations: [
          {
            id: 'inv-1',
            guest_id: 'guest-1',
            event_id: 'event-1',
            itinerary_events: {
              id: 'event-1',
              event_name: 'Welcome Dinner',
              event_date: '2026-05-01',
              start_time: '18:00:00',
              end_time: null,
              location_name: 'The Loft',
              location_address: '123 Main St',
              description: 'Join us for drinks.',
            },
            event_rsvps: [],
          },
        ],
      }))
      .mockResolvedValueOnce(jsonResponse({ success: true, respondedAt: '2026-05-04T10:00:00.000Z' }));

    await renderEventRsvp();

    expect(await screen.findByText('Hello, Taylor!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    fireEvent.change(screen.getByPlaceholderText('e.g., Vegetarian, Gluten-free, Nut allergy'), {
      target: { value: 'Vegetarian' },
    });
    fireEvent.change(screen.getByPlaceholderText('Any special requests or messages for the couple'), {
      target: { value: 'See you there' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    expect(await screen.findByText("You're in!")).toBeInTheDocument();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'https://example.supabase.co/functions/v1/validate-rsvp-token',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          action: 'event_submit',
          guestId: 'guest-1',
          rsvpSession: 'session-abc',
          eventInvitationId: 'inv-1',
          attending: true,
          dietaryRestrictions: 'Vegetarian',
          notes: 'See you there',
        }),
      }),
    );

    const submitBody = JSON.parse(String(vi.mocked(fetch).mock.calls[1]?.[1]?.body));
    expect(submitBody.inviteToken).toBeUndefined();
  });

  it('shows the invalid-link guest message when the session-backed lookup is rejected', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: 'missing-config' }, { ok: false, status: 401 }));

    await renderEventRsvp();

    expect(await screen.findByText('Link Not Recognized')).toBeInTheDocument();
    expect(
      screen.getByText("This invitation link isn't valid. Please use the link from your invitation email, or ask the couple for a new one."),
    ).toBeInTheDocument();
  });

  it('keeps the saved RSVP visible locally after submit without forcing a refetch', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({
        guest: { id: 'guest-1', name: 'Taylor' },
        eventRsvpSupport: true,
        rsvpSession: 'session-abc',
        invitations: [
          {
            id: 'inv-1',
            guest_id: 'guest-1',
            event_id: 'event-1',
            itinerary_events: {
              id: 'event-1',
              event_name: 'Welcome Dinner',
              event_date: '2026-05-01',
              start_time: '18:00:00',
              end_time: null,
              location_name: 'The Loft',
              location_address: '123 Main St',
              description: 'Join us for drinks.',
            },
            event_rsvps: [],
          },
        ],
      }))
      .mockResolvedValueOnce(jsonResponse({ success: true, respondedAt: '2026-05-04T10:00:00.000Z' }));

    await renderEventRsvp();

    expect(await screen.findByText('Hello, Taylor!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'RSVP for this event' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit RSVP' }));

    expect(await screen.findByText("You're in!")).toBeInTheDocument();

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 2100));
    });

    await waitFor(() => {
      expect(screen.getByText('Attending')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Update my RSVP' })).toBeInTheDocument();
    }, { timeout: 4000 });
    expect(fetch).toHaveBeenCalledTimes(2);
  }, 10000);

  it('routes loading and invalid-link shells through a dedicated route view', async () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/EventRSVP.tsx'), 'utf8');
    const routeView = readFileSync(join(process.cwd(), 'src/pages/EventRsvpRouteView.tsx'), 'utf8');
    const liveContent = readFileSync(join(process.cwd(), 'src/pages/EventRsvpLiveContent.tsx'), 'utf8');

    expect(page).toContain("from './EventRsvpRouteView'");
    expect(page).toContain("from './EventRsvpLiveContent'");
    expect(page).toContain('<EventRsvpRouteView');
    expect(page).toContain('<EventRsvpLiveContent');
    expect(routeView).toContain('if (loading) return <>{loadingView}</>;');
    expect(routeView).toContain('if (error) return <>{errorView}</>;');
    expect(liveContent).toContain('Hello, {guestName}!');
    expect(liveContent).toContain('No additional events found for your invitation.');
  });
});
