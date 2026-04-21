import { describe, expect, it } from 'vitest';
import { getCoordinatorStandingPromptReason } from './coordinatorStandingPromptReason';

describe('coordinatorStandingPromptReason', () => {
  it('keeps the full reason when no target label exists', () => {
    expect(getCoordinatorStandingPromptReason({
      label: 'door review is waiting on Alex Rivera — Open door review',
      targetLabel: null,
    })).toBe('door review is waiting on Alex Rivera');
  });

  it('removes duplicate target names when the target chip already carries them', () => {
    expect(getCoordinatorStandingPromptReason({
      label: 'door review is waiting on Alex Rivera — Open door review',
      targetLabel: 'Guest · Alex Rivera',
    })).toBe('door review is waiting');

    expect(getCoordinatorStandingPromptReason({
      label: 'the live event is already in progress for Ceremony — Open live timeline',
      targetLabel: 'Event · Ceremony',
    })).toBe('the live event is already in progress for Ceremony');
  });
});
