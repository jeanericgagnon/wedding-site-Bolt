import type { CoordinatorTimelineEventLite } from './coordinatorTimelineFocus';

export type CoordinatorAlertSuggestion = {
  key: string;
  label: string;
  subject: string;
  body: string;
  audience: string;
};

export const buildCoordinatorAlertSuggestions = ({
  liveEvent,
  upNextEvent,
}: {
  liveEvent: CoordinatorTimelineEventLite | null;
  upNextEvent: CoordinatorTimelineEventLite | null;
}): CoordinatorAlertSuggestion[] => {
  const suggestions: CoordinatorAlertSuggestion[] = [];

  if (liveEvent) {
    suggestions.push({
      key: `live:${liveEvent.id}`,
      label: `Update live event`,
      subject: `${liveEvent.event_name} is live`,
      body: `${liveEvent.event_name} is happening now. Please make your way over if you're joining us.`,
      audience: `event:${liveEvent.id}`,
    });
  }

  if (upNextEvent) {
    suggestions.push({
      key: `up-next:${upNextEvent.id}`,
      label: `Cue next event`,
      subject: `${upNextEvent.event_name} is coming up`,
      body: `${upNextEvent.event_name} is coming up shortly. Please be ready to head over soon.`,
      audience: `event:${upNextEvent.id}`,
    });
  }

  suggestions.push({
    key: 'check-in',
    label: 'Prompt arrivals',
    subject: 'Check-in reminder',
    body: 'If you have arrived, please head to check-in so we can get you settled quickly.',
    audience: 'all',
  });

  return suggestions;
};
