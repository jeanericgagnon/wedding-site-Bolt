import { supabase } from '../../../lib/supabase';
import { resolveActiveSiteForUser } from '../../../lib/activeSite';
import { resolvePublicSiteSlugFromRow } from '../../../lib/publicSiteSlug';
import { deriveInviteEvents, type RsvpSeedEvent } from '../../../lib/rsvpEventFallback';
import type { PlannerAccessRole, PlannerPermissionKey } from '../../../lib/plannerAccess';
import {
  deleteEventRsvpByInvitationId,
  deleteEventRsvpsByInvitationIds,
  getEventRsvpSnapshotsByInvitationIds,
  restoreEventRsvpSnapshots,
  type EventRsvpSnapshot,
} from '../../../lib/eventRsvpCleanup';
import type { GuestAuditEntry, GuestWithRSVP, ItineraryEvent, RSVPQuestionSetting, RsvpConflict, WeddingSiteInfo } from './guestDashboardTypes';

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
export const GUEST_SITE_SETTINGS_SELECT = 'id, couple_name_1, couple_name_2, wedding_date, venue_name, venue_address, site_url, site_slug, rsvp_custom_questions, rsvp_meal_config, reminder_cadence_days, auto_reminders_enabled';
export const GUEST_CONFLICT_SELECT = 'id, guest_id, conflict_code, message, severity, created_at, resolved, resolved_at';
export const GUEST_ITINERARY_EVENT_SELECT = 'id, event_name, event_date, start_time, location_name';
export const GUEST_ITINERARY_SITE_SELECT = 'wedding_data';
export const GUEST_EVENT_INVITATION_SELECT = 'event_id, guest_id';
export const GUEST_AUDIT_SELECT = 'id, guest_id, action, changed_at, changed_by, old_data, new_data';
export const GUEST_SITE_SLUG_SELECT = 'site_slug';
export const MAX_GUEST_DASHBOARD_ROWS = 5000;
export const MAX_GUEST_RSVP_LOOKUP_IDS = 5000;
export const MAX_GUEST_BULK_OPERATION_IDS = 5000;
export const MAX_GUEST_BULK_INVITATION_ROWS = 10000;
export const MAX_GUEST_RSVP_CONFLICT_ROWS = 20;
export const MAX_GUEST_RSVP_CONFLICT_HISTORY_ROWS = 500;
export const MAX_GUEST_ITINERARY_FILTER_EVENTS = 200;
export const MAX_GUEST_ITINERARY_FILTER_INVITATIONS = 10000;
export const MAX_GUEST_AUDIT_ROWS = 20;
export const MAX_GUEST_DRAWER_EVENTS = 200;
export const MAX_GUEST_DRAWER_INVITATIONS = 10000;
export const MAX_GUEST_DRAWER_AUDIT_ROWS = 12;

const EVENT_INVITATION_ROLLBACK_SELECT = 'id, event_id';
const GUEST_ID_SELECT = 'id';
const IMPORTED_GUEST_SELECT = 'id, first_name, last_name, name, email';
const DEFAULT_RSVP_MEAL_OPTIONS = ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'];

function requireRpcGuestId(data: unknown, functionName: string): string {
  if (!data || typeof data !== 'object' || typeof (data as { id?: unknown }).id !== 'string') {
    throw new Error(`${functionName} returned an invalid guest row`);
  }

  return (data as { id: string }).id;
}

async function runGuestBulkPatch(
  weddingSiteId: string,
  guestIds: string[],
  patch: Record<string, unknown>,
): Promise<void> {
  if (guestIds.length === 0) return;
  const scopedGuestIds = guestIds.slice(0, MAX_GUEST_BULK_OPERATION_IDS);
  const { error } = await supabase.rpc('guest_dashboard_guest_bulk_patch', {
    p_wedding_site_id: weddingSiteId,
    p_guest_ids: scopedGuestIds,
    p_payload: patch,
  });

  if (error) throw error;
}

export async function refreshGuestDashboardSession(): Promise<void> {
  await supabase.auth.refreshSession();
}

export async function resolveGuestDashboardSiteId(userId: string): Promise<string | null> {
  const activeSite = await resolveActiveSiteForUser(userId);
  return activeSite?.id ?? null;
}

export interface GuestDashboardSiteSettingsSnapshot {
  activeSiteId: string | null;
  role: PlannerAccessRole;
  permissions: PlannerPermissionKey[] | null;
  siteInfo: WeddingSiteInfo | null;
  questions: RSVPQuestionSetting[];
  mealEnabled: boolean;
  mealOptions: string[];
  reminderCadenceDays: 1 | 3 | 7 | null;
  autoRemindersEnabled: boolean;
}

export interface GuestDashboardRecordsSnapshot {
  guests: GuestWithRSVP[];
  conflicts: RsvpConflict[];
  conflictHistory: RsvpConflict[];
}

export interface GuestDashboardItineraryFiltersSnapshot {
  itineraryEvents: ItineraryEvent[];
  filterEvents: ItineraryEvent[];
  eventInviteGuestMap: Map<string, Set<string>>;
}

export interface GuestItineraryDrawerSnapshot {
  events: ItineraryEvent[];
  guestEventIds: Set<string>;
  auditEntries: GuestAuditEntry[];
}

export type AssistedRsvpStatus = 'confirmed' | 'declined';
export type AssistedRsvpSource = 'phone' | 'text' | 'family' | 'in-person';

export interface SaveAssistedGuestRsvpInput {
  guest: GuestWithRSVP;
  status: AssistedRsvpStatus;
  source: AssistedRsvpSource;
  notes: string;
}

export interface SaveAssistedGuestRsvpResult {
  recordedAt: string;
  nextNotes: string;
}

export interface PersistGuestDashboardRsvpConfigInput {
  weddingSiteId: string;
  questions: RSVPQuestionSetting[];
  mealEnabled: boolean;
  mealOptions: string[];
}

export async function loadGuestDashboardSiteSettings(userId: string): Promise<GuestDashboardSiteSettingsSnapshot> {
  const activeSite = await resolveActiveSiteForUser(userId);
  const activeSiteId = activeSite?.id ?? null;
  const role = activeSite?.role ?? 'owner';
  const permissions = activeSite?.permissions ?? null;

  if (!activeSiteId) {
    return {
      activeSiteId: null,
      role,
      permissions,
      siteInfo: null,
      questions: [],
      mealEnabled: true,
      mealOptions: [...DEFAULT_RSVP_MEAL_OPTIONS],
      reminderCadenceDays: null,
      autoRemindersEnabled: false,
    };
  }

  const { data, error } = await supabase
    .from('wedding_sites')
    .select(GUEST_SITE_SETTINGS_SELECT)
    .eq('id', activeSiteId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return {
      activeSiteId: null,
      role,
      permissions,
      siteInfo: null,
      questions: [],
      mealEnabled: true,
      mealOptions: [...DEFAULT_RSVP_MEAL_OPTIONS],
      reminderCadenceDays: null,
      autoRemindersEnabled: false,
    };
  }

  const loadedQuestions = Array.isArray((data as { rsvp_custom_questions?: unknown }).rsvp_custom_questions)
    ? ((data as { rsvp_custom_questions?: unknown[] }).rsvp_custom_questions || [])
    : [];
  const questions = loadedQuestions
    .map((q) => q as Partial<RSVPQuestionSetting>)
    .filter((q) => typeof q?.id === 'string' && typeof q?.label === 'string')
    .map((q) => ({
      id: q.id as string,
      label: (q.label as string) || '',
      type: (q.type as RSVPQuestionSetting['type']) || 'short_text',
      required: !!q.required,
      appliesTo: (q.appliesTo as RSVPQuestionSetting['appliesTo']) || 'all',
      options: Array.isArray(q.options) ? q.options.filter((x): x is string => typeof x === 'string') : [],
    }));

  const mealCfg = (data as { rsvp_meal_config?: unknown }).rsvp_meal_config as { enabled?: unknown; options?: unknown } | undefined;
  const mealEnabled = typeof mealCfg?.enabled === 'boolean' ? mealCfg.enabled : true;
  const mealOptions = Array.isArray(mealCfg?.options)
    ? (mealCfg.options as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : [...DEFAULT_RSVP_MEAL_OPTIONS];
  const cadence = Number((data as { reminder_cadence_days?: unknown }).reminder_cadence_days);

  return {
    activeSiteId,
    role,
    permissions,
    siteInfo: {
      id: data.id,
      couple_name_1: data.couple_name_1 ?? '',
      couple_name_2: data.couple_name_2 ?? '',
      wedding_date: data.wedding_date ?? null,
      venue_name: data.venue_name ?? null,
      venue_address: data.venue_address ?? null,
      site_url: data.site_url ?? null,
      site_slug: (data as { site_slug?: string | null }).site_slug ?? null,
    },
    questions,
    mealEnabled,
    mealOptions,
    reminderCadenceDays: [1, 3, 7].includes(cadence) ? (cadence as 1 | 3 | 7) : null,
    autoRemindersEnabled: Boolean((data as { auto_reminders_enabled?: unknown }).auto_reminders_enabled),
  };
}

export async function persistGuestDashboardRsvpConfig(input: PersistGuestDashboardRsvpConfigInput): Promise<void> {
  const { error } = await supabase.rpc('guest_dashboard_persist_rsvp_config', {
    p_wedding_site_id: input.weddingSiteId,
    p_questions: input.questions,
    p_meal_enabled: input.mealEnabled,
    p_meal_options: input.mealOptions,
  });

  if (error) throw error;
}

export async function loadGuestDashboardSnapshot(weddingSiteId: string): Promise<GuestDashboardRecordsSnapshot> {
  const { data: guestsData, error: guestsError } = await supabase
    .from('guests')
    .select('id, first_name, last_name, name, email, phone, plus_one_allowed, plus_one_name, children_allowed, max_children, max_additional_guests, invited_to_ceremony, invited_to_reception, invite_token, rsvp_status, rsvp_received_at, checked_in_at, checkin_notes, thank_you_sent_at, thank_you_notes, household_id, group_name, notes, mailing_address_line1, mailing_address_line2, mailing_city, mailing_state, mailing_postal_code, mailing_country')
    .eq('wedding_site_id', weddingSiteId)
    .order('created_at', { ascending: false })
    .limit(MAX_GUEST_DASHBOARD_ROWS);

  if (guestsError) throw guestsError;

  const guestIds = (guestsData ?? []).map((g) => g.id);
  const windowStartIso = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString();
  const [rsvpsData, { data: conflictsData, error: conflictsError }, { data: conflictHistoryData, error: conflictHistoryError }] = await Promise.all([
    fetchGuestRsvps(guestIds),
    supabase
      .from('rsvp_conflicts')
      .select(GUEST_CONFLICT_SELECT)
      .eq('wedding_site_id', weddingSiteId)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(MAX_GUEST_RSVP_CONFLICT_ROWS),
    supabase
      .from('rsvp_conflicts')
      .select(GUEST_CONFLICT_SELECT)
      .eq('wedding_site_id', weddingSiteId)
      .gte('created_at', windowStartIso)
      .order('created_at', { ascending: false })
      .limit(MAX_GUEST_RSVP_CONFLICT_HISTORY_ROWS),
  ]);

  if (conflictsError) throw conflictsError;
  if (conflictHistoryError) throw conflictHistoryError;

  const guests = ((guestsData ?? []).map((guest) => ({
    ...guest,
    rsvp: (rsvpsData as Array<{ guest_id: string }>).find((r) => r.guest_id === guest.id),
  })) as unknown[]) as GuestWithRSVP[];

  return {
    guests,
    conflicts: (conflictsData ?? []) as RsvpConflict[],
    conflictHistory: (conflictHistoryData ?? []) as RsvpConflict[],
  };
}

export async function resolveGuestDashboardConflict(conflictId: string, resolvedAt: string): Promise<void> {
  const { error } = await supabase
    .from('rsvp_conflicts')
    .update({ resolved: true, resolved_at: resolvedAt })
    .eq('id', conflictId);

  if (error) throw error;
}

export async function resolveGuestDashboardConflicts(conflictIds: string[], resolvedAt: string): Promise<void> {
  const { error } = await supabase
    .from('rsvp_conflicts')
    .update({ resolved: true, resolved_at: resolvedAt })
    .in('id', conflictIds);

  if (error) throw error;
}

export async function loadGuestDashboardItineraryFilters(weddingSiteId: string): Promise<GuestDashboardItineraryFiltersSnapshot> {
  const [eventsRes, siteRes] = await Promise.all([
    supabase
      .from('itinerary_events')
      .select(GUEST_ITINERARY_EVENT_SELECT)
      .eq('wedding_site_id', weddingSiteId)
      .order('event_date', { ascending: true })
      .limit(MAX_GUEST_ITINERARY_FILTER_EVENTS),
    supabase
      .from('wedding_sites')
      .select(GUEST_ITINERARY_SITE_SELECT)
      .eq('id', weddingSiteId)
      .maybeSingle(),
  ]);

  if (eventsRes.error) throw eventsRes.error;
  if (siteRes.error) throw siteRes.error;

  const seededEvents = (((siteRes.data?.wedding_data as { meta?: { rsvpEventSeeds?: RsvpSeedEvent[] } } | null)?.meta?.rsvpEventSeeds) ?? []);
  const itineraryEvents = (eventsRes.data ?? []) as ItineraryEvent[];
  const eventIds = itineraryEvents.map((event) => event.id);

  const invitesRes = eventIds.length > 0
    ? await supabase
        .from('event_invitations')
        .select(GUEST_EVENT_INVITATION_SELECT)
        .in('event_id', eventIds)
        .limit(MAX_GUEST_ITINERARY_FILTER_INVITATIONS)
    : { data: [], error: null };

  if (invitesRes.error) throw invitesRes.error;

  const eventInviteGuestMap = new Map<string, Set<string>>();
  ((invitesRes.data ?? []) as Array<{ event_id: string; guest_id: string }>).forEach((row) => {
    const set = eventInviteGuestMap.get(row.event_id) ?? new Set<string>();
    set.add(row.guest_id);
    eventInviteGuestMap.set(row.event_id, set);
  });

  return {
    itineraryEvents,
    filterEvents: deriveInviteEvents(itineraryEvents, seededEvents) as ItineraryEvent[],
    eventInviteGuestMap,
  };
}

export async function loadGuestDashboardRsvpAuditFeed(weddingSiteId: string): Promise<GuestAuditEntry[]> {
  const { data, error } = await supabase
    .from('guest_audit_logs')
    .select(GUEST_AUDIT_SELECT)
    .eq('wedding_site_id', weddingSiteId)
    .order('changed_at', { ascending: false })
    .limit(MAX_GUEST_AUDIT_ROWS);

  if (error) throw error;
  return (data ?? []) as GuestAuditEntry[];
}

export async function loadGuestDashboardSiteSlug(weddingSiteId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('wedding_sites')
    .select(GUEST_SITE_SLUG_SELECT)
    .eq('id', weddingSiteId)
    .single();

  if (error) throw error;
  return (data as { site_slug?: string | null } | null)?.site_slug ?? null;
}

export async function loadGuestDashboardPublicSlug(weddingSiteId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('wedding_sites')
    .select('id, site_slug, site_url')
    .eq('id', weddingSiteId)
    .maybeSingle();

  if (error) throw error;
  return resolvePublicSiteSlugFromRow((data as Record<string, unknown> | null) ?? null);
}

export async function loadGuestItineraryDrawerSnapshot(weddingSiteId: string, guestId: string): Promise<GuestItineraryDrawerSnapshot> {
  const [eventsResult, invitesResult, auditResult] = await Promise.all([
    supabase
      .from('itinerary_events')
      .select(GUEST_ITINERARY_EVENT_SELECT)
      .eq('wedding_site_id', weddingSiteId)
      .order('event_date', { ascending: true })
      .limit(MAX_GUEST_DRAWER_EVENTS),
    supabase
      .from('event_invitations')
      .select('event_id')
      .eq('guest_id', guestId)
      .limit(MAX_GUEST_DRAWER_INVITATIONS),
    supabase
      .from('guest_audit_logs')
      .select('id, action, changed_at, changed_by, old_data, new_data')
      .eq('guest_id', guestId)
      .order('changed_at', { ascending: false })
      .limit(MAX_GUEST_DRAWER_AUDIT_ROWS),
  ]);

  if (eventsResult.error) throw eventsResult.error;
  if (invitesResult.error) throw invitesResult.error;
  if (auditResult.error) throw auditResult.error;

  return {
    events: (eventsResult.data ?? []) as ItineraryEvent[],
    guestEventIds: new Set((invitesResult.data ?? []).map((row: { event_id: string }) => row.event_id)),
    auditEntries: (auditResult.data ?? []) as GuestAuditEntry[],
  };
}

export async function saveAssistedGuestRsvp(input: SaveAssistedGuestRsvpInput): Promise<SaveAssistedGuestRsvpResult> {
  const recordedAt = new Date().toISOString();
  const manualTag = `[Manual RSVP source:${input.source} recorded:${recordedAt}]`;
  const nextNotes = [manualTag, input.notes.trim()].filter(Boolean).join(' ');

  const { error } = await supabase.rpc('guest_dashboard_assisted_rsvp_write', {
    p_guest_id: input.guest.id,
    p_status: input.status,
    p_recorded_at: recordedAt,
    p_notes: nextNotes,
  });
  if (error) throw error;

  return { recordedAt, nextNotes };
}

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
  const scopedGuestIds = guestIds.slice(0, MAX_GUEST_RSVP_LOOKUP_IDS);

  const { data, error } = await supabase
    .from('rsvps')
    .select(GUEST_DASHBOARD_RSVP_SELECT)
    .in('guest_id', scopedGuestIds);

  if (error) throw error;
  return data ?? [];
}

export async function createGuest(input: CreateGuestInput): Promise<string> {
  const { data, error } = await supabase.rpc('guest_dashboard_guest_write', {
    p_wedding_site_id: input.weddingSiteId,
    p_guest_id: null,
    p_payload: {
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
    },
  });

  if (error) throw error;
  return requireRpcGuestId(data, 'guest_dashboard_guest_write');
}

export async function updateGuest(input: UpdateGuestInput): Promise<void> {
  const { error } = await supabase.rpc('guest_dashboard_guest_write', {
    p_wedding_site_id: null,
    p_guest_id: input.guestId,
    p_payload: {
      first_name: input.firstName,
      last_name: input.lastName,
      name: input.name,
      email: input.email,
      phone: input.phone,
      plus_one_allowed: input.plusOneAllowed,
      invited_to_ceremony: input.invitedToCeremony,
      invited_to_reception: input.invitedToReception,
    },
  });

  if (error) throw error;
}

export async function deleteGuestById(guestId: string): Promise<void> {
  const { error } = await supabase.rpc('guest_dashboard_guest_delete', {
    p_guest_id: guestId,
  });
  if (error) throw error;
}

export async function insertEventInvitations(rows: EventInvitationRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.rpc('guest_dashboard_event_invitation_insert_many', {
    p_rows: rows,
  });
  if (error) throw error;
}

export async function addGuestEventInvitation(eventId: string, guestId: string): Promise<void> {
  await insertEventInvitations([{ event_id: eventId, guest_id: guestId }]);
}

export async function removeGuestEventInvitation(eventId: string, guestId: string): Promise<void> {
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

  const { error: inviteDeleteError } = await supabase.rpc('guest_dashboard_event_invitation_delete', {
    p_guest_id: guestId,
    p_event_id: eventId,
    p_guest_ids: null,
  });
  if (inviteDeleteError) {
    await restoreEventRsvpSnapshots(eventRsvpSnapshots);
    throw inviteDeleteError;
  }
}

export async function replaceGuestEventInvitations(guestId: string, nextEventIds: string[]): Promise<GuestEventInvitationRollback> {
  const { data: existingInvitationRows, error: existingInvitesError } = await supabase
    .from('event_invitations')
    .select(EVENT_INVITATION_ROLLBACK_SELECT)
    .eq('guest_id', guestId)
    .limit(MAX_GUEST_BULK_INVITATION_ROWS);

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

  const { error: clearInvitesError } = await supabase.rpc('guest_dashboard_event_invitation_delete', {
    p_guest_id: guestId,
    p_event_id: null,
    p_guest_ids: null,
  });
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
    const { error: inviteDeleteError } = await supabase.rpc('guest_dashboard_event_invitation_delete', {
      p_guest_id: guestId,
      p_event_id: null,
      p_guest_ids: null,
    });
    if (inviteDeleteError) throw inviteDeleteError;
  }

  const { error: rsvpDeleteError } = await supabase.rpc('guest_dashboard_rsvp_replace_many', {
    p_rows: [],
    p_guest_ids: [guestId],
  });
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
  const scopedGuestIds = guestIds.slice(0, MAX_GUEST_BULK_OPERATION_IDS);
  const invitationIds: string[] = [];

  if (scopedGuestIds.length > 0) {
    const { data: invitationRows } = await supabase
      .from('event_invitations')
      .select(GUEST_ID_SELECT)
      .in('guest_id', scopedGuestIds)
      .limit(MAX_GUEST_BULK_INVITATION_ROWS);

    invitationIds.push(...((invitationRows ?? []).map((row) => (row as { id: string }).id)));

    if (invitationIds.length > 0) {
      await deleteEventRsvpsByInvitationIds(invitationIds);
    }

    const { error: eventInvitationDeleteError } = await supabase.rpc('guest_dashboard_event_invitation_delete', {
      p_guest_id: null,
      p_event_id: null,
      p_guest_ids: scopedGuestIds,
    });
    if (eventInvitationDeleteError) throw eventInvitationDeleteError;

    const { error: rsvpDeleteError } = await supabase.rpc('guest_dashboard_rsvp_replace_many', {
      p_rows: [],
      p_guest_ids: scopedGuestIds,
    });
    if (rsvpDeleteError) throw rsvpDeleteError;
  }

  const { error } = await supabase.rpc('guest_dashboard_guest_delete_site', {
    p_wedding_site_id: weddingSiteId,
  });
  if (error) throw error;

  return { guestIds, invitationIds };
}

export async function insertImportedGuests(guestRows: Array<Record<string, unknown>>): Promise<Array<{ id: string; first_name: string | null; last_name: string | null; name: string | null; email: string | null }>> {
  const { data, error } = await supabase.rpc('guest_dashboard_import_guests', {
    p_rows: guestRows,
  });

  if (error) throw error;
  return (data ?? []) as Array<{ id: string; first_name: string | null; last_name: string | null; name: string | null; email: string | null }>;
}

export async function updateHouseholdGuestIds(householdId: string, guestIds: string[]): Promise<void> {
  if (guestIds.length === 0) return;
  const scopedGuestIds = guestIds.slice(0, MAX_GUEST_BULK_OPERATION_IDS);
  const { error } = await supabase.rpc('guest_dashboard_guest_bulk_patch', {
    p_wedding_site_id: null,
    p_guest_ids: scopedGuestIds,
    p_payload: { household_id: householdId },
  });

  if (error) throw error;
}

export async function replaceImportedGuestRsvps(rows: Array<{ guest_id: string; attending: boolean; meal_choice: string | null; plus_one_name: string | null; plus_one_count: number; children_count: number; responded_at: string | null }>): Promise<void> {
  if (rows.length === 0) return;

  const { error } = await supabase.rpc('guest_dashboard_rsvp_replace_many', {
    p_rows: rows,
    p_guest_ids: null,
  });
  if (error) throw error;
}

export async function updateGuestForSite(
  weddingSiteId: string,
  guestId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await runGuestBulkPatch(weddingSiteId, [guestId], patch);
}

export async function updateGuestCheckInForSite(
  weddingSiteId: string,
  guestId: string,
  checkedInAt: string | null,
): Promise<void> {
  await runGuestBulkPatch(weddingSiteId, [guestId], { checked_in_at: checkedInAt });
}

export async function updateGuestThankYouSentForSite(
  weddingSiteId: string,
  guestId: string,
  thankYouSentAt: string | null,
): Promise<void> {
  await runGuestBulkPatch(weddingSiteId, [guestId], { thank_you_sent_at: thankYouSentAt });
}

export async function markGuestInvitationSentForSite(
  weddingSiteId: string,
  guestId: string,
  invitationSentAt: string,
): Promise<void> {
  await runGuestBulkPatch(weddingSiteId, [guestId], { invitation_sent_at: invitationSentAt });
}

export async function markGuestInvitationAndReminderSentForSite(
  weddingSiteId: string,
  guestId: string,
  sentAt: string,
): Promise<void> {
  await runGuestBulkPatch(weddingSiteId, [guestId], {
    invitation_sent_at: sentAt,
    reminder_last_sent_at: sentAt,
  });
}

export async function markGuestReminderSentForSite(
  weddingSiteId: string,
  guestId: string,
  reminderSentAt: string,
): Promise<void> {
  await runGuestBulkPatch(weddingSiteId, [guestId], { reminder_last_sent_at: reminderSentAt });
}

export async function markGuestsThankYouSentForSite(
  weddingSiteId: string,
  guestIds: string[],
  thankYouSentAt: string,
): Promise<void> {
  await runGuestBulkPatch(weddingSiteId, guestIds, { thank_you_sent_at: thankYouSentAt });
}

export async function assignGuestsToHouseholdForSite(
  weddingSiteId: string,
  guestIds: string[],
  householdId: string,
): Promise<void> {
  await runGuestBulkPatch(weddingSiteId, guestIds, { household_id: householdId });
}

export async function updateGuestHouseholdForSite(
  weddingSiteId: string,
  guestId: string,
  householdId: string | null,
): Promise<void> {
  await runGuestBulkPatch(weddingSiteId, [guestId], { household_id: householdId });
}

export async function generateSecureGuestInviteToken(): Promise<string> {
  const { data, error } = await supabase.rpc('generate_secure_token', { byte_length: 32 });
  if (!error && typeof data === 'string' && data.trim()) return data;

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function updateGuestsForSite(
  weddingSiteId: string,
  guestIds: string[],
  patch: Record<string, unknown>,
): Promise<void> {
  await runGuestBulkPatch(weddingSiteId, guestIds, patch);
}

export async function persistGuestReminderSettings(
  weddingSiteId: string,
  patch: { reminder_cadence_days?: 1 | 3 | 7; auto_reminders_enabled?: boolean },
): Promise<void> {
  const { error } = await supabase.rpc('guest_dashboard_persist_reminder_settings', {
    p_wedding_site_id: weddingSiteId,
    p_reminder_cadence_days: patch.reminder_cadence_days ?? null,
    p_auto_reminders_enabled: patch.auto_reminders_enabled ?? null,
  });

  if (error) throw error;
}

export async function clearGuestCheckInsForSite(weddingSiteId: string): Promise<void> {
  const { data: guestRows, error: guestReadError } = await supabase
    .from('guests')
    .select(GUEST_ID_SELECT)
    .eq('wedding_site_id', weddingSiteId)
    .not('checked_in_at', 'is', null)
    .limit(MAX_GUEST_BULK_OPERATION_IDS);

  if (guestReadError) throw guestReadError;

  const guestIds = (guestRows ?? []).map((row) => (row as { id: string }).id);
  await runGuestBulkPatch(weddingSiteId, guestIds, {
    checked_in_at: null,
    checkin_notes: null,
  });
}
