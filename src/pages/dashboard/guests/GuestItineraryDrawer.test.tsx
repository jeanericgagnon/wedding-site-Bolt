import { fireEvent, render, screen } from '@testing-library/react';
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
        rotatingInviteToken={false}
        togglingEventId={null}
        weddingSiteInfo={siteInfo}
        onAddFollowUpTask={vi.fn()}
        onClose={vi.fn()}
        onCopyContactRequestLink={vi.fn()}
        onFocusGuestSearch={vi.fn()}
        onRevokeGuestInviteToken={vi.fn()}
        onRotateGuestInviteToken={vi.fn()}
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
    expect(screen.getAllByRole('button', { name: 'Save private card' })).toHaveLength(2);
    expect(screen.getByText('9 guest routes ready · 6 guest-specific · 3 public shell · 1 visible event · 0 hidden events')).toBeInTheDocument();
    expect(screen.getByText('1 of 1 event visible · 0 hidden')).toBeInTheDocument();
    expect(screen.getByText('67% guest-specific coverage · 33% public-shell coverage')).toBeInTheDocument();
    expect(screen.getByText('100% event visibility coverage · 0% still hidden')).toBeInTheDocument();
    expect(screen.getByText('100% preview-route coverage · 9 routes ready · No preview routes missing')).toBeInTheDocument();
    expect(screen.getByText('Private guest path ready')).toBeInTheDocument();
    expect(screen.getByText('1 visible event has a private guest path ready.')).toBeInTheDocument();
    expect(screen.queryByText(/^Hidden from this guest:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Main gap:/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open photo upload as guest/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open guestbook as guest/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open anniversary vault as guest/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open recap as guest/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open travel section as guest/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open registry section as guest/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rotate private RSVP access/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Revoke private RSVP access/i })).toBeInTheDocument();
  });

  it('fires rotate and revoke callbacks from the private access controls', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onRotateGuestInviteToken = vi.fn();
    const onRevokeGuestInviteToken = vi.fn();

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

    render(
      <GuestItineraryDrawer
        guest={guest}
        guestAuditEntries={[]}
        guestEventIds={new Set(['event-1'])}
        guests={[guest]}
        itineraryEvents={[{ id: 'event-1', event_name: 'Ceremony', event_date: '2026-06-20', start_time: '16:00:00', location_name: 'Garden' }]}
        loadingDrawer={false}
        rotatingInviteToken={false}
        togglingEventId={null}
        weddingSiteInfo={null}
        onAddFollowUpTask={vi.fn()}
        onClose={vi.fn()}
        onCopyContactRequestLink={vi.fn()}
        onFocusGuestSearch={vi.fn()}
        onRevokeGuestInviteToken={onRevokeGuestInviteToken}
        onRotateGuestInviteToken={onRotateGuestInviteToken}
        onToast={vi.fn()}
        onToggleEventInvite={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Rotate private RSVP access/i }));
    fireEvent.click(screen.getByRole('button', { name: /Revoke private RSVP access/i }));

    expect(onRotateGuestInviteToken).toHaveBeenCalledTimes(1);
    expect(onRevokeGuestInviteToken).toHaveBeenCalledTimes(1);
    confirmSpy.mockRestore();
  });

  it('surfaces the main preview gap when private access is not ready yet', () => {
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
      invite_token: null,
      rsvp_status: 'pending',
      rsvp_received_at: null,
      household_id: null,
      invited_event_ids: ['event-1'],
      rsvp: {
        attending: null,
        meal_choice: null,
        plus_one_name: null,
        notes: null,
      },
    };

    render(
      <GuestItineraryDrawer
        guest={guest}
        guestAuditEntries={[]}
        guestEventIds={new Set(['event-1'])}
        guests={[guest]}
        itineraryEvents={[{ id: 'event-1', event_name: 'Ceremony', event_date: '2026-06-20', start_time: '16:00:00', location_name: 'Garden' }]}
        loadingDrawer={false}
        rotatingInviteToken={false}
        togglingEventId={null}
        weddingSiteInfo={{
          id: 'site-1',
          couple_name_1: 'Maya',
          couple_name_2: 'Rowan',
          wedding_date: '2026-06-20',
          venue_name: 'Garden',
          venue_address: null,
          site_url: 'https://dayof.love/site/maya-and-rowan',
          site_slug: 'maya-and-rowan',
        }}
        onAddFollowUpTask={vi.fn()}
        onClose={vi.fn()}
        onCopyContactRequestLink={vi.fn()}
        onFocusGuestSearch={vi.fn()}
        onRevokeGuestInviteToken={vi.fn()}
        onRotateGuestInviteToken={vi.fn()}
        onToast={vi.fn()}
        onToggleEventInvite={vi.fn()}
      />,
    );

    expect(screen.getByText('Public shell plus visible events')).toBeInTheDocument();
    expect(screen.getByText('1 of 1 event visible · 0 hidden')).toBeInTheDocument();
    expect(screen.getByText('100% event visibility coverage · 0% still hidden')).toBeInTheDocument();
    expect(screen.getByText('33% preview-route coverage · 3 routes ready · 6 preview routes still missing')).toBeInTheDocument();
    expect(screen.getByText('Main gap: Rotate or create a private RSVP link')).toBeInTheDocument();
  });

  it('shows how much of the event set is still hidden from this guest', () => {
    const guest = {
      id: 'guest-2',
      name: 'Taylor Chen',
      first_name: 'Taylor',
      last_name: 'Chen',
      email: 'taylor@example.com',
      phone: null,
      invite_token: 'secret-token',
      preferred_language: null,
      invited_to_ceremony: true,
      invited_to_reception: true,
      plus_one_allowed: false,
      rsvp_status: 'pending',
      rsvp_received_at: null,
      household_id: null,
      invited_event_ids: ['event-1'],
      rsvp: {
        attending: null,
        meal_choice: null,
        plus_one_name: null,
        notes: null,
      },
    };

    render(
      <GuestItineraryDrawer
        guest={guest}
        guestAuditEntries={[]}
        guestEventIds={new Set(['event-1'])}
        guests={[guest]}
        itineraryEvents={[
          { id: 'event-1', event_name: 'Ceremony', event_date: '2026-06-20', start_time: '16:00:00', location_name: 'Garden' },
          { id: 'event-2', event_name: 'Reception', event_date: '2026-06-20', start_time: '18:00:00', location_name: 'Hall' },
        ]}
        loadingDrawer={false}
        rotatingInviteToken={false}
        togglingEventId={null}
        weddingSiteInfo={{
          id: 'site-1',
          couple_name_1: 'Maya',
          couple_name_2: 'Rowan',
          wedding_date: '2026-06-20',
          venue_name: 'Garden',
          venue_address: null,
          site_url: 'https://dayof.love/site/maya-and-rowan',
          site_slug: 'maya-and-rowan',
        }}
        onAddFollowUpTask={vi.fn()}
        onClose={vi.fn()}
        onCopyContactRequestLink={vi.fn()}
        onFocusGuestSearch={vi.fn()}
        onRevokeGuestInviteToken={vi.fn()}
        onRotateGuestInviteToken={vi.fn()}
        onToast={vi.fn()}
        onToggleEventInvite={vi.fn()}
      />,
    );

    expect(screen.getByText('9 guest routes ready · 6 guest-specific · 3 public shell · 1 visible event · 1 hidden event')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 events visible · 1 hidden')).toBeInTheDocument();
    expect(screen.getByText('50% event visibility coverage · 50% still hidden')).toBeInTheDocument();
    expect(screen.getByText('Hidden from this guest: Reception.')).toBeInTheDocument();
  });
});
