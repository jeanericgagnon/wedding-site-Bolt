import type { CoordinatorTimelineEventLite } from './coordinatorTimelineFocus';

export const resolveCoordinatorEscalationTimelineTarget = ({
  escalationKey,
  upNextEvent,
}: {
  escalationKey: string | null;
  upNextEvent: CoordinatorTimelineEventLite | null;
}) => {
  if (escalationKey !== 'timeline-live') return null;
  return upNextEvent?.id ?? null;
};
