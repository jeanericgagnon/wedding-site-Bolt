import { supabase } from '../../../lib/supabase';

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
  table_shape?: 'round' | 'rectangle';
  layout_width?: number;
  layout_height?: number;
}

export interface SeatingAssignment {
  id: string;
  seating_event_id: string;
  table_id: string;
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

export async function getWeddingSiteId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('wedding_sites')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  return data?.id ?? null;
}

export async function loadItineraryEvents(weddingSiteId: string): Promise<ItineraryEvent[]> {
  const { data, error } = await supabase
    .from('itinerary_events')
    .select('id, event_name, event_date, start_time, location_name')
    .eq('wedding_site_id', weddingSiteId)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ItineraryEvent[];
}

export async function getOrCreateSeatingEvent(weddingSiteId: string, itineraryEventId: string): Promise<SeatingEvent> {
  const { data: existing } = await supabase
    .from('seating_events')
    .select('*')
    .eq('wedding_site_id', weddingSiteId)
    .eq('itinerary_event_id', itineraryEventId)
    .maybeSingle();
  if (existing) return existing as SeatingEvent;

  const { data, error } = await supabase
    .from('seating_events')
    .insert({ wedding_site_id: weddingSiteId, itinerary_event_id: itineraryEventId })
    .select()
    .single();
  if (error) throw error;
  return data as SeatingEvent;
}

export async function updateSeatingEvent(id: string, updates: Partial<SeatingEvent>): Promise<void> {
  const { error } = await supabase
    .from('seating_events')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function loadTables(seatingEventId: string): Promise<SeatingTable[]> {
  const { data, error } = await supabase
    .from('seating_tables')
    .select('*')
    .eq('seating_event_id', seatingEventId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SeatingTable[];
}

export async function createTable(table: Partial<SeatingTable>): Promise<SeatingTable> {
  const { data, error } = await supabase
    .from('seating_tables')
    .insert(table)
    .select()
    .single();
  if (error) throw error;
  return data as SeatingTable;
}

export async function updateTable(id: string, updates: Partial<SeatingTable>): Promise<void> {
  const { error } = await supabase
    .from('seating_tables')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTable(id: string): Promise<void> {
  const { error } = await supabase.from('seating_tables').delete().eq('id', id);
  if (error) throw error;
}

export async function loadAssignments(seatingEventId: string): Promise<SeatingAssignment[]> {
  const { data, error } = await supabase
    .from('seating_assignments')
    .select('*')
    .eq('seating_event_id', seatingEventId);
  if (error) throw error;
  return (data ?? []) as SeatingAssignment[];
}

export async function assignGuestToTable(
  seatingEventId: string,
  tableId: string,
  guestId: string,
  seatIndex?: number
): Promise<SeatingAssignment> {
  const { data: existing } = await supabase
    .from('seating_assignments')
    .select('id')
    .eq('seating_event_id', seatingEventId)
    .eq('guest_id', guestId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('seating_assignments')
      .update({ table_id: tableId, seat_index: seatIndex ?? null, is_valid: true, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as SeatingAssignment;
  }

  const { data, error } = await supabase
    .from('seating_assignments')
    .insert({ seating_event_id: seatingEventId, table_id: tableId, guest_id: guestId, seat_index: seatIndex ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as SeatingAssignment;
}

export async function unassignGuest(seatingEventId: string, guestId: string): Promise<void> {
  const { error } = await supabase
    .from('seating_assignments')
    .delete()
    .eq('seating_event_id', seatingEventId)
    .eq('guest_id', guestId);
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

  const { error } = await supabase
    .from('seating_assignments')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('seating_event_id', seatingEventId)
    .eq('guest_id', guestId);

  if (error) throw error;
}

export async function resetSeating(seatingEventId: string): Promise<void> {
  const { error } = await supabase
    .from('seating_assignments')
    .delete()
    .eq('seating_event_id', seatingEventId);
  if (error) throw error;
}

export async function getEligibleGuests(
  weddingSiteId: string,
  itineraryEventId: string
): Promise<EligibleGuest[]> {
  const { data: allGuests, error } = await supabase
    .from('guests')
    .select('id, full_name, email, rsvp_status, household_id, group_name')
    .eq('wedding_site_id', weddingSiteId);
  if (error) throw error;
  if (!allGuests) return [];

  const { data: invitations } = await supabase
    .from('event_invitations')
    .select('guest_id, rsvp_status')
    .eq('itinerary_event_id', itineraryEventId);

  const inviteMap = new Map<string, string | null>(
    (invitations ?? []).map(inv => [inv.guest_id, inv.rsvp_status])
  );

  const hasEventInvitations = (invitations ?? []).length > 0;

  return allGuests.map(g => {
    const eventRsvp = inviteMap.get(g.id);
    const isInvitedToEvent = inviteMap.has(g.id);

    let isAttending: boolean;
    if (hasEventInvitations) {
      isAttending = isInvitedToEvent && (eventRsvp === 'attending' || eventRsvp === 'accepted');
    } else {
      isAttending = g.rsvp_status === 'attending' || g.rsvp_status === 'accepted';
    }

    return {
      id: g.id,
      full_name: g.full_name,
      email: g.email,
      rsvp_status: g.rsvp_status,
      household_id: g.household_id,
      group_name: g.group_name,
      is_attending: isAttending,
      is_invited_to_event: hasEventInvitations ? isInvitedToEvent : true,
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

  const validAssignmentGuestIds = new Set(
    assignments.filter(a => a.is_valid).map(a => a.guest_id)
  );

  const invited = guests.filter(g => g.is_invited_to_event).length;
  const attending = guests.filter(g => g.is_attending).length;
  const declined = guests.filter(g => g.rsvp_status === 'declined' || g.rsvp_status === 'not_attending').length;
  const pending = guests.filter(g => !g.rsvp_status || g.rsvp_status === 'pending').length;
  const seated = guests.filter(g => g.is_attending && validAssignmentGuestIds.has(g.id)).length;
  const unassigned = attending - seated;

  return { invited, attending, declined, pending, seated, unassigned: Math.max(0, unassigned) };
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

  const { data, error } = await supabase
    .from('seating_tables')
    .insert(tables)
    .select();
  if (error) throw error;
  return (data ?? []) as SeatingTable[];
}

export async function autoSeatGuests(
  seatingEventId: string,
  tables: SeatingTable[],
  guests: EligibleGuest[]
): Promise<SeatingAssignment[]> {
  const eligibleGuests = guests.filter(g => g.is_attending);

  const grouped = new Map<string, EligibleGuest[]>();
  eligibleGuests.forEach(g => {
    const key = g.household_id ?? g.group_name ?? g.id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(g);
  });

  const groups = Array.from(grouped.values()).sort((a, b) => b.length - a.length);

  const tableFill = new Map<string, number>(tables.map(t => [t.id, 0]));
  const assignments: Array<{ seating_event_id: string; table_id: string; guest_id: string }> = [];

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
          assignments.push({ seating_event_id: seatingEventId, table_id: t.id, guest_id: member.id });
          tableFill.set(t.id, (tableFill.get(t.id) ?? 0) + 1);
        }
      }
    } else {
      for (const member of group) {
        assignments.push({ seating_event_id: seatingEventId, table_id: bestTable.id, guest_id: member.id });
        tableFill.set(bestTable.id, (tableFill.get(bestTable.id) ?? 0) + 1);
      }
    }
  }

  if (assignments.length === 0) return [];

  const { data, error } = await supabase
    .from('seating_assignments')
    .upsert(assignments, { onConflict: 'seating_event_id,guest_id' })
    .select();
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

  const rows = [['Guest Name', 'Email', 'Table', 'Seat', 'Checked In', 'Event']];
  for (const guest of guests) {
    if (!guest.is_attending) continue;
    const assignment = assignmentMap.get(guest.id);
    const table = assignment ? tableMap.get(assignment.table_id) : null;
    rows.push([
      guest.full_name,
      guest.email ?? '',
      table?.table_name ?? 'Unassigned',
      assignment?.seat_index != null ? String(assignment.seat_index) : '',
      assignment?.checked_in_at ? 'Yes' : 'No',
      eventName,
    ]);
  }

  return rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
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
    const table = assignment ? tableMap.get(assignment.table_id) : null;
    rows.push([
      guest.full_name,
      table?.table_name ?? 'Unassigned',
      table ? String(tableIndex.get(table.id) ?? '') : '',
    ]);
  }

  return rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
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

  await supabase
    .from('seating_assignments')
    .update({ is_valid: false })
    .in('id', invalidIds);

  return invalidIds.length;
}
