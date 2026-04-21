export interface EventInvitationSyncRow {
  event_invitation_id: string;
  event_name: string | null;
}

export interface EventRsvpSyncUpsertRow {
  event_invitation_id: string;
  attending: boolean;
  responded_at: string;
}

function normalizeEventName(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isCeremonyEvent(eventName: string | null | undefined): boolean {
  const normalized = normalizeEventName(eventName);
  return normalized.includes('ceremony') || normalized.includes('wedding ceremony');
}

function isReceptionEvent(eventName: string | null | undefined): boolean {
  const normalized = normalizeEventName(eventName);
  return normalized.includes('reception') || normalized.includes('cocktail hour') || normalized.includes('dinner and dancing');
}

export function buildEventRsvpSyncRows(params: {
  invitations: EventInvitationSyncRow[];
  attending: boolean;
  attendCeremony: boolean;
  attendReception: boolean;
  respondedAt: string;
}): EventRsvpSyncUpsertRow[] {
  const { invitations, attending, attendCeremony, attendReception, respondedAt } = params;

  if (!attending) {
    return invitations.map((invitation) => ({
      event_invitation_id: invitation.event_invitation_id,
      attending: false,
      responded_at: respondedAt,
    }));
  }

  return invitations.flatMap((invitation) => {
    if (isCeremonyEvent(invitation.event_name)) {
      return [{
        event_invitation_id: invitation.event_invitation_id,
        attending: attendCeremony,
        responded_at: respondedAt,
      }];
    }

    if (isReceptionEvent(invitation.event_name)) {
      return [{
        event_invitation_id: invitation.event_invitation_id,
        attending: attendReception,
        responded_at: respondedAt,
      }];
    }

    return [];
  });
}
