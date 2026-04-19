import type { CoordinatorTimelineEventLite } from './coordinatorTimelineFocus';
import type { CoordinatorTimelineState } from './coordinatorModePersistence';

export const getCoordinatorPrimaryTimelineAction = ({
  event,
  liveEventId,
  upNextEventId,
  timelineState,
}: {
  event: CoordinatorTimelineEventLite;
  liveEventId: string | null;
  upNextEventId: string | null;
  timelineState: Record<string, CoordinatorTimelineState>;
}) => {
  const state = timelineState[event.id] || 'up-next';
  if (state === 'done') {
    return { label: 'Completed', nextState: null as CoordinatorTimelineState | null };
  }
  if (event.id === liveEventId) {
    return { label: 'Live now', nextState: null as CoordinatorTimelineState | null };
  }
  if (event.id === upNextEventId) {
    return { label: 'Start now', nextState: 'live' as CoordinatorTimelineState };
  }
  return { label: 'Make live', nextState: 'live' as CoordinatorTimelineState };
};
