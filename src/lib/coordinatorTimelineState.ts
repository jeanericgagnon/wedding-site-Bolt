import type { CoordinatorTimelineState } from './coordinatorModePersistence';

export const setCoordinatorEventTimelineState = (
  previous: Record<string, CoordinatorTimelineState>,
  eventId: string,
  nextState: CoordinatorTimelineState,
) => {
  if (nextState !== 'live') {
    return {
      ...previous,
      [eventId]: nextState,
    };
  }

  const normalized: Record<string, CoordinatorTimelineState> = {};
  for (const [id, state] of Object.entries(previous)) {
    normalized[id] = id === eventId ? 'live' : state === 'live' ? 'up-next' : state;
  }
  normalized[eventId] = 'live';
  return normalized;
};
