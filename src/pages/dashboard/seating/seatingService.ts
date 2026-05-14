import { supabase } from '../../../lib/supabase';
import { resolveActiveSiteForUser } from '../../../lib/activeSite';
import { demoGuests } from '../../../lib/demoData';
import { resolveOperationalEventId } from '../../../lib/operationalEvent';
import { isAttendingRsvpStatus, isDeclinedRsvpStatus, isPendingRsvpStatus } from '../../../lib/rsvpStatus';
import { toSafeCsv } from '../../../lib/csvExport';
import { extractDietaryNote } from '../../../lib/dietaryNotes';
import { loadDemoItineraryEventsFromStorage, readDemoSeatingState } from './seatingDemoStorage';

function requireRpcRecord<T>(data: unknown, functionName: string): T {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${functionName} returned an invalid record payload`);
  }
  return data as T;
}

function requireRpcArray<T>(data: unknown, functionName: string): T[] {
  if (!Array.isArray(data)) {
    throw new Error(`${functionName} returned an invalid array payload`);
  }
  return data as T[];
}

let hasEventRsvpsTable: boolean | null = null;

const SEATING_EVENT_SELECT = 'id, wedding_site_id, itinerary_event_id, default_table_capacity, notes, created_at' as const;
const SEATING_TABLE_SELECT = 'id, seating_event_id, table_name, capacity, sort_order, notes, table_shape, layout_width, layout_height, layout_x, layout_y, rotation_deg' as const;
const SEATING_ASSIGNMENT_SELECT = 'id, seating_event_id, table_id, guest_id, seat_index, is_valid, checked_in_at, checked_in_by' as const;
const SEATING_ELIGIBLE_GUEST_SELECT = 'id, name, first_name, last_name, email, rsvp_status, household_id, group_name, meal_preference, notes' as const;
const SEATING_LAYOUT_VERSION_SELECT = 'id, wedding_site_id, seating_event_id, itinerary_event_id, label, tables, assignments, created_by, restored_at, created_at' as const;
const SEATING_LOOKUP_ASSIGNMENT_SELECT = 'guest_id, table_id, seat_index, checked_in_at, is_valid' as const;
const SEATING_LOOKUP_TABLE_SELECT = 'id, table_name' as const;
const SEATING_LOOKUP_GUEST_SELECT = 'id, first_name, last_name, name, email, rsvp_status, invite_token, preferred_language' as const;
export const MAX_SEATING_ITINERARY_EVENTS = 200;
export const MAX_SEATING_LOOKUP_TABLE_IDS = 500;
export const MAX_SEATING_LOOKUP_GUEST_IDS = 2000;
export const MAX_SEATING_ELIGIBLE_GUESTS = 5000;
export const MAX_SEATING_EVENT_INVITATIONS = 10000;
export const MAX_SEATING_TABLE_ROWS = 500;
export const MAX_SEATING_ASSIGNMENT_ROWS = 10000;
export const MAX_SEATING_VERSION_ROWS = 12;

export async function refreshSeatingSession(): Promise<void> {
  await supabase.auth.refreshSession();
}

export interface ItineraryEvent {
  id: string;
  event_name: string;
  event_date: string;
  start_time: string;
  location_name: string;
}

export interface SeatingEvent {
  id: string;
  wedding_site_id: string;
  itinerary_event_id: string;
  default_table_capacity: number;
  notes: string;
  created_at: string;
}

export interface SeatingTable {
  id: string;
  seating_event_id: string;
  table_name: string;
  capacity: number;
  sort_order: number;
  notes: string;
  table_shape?: 'round' | 'rectangle' | 'bar' | 'dj_booth' | 'dance_floor';
  layout_width?: number;
  layout_height?: number;
  layout_x?: number;
  layout_y?: number;
  rotation_deg?: number;
}

export interface SeatingAssignment {
  id: string;
  seating_event_id: string;
  table_id: string | null;
  guest_id: string;
  seat_index: number | null;
  is_valid: boolean;
  checked_in_at?: string | null;
  checked_in_by?: string | null;
}

export interface EligibleGuest {
  id: string;
  full_name: string;
  email: string | null;
  rsvp_status: string | null;
  household_id: string | null;
  group_name: string | null;
  is_attending: boolean;
  is_invited_to_event: boolean;
  event_rsvp_attending?: boolean | null;
  meal_choice?: string | null;
  meal_preference?: string | null;
  dietary_restrictions?: string | null;
  dietary_notes?: string | null;
  allergies?: string | null;
  notes?: string | null;
}

export interface GuestWithAssignment extends EligibleGuest {
  table_id: string | null;
  assignment_id: string | null;
  is_assignment_valid: boolean;
}

export interface EventCounters {
  invited: number;
  attending: number;
  declined: number;
  pending: number;
  seated: number;
  unassigned: number;
}

export interface SeatingLayoutVersion {
  id: string;
  wedding_site_id: string;
  seating_event_id: string;
  itinerary_event_id: string | null;
  label: string;
  tables: SeatingTable[];
  assignments: SeatingAssignment[];
  created_by: string | null;
  restored_at: string | null;
  created_at: string;
}

export interface SeatingLookupRow {
  itinerary_event_id: string | null;
  event_name: string;
  guest_id: string;
  full_name: string;
  email: string | null;
  invite_token?: string | null;
  preferred_language?: string | null;
  table_name: string;
  seat_index: number | null;
  checked_in_at: string | null;
  rsvp_status?: string | null;
}

export function deriveEligibleGuestDietaryFields(notes: string | null | undefined): {
  dietary_notes: string | null;
  allergies: string | null;
} {
  const normalizedNotes = typeof notes === 'string' ? notes.trim() : '';
  if (!normalizedNotes) {
    return {
      dietary_notes: null,
      allergies: null,
    };
  }

  const dietaryNote = extractDietaryNote(null, normalizedNotes);
  const allergyMatch = normalizedNotes.match(/\ballerg(?:y|ies)\s*:\s*(.+)$/i);
  const allergies = allergyMatch?.[1]?.trim() || null;

  return {
    dietary_notes: dietaryNote,
    allergies,
  };
}

interface SeatingLookupGuest {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  email: string | null;
  rsvp_status: string | null;
  invite_token?: string | null;
  preferred_language?: string | null;
}

interface SeatingLookupAssignment {
  guest_id: string;
  table_id: string | null;
  seat_index: number | null;
  checked_in_at: string | null;
}

export function deriveGuestEventAttendance(args: {
  hasEventInvitations: boolean;
  isInvitedToEvent: boolean;
  eventRsvp: boolean | null | undefined;
  rsvpStatus: string | null | undefined;
}): boolean {
  if (args.hasEventInvitations) {
    return args.isInvitedToEvent && args.eventRsvp === true;
  }

  return isAttendingRsvpStatus(args.rsvpStatus);
}

export function deriveEventCountersFromGuests(
  guests: EligibleGuest[],
  assignments: SeatingAssignment[],
): EventCounters {
  const invitedGuests = guests.filter(g => g.is_invited_to_event);

  const validAssignmentGuestIds = new Set(
    assignments.filter(a => a.is_valid).map(a => a.guest_id)
  );

  const invited = invitedGuests.length;
  const attending = invitedGuests.filter(g => g.is_attending).length;
  const hasEventScopedResponses = invitedGuests.some(g => g.event_rsvp_attending !== undefined);
  const declined = invitedGuests.filter(g => hasEventScopedResponses
    ? g.event_rsvp_attending === false
    : isDeclinedRsvpStatus(g.rsvp_status)).length;
  const pending = invitedGuests.filter(g => hasEventScopedResponses
    ? g.event_rsvp_attending == null
    : isPendingRsvpStatus(g.rsvp_status)).length;
  const seated = invitedGuests.filter(g => g.is_attending && validAssignmentGuestIds.has(g.id)).length;
  const unassigned = attending - seated;

  return { invited, attending, declined, pending, seated, unassigned: Math.max(0, unassigned) };
}

export async function getWeddingSiteId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('wedding_sites')
    .select('id')
    .eq('id', (await resolveActiveSiteForUser(user.id))?.id ?? '')
    .maybeSingle();
  return data?.id ?? null;
}

export async function loadItineraryEvents(weddingSiteId: string): Promise<ItineraryEvent[]> {
  const { data, error } = await supabase
    .from('itinerary_events')
    .select('id, event_name, event_date, start_time, location_name')
    .eq('wedding_site_id', weddingSiteId)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(MAX_SEATING_ITINERARY_EVENTS);
  if (error) throw error;
  return (data ?? []) as ItineraryEvent[];
}

export function mapSeatingLookupRows(
  assignments: SeatingLookupAssignment[],
  tables: Array<{ id: string; table_name: string | null }>,
  guests: SeatingLookupGuest[],
  eventMeta: { itinerary_event_id: string | null; event_name: string },
): SeatingLookupRow[] {
  const tableNameById = new Map(tables.map((table) => [table.id, table.table_name || 'Unassigned']));
  const guestById = new Map(guests.map((guest) => [guest.id, guest]));

  return assignments.map((assignment) => {
    const guest = guestById.get(assignment.guest_id) ?? null;
    const fullName = (guest?.first_name || guest?.last_name)
      ? `${guest?.first_name ?? ''} ${guest?.last_name ?? ''}`.trim()
      : (guest?.name || 'Guest');
    return {
      itinerary_event_id: eventMeta.itinerary_event_id,
      event_name: eventMeta.event_name,
      guest_id: assignment.guest_id,
      full_name: fullName,
      email: guest?.email || null,
      invite_token: guest?.invite_token ?? null,
      preferred_language: guest?.preferred_language ?? null,
      table_name: assignment.table_id ? (tableNameById.get(assignment.table_id) || 'Unassigned') : 'Unassigned',
      seat_index: assignment.seat_index ?? null,
      checked_in_at: assignment.checked_in_at ?? null,
      rsvp_status: guest?.rsvp_status ?? null,
    };
  });
}

export function loadDemoSeatingLookupRows(itineraryEventId?: string | null): SeatingLookupRow[] {
  const itineraryEvents = loadDemoItineraryEventsFromStorage();
  const lookupEventId = itineraryEventId ?? resolveOperationalEventId({ events: itineraryEvents });
  const eventMeta = itineraryEvents.find((event) => event.id === lookupEventId) ?? null;
  if (!eventMeta) return [];

  const saved = readDemoSeatingState(eventMeta.id);
  const attendingGuests = demoGuests
    .filter((guest) => isAttendingRsvpStatus(guest.rsvp_status))
    .map((guest) => ({
      id: guest.id,
      first_name: guest.first_name ?? null,
      last_name: guest.last_name ?? null,
      name: guest.name ?? null,
      email: guest.email ?? null,
      rsvp_status: guest.rsvp_status,
      invite_token: guest.invite_token ?? null,
      preferred_language: null,
    }));

  return mapSeatingLookupRows(
    saved.assignments
      .filter((assignment) => assignment.is_valid)
      .map((assignment) => ({
        guest_id: assignment.guest_id,
        table_id: assignment.table_id,
        seat_index: assignment.seat_index ?? null,
        checked_in_at: assignment.checked_in_at ?? null,
      })),
    saved.tables.map((table) => ({
      id: table.id,
      table_name: table.table_name,
    })),
    attendingGuests,
    { itinerary_event_id: eventMeta.id, event_name: eventMeta.event_name },
  );
}

export async function loadSeatingLookupRowsForUser(userId: string, itineraryEventId?: string | null): Promise<SeatingLookupRow[]> {
  const activeSite = await resolveActiveSiteForUser(userId);
  const { data: site, error: siteError } = await supabase
    .from('wedding_sites')
    .select('id')
    .eq('id', activeSite?.id ?? '')
    .maybeSingle();
  if (siteError) throw siteError;

  const siteId = site?.id as string | undefined;
  if (!siteId) return [];

  const [itineraryResult, seatingEventsResult] = await Promise.all([
    supabase
      .from('itinerary_events')
      .select('id, event_name, event_date, start_time')
      .eq('wedding_site_id', siteId)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(MAX_SEATING_ITINERARY_EVENTS),
    supabase
      .from('seating_events')
      .select('id, itinerary_event_id')
      .eq('wedding_site_id', siteId)
      .limit(MAX_SEATING_ITINERARY_EVENTS),
  ]);
  if (itineraryResult.error) throw itineraryResult.error;
  if (seatingEventsResult.error) throw seatingEventsResult.error;

  const itineraryEvents = (itineraryResult.data ?? []) as Array<Pick<ItineraryEvent, 'id' | 'event_name' | 'event_date' | 'start_time'>>;
  const lookupEventId = itineraryEventId ?? resolveOperationalEventId({ events: itineraryEvents });
  const eventMeta = itineraryEvents.find((event) => event.id === lookupEventId) ?? null;
  if (!eventMeta) return [];

  const seatingEvent = ((seatingEventsResult.data ?? []) as Array<{ id: string; itinerary_event_id: string | null }>)
    .find((row) => row.itinerary_event_id === eventMeta.id);
  if (!seatingEvent?.id) return [];

  const { data: assignments, error: assignmentsError } = await supabase
    .from('seating_assignments')
    .select(SEATING_LOOKUP_ASSIGNMENT_SELECT)
    .eq('seating_event_id', seatingEvent.id)
    .eq('is_valid', true)
    .order('updated_at', { ascending: false });
  if (assignmentsError) throw assignmentsError;

  const assignmentRows = (assignments || []) as SeatingLookupAssignment[];
  const tableIds = [...new Set(assignmentRows.map((row) => row.table_id).filter((id): id is string => Boolean(id)))].slice(0, MAX_SEATING_LOOKUP_TABLE_IDS);
  const guestIds = [...new Set(assignmentRows.map((row) => row.guest_id).filter(Boolean))].slice(0, MAX_SEATING_LOOKUP_GUEST_IDS);

  const [tablesResult, guestsResult] = await Promise.all([
    tableIds.length > 0
      ? supabase.from('seating_tables').select(SEATING_LOOKUP_TABLE_SELECT).in('id', tableIds)
      : Promise.resolve({ data: [], error: null }),
    guestIds.length > 0
      ? supabase.from('guests').select(SEATING_LOOKUP_GUEST_SELECT).in('id', guestIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (tablesResult.error) throw tablesResult.error;
  if (guestsResult.error) throw guestsResult.error;

  return mapSeatingLookupRows(
    assignmentRows,
    (tablesResult.data || []) as Array<{ id: string; table_name: string | null }>,
    (guestsResult.data || []) as SeatingLookupGuest[],
    { itinerary_event_id: eventMeta.id, event_name: eventMeta.event_name },
  );
}

export async function getOrCreateSeatingEvent(weddingSiteId: string, itineraryEventId: string): Promise<SeatingEvent> {
  const { data, error } = await supabase.rpc('seating_event_get_or_create', {
    p_wedding_site_id: weddingSiteId,
    p_itinerary_event_id: itineraryEventId,
  });
  if (error) throw error;
  return requireRpcRecord<SeatingEvent>(data, 'seating_event_get_or_create');
}

export async function updateSeatingEvent(id: string, updates: Partial<SeatingEvent>): Promise<void> {
  const { error } = await supabase.rpc('seating_event_update', {
    p_seating_event_id: id,
    p_default_table_capacity: updates.default_table_capacity ?? null,
    p_notes: updates.notes ?? null,
  });
  if (error) throw error;
}

export async function loadTables(seatingEventId: string): Promise<SeatingTable[]> {
  const { data, error } = await supabase
    .from('seating_tables')
    .select(SEATING_TABLE_SELECT)
    .eq('seating_event_id', seatingEventId)
    .order('sort_order', { ascending: true })
    .limit(MAX_SEATING_TABLE_ROWS);
  if (error) throw error;
  return (data ?? []) as SeatingTable[];
}

export async function createTable(table: Partial<SeatingTable>): Promise<SeatingTable> {
  const { data, error } = await supabase.rpc('seating_table_write', {
    p_seating_event_id: table.seating_event_id,
    p_table_id: null,
    p_payload: table,
  });
  if (error) throw error;
  return requireRpcRecord<SeatingTable>(data, 'seating_table_write');
}

export async function updateTable(id: string, updates: Partial<SeatingTable>): Promise<void> {
  const { error } = await supabase.rpc('seating_table_write', {
    p_seating_event_id: null,
    p_table_id: id,
    p_payload: updates,
  });
  if (error) throw error;
}

export async function deleteTable(id: string): Promise<void> {
  const { error } = await supabase.rpc('seating_table_delete', {
    p_table_id: id,
  });
  if (error) throw error;
}

export async function loadAssignments(seatingEventId: string): Promise<SeatingAssignment[]> {
  const { data, error } = await supabase
    .from('seating_assignments')
    .select(SEATING_ASSIGNMENT_SELECT)
    .eq('seating_event_id', seatingEventId)
    .limit(MAX_SEATING_ASSIGNMENT_ROWS);
  if (error) throw error;
  return (data ?? []) as SeatingAssignment[];
}

export async function assignGuestToTable(
  seatingEventId: string,
  tableId: string,
  guestId: string,
  seatIndex?: number
): Promise<SeatingAssignment> {
  const { data, error } = await supabase.rpc('seating_assignment_write', {
    p_seating_event_id: seatingEventId,
    p_guest_id: guestId,
    p_payload: {
      table_id: tableId,
      seat_index: seatIndex ?? null,
      is_valid: true,
    },
  });
  if (error) throw error;
  return data as SeatingAssignment;
}

export async function unassignGuest(seatingEventId: string, guestId: string): Promise<void> {
  const { error } = await supabase.rpc('seating_assignment_delete', {
    p_seating_event_id: seatingEventId,
    p_guest_id: guestId,
  });
  if (error) throw error;
}

export async function setGuestCheckedIn(
  seatingEventId: string,
  guestId: string,
  checkedIn: boolean
): Promise<void> {
  const payload = checkedIn
    ? { checked_in_at: new Date().toISOString() }
    : { checked_in_at: null };

  const { error } = await supabase.rpc('seating_assignment_write', {
    p_seating_event_id: seatingEventId,
    p_guest_id: guestId,
    p_payload: payload,
  });

  if (error) throw error;
}

export async function resetSeating(seatingEventId: string): Promise<void> {
  const { error } = await supabase.rpc('seating_assignment_delete', {
    p_seating_event_id: seatingEventId,
    p_guest_id: null,
  });
  if (error) throw error;
}

export async function getEligibleGuests(
  weddingSiteId: string,
  itineraryEventId: string
): Promise<EligibleGuest[]> {
  const { data: allGuests, error } = await supabase
    .from('guests')
    .select(SEATING_ELIGIBLE_GUEST_SELECT)
    .eq('wedding_site_id', weddingSiteId)
    .limit(MAX_SEATING_ELIGIBLE_GUESTS);
  if (error) throw error;
  if (!allGuests) return [];

  const { data: invitations } = await supabase
    .from('event_invitations')
    .select('id, guest_id')
    .eq('event_id', itineraryEventId)
    .limit(MAX_SEATING_EVENT_INVITATIONS);

  const invitationRows = (invitations ?? []) as Array<{ id: string; guest_id: string }>;
  const inviteMap = new Map<string, string>(
    invitationRows.map(inv => [inv.guest_id, inv.id])
  );

  const eventRsvpByInvitationId = new Map<string, boolean | null>();
  if (invitationRows.length > 0 && hasEventRsvpsTable !== false) {
    const { data: eventRsvps, error: eventRsvpError } = await supabase
      .from('event_rsvps')
      .select('event_invitation_id, attending')
      .in('event_invitation_id', invitationRows.map((inv) => inv.id));

    if (eventRsvpError) {
      const msg = (eventRsvpError.message || '').toLowerCase();
      if (msg.includes('event_rsvps') || msg.includes('does not exist') || msg.includes('404') || msg.includes('relation')) {
        hasEventRsvpsTable = false;
      } else {
        throw eventRsvpError;
      }
    } else {
      hasEventRsvpsTable = true;
      (eventRsvps ?? []).forEach((row: { event_invitation_id: string; attending: boolean | null }) => {
        eventRsvpByInvitationId.set(row.event_invitation_id, row.attending ?? null);
      });
    }
  }

  const hasEventInvitations = (invitations ?? []).length > 0;

  return allGuests.map(g => {
    const fullName = (g.name as string | null)
      || `${(g.first_name as string | null) ?? ''} ${(g.last_name as string | null) ?? ''}`.trim()
      || 'Guest';
    const invitationId = inviteMap.get(g.id);
    const eventRsvp = invitationId ? eventRsvpByInvitationId.get(invitationId) : undefined;
    const isInvitedToEvent = !!invitationId;

    const isAttending = deriveGuestEventAttendance({
      hasEventInvitations,
      isInvitedToEvent,
      eventRsvp,
      rsvpStatus: g.rsvp_status,
    });
    const notes = (g.notes as string | null) ?? null;
    const dietaryFields = deriveEligibleGuestDietaryFields(notes);

    return {
      id: g.id,
      full_name: fullName,
      email: g.email,
      rsvp_status: g.rsvp_status,
      household_id: g.household_id,
      group_name: g.group_name,
      is_attending: isAttending,
      is_invited_to_event: hasEventInvitations ? isInvitedToEvent : true,
      event_rsvp_attending: hasEventInvitations ? (eventRsvp ?? null) : undefined,
      meal_choice: null,
      meal_preference: (g.meal_preference as string | null) ?? null,
      dietary_restrictions: null,
      dietary_notes: dietaryFields.dietary_notes,
      allergies: dietaryFields.allergies,
      notes,
    };
  });
}

export async function getEventCounters(
  weddingSiteId: string,
  itineraryEventId: string,
  seatingEventId: string
): Promise<EventCounters> {
  const guests = await getEligibleGuests(weddingSiteId, itineraryEventId);
  const assignments = await loadAssignments(seatingEventId);
  return deriveEventCountersFromGuests(guests, assignments);
}

export async function loadSeatingVersions(seatingEventId: string): Promise<SeatingLayoutVersion[]> {
  const { data, error } = await supabase
    .from('seating_layout_versions')
    .select(SEATING_LAYOUT_VERSION_SELECT)
    .eq('seating_event_id', seatingEventId)
    .order('created_at', { ascending: false })
    .limit(MAX_SEATING_VERSION_ROWS);
  if (error) throw error;
  return (data ?? []) as SeatingLayoutVersion[];
}

export async function createSeatingVersion(input: {
  weddingSiteId: string;
  seatingEventId: string;
  itineraryEventId: string | null;
  label: string;
  tables: SeatingTable[];
  assignments: SeatingAssignment[];
}): Promise<SeatingLayoutVersion> {
  const { data, error } = await supabase.rpc('seating_layout_version_create', {
    p_wedding_site_id: input.weddingSiteId,
    p_seating_event_id: input.seatingEventId,
    p_itinerary_event_id: input.itineraryEventId,
    p_label: input.label,
    p_tables: input.tables,
    p_assignments: input.assignments,
  });
  if (error) throw error;
  return data as SeatingLayoutVersion;
}

export async function markSeatingVersionRestored(versionId: string): Promise<void> {
  const { error } = await supabase.rpc('seating_layout_version_restore', {
    p_version_id: versionId,
    p_restored_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function autoCreateTables(
  seatingEventId: string,
  attendingCount: number,
  capacity: number
): Promise<SeatingTable[]> {
  const tableCount = Math.ceil(attendingCount / capacity);
  const tables: Partial<SeatingTable>[] = [];
  for (let i = 0; i < tableCount; i++) {
    tables.push({
      seating_event_id: seatingEventId,
      table_name: `Table ${i + 1}`,
      capacity,
      sort_order: i,
    });
  }

  const { data, error } = await supabase.rpc('seating_table_bulk_create', {
    p_seating_event_id: seatingEventId,
    p_tables: tables,
  });
  if (error) throw error;
  return requireRpcArray<SeatingTable>(data ?? [], 'seating_table_bulk_create');
}

export async function autoSeatGuests(
  seatingEventId: string,
  tables: SeatingTable[],
  guests: EligibleGuest[]
): Promise<SeatingAssignment[]> {
  const eligibleGuests = guests.filter(g => g.is_attending);
  const existingAssignments = await loadAssignments(seatingEventId);
  const assignedGuestIds = new Set(existingAssignments.map((assignment) => assignment.guest_id));
  const eligibleUnassignedGuests = eligibleGuests.filter((guest) => !assignedGuestIds.has(guest.id));

  if (eligibleUnassignedGuests.length === 0) return [];

  const grouped = new Map<string, EligibleGuest[]>();
  eligibleUnassignedGuests.forEach(g => {
    const key = g.household_id ?? g.group_name ?? g.id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(g);
  });

  const groups = Array.from(grouped.values()).sort((a, b) => b.length - a.length);

  const tableFill = new Map<string, number>(tables.map(t => [t.id, existingAssignments.filter((assignment) => assignment.table_id === t.id).length]));
  const seatUsage = new Map<string, Set<number>>(
    tables.map((table) => [
      table.id,
      new Set(
        existingAssignments
          .filter((assignment) => assignment.table_id === table.id)
          .map((assignment) => assignment.seat_index)
          .filter((seat): seat is number => typeof seat === 'number' && seat > 0),
      ),
    ]),
  );
  const assignments: Array<{ seating_event_id: string; table_id: string; guest_id: string; seat_index: number | null }> = [];

  function nextOpenSeat(tableId: string, capacity: number): number | null {
    const usedSeats = seatUsage.get(tableId) ?? new Set<number>();
    for (let i = 1; i <= capacity; i++) {
      if (!usedSeats.has(i)) {
        usedSeats.add(i);
        seatUsage.set(tableId, usedSeats);
        return i;
      }
    }
    return null;
  }

  for (const group of groups) {
    let bestTable: SeatingTable | null = null;
    let bestSpace = 0;

    for (const table of tables) {
      const used = tableFill.get(table.id) ?? 0;
      const space = table.capacity - used;
      if (space >= group.length && space > bestSpace) {
        bestTable = table;
        bestSpace = space;
      }
    }

    if (!bestTable) {
      for (const member of group) {
        const t = tables.find(t => (tableFill.get(t.id) ?? 0) < t.capacity);
        if (t) {
          assignments.push({
            seating_event_id: seatingEventId,
            table_id: t.id,
            guest_id: member.id,
            seat_index: nextOpenSeat(t.id, t.capacity),
          });
          tableFill.set(t.id, (tableFill.get(t.id) ?? 0) + 1);
        }
      }
    } else {
      for (const member of group) {
        assignments.push({
          seating_event_id: seatingEventId,
          table_id: bestTable.id,
          guest_id: member.id,
          seat_index: nextOpenSeat(bestTable.id, bestTable.capacity),
        });
        tableFill.set(bestTable.id, (tableFill.get(bestTable.id) ?? 0) + 1);
      }
    }
  }

  if (assignments.length === 0) return [];

  const { data, error } = await supabase.rpc('seating_assignment_upsert_many', {
    p_rows: assignments,
  });
  if (error) throw error;
  return (data ?? []) as SeatingAssignment[];
}

export function exportSeatingCSV(
  guests: EligibleGuest[],
  tables: SeatingTable[],
  assignments: SeatingAssignment[],
  eventName: string
): string {
  const tableMap = new Map(tables.map(t => [t.id, t]));
  const assignmentMap = new Map(assignments.map(a => [a.guest_id, a]));

  const rows = [['Event', 'Guest Name', 'Email', 'Household / Group', 'RSVP Status', 'Table', 'Seat', 'Checked In', 'Checked In At', 'Exception Flags']];
  for (const guest of guests) {
    if (!guest.is_attending) continue;
    const assignment = assignmentMap.get(guest.id);
    const table = assignment?.table_id ? tableMap.get(assignment.table_id) : null;
    const exceptionFlags = [
      assignment?.checked_in_at ? 'Already checked in' : null,
      !table ? 'Needs seating' : null,
      isPendingRsvpStatus(guest.rsvp_status) ? 'RSVP unresolved' : null,
    ].filter(Boolean).join('; ');
    rows.push([
      eventName,
      guest.full_name,
      guest.email ?? '',
      guest.household_id ?? guest.group_name ?? '',
      guest.rsvp_status ?? '',
      table?.table_name ?? 'Unassigned',
      assignment?.seat_index != null ? String(assignment.seat_index) : '',
      assignment?.checked_in_at ? 'Yes' : 'No',
      assignment?.checked_in_at ?? '',
      exceptionFlags,
    ]);
  }

  return toSafeCsv(rows);
}

export function exportPlaceCardsCSV(
  guests: EligibleGuest[],
  tables: SeatingTable[],
  assignments: SeatingAssignment[]
): string {
  const tableMap = new Map(tables.map(t => [t.id, t]));
  const assignmentMap = new Map(assignments.map(a => [a.guest_id, a]));

  const rows = [['Name', 'Table Name', 'Table Number']];
  const tableIndex = new Map(tables.map((t, i) => [t.id, i + 1]));

  for (const guest of guests) {
    if (!guest.is_attending) continue;
    const assignment = assignmentMap.get(guest.id);
    const table = assignment?.table_id ? tableMap.get(assignment.table_id) : null;
    rows.push([
      guest.full_name,
      table?.table_name ?? 'Unassigned',
      table ? String(tableIndex.get(table.id) ?? '') : '',
    ]);
  }

  return toSafeCsv(rows);
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function invalidateDriftedAssignments(
  seatingEventId: string,
  itineraryEventId: string,
  weddingSiteId: string
): Promise<number> {
  const guests = await getEligibleGuests(weddingSiteId, itineraryEventId);
  const attendingIds = new Set(guests.filter(g => g.is_attending).map(g => g.id));
  const assignments = await loadAssignments(seatingEventId);

  const invalidIds = assignments
    .filter(a => a.is_valid && !attendingIds.has(a.guest_id))
    .map(a => a.id);

  if (invalidIds.length === 0) return 0;

  await supabase.rpc('seating_assignment_invalidate_many', {
    p_assignment_ids: invalidIds,
  });

  return invalidIds.length;
}
