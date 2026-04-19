import { describe, expect, it } from 'vitest';
import { resolveCoordinatorEscalationTimelineTarget } from './coordinatorEscalationAction';

describe('coordinatorEscalationAction', () => {
  it('maps the timeline-live escalation to the up-next event when available', () => {
    expect(resolveCoordinatorEscalationTimelineTarget({
      escalationKey: 'timeline-live',
      upNextEvent: { id: 'cocktails', event_name: 'Cocktails', start_time: '2026-04-19T16:00:00' },
    })).toBe('cocktails');
  });

  it('returns null for non-timeline escalations or missing events', () => {
    expect(resolveCoordinatorEscalationTimelineTarget({ escalationKey: 'open-qna', upNextEvent: { id: 'q', event_name: 'Q', start_time: null } })).toBeNull();
    expect(resolveCoordinatorEscalationTimelineTarget({ escalationKey: 'timeline-live', upNextEvent: null })).toBeNull();
  });
});
