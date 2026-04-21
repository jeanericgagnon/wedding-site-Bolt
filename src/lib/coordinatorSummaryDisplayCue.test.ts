import { describe, expect, it } from 'vitest';
import { resolveCoordinatorSummaryDisplayCue } from './coordinatorSummaryDisplayCue';

describe('coordinatorSummaryDisplayCue', () => {
  it('prefers summary feedback over any override support state', () => {
    expect(resolveCoordinatorSummaryDisplayCue({
      summaryFeedback: {
        label: 'Jumped from live summary to door review',
        panelFocus: 'check-in',
        targetId: 'guest-1',
        kind: 'jump',
      },
      alertOverrideLabel: 'Manual alert override: draft diverged from live event update',
      manualOverrideLabel: 'Manual override: working a different guest than the board target',
    })).toEqual({
      kind: 'feedback',
      feedback: {
        label: 'Jumped from live summary to door review',
        panelFocus: 'check-in',
        targetId: 'guest-1',
        kind: 'jump',
      },
    });
  });

  it('falls through to alert override, then manual override, then null', () => {
    expect(resolveCoordinatorSummaryDisplayCue({
      summaryFeedback: null,
      alertOverrideLabel: 'Manual alert override: draft diverged from live event update',
      manualOverrideLabel: 'Manual override: working a different guest than the board target',
    })).toEqual({
      kind: 'alert-override',
      label: 'Manual alert override: draft diverged from live event update',
    });

    expect(resolveCoordinatorSummaryDisplayCue({
      summaryFeedback: null,
      alertOverrideLabel: null,
      manualOverrideLabel: 'Manual override: working a different guest than the board target',
    })).toEqual({
      kind: 'manual-override',
      label: 'Manual override: working a different guest than the board target',
    });

    expect(resolveCoordinatorSummaryDisplayCue({
      summaryFeedback: null,
      alertOverrideLabel: null,
      manualOverrideLabel: null,
    })).toBeNull();
  });
});
