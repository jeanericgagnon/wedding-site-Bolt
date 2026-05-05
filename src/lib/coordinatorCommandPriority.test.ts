import { describe, expect, it } from 'vitest';
import { getCoordinatorCommandPriority } from './coordinatorCommandPriority';

describe('coordinatorCommandPriority', () => {
  it('prioritizes suggested check-in work first, then timeline, then q-and-a', () => {
    expect(getCoordinatorCommandPriority({
      checkInLabel: 'Suggested guest waiting',
      timelineLabel: 'Suggested event waiting',
      qnaLabel: 'Suggested question waiting',
      alertAligned: true,
    })).toBe('Check-in');

    expect(getCoordinatorCommandPriority({
      checkInLabel: null,
      timelineLabel: 'Suggested event in progress',
      qnaLabel: 'Suggested question waiting',
      alertAligned: true,
    })).toBe('Timeline');

    expect(getCoordinatorCommandPriority({
      checkInLabel: null,
      timelineLabel: null,
      qnaLabel: 'Suggested question in progress',
      alertAligned: true,
    })).toBe('Q&A');
  });

  it('falls back to alerting when no suggested work is active elsewhere', () => {
    expect(getCoordinatorCommandPriority({
      checkInLabel: 'Selected guest in progress',
      timelineLabel: 'Selected event in progress',
      qnaLabel: 'Selected question in progress',
      alertAligned: false,
    })).toBe('Alerting');
  });
});
