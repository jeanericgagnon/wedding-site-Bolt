import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GuestListStatusControls } from './GuestListStatusControls';

const baseProps = {
  canEditGuests: true,
  checkInCount: 1,
  checkInMode: true,
  cleanGuestsView: false,
  exceptionReviewVisible: false,
  extraFilterCount: 0,
  filterStatus: 'missing-meal' as const,
  fromQuickStart: false,
  lastCheckInGuestName: 'Maya Lee',
  nextStep: null,
  opsQueue: [],
  plannerHandoff: { title: 'Planner ready', detail: 'Guest list is ready to hand off.' },
  recommendedAction: {
    detail: 'Some guests need meal follow-up.',
    filter: 'missing-meal' as const,
    title: 'Follow up on meal choices',
  },
  searchQuery: '',
  selectedGuestCount: 0,
  segmentLabel: 'Missing meal',
  stats: { total: 10, confirmed: 5, declined: 1, pending: 4 },
  viewMode: 'list' as const,
  visibleSelectedCount: 0,
  onClearFilters: vi.fn(),
  onClearGuestSelection: vi.fn(),
  onCopyContactRequestLink: vi.fn(),
  onCopyExceptionChecklist: vi.fn(),
  onCopyMissingMealChecklist: vi.fn(),
  onCopyNoContactChecklist: vi.fn(),
  onFocusOpsItem: vi.fn(),
  onFocusRecommended: vi.fn(),
  onKeepVisibleSelection: vi.fn(),
  onOpenCampaignModal: vi.fn(),
  onSaveRecommendedTask: vi.fn(),
  onSelectSegment: vi.fn(),
  onSkipToPhotos: vi.fn(),
  onToggleCheckInMode: vi.fn(),
  onToggleHouseholds: vi.fn(),
  onUndoLastCheckIn: vi.fn(),
  onViewCheckedIn: vi.fn(),
};

describe('GuestListStatusControls', () => {
  it('keeps legacy write controls disabled for read-only collaborators', () => {
    render(
      <GuestListStatusControls
        {...baseProps}
        canEditGuests={false}
        selectedGuestCount={2}
        visibleSelectedCount={1}
      />
    );

    expect(screen.getByRole('button', { name: /save task/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /send follow-up/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /check-in mode/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^undo$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /keep visible only/i })).toBeDisabled();
  });
});
