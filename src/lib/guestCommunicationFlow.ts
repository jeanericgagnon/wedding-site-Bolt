export interface CommunicationStage {
  id: 'save-the-date' | 'invite' | 'reminder' | 'week-of' | 'day-of' | 'thank-you';
  label: string;
  detail: string;
}

export const GUEST_COMMUNICATION_FLOW: CommunicationStage[] = [
  {
    id: 'save-the-date',
    label: 'Save the date',
    detail: 'A soft first touch so guests can hold the date before the full site is finished.',
  },
  {
    id: 'invite',
    label: 'Invitation',
    detail: 'The main send that brings guests into the RSVP flow and sets expectations clearly.',
  },
  {
    id: 'reminder',
    label: 'Reminder',
    detail: 'A calm follow-up for guests who still have not replied or still need details.',
  },
  {
    id: 'week-of',
    label: 'Week-of note',
    detail: 'A final practical note for guests who need timing, arrival, parking, or last-minute clarity before the celebration starts.',
  },
  {
    id: 'day-of',
    label: 'Day-of update',
    detail: 'Short, practical updates for timing, parking, venue changes, or last-mile help.',
  },
  {
    id: 'thank-you',
    label: 'Thank-you',
    detail: 'A post-wedding note for gratitude, memory sharing, or a gentle close to the guest communication loop.',
  },
];
