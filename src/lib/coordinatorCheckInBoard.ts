import { getCoordinatorDoorStatus, type CoordinatorDoorStatusContext } from './coordinatorCheckInStatus';
import type { GuestLiteForCoordinator } from './coordinatorTypes';

export type CoordinatorCheckInBoard = {
  eventLabel: string;
  eventProgressLabel: string;
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
  currentEventName,
  context,
}: {
  guests: GuestLiteForCoordinator[];
  activeGuest: GuestLiteForCoordinator | null;
  currentEventName?: string | null;
  context?: CoordinatorDoorStatusContext;
}): CoordinatorCheckInBoard => {
  const readyGuests = guests.filter((guest) => getCoordinatorDoorStatus(guest, context) === 'ready');
  const watchGuests = guests.filter((guest) => getCoordinatorDoorStatus(guest, context) === 'watch');
  const doneGuests = guests.filter((guest) => getCoordinatorDoorStatus(guest, context) === 'done');
  const nextReadyGuest = readyGuests.find((guest) => guest.id !== activeGuest?.id) ?? null;
  const outstandingGuests = readyGuests.length + watchGuests.length;

  return {
    eventLabel: currentEventName ? `${currentEventName} door` : 'Door board',
    eventProgressLabel: `${doneGuests.length} in · ${outstandingGuests} waiting`,
    statusLabel: watchGuests.length > 0
      ? `${currentEventName ?? 'Door'} review is active`
      : readyGuests.length > 0
        ? `${currentEventName ?? 'Door'} is ready to keep moving`
        : doneGuests.length > 0
          ? 'Arrivals are covered'
          : 'No arrivals in queue',
    tone: watchGuests.length > 0 ? 'warning' : readyGuests.length > 0 ? 'ready' : 'neutral',
    activeLabel: activeGuest ? activeGuest.name : 'No active guest selected',
    nextReadyLabel: nextReadyGuest ? nextReadyGuest.name : 'No other ready arrival queued',
    queueLabel: `${readyGuests.length} ready · ${watchGuests.length} review · ${doneGuests.length} checked in`,
    reviewLabel: watchGuests.length ? `${watchGuests.length} need review before arrival` : 'No review holds',
  };
};
