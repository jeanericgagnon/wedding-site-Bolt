import { describe, expect, it } from 'vitest';
import { buildCoordinatorCorrectionCues } from './coordinatorCorrectionsSummary';

describe('coordinatorCorrectionsSummary', () => {
  it('surfaces correction cues for checked-in guests and completed events', () => {
    const cues = buildCoordinatorCorrectionCues({
      guests: [
        { id: '1', first_name: 'Alex', last_name: 'Rivera', name: 'Alex Rivera', rsvp_status: 'confirmed', checked_in_at: '2026-04-19T10:00:00.000Z' },
      ],
      events: [
        { id: 'ceremony', event_name: 'Ceremony', start_time: '2026-04-19T15:00:00' },
      ],
      timelineState: { ceremony: 'done' },
    });

    expect(cues.map((cue) => cue.key)).toEqual(['undo-check-in', 'reopen-event']);
  });

  it('stays empty when there is nothing obvious to correct', () => {
    expect(buildCoordinatorCorrectionCues({ guests: [], events: [], timelineState: {} })).toEqual([]);
  });
});
