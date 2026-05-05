import { describe, expect, it } from 'vitest';
import { getCoordinatorStandingPromptReasonTightened } from './coordinatorStandingPromptReasonTighten';

describe('coordinatorStandingPromptReasonTighten', () => {
  it('tightens timeline standing prompt copy', () => {
    expect(getCoordinatorStandingPromptReasonTightened({
      priority: 'Timeline',
      reason: 'the live event is already in progress',
    })).toBe('live event in progress');

    expect(getCoordinatorStandingPromptReasonTightened({
      priority: 'Timeline',
      reason: 'the next event is waiting',
    })).toBe('next event waiting');
  });

  it('tightens q-and-a standing prompt copy', () => {
    expect(getCoordinatorStandingPromptReasonTightened({
      priority: 'Q&A',
      reason: 'the suggested question is already in progress',
    })).toBe('question in progress');

    expect(getCoordinatorStandingPromptReasonTightened({
      priority: 'Q&A',
      reason: 'an unresolved guest question is waiting',
    })).toBe('guest question waiting');
  });

  it('leaves other standing prompt copy alone', () => {
    expect(getCoordinatorStandingPromptReasonTightened({
      priority: 'Check-in',
      reason: 'door review is waiting',
    })).toBe('door review is waiting');
  });
});
