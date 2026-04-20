import { describe, expect, it } from 'vitest';
import { getCoordinatorCommandSummarySecondaryReason } from './coordinatorCommandSummarySecondaryReason';

describe('coordinatorCommandSummarySecondaryReason', () => {
  it('adds ranked-queue reasons for secondary board-work chips', () => {
    expect(getCoordinatorCommandSummarySecondaryReason({
      label: 'Check-in',
      detail: 'Board target available',
    })).toBe('door follow-up still queued');

    expect(getCoordinatorCommandSummarySecondaryReason({
      label: 'Timeline',
      detail: 'Board event available',
    })).toBe('event focus still queued');

    expect(getCoordinatorCommandSummarySecondaryReason({
      label: 'Q&A',
      detail: 'Board question available',
    })).toBe('guest answer still queued');
  });

  it('stays quiet for non-board background context', () => {
    expect(getCoordinatorCommandSummarySecondaryReason({
      label: 'Alerting',
      detail: 'Customized check-in reminder',
    })).toBeNull();
  });
});
