import type { GuestLiteForCoordinator } from './coordinatorTypes';
import type { CoordinatorTimelineState } from './coordinatorModePersistence';
import type { CoordinatorTimelineEventLite } from './coordinatorTimelineFocus';

export const getCoordinatorCorrectionGuestId = (guests: GuestLiteForCoordinator[]) => (
  guests.find((guest) => !!guest.checked_in_at)?.id ?? null
);

export const getCoordinatorCorrectionEventId = (
  events: CoordinatorTimelineEventLite[],
  timelineState: Record<string, CoordinatorTimelineState>,
) => events.find((event) => (timelineState[event.id] || 'up-next') === 'done')?.id ?? null;
