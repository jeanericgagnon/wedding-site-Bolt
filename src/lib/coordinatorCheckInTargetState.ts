import type { GuestLiteForCoordinator } from './coordinatorTypes';
import { getCoordinatorDoorStatus, type CoordinatorDoorStatusContext } from './coordinatorCheckInStatus';

export const getCoordinatorCheckInBoardTargetId = (
  guests: GuestLiteForCoordinator[],
  context?: CoordinatorDoorStatusContext,
) => {
  const watchGuest = guests.find((guest) => getCoordinatorDoorStatus(guest, context) === 'watch');
  return watchGuest?.id ?? null;
};

export const getCoordinatorCheckInTargetState = ({
  boardTargetId,
  activeGuestId,
}: {
  boardTargetId: string | null;
  activeGuestId: string | null;
}) => {
  const isBoardTargetActive = !!boardTargetId && boardTargetId === activeGuestId;

  return {
    boardTargetId,
    activeGuestId,
    isBoardTargetActive,
    label: isBoardTargetActive ? 'Suggested guest in progress' : boardTargetId ? 'Suggested guest waiting' : activeGuestId ? 'Selected guest in progress' : null,
  };
};
