import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GuestDashboardOverlays, type GuestDashboardOverlaysProps } from './GuestDashboardOverlays';

const guest = {
  id: 'guest-1',
  first_name: 'Maya',
  last_name: 'Lee',
  name: 'Maya Lee',
  email: 'maya@example.com',
  phone: '',
  rsvp_status: 'pending',
  invite_token: 'token',
};

const baseProps: GuestDashboardOverlaysProps = {
  assistedRsvpGuest: guest as any,
  assistedRsvpNotes: '',
  assistedRsvpSaving: false,
  assistedRsvpSource: 'phone',
  assistedRsvpStatus: 'confirmed',
  confirmDialog: {
    title: 'Delete item?',
    description: 'This is a write confirmation.',
    confirmLabel: 'Delete',
    tone: 'danger',
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
  },
  csvColumnSamples: ['Maya'],
  csvDataRows: [['Maya']],
  csvDuplicateNames: [],
  csvFieldMap: {
    first_name: 0,
    last_name: -1,
    full_name: -1,
    email: -1,
    phone: -1,
    plus_one: -1,
    plus_one_name: -1,
    plus_one_count: -1,
    children_allowed: -1,
    children_count: -1,
    max_additional_guests: -1,
    status: -1,
    meal_choice: -1,
    rsvp_date: -1,
    invite_token: -1,
    household_id: -1,
    household_name: -1,
    invited_events: [],
  },
  csvHeaders: ['First name'],
  csvHouseholdWarnings: [],
  csvImporting: false,
  csvMappingSummary: { core: [], rsvp: [], household: [], eventCols: [], weak: [] },
  csvNameMappingValid: true,
  csvPreview: [{ first_name: 'Maya' }],
  csvSelectedFilename: 'guests.csv',
  csvShowMapper: true,
  csvSkipped: [],
  csvUnknownEvents: [],
  deleteAllBusy: false,
  deleteAllConfirmInput: '',
  editingGuest: guest as any,
  effectiveItineraryEvents: [],
  formData: {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    preferred_language: '',
    plus_one_allowed: false,
    require_plus_one_name: false,
    invited_to_ceremony: true,
    invited_to_reception: true,
  },
  formEventInviteIds: new Set(),
  guestAuditEntries: [],
  guestEventIds: new Set(),
  guests: [guest as any],
  isGuestsReadOnly: false,
  itineraryDrawerGuest: null,
  itineraryEvents: [],
  itineraryFilterEventCount: 0,
  loadingDrawer: false,
  rotatingInviteToken: false,
  showAddModal: true,
  showDeleteAllModal: true,
  togglingEventId: null,
  weddingSiteInfo: null,
  onAddFollowUpTask: vi.fn(),
  onBuildCsvPreview: vi.fn(),
  onCloseAddModal: vi.fn(),
  onCloseAssistedRsvp: vi.fn(),
  onCloseCsvMapper: vi.fn(),
  onCloseDeleteAllModal: vi.fn(),
  onCloseEditModal: vi.fn(),
  onCloseItineraryDrawer: vi.fn(),
  onConfirmCsvImport: vi.fn(),
  onConfirmDeleteAllGuests: vi.fn(),
  onCopyContactRequestLink: vi.fn(),
  onFocusGuestSearch: vi.fn(),
  onRevokeGuestInviteToken: vi.fn(),
  onResetCsvReview: vi.fn(),
  onRotateGuestInviteToken: vi.fn(),
  onSaveAssistedRsvp: vi.fn(),
  onSetAssistedRsvpNotes: vi.fn(),
  onSetAssistedRsvpSource: vi.fn(),
  onSetAssistedRsvpStatus: vi.fn(),
  onSetCsvFieldMap: vi.fn(),
  onSetDeleteAllConfirmInput: vi.fn(),
  onSetFormData: vi.fn(),
  onSetFormEventInviteIds: vi.fn(),
  onSubmitAddGuest: vi.fn(),
  onSubmitEditGuest: vi.fn(),
  onToast: vi.fn(),
  onToggleEventInvite: vi.fn(),
};

describe('GuestDashboardOverlays', () => {
  it('does not render stale write overlays for read-only collaborators', () => {
    render(<GuestDashboardOverlays {...baseProps} isGuestsReadOnly />);

    expect(screen.queryByText('Record RSVP for guest')).not.toBeInTheDocument();
    expect(screen.queryByText('Add guest')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit guest')).not.toBeInTheDocument();
    expect(screen.queryByText(/Delete all guests/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Match columns')).not.toBeInTheDocument();
    expect(screen.queryByText('Review Import')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete item?')).not.toBeInTheDocument();
  });
});
