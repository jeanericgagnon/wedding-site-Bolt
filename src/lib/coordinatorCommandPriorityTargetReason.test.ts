import { describe, expect, it } from 'vitest';
import { getCoordinatorCommandPriorityTargetReason } from './coordinatorCommandPriorityTargetReason';

describe('coordinatorCommandPriorityTargetReason', () => {
  it('adds target-specific detail when the priority surface has a known object', () => {
    expect(getCoordinatorCommandPriorityTargetReason({
      priority: 'Check-in',
      checkInTargetName: 'Alex Rivera',
      timelineTargetName: null,
      qnaTargetQuestion: null,
    })).toBe('on Alex Rivera');

    expect(getCoordinatorCommandPriorityTargetReason({
      priority: 'Timeline',
      checkInTargetName: null,
      timelineTargetName: 'Ceremony',
      qnaTargetQuestion: null,
    })).toBe('for Ceremony');

    expect(getCoordinatorCommandPriorityTargetReason({
      priority: 'Q&A',
      checkInTargetName: null,
      timelineTargetName: null,
      qnaTargetQuestion: 'Where should we park?',
    })).toBe('on “Where should we park?”');
  });

  it('falls back cleanly when no target detail exists', () => {
    expect(getCoordinatorCommandPriorityTargetReason({
      priority: 'Alerting',
      checkInTargetName: null,
      timelineTargetName: null,
      qnaTargetQuestion: null,
    })).toBeNull();
  });
});
