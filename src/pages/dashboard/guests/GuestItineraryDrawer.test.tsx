import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GuestItineraryDrawer } from './GuestItineraryDrawer';
import type { GuestWithRSVP, ItineraryEvent, WeddingSiteInfo } from './guestDashboardTypes';

const { copyTextOrDownload } = vi.hoisted(() => ({
  copyTextOrDownload: vi.fn(),
}));

vi.mock('../../../lib/copyText', () => ({
  copyTextOrDownload: (...args: unknown[]) => copyTextOrDownload(...args),
}));

describe('GuestItineraryDrawer', () => {
  beforeEach(() => {
    copyTextOrDownload.mockReset();
  });

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
      is_published: true,
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
    expect(screen.queryByText(/guest-specific coverage/)).not.toBeInTheDocument();
    expect(screen.queryByText(/event visibility coverage/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Visible to this guest: Ceremony.').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('No hidden events for this guest.').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/preview-route coverage/)).not.toBeInTheDocument();
    expect(screen.getByText('Private guest path ready')).toBeInTheDocument();
    expect(screen.getByText('1 visible event has a private guest path ready.')).toBeInTheDocument();
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

  it('ignores stale private RSVP copy completions after switching guests', async () => {
    let finishCopy: ((value: 'copied') => void) | undefined;
    copyTextOrDownload.mockReturnValueOnce(new Promise((resolve) => {
      finishCopy = resolve;
    }));
    const onToast = vi.fn();
    const guestOne: GuestWithRSVP = {
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
      invite_token: 'token-one',
      rsvp_status: 'pending',
      rsvp_received_at: null,
      household_id: null,
      invited_event_ids: ['event-1'],
      rsvp: { attending: true, meal_choice: null, plus_one_name: null, notes: null },
    };
    const guestTwo: GuestWithRSVP = {
      ...guestOne,
      id: 'guest-2',
      first_name: 'Rowan',
      last_name: 'Kim',
      name: 'Rowan Kim',
      email: 'rowan@example.com',
      invite_token: 'token-two',
    };
    const props = {
      guestAuditEntries: [],
      guestEventIds: new Set(['event-1']),
      guests: [guestOne, guestTwo],
      itineraryEvents: [{ id: 'event-1', event_name: 'Ceremony', event_date: '2026-06-20', start_time: '16:00:00', location_name: 'Garden' }] as ItineraryEvent[],
      loadingDrawer: false,
      rotatingInviteToken: false,
      togglingEventId: null,
      weddingSiteInfo: null,
      onAddFollowUpTask: vi.fn(),
      onClose: vi.fn(),
      onCopyContactRequestLink: vi.fn(),
      onFocusGuestSearch: vi.fn(),
      onRevokeGuestInviteToken: vi.fn(),
      onRotateGuestInviteToken: vi.fn(),
      onToast,
      onToggleEventInvite: vi.fn(),
    };

    const { rerender } = render(<GuestItineraryDrawer {...props} guest={guestOne} />);

    fireEvent.click(screen.getByRole('button', { name: /Copy private RSVP access link/i }));
    rerender(<GuestItineraryDrawer {...props} guest={guestTwo} />);
    await act(async () => {
      finishCopy?.('copied');
    });

    expect(screen.getByRole('button', { name: /Copy private RSVP access link/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Copied private RSVP access link/i })).not.toBeInTheDocument();
    expect(onToast).not.toHaveBeenCalledWith('Copied RSVP link', 'success');
  });

  it('ignores stale guest-preview copy completions after the preview context changes', async () => {
    let finishCopy: ((value: 'copied') => void) | undefined;
    copyTextOrDownload.mockReturnValueOnce(new Promise((resolve) => {
      finishCopy = resolve;
    }));
    const onToast = vi.fn();
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
      rsvp: { attending: true, meal_choice: null, plus_one_name: null, notes: null },
    };
    const itineraryEvents = [{ id: 'event-1', event_name: 'Ceremony', event_date: '2026-06-20', start_time: '16:00:00', location_name: 'Garden' }] as ItineraryEvent[];
    const siteInfo: WeddingSiteInfo = {
      id: 'site-1',
      couple_name_1: 'Maya',
      couple_name_2: 'Rowan',
      is_published: true,
      wedding_date: '2026-06-20',
      venue_name: 'Garden',
      venue_address: null,
      site_url: 'https://dayof.love/site/maya-and-rowan',
      site_slug: 'maya-and-rowan',
    };
    const props = {
      guest,
      guestAuditEntries: [],
      guestEventIds: new Set(['event-1']),
      guests: [guest],
      itineraryEvents,
      loadingDrawer: false,
      rotatingInviteToken: false,
      togglingEventId: null,
      weddingSiteInfo: siteInfo,
      onAddFollowUpTask: vi.fn(),
      onClose: vi.fn(),
      onCopyContactRequestLink: vi.fn(),
      onFocusGuestSearch: vi.fn(),
      onRevokeGuestInviteToken: vi.fn(),
      onRotateGuestInviteToken: vi.fn(),
      onToast,
      onToggleEventInvite: vi.fn(),
    };

    const { rerender } = render(<GuestItineraryDrawer {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /Copy guest preview route link/i }));
    rerender(<GuestItineraryDrawer {...props} weddingSiteInfo={{ ...siteInfo, site_slug: 'maya-rowan-new' }} />);

    await act(async () => {
      finishCopy?.('copied');
    });

    expect(screen.getByRole('button', { name: /Copy guest preview route link/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Copied guest preview route link/i })).not.toBeInTheDocument();
    expect(onToast).not.toHaveBeenCalledWith('Copied guest preview link', 'success');
  });

  it('keeps event and private-access actions disabled for read-only collaborators', () => {
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
    const events: ItineraryEvent[] = [{
      id: 'event-1',
      event_name: 'Ceremony',
      event_date: '2026-06-20',
      start_time: '16:00:00',
      location_name: 'Garden',
    }];

    render(
      <GuestItineraryDrawer
        guest={guest}
        guestAuditEntries={[]}
        guestEventIds={new Set(['event-1'])}
        guests={[guest]}
        isGuestsReadOnly
        itineraryEvents={events}
        loadingDrawer={false}
        rotatingInviteToken={false}
        togglingEventId={null}
        weddingSiteInfo={null}
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

    expect(screen.getByRole('button', { name: /Rotate private RSVP access/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Revoke private RSVP access/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Save follow-up task/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Ceremony/i })).toBeDisabled();
    expect(screen.getByText('1 of 1 events visible to this guest · Read-only mode')).toBeInTheDocument();
    expect(
      screen.getByText('This guest’s visibility is read-only for your account. Contact an owner to change itinerary access.'),
    ).toBeInTheDocument();
  });

  it('shows an editable footer hint for invite visibility changes', () => {
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
        isGuestsReadOnly={false}
        itineraryEvents={[
          {
            id: 'event-1',
            event_name: 'Ceremony',
            event_date: '2026-06-20',
            start_time: '16:00:00',
            location_name: 'Garden',
          },
        ]}
        loadingDrawer={false}
        rotatingInviteToken={false}
        togglingEventId={null}
        weddingSiteInfo={null}
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

    expect(
      screen.getByText('1 of 1 events · Invite visibility changes save instantly'),
    ).toBeInTheDocument();
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
        attending: false,
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
          is_published: true,
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
    expect(screen.queryByText(/event visibility coverage/)).not.toBeInTheDocument();
    expect(screen.getAllByText('No hidden events for this guest.').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/preview-route coverage/)).not.toBeInTheDocument();
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
      plus_one_name: null,
      rsvp_status: 'pending',
      rsvp_received_at: null,
      household_id: null,
      invited_event_ids: ['event-1'],
      rsvp: {
        attending: false,
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
          is_published: true,
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
    expect(screen.queryByText(/event visibility coverage/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Visible to this guest: Ceremony.').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Hidden from this guest: Reception.')).toBeInTheDocument();
  });

  it('holds back public guest-preview links until the site is published', () => {
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
        weddingSiteInfo={{
          id: 'site-1',
          couple_name_1: 'Maya',
          couple_name_2: 'Rowan',
          is_published: false,
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

    expect(screen.getByText('Publish the site before sharing public guest-preview links or QR codes.')).toBeInTheDocument();
    expect(screen.queryByText('Public site preview QR')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open travel section as guest/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open registry section as guest/i })).not.toBeInTheDocument();
  });

  it('keeps private guest-preview links available while a draft site still withholds public-shell previews', () => {
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
        weddingSiteInfo={{
          id: 'site-1',
          couple_name_1: 'Maya',
          couple_name_2: 'Rowan',
          is_published: false,
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

    expect(screen.getByRole('button', { name: /Open RSVP as guest/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open guest update view/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open photo upload as guest/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open guestbook as guest/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open anniversary vault as guest/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open recap as guest/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open travel section as guest/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open registry section as guest/i })).not.toBeInTheDocument();
    expect(screen.getByText('6 guest routes ready · 6 guest-specific · 0 public shell · 1 visible event · 0 hidden events')).toBeInTheDocument();
    expect(screen.queryByText(/guest-specific coverage/)).not.toBeInTheDocument();
  });

  it('withholds public-shell previews when the public site slug is missing even if the site is otherwise marked published', () => {
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
        weddingSiteInfo={{
          id: 'site-1',
          couple_name_1: 'Maya',
          couple_name_2: 'Rowan',
          is_published: true,
          wedding_date: '2026-06-20',
          venue_name: 'Garden',
          venue_address: null,
          site_url: null,
          site_slug: null,
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

    expect(screen.queryByText('Public site preview QR')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open travel section as guest/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open registry section as guest/i })).not.toBeInTheDocument();
    expect(screen.getByText('1 guest route ready · 1 guest-specific · 0 public shell · 1 visible event · 0 hidden events')).toBeInTheDocument();
    expect(screen.queryByText(/guest-specific coverage/)).not.toBeInTheDocument();
  });

  it('keeps public-shell preview coverage accurate when the public slug is resolved from the live site URL', () => {
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
        weddingSiteInfo={{
          id: 'site-1',
          couple_name_1: 'Maya',
          couple_name_2: 'Rowan',
          is_published: true,
          wedding_date: '2026-06-20',
          venue_name: 'Garden',
          venue_address: null,
          site_url: 'https://dayof.love/site/maya-and-rowan',
          site_slug: null,
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

    expect(screen.getByText('Public site preview QR')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open travel section as guest/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open registry section as guest/i })).toBeInTheDocument();
    expect(screen.getByText('9 guest routes ready · 6 guest-specific · 3 public shell · 1 visible event · 0 hidden events')).toBeInTheDocument();
    expect(screen.queryByText(/guest-specific coverage/)).not.toBeInTheDocument();
    expect(screen.queryByText(/preview-route coverage/)).not.toBeInTheDocument();
  });

  it('reports an error when copying the RSVP link fails', async () => {
    copyTextOrDownload.mockRejectedValueOnce(new Error('copy failed'));
    const onToast = vi.fn();
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
        onRevokeGuestInviteToken={vi.fn()}
        onRotateGuestInviteToken={vi.fn()}
        onToast={onToast}
        onToggleEventInvite={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /copy private rsvp access link/i }));

    await waitFor(() => expect(onToast).toHaveBeenCalledWith('Couldn’t copy the RSVP link right now.', 'error'));
  });

  it('reports an error when copying the guest preview link fails', async () => {
    copyTextOrDownload.mockRejectedValueOnce(new Error('copy failed'));
    const onToast = vi.fn();
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
        weddingSiteInfo={{
          id: 'site-1',
          couple_name_1: 'Maya',
          couple_name_2: 'Rowan',
          is_published: true,
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
        onToast={onToast}
        onToggleEventInvite={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /copy guest preview route link/i }));

    await waitFor(() => expect(onToast).toHaveBeenCalledWith('Couldn’t copy the guest preview link right now.', 'error'));
  });

  it('shows downloaded fallback labels for RSVP and preview link copy actions', async () => {
    copyTextOrDownload
      .mockResolvedValueOnce('downloaded')
      .mockResolvedValueOnce('downloaded');
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
        weddingSiteInfo={{
          id: 'site-1',
          couple_name_1: 'Maya',
          couple_name_2: 'Rowan',
          is_published: true,
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

    fireEvent.click(screen.getByRole('button', { name: /copy private rsvp access link/i }));
    expect(await screen.findByRole('button', { name: 'Downloaded private RSVP access link' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /copy guest preview route link/i }));
    expect(await screen.findByRole('button', { name: 'Downloaded guest preview route link' })).toBeInTheDocument();
  });
});
