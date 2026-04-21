import { describe, expect, it } from 'vitest';
import { getCoordinatorStandingPromptCopy } from './coordinatorStandingPromptCopy';

describe('coordinatorStandingPromptCopy', () => {
  it('keeps the full standing prompt in full mode', () => {
    expect(getCoordinatorStandingPromptCopy({
      mode: 'full',
      label: 'door review is waiting on Alex Rivera — Open door review',
    })).toBe('door review is waiting on Alex Rivera — Open door review');
  });

  it('compresses standing prompt copy in secondary mode', () => {
    expect(getCoordinatorStandingPromptCopy({
      mode: 'secondary',
      label: 'door review is waiting on Alex Rivera — Open door review',
    })).toBe('door review is waiting on Alex Rivera');
  });
});
