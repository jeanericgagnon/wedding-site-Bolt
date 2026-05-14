import { demoEvents, demoGuests } from '../../../lib/demoData';
import type { ItineraryEvent } from './guestDashboardTypes';

export interface DemoGuestItinerarySnapshot {
  itineraryEvents: ItineraryEvent[];
  eventInviteGuestMap: Map<string, Set<string>>;
  guestInvitedEventIds: Map<string, string[]>;
}

function toItineraryEvent(event: (typeof demoEvents)[number]): ItineraryEvent {
  return {
    id: event.id,
    event_name: event.event_name,
    event_date: event.event_date,
    start_time: event.start_time,
    location_name: event.location_name,
  };
}

export function buildDemoGuestItinerarySnapshot(): DemoGuestItinerarySnapshot {
  const itineraryEvents = demoEvents.map(toItineraryEvent);
  const eventInviteGuestMap = new Map<string, Set<string>>();

  for (const event of itineraryEvents) {
    const invitedGuestIds = new Set<string>();
    for (const [index, guest] of demoGuests.entries()) {
      const invitedToEvent = event.id === 'ceremony-id'
        || event.id === 'reception-id'
        || (event.id === 'welcome-dinner-id' && index % 2 === 0)
        || (event.id === 'brunch-id' && index % 3 === 0);
      if (invitedToEvent) invitedGuestIds.add(guest.id);
    }
    eventInviteGuestMap.set(event.id, invitedGuestIds);
  }

  const guestInvitedEventIds = new Map<string, string[]>();
  for (const guest of demoGuests) {
    const invitedEventIds = itineraryEvents
      .filter((event) => eventInviteGuestMap.get(event.id)?.has(guest.id))
      .map((event) => event.id);
    guestInvitedEventIds.set(guest.id, invitedEventIds);
  }

  return {
    itineraryEvents,
    eventInviteGuestMap,
    guestInvitedEventIds,
  };
}
