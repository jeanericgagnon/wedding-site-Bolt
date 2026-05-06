import { supabase } from '../../lib/supabase';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { deriveItineraryEventRsvpCounts, shouldLoadEventRsvps } from './itineraryEventRsvpCounts';
import { combineDateAndTimeISO } from './itineraryDateTime';
import type { WeddingDataV1 } from '../../types/weddingData';

export interface ItineraryEvent {
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

export interface EventWithInvites extends ItineraryEvent {
  invitation_count: number;
  rsvp_count: number;
  attending_count: number;
  declined_count: number;
  pending_count: number;
}

export interface EventGuestPickerGuest {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export const ITINERARY_EVENT_SELECT = 'id, event_name, title, description, event_date, start_time, end_time, location_name, location_address, dress_code, notes, display_order, sort_order, is_visible' as const;
export const EVENT_GUEST_PICKER_SELECT = 'id, name, first_name, last_name, email' as const;
export const ITINERARY_SITE_SELECT = 'id' as const;
export const ITINERARY_WEDDING_DATA_SELECT = 'wedding_data' as const;
export const ITINERARY_SCHEDULE_SECTION_SELECT = 'id,data' as const;
export const EVENT_INVITATION_ID_SELECT = 'id' as const;
export const EVENT_INVITATION_GUEST_SELECT = 'guest_id' as const;
export const EVENT_RSVP_ATTENDING_SELECT = 'attending' as const;
const MAX_EVENT_GUEST_PICKER_GUESTS = 2000;
const MAX_EVENT_GUEST_PICKER_INVITATIONS = 10000;

export function toScheduleSectionEvents(events: ItineraryEvent[]) {
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

export function toWeddingSchedule(events: ItineraryEvent[]): WeddingDataV1['schedule'] {
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

export function normalizeItineraryEventRow(event: Record<string, unknown>): ItineraryEvent {
  return {
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
  };
}

export async function resolveItinerarySiteId(userId: string): Promise<string | null> {
  const activeSite = await resolveActiveSiteForUser(userId);
  if (!activeSite?.id) return null;

  const { data, error } = await supabase
    .from('wedding_sites')
    .select(ITINERARY_SITE_SELECT)
    .eq('id', activeSite.id)
    .maybeSingle();

  if (error) throw error;
  return (data?.id as string | undefined) ?? null;
}

export async function syncWeddingDataSchedule(siteId: string, eventList: ItineraryEvent[]): Promise<void> {
  const { data: siteData, error: readError } = await supabase
    .from('wedding_sites')
    .select(ITINERARY_WEDDING_DATA_SELECT)
    .eq('id', siteId)
    .maybeSingle();

  if (readError) throw readError;

  const weddingData = (siteData?.wedding_data as Record<string, unknown> | null) ?? {};
  const nextSchedule = toWeddingSchedule(eventList);
  const currentSchedule = Array.isArray((weddingData as { schedule?: unknown }).schedule)
    ? (weddingData as { schedule: unknown[] }).schedule
    : [];

  if (JSON.stringify(currentSchedule) !== JSON.stringify(nextSchedule)) {
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
  }

  const sectionEvents = toScheduleSectionEvents(eventList);
  const { data: scheduleSections, error: sectionsReadError } = await supabase
    .from('sections')
    .select(ITINERARY_SCHEDULE_SECTION_SELECT)
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
}

export async function loadItineraryEventsForUser(
  userId: string,
  eventRsvpsTableAvailable: boolean | null,
): Promise<{ siteId: string | null; events: EventWithInvites[]; eventRsvpsTableAvailable: boolean | null }> {
  const siteId = await resolveItinerarySiteId(userId);
  if (!siteId) return { siteId: null, events: [], eventRsvpsTableAvailable };

  const { data: eventsData, error } = await supabase
    .from('itinerary_events')
    .select(ITINERARY_EVENT_SELECT)
    .eq('wedding_site_id', siteId)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) throw error;

  const normalizedEvents = ((eventsData ?? []) as Record<string, unknown>[]).map(normalizeItineraryEventRow);

  try {
    await syncWeddingDataSchedule(siteId, normalizedEvents);
  } catch {
    // non-blocking mirror write; itinerary loading still succeeds
  }

  let nextHasEventRsvpsTable = eventRsvpsTableAvailable;
  const eventsWithCounts = await Promise.all(
    normalizedEvents.map(async (event) => {
      const { data: invites, error: invitesError } = await supabase
        .from('event_invitations')
        .select(EVENT_INVITATION_ID_SELECT)
        .eq('event_id', event.id);
      if (invitesError) throw invitesError;

      const invitationIds = (invites ?? []).map((i) => i.id as string);
      const inviteCount = invitationIds.length;

      let rsvps: Array<{ attending: boolean | null }> = [];
      if (shouldLoadEventRsvps(invitationIds.length, nextHasEventRsvpsTable)) {
        const { data, error: rsvpError } = await supabase
          .from('event_rsvps')
          .select(EVENT_RSVP_ATTENDING_SELECT)
          .in('event_invitation_id', invitationIds);

        if (rsvpError) {
          const msg = (rsvpError.message || '').toLowerCase();
          if (msg.includes('event_rsvps') || msg.includes('does not exist') || msg.includes('404') || msg.includes('relation')) {
            nextHasEventRsvpsTable = false;
          }
        } else {
          nextHasEventRsvpsTable = true;
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
    }),
  );

  return { siteId, events: eventsWithCounts, eventRsvpsTableAvailable: nextHasEventRsvpsTable };
}

export interface ItineraryTemplateEventDraft {
  event_name: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string | null;
  display_order: number;
}

export interface ItineraryTemplateEventInsert {
  wedding_site_id: string;
  event_name: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string | null;
  display_order: number;
  is_visible: boolean;
}

const ITINERARY_DRIFT_FIELDS = ['event_name', 'is_visible', 'dress_code', 'notes', 'location_address', 'end_time'];

export function buildItineraryTemplateInsertRows(
  weddingSiteId: string,
  events: ItineraryTemplateEventDraft[],
): ItineraryTemplateEventInsert[] {
  return events.map((event) => ({
    wedding_site_id: weddingSiteId,
    event_name: event.event_name,
    title: event.event_name,
    description: event.description,
    event_date: event.event_date,
    start_time: event.start_time,
    end_time: event.end_time,
    display_order: event.display_order,
    is_visible: true,
  }));
}

export async function createItineraryTemplateEvents(
  weddingSiteId: string,
  events: ItineraryTemplateEventDraft[],
): Promise<void> {
  const { error } = await supabase
    .from('itinerary_events')
    .insert(buildItineraryTemplateInsertRows(weddingSiteId, events));
  if (error) throw error;
}

export async function saveItineraryEvent(
  siteId: string,
  payload: Record<string, unknown>,
  editingEventId?: string | null,
): Promise<{ id: string; event_name?: string } | null> {
  if (editingEventId) {
    const updatePayload: Record<string, unknown> = { ...payload };
    let error: { message?: string } | null = null;

    for (let i = 0; i <= ITINERARY_DRIFT_FIELDS.length; i += 1) {
      const result = await supabase
        .from('itinerary_events')
        .update(updatePayload)
        .eq('id', editingEventId);
      error = result.error;
      if (!error) break;

      const field = ITINERARY_DRIFT_FIELDS.find((candidate) => error?.message?.includes(candidate));
      if (!field || !(field in updatePayload)) break;
      delete updatePayload[field];
    }

    if (error) throw error;
    return null;
  }

  const insertPayload: Record<string, unknown> = { ...payload };
  let error: { message?: string } | null = null;
  let createdEvent: { id: string; event_name?: string } | null = null;

  for (let i = 0; i <= ITINERARY_DRIFT_FIELDS.length; i += 1) {
    const result = await supabase
      .from('itinerary_events')
      .insert([
        {
          ...insertPayload,
          wedding_site_id: siteId,
        },
      ])
      .select('id,event_name')
      .single();
    error = result.error;
    if (!error && result.data) {
      createdEvent = result.data as { id: string; event_name?: string };
    }
    if (!error) break;

    const field = ITINERARY_DRIFT_FIELDS.find((candidate) => error?.message?.includes(candidate));
    if (!field || !(field in insertPayload)) break;
    delete insertPayload[field];
  }

  if (error) throw error;
  return createdEvent;
}

export async function deleteItineraryEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('itinerary_events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;
}

export async function updateItineraryEventTimes(siteId: string, nextEvents: ItineraryEvent[]): Promise<void> {
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
}

export async function loadEventGuestPicker(
  userId: string,
  eventId: string,
): Promise<{ guests: EventGuestPickerGuest[]; invitedGuestIds: Set<string> }> {
  const siteId = await resolveItinerarySiteId(userId);
  if (!siteId) return { guests: [], invitedGuestIds: new Set() };

  const { data: guests, error: guestsError } = await supabase
    .from('guests')
    .select(EVENT_GUEST_PICKER_SELECT)
    .eq('wedding_site_id', siteId)
    .order('name')
    .limit(MAX_EVENT_GUEST_PICKER_GUESTS);
  if (guestsError) throw guestsError;

  const { data: invitations, error: invitationsError } = await supabase
    .from('event_invitations')
    .select(EVENT_INVITATION_GUEST_SELECT)
    .eq('event_id', eventId)
    .limit(MAX_EVENT_GUEST_PICKER_INVITATIONS);
  if (invitationsError) throw invitationsError;

  return {
    guests: (guests ?? []) as EventGuestPickerGuest[],
    invitedGuestIds: new Set((invitations ?? []).map((i) => i.guest_id as string)),
  };
}

export async function findEventInvitationId(eventId: string, guestId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('event_invitations')
    .select(EVENT_INVITATION_ID_SELECT)
    .eq('event_id', eventId)
    .eq('guest_id', guestId)
    .maybeSingle();

  if (error) throw error;
  return (data?.id as string | undefined) ?? null;
}

export async function removeEventGuestInvitation(eventId: string, guestId: string): Promise<void> {
  const { error } = await supabase
    .from('event_invitations')
    .delete()
    .eq('event_id', eventId)
    .eq('guest_id', guestId);

  if (error) throw error;
}

export async function upsertEventGuestInvitations(eventId: string, guestIds: string[]): Promise<void> {
  if (guestIds.length === 0) return;
  const { error } = await supabase
    .from('event_invitations')
    .upsert(guestIds.map((guestId) => ({ event_id: eventId, guest_id: guestId })), { onConflict: 'event_id,guest_id' });

  if (error) throw error;
}

export async function listEventInvitationIds(eventId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('event_invitations')
    .select(EVENT_INVITATION_ID_SELECT)
    .eq('event_id', eventId)
    .limit(MAX_EVENT_GUEST_PICKER_INVITATIONS);

  if (error) throw error;
  return (data ?? []).map((row: { id: string }) => row.id);
}

export async function removeAllEventInvitations(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('event_invitations')
    .delete()
    .eq('event_id', eventId);

  if (error) throw error;
}
