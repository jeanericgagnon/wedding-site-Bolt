import { describe, expect, it } from 'vitest';
import { getCoordinatorTimelineBoardTargetId, getCoordinatorTimelineTargetState } from './coordinatorTimelineTargetState';

describe('coordinatorTimelineTargetState', () => {
  it('prefers the live event as the suggested event and falls back to up-next', () => {
    expect(getCoordinatorTimelineBoardTargetId({ liveEventId: 'live-1', upNextEventId: 'next-1' })).toBe('live-1');
    expect(getCoordinatorTimelineBoardTargetId({ liveEventId: null, upNextEventId: 'next-1' })).toBe('next-1');
    expect(getCoordinatorTimelineBoardTargetId({ liveEventId: null, upNextEventId: null })).toBeNull();
  });

  it('distinguishes the suggested event from selected timeline focus', () => {
    expect(getCoordinatorTimelineTargetState({ boardTargetId: 'live-1', activeTimelineEventId: 'live-1' })).toEqual({
      boardTargetId: 'live-1',
      activeTimelineEventId: 'live-1',
      isBoardTargetActive: true,
      label: 'Suggested event in progress',
    });

    expect(getCoordinatorTimelineTargetState({ boardTargetId: 'live-1', activeTimelineEventId: 'other-1' }).label).toBe('Suggested event waiting');
    expect(getCoordinatorTimelineTargetState({ boardTargetId: null, activeTimelineEventId: 'other-1' }).label).toBe('Selected event in progress');
  });
});
