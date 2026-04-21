import { describe, expect, it } from 'vitest';
import { getCoordinatorSummaryFeedbackCopy } from './coordinatorSummaryFeedbackCopy';

describe('coordinatorSummaryFeedbackCopy', () => {
  it('keeps full copy for stronger live signals', () => {
    expect(getCoordinatorSummaryFeedbackCopy({
      kind: 'transition',
      label: 'Alert lane moved into manual override',
    })).toBe('Alert lane moved into manual override');
  });

  it('compresses softer realignment confirmations', () => {
    expect(getCoordinatorSummaryFeedbackCopy({
      kind: 'realignment',
      label: 'Timeline re-aligned to board target',
    })).toBe('Timeline back on target');

    expect(getCoordinatorSummaryFeedbackCopy({
      kind: 'realignment',
      label: 'Check-in re-aligned to board target',
    })).toBe('Check-in back on target');
  });
});
