import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GuestItineraryDrawer } from './GuestItineraryDrawer';
import type { GuestWithRSVP, ItineraryEvent, WeddingSiteInfo } from './guestDashboardTypes';

describe('GuestItineraryDrawer', () => {
  it('shows private guest RSVP and contact-update QRs without exposing the raw token in normal UI', () => {
    const guest: GuestWithRSVP = {
      id: 'guest-1',
      first_name: 'Maya',
      last_name: 'Lee',
      name: 'Maya Lee',
      email: 'maya@example.com',
      phone: null,
      plus_one_allowed: false,
      plus_one_name: null,
      invited_to_ceremony: true,
      invited_to_reception: true,
      invite_token: 'secret-token',
      rsvp_status: 'pending',
      rsvp_received_at: null,
      household_id: null,
      invited_event_ids: ['event-1'],
      rsvp: {
        attending: true,
        meal_choice: null,
        plus_one_name: null,
        notes: null,
      },
    };

    const events: ItineraryEvent[] = [
      {
        id: 'event-1',
        event_name: 'Ceremony',
        event_date: '2026-06-20',
        start_time: '16:00:00',
        location_name: 'Garden',
      },
    ];

    const siteInfo: WeddingSiteInfo = {
      id: 'site-1',
      couple_name_1: 'Maya',
      couple_name_2: 'Rowan',
      wedding_date: '2026-06-20',
      venue_name: 'Garden',
      venue_address: null,
      site_url: 'https://dayof.love/site/maya-and-rowan',
      site_slug: 'maya-and-rowan',
    };

    render(
      <GuestItineraryDrawer
        guest={guest}
        guestAuditEntries={[]}
        guestEventIds={new Set(['event-1'])}
        guests={[guest]}
        itineraryEvents={events}
        loadingDrawer={false}
        togglingEventId={null}
        weddingSiteInfo={siteInfo}
        onAddFollowUpTask={vi.fn()}
        onClose={vi.fn()}
        onCopyContactRequestLink={vi.fn()}
        onFocusGuestSearch={vi.fn()}
        onToast={vi.fn()}
        onToggleEventInvite={vi.fn()}
      />,
    );

    expect(screen.getByText('Private RSVP QR')).toBeInTheDocument();
    expect(screen.getByText(/\/rsvp · private guest link$/)).toBeInTheDocument();
    expect(screen.queryByText('https://dayof.love/rsvp?token=secret-token')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Private RSVP QR QR code' })).toHaveAttribute(
      'src',
      expect.stringContaining('data:image/svg+xml'),
    );
    expect(screen.getByText('Private guest update QR')).toBeInTheDocument();
    expect(screen.getByText(/\/guest-contact\/maya-and-rowan · private guest link$/)).toBeInTheDocument();
    expect(screen.queryByText('https://dayof.love/guest-contact/maya-and-rowan?invite_token=secret-token')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Private guest update QR QR code' })).toHaveAttribute(
      'src',
      expect.stringContaining('data:image/svg+xml'),
    );
  });
});
