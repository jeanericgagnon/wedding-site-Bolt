import { resolveActiveSiteForUser } from '../../../lib/activeSite';
import type { PlannerAccessRole, PlannerPermissionKey } from '../../../lib/plannerAccess';
import { supabase } from '../../../lib/supabase';
import type { GuestLiteForCoordinator } from '../../../lib/coordinatorTypes';
import type {
  CoordinatorEventHandoff,
  CoordinatorIssueLog,
  CoordinatorTableLite,
  EventLite,
  QnaItem,
} from './coordinatorDashboardTypes';

const COORDINATOR_GUEST_SELECT = 'id, first_name, last_name, name, rsvp_status, household_id, group_name, checked_in_at' as const;
const COORDINATOR_EVENT_SELECT = 'id, event_name, start_time' as const;
const COORDINATOR_EVENT_INVITATION_SELECT = 'event_id, guest_id' as const;
const COORDINATOR_SEATING_EVENT_SELECT = 'id, itinerary_event_id' as const;
const COORDINATOR_SEATING_TABLE_SELECT = 'id, seating_event_id, table_name, sort_order' as const;
const COORDINATOR_SEATING_ASSIGNMENT_SELECT = 'seating_event_id, guest_id, table_id, checked_in_at, is_valid' as const;
const COORDINATOR_QNA_SELECT = 'id, question, answer, status, created_at' as const;
const COORDINATOR_HANDOFF_SELECT = 'id, itinerary_event_id, handoff_status, lead_name, support_name, note, updated_at' as const;
const COORDINATOR_ISSUE_SELECT = 'id, guest_id, itinerary_event_id, issue_type, status, title, note, assigned_to, replacement_name, replacement_party_size, table_id, table_name, metadata, created_at, updated_at' as const;
export const MAX_COORDINATOR_GUESTS = 2000;
export const MAX_COORDINATOR_EVENTS = 200;
export const MAX_COORDINATOR_EVENT_INVITATIONS = 10000;
export const MAX_COORDINATOR_SEATING_EVENTS = 200;
export const MAX_COORDINATOR_SEATING_TABLES = 2000;
export const MAX_COORDINATOR_SEATING_ASSIGNMENTS = 10000;
export const MAX_COORDINATOR_QNA_ROWS = 30;
export const MAX_COORDINATOR_HANDOFF_ROWS = 200;
export const MAX_COORDINATOR_ISSUE_ROWS = 200;

type CoordinatorSeatingEventRow = {
  id: string;
  itinerary_event_id: string;
};

type CoordinatorSeatingTableRow = {
  id: string;
  seating_event_id: string;
  table_name: string | null;
  sort_order: number | null;
};

type CoordinatorSeatingAssignmentRow = {
  seating_event_id: string;
  guest_id: string;
  table_id: string | null;
  checked_in_at: string | null;
  is_valid: boolean;
};

export interface CoordinatorBootstrapData {
  siteId: string | null;
  role: PlannerAccessRole;
  permissions: PlannerPermissionKey[] | null;
  guests: GuestLiteForCoordinator[];
  events: EventLite[];
  eventGuestIds: Record<string, Set<string>>;
  eventSeatingConfiguredIds: Set<string>;
  eventSeatingEventIds: Record<string, string>;
  eventSeatingTables: Record<string, CoordinatorTableLite[]>;
  eventHandoffs: CoordinatorEventHandoff[];
  issueLogs: CoordinatorIssueLog[];
  qnaItems: QnaItem[];
}

export interface CoordinatorAlertMessageInput {
  siteId: string;
  subject: string;
  body: string;
  channel: 'email' | 'sms';
  audience: string;
  recipientCount: number;
  status: 'queued' | 'scheduled';
  scheduledFor: string | null;
}

export interface CoordinatorEventHandoffWriteInput {
  siteId: string;
  itineraryEventId: string;
  handoffStatus: CoordinatorEventHandoff['handoff_status'];
  leadName: string | null;
  supportName: string | null;
  note: string | null;
}

export interface CoordinatorIssueLogWriteInput {
  siteId: string;
  issueId?: string | null;
  guestId: string | null;
  itineraryEventId: string | null;
  issueType: CoordinatorIssueLog['issue_type'];
  status: CoordinatorIssueLog['status'];
  title: string;
  note: string | null;
  assignedTo: string | null;
  replacementName: string | null;
  replacementPartySize: number | null;
  tableId: string | null;
  tableName: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function refreshCoordinatorSession(): Promise<void> {
  await supabase.auth.refreshSession();
}

export function buildCoordinatorEventGuestMap(
  events: EventLite[],
  inviteRows: Array<{ event_id: string; guest_id: string }> | null | undefined,
): Record<string, Set<string>> {
  const inviteMap: Record<string, Set<string>> = {};
  events.forEach((event) => { inviteMap[event.id] = new Set<string>(); });
  (inviteRows ?? []).forEach((row) => {
    if (!inviteMap[row.event_id]) inviteMap[row.event_id] = new Set<string>();
    inviteMap[row.event_id].add(row.guest_id);
  });
  return inviteMap;
}

export async function loadCoordinatorBootstrapData(userId: string): Promise<CoordinatorBootstrapData> {
  const activeSite = await resolveActiveSiteForUser(userId);
  const siteId = activeSite?.id ?? null;
  if (!siteId) {
    return {
      siteId: null,
      role: 'owner',
      permissions: null,
      guests: [],
      events: [],
      eventGuestIds: {},
      eventSeatingConfiguredIds: new Set<string>(),
      eventSeatingEventIds: {},
      eventSeatingTables: {},
      eventHandoffs: [],
      issueLogs: [],
      qnaItems: [],
    };
  }

  const [{ data: guestsData, error: guestsError }, { data: eventsData, error: eventsError }] = await Promise.all([
    supabase
      .from('guests')
      .select(COORDINATOR_GUEST_SELECT)
      .eq('wedding_site_id', siteId)
      .limit(MAX_COORDINATOR_GUESTS),
    supabase
      .from('itinerary_events')
      .select(COORDINATOR_EVENT_SELECT)
      .eq('wedding_site_id', siteId)
      .order('start_time', { ascending: true })
      .limit(MAX_COORDINATOR_EVENTS),
  ]);
  if (guestsError) throw guestsError;
  if (eventsError) throw eventsError;

  const events = (eventsData ?? []) as EventLite[];
  const eventIds = events.map((event) => event.id);
  const [
    { data: qnaData, error: qnaError },
    { data: inviteData, error: inviteError },
    { data: seatingEventsData, error: seatingEventsError },
    { data: handoffData, error: handoffError },
    { data: issueData, error: issueError },
  ] = await Promise.all([
    supabase
      .from('guest_qna_items')
      .select(COORDINATOR_QNA_SELECT)
      .eq('wedding_site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(MAX_COORDINATOR_QNA_ROWS),
    eventIds.length > 0
      ? supabase
        .from('event_invitations')
        .select(COORDINATOR_EVENT_INVITATION_SELECT)
        .in('event_id', eventIds)
        .limit(MAX_COORDINATOR_EVENT_INVITATIONS)
      : Promise.resolve({ data: [], error: null }),
    eventIds.length > 0
      ? supabase
        .from('seating_events')
        .select(COORDINATOR_SEATING_EVENT_SELECT)
        .in('itinerary_event_id', eventIds)
        .limit(MAX_COORDINATOR_SEATING_EVENTS)
      : Promise.resolve({ data: [], error: null }),
    eventIds.length > 0
      ? supabase
        .from('coordinator_event_handoffs')
        .select(COORDINATOR_HANDOFF_SELECT)
        .eq('wedding_site_id', siteId)
        .in('itinerary_event_id', eventIds)
        .limit(MAX_COORDINATOR_HANDOFF_ROWS)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('coordinator_issue_logs')
      .select(COORDINATOR_ISSUE_SELECT)
      .eq('wedding_site_id', siteId)
      .order('updated_at', { ascending: false })
      .limit(MAX_COORDINATOR_ISSUE_ROWS),
  ]);

  if (qnaError) throw qnaError;
  if (inviteError) throw inviteError;
  if (seatingEventsError) throw seatingEventsError;
  if (handoffError) throw handoffError;
  if (issueError) throw issueError;

  const inviteRows = (inviteData ?? []) as Array<{ event_id: string; guest_id: string }>;
  const seatingEvents = (seatingEventsData ?? []) as CoordinatorSeatingEventRow[];
  const seatingEventIds = seatingEvents.map((event) => event.id);

  const [
    { data: seatingTablesData, error: seatingTablesError },
    { data: seatingAssignmentsData, error: seatingAssignmentsError },
  ] = await Promise.all([
    seatingEventIds.length > 0
      ? supabase
        .from('seating_tables')
        .select(COORDINATOR_SEATING_TABLE_SELECT)
        .in('seating_event_id', seatingEventIds)
        .limit(MAX_COORDINATOR_SEATING_TABLES)
      : Promise.resolve({ data: [], error: null }),
    seatingEventIds.length > 0
      ? supabase
        .from('seating_assignments')
        .select(COORDINATOR_SEATING_ASSIGNMENT_SELECT)
        .in('seating_event_id', seatingEventIds)
        .limit(MAX_COORDINATOR_SEATING_ASSIGNMENTS)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (seatingTablesError) throw seatingTablesError;
  if (seatingAssignmentsError) throw seatingAssignmentsError;

  const seatingTables = (seatingTablesData ?? []) as CoordinatorSeatingTableRow[];
  const seatingAssignments = (seatingAssignmentsData ?? []) as CoordinatorSeatingAssignmentRow[];
  const itineraryEventIdBySeatingEventId = new Map(seatingEvents.map((event) => [event.id, event.itinerary_event_id]));
  const tableNameById = new Map(seatingTables.map((table) => [table.id, table.table_name || 'Unassigned']));
  const eventSeatingEventIds = seatingEvents.reduce<Record<string, string>>((map, event) => {
    map[event.itinerary_event_id] = event.id;
    return map;
  }, {});
  const eventSeatingTables = seatingEvents.reduce<Record<string, CoordinatorTableLite[]>>((map, event) => {
    map[event.itinerary_event_id] = seatingTables
      .filter((table) => table.seating_event_id === event.id)
      .sort((a, b) => {
        const sortA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
        const sortB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
        if (sortA !== sortB) return sortA - sortB;
        return (a.table_name ?? '').localeCompare(b.table_name ?? '');
      });
    return map;
  }, {});
  const tableCountBySeatingEventId = seatingTables.reduce((map, table) => {
    map.set(table.seating_event_id, (map.get(table.seating_event_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const assignmentCountBySeatingEventId = seatingAssignments.reduce((map, assignment) => {
    map.set(assignment.seating_event_id, (map.get(assignment.seating_event_id) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const eventSeatingConfiguredIds = new Set<string>();

  seatingEvents.forEach((event) => {
    if ((tableCountBySeatingEventId.get(event.id) ?? 0) > 0 || (assignmentCountBySeatingEventId.get(event.id) ?? 0) > 0) {
      eventSeatingConfiguredIds.add(event.itinerary_event_id);
    }
  });

  const eventArrivalsByGuestId = seatingAssignments.reduce((map, assignment) => {
    if (assignment.is_valid === false) return map;
    const itineraryEventId = itineraryEventIdBySeatingEventId.get(assignment.seating_event_id);
    if (!itineraryEventId) return map;
    const current = map.get(assignment.guest_id) ?? {};
    current[itineraryEventId] = {
      seating_event_id: assignment.seating_event_id,
      table_id: assignment.table_id ?? null,
      table_name: assignment.table_id ? (tableNameById.get(assignment.table_id) || 'Unassigned') : 'Unassigned',
      checked_in_at: assignment.checked_in_at ?? null,
      is_seated: Boolean(assignment.table_id),
    };
    map.set(assignment.guest_id, current);
    return map;
  }, new Map<string, GuestLiteForCoordinator['event_arrivals']>());

  return {
    siteId,
    role: activeSite?.role ?? 'owner',
    permissions: activeSite?.permissions ?? null,
    guests: ((guestsData ?? []) as GuestLiteForCoordinator[]).map((guest) => ({
      ...guest,
      door_route: guest.door_route ?? null,
      event_arrivals: eventArrivalsByGuestId.get(guest.id) ?? {},
    })),
    events,
    eventGuestIds: buildCoordinatorEventGuestMap(events, inviteRows),
    eventSeatingConfiguredIds,
    eventSeatingEventIds,
    eventSeatingTables,
    eventHandoffs: (handoffData ?? []) as CoordinatorEventHandoff[],
    issueLogs: (issueData ?? []) as CoordinatorIssueLog[],
    qnaItems: (qnaData ?? []) as QnaItem[],
  };
}

export async function createCoordinatorAlertMessage(input: CoordinatorAlertMessageInput): Promise<void> {
  const { error } = await supabase.rpc('coordinator_alert_message_write', {
    p_wedding_site_id: input.siteId,
    p_payload: {
      subject: input.subject.trim(),
      body: input.body.trim(),
      channel: input.channel,
      audience_filter: input.audience,
      recipient_filter: { audience: input.audience, recipient_count: input.recipientCount },
      recipient_count: input.recipientCount,
      status: input.status,
      sent_at: input.scheduledFor ? null : new Date().toISOString(),
      scheduled_for: input.scheduledFor,
    },
  });
  if (error) throw error;
}

export async function updateCoordinatorGuestCheckIn(args: {
  siteId: string;
  guestId: string;
  checkedInAt: string | null;
  itineraryEventId: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('coordinator_guest_event_checkin_write', {
    p_site_id: args.siteId,
    p_guest_id: args.guestId,
    p_checked_in_at: args.checkedInAt,
    p_itinerary_event_id: args.itineraryEventId,
  });
  if (error) throw error;
}

export async function createCoordinatorQnaQuestion(siteId: string, question: string): Promise<QnaItem> {
  const { data, error } = await supabase.rpc('coordinator_qna_write', {
    p_site_id: siteId,
    p_item_id: null,
    p_payload: { question, status: 'new', source: 'manual' },
  });
  if (error) throw error;
  return data as QnaItem;
}

export async function updateCoordinatorQnaAnswer(id: string, item: Pick<QnaItem, 'answer' | 'status'>): Promise<void> {
  const { error } = await supabase.rpc('coordinator_qna_write', {
    p_site_id: null,
    p_item_id: id,
    p_payload: {
      answer: item.answer ?? null,
      status: item.status,
    },
  });
  if (error) throw error;
}

export async function upsertCoordinatorEventHandoff(input: CoordinatorEventHandoffWriteInput): Promise<CoordinatorEventHandoff> {
  const { data, error } = await supabase.rpc('coordinator_event_handoff_write', {
    p_site_id: input.siteId,
    p_itinerary_event_id: input.itineraryEventId,
    p_payload: {
      handoff_status: input.handoffStatus,
      lead_name: input.leadName,
      support_name: input.supportName,
      note: input.note,
    },
  });
  if (error) throw error;
  return data as CoordinatorEventHandoff;
}

export async function upsertCoordinatorIssueLog(input: CoordinatorIssueLogWriteInput): Promise<CoordinatorIssueLog> {
  const { data, error } = await supabase.rpc('coordinator_issue_log_write', {
    p_site_id: input.issueId ? null : input.siteId,
    p_issue_id: input.issueId ?? null,
    p_payload: {
      guest_id: input.guestId,
      itinerary_event_id: input.itineraryEventId,
      issue_type: input.issueType,
      status: input.status,
      title: input.title,
      note: input.note,
      assigned_to: input.assignedTo,
      replacement_name: input.replacementName,
      replacement_party_size: input.replacementPartySize,
      table_id: input.tableId,
      table_name: input.tableName,
      metadata: input.metadata ?? {},
    },
  });
  if (error) throw error;
  return data as CoordinatorIssueLog;
}

export async function updateCoordinatorGuestSeatAssignment(args: {
  siteId: string;
  guestId: string;
  itineraryEventId: string;
  tableId: string | null;
}): Promise<{ seatingEventId: string }> {
  const { data: seatingEvent, error: seatingEventError } = await supabase.rpc('seating_event_get_or_create', {
    p_wedding_site_id: args.siteId,
    p_itinerary_event_id: args.itineraryEventId,
  });
  if (seatingEventError) throw seatingEventError;

  const seatingEventId = (seatingEvent as { id?: string } | null)?.id;
  if (!seatingEventId) throw new Error('Missing seating event id');

  const { error } = await supabase.rpc('seating_assignment_write', {
    p_seating_event_id: seatingEventId,
    p_guest_id: args.guestId,
    p_payload: {
      table_id: args.tableId,
      is_valid: true,
    },
  });
  if (error) throw error;

  return { seatingEventId };
}
