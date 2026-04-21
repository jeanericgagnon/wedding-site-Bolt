import { describe, expect, it } from 'vitest';
import { getCoordinatorStandingPromptSecondaryState } from './coordinatorStandingPromptSecondaryState';

describe('coordinatorStandingPromptSecondaryState', () => {
  it('keeps normal state in full mode', () => {
    expect(getCoordinatorStandingPromptSecondaryState({ mode: 'full', state: 'In focus' })).toBe('In focus');
  });

  it('makes secondary queued-next state more truthful when already focused', () => {
    expect(getCoordinatorStandingPromptSecondaryState({ mode: 'secondary', state: 'In focus' })).toBe('In focus now');
    expect(getCoordinatorStandingPromptSecondaryState({ mode: 'secondary', state: 'Open timeline' })).toBe('Open timeline');
  });
});
