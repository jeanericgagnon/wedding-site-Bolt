import { supabase } from '../../../lib/supabase';
import { resolveActiveSiteForUser } from '../../../lib/activeSite';
import { deriveInviteEvents } from '../../../lib/rsvpEventFallback';
import {
  deleteEventRsvpByInvitationId,
  deleteEventRsvpsByInvitationIds,
  getEventRsvpSnapshotsByInvitationIds,
  restoreEventRsvpSnapshots,
  type EventRsvpSnapshot,
} from '../../../lib/eventRsvpCleanup';
import type { PlannerAccessRole, PlannerPermissionKey } from '../../../lib/plannerAccess';
import type {
  GuestAuditEntry,
  GuestWithRSVP,
  ItineraryEvent,
  RSVPQuestionSetting,
  RsvpConflict,
  WeddingSiteInfo,
} from './guestDashboardTypes';

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

export const GUEST_DASHBOARD_SITE_SELECT = [
  'id',
  'couple_name_1',
  'couple_name_2',
  'wedding_date',
  'venue_name',
  'venue_address',
  'site_url',
  'site_slug',
  'rsvp_custom_questions',
  'rsvp_meal_config',
  'reminder_cadence_days',
  'auto_reminders_enabled',
].join(', ');

export const GUEST_DASHBOARD_GUEST_SELECT = [
  'id',
  'first_name',
  'last_name',
  'name',
  'email',
  'phone',
  'plus_one_allowed',
  'plus_one_name',
  'children_allowed',
  'max_children',
  'max_additional_guests',
  'invited_to_ceremony',
  'invited_to_reception',
  'invite_token',
  'rsvp_status',
  'rsvp_received_at',
  'checked_in_at',
  'checkin_notes',
  'thank_you_sent_at',
  'thank_you_notes',
  'household_id',
  'group_name',
  'notes',
  'mailing_address_line1',
  'mailing_address_line2',
  'mailing_city',
  'mailing_state',
  'mailing_postal_code',
  'mailing_country',
].join(', ');

export const GUEST_DASHBOARD_CONFLICT_SELECT = 'id, guest_id, conflict_code, message, severity, created_at, resolved, resolved_at';
export const GUEST_DASHBOARD_ITINERARY_EVENT_SELECT = 'id, event_name, event_date, start_time, location_name';
export const GUEST_DASHBOARD_WEDDING_DATA_SELECT = 'wedding_data';
export const GUEST_DASHBOARD_EVENT_INVITATION_SELECT = 'event_id, guest_id';
export const GUEST_DASHBOARD_AUDIT_SELECT = 'id, guest_id, action, changed_at, changed_by, old_data, new_data';
export const GUEST_DRAWER_EVENT_INVITATION_SELECT = 'event_id';
export const GUEST_DRAWER_AUDIT_SELECT = 'id, action, changed_at, changed_by, old_data, new_data';
export const GUEST_ASSISTED_RSVP_SELECT = 'id, notes';

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

export interface GuestDashboardSiteLoadResult {
  role: PlannerAccessRole;
  permissions: PlannerPermissionKey[] | null;
  siteInfo: WeddingSiteInfo | null;
  rsvpQuestions: RSVPQuestionSetting[];
  rsvpMealEnabled: boolean;
  rsvpMealOptions: string[];
  reminderCadenceDays: 1 | 3 | 7 | null;
  autoRemindersEnabled: boolean;
}

export interface GuestDashboardRowsLoadResult {
  guests: GuestWithRSVP[];
  conflicts: RsvpConflict[];
  conflictHistory: RsvpConflict[];
}

export interface GuestItineraryFiltersLoadResult {
  events: ItineraryEvent[];
  filterEvents: ItineraryEvent[];
  eventInviteGuestMap: Map<string, Set<string>>;
}

export interface GuestDrawerDetailsLoadResult {
  events: ItineraryEvent[];
  guestEventIds: Set<string>;
  auditEntries: GuestAuditEntry[];
}

export interface SaveAssistedRsvpInput {
  guest: GuestWithRSVP;
  status: 'confirmed' | 'declined';
  source: 'phone' | 'text' | 'family' | 'in-person';
  notes: string;
  recordedAt?: string;
}

export function toEventInvitationRows(guestId: string, eventIds: string[]): EventInvitationRow[] {
  return eventIds.map((eventId) => ({ event_id: eventId, guest_id: guestId }));
}

export async function resolveGuestDashboardSiteId(userId: string): Promise<string | null> {
  const activeSite = await resolveActiveSiteForUser(userId);
  return activeSite?.id ?? null;
}

export function normalizeRsvpQuestions(raw: unknown): RSVPQuestionSetting[] {
  const loadedQuestions = Array.isArray(raw) ? raw : [];
  return loadedQuestions
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
}

export function normalizeRsvpMealConfig(raw: unknown): { enabled: boolean; options: string[] } {
  const mealCfg = raw as { enabled?: unknown; options?: unknown } | undefined;
  return {
    enabled: typeof mealCfg?.enabled === 'boolean' ? mealCfg.enabled : true,
    options: Array.isArray(mealCfg?.options)
      ? (mealCfg.options as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      : ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'],
  };
}

export async function loadGuestDashboardSite(userId: string): Promise<GuestDashboardSiteLoadResult> {
  const activeSite = await resolveActiveSiteForUser(userId);
  const activeSiteId = activeSite?.id ?? null;
  const role = activeSite?.role ?? 'owner';
  const permissions = activeSite?.permissions ?? null;

  const { data, error } = activeSiteId ? await supabase
    .from('wedding_sites')
    .select(GUEST_DASHBOARD_SITE_SELECT)
    .eq('id', activeSiteId)
    .maybeSingle() : { data: null, error: null };

  if (error) throw error;

  if (!data) {
    return {
      role,
      permissions,
      siteInfo: null,
      rsvpQuestions: [],
      rsvpMealEnabled: true,
      rsvpMealOptions: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'],
      reminderCadenceDays: null,
      autoRemindersEnabled: false,
    };
  }

  const row = (data as unknown) as {
    id: string;
    couple_name_1?: string | null;
    couple_name_2?: string | null;
    wedding_date?: string | null;
    venue_name?: string | null;
    venue_address?: string | null;
    site_url?: string | null;
    site_slug?: string | null;
    rsvp_custom_questions?: unknown;
    rsvp_meal_config?: unknown;
    reminder_cadence_days?: unknown;
    auto_reminders_enabled?: unknown;
  };
  const mealConfig = normalizeRsvpMealConfig(row.rsvp_meal_config);
  const cadence = Number(row.reminder_cadence_days);

  return {
    role,
    permissions,
    siteInfo: {
      id: row.id,
      couple_name_1: row.couple_name_1 ?? '',
      couple_name_2: row.couple_name_2 ?? '',
      wedding_date: row.wedding_date ?? null,
      venue_name: row.venue_name ?? null,
      venue_address: row.venue_address ?? null,
      site_url: row.site_url ?? null,
      site_slug: row.site_slug ?? null,
    },
    rsvpQuestions: normalizeRsvpQuestions(row.rsvp_custom_questions),
    rsvpMealEnabled: mealConfig.enabled,
    rsvpMealOptions: mealConfig.options,
    reminderCadenceDays: [1, 3, 7].includes(cadence) ? cadence as 1 | 3 | 7 : null,
    autoRemindersEnabled: Boolean(row.auto_reminders_enabled),
  };
}

export async function loadGuestDashboardRows(weddingSiteId: string): Promise<GuestDashboardRowsLoadResult> {
  const { data: guestsData, error: guestsError } = await supabase
    .from('guests')
    .select(GUEST_DASHBOARD_GUEST_SELECT)
    .eq('wedding_site_id', weddingSiteId)
    .order('created_at', { ascending: false });

  if (guestsError) throw guestsError;

  const guestRows = ((guestsData ?? []) as unknown) as GuestWithRSVP[];
  const guestIds = guestRows.map((guest) => guest.id);
  const windowStartIso = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString();
  const [rsvpsData, { data: conflictsData, error: conflictsError }, { data: conflictHistoryData, error: conflictHistoryError }] = await Promise.all([
    fetchGuestRsvps(guestIds),
    supabase
      .from('rsvp_conflicts')
      .select(GUEST_DASHBOARD_CONFLICT_SELECT)
      .eq('wedding_site_id', weddingSiteId)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('rsvp_conflicts')
      .select(GUEST_DASHBOARD_CONFLICT_SELECT)
      .eq('wedding_site_id', weddingSiteId)
      .gte('created_at', windowStartIso)
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  if (conflictsError) throw conflictsError;
  if (conflictHistoryError) throw conflictHistoryError;

  return {
    guests: guestRows.map((guest) => ({
      ...guest,
      rsvp: (rsvpsData as Array<{ guest_id: string }>).find((r) => r.guest_id === guest.id),
    })) as GuestWithRSVP[],
    conflicts: (conflictsData ?? []) as RsvpConflict[],
    conflictHistory: (conflictHistoryData ?? []) as RsvpConflict[],
  };
}

export async function loadGuestItineraryFilters(weddingSiteId: string): Promise<GuestItineraryFiltersLoadResult> {
  const [eventsRes, siteRes] = await Promise.all([
    supabase
      .from('itinerary_events')
      .select(GUEST_DASHBOARD_ITINERARY_EVENT_SELECT)
      .eq('wedding_site_id', weddingSiteId)
      .order('event_date', { ascending: true }),
    supabase
      .from('wedding_sites')
      .select(GUEST_DASHBOARD_WEDDING_DATA_SELECT)
      .eq('id', weddingSiteId)
      .maybeSingle(),
  ]);

  if (eventsRes.error) throw eventsRes.error;
  if (siteRes.error) throw siteRes.error;

  const seededEvents = (((siteRes.data?.wedding_data as { meta?: { rsvpEventSeeds?: Array<{ id: string; label: string; dateLabel?: string; locationName?: string | null }> } } | null)?.meta?.rsvpEventSeeds) ?? []);
  const events = (eventsRes.data ?? []) as ItineraryEvent[];
  const eventIds = events.map((event) => event.id);
  const invitesRes = eventIds.length > 0
    ? await supabase
      .from('event_invitations')
      .select(GUEST_DASHBOARD_EVENT_INVITATION_SELECT)
      .in('event_id', eventIds)
    : { data: [], error: null };

  if (invitesRes.error) throw invitesRes.error;

  const eventInviteGuestMap = new Map<string, Set<string>>();
  ((invitesRes.data ?? []) as Array<{ event_id: string; guest_id: string }>).forEach((row) => {
    const set = eventInviteGuestMap.get(row.event_id) ?? new Set<string>();
    set.add(row.guest_id);
    eventInviteGuestMap.set(row.event_id, set);
  });

  return {
    events,
    filterEvents: deriveInviteEvents(events, seededEvents) as ItineraryEvent[],
    eventInviteGuestMap,
  };
}

export async function loadGuestRsvpAuditFeed(weddingSiteId: string): Promise<GuestAuditEntry[]> {
  const { data, error } = await supabase
    .from('guest_audit_logs')
    .select(GUEST_DASHBOARD_AUDIT_SELECT)
    .eq('wedding_site_id', weddingSiteId)
    .order('changed_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as GuestAuditEntry[];
}

export async function loadGuestDrawerDetails(weddingSiteId: string, guestId: string): Promise<GuestDrawerDetailsLoadResult> {
  const [eventsResult, invitesResult, auditResult] = await Promise.all([
    supabase
      .from('itinerary_events')
      .select(GUEST_DASHBOARD_ITINERARY_EVENT_SELECT)
      .eq('wedding_site_id', weddingSiteId)
      .order('event_date', { ascending: true }),
    supabase
      .from('event_invitations')
      .select(GUEST_DRAWER_EVENT_INVITATION_SELECT)
      .eq('guest_id', guestId),
    supabase
      .from('guest_audit_logs')
      .select(GUEST_DRAWER_AUDIT_SELECT)
      .eq('guest_id', guestId)
      .order('changed_at', { ascending: false })
      .limit(12),
  ]);

  if (eventsResult.error) throw eventsResult.error;
  if (invitesResult.error) throw invitesResult.error;
  if (auditResult.error) throw auditResult.error;

  return {
    events: (eventsResult.data ?? []) as ItineraryEvent[],
    guestEventIds: new Set(((invitesResult.data ?? []) as Array<{ event_id: string }>).map((row) => row.event_id)),
    auditEntries: (auditResult.data ?? []) as GuestAuditEntry[],
  };
}

export async function setGuestEventInvitation(guestId: string, eventId: string, invited: boolean): Promise<void> {
  if (invited) {
    const { error } = await supabase
      .from('event_invitations')
      .insert({ event_id: eventId, guest_id: guestId });
    if (error) throw error;
    return;
  }

  const { data: invitationRow, error: invitationLookupError } = await supabase
    .from('event_invitations')
    .select(GUEST_ID_SELECT)
    .eq('event_id', eventId)
    .eq('guest_id', guestId)
    .maybeSingle();
  if (invitationLookupError) throw invitationLookupError;

  const invitationId = (invitationRow as { id?: string } | null)?.id ?? null;
  const eventRsvpSnapshots = invitationId ? await getEventRsvpSnapshotsByInvitationIds([invitationId]) : [];

  if (invitationId) {
    await deleteEventRsvpByInvitationId(invitationId);
  }

  const { error: inviteDeleteError } = await supabase
    .from('event_invitations')
    .delete()
    .eq('event_id', eventId)
    .eq('guest_id', guestId);
  if (inviteDeleteError) {
    await restoreEventRsvpSnapshots(eventRsvpSnapshots);
    throw inviteDeleteError;
  }
}

export function buildAssistedRsvpNotes(source: SaveAssistedRsvpInput['source'], recordedAt: string, notes: string): string {
  const manualTag = `[Manual RSVP source:${source} recorded:${recordedAt}]`;
  return [manualTag, notes.trim()].filter(Boolean).join(' ');
}

export async function saveAssistedGuestRsvp(input: SaveAssistedRsvpInput): Promise<void> {
  const recordedAt = input.recordedAt ?? new Date().toISOString();
  const nextNotes = buildAssistedRsvpNotes(input.source, recordedAt, input.notes);
  const previousGuestPatch = {
    rsvp_status: input.guest.rsvp_status,
    rsvp_received_at: input.guest.rsvp_received_at ?? null,
    notes: input.guest.notes ?? null,
  };

  await supabase
    .from('guests')
    .update({ rsvp_status: input.status, rsvp_received_at: recordedAt, notes: nextNotes })
    .eq('id', input.guest.id)
    .throwOnError();

  try {
    const { data: existingRsvp, error: existingRsvpError } = await supabase
      .from('rsvps')
      .select(GUEST_ASSISTED_RSVP_SELECT)
      .eq('guest_id', input.guest.id)
      .maybeSingle();
    if (existingRsvpError) throw existingRsvpError;

    const nextAttending = input.status === 'confirmed';
    const assistedRsvpPayload = {
      attending: nextAttending,
      attending_ceremony: nextAttending ? input.guest.invited_to_ceremony : false,
      attending_reception: nextAttending ? input.guest.invited_to_reception : false,
      notes: nextNotes,
      responded_at: recordedAt,
      ...(nextAttending ? {} : {
        meal_choice: null,
        plus_one_name: null,
        plus_one_count: 0,
      }),
    };

    const existingRsvpId = (existingRsvp as { id?: string } | null)?.id ?? null;
    if (existingRsvpId) {
      const { error: rsvpError } = await supabase
        .from('rsvps')
        .update(assistedRsvpPayload)
        .eq('id', existingRsvpId);
      if (rsvpError) throw rsvpError;
    } else {
      const { error: rsvpInsertError } = await supabase
        .from('rsvps')
        .insert({
          guest_id: input.guest.id,
          ...assistedRsvpPayload,
        });
      if (rsvpInsertError) throw rsvpInsertError;
    }
  } catch (error) {
    await supabase
      .from('guests')
      .update(previousGuestPatch)
      .eq('id', input.guest.id);
    throw error;
  }
}

export async function resolveGuestRsvpConflict(conflictId: string): Promise<void> {
  const { error } = await supabase
    .from('rsvp_conflicts')
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', conflictId);

  if (error) throw error;
}

export async function resolveGuestRsvpConflicts(conflictIds: string[]): Promise<void> {
  if (conflictIds.length === 0) return;
  const { error } = await supabase
    .from('rsvp_conflicts')
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .in('id', conflictIds);

  if (error) throw error;
}

export async function saveGuestRsvpConfig(
  weddingSiteId: string,
  questions: RSVPQuestionSetting[],
  mealEnabled: boolean,
  mealOptions: string[],
): Promise<void> {
  const { error } = await supabase
    .from('wedding_sites')
    .update({ rsvp_custom_questions: questions, rsvp_meal_config: { enabled: mealEnabled, options: mealOptions } })
    .eq('id', weddingSiteId);

  if (error) throw error;
}

export async function updateGuestForSite(
  weddingSiteId: string,
  guestId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('guests')
    .update(patch)
    .eq('id', guestId)
    .eq('wedding_site_id', weddingSiteId);

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
    .in('id', guestIds)
    .eq('wedding_site_id', weddingSiteId);

  if (error) throw error;
}

export async function clearGuestCheckInsForSite(weddingSiteId: string): Promise<void> {
  const { error } = await supabase
    .from('guests')
    .update({ checked_in_at: null, checkin_notes: null })
    .eq('wedding_site_id', weddingSiteId)
    .not('checked_in_at', 'is', null);

  if (error) throw error;
}

export async function updateGuestInvitationTimestamps(
  guestId: string,
  patch: { invitation_sent_at?: string; reminder_last_sent_at?: string },
): Promise<void> {
  const { error } = await supabase
    .from('guests')
    .update(patch)
    .eq('id', guestId);

  if (error) throw error;
}

export async function saveGuestReminderSettings(
  weddingSiteId: string,
  patch: { reminder_cadence_days?: 1 | 3 | 7; auto_reminders_enabled?: boolean },
): Promise<void> {
  const { error } = await supabase
    .from('wedding_sites')
    .update(patch)
    .eq('id', weddingSiteId);

  if (error) throw error;
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
