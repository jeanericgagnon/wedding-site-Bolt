import { getCoordinatorDoorStatus } from './coordinatorCheckInStatus';
import type { GuestLiteForCoordinator } from './coordinatorTypes';

export type CoordinatorCheckInBoard = {
  statusLabel: string;
  tone: 'ready' | 'warning' | 'neutral';
  activeLabel: string;
  nextReadyLabel: string;
  queueLabel: string;
  reviewLabel: string;
};

export const buildCoordinatorCheckInBoard = ({
  guests,
  activeGuest,
}: {
  guests: GuestLiteForCoordinator[];
  activeGuest: GuestLiteForCoordinator | null;
}): CoordinatorCheckInBoard => {
  const readyGuests = guests.filter((guest) => getCoordinatorDoorStatus(guest) === 'ready');
  const watchGuests = guests.filter((guest) => getCoordinatorDoorStatus(guest) === 'watch');
  const doneGuests = guests.filter((guest) => getCoordinatorDoorStatus(guest) === 'done');
  const nextReadyGuest = readyGuests.find((guest) => guest.id !== activeGuest?.id) ?? null;

  return {
    statusLabel: watchGuests.length > 0
      ? 'Door review is active'
      : readyGuests.length > 0
        ? 'Door is ready to keep moving'
        : doneGuests.length > 0
          ? 'Arrivals are covered'
          : 'No arrivals in queue',
    tone: watchGuests.length > 0 ? 'warning' : readyGuests.length > 0 ? 'ready' : 'neutral',
    activeLabel: activeGuest ? activeGuest.name : 'No active guest selected',
    nextReadyLabel: nextReadyGuest ? nextReadyGuest.name : 'No other ready arrival queued',
    queueLabel: `${readyGuests.length} ready · ${doneGuests.length} checked in`,
    reviewLabel: watchGuests.length ? `${watchGuests.length} need review` : 'No review holds',
  };
};
