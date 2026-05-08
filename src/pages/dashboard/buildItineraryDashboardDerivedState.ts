import { analyzeTimeline } from '../../lib/invisibleIntelligence';
import { type ItineraryDashboardEvent } from './itineraryService';

type EventWithInvites = ItineraryDashboardEvent;
type ItineraryEvent = Omit<ItineraryDashboardEvent, 'invitation_count' | 'rsvp_count' | 'attending_count' | 'declined_count' | 'pending_count'>;

type Args = {
  events: EventWithInvites[];
  shiftFromEventId: string;
};

function timeToMinutes(timeString: string | null): number | null {
  if (!timeString) return null;
  const [h, m] = timeString.split(':').map(Number);
  return h * 60 + (m || 0);
}

function durationFromEvent(event: Pick<ItineraryEvent, 'start_time' | 'end_time'>) {
  const start = timeToMinutes(event.start_time);
  const end = timeToMinutes(event.end_time);
  if (start === null || end === null || end <= start) return null;
  return end - start;
}

function findConflicts(eventList: EventWithInvites[]): Set<string> {
  const conflictIds = new Set<string>();
  for (let i = 0; i < eventList.length; i++) {
    for (let j = i + 1; j < eventList.length; j++) {
      const a = eventList[i];
      const b = eventList[j];
      if (a.event_date !== b.event_date) continue;
      const aStart = timeToMinutes(a.start_time);
      const aEnd = timeToMinutes(a.end_time) ?? (aStart !== null ? aStart + 60 : null);
      const bStart = timeToMinutes(b.start_time);
      const bEnd = timeToMinutes(b.end_time) ?? (bStart !== null ? bStart + 60 : null);
      if (aStart === null || bStart === null) continue;
      const aE = aEnd ?? aStart + 60;
      const bE = bEnd ?? bStart + 60;
      if (aStart < bE && aE > bStart) {
        conflictIds.add(a.id);
        conflictIds.add(b.id);
      }
    }
  }
  return conflictIds;
}

function formatTime(timeString: string | null) {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function getMapUrl(locationName: string, locationAddress: string) {
  const query = encodeURIComponent(`${locationName} ${locationAddress}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function buildItineraryDashboardDerivedState({ events, shiftFromEventId }: Args) {
  const timelineInsights = analyzeTimeline(events.map((event) => ({
    id: event.id,
    name: event.event_name,
    eventDate: event.event_date,
    startTime: event.start_time,
    endTime: event.end_time,
    durationMinutes: durationFromEvent(event),
  }))).slice(0, 4);
  const sortedShiftEvents = [...events].sort((a, b) => `${a.event_date}T${a.start_time}`.localeCompare(`${b.event_date}T${b.start_time}`));
  const shiftFromIndex = shiftFromEventId === 'all' ? 0 : sortedShiftEvents.findIndex((event) => event.id === shiftFromEventId);
  const shiftPreviewCount = shiftFromIndex >= 0 ? sortedShiftEvents.length - shiftFromIndex : 0;
  const shiftPreviewLabel = shiftFromEventId === 'all'
    ? `${shiftPreviewCount} event${shiftPreviewCount === 1 ? '' : 's'}`
    : `${shiftPreviewCount} event${shiftPreviewCount === 1 ? '' : 's'} from ${sortedShiftEvents[shiftFromIndex]?.event_name ?? 'selected event'}`;

  return {
    conflictIds: findConflicts(events),
    formatTime,
    getMapUrl,
    shiftPreviewCount,
    shiftPreviewLabel,
    sortedShiftEvents,
    timelineInsights,
  };
}
