import type { CoordinatorAlertForm } from './coordinatorAlertFlow';
import type { AudienceOption } from './coordinatorModeSummaryTypes';
import type { CoordinatorAlertSuggestion } from './coordinatorAlertSuggestions';

export const buildCoordinatorAlertSummary = ({
  form,
  audienceOptions,
  preferredSuggestion,
  recipientCount,
}: {
  form: CoordinatorAlertForm;
  audienceOptions: AudienceOption[];
  preferredSuggestion: CoordinatorAlertSuggestion | null;
  recipientCount: number;
}) => {
  const audienceLabel = audienceOptions.find((option) => option.value === form.audience)?.label || form.audience;
  const intentLabel = preferredSuggestion?.label || 'Custom update';
  const deliveryLabel = form.scheduleType === 'later' && form.scheduleDate && form.scheduleTime
    ? `${form.channel.toUpperCase()} later on ${form.scheduleDate} at ${form.scheduleTime}`
    : `${form.channel.toUpperCase()} now`;

  return {
    intentLabel,
    audienceLabel,
    recipientLabel: `${recipientCount} recipient${recipientCount === 1 ? '' : 's'}`,
    deliveryLabel,
  };
};
