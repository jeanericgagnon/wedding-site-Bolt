import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, Clock, MapPin, Users, Edit2, Trash2, UserPlus, ExternalLink, AlertTriangle, Check, X, HelpCircle, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { invokeFunctionOrThrow } from '../../lib/invokeFunctionOrThrow';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { demoEvents } from '../../lib/demoData';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { deleteEventRsvpByInvitationId, deleteEventRsvpsByInvitationIds, getEventRsvpSnapshotsByInvitationIds, restoreEventRsvpSnapshots } from '../../lib/eventRsvpCleanup';
import type { WeddingDataV1 } from '../../types/weddingData';
import { combineDateAndTimeISO } from './itineraryDateTime';
import { formatItineraryEventDate, toValidItineraryEventDateOrNull } from './itineraryEventDate';
import { buildItineraryReadiness } from './itineraryReadiness';
import { getFlowStatusLabel } from '../../lib/flowLabels';

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

const DEMO_ITINERARY_STORAGE_KEY = 'dayof.demo.itinerary.events';
// Optional table: many environments do not provision event_rsvps yet.
// Default false to avoid noisy 404 probing on every dashboard load.
let hasEventRsvpsTable: boolean | null = false;

interface EventWithInvites extends ItineraryEvent {
  invitation_count: number;
  rsvp_count: number;
  attending_count: number;
  declined_count: number;
}

function toScheduleSectionEvents(events: ItineraryEvent[]) {
  return [...events]
    .filter((event) => event.is_visible !== false)
    .sort((a, b) => {
      const left = `${a.event_date || ''}T${a.start_time || '00:00'}`;
      const right = `${b.event_date || ''}T${b.start_time || '00:00'}`;
      return left.localeCompare(right);
    })
    .map((event, index) => ({
      id: event.id || `itinerary-${index + 1}`,
      title: event.event_name || 'Event',
      time: [event.start_time, event.end_time].filter(Boolean).join(' - ') || 'Time TBD',
      description: event.description || event.notes || '',
      location: [event.location_name, event.location_address].filter(Boolean).join(' · ') || undefined,
    }));
}

function toWeddingSchedule(events: ItineraryEvent[]): WeddingDataV1['schedule'] {
  return [...events]
    .filter((event) => event.is_visible !== false)
    .sort((a, b) => {
      const left = `${a.event_date || ''}T${a.start_time || '00:00'}`;
      const right = `${b.event_date || ''}T${b.start_time || '00:00'}`;
      return left.localeCompare(right);
    })
    .map((event, index) => {
      const locationBits = [event.location_name, event.location_address].filter(Boolean).join(' · ');
      const descriptionBits = [event.description, event.notes].filter(Boolean).join(' · ');
      const notes = [locationBits, descriptionBits].filter(Boolean).join(' — ');

      return {
        id: event.id || `itinerary-${index + 1}`,
        label: event.event_name || 'Event',
        startTimeISO: combineDateAndTimeISO(event.event_date, event.start_time) || '',
        endTimeISO: combineDateAndTimeISO(event.event_date, event.end_time) || undefined,
        notes: notes || undefined,
      };
    })
    .filter((item) => !!item.startTimeISO && !!item.label);
}

export const DashboardItinerary: React.FC = () => {
  const { isDemoMode } = useAuth();
  const [events, setEvents] = useState<EventWithInvites[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ItineraryEvent | null>(null);
  const [autoCreateAlbum, setAutoCreateAlbum] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [isSavingEvent, setIsSavingEvent] = useState(false);

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
  const itineraryReadiness = buildItineraryReadiness(
    events.map((event) => ({
      id: event.id,
      event_name: event.event_name,
      event_date: event.event_date,
      start_time: event.start_time,
      location_name: event.location_name,
      notes: event.notes,
      is_visible: event.is_visible,
    })),
  );

  useEffect(() => {
    if (!isDemoMode) return;
    try {
      localStorage.setItem(DEMO_ITINERARY_STORAGE_KEY, JSON.stringify(events));
    } catch {
      // Demo itinerary persistence is a convenience layer; keep editing available if storage is blocked.
    }
  }, [isDemoMode, events]);

  const syncWeddingDataSchedule = useCallback(async (siteId: string, eventList: ItineraryEvent[]) => {
    try {
      const { data: siteData, error: readError } = await supabase
        .from('wedding_sites')
        .select('wedding_data')
        .eq('id', siteId)
        .maybeSingle();

      if (readError) throw readError;

      const weddingData = (siteData?.wedding_data as Record<string, unknown> | null) ?? {};
      const nextSchedule = toWeddingSchedule(eventList);
      const currentSchedule = Array.isArray((weddingData as { schedule?: unknown }).schedule)
        ? (weddingData as { schedule: unknown[] }).schedule
        : [];

      if (JSON.stringify(currentSchedule) === JSON.stringify(nextSchedule)) return;

      const { error: updateError } = await supabase
        .from('wedding_sites')
        .update({
          wedding_data: {
            ...weddingData,
            schedule: nextSchedule,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', siteId);

      if (updateError) throw updateError;

      const sectionEvents = toScheduleSectionEvents(eventList);
      const { data: scheduleSections, error: sectionsReadError } = await supabase
        .from('sections')
        .select('id,data')
        .eq('site_id', siteId)
        .eq('type', 'schedule');

      if (sectionsReadError) throw sectionsReadError;

      for (const section of scheduleSections ?? []) {
        const currentData = (section.data as Record<string, unknown> | null) ?? {};
        const nextData = { ...currentData, events: sectionEvents };
        if (JSON.stringify(currentData) === JSON.stringify(nextData)) continue;

        const { error: sectionUpdateError } = await supabase
          .from('sections')
          .update({ data: nextData, updated_at: new Date().toISOString() })
          .eq('id', section.id);

        if (sectionUpdateError) throw sectionUpdateError;
      }
    } catch {
      // non-blocking mirror write; itinerary CRUD still succeeds
    }
  }, []);

  const loadEvents = useCallback(async () => {
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
        }));

        try {
          const raw = localStorage.getItem(DEMO_ITINERARY_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as EventWithInvites[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              setEvents(parsed);
              return;
            }
          }
        } catch {
          // Ignore stale demo storage and fall back to seeded itinerary data.
        }

        setEvents(seeded as EventWithInvites[]);
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        setEvents([]);
        return;
      }

      const activeSite = await resolveActiveSiteForUser(user.id);
      const { data: sites, error: siteError } = await supabase
        .from('wedding_sites')
        .select('id')
        .eq('id', activeSite?.id ?? '')
        .maybeSingle();
      if (siteError) throw siteError;

      if (!sites) {
        setEvents([]);
        return;
      }

      const { data: eventsData, error } = await supabase
        .from('itinerary_events')
        .select('*')
        .eq('wedding_site_id', sites.id)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

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
            .eq('event_id', event.id);
          if (invitesError) throw invitesError;

          const invitationIds = (invites ?? []).map((i) => i.id as string);
          const inviteCount = invitationIds.length;

          let rsvps: Array<{ attending: boolean | null }> = [];
          if (invitationIds.length > 0 && hasEventRsvpsTable !== false) {
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

          const rsvpCount = rsvps.length;
          const attendingCount = rsvps.filter((r) => !!r.attending).length;
          const declinedCount = rsvps.filter((r) => r.attending === false).length;

          return {
            ...event,
            invitation_count: inviteCount,
            rsvp_count: rsvpCount,
            attending_count: attendingCount,
            declined_count: declinedCount,
          };
        })
      );

      setEvents(eventsWithCounts);
    } catch {
      setEvents([]);
      alert('Failed to load itinerary events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, syncWeddingDataSchedule]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

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
          }] as EventWithInvites[]));
        }
        setShowEventForm(false);
        setSaveNotice(editingEvent ? 'Event updated.' : 'Event created.');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSaveError('Please log in again and retry.');
        return;
      }

      const { data: site } = await supabase
        .from('wedding_sites')
        .select('id')
        .eq('id', (await resolveActiveSiteForUser(user.id))?.id ?? '')
        .single();

      if (!site) {
        setSaveError('Could not find your website right now. Please refresh and try again.');
        return;
      }

      const payload: Record<string, unknown> = {
        ...formData,
        event_name: formData.event_name,
        title: formData.event_name,
        event_date: formData.event_date || null,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        dress_code: formData.dress_code || null,
        notes: formData.notes || null,
        location_address: formData.location_address || null,
      };

      const driftFields = ['event_name', 'is_visible', 'dress_code', 'notes', 'location_address', 'end_time'];
      let createdEvent: { id: string; event_name?: string } | null = null;

      if (editingEvent) {
        const updatePayload: Record<string, unknown> = { ...payload };
        let error: { message?: string } | null = null;

        for (let i = 0; i <= driftFields.length; i += 1) {
          const result = await supabase
            .from('itinerary_events')
            .update(updatePayload)
            .eq('id', editingEvent.id);
          error = result.error;
          if (!error) break;

          const field = driftFields.find((candidate) => error?.message?.includes(candidate));
          if (!field || !(field in updatePayload)) break;
          delete updatePayload[field];
        }

        if (error) throw error;
      } else {
        const insertPayload: Record<string, unknown> = { ...payload };
        let error: { message?: string } | null = null;

        for (let i = 0; i <= driftFields.length; i += 1) {
          const result = await supabase
            .from('itinerary_events')
            .insert([
              {
                ...insertPayload,
                wedding_site_id: site.id,
              },
            ])
            .select('id,event_name')
            .single();
          error = result.error;
          if (!error && result.data) {
            createdEvent = result.data as { id: string; event_name?: string };
          }
          if (!error) break;

          const field = driftFields.find((candidate) => error?.message?.includes(candidate));
          if (!field || !(field in insertPayload)) break;
          delete insertPayload[field];
        }

        if (error) throw error;
      }

      if (!editingEvent && autoCreateAlbum && createdEvent?.id) {
        try {
          await invokeFunctionOrThrow(supabase, 'photo-album-create', {
            siteId: site.id,
            name: createdEvent.event_name || formData.event_name,
            itineraryEventId: createdEvent.id,
          });
        } catch {
          // best-effort connector; itinerary save should still succeed
        }
      }

      setShowEventForm(false);
      setSaveNotice(editingEvent ? 'Event updated.' : 'Event created.');
      loadEvents();
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || 'Failed to save event. Please try again.';
      setSaveError(message);
    } finally {
      setIsSavingEvent(false);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      if (isDemoMode) {
        setEvents(prev => prev.filter(e => e.id !== eventId));
        return;
      }
      const { error } = await supabase
        .from('itinerary_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      loadEvents();
    } catch {
      alert('Failed to delete event. Please try again.');
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

  if (loading) {
    return (
      <DashboardLayout currentPage="itinerary">
        <div className="space-y-4 animate-pulse" aria-hidden="true">
          <div className="h-12 w-64 rounded-xl bg-surface-subtle border border-border-subtle" />
          <div className="h-24 rounded-2xl bg-surface-subtle border border-border-subtle" />
          <div className="h-24 rounded-2xl bg-surface-subtle border border-border-subtle" />
          <div className="h-24 rounded-2xl bg-surface-subtle border border-border-subtle" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="itinerary">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Itinerary</h1>
          <p className="mt-2 text-neutral-600">
            Keep your weekend plans clear, organized, and easy for guests to follow.
          </p>
        </div>
        <Button onClick={() => openEventForm()}>
          <Plus className="w-5 h-5 mr-2" />
Add to itinerary
        </Button>
      </div>

      <Card id="itinerary-readiness" padding="md" className="border-primary/20 bg-primary/[0.04]">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">Itinerary readiness</p>
              <h2 className="mt-1 text-base font-semibold text-text-primary">{itineraryReadiness.title}</h2>
              <p className="mt-1.5 text-sm leading-6 text-text-secondary">{itineraryReadiness.detail}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {itineraryReadiness.badges.map((badge) => (
                <span key={badge} className="rounded-full border border-border-subtle bg-white px-2.5 py-1 text-[11px] font-medium text-text-secondary shadow-sm">
                  {badge}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border-subtle bg-white px-4 py-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Main focus</p>
              <p className="mt-1 text-sm font-semibold text-text-primary">{itineraryReadiness.focusTitle}</p>
              <p className="mt-2 text-xs leading-5 text-text-secondary">{itineraryReadiness.focusDetail}</p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-white px-4 py-4 shadow-sm md:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Best next move</p>
              <p className="mt-1 text-sm font-semibold text-text-primary">{itineraryReadiness.bestNextMove}</p>
              <div className="mt-3 border-t border-border-subtle pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Decision rule</p>
                <p className="mt-1 text-sm font-semibold text-text-primary">{itineraryReadiness.decisionRule}</p>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Watchout</p>
                <p className="mt-1 text-sm text-text-secondary">{itineraryReadiness.watchout}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {itineraryReadiness.sequence.map((step) => (
              <div key={step.id} className="rounded-2xl border border-border-subtle bg-white px-4 py-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">{step.title}</p>
                  <span className="rounded-full border border-border-subtle bg-surface-subtle px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                    {getFlowStatusLabel(step.status)}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-text-secondary">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

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
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {saveError}
              </div>
            )}

            {saveNotice && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
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
              const pending = Math.max(0, event.invitation_count - event.attending_count - event.declined_count);
              return (
              <Card key={event.id} className={`p-6 hover:shadow-lg transition-shadow ${conflictIds.has(event.id) ? 'ring-2 ring-amber-300' : ''}`}>
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
                        <span className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded">
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

                    <div className="flex flex-wrap items-stretch gap-2 pt-3 border-t border-neutral-200">
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200 text-sm">
                        <Users className="w-4 h-4 text-neutral-500" />
                        <span className="font-semibold text-neutral-900">{event.invitation_count}</span>
                        <span className="text-neutral-500">invited</span>
                      </div>
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-emerald-700">{event.attending_count}</span>
                        <span className="text-emerald-600">yes</span>
                      </div>
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-sm">
                        <X className="w-4 h-4 text-red-500" />
                        <span className="font-semibold text-red-600">{event.declined_count}</span>
                        <span className="text-red-500">no</span>
                      </div>
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-sm">
                        <HelpCircle className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold text-amber-600">{pending}</span>
                        <span className="text-amber-500">pending</span>
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
    </DashboardLayout>
  );
};

interface EventGuestManagerProps {
  eventId: string;
  onClose: () => void;
  onUpdate: () => void;
}

function EventGuestManager({ eventId, onClose, onUpdate }: EventGuestManagerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [allGuests, setAllGuests] = useState<any[]>([]);
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        setAllGuests([]);
        setInvitedGuestIds(new Set());
        return;
      }

      const activeSite = await resolveActiveSiteForUser(user.id);
      const { data: site, error: siteError } = await supabase
        .from('wedding_sites')
        .select('id')
        .eq('id', activeSite?.id ?? '')
        .single();
      if (siteError) throw siteError;

      if (!site) {
        setAllGuests([]);
        setInvitedGuestIds(new Set());
        return;
      }

      const { data: guests, error: guestsError } = await supabase
        .from('guests')
        .select('*')
        .eq('wedding_site_id', site.id)
        .order('name');
      if (guestsError) throw guestsError;

      const { data: invitations, error: invitationsError } = await supabase
        .from('event_invitations')
        .select('guest_id')
        .eq('event_id', eventId);
      if (invitationsError) throw invitationsError;

      setAllGuests(guests || []);
      setInvitedGuestIds(new Set(invitations?.map((i) => i.guest_id) || []));
    } catch {
      setAllGuests([]);
      setInvitedGuestIds(new Set());
      alert('Failed to load event guest list. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleGuestInvitation(guestId: string) {
    try {
      if (invitedGuestIds.has(guestId)) {
        const { data: invitationRow, error: invitationLookupError } = await supabase
          .from('event_invitations')
          .select('id')
          .eq('event_id', eventId)
          .eq('guest_id', guestId)
          .maybeSingle();

        if (invitationLookupError) throw invitationLookupError;

        const eventRsvpSnapshots = invitationRow?.id
          ? await getEventRsvpSnapshotsByInvitationIds([invitationRow.id])
          : [];

        if (invitationRow?.id) {
          await deleteEventRsvpByInvitationId(invitationRow.id);
        }

        const { error } = await supabase
          .from('event_invitations')
          .delete()
          .eq('event_id', eventId)
          .eq('guest_id', guestId);

        if (error) {
          await restoreEventRsvpSnapshots(eventRsvpSnapshots);
          throw error;
        }

        setInvitedGuestIds((prev) => {
          const next = new Set(prev);
          next.delete(guestId);
          return next;
        });
      } else {
        const { error } = await supabase
          .from('event_invitations')
          .upsert([{ event_id: eventId, guest_id: guestId }], { onConflict: 'event_id,guest_id' });

        if (error) throw error;

        setInvitedGuestIds((prev) => new Set(prev).add(guestId));
      }

      onUpdate();
    } catch {
      alert('Failed to update invitation. Please try again.');
    }
  }

  async function inviteAll() {
    setBulkLoading(true);
    try {
      const uninvited = allGuests.filter(g => !invitedGuestIds.has(g.id));
      if (uninvited.length === 0) return;

      const { error } = await supabase
        .from('event_invitations')
        .upsert(uninvited.map(g => ({ event_id: eventId, guest_id: g.id })), { onConflict: 'event_id,guest_id' });

      if (error) throw error;

      setInvitedGuestIds(new Set(allGuests.map(g => g.id)));
      onUpdate();
    } catch {
      alert('Failed to invite all guests. Please try again.');
    } finally {
      setBulkLoading(false);
    }
  }

  async function removeAll() {
    if (!confirm('Remove all guests from this event?')) return;
    setBulkLoading(true);
    try {
      const { data: invitationRows, error: invitationLookupError } = await supabase
        .from('event_invitations')
        .select('id')
        .eq('event_id', eventId);

      if (invitationLookupError) throw invitationLookupError;

      const invitationIds = (invitationRows ?? []).map((row: { id: string }) => row.id);
      const eventRsvpSnapshots = await getEventRsvpSnapshotsByInvitationIds(invitationIds);
      if (invitationIds.length > 0) {
        await deleteEventRsvpsByInvitationIds(invitationIds);
      }

      const { error } = await supabase
        .from('event_invitations')
        .delete()
        .eq('event_id', eventId);

      if (error) {
        await restoreEventRsvpSnapshots(eventRsvpSnapshots);
        throw error;
      }

      setInvitedGuestIds(new Set());
      onUpdate();
    } catch {
      alert('Failed to remove all guests. Please try again.');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-semibold text-neutral-900">Manage Event Guests</h2>
            <span className="text-sm text-neutral-500">{invitedCount} of {totalCount} invited</span>
          </div>
          <p className="text-sm text-neutral-600">
            Select which guests to invite to this event
          </p>
          <div className="flex items-center gap-2 mt-4">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search guests..."
              className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={inviteAll}
              disabled={bulkLoading || invitedCount === totalCount}
              className="px-3 py-2 text-sm font-medium bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Invite All
            </button>
            <button
              onClick={removeAll}
              disabled={bulkLoading || invitedCount === 0}
              className="px-3 py-2 text-sm font-medium bg-neutral-50 text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Remove All
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
                        ? 'bg-primary-50 border-primary-200'
                        : 'border-neutral-200 hover:bg-neutral-50'
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
                          ? 'bg-primary-600 text-white'
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

        <div className="p-6 border-t border-neutral-200">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </Card>
    </div>
  );
}
