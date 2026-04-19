import type { GuestLiteForCoordinator } from './coordinatorTypes';
import type { CoordinatorQnaItem, CoordinatorTimelineState } from './coordinatorModePersistence';
import { getCoordinatorDoorStatus } from './coordinatorCheckInStatus';
import type { CoordinatorTimelineEventLite } from './coordinatorTimelineFocus';

export type CoordinatorEscalation = {
  key: string;
  title: string;
  detail: string;
  tone: 'warning' | 'success' | 'neutral';
};

export const buildCoordinatorEscalations = ({
  guests,
  qnaItems,
  events,
  timelineState,
}: {
  guests: GuestLiteForCoordinator[];
  qnaItems: CoordinatorQnaItem[];
  events: CoordinatorTimelineEventLite[];
  timelineState: Record<string, CoordinatorTimelineState>;
}): CoordinatorEscalation[] => {
  const items: CoordinatorEscalation[] = [];

  const reviewCount = guests.filter((guest) => getCoordinatorDoorStatus(guest) === 'watch').length;
  if (reviewCount > 0) {
    items.push({
      key: 'door-review',
      title: 'Door exceptions waiting',
      detail: `${reviewCount} guest${reviewCount === 1 ? '' : 's'} need a coordinator decision before check-in.`,
      tone: 'warning',
    });
  }

  const openQna = qnaItems.filter((item) => item.status === 'new').length;
  if (openQna > 0) {
    items.push({
      key: 'open-qna',
      title: 'Guest questions still open',
      detail: `${openQna} question${openQna === 1 ? '' : 's'} still need an answer.`,
      tone: 'warning',
    });
  }

  const hasLiveEvent = events.some((event) => (timelineState[event.id] || 'up-next') === 'live');
  if (events.length > 0 && !hasLiveEvent) {
    items.push({
      key: 'timeline-live',
      title: 'No live event selected',
      detail: 'Mark the current event live so timeline focus and day-of messaging stay aligned.',
      tone: 'warning',
    });
  }

  if (items.length === 0) {
    items.push({
      key: 'all-clear',
      title: 'Ops board looks calm',
      detail: 'No urgent escalations need attention right now.',
      tone: 'success',
    });
  }

  return items.slice(0, 4);
};
