import { describe, expect, it } from 'vitest';
import { buildCoordinatorTimelineBoard } from './coordinatorTimelineBoard';

describe('coordinatorTimelineBoard', () => {
  const events = [
    { id: 'e1', event_name: 'Ceremony', start_time: null },
    { id: 'e2', event_name: 'Cocktail Hour', start_time: null },
    { id: 'e3', event_name: 'Reception', start_time: null },
  ];

  it('shows an active run-of-show when a live event exists', () => {
    expect(buildCoordinatorTimelineBoard({
      events,
      timelineState: { e1: 'done', e2: 'live', e3: 'up-next' },
      liveEventId: 'e2',
      upNextEventId: 'e3',
    })).toEqual({
      liveLabel: 'Cocktail Hour',
      upNextLabel: 'Reception',
      progressLabel: '1/3 complete',
      stateLabel: 'Run-of-show is active',
      tone: 'ready',
    });
  });

  it('warns when the room is waiting on the next event', () => {
    expect(buildCoordinatorTimelineBoard({
      events,
      timelineState: { e1: 'done', e2: 'up-next', e3: 'up-next' },
      liveEventId: null,
      upNextEventId: 'e2',
    })).toEqual({
      liveLabel: 'No event is live yet',
      upNextLabel: 'Cocktail Hour',
      progressLabel: '1/3 complete',
      stateLabel: 'Room is waiting on the next event to begin',
      tone: 'warning',
    });
  });

  it('shows a complete run-of-show when every event is done', () => {
    expect(buildCoordinatorTimelineBoard({
      events,
      timelineState: { e1: 'done', e2: 'done', e3: 'done' },
      liveEventId: null,
      upNextEventId: null,
    })).toEqual({
      liveLabel: 'No event is live yet',
      upNextLabel: 'No up-next event queued',
      progressLabel: '3/3 complete',
      stateLabel: 'Run-of-show is complete',
      tone: 'ready',
    });
  });

  it('shows setup truth when no itinerary events exist yet', () => {
    expect(buildCoordinatorTimelineBoard({
      events: [],
      timelineState: {},
      liveEventId: null,
      upNextEventId: null,
    })).toEqual({
      liveLabel: 'No event is live yet',
      upNextLabel: 'No up-next event queued',
      progressLabel: 'No events scheduled',
      stateLabel: 'Timeline needs itinerary events',
      tone: 'neutral',
    });
  });
});
