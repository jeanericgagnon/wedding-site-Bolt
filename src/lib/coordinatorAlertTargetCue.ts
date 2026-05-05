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
      title: 'Custom update',
      detail: 'No day-of update is being suggested right now, so this draft is ready as a custom message.',
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
      title: `Suggested update: ${preferredSuggestion.label}`,
      detail: 'This draft matches the recommended day-of update.',
      aligned: true,
    };
  }

  return {
    title: `Adjusted from ${preferredSuggestion.label}`,
    detail: 'A different day-of update was suggested, but this draft has been customized.',
    aligned: false,
  };
};
