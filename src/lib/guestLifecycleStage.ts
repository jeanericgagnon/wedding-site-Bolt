export function getGuestLifecycleStage(guest: {
  rsvp_status?: string | null;
  invitation_sent_at?: string | null;
  reminder_last_sent_at?: string | null;
  checked_in_at?: string | null;
  thank_you_sent_at?: string | null;
}): string {
  if (guest.thank_you_sent_at) return 'Thank-you sent';
  if (guest.checked_in_at) return 'Day-of / arrived';
  if (guest.rsvp_status === 'confirmed') return 'RSVP received';
  if (guest.reminder_last_sent_at) return 'Reminder sent';
  if (guest.invitation_sent_at) return 'Invite sent';
  return 'Pre-invite';
}
