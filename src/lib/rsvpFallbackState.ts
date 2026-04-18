import { isPendingRsvpStatus } from './rsvpStatus';

export type RsvpFallbackState = 'healthy' | 'manual-follow-up' | 'manual-handled' | 'unreachable';

export interface RsvpFallbackInput {
  rsvpStatus?: string | null;
  hasEmail?: boolean;
  hasPhone?: boolean;
  manualHandled?: boolean;
}

export interface RsvpFallbackDescriptor {
  state: RsvpFallbackState;
  label: string;
  detail: string;
  tone: 'neutral' | 'warning' | 'success' | 'danger';
}

export function getRsvpFallbackState(input: RsvpFallbackInput): RsvpFallbackDescriptor {
  if (input.manualHandled) {
    return {
      state: 'manual-handled',
      label: 'Handled manually',
      detail: 'A couple or planner can carry this RSVP without relying on the guest to self-serve.',
      tone: 'success',
    };
  }

  const hasContact = Boolean(input.hasEmail || input.hasPhone);
  const pending = isPendingRsvpStatus(input.rsvpStatus);

  if (pending && !hasContact) {
    return {
      state: 'unreachable',
      label: 'No contact path',
      detail: 'This guest still needs a reply, but there is no direct digital contact method saved yet.',
      tone: 'danger',
    };
  }

  if (pending) {
    return {
      state: 'manual-follow-up',
      label: 'Manual follow-up',
      detail: 'This guest may need a phone call, text, family relay, or other offline follow-up.',
      tone: 'warning',
    };
  }

  return {
    state: 'healthy',
    label: 'Self-serve or complete',
    detail: 'This guest is not currently sitting in the fallback queue.',
    tone: 'neutral',
  };
}
