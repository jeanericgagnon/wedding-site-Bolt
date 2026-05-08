import { useCallback, useEffect, useState } from 'react';
import { demoEvents } from '../../lib/demoData';
import { readDemoItineraryEvents, writeDemoItineraryEvents } from './itineraryDemoStorage';
import {
  loadItineraryDashboardEvents,
  type ItineraryDashboardEvent,
} from './itineraryService';

// Optional table: detect once at runtime so older environments degrade quietly.
let hasEventRsvpsTable: boolean | null = null;

type EventWithInvites = ItineraryDashboardEvent;

type Args = {
  isDemoMode: boolean;
  toast: (message: string, type?: 'success' | 'error' | 'info') => void;
};

function buildDemoItineraryEvents(): EventWithInvites[] {
  return demoEvents.map((event, idx) => ({
    id: event.id,
    event_name: event.event_name,
    description: event.description,
    event_date: event.event_date,
    start_time: event.start_time,
    end_time: null,
    location_name: event.location_name,
    location_address: '',
    dress_code: idx % 2 === 0 ? 'Cocktail Attire' : null,
    notes: idx === 0 ? 'Shuttle departs from hotel lobby at 5:30 PM.' : null,
    display_order: event.display_order,
    is_visible: true,
    invitation_count: [86, 120, 120, 52][idx] ?? 0,
    rsvp_count: [72, 107, 109, 44][idx] ?? 0,
    attending_count: [68, 98, 101, 39][idx] ?? 0,
    declined_count: [4, 9, 8, 5][idx] ?? 0,
    pending_count: Math.max(0, ([86, 120, 120, 52][idx] ?? 0) - ([68, 98, 101, 39][idx] ?? 0) - ([4, 9, 8, 5][idx] ?? 0)),
  }));
}

export function useItineraryDashboardData({ isDemoMode, toast }: Args) {
  const [events, setEvents] = useState<EventWithInvites[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    try {
      if (isDemoMode) {
        const seeded = buildDemoItineraryEvents();
        const storedEvents = readDemoItineraryEvents(seeded);
        if (storedEvents.length > 0) {
          setEvents(storedEvents.map((event) => ({
            ...event,
            pending_count: typeof event.pending_count === 'number'
              ? event.pending_count
              : Math.max(0, event.invitation_count - event.attending_count - event.declined_count),
          })));
          return;
        }

        setEvents(seeded);
        return;
      }

      const snapshot = await loadItineraryDashboardEvents(hasEventRsvpsTable);
      hasEventRsvpsTable = snapshot.hasEventRsvpsTable;
      setEvents(snapshot.events);
    } catch {
      setEvents([]);
      toast('Couldn’t load itinerary events. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, toast]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (!isDemoMode) return;
    try {
      writeDemoItineraryEvents(events);
    } catch {}
  }, [events, isDemoMode]);

  return {
    events,
    loadEvents,
    loading,
    setEvents,
  };
}
