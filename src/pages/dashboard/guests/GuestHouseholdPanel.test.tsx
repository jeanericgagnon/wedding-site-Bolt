import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GuestHouseholdPanel } from './GuestHouseholdPanel';

describe('GuestHouseholdPanel', () => {
  it('offers guest-view preview actions in grouped and ungrouped household views', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const applyLanguage = vi.fn();
    const setLanguageDraft = vi.fn();
    const groupedGuest = {
      id: 'guest-1',
      first_name: 'Maya',
      last_name: 'Lee',
      name: 'Maya Lee',
      email: 'maya@example.com',
      preferred_language: 'es',
      invite_token: 'private-token',
      rsvp_status: 'pending',
    };
    const ungroupedGuest = {
      id: 'guest-2',
      first_name: 'Rowan',
      last_name: 'Lee',
      name: 'Rowan Lee',
      email: 'rowan@example.com',
      preferred_language: 'fr',
      invite_token: 'private-token-2',
      rsvp_status: 'confirmed',
    };

    render(
      <GuestHouseholdPanel
        getStatusBadge={() => <span>Status</span>}
        householdBusy={false}
        households={{
          grouped: [['household-1', [groupedGuest as any]]],
          ungrouped: [ungroupedGuest as any],
        }}
        isDemoMode={false}
        onApplySelectedGuestLanguage={applyLanguage}
        publicSiteSlug="maya-and-rowan"
        selectedGuestLanguageDraft="es"
        selectedGuestIds={new Set()}
        onMergeIntoHousehold={vi.fn()}
        onSetSelectedGuestLanguageDraft={setLanguageDraft}
        onSetSelectedGuestIds={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole('button', { name: /guest view/i });
    expect(buttons).toHaveLength(2);
    expect(screen.getByText('Prefers Spanish')).toBeInTheDocument();
    expect(screen.getByText('Prefers French')).toBeInTheDocument();
    buttons[0].click();
    buttons[1].click();

    expect(openSpy).toHaveBeenNthCalledWith(1, '/site/maya-and-rowan?previewGuest=guest-1&previewSurface=public', '_blank', 'noopener,noreferrer');
    expect(openSpy).toHaveBeenNthCalledWith(2, '/site/maya-and-rowan?previewGuest=guest-2&previewSurface=public', '_blank', 'noopener,noreferrer');
    openSpy.mockRestore();
  });

  it('shows selected-language controls when guests are selected', () => {
    render(
      <GuestHouseholdPanel
        getStatusBadge={() => <span>Status</span>}
        householdBusy={false}
        households={{ grouped: [], ungrouped: [] }}
        isDemoMode={false}
        onApplySelectedGuestLanguage={vi.fn()}
        publicSiteSlug="maya-and-rowan"
        selectedGuestLanguageDraft="fr"
        selectedGuestIds={new Set(['guest-1'])}
        onMergeIntoHousehold={vi.fn()}
        onSetSelectedGuestLanguageDraft={vi.fn()}
        onSetSelectedGuestIds={vi.fn()}
      />,
    );

    expect(screen.getByText('1 guests selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save language/i })).toBeInTheDocument();
  });
});
