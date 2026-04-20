import { describe, expect, it } from 'vitest';
import { buildCoordinatorCommandSummary } from './coordinatorCommandSummary';

describe('coordinatorCommandSummary', () => {
  it('builds a compact cross-surface command summary', () => {
    expect(buildCoordinatorCommandSummary({
      checkInLabel: 'Working board target',
      timelineLabel: 'Board event available',
      qnaLabel: 'Working custom question',
      alertLabel: 'Board-aligned live event update',
    })).toEqual([
      { label: 'Check-in', detail: 'Working board target' },
      { label: 'Timeline', detail: 'Board event available' },
      { label: 'Q&A', detail: 'Working custom question' },
      { label: 'Alerting', detail: 'Board-aligned live event update' },
    ]);
  });

  it('skips empty panel labels but always keeps alerting in view', () => {
    expect(buildCoordinatorCommandSummary({
      checkInLabel: null,
      timelineLabel: null,
      qnaLabel: null,
      alertLabel: 'Customized check-in reminder',
    })).toEqual([
      { label: 'Alerting', detail: 'Customized check-in reminder' },
    ]);
  });
});
