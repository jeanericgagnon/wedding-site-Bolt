export interface ReminderDraftInput {
  weddingDate?: string | null;
  rsvpDeadline?: string | null;
  venue?: string | null;
  audienceLabel?: string | null;
}

export function buildRsvpReminderDraft(input: ReminderDraftInput): { subject: string; body: string } {
  const deadlineLine = input.rsvpDeadline ? `Please RSVP by ${input.rsvpDeadline}.` : 'Please RSVP when you have a moment.';
  const audienceLine = input.audienceLabel && input.audienceLabel !== 'All Guests'
    ? `This is for ${input.audienceLabel.toLowerCase()}.`
    : 'This is a quick reminder for anyone who still needs to reply.';
  const venueLine = input.venue ? `You can review the details for ${input.venue} here: [SITE_URL]` : 'You can review the details here: [SITE_URL]';

  return {
    subject: 'Friendly RSVP reminder',
    body: `${audienceLine}

${deadlineLine}

${venueLine}`,
  };
}
