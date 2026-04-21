import type { GuestLiteForCoordinator } from './coordinatorTypes';

export const getNextCoordinatorCheckInFocusId = ({
  queue,
  activeGuestId,
  removeActiveGuest,
}: {
  queue: GuestLiteForCoordinator[];
  activeGuestId: string | null;
  removeActiveGuest: boolean;
}) => {
  if (!activeGuestId) return queue[0]?.id ?? null;

  const activeIndex = queue.findIndex((guest) => guest.id === activeGuestId);
  if (activeIndex === -1) return queue[0]?.id ?? null;
  if (!removeActiveGuest) return activeGuestId;

  return queue[activeIndex + 1]?.id ?? queue[activeIndex - 1]?.id ?? null;
};
