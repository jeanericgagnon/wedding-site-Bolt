import { describe, expect, it } from 'vitest';
import { buildCoordinatorPrimaryAction } from './coordinatorPrimaryAction';

describe('coordinatorPrimaryAction', () => {
  it('prioritizes door review over everything else', () => {
    const action = buildCoordinatorPrimaryAction({
      guests: [
        { id: '1', first_name: 'Sam', last_name: 'Lee', name: 'Sam Lee', rsvp_status: 'pending', checked_in_at: null },
      ],
      qnaItems: [
        { id: 'q1', question: 'Where do I park?', status: 'new' },
      ],
      events: [
        { id: 'ceremony', event_name: 'Ceremony', start_time: '2026-04-19T15:00:00' },
      ],
      timelineState: {},
    });

    expect(action.key).toBe('door-review');
  });

  it('falls through to open q&a when no door exceptions exist', () => {
    const action = buildCoordinatorPrimaryAction({
      guests: [
        { id: '1', first_name: 'Alex', last_name: 'Rivera', name: 'Alex Rivera', rsvp_status: 'confirmed', checked_in_at: null },
      ],
      qnaItems: [
        { id: 'q1', question: 'Where do I park?', status: 'new' },
      ],
      events: [
        { id: 'ceremony', event_name: 'Ceremony', start_time: '2026-04-19T15:00:00' },
      ],
      timelineState: {},
    });

    expect(action.key).toBe('open-qna');
  });

  it('falls through to the up-next timeline action when nothing urgent is open', () => {
    const action = buildCoordinatorPrimaryAction({
      guests: [],
      qnaItems: [],
      events: [
        { id: 'ceremony', event_name: 'Ceremony', start_time: '2026-04-19T15:00:00' },
      ],
      timelineState: {},
    });

    expect(action.key).toBe('start-up-next');
    expect(action.detail).toBe('Ceremony is the next unfinished event in the run-of-show.');
  });
});
