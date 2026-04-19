import type { GuestLiteForCoordinator } from './coordinatorTypes';

export type CoordinatorDoorStatus = 'ready' | 'watch' | 'done';

export const getCoordinatorDoorStatus = (guest: GuestLiteForCoordinator): CoordinatorDoorStatus => {
  if (guest.checked_in_at) return 'done';
  if (guest.rsvp_status && guest.rsvp_status.toLowerCase() !== 'confirmed') return 'watch';
  return 'ready';
};

export const getCoordinatorDoorStatusLabel = (status: CoordinatorDoorStatus) => {
  switch (status) {
    case 'done':
      return 'Checked in';
    case 'watch':
      return 'Needs review';
    default:
      return 'Ready';
  }
};
