import { supabase } from '../../lib/supabase';
import { invokeFunctionOrThrow } from '../../lib/invokeFunctionOrThrow';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import {
  deleteEventRsvpByInvitationId,
  deleteEventRsvpsByInvitationIds,
  getEventRsvpSnapshotsByInvitationIds,
  restoreEventRsvpSnapshots,
} from '../../lib/eventRsvpCleanup';
import type { WeddingDataV1 } from '../../types/weddingData';
import { combineDateAndTimeISO } from './itineraryDateTime';
import { deriveItineraryEventRsvpCounts, shouldLoadEventRsvps } from './itineraryEventRsvpCounts';

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

export interface ItineraryScheduleMirrorEvent {
  id: string;
  event_name: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string | null;
  location_name: string;
  location_address: string;
  notes: string | null;
  is_visible: boolean;
}

const ITINERARY_SCHEDULE_MIRROR_SITE_SELECT = 'wedding_data';
const ITINERARY_SCHEDULE_SECTION_SELECT = 'id,data';
const ITINERARY_EVENT_MANAGER_SITE_SELECT = 'id';
const ITINERARY_EVENT_MUTATION_SITE_SELECT = 'id';
const ITINERARY_EVENT_LIST_SITE_SELECT = 'id';
export const ITINERARY_EVENT_SELECT = 'id, event_name, title, description, event_date, start_time, end_time, location_name, location_address, dress_code, notes, display_order, sort_order, is_visible' as const;
export const ITINERARY_EVENT_GUEST_PICKER_SELECT = 'id, name, first_name, last_name, email' as const;
export const MAX_ITINERARY_EVENTS = 200;
export const MAX_ITINERARY_EVENT_INVITATIONS = 10000;
export const MAX_ITINERARY_EVENT_GUESTS = 5000;
const ITINERARY_EVENT_DRIFT_FIELDS = ['event_name', 'is_visible', 'dress_code', 'notes', 'location_address', 'end_time'] as const;

export interface ItineraryGuestPickerRow {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export interface ItineraryEventGuestManagerSnapshot {
  guests: ItineraryGuestPickerRow[];
  invitedGuestIds: Set<string>;
}

export interface ItineraryDashboardEvent {
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
  invitation_count: number;
  rsvp_count: number;
  attending_count: number;
  declined_count: number;
  pending_count: number;
}

export interface PersistItineraryTimelineEvent {
  id: string;
  event_date: string;
  start_time: string;
  end_time: string | null;
  display_order: number;
  event_name: string;
  description: string;
  location_name: string;
  location_address: string;
  dress_code: string | null;
  notes: string | null;
  is_visible: boolean;
}

export interface SaveItineraryEventFormData {
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

export interface SaveItineraryEventInput {
  editingEventId?: string | null;
  autoCreateAlbum: boolean;
  formData: SaveItineraryEventFormData;
}

export async function resolveItinerarySiteId(): Promise<string | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) return null;

  const activeSite = await resolveActiveSiteForUser(user.id);
  return activeSite?.id ?? null;
}

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

export function buildScheduleSectionEvents(events: ItineraryScheduleMirrorEvent[]) {
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

export function buildWeddingSchedule(events: ItineraryScheduleMirrorEvent[]): WeddingDataV1['schedule'] {
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

export async function createItineraryTemplateEvents(
  weddingSiteId: string,
  events: ItineraryTemplateEventDraft[],
): Promise<void> {
  const { error } = await supabase
    .from('itinerary_events')
    .insert(buildItineraryTemplateInsertRows(weddingSiteId, events));
  if (error) throw error;
}

export async function saveItineraryEvent(input: SaveItineraryEventInput): Promise<void> {
  const siteId = await resolveItinerarySiteId();
  if (!siteId) {
    throw new Error('Please log in again and retry.');
  }

  const { data: site, error: siteError } = await supabase
    .from('wedding_sites')
    .select(ITINERARY_EVENT_MUTATION_SITE_SELECT)
    .eq('id', siteId)
    .single();
  if (siteError) throw siteError;

  if (!site) {
    throw new Error('Couldn’t find your website right now. Please refresh and try again.');
  }

  const payload: Record<string, unknown> = {
    ...input.formData,
    event_name: input.formData.event_name,
    title: input.formData.event_name,
    event_date: input.formData.event_date || null,
    start_time: input.formData.start_time || null,
    end_time: input.formData.end_time || null,
    dress_code: input.formData.dress_code || null,
    notes: input.formData.notes || null,
    location_address: input.formData.location_address || null,
  };

  let createdEvent: { id: string; event_name?: string } | null = null;

  if (input.editingEventId) {
    const updatePayload: Record<string, unknown> = { ...payload };
    let error: { message?: string } | null = null;

    for (let i = 0; i <= ITINERARY_EVENT_DRIFT_FIELDS.length; i += 1) {
      const result = await supabase
        .from('itinerary_events')
        .update(updatePayload)
        .eq('id', input.editingEventId);
      error = result.error;
      if (!error) break;

      const field = ITINERARY_EVENT_DRIFT_FIELDS.find((candidate) => error?.message?.includes(candidate));
      if (!field || !(field in updatePayload)) break;
      delete updatePayload[field];
    }

    if (error) throw error;
    return;
  }

  const insertPayload: Record<string, unknown> = { ...payload };
  let error: { message?: string } | null = null;

  for (let i = 0; i <= ITINERARY_EVENT_DRIFT_FIELDS.length; i += 1) {
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

    const field = ITINERARY_EVENT_DRIFT_FIELDS.find((candidate) => error?.message?.includes(candidate));
    if (!field || !(field in insertPayload)) break;
    delete insertPayload[field];
  }

  if (error) throw error;

  if (input.autoCreateAlbum && createdEvent?.id) {
    try {
      await invokeFunctionOrThrow(supabase, 'photo-album-create', {
        siteId: site.id,
        name: createdEvent.event_name || input.formData.event_name,
        itineraryEventId: createdEvent.id,
      });
    } catch {
      // best-effort connector; itinerary save should still succeed
    }
  }
}

export async function deleteItineraryEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('itinerary_events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;
}

export async function loadItineraryDashboardEvents(
  hasEventRsvpsTable: boolean | null,
): Promise<{ events: ItineraryDashboardEvent[]; hasEventRsvpsTable: boolean | null }> {
  const siteId = await resolveItinerarySiteId();
  if (!siteId) {
    return { events: [], hasEventRsvpsTable };
  }

  const { data: site, error: siteError } = await supabase
    .from('wedding_sites')
    .select(ITINERARY_EVENT_LIST_SITE_SELECT)
    .eq('id', siteId)
    .maybeSingle();
  if (siteError) throw siteError;

  if (!site) {
    return { events: [], hasEventRsvpsTable };
  }

  const { data: eventsData, error } = await supabase
    .from('itinerary_events')
    .select(ITINERARY_EVENT_SELECT)
    .eq('wedding_site_id', site.id)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(MAX_ITINERARY_EVENTS);
  if (error) throw error;

  const normalizedEvents = (eventsData || []).map((event: Record<string, unknown>) => ({
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

  await syncItineraryScheduleMirror(site.id, normalizedEvents);

  let nextHasEventRsvpsTable = hasEventRsvpsTable;
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
      if (shouldLoadEventRsvps(invitationIds.length, nextHasEventRsvpsTable)) {
        const { data, error: eventRsvpError } = await supabase
          .from('event_rsvps')
          .select('attending')
          .in('event_invitation_id', invitationIds);

        if (eventRsvpError) {
          const msg = (eventRsvpError.message || '').toLowerCase();
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

  return {
    events: eventsWithCounts,
    hasEventRsvpsTable: nextHasEventRsvpsTable,
  };
}

export async function persistItineraryTimeline(
  events: PersistItineraryTimelineEvent[],
): Promise<string> {
  const siteId = await resolveItinerarySiteId();
  if (!siteId) {
    throw new Error('Please log in again and retry.');
  }

  const results = await Promise.all(events.map((event) => supabase
    .from('itinerary_events')
    .update({
      event_date: event.event_date,
      start_time: event.start_time || null,
      end_time: event.end_time || null,
      display_order: event.display_order,
    })
    .eq('id', event.id),
  ));
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;

  await syncItineraryScheduleMirror(siteId, events);
  return siteId;
}

export async function loadItineraryEventGuestManagerSnapshot(
  eventId: string,
): Promise<ItineraryEventGuestManagerSnapshot> {
  const siteId = await resolveItinerarySiteId();
  if (!siteId) {
    return { guests: [], invitedGuestIds: new Set() };
  }

  const { data: site, error: siteError } = await supabase
    .from('wedding_sites')
    .select(ITINERARY_EVENT_MANAGER_SITE_SELECT)
    .eq('id', siteId)
    .single();
  if (siteError) throw siteError;

  if (!site) {
    return { guests: [], invitedGuestIds: new Set() };
  }

  const { data: guests, error: guestsError } = await supabase
    .from('guests')
    .select(ITINERARY_EVENT_GUEST_PICKER_SELECT)
    .eq('wedding_site_id', site.id)
    .order('name')
    .limit(MAX_ITINERARY_EVENT_GUESTS);
  if (guestsError) throw guestsError;

  const { data: invitations, error: invitationsError } = await supabase
    .from('event_invitations')
    .select('guest_id')
    .eq('event_id', eventId)
    .limit(MAX_ITINERARY_EVENT_INVITATIONS);
  if (invitationsError) throw invitationsError;

  return {
    guests: (guests ?? []) as ItineraryGuestPickerRow[],
    invitedGuestIds: new Set((invitations ?? []).map((invitation: { guest_id: string }) => invitation.guest_id)),
  };
}

export async function addItineraryEventGuestInvitation(
  eventId: string,
  guestId: string,
): Promise<void> {
  const { error } = await supabase.rpc('guest_dashboard_event_invitation_insert_many', {
    p_rows: [{ event_id: eventId, guest_id: guestId }],
  });

  if (error) throw error;
}

export async function removeItineraryEventGuestInvitation(
  eventId: string,
  guestId: string,
): Promise<void> {
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

  const { error } = await supabase.rpc('guest_dashboard_event_invitation_delete', {
    p_guest_id: guestId,
    p_event_id: eventId,
    p_guest_ids: null,
  });

  if (error) {
    await restoreEventRsvpSnapshots(eventRsvpSnapshots);
    throw error;
  }
}

export async function inviteAllGuestsToItineraryEvent(
  eventId: string,
  guestIds: string[],
): Promise<void> {
  if (guestIds.length === 0) return;
  const { error } = await supabase.rpc('guest_dashboard_event_invitation_insert_many', {
    p_rows: guestIds.map((guestId) => ({ event_id: eventId, guest_id: guestId })),
  });

  if (error) throw error;
}

export async function removeAllGuestsFromItineraryEvent(
  eventId: string,
): Promise<void> {
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

  const { error } = await supabase.rpc('guest_dashboard_event_invitation_delete', {
    p_guest_id: null,
    p_event_id: eventId,
    p_guest_ids: null,
  });

  if (error) {
    await restoreEventRsvpSnapshots(eventRsvpSnapshots);
    throw error;
  }
}

export async function syncItineraryScheduleMirror(
  siteId: string,
  eventList: ItineraryScheduleMirrorEvent[],
): Promise<void> {
  const { data: siteData, error: readError } = await supabase
    .from('wedding_sites')
    .select(ITINERARY_SCHEDULE_MIRROR_SITE_SELECT)
    .eq('id', siteId)
    .maybeSingle();

  if (readError) throw readError;

  const weddingData = (siteData?.wedding_data as Record<string, unknown> | null) ?? {};
  const nextSchedule = buildWeddingSchedule(eventList);
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

  const sectionEvents = buildScheduleSectionEvents(eventList);
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
