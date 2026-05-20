import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GuestOpsToolbar, type GuestOpsToolbarProps } from './GuestOpsToolbar';

const baseProps: GuestOpsToolbarProps = {
  autoRemindersEnabled: false,
  bulkSending: false,
  canEditGuests: true,
  csvFileInputRef: createRef<HTMLInputElement>(),
  csvImporting: false,
  csvMaxFileMb: 5,
  csvMaxRows: 500,
  csvSelectedFilename: null,
  dueReminderCount: 2,
  guestCount: 12,
  hasNextUnresolvedGuest: true,
  isDemoMode: false,
  reminderCandidateCount: 3,
  searchQuery: '',
  selectedGuestCount: 2,
  showOpsMenu: true,
  onAddGuest: vi.fn(),
  onClearAllCheckIns: vi.fn(),
  onClearSelection: vi.fn(),
  onCopyAddressCollectionLink: vi.fn(),
  onCopyChecklist: vi.fn(),
  onCopyFilteredEmails: vi.fn(),
  onCopyMissingContactList: vi.fn(),
  onCopyTextRsvpLinks: vi.fn(),
  onCreateChecklist: vi.fn(),
  onDeleteAllGuests: vi.fn(),
  onDryRun: vi.fn(),
  onExportAddressCollection: vi.fn(),
  onExportAllGuests: vi.fn(),
  onExportAttendingGuests: vi.fn(),
  onExportCheckedInGuests: vi.fn(),
  onExportDeclinedGuests: vi.fn(),
  onExportEventAttendance: vi.fn(),
  onExportFilteredGuests: vi.fn(),
  onExportHouseholdLabels: vi.fn(),
  onExportMissingMealChoices: vi.fn(),
  onExportPendingRsvp: vi.fn(),
  onExportRsvpResponders: vi.fn(),
  onExportThankYouDue: vi.fn(),
  onFileChange: vi.fn(),
  onMarkAllDueThankYous: vi.fn(),
  onNextUnresolved: vi.fn(),
  onSearchQueryChange: vi.fn(),
  onSelectFiltered: vi.fn(),
  onSelectUnresolved: vi.fn(),
  onSendDueReminders: vi.fn(),
  onSendFilteredInvitations: vi.fn(),
  onSendSelectedInvitations: vi.fn(),
  onSetShowOpsMenu: vi.fn(),
  onToggleAutoReminders: vi.fn(),
};

describe('GuestOpsToolbar', () => {
  it('keeps read-only safe actions available while disabling write actions', () => {
    render(<GuestOpsToolbar {...baseProps} canEditGuests={false} />);

    expect(screen.getByRole('button', { name: /^actions$/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /export all guests/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /copy address collection link/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /select unresolved/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /select filtered/i })).toBeDisabled();

    expect(screen.getByRole('button', { name: /import guests/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^add guest$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /remind filtered/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /send due reminders/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /auto reminders/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /mark all thank-you due as sent/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /clear all check-ins/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /create checklist/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /remind selected/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /delete all guests/i })).toBeDisabled();
  });
});
