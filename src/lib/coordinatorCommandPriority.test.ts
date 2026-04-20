import { describe, expect, it } from 'vitest';
import { getCoordinatorCommandPriority } from './coordinatorCommandPriority';

describe('coordinatorCommandPriority', () => {
  it('prioritizes check-in board work first, then timeline, then q-and-a', () => {
    expect(getCoordinatorCommandPriority({
      checkInLabel: 'Board target available',
      timelineLabel: 'Board event available',
      qnaLabel: 'Board question available',
      alertAligned: true,
    })).toBe('Check-in');

    expect(getCoordinatorCommandPriority({
      checkInLabel: null,
      timelineLabel: 'Working board event',
      qnaLabel: 'Board question available',
      alertAligned: true,
    })).toBe('Timeline');

    expect(getCoordinatorCommandPriority({
      checkInLabel: null,
      timelineLabel: null,
      qnaLabel: 'Working board question',
      alertAligned: true,
    })).toBe('Q&A');
  });

  it('falls back to alerting when no board-target work is active elsewhere', () => {
    expect(getCoordinatorCommandPriority({
      checkInLabel: 'Working custom guest',
      timelineLabel: 'Working custom event',
      qnaLabel: 'Working custom question',
      alertAligned: false,
    })).toBe('Alerting');
  });
});
