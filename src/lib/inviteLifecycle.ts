import { isPendingRsvpStatus } from './rsvpStatus';

export type InviteLifecycleState = 'not-invited' | 'invited' | 'reminded' | 'manual-handled' | 'no-response';

export interface InviteLifecycleInput {
  invitationSentAt?: string | null;
  reminderLastSentAt?: string | null;
  rsvpStatus?: string | null;
  manualHandled?: boolean;
}

export interface InviteLifecycleDescriptor {
  state: InviteLifecycleState;
  label: string;
  detail: string;
}

export function getInviteLifecycleState(input: InviteLifecycleInput): InviteLifecycleDescriptor {
  if (input.manualHandled) {
    return { state: 'manual-handled', label: 'Handled manually', detail: 'This guest is being carried through the invite/RSVP flow manually.' };
  }
  if (isPendingRsvpStatus(input.rsvpStatus)) {
    if (input.reminderLastSentAt) {
      return { state: 'reminded', label: 'Reminder sent', detail: 'A reminder already went out and the guest still has not replied.' };
    }
    if (input.invitationSentAt) {
      return { state: 'invited', label: 'Invited', detail: 'The invitation went out, but this guest has not replied yet.' };
    }
    return { state: 'not-invited', label: 'Not invited yet', detail: 'No invite has been sent yet.' };
  }
  return { state: 'no-response', label: 'RSVP received', detail: 'This guest is no longer sitting in the invite lifecycle queue.' };
}
