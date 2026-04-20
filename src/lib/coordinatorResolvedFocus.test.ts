import { describe, expect, it } from 'vitest';
import { resolveCoordinatorQnaFocusAfterItemsChange, resolveCoordinatorTimelineFocusAfterStateChange } from './coordinatorResolvedFocus';

describe('coordinatorResolvedFocus', () => {
  it('advances q&a focus off resolved items to the next open question', () => {
    expect(resolveCoordinatorQnaFocusAfterItemsChange([
      { id: 'q1', question: 'Where do I park?', status: 'answered', answer: 'Valet lot' },
      { id: 'q2', question: 'What time should I arrive?', status: 'new' },
    ], 'q1')).toBe('q2');
  });

  it('keeps q&a focus on the active unresolved question', () => {
    expect(resolveCoordinatorQnaFocusAfterItemsChange([
      { id: 'q1', question: 'Where do I park?', status: 'new' },
      { id: 'q2', question: 'What time should I arrive?', status: 'answered', answer: '4:30' },
    ], 'q1')).toBe('q1');
  });

  it('rolls timeline focus forward when the active event is done', () => {
    expect(resolveCoordinatorTimelineFocusAfterStateChange({
      events: [
        { id: 'ceremony', event_name: 'Ceremony', start_time: '2026-04-19T15:00:00' },
        { id: 'cocktails', event_name: 'Cocktails', start_time: '2026-04-19T16:00:00' },
      ],
      timelineState: { ceremony: 'done', cocktails: 'up-next' },
      activeTimelineEventId: 'ceremony',
    })).toBe('cocktails');
  });
});
