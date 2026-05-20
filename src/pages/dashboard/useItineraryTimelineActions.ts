import { useRef } from 'react';
import { customerSafeErrorMessage } from '../../lib/customerSafeError';
import { toValidItineraryEventDateOrNull } from './itineraryEventDate';
import {
  createItineraryTemplateEvents,
  deleteItineraryEvent,
  persistItineraryTimeline,
  resolveItinerarySiteId,
  saveItineraryEvent,
  type ItineraryDashboardEvent,
} from './itineraryService';

type EventWithInvites = ItineraryDashboardEvent;
type ItineraryEvent = Omit<ItineraryDashboardEvent, 'invitation_count' | 'rsvp_count' | 'attending_count' | 'declined_count' | 'pending_count'>;

interface ItineraryFormData {
  event_name: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location_name: string;
  location_address: string;
  dress_code: string;
  notes: string;
  is_visible: boolean;
}

interface UseItineraryTimelineActionsInput {
  autoCreateAlbum: boolean;
  editingEvent: ItineraryEvent | null;
  events: EventWithInvites[];
  formData: ItineraryFormData;
  isDemoMode: boolean;
  lastTimelineSnapshot: EventWithInvites[] | null;
  loadEvents: () => Promise<void>;
  requestConfirmation: (options: {
    title: string;
    description: string;
    confirmLabel: string;
    tone: 'primary' | 'danger';
  }) => Promise<boolean>;
  setEvents: React.Dispatch<React.SetStateAction<EventWithInvites[]>>;
  setIsSavingEvent: React.Dispatch<React.SetStateAction<boolean>>;
  setLastTimelineSnapshot: React.Dispatch<React.SetStateAction<EventWithInvites[] | null>>;
  setSaveError: React.Dispatch<React.SetStateAction<string | null>>;
  setSaveNotice: React.Dispatch<React.SetStateAction<string | null>>;
  setShowEventForm: React.Dispatch<React.SetStateAction<boolean>>;
  setTimelineBusy: React.Dispatch<React.SetStateAction<string | null>>;
  shiftFromEventId: string;
  shiftMinutes: number;
  templateDate: string;
  templateStart: string;
  toast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

function timeToMinutes(timeString: string | null): number | null {
  if (!timeString) return null;
  const [h, m] = timeString.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addMinutes(time: string | null, delta: number) {
  const base = timeToMinutes(time);
  if (base === null) return time;
  return minutesToTime(base + delta);
}

export function useItineraryTimelineActions({
  autoCreateAlbum,
  editingEvent,
  events,
  formData,
  isDemoMode,
  lastTimelineSnapshot,
  loadEvents,
  requestConfirmation,
  setEvents,
  setIsSavingEvent,
  setLastTimelineSnapshot,
  setSaveError,
  setSaveNotice,
  setShowEventForm,
  setTimelineBusy,
  shiftFromEventId,
  shiftMinutes,
  templateDate,
  templateStart,
  toast,
}: UseItineraryTimelineActionsInput) {
  const saveEventRequestIdRef = useRef(0);
  const deleteEventRequestIdRef = useRef(0);
  const timelineUpdateRequestIdRef = useRef(0);
  const smartTemplateRequestIdRef = useRef(0);

  async function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();
    const requestId = ++saveEventRequestIdRef.current;
    const isCurrentSaveEvent = () => requestId === saveEventRequestIdRef.current;

    setSaveError(null);
    setSaveNotice(null);

    if (!formData.event_name.trim()) {
      setSaveError('Event name is required.');
      return;
    }

    if (formData.event_date) {
      const selectedDate = toValidItineraryEventDateOrNull(formData.event_date);
      if (!selectedDate) {
        setSaveError('Event date is invalid.');
        return;
      }
    }

    if (formData.start_time && formData.end_time) {
      const startMinutes = timeToMinutes(formData.start_time);
      const endMinutes = timeToMinutes(formData.end_time);
      if (startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
        setSaveError('End time must be after start time.');
        return;
      }
    }

    try {
      setIsSavingEvent(true);
      if (isDemoMode) {
        if (editingEvent) {
          setEvents((prev) => prev.map((event) => event.id === editingEvent.id ? { ...event, ...formData, end_time: formData.end_time || null, dress_code: formData.dress_code || null, notes: formData.notes || null } : event));
        } else {
          setEvents((prev) => ([...prev, {
            id: `demo-event-${Date.now()}`,
            ...formData,
            end_time: formData.end_time || null,
            dress_code: formData.dress_code || null,
            notes: formData.notes || null,
            display_order: prev.length + 1,
            invitation_count: 60,
            rsvp_count: 0,
            attending_count: 0,
            declined_count: 0,
            pending_count: 60,
          }] as EventWithInvites[]));
        }
        if (!isCurrentSaveEvent()) return;
        setShowEventForm(false);
        setSaveNotice(editingEvent ? 'Event updated.' : 'Event created.');
        return;
      }

      await saveItineraryEvent({
        editingEventId: editingEvent?.id ?? null,
        autoCreateAlbum,
        formData,
      });
      if (!isCurrentSaveEvent()) return;

      setShowEventForm(false);
      setSaveNotice(editingEvent ? 'Event updated.' : 'Event created.');
      await loadEvents();
      if (!isCurrentSaveEvent()) return;
    } catch (err: unknown) {
      if (!isCurrentSaveEvent()) return;
      setSaveError(customerSafeErrorMessage(err, 'Couldn’t save event. Please try again.'));
    } finally {
      if (isCurrentSaveEvent()) {
        setIsSavingEvent(false);
      }
    }
  }

  async function handleDeleteEvent(eventId: string) {
    const requestId = ++deleteEventRequestIdRef.current;
    const isCurrentDeleteEvent = () => requestId === deleteEventRequestIdRef.current;
    const confirmed = await requestConfirmation({
      title: 'Delete this itinerary event?',
      description: 'This removes the event from your timeline and guest-facing schedule.',
      confirmLabel: 'Delete event',
      tone: 'danger',
    });
    if (!isCurrentDeleteEvent()) return;
    if (!confirmed) return;

    try {
      if (isDemoMode) {
        if (!isCurrentDeleteEvent()) return;
        setEvents((prev) => prev.filter((event) => event.id !== eventId));
        return;
      }
      await deleteItineraryEvent(eventId);
      if (!isCurrentDeleteEvent()) return;
      await loadEvents();
      if (!isCurrentDeleteEvent()) return;
    } catch {
      if (!isCurrentDeleteEvent()) return;
      toast('Couldn’t delete event. Please try again.', 'error');
    }
  }

  async function updateEventsInPlace(nextEvents: EventWithInvites[], notice: string) {
    const requestId = ++timelineUpdateRequestIdRef.current;
    const isCurrentTimelineUpdate = () => requestId === timelineUpdateRequestIdRef.current;
    setTimelineBusy(notice);
    setSaveError(null);
    try {
      if (isDemoMode) {
        if (!isCurrentTimelineUpdate()) return;
        setEvents(nextEvents);
        setSaveNotice(notice);
        return;
      }

      await persistItineraryTimeline(nextEvents);
      if (!isCurrentTimelineUpdate()) return;
      setEvents(nextEvents);
      setSaveNotice(notice);
    } catch (err: unknown) {
      if (!isCurrentTimelineUpdate()) return;
      setSaveError(customerSafeErrorMessage(err, 'Couldn’t update the timeline.'));
    } finally {
      if (isCurrentTimelineUpdate()) {
        setTimelineBusy(null);
      }
    }
  }

  async function handleShiftTimeline(delta: number) {
    const sorted = [...events].sort((a, b) => `${a.event_date}T${a.start_time}`.localeCompare(`${b.event_date}T${b.start_time}`));
    const fromIndex = shiftFromEventId === 'all' ? 0 : sorted.findIndex((event) => event.id === shiftFromEventId);
    if (fromIndex < 0) return;
    const shiftedIds = new Set(sorted.slice(fromIndex).map((event) => event.id));
    const nextEvents = events.map((event) => shiftedIds.has(event.id)
      ? { ...event, start_time: addMinutes(event.start_time, delta) || '', end_time: addMinutes(event.end_time, delta) }
      : event,
    );
    setLastTimelineSnapshot(events);
    await updateEventsInPlace(nextEvents, `Shifted timeline by ${delta} minutes.`);
  }

  async function handleUndoTimelineShift() {
    if (!lastTimelineSnapshot) return;
    const snapshot = lastTimelineSnapshot;
    setLastTimelineSnapshot(null);
    await updateEventsInPlace(snapshot, 'Restored the previous timeline.');
  }

  async function handleCreateSmartTemplate() {
    const requestId = ++smartTemplateRequestIdRef.current;
    const isCurrentSmartTemplate = () => requestId === smartTemplateRequestIdRef.current;
    const base = timeToMinutes(templateStart) ?? 660;
    const existing = new Set(events.map((event) => `${event.event_date}:${event.event_name.toLowerCase()}`));
    const template = [
      ['Getting Ready', 0, 120, 'Hair, makeup, detail photos, and quiet buffer.'],
      ['First Look & Portraits', 135, 75, 'Couple portraits, wedding party, and immediate family.'],
      ['Ceremony', 240, 30, 'Guests seated 15 minutes before start.'],
      ['Cocktail Hour', 280, 60, 'Bar opens, passed bites, family photo overflow.'],
      ['Reception Entrance', 350, 15, 'Wedding party entrance and welcome.'],
      ['Dinner', 370, 75, 'Dinner service and speeches.'],
      ['First Dance', 455, 15, 'Transition into dance floor.'],
      ['Open Dancing', 475, 180, 'DJ timeline, late-night bites, final sendoff.'],
    ];
    const newEvents = template
      .filter(([name]) => !existing.has(`${templateDate}:${String(name).toLowerCase()}`))
      .map(([name, offset, duration, description], index) => ({
        id: `template-${Date.now()}-${index}`,
        event_name: String(name),
        description: String(description),
        event_date: templateDate,
        start_time: minutesToTime(base + Number(offset)),
        end_time: minutesToTime(base + Number(offset) + Number(duration)),
        location_name: '',
        location_address: '',
        dress_code: null,
        notes: null,
        display_order: events.length + index + 1,
        is_visible: true,
        invitation_count: 0,
        rsvp_count: 0,
        attending_count: 0,
        declined_count: 0,
        pending_count: 0,
      }));

    if (newEvents.length === 0) {
      setSaveNotice('Template events are already present for that date.');
      return;
    }

    setTimelineBusy('Building template…');
    setSaveError(null);
    try {
      if (isDemoMode) {
        if (!isCurrentSmartTemplate()) return;
        setEvents((prev) => [...prev, ...newEvents]);
        setSaveNotice(`Added ${newEvents.length} template events.`);
        return;
      }
      const siteId = await resolveItinerarySiteId();
      if (!isCurrentSmartTemplate()) return;
      if (!siteId) throw new Error('Please log in again and retry.');
      await createItineraryTemplateEvents(siteId, newEvents);
      if (!isCurrentSmartTemplate()) return;
      await loadEvents();
      if (!isCurrentSmartTemplate()) return;
      setSaveNotice(`Added ${newEvents.length} template events.`);
    } catch (err: unknown) {
      if (!isCurrentSmartTemplate()) return;
      setSaveError(customerSafeErrorMessage(err, 'Couldn’t build the template.'));
    } finally {
      if (isCurrentSmartTemplate()) {
        setTimelineBusy(null);
      }
    }
  }

  return {
    handleCreateSmartTemplate,
    handleDeleteEvent,
    handleSaveEvent,
    handleShiftTimeline,
    handleUndoTimelineShift,
  };
}
