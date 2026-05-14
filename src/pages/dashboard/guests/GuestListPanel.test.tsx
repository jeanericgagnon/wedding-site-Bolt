import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GuestListPanel } from './GuestListPanel';
import type { GuestWithRSVP } from './guestDashboardTypes';

describe('GuestListPanel', () => {
  it('uses the public guest-view preview when a public site slug exists', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const guest = {
      id: 'guest-1',
      first_name: 'Maya',
      last_name: 'Lee',
      name: 'Maya Lee',
      email: 'maya@example.com',
      invite_token: 'private-token',
      rsvp_status: 'pending',
      rsvp: null,
    } as unknown as GuestWithRSVP;

    render(
      <GuestListPanel
        checkInMode={false}
        confirmDeleteId={null}
        deletingGuestId={null}
        displayedGuests={[guest]}
        filteredGuestCount={1}
        getStatusBadge={() => <span>Status</span>}
        isGuestsReadOnly={false}
        publicSiteSlug="maya-and-rowan"
        searchQuery=""
        sendingInviteId={null}
        onDeleteGuest={vi.fn()}
        onMarkThankYouSent={vi.fn()}
        onOpenAssistedRsvpModal={vi.fn()}
        onOpenEditModal={vi.fn()}
        onOpenItineraryDrawer={vi.fn()}
        onSendInvitation={vi.fn()}
        onToggleCheckIn={vi.fn()}
      />,
    );

    screen.getByRole('button', { name: /guest view/i }).click();

    expect(openSpy).toHaveBeenCalledWith('/site/maya-and-rowan?previewGuest=guest-1&previewSurface=public', '_blank', 'noopener,noreferrer');
    openSpy.mockRestore();
  });
});
