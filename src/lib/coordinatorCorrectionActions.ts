import type { CoordinatorTimelineState } from './coordinatorModePersistence';
import type { GuestLiteForCoordinator } from './coordinatorTypes';

export const getCoordinatorCheckInActionLabel = (guest: GuestLiteForCoordinator) => (
  guest.checked_in_at ? 'Undo check-in' : 'Check in'
);

export const getCoordinatorTimelineCorrectionAction = (state: CoordinatorTimelineState) => {
  switch (state) {
    case 'live':
      return { label: 'Move back to up next', nextState: 'up-next' as CoordinatorTimelineState };
    case 'done':
      return { label: 'Reopen event', nextState: 'up-next' as CoordinatorTimelineState };
    default:
      return null;
  }
};
