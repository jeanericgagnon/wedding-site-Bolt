export interface DayOfUpdateDraftInput {
  venue?: string | null;
  weddingDate?: string | null;
  audienceLabel?: string | null;
}

export function buildDayOfUpdateDraft(input: DayOfUpdateDraftInput): { subject: string; body: string } {
  const audienceLine = input.audienceLabel && input.audienceLabel !== 'All Guests'
    ? `Quick update for ${input.audienceLabel.toLowerCase()}.`
    : 'Quick day-of update for everyone joining us today.';
  const venueLine = input.venue ? `If you need help finding ${input.venue}, reply and we will point you the right way.` : 'Reply if you need help finding the venue.';

  return {
    subject: 'Day-of update',
    body: `${audienceLine}

Please arrive about 15 minutes early and check the site for the latest timing details.

${venueLine}`,
  };
}
