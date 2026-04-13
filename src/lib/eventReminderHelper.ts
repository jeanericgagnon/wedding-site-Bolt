export interface EventReminderDraftInput {
  audienceLabel?: string | null;
  eventLabel?: string | null;
  venue?: string | null;
}

export function buildEventReminderDraft(input: EventReminderDraftInput): { subject: string; body: string } {
  const eventLabel = input.eventLabel || 'this event';
  const audienceLine = input.audienceLabel && input.audienceLabel !== 'All Guests'
    ? `Quick reminder for ${input.audienceLabel.toLowerCase()} about ${eventLabel}.`
    : `Quick reminder about ${eventLabel}.`;
  const venueLine = input.venue ? `You can double-check the details for ${input.venue} here: [SITE_URL]` : 'You can double-check the details here: [SITE_URL]';

  return {
    subject: `${eventLabel} reminder`,
    body: `${audienceLine}

Please take a moment to confirm your plans so we can keep the event details accurate.

${venueLine}`,
  };
}
