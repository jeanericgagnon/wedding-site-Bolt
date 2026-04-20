import type { CoordinatorAlertSuggestion } from './coordinatorAlertSuggestions';

export type CoordinatorAlertTargetCue = {
  title: string;
  detail: string;
  aligned: boolean;
};

export const buildCoordinatorAlertTargetCue = ({
  preferredSuggestion,
  subject,
  body,
  audience,
}: {
  preferredSuggestion: CoordinatorAlertSuggestion | null;
  subject: string;
  body: string;
  audience: string;
}): CoordinatorAlertTargetCue => {
  if (!preferredSuggestion) {
    return {
      title: 'Custom alert target',
      detail: 'No live lane is being suggested right now, so this draft is running as a custom update.',
      aligned: true,
    };
  }

  const aligned = (
    preferredSuggestion.subject.trim() === subject.trim()
    && preferredSuggestion.body.trim() === body.trim()
    && preferredSuggestion.audience === audience
  );

  if (aligned) {
    return {
      title: `Board target: ${preferredSuggestion.label}`,
      detail: 'This draft is aligned with the board’s recommended day-of alert lane.',
      aligned: true,
    };
  }

  return {
    title: `Adjusted from ${preferredSuggestion.label}`,
    detail: 'The board suggested a different alert lane, but this draft has been customized for a different send.',
    aligned: false,
  };
};
