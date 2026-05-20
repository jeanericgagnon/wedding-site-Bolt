import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GuestSegmentControlsPanel } from './GuestSegmentControlsPanel';

const baseProps = {
  activeSegmentLabel: 'Missing meal',
  canEditGuests: true,
  checkInMode: true,
  checkedInCount: 2,
  extraFilterCount: 0,
  filterStatus: 'missing-meal',
  lastCheckInGuestName: 'Maya Lee',
  searchQuery: '',
  segmentOptions: [{ label: 'All', value: 'all' }],
  selectedGuestCount: 0,
  showExceptionBanner: false,
  showMissingMealBanner: true,
  showNoContactBanner: false,
  viewMode: 'list' as const,
  visibleSelectedCount: 0,
  onClearFilters: vi.fn(),
  onClearSelection: vi.fn(),
  onCopyContactRequestLink: vi.fn().mockResolvedValue(null),
  onCopyExceptionChecklist: vi.fn().mockResolvedValue(null),
  onCopyMissingMealChecklist: vi.fn().mockResolvedValue(null),
  onCopyNoContactChecklist: vi.fn().mockResolvedValue(null),
  onKeepOnlyVisibleSelection: vi.fn(),
  onOpenCampaignModal: vi.fn(),
  onSelectCheckedInFilter: vi.fn(),
  onSelectPrimaryFilter: vi.fn(),
  onToggleCheckInMode: vi.fn(),
  onToggleHouseholdsView: vi.fn(),
  onUndoLastCheckIn: vi.fn(),
};

describe('GuestSegmentControlsPanel', () => {
  it('keeps write controls disabled for read-only collaborators', () => {
    render(
      <GuestSegmentControlsPanel
        {...baseProps}
        canEditGuests={false}
        selectedGuestCount={2}
        visibleSelectedCount={1}
      />
    );

    expect(screen.getByRole('button', { name: /send follow-up/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /check-in mode/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^undo$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /keep visible only/i })).toBeDisabled();
  });

  it('ignores stale copy completions after segment context changes', async () => {
    let finishCopy: ((value: 'copied') => void) | undefined;
    const onCopyMissingMealChecklist = vi.fn().mockReturnValueOnce(new Promise<'copied'>((resolve) => {
      finishCopy = resolve;
    }));

    const { rerender } = render(
      <GuestSegmentControlsPanel
        {...baseProps}
        onCopyMissingMealChecklist={onCopyMissingMealChecklist}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /copy meal follow-up checklist/i }));

    rerender(
      <GuestSegmentControlsPanel
        {...baseProps}
        activeSegmentLabel="All guests"
        filterStatus="all"
        showMissingMealBanner={false}
      />
    );

    await act(async () => {
      finishCopy?.('copied');
    });

    expect(onCopyMissingMealChecklist).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /copied meal follow-up checklist/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copying meal follow-up checklist/i })).not.toBeInTheDocument();
  });
});
