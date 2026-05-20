import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GuestOpsSummaryPanel } from './GuestOpsSummaryPanel';

const baseProps = {
  canEditGuests: true,
  cleanGuestsView: false,
  contactCoverage: 80,
  fromQuickStart: false,
  nextStep: null,
  opsQueue: [],
  plannerHandoff: { title: 'Ready for planner', detail: 'Guest list is calm.' },
  pendingCount: 4,
  recommendedAction: { title: 'Review pending RSVPs', detail: 'A few guests need follow-up.', filter: 'pending' },
  totalCount: 20,
  onAddGuest: vi.fn(),
  onAddFollowUpTask: vi.fn(),
  onCopyAddressCollectionLink: vi.fn().mockResolvedValue(null),
  onFocusQueueItem: vi.fn(),
  onFocusRecommendedAction: vi.fn(),
  onOpenRsvpSettings: vi.fn(),
  onSkipToPhotos: vi.fn(),
};

describe('GuestOpsSummaryPanel', () => {
  it('keeps the empty-state add guest action disabled for read-only collaborators', () => {
    render(<GuestOpsSummaryPanel {...baseProps} canEditGuests={false} />);

    expect(screen.getByRole('button', { name: /^add guest$/i })).toBeDisabled();
  });

  it('keeps follow-up task creation disabled for read-only collaborators', () => {
    render(<GuestOpsSummaryPanel {...baseProps} canEditGuests={false} />);

    expect(screen.getByRole('button', { name: /save task/i })).toBeDisabled();
  });

  it('ignores stale address collection copy completions after the copy action changes', async () => {
    let finishCopy: ((value: 'copied') => void) | undefined;
    const firstCopyAction = vi.fn().mockReturnValueOnce(new Promise<'copied'>((resolve) => {
      finishCopy = resolve;
    }));
    const nextCopyAction = vi.fn().mockResolvedValue(null);

    const { rerender } = render(
      <GuestOpsSummaryPanel
        {...baseProps}
        onCopyAddressCollectionLink={firstCopyAction}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /^copy link$/i }));

    rerender(
      <GuestOpsSummaryPanel
        {...baseProps}
        onCopyAddressCollectionLink={nextCopyAction}
      />
    );

    await act(async () => {
      finishCopy?.('copied');
    });

    expect(firstCopyAction).toHaveBeenCalledTimes(1);
    expect(nextCopyAction).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^copy link$/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /copied guest contact link/i })).not.toBeInTheDocument();
  });
});
