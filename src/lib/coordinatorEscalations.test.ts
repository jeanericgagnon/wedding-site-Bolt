import { describe, expect, it } from 'vitest';
import { buildCoordinatorEscalations } from './coordinatorEscalations';

describe('coordinatorEscalations', () => {
  it('surfaces door review, q&a, and timeline gaps together', () => {
    const items = buildCoordinatorEscalations({
      guests: [
        { id: '1', first_name: 'Alex', last_name: 'Rivera', name: 'Alex Rivera', rsvp_status: 'pending', checked_in_at: null },
      ],
      qnaItems: [
        { id: 'q1', question: 'Where do I park?', status: 'new' },
      ],
      events: [
        { id: 'ceremony', event_name: 'Ceremony', start_time: '2026-04-19T15:00:00' },
      ],
      currentEventName: 'Ceremony',
      timelineState: {},
    });

    expect(items.map((item) => item.key)).toEqual(['door-review', 'open-qna', 'timeline-live']);
  });

  it('falls back to an all-clear item when nothing urgent is open', () => {
    const items = buildCoordinatorEscalations({
      guests: [
        { id: '1', first_name: 'Alex', last_name: 'Rivera', name: 'Alex Rivera', rsvp_status: 'confirmed', checked_in_at: '2026-04-19T10:00:00.000Z' },
      ],
      qnaItems: [
        { id: 'q1', question: 'Where do I park?', status: 'answered', answer: 'Use the valet lot.' },
      ],
      events: [
        { id: 'ceremony', event_name: 'Ceremony', start_time: '2026-04-19T15:00:00' },
      ],
      currentEventName: 'Ceremony',
      timelineState: { ceremony: 'live' },
    });

    expect(items).toEqual([
      {
        key: 'all-clear',
        title: 'Day-of board looks calm',
        detail: 'No urgent escalations need attention right now.',
        tone: 'success',
      },
    ]);
  });
});
