import { describe, expect, it } from 'vitest';
import { getCoordinatorPrimaryTimelineAction } from './coordinatorTimelineActions';

const ceremony = { id: 'ceremony', event_name: 'Ceremony', start_time: '2026-04-19T15:00:00' };
const cocktails = { id: 'cocktails', event_name: 'Cocktails', start_time: '2026-04-19T16:00:00' };

describe('coordinatorTimelineActions', () => {
  it('offers a start-now action for the up-next event', () => {
    expect(getCoordinatorPrimaryTimelineAction({
      event: cocktails,
      liveEventId: 'ceremony',
      upNextEventId: 'cocktails',
      timelineState: { ceremony: 'live', cocktails: 'up-next' },
    })).toEqual({ label: 'Start now', nextState: 'live' });
  });

  it('shows live-now without another action for the current event', () => {
    expect(getCoordinatorPrimaryTimelineAction({
      event: ceremony,
      liveEventId: 'ceremony',
      upNextEventId: 'cocktails',
      timelineState: { ceremony: 'live', cocktails: 'up-next' },
    })).toEqual({ label: 'Live now', nextState: null });
  });

  it('locks completed events', () => {
    expect(getCoordinatorPrimaryTimelineAction({
      event: ceremony,
      liveEventId: null,
      upNextEventId: 'cocktails',
      timelineState: { ceremony: 'done', cocktails: 'up-next' },
    })).toEqual({ label: 'Completed', nextState: null });
  });
});
