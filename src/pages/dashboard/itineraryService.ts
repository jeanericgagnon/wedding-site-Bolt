import { supabase } from '../../lib/supabase';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import {
  deleteEventRsvpByInvitationId,
  deleteEventRsvpsByInvitationIds,
  getEventRsvpSnapshotsByInvitationIds,
  restoreEventRsvpSnapshots,
} from '../../lib/eventRsvpCleanup';
import type { WeddingDataV1 } from '../../types/weddingData';
import { combineDateAndTimeISO } from './itineraryDateTime';

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
export const ITINERARY_EVENT_GUEST_PICKER_SELECT = 'id, name, first_name, last_name, email' as const;
export const MAX_ITINERARY_EVENT_INVITATIONS = 10000;
export const MAX_ITINERARY_EVENT_GUESTS = 5000;

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
  const { error } = await supabase
    .from('event_invitations')
    .upsert([{ event_id: eventId, guest_id: guestId }], { onConflict: 'event_id,guest_id' });

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

  const { error } = await supabase
    .from('event_invitations')
    .delete()
    .eq('event_id', eventId)
    .eq('guest_id', guestId);

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
  const { error } = await supabase
    .from('event_invitations')
    .upsert(guestIds.map((guestId) => ({ event_id: eventId, guest_id: guestId })), { onConflict: 'event_id,guest_id' });

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

  const { error } = await supabase
    .from('event_invitations')
    .delete()
    .eq('event_id', eventId);

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
