import { supabase } from '../../../lib/supabase';
import {
  deleteEventRsvpsByInvitationIds,
  getEventRsvpSnapshotsByInvitationIds,
  restoreEventRsvpSnapshots,
  type EventRsvpSnapshot,
} from '../../../lib/eventRsvpCleanup';

export const GUEST_DASHBOARD_RSVP_SELECT = [
  'guest_id',
  'attending',
  'attending_ceremony',
  'attending_reception',
  'meal_choice',
  'plus_one_name',
  'plus_one_count',
  'children_count',
  'notes',
  'custom_answers',
].join(', ');

const EVENT_INVITATION_ROLLBACK_SELECT = 'id, event_id';
const GUEST_ID_SELECT = 'id';
const IMPORTED_GUEST_SELECT = 'id, first_name, last_name, name, email';

export interface CreateGuestInput {
  weddingSiteId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  plusOneAllowed: boolean;
  invitedToCeremony: boolean;
  invitedToReception: boolean;
  inviteToken: string;
}

export interface UpdateGuestInput {
  guestId: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  plusOneAllowed: boolean | null;
  invitedToCeremony: boolean | null;
  invitedToReception: boolean | null;
}

export interface EventInvitationRow {
  event_id: string;
  guest_id: string;
}

export interface GuestEventInvitationRollback {
  eventIds: string[];
  eventRsvpSnapshots: EventRsvpSnapshot[];
}

export interface GuestBulkDeleteResult {
  guestIds: string[];
  invitationIds: string[];
}

export function toEventInvitationRows(guestId: string, eventIds: string[]): EventInvitationRow[] {
  return eventIds.map((eventId) => ({ event_id: eventId, guest_id: guestId }));
}

export async function fetchGuestRsvps(guestIds: string[]): Promise<unknown[]> {
  if (guestIds.length === 0) return [];

  const { data, error } = await supabase
    .from('rsvps')
    .select(GUEST_DASHBOARD_RSVP_SELECT)
    .in('guest_id', guestIds);

  if (error) throw error;
  return data ?? [];
}

export async function createGuest(input: CreateGuestInput): Promise<string> {
  const { data, error } = await supabase
    .from('guests')
    .insert([{
      wedding_site_id: input.weddingSiteId,
      first_name: input.firstName,
      last_name: input.lastName,
      name: `${input.firstName} ${input.lastName}`,
      email: input.email,
      phone: input.phone,
      plus_one_allowed: input.plusOneAllowed,
      invited_to_ceremony: input.invitedToCeremony,
      invited_to_reception: input.invitedToReception,
      invite_token: input.inviteToken,
      rsvp_status: 'pending',
    }])
    .select(GUEST_ID_SELECT)
    .single();

  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateGuest(input: UpdateGuestInput): Promise<void> {
  const { error } = await supabase
    .from('guests')
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
      name: input.name,
      email: input.email,
      phone: input.phone,
      plus_one_allowed: input.plusOneAllowed,
      invited_to_ceremony: input.invitedToCeremony,
      invited_to_reception: input.invitedToReception,
    })
    .eq('id', input.guestId);

  if (error) throw error;
}

export async function deleteGuestById(guestId: string): Promise<void> {
  const { error } = await supabase.from('guests').delete().eq('id', guestId);
  if (error) throw error;
}

export async function insertEventInvitations(rows: EventInvitationRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from('event_invitations').insert(rows);
  if (error) throw error;
}

export async function replaceGuestEventInvitations(guestId: string, nextEventIds: string[]): Promise<GuestEventInvitationRollback> {
  const { data: existingInvitationRows, error: existingInvitesError } = await supabase
    .from('event_invitations')
    .select(EVENT_INVITATION_ROLLBACK_SELECT)
    .eq('guest_id', guestId);

  if (existingInvitesError) throw existingInvitesError;

  const existingRows = (existingInvitationRows ?? []) as Array<{ id: string; event_id: string }>;
  const previousEventIds = existingRows.map((row) => row.event_id);
  const existingInvitationIds = existingRows.map((row) => row.id);
  const eventRsvpSnapshots = existingInvitationIds.length > 0
    ? await getEventRsvpSnapshotsByInvitationIds(existingInvitationIds)
    : [];

  if (existingInvitationIds.length > 0) {
    await deleteEventRsvpsByInvitationIds(existingInvitationIds);
  }

  const { error: clearInvitesError } = await supabase
    .from('event_invitations')
    .delete()
    .eq('guest_id', guestId);
  if (clearInvitesError) throw clearInvitesError;

  await insertEventInvitations(toEventInvitationRows(guestId, nextEventIds));

  return { eventIds: previousEventIds, eventRsvpSnapshots };
}

export async function restoreGuestEventInvitations(guestId: string, rollback: GuestEventInvitationRollback): Promise<void> {
  const rollbackEventIds = rollback.eventIds.filter((eventId) => !eventId.startsWith('legacy-'));
  await insertEventInvitations(toEventInvitationRows(guestId, rollbackEventIds));
  if (rollback.eventRsvpSnapshots.length > 0) {
    await restoreEventRsvpSnapshots(rollback.eventRsvpSnapshots);
  }
}

export async function deleteGuestWithDependencies(guestId: string): Promise<{ invitationCount: number }> {
  const { data: invitationRows, error: invitationLookupError } = await supabase
    .from('event_invitations')
    .select(GUEST_ID_SELECT)
    .eq('guest_id', guestId);
  if (invitationLookupError) throw invitationLookupError;

  const invitationIds = (invitationRows ?? []).map((row) => (row as { id: string }).id);
  if (invitationIds.length > 0) {
    await deleteEventRsvpsByInvitationIds(invitationIds);
    const { error: inviteDeleteError } = await supabase
      .from('event_invitations')
      .delete()
      .eq('guest_id', guestId);
    if (inviteDeleteError) throw inviteDeleteError;
  }

  const { error: rsvpDeleteError } = await supabase
    .from('rsvps')
    .delete()
    .eq('guest_id', guestId);
  if (rsvpDeleteError) throw rsvpDeleteError;

  await deleteGuestById(guestId);
  return { invitationCount: invitationIds.length };
}

export async function deleteAllGuestsForSite(weddingSiteId: string): Promise<GuestBulkDeleteResult> {
  const { data: guestRows, error: guestReadError } = await supabase
    .from('guests')
    .select(GUEST_ID_SELECT)
    .eq('wedding_site_id', weddingSiteId);
  if (guestReadError) throw guestReadError;

  const guestIds = (guestRows ?? []).map((guest) => (guest as { id: string }).id);
  const invitationIds: string[] = [];

  if (guestIds.length > 0) {
    const { data: invitationRows } = await supabase
      .from('event_invitations')
      .select(GUEST_ID_SELECT)
      .in('guest_id', guestIds);

    invitationIds.push(...((invitationRows ?? []).map((row) => (row as { id: string }).id)));

    if (invitationIds.length > 0) {
      await deleteEventRsvpsByInvitationIds(invitationIds);
    }

    const { error: eventInvitationDeleteError } = await supabase
      .from('event_invitations')
      .delete()
      .in('guest_id', guestIds);
    if (eventInvitationDeleteError) throw eventInvitationDeleteError;

    const { error: rsvpDeleteError } = await supabase
      .from('rsvps')
      .delete()
      .in('guest_id', guestIds);
    if (rsvpDeleteError) throw rsvpDeleteError;
  }

  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('wedding_site_id', weddingSiteId);
  if (error) throw error;

  return { guestIds, invitationIds };
}

export async function insertImportedGuests(guestRows: Array<Record<string, unknown>>): Promise<Array<{ id: string; first_name: string | null; last_name: string | null; name: string | null; email: string | null }>> {
  const { data, error } = await supabase
    .from('guests')
    .insert(guestRows)
    .select(IMPORTED_GUEST_SELECT);

  if (error) throw error;
  return (data ?? []) as Array<{ id: string; first_name: string | null; last_name: string | null; name: string | null; email: string | null }>;
}

export async function updateHouseholdGuestIds(householdId: string, guestIds: string[]): Promise<void> {
  if (guestIds.length === 0) return;
  const { error } = await supabase
    .from('guests')
    .update({ household_id: householdId })
    .in('id', guestIds);

  if (error) throw error;
}

export async function replaceImportedGuestRsvps(rows: Array<{ guest_id: string; attending: boolean; meal_choice: string | null; plus_one_name: string | null; plus_one_count: number; children_count: number; responded_at: string | null }>): Promise<void> {
  if (rows.length === 0) return;

  const rsvpGuestIds = Array.from(new Set(rows.map((row) => row.guest_id)));
  const { error: rsvpDeleteError } = await supabase.from('rsvps').delete().in('guest_id', rsvpGuestIds);
  if (rsvpDeleteError) throw rsvpDeleteError;

  const { error: rsvpInsertError } = await supabase.from('rsvps').insert(rows);
  if (rsvpInsertError) throw rsvpInsertError;
}

export async function updateGuestForSite(
  weddingSiteId: string,
  guestId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('guests')
    .update(patch)
    .eq('wedding_site_id', weddingSiteId)
    .eq('id', guestId);

  if (error) throw error;
}

export async function updateGuestsForSite(
  weddingSiteId: string,
  guestIds: string[],
  patch: Record<string, unknown>,
): Promise<void> {
  if (guestIds.length === 0) return;
  const { error } = await supabase
    .from('guests')
    .update(patch)
    .eq('wedding_site_id', weddingSiteId)
    .in('id', guestIds);

  if (error) throw error;
}

export async function clearGuestCheckInsForSite(weddingSiteId: string): Promise<void> {
  const { error } = await supabase
    .from('guests')
    .update({
      checked_in_at: null,
      checkin_notes: null,
    })
    .eq('wedding_site_id', weddingSiteId)
    .not('checked_in_at', 'is', null);

  if (error) throw error;
}
