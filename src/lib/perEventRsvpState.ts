export interface PerEventRsvpStateInput {
  invitedToCeremony?: boolean;
  invitedToReception?: boolean;
  invitedEventIds?: string[] | null;
}

export interface PerEventRsvpStateDescriptor {
  summary: string;
  detail: string;
}

export function getPerEventRsvpState(input: PerEventRsvpStateInput): PerEventRsvpStateDescriptor {
  const hasCustomEventInvites = Boolean(input.invitedEventIds && input.invitedEventIds.length > 0);
  const invitedToCeremony = input.invitedToCeremony !== false;
  const invitedToReception = input.invitedToReception !== false;

  if (hasCustomEventInvites) {
    return {
      summary: `${input.invitedEventIds?.length ?? 0} event-specific invite${(input.invitedEventIds?.length ?? 0) === 1 ? '' : 's'}`,
      detail: 'This guest is being tracked against specific event invitations instead of a single flat RSVP state.',
    };
  }

  if (invitedToCeremony && invitedToReception) {
    return {
      summary: 'Ceremony + reception',
      detail: 'This guest is invited to the main event flow for both ceremony and reception.',
    };
  }

  if (invitedToCeremony && !invitedToReception) {
    return {
      summary: 'Ceremony only',
      detail: 'This guest is currently invited to the ceremony but not the reception.',
    };
  }

  if (!invitedToCeremony && invitedToReception) {
    return {
      summary: 'Reception only',
      detail: 'This guest is currently invited to the reception but not the ceremony.',
    };
  }

  return {
    summary: 'Custom event path needed',
    detail: 'This guest does not fit the default ceremony/reception structure cleanly and likely needs event-specific review.',
  };
}
