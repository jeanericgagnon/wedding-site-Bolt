import { describe, expect, it } from 'vitest';
import { getCoordinatorCommandPriorityReason } from './coordinatorCommandPriorityReason';

describe('coordinatorCommandPriorityReason', () => {
  it('explains why each surface won command priority', () => {
    expect(getCoordinatorCommandPriorityReason({
      priority: 'Check-in',
      checkInLabel: 'Suggested guest waiting',
      timelineLabel: null,
      qnaLabel: null,
      alertAligned: true,
      alertLaneLabel: 'Live event update',
    })).toBe('door review is waiting');

    expect(getCoordinatorCommandPriorityReason({
      priority: 'Timeline',
      checkInLabel: null,
      timelineLabel: 'Suggested event in progress',
      qnaLabel: null,
      alertAligned: true,
      alertLaneLabel: 'Live event update',
    })).toBe('the live event is already in progress');

    expect(getCoordinatorCommandPriorityReason({
      priority: 'Q&A',
      checkInLabel: null,
      timelineLabel: null,
      qnaLabel: 'Suggested question waiting',
      alertAligned: true,
      alertLaneLabel: 'Live event update',
    })).toBe('an unresolved guest question is waiting');

    expect(getCoordinatorCommandPriorityReason({
      priority: 'Alerting',
      checkInLabel: null,
      timelineLabel: null,
      qnaLabel: null,
      alertAligned: false,
      alertLaneLabel: 'Check-in reminder',
    })).toBe('check-in reminder draft needs review');
  });
});
