import type { GuestLiteForCoordinator } from './coordinatorTypes';
import type { CoordinatorTimelineState } from './coordinatorModePersistence';
import type { CoordinatorTimelineEventLite } from './coordinatorTimelineFocus';

export type CoordinatorCorrectionCue = {
  key: 'undo-check-in' | 'reopen-event';
  title: string;
  detail: string;
};

export const buildCoordinatorCorrectionCues = ({
  guests,
  events,
  timelineState,
}: {
  guests: GuestLiteForCoordinator[];
  events: CoordinatorTimelineEventLite[];
  timelineState: Record<string, CoordinatorTimelineState>;
}) => {
  const cues: CoordinatorCorrectionCue[] = [];

  const latestCheckedInGuest = guests.find((guest) => !!guest.checked_in_at);
  if (latestCheckedInGuest) {
    cues.push({
      key: 'undo-check-in',
      title: 'Need to reverse a check-in?',
      detail: `${latestCheckedInGuest.name} is already marked checked in — use Undo check-in if that was a mistake.`,
    });
  }

  const completedEvent = events.find((event) => (timelineState[event.id] || 'up-next') === 'done');
  if (completedEvent) {
    cues.push({
      key: 'reopen-event',
      title: 'Need to reopen the timeline?',
      detail: `${completedEvent.event_name} is marked completed — reopen it if that state changed too early.`,
    });
  }

  return cues.slice(0, 2);
};
