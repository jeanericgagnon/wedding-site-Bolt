import type { CoordinatorTimelineEventLite } from './coordinatorTimelineFocus';
import type { CoordinatorTimelineState } from './coordinatorModePersistence';

export type CoordinatorTimelineBoard = {
  liveLabel: string;
  upNextLabel: string;
  progressLabel: string;
  stateLabel: string;
  tone: 'ready' | 'warning' | 'neutral';
};

export const buildCoordinatorTimelineBoard = ({
  events,
  timelineState,
  liveEventId,
  upNextEventId,
}: {
  events: CoordinatorTimelineEventLite[];
  timelineState: Record<string, CoordinatorTimelineState>;
  liveEventId: string | null;
  upNextEventId: string | null;
}): CoordinatorTimelineBoard => {
  const liveEvent = events.find((event) => event.id === liveEventId) ?? null;
  const upNextEvent = events.find((event) => event.id === upNextEventId) ?? null;
  const doneCount = events.filter((event) => (timelineState[event.id] || 'up-next') === 'done').length;

  return {
    liveLabel: liveEvent ? liveEvent.event_name : 'No event is live yet',
    upNextLabel: upNextEvent ? upNextEvent.event_name : 'No up-next event queued',
    progressLabel: `${doneCount}/${events.length} complete`,
    stateLabel: liveEvent
      ? 'Run-of-show is active'
      : upNextEvent
        ? 'Room is waiting on the next event to go live'
        : 'Timeline needs setup',
    tone: liveEvent ? 'ready' : upNextEvent ? 'warning' : 'neutral',
  };
};
