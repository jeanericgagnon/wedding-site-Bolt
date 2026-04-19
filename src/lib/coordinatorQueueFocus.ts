import type { CoordinatorCheckInFilter } from './coordinatorCheckInQueue';

export const resolveCoordinatorQueueFocus = (escalationKey: string | null) => {
  switch (escalationKey) {
    case 'door-review':
      return {
        filter: 'arrivals' as CoordinatorCheckInFilter,
        reviewOnly: true,
      };
    default:
      return {
        filter: 'arrivals' as CoordinatorCheckInFilter,
        reviewOnly: false,
      };
  }
};
