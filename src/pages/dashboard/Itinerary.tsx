import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, MapPin, Users, Edit2, Trash2, UserPlus, ExternalLink, AlertTriangle, Check, X, HelpCircle, Camera, Wand2, MoveRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { DashboardPageHero } from '../../components/dashboard/DashboardPageHero';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { ConfirmDialog, type ConfirmDialogProps } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import { demoEvents } from '../../lib/demoData';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { formatItineraryEventDate, toValidItineraryEventDateOrNull } from './itineraryEventDate';
import { deriveItineraryEventRsvpCounts, shouldLoadEventRsvps } from './itineraryEventRsvpCounts';
import { readDemoItineraryEvents, writeDemoItineraryEvents } from './itineraryDemoStorage';
import { analyzeTimeline } from '../../lib/invisibleIntelligence';
import { customerSafeErrorMessage } from '../../lib/customerSafeError';
import {
  addItineraryEventGuestInvitation,
  createItineraryTemplateEvents,
  deleteItineraryEvent,
  inviteAllGuestsToItineraryEvent,
  loadItineraryEventGuestManagerSnapshot,
  removeAllGuestsFromItineraryEvent,
  removeItineraryEventGuestInvitation,
  resolveItinerarySiteId,
  saveItineraryEvent,
  syncItineraryScheduleMirror,
  type ItineraryGuestPickerRow,
} from './itineraryService';

interface ItineraryEvent {
  id: string;
  event_name: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string | null;
  location_name: string;
  location_address: string;
  dress_code: string | null;
  notes: string | null;
  display_order: number;
  is_visible: boolean;
}

const ITINERARY_EVENT_SELECT = 'id, event_name, title, description, event_date, start_time, end_time, location_name, location_address, dress_code, notes, display_order, sort_order, is_visible' as const;

export const MAX_ITINERARY_EVENTS = 200;
export const MAX_ITINERARY_EVENT_INVITATIONS = 10000;
export const MAX_ITINERARY_EVENT_GUESTS = 5000;

// Optional table: detect once at runtime so older environments degrade quietly.
let hasEventRsvpsTable: boolean | null = null;

interface EventWithInvites extends ItineraryEvent {
  invitation_count: number;
  rsvp_count: number;
  attending_count: number;
  declined_count: number;
  pending_count: number;
}

export const DashboardItinerary: React.FC = () => {
  const { isDemoMode } = useAuth();
  const { toast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<null | Omit<ConfirmDialogProps, 'open'>>(null);
  const requestConfirmation = (options: Pick<ConfirmDialogProps, 'title' | 'description' | 'confirmLabel' | 'tone'>) =>
    new Promise<boolean>((resolve) => {
      setConfirmDialog({
        ...options,
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        },
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
      });
    });
  const [events, setEvents] = useState<EventWithInvites[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ItineraryEvent | null>(null);
  const [autoCreateAlbum, setAutoCreateAlbum] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [templateDate, setTemplateDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [templateStart, setTemplateStart] = useState('11:00');
  const [shiftMinutes, setShiftMinutes] = useState(15);
  const [shiftFromEventId, setShiftFromEventId] = useState<string>('all');
  const [timelineBusy, setTimelineBusy] = useState<string | null>(null);
  const [lastTimelineSnapshot, setLastTimelineSnapshot] = useState<EventWithInvites[] | null>(null);

  const [formData, setFormData] = useState({
    event_name: '',
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
    location_name: '',
    location_address: '',
    dress_code: '',
    notes: '',
    is_visible: true,
  });

  useEffect(() => {
    loadEvents();
  }, [isDemoMode]);

  useEffect(() => {
    if (!isDemoMode) return;
    try {
      writeDemoItineraryEvents(events);
    } catch {}
  }, [isDemoMode, events]);

  async function syncWeddingDataSchedule(siteId: string, eventList: ItineraryEvent[]) {
    try {
      await syncItineraryScheduleMirror(siteId, eventList);
    } catch {
      // non-blocking mirror write; itinerary CRUD still succeeds
    }
  }

  async function loadEvents() {
    try {
      if (isDemoMode) {
        const seeded = demoEvents.map((event, idx) => ({
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

        const storedEvents = readDemoItineraryEvents(seeded as EventWithInvites[]);
        if (storedEvents.length > 0) {
          setEvents(storedEvents.map((event) => ({
            ...event,
            pending_count: typeof event.pending_count === 'number'
              ? event.pending_count
              : Math.max(0, event.invitation_count - event.attending_count - event.declined_count),
          })));
          return;
        }

        setEvents(seeded as EventWithInvites[]);
        return;
      }

      const siteId = await resolveItinerarySiteId();
      if (!siteId) {
        setEvents([]);
        return;
      }

      const { data: sites, error: siteError } = await supabase
        .from('wedding_sites')
        .select('id')
        .eq('id', siteId)
        .maybeSingle();
      if (siteError) throw siteError;

      if (!sites) {
        setEvents([]);
        return;
      }

      const { data: eventsData, error } = await supabase
        .from('itinerary_events')
        .select(ITINERARY_EVENT_SELECT)
        .eq('wedding_site_id', sites.id)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(MAX_ITINERARY_EVENTS);

      if (error) throw error;

      const normalizedEvents: ItineraryEvent[] = (eventsData || []).map((event: Record<string, unknown>) => ({
        id: String(event.id ?? ''),
        event_name: (event.event_name as string) || (event.title as string) || 'Event',
        description: (event.description as string) || '',
        event_date: (event.event_date as string) || new Date().toISOString().slice(0, 10),
        start_time: (event.start_time as string) || '',
        end_time: (event.end_time as string | null) ?? null,
        location_name: (event.location_name as string) || '',
        location_address: (event.location_address as string) || '',
        dress_code: (event.dress_code as string | null) ?? null,
        notes: (event.notes as string | null) ?? null,
        display_order: (event.display_order as number) ?? (event.sort_order as number) ?? 0,
        is_visible: (event.is_visible as boolean) ?? true,
      }));

      await syncWeddingDataSchedule(sites.id, normalizedEvents);

      const eventsWithCounts = await Promise.all(
        normalizedEvents.map(async (event) => {
          const { data: invites, error: invitesError } = await supabase
            .from('event_invitations')
            .select('id')
            .eq('event_id', event.id)
            .limit(MAX_ITINERARY_EVENT_INVITATIONS);
          if (invitesError) throw invitesError;

          const invitationIds = (invites ?? []).map((i) => i.id as string);
          const inviteCount = invitationIds.length;

          let rsvps: Array<{ attending: boolean | null }> = [];
          if (shouldLoadEventRsvps(invitationIds.length, hasEventRsvpsTable)) {
            const { data, error } = await supabase
              .from('event_rsvps')
              .select('attending')
              .in('event_invitation_id', invitationIds);

            if (error) {
              const msg = (error.message || '').toLowerCase();
              if (msg.includes('event_rsvps') || msg.includes('does not exist') || msg.includes('404') || msg.includes('relation')) {
                hasEventRsvpsTable = false;
              }
            } else {
              hasEventRsvpsTable = true;
              rsvps = (data ?? []) as Array<{ attending: boolean | null }>;
            }
          }

          const { rsvpCount, attendingCount, declinedCount, pendingCount } = deriveItineraryEventRsvpCounts(rsvps, inviteCount);

          return {
            ...event,
            invitation_count: inviteCount,
            rsvp_count: rsvpCount,
            attending_count: attendingCount,
            declined_count: declinedCount,
            pending_count: pendingCount,
          };
        })
      );

      setEvents(eventsWithCounts);
    } catch {
      setEvents([]);
      toast('Couldn’t load itinerary events. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function openEventForm(event?: ItineraryEvent) {
    if (event) {
      setEditingEvent(event);
      setAutoCreateAlbum(false);
      setFormData({
        event_name: event.event_name,
        description: event.description || '',
        event_date: event.event_date,
        start_time: event.start_time || '',
        end_time: event.end_time || '',
        location_name: event.location_name || '',
        location_address: event.location_address || '',
        dress_code: event.dress_code || '',
        notes: event.notes || '',
        is_visible: event.is_visible,
      });
    } else {
      setEditingEvent(null);
      setAutoCreateAlbum(true);
      setFormData({
        event_name: '',
        description: '',
        event_date: '',
        start_time: '',
        end_time: '',
        location_name: '',
        location_address: '',
        dress_code: '',
        notes: '',
        is_visible: true,
      });
    }
    setSaveError(null);
    setSaveNotice(null);
    setShowEventForm(true);
  }

  async function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();

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
      const toMinutes = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + (m || 0);
      };
      if (toMinutes(formData.end_time) <= toMinutes(formData.start_time)) {
        setSaveError('End time must be after start time.');
        return;
      }
    }

    try {
      setIsSavingEvent(true);
      if (isDemoMode) {
        if (editingEvent) {
          setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...formData, end_time: formData.end_time || null, dress_code: formData.dress_code || null, notes: formData.notes || null } : e));
        } else {
          setEvents(prev => ([...prev, {
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
        setShowEventForm(false);
        setSaveNotice(editingEvent ? 'Event updated.' : 'Event created.');
        return;
      }

      await saveItineraryEvent({
        editingEventId: editingEvent?.id ?? null,
        autoCreateAlbum,
        formData,
      });

      setShowEventForm(false);
      setSaveNotice(editingEvent ? 'Event updated.' : 'Event created.');
      loadEvents();
    } catch (err: unknown) {
      setSaveError(customerSafeErrorMessage(err, 'Couldn’t save event. Please try again.'));
    } finally {
      setIsSavingEvent(false);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    const confirmed = await requestConfirmation({
      title: 'Delete this itinerary event?',
      description: 'This removes the event from your timeline and guest-facing schedule.',
      confirmLabel: 'Delete event',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      if (isDemoMode) {
        setEvents(prev => prev.filter(e => e.id !== eventId));
        return;
      }
      await deleteItineraryEvent(eventId);

      loadEvents();
    } catch {
      toast('Couldn’t delete event. Please try again.', 'error');
    }
  }

  function timeToMinutes(timeString: string | null): number | null {
    if (!timeString) return null;
    const [h, m] = timeString.split(':').map(Number);
    return h * 60 + (m || 0);
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

  function durationFromEvent(event: Pick<ItineraryEvent, 'start_time' | 'end_time'>) {
    const start = timeToMinutes(event.start_time);
    const end = timeToMinutes(event.end_time);
    if (start === null || end === null || end <= start) return null;
    return end - start;
  }

  async function updateEventsInPlace(nextEvents: EventWithInvites[], notice: string) {
    setTimelineBusy(notice);
    setSaveError(null);
    try {
      if (isDemoMode) {
        setEvents(nextEvents);
        setSaveNotice(notice);
        return;
      }

      const siteId = await resolveItinerarySiteId();
      if (!siteId) throw new Error('Please log in again and retry.');

      const results = await Promise.all(nextEvents.map((event) => supabase
        .from('itinerary_events')
        .update({
          event_date: event.event_date,
          start_time: event.start_time || null,
          end_time: event.end_time || null,
          display_order: event.display_order,
        })
        .eq('id', event.id)
      ));
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;
      await syncWeddingDataSchedule(siteId, nextEvents);
      setEvents(nextEvents);
      setSaveNotice(notice);
    } catch (err: unknown) {
      setSaveError(customerSafeErrorMessage(err, 'Couldn’t update the timeline.'));
    } finally {
      setTimelineBusy(null);
    }
  }

  async function handleShiftTimeline(delta: number) {
    const sorted = [...events].sort((a, b) => `${a.event_date}T${a.start_time}`.localeCompare(`${b.event_date}T${b.start_time}`));
    const fromIndex = shiftFromEventId === 'all' ? 0 : sorted.findIndex((event) => event.id === shiftFromEventId);
    if (fromIndex < 0) return;
    const shiftedIds = new Set(sorted.slice(fromIndex).map((event) => event.id));
    const nextEvents = events.map((event) => shiftedIds.has(event.id)
      ? { ...event, start_time: addMinutes(event.start_time, delta) || '', end_time: addMinutes(event.end_time, delta) }
      : event
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
        setEvents((prev) => [...prev, ...newEvents]);
        setSaveNotice(`Added ${newEvents.length} template events.`);
        return;
      }
      const siteId = await resolveItinerarySiteId();
      if (!siteId) throw new Error('Please log in again and retry.');
      await createItineraryTemplateEvents(siteId, newEvents);
      await loadEvents();
      setSaveNotice(`Added ${newEvents.length} template events.`);
    } catch (err: unknown) {
      setSaveError(customerSafeErrorMessage(err, 'Couldn’t build the template.'));
    } finally {
      setTimelineBusy(null);
    }
  }

  if (loading) {
    return (
      <DashboardLayout currentPage="itinerary">
        <div className="space-y-4 animate-pulse" aria-hidden="true">
          <div className="h-12 w-64 rounded-lg bg-surface-subtle border border-border-subtle" />
          <div className="h-24 rounded-lg bg-surface-subtle border border-border-subtle" />
          <div className="h-24 rounded-lg bg-surface-subtle border border-border-subtle" />
          <div className="h-24 rounded-lg bg-surface-subtle border border-border-subtle" />
        </div>
      </DashboardLayout>
    );
  }

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

  return (
    <DashboardLayout currentPage="itinerary">
      <div className="space-y-6">
      <DashboardPageHero
        eyebrow="Schedule"
        title="Shape the rhythm of the wedding weekend."
        description="Add the moments guests need, keep private notes close, and adjust timing without losing the flow of the day."
        stats={[
          { label: 'Events', value: events.length, detail: `${events.filter((event) => event.is_visible !== false).length} visible to guests` },
          { label: 'Timing notes', value: timelineInsights.length, detail: timelineInsights.length > 0 ? 'worth checking' : 'no timing issues found' },
          { label: 'Shift preview', value: shiftPreviewCount, detail: 'events can move together' },
        ]}
        actions={
          <Button onClick={() => openEventForm()}>
            <Plus className="w-5 h-5 mr-2" />
            Add to schedule
          </Button>
        }
      />

      {showEventForm && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            {editingEvent ? 'Edit itinerary event' : 'Add itinerary event'}
          </h2>
          <form noValidate onSubmit={handleSaveEvent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Event name *
                </label>
                <Input
                  value={formData.event_name}
                  onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                  placeholder="e.g., Welcome Dinner, Rehearsal Dinner"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Date
                </label>
                <Input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Start time
                </label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  End Time
                </label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Location name
                </label>
                <Input
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                  placeholder="Venue or place name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Dress Code
                </label>
                <Input
                  value={formData.dress_code}
                  onChange={(e) => setFormData({ ...formData, dress_code: e.target.value })}
                  placeholder="e.g., Cocktail Attire"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Location Address
              </label>
              <Input
                value={formData.location_address}
                onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                placeholder="Full address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Event details and description"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Notes for guests
              </label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Anything guests should know before they arrive"
                rows={2}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_visible"
                checked={formData.is_visible}
                onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
              />
              <label htmlFor="is_visible" className="ml-2 block text-sm text-neutral-700">
                Show this on your public site
              </label>
            </div>

            {!editingEvent && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_create_album"
                  checked={autoCreateAlbum}
                  onChange={(e) => setAutoCreateAlbum(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                />
                <label htmlFor="auto_create_album" className="ml-2 block text-sm text-neutral-700">
                  Create a photo album for this event
                </label>
              </div>
            )}

            {saveError && (
              <div className="rounded-lg border border-error/25 bg-error/5 px-3 py-2 text-sm text-text-primary">
                {saveError}
              </div>
            )}

            {saveNotice && (
              <div className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-sm text-text-primary">
                {saveNotice}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSavingEvent}>
                {isSavingEvent ? 'Saving…' : (editingEvent ? 'Save changes' : 'Add event')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEventForm(false);
                  setEditingEvent(null);
                  setSaveError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-5 border border-border bg-surface">
        <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-neutral-900">Smart wedding-day template</h2>
            </div>
            <p className="mt-1 text-sm text-neutral-600">Generate a working day-of timeline, then edit each item into the final producer schedule.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Input type="date" value={templateDate} onChange={(e) => setTemplateDate(e.target.value)} />
              <Input type="time" value={templateStart} onChange={(e) => setTemplateStart(e.target.value)} />
              <Button type="button" onClick={() => void handleCreateSmartTemplate()} disabled={timelineBusy !== null}>
                {timelineBusy === 'Building template…' ? 'Building…' : 'Build template'}
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 p-4">
            <div className="flex items-center gap-2">
              <MoveRight className="h-5 w-5 text-neutral-800" />
              <h3 className="text-sm font-semibold text-neutral-900">Bulk time shift</h3>
            </div>
            <p className="mt-1 text-xs leading-5 text-neutral-600">When ceremony or photos move, shift the rest of the day without rebuilding cards.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_110px_auto_auto]">
              <select className="rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm" value={shiftFromEventId} onChange={(e) => setShiftFromEventId(e.target.value)}>
                <option value="all">All events</option>
                {sortedShiftEvents.map((event) => (
                  <option key={event.id} value={event.id}>From {event.event_name}</option>
                ))}
              </select>
              <Input type="number" min="1" max="240" value={shiftMinutes} onChange={(e) => setShiftMinutes(Number(e.target.value) || 1)} />
              <Button type="button" variant="outline" onClick={() => void handleShiftTimeline(-Math.abs(shiftMinutes))} disabled={timelineBusy !== null}>Earlier</Button>
              <Button type="button" variant="outline" onClick={() => void handleShiftTimeline(Math.abs(shiftMinutes))} disabled={timelineBusy !== null}>Later</Button>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-neutral-600">
                Preview: move {shiftPreviewLabel} by {Math.abs(shiftMinutes || 1)} minute{Math.abs(shiftMinutes || 1) === 1 ? '' : 's'}.
              </p>
              {lastTimelineSnapshot && (
                <Button type="button" size="sm" variant="outline" onClick={() => void handleUndoTimelineShift()} disabled={timelineBusy !== null}>
                  Undo last shift
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {timelineInsights.length > 0 && (
        <Card className="p-5 border border-border bg-white">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-neutral-900">Timeline quick check</h2>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {timelineInsights.map((insight, index) => (
              <div key={`${insight.eventId}-${insight.kind}-${index}`} className="rounded-lg border border-border-subtle bg-surface-subtle/40 px-3 py-3">
                <p className="text-sm font-semibold text-neutral-900">{insight.title}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-600">{insight.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {events.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No itinerary events yet</h3>
          <p className="text-neutral-600 mb-6">
            Add your ceremony, reception, and anything else guests should plan around.
          </p>
          <Button onClick={() => openEventForm()}>
            <Plus className="w-5 h-5 mr-2" />
            Add Your First Event
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {(() => {
            const conflictIds = findConflicts(events);
            return events.map((event) => {
              const pending = event.pending_count;
              return (
              <Card key={event.id} className={`p-6 border border-border-subtle bg-white transition-colors hover:border-primary/25 ${conflictIds.has(event.id) ? 'ring-1 ring-border-subtle' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h3 className="text-xl font-semibold text-neutral-900">
                        {event.event_name}
                      </h3>
                      {!event.is_visible && (
                        <span className="px-2 py-1 text-xs font-medium bg-neutral-100 text-neutral-600 rounded">
                          Hidden
                        </span>
                      )}
                      {conflictIds.has(event.id) && (
                        <span className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-subtle px-2 py-1 text-xs font-medium text-text-primary">
                          <AlertTriangle className="w-3 h-3" />
                          Time overlap with another event
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-neutral-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{formatItineraryEventDate(event.event_date)}</span>
                      </div>

                      {event.start_time && (
                        <div className="flex items-center text-neutral-600">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>
                            {formatTime(event.start_time)}
                            {event.end_time && ` - ${formatTime(event.end_time)}`}
                          </span>
                        </div>
                      )}

                      {(event.location_name || event.location_address) && (
                        <div className="flex items-center gap-2 text-neutral-600">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <div className="flex-1">
                            {event.location_name && <div>{event.location_name}</div>}
                            {event.location_address && (
                              <div className="text-sm text-neutral-500">{event.location_address}</div>
                            )}
                          </div>
                          <a
                            href={getMapUrl(event.location_name || '', event.location_address || '')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg transition-colors"
                          >
                            <MapPin className="w-3 h-3" />
                            Map
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}

                      {event.description && (
                        <p className="text-neutral-600 mt-3">{event.description}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-stretch gap-2 pt-3 border-t border-border-subtle">
                      <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-subtle/40 px-2.5 py-1.5 text-sm">
                        <Users className="w-4 h-4 text-neutral-500" />
                        <span className="font-semibold text-neutral-900">{event.invitation_count}</span>
                        <span className="text-neutral-500">invited</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-subtle/30 px-2.5 py-1.5 text-sm">
                        <Check className="w-4 h-4 text-text-tertiary" />
                        <span className="font-semibold text-text-primary">{event.attending_count}</span>
                        <span className="text-text-secondary">yes</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-subtle/30 px-2.5 py-1.5 text-sm">
                        <X className="w-4 h-4 text-text-tertiary" />
                        <span className="font-semibold text-text-primary">{event.declined_count}</span>
                        <span className="text-text-secondary">no</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-subtle/30 px-2.5 py-1.5 text-sm">
                        <HelpCircle className="w-4 h-4 text-text-tertiary" />
                        <span className="font-semibold text-text-primary">{pending}</span>
                        <span className="text-text-secondary">pending</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-2 sm:ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedEventId(event.id)}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Manage Guests
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const params = new URLSearchParams({ eventId: event.id, eventName: event.event_name });
                        window.location.href = `/dashboard/photos?${params.toString()}`;
                      }}
                    >
                      <Camera className="w-4 h-4 mr-1" />
                      Album
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEventForm(event)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
            });
          })()}
        </div>
      )}

      {selectedEventId && (
        <EventGuestManager
          eventId={selectedEventId}
          onClose={() => setSelectedEventId(null)}
          onUpdate={loadEvents}
        />
      )}
    </div>
      {confirmDialog && (
        <ConfirmDialog
          open
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          tone={confirmDialog.tone}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </DashboardLayout>
  );
};

interface EventGuestManagerProps {
  eventId: string;
  onClose: () => void;
  onUpdate: () => void;
}

function EventGuestManager({ eventId, onClose, onUpdate }: EventGuestManagerProps) {
  const { toast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<null | Omit<ConfirmDialogProps, 'open'>>(null);
  const requestConfirmation = (options: Pick<ConfirmDialogProps, 'title' | 'description' | 'confirmLabel' | 'tone'>) =>
    new Promise<boolean>((resolve) => {
      setConfirmDialog({
        ...options,
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        },
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
      });
    });
  const [allGuests, setAllGuests] = useState<ItineraryGuestPickerRow[]>([]);
  const [invitedGuestIds, setInvitedGuestIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadGuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function loadGuests() {
    try {
      const snapshot = await loadItineraryEventGuestManagerSnapshot(eventId);
      setAllGuests(snapshot.guests);
      setInvitedGuestIds(snapshot.invitedGuestIds);
    } catch {
      setAllGuests([]);
      setInvitedGuestIds(new Set());
      toast('Couldn’t load this event’s guest list. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function toggleGuestInvitation(guestId: string) {
    try {
      if (invitedGuestIds.has(guestId)) {
        await removeItineraryEventGuestInvitation(eventId, guestId);

        setInvitedGuestIds((prev) => {
          const next = new Set(prev);
          next.delete(guestId);
          return next;
        });
      } else {
        await addItineraryEventGuestInvitation(eventId, guestId);

        setInvitedGuestIds((prev) => new Set(prev).add(guestId));
      }

      onUpdate();
    } catch {
      toast('Couldn’t update invitation. Please try again.', 'error');
    }
  }

  async function inviteAll() {
    setBulkLoading(true);
    try {
      const uninvited = allGuests.filter(g => !invitedGuestIds.has(g.id));
      if (uninvited.length === 0) return;

      await inviteAllGuestsToItineraryEvent(eventId, uninvited.map((guest) => guest.id));

      setInvitedGuestIds(new Set(allGuests.map(g => g.id)));
      onUpdate();
    } catch {
      toast('Couldn’t invite all guests. Please try again.', 'error');
    } finally {
      setBulkLoading(false);
    }
  }

  async function removeAll() {
    const confirmed = await requestConfirmation({
      title: 'Remove all guests from this event?',
      description: 'This removes every invitation for this itinerary event. If something does not finish, the guest responses are kept safe.',
      confirmLabel: 'Remove all',
      tone: 'danger',
    });
    if (!confirmed) return;
    setBulkLoading(true);
    try {
      await removeAllGuestsFromItineraryEvent(eventId);

      setInvitedGuestIds(new Set());
      onUpdate();
    } catch {
      toast('Couldn’t remove all guests. Please try again.', 'error');
    } finally {
      setBulkLoading(false);
    }
  }

  const filteredGuests = allGuests.filter(g => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (g.name || `${g.first_name || ''} ${g.last_name || ''}`).toLowerCase();
    return name.includes(q) || (g.email || '').toLowerCase().includes(q);
  });

  const invitedCount = invitedGuestIds.size;
  const totalCount = allGuests.length;

  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4">
      <Card className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden border border-border-subtle bg-white">
        <div className="border-b border-border-subtle p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-semibold text-neutral-900">Manage event guests</h2>
            <span className="text-sm text-neutral-500">{invitedCount} of {totalCount} invited</span>
          </div>
          <p className="text-sm text-neutral-600">
            Choose which guests should see and answer for this event.
          </p>
          <div className="flex items-center gap-2 mt-4">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search guests"
              className="flex-1 px-3 py-2 text-sm border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
            />
            <button
              onClick={inviteAll}
              disabled={bulkLoading || invitedCount === totalCount}
              className="px-3 py-2 text-sm font-medium bg-surface-subtle text-text-primary border border-border-subtle rounded-lg hover:bg-primary-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Invite all
            </button>
            <button
              onClick={removeAll}
              disabled={bulkLoading || invitedCount === 0}
              className="px-3 py-2 text-sm font-medium bg-neutral-50 text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Remove all
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : allGuests.length === 0 ? (
            <p className="text-center text-neutral-600 py-8">
              No guests found. Add guests first in the Guests page.
            </p>
          ) : filteredGuests.length === 0 ? (
            <p className="text-center text-neutral-500 py-8 text-sm">No guests match your search.</p>
          ) : (
            <div className="space-y-2">
              {filteredGuests.map((guest) => {
                const isInvited = invitedGuestIds.has(guest.id);
                return (
                  <div
                    key={guest.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                      isInvited
                        ? 'bg-surface-subtle border-border-subtle'
                        : 'border-border-subtle hover:bg-surface-subtle/50'
                    }`}
                    onClick={() => toggleGuestInvitation(guest.id)}
                  >
                    <div>
                      <p className="font-medium text-neutral-900">{guest.name || `${guest.first_name || ''} ${guest.last_name || ''}`.trim()}</p>
                      {guest.email && <p className="text-sm text-neutral-500">{guest.email}</p>}
                    </div>
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isInvited
                          ? 'bg-surface text-text-primary border border-border-subtle'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {isInvited ? (
                        <><Check className="w-3.5 h-3.5" /> Invited</>
                      ) : (
                        <>Invite</>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border-subtle">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </Card>
      {confirmDialog && (
        <ConfirmDialog
          open
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          tone={confirmDialog.tone}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </div>
  );
}
