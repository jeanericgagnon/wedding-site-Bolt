import { describe, expect, it } from 'vitest';
import { normalizeCoordinatorTimelineWorkState } from './coordinatorTimelineWorkState';

describe('coordinatorTimelineWorkState', () => {
  it('restores a valid active timeline target', () => {
    expect(normalizeCoordinatorTimelineWorkState({ activeTimelineEventId: 'cocktails' })).toEqual({ activeTimelineEventId: 'cocktails' });
  });

  it('drops malformed timeline work state safely', () => {
    expect(normalizeCoordinatorTimelineWorkState({ activeTimelineEventId: '' })).toEqual({ activeTimelineEventId: null });
    expect(normalizeCoordinatorTimelineWorkState(null)).toEqual({ activeTimelineEventId: null });
  });
});
