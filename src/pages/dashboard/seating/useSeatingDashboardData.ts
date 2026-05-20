import { useCallback, useEffect, useRef, useState } from 'react';
import { demoWeddingSite, demoGuests } from '../../../lib/demoData';
import { resolveOperationalEventId } from '../../../lib/operationalEvent';
import { isAttendingRsvpStatus } from '../../../lib/rsvpStatus';
import {
  type EligibleGuest,
  type EventCounters,
  type ItineraryEvent,
  type SeatingAssignment,
  type SeatingEvent,
  type SeatingLayoutVersion,
  type SeatingTable,
  deriveEventCountersFromGuests,
  getEligibleGuests,
  getEventCounters,
  getOrCreateSeatingEvent,
  getWeddingSiteId,
  loadAssignments,
  loadItineraryEvents,
  loadSeatingVersions,
  loadTables,
} from './seatingService';
import {
  DEMO_ITINERARY_STORAGE_KEY,
  loadDemoItineraryEventsFromStorage,
  readDemoSeatingState,
  readSeatingVersions,
  writeDemoSeatingState,
} from './seatingDemoStorage';

const DEMO_SEATING_EVENT_ID = 'demo-seating-event';

export function useSeatingDashboardData(args: {
  isDemoMode: boolean;
  toast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}) {
  const { isDemoMode, toast } = args;
  const [siteId, setSiteId] = useState<string | null>(null);
  const [itineraryEvents, setItineraryEvents] = useState<ItineraryEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [seatingEvent, setSeatingEvent] = useState<SeatingEvent | null>(null);
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [assignments, setAssignments] = useState<SeatingAssignment[]>([]);
  const [allGuests, setAllGuests] = useState<EligibleGuest[]>([]);
  const [counters, setCounters] = useState<EventCounters | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSeating, setLoadingSeating] = useState(false);
  const [invalidCount, setInvalidCount] = useState(0);
  const [versions, setVersions] = useState<SeatingLayoutVersion[]>([]);
  const initialLoadRequestIdRef = useRef(0);
  const seatingLoadRequestIdRef = useRef(0);

  const resetSeatingDashboardState = useCallback(() => {
    seatingLoadRequestIdRef.current += 1;
    setSiteId(null);
    setItineraryEvents([]);
    setSelectedEventId(null);
    setSeatingEvent(null);
    setTables([]);
    setAssignments([]);
    setAllGuests([]);
    setCounters(null);
    setLoadingSeating(false);
    setInvalidCount(0);
    setVersions([]);
  }, []);

  const loadSeatingData = useCallback(async () => {
    if (!siteId || !selectedEventId) return;
    const requestId = ++seatingLoadRequestIdRef.current;
    const isCurrentRequest = () => requestId === seatingLoadRequestIdRef.current;
    setLoadingSeating(true);
    try {
      if (isDemoMode) {
        const se: SeatingEvent = {
          id: DEMO_SEATING_EVENT_ID,
          wedding_site_id: siteId,
          itinerary_event_id: selectedEventId,
          default_table_capacity: 8,
          notes: '',
          created_at: new Date().toISOString(),
        };
        if (!isCurrentRequest()) return;
        setSeatingEvent(se);

        const guestsData: EligibleGuest[] = demoGuests.map((g, idx) => {
          const fullName = g.name || [g.first_name, g.last_name].filter(Boolean).join(' ') || `Guest ${idx + 1}`;
          return {
            id: g.id,
            full_name: fullName,
            email: g.email ?? null,
            rsvp_status: g.rsvp_status,
            household_id: null,
            group_name: null,
            is_attending: isAttendingRsvpStatus(g.rsvp_status),
            is_invited_to_event: true,
          };
        });

        const saved = readDemoSeatingState(selectedEventId);
        setTables(saved.tables);
        setAssignments(saved.assignments);
        setAllGuests(guestsData);
        setCounters(deriveEventCountersFromGuests(guestsData, saved.assignments));
        setInvalidCount(0);
        return;
      }

      const se = await getOrCreateSeatingEvent(siteId, selectedEventId);
      if (!isCurrentRequest()) return;
      setSeatingEvent(se);
      const [tablesData, assignmentsData, guestsData] = await Promise.all([
        loadTables(se.id),
        loadAssignments(se.id),
        getEligibleGuests(siteId, selectedEventId),
      ]);
      if (!isCurrentRequest()) return;
      setTables(tablesData);
      setAssignments(assignmentsData);
      setAllGuests(guestsData);
      const eventCounters = await getEventCounters(siteId, selectedEventId, se.id);
      if (!isCurrentRequest()) return;
      setCounters(eventCounters);
      setInvalidCount(assignmentsData.filter((assignment) => !assignment.is_valid).length);
      try {
        const seatingVersions = await loadSeatingVersions(se.id);
        if (isCurrentRequest()) setVersions(seatingVersions);
      } catch {
        if (isCurrentRequest()) setVersions([]);
      }
    } catch {
      if (isCurrentRequest()) {
        toast('Couldn’t load seating data right now. Please try again.', 'error');
      }
    } finally {
      if (isCurrentRequest()) {
        setLoadingSeating(false);
      }
    }
  }, [isDemoMode, selectedEventId, siteId, toast]);

  useEffect(() => {
    const requestId = ++initialLoadRequestIdRef.current;
    const isCurrentRequest = () => requestId === initialLoadRequestIdRef.current;
    void (async () => {
      setLoading(true);
      try {
        if (isDemoMode) {
          if (!isCurrentRequest()) return;
          setSiteId(demoWeddingSite.id);
          const usableEvents = loadDemoItineraryEventsFromStorage();
          setItineraryEvents(usableEvents);
          setSelectedEventId(resolveOperationalEventId({ events: usableEvents }));
          return;
        }

        const id = await getWeddingSiteId();
        if (!isCurrentRequest()) return;
        if (!id) {
          resetSeatingDashboardState();
          return;
        }
        setSiteId(id);
        const events = await loadItineraryEvents(id);
        if (!isCurrentRequest()) return;
        setItineraryEvents(events);
        setSelectedEventId(resolveOperationalEventId({ events }));
      } catch {
        if (!isCurrentRequest()) return;
        resetSeatingDashboardState();
        toast('Couldn’t load events right now. Please try again.', 'error');
      } finally {
        if (isCurrentRequest()) {
          setLoading(false);
        }
      }
    })();
  }, [isDemoMode, resetSeatingDashboardState, toast]);

  useEffect(() => {
    if (!isDemoMode) return;

    const syncDemoItinerary = () => {
      const events = loadDemoItineraryEventsFromStorage();
      setItineraryEvents(events);
      setSelectedEventId((prev) => (prev && events.some((event) => event.id === prev) ? prev : events[0]?.id ?? null));
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === DEMO_ITINERARY_STORAGE_KEY) syncDemoItinerary();
    };

    const onFocus = () => syncDemoItinerary();

    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [isDemoMode]);

  useEffect(() => {
    if (!itineraryEvents.length) return;
    if (!selectedEventId || !itineraryEvents.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(resolveOperationalEventId({ events: itineraryEvents }));
    }
  }, [itineraryEvents, selectedEventId]);

  useEffect(() => {
    if (siteId && selectedEventId) {
      void loadSeatingData();
    }
  }, [loadSeatingData, selectedEventId, siteId]);

  useEffect(() => {
    if (!isDemoMode || !selectedEventId) return;
    writeDemoSeatingState(selectedEventId, tables, assignments);
  }, [isDemoMode, assignments, selectedEventId, tables]);

  useEffect(() => {
    if (!selectedEventId) {
      setVersions([]);
      return;
    }
    if (isDemoMode) {
      setVersions(readSeatingVersions().filter((version) => version.itinerary_event_id === selectedEventId));
    }
  }, [isDemoMode, selectedEventId]);

  return {
    allGuests,
    assignments,
    counters,
    invalidCount,
    itineraryEvents,
    loading,
    loadingSeating,
    loadSeatingData,
    seatingEvent,
    selectedEventId,
    setAllGuests,
    setAssignments,
    setCounters,
    setInvalidCount,
    setItineraryEvents,
    setLoading,
    setLoadingSeating,
    setSeatingEvent,
    setSelectedEventId,
    setSiteId,
    setTables,
    setVersions,
    siteId,
    tables,
    versions,
  };
}
