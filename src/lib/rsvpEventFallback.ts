export type RsvpSeedEvent = {
  id: string;
  label: string;
  dateLabel?: string;
  locationName?: string | null;
};

export type InviteEventOption = {
  id: string;
  event_name: string;
  event_date: string | null;
  start_time: string | null;
  location_name: string | null;
};

function hasMeaningfulInviteEvent(event: InviteEventOption): boolean {
  return [event.event_name, event.event_date, event.start_time, event.location_name]
    .some((value) => typeof value === 'string' && value.trim().length > 0);
}

export const deriveInviteEvents = (
  itineraryEvents: InviteEventOption[],
  rsvpSeeds: RsvpSeedEvent[]
): InviteEventOption[] => {
  if (itineraryEvents.some(hasMeaningfulInviteEvent)) return itineraryEvents;
  return rsvpSeeds.map((seed, index) => ({
    id: seed.id || `seed-${index + 1}`,
    event_name: seed.label || 'Event',
    event_date: '',
    start_time: '',
    location_name: seed.locationName || '',
  }));
};
