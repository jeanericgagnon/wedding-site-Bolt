import { isPendingRsvpStatus } from '../../lib/rsvpStatus';

export type GuestReminderCandidate = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  name?: string;
  invite_token: string | null;
  email?: string | null;
  rsvp_status: string;
  reminder_last_sent_at?: string | null;
  invitation_sent_at?: string | null;
};

export function isDueGuestFollowUp(
  guest: GuestReminderCandidate,
  reminderCadenceMs: number,
): boolean {
  if (!guest.invite_token || !isPendingRsvpStatus(guest.rsvp_status)) return false;

  const lastSentRaw = guest.reminder_last_sent_at || guest.invitation_sent_at;
  const lastSent = lastSentRaw ? new Date(lastSentRaw) : null;
  if (!lastSent || Number.isNaN(lastSent.getTime())) return true;

  return (Date.now() - lastSent.getTime()) >= reminderCadenceMs;
}

export function getSmsRsvpLinkCandidates(
  guests: GuestReminderCandidate[],
  options: { skipRecentlyInvited: boolean; reminderCadenceMs: number },
): GuestReminderCandidate[] {
  return guests.filter((guest) => {
    if (!guest.invite_token) return false;
    if (!options.skipRecentlyInvited) return true;
    return isDueGuestFollowUp(guest, options.reminderCadenceMs);
  });
}
