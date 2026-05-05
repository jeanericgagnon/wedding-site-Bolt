export interface ItineraryEventRsvpRow {
  attending: boolean | null;
}

export interface ItineraryEventRsvpCounts {
  rsvpCount: number;
  attendingCount: number;
  declinedCount: number;
  pendingCount: number;
}

export function shouldLoadEventRsvps(invitationCount: number, hasEventRsvpsTable: boolean | null): boolean {
  return invitationCount > 0 && hasEventRsvpsTable !== false;
}

export function deriveItineraryEventRsvpCounts(
  rsvps: ItineraryEventRsvpRow[],
  invitationCount = rsvps.length,
): ItineraryEventRsvpCounts {
  const attendingCount = rsvps.filter((r) => r.attending === true).length;
  const declinedCount = rsvps.filter((r) => r.attending === false).length;

  return {
    rsvpCount: rsvps.length,
    attendingCount,
    declinedCount,
    pendingCount: Math.max(0, invitationCount - attendingCount - declinedCount),
  };
}
