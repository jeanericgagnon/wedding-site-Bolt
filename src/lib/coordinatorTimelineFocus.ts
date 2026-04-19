import type { CoordinatorTimelineState } from './coordinatorModePersistence';

export type CoordinatorTimelineEventLite = {
  id: string;
  event_name: string;
  start_time: string | null;
};

export const getCoordinatorLiveEventId = (
  events: CoordinatorTimelineEventLite[],
  timelineState: Record<string, CoordinatorTimelineState>,
) => events.find((event) => (timelineState[event.id] || 'up-next') === 'live')?.id ?? null;

export const getCoordinatorUpNextEventId = (
  events: CoordinatorTimelineEventLite[],
  timelineState: Record<string, CoordinatorTimelineState>,
) => {
  const liveEventId = getCoordinatorLiveEventId(events, timelineState);
  const futureCandidates = events.filter((event) => {
    const state = timelineState[event.id] || 'up-next';
    return state !== 'done' && event.id !== liveEventId;
  });
  return futureCandidates[0]?.id ?? null;
};
