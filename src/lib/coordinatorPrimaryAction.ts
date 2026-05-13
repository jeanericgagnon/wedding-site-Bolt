import type { GuestLiteForCoordinator } from './coordinatorTypes';
import type { CoordinatorQnaItem, CoordinatorTimelineState } from './coordinatorModePersistence';
import type { CoordinatorTimelineEventLite } from './coordinatorTimelineFocus';
import { getCoordinatorDoorStatus, type CoordinatorDoorStatusContext } from './coordinatorCheckInStatus';
import { getFirstOpenCoordinatorQnaId } from './coordinatorQnaFocus';
import { getCoordinatorUpNextEventId } from './coordinatorTimelineFocus';

export type CoordinatorPrimaryAction = {
  key: 'door-review' | 'open-qna' | 'start-up-next' | 'all-clear';
  title: string;
  detail: string;
};

export const buildCoordinatorPrimaryAction = ({
  guests,
  qnaItems,
  events,
  timelineState,
  doorStatusContext,
}: {
  guests: GuestLiteForCoordinator[];
  qnaItems: CoordinatorQnaItem[];
  events: CoordinatorTimelineEventLite[];
  timelineState: Record<string, CoordinatorTimelineState>;
  doorStatusContext?: CoordinatorDoorStatusContext;
}): CoordinatorPrimaryAction => {
  const reviewGuest = guests.find((guest) => getCoordinatorDoorStatus(guest, doorStatusContext) === 'watch');
  if (reviewGuest) {
    return {
      key: 'door-review',
      title: 'Resolve the next door exception',
      detail: `${reviewGuest.name} needs a coordinator decision before check-in.`,
    };
  }

  const openQnaId = getFirstOpenCoordinatorQnaId(qnaItems);
  if (openQnaId) {
    const item = qnaItems.find((entry) => entry.id === openQnaId);
    return {
      key: 'open-qna',
      title: 'Answer the next guest question',
      detail: item?.question || 'A guest question is still waiting for an answer.',
    };
  }

  const upNextEventId = getCoordinatorUpNextEventId(events, timelineState);
  if (upNextEventId) {
    const event = events.find((entry) => entry.id === upNextEventId);
    return {
      key: 'start-up-next',
      title: 'Prepare the next event transition',
      detail: event ? `${event.event_name} is the next unfinished event in the run-of-show.` : 'The next event is ready to go live.',
    };
  }

  return {
    key: 'all-clear',
    title: 'Board is under control',
    detail: 'No urgent coordinator action is waiting right now.',
  };
};
