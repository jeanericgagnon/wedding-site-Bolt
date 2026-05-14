import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addGuestEventInvitation,
  clearGuestCheckInsForSite,
  createGuest,
  deleteGuestById,
  deleteAllGuestsForSite,
  assignGuestsToHouseholdForSite,
  GUEST_AUDIT_SELECT,
  GUEST_CONFLICT_SELECT,
  GUEST_DASHBOARD_RSVP_SELECT,
  GUEST_EVENT_INVITATION_SELECT,
  GUEST_ITINERARY_EVENT_SELECT,
  GUEST_ITINERARY_SITE_SELECT,
  GUEST_SITE_SLUG_SELECT,
  GUEST_SITE_SETTINGS_SELECT,
  loadGuestItineraryDrawerSnapshot,
  MAX_GUEST_BULK_INVITATION_ROWS,
  MAX_GUEST_BULK_OPERATION_IDS,
  MAX_GUEST_AUDIT_ROWS,
  MAX_GUEST_DASHBOARD_ROWS,
  MAX_GUEST_DRAWER_AUDIT_ROWS,
  MAX_GUEST_DRAWER_EVENTS,
  MAX_GUEST_DRAWER_INVITATIONS,
  MAX_GUEST_ITINERARY_FILTER_EVENTS,
  MAX_GUEST_ITINERARY_FILTER_INVITATIONS,
  MAX_GUEST_RSVP_CONFLICT_HISTORY_ROWS,
  MAX_GUEST_RSVP_CONFLICT_ROWS,
  MAX_GUEST_RSVP_LOOKUP_IDS,
  loadGuestDashboardItineraryFilters,
  loadGuestDashboardPublicSlug,
  loadGuestDashboardRsvpAuditFeed,
  loadGuestDashboardSiteSlug,
  loadGuestDashboardSiteSettings,
  loadGuestDashboardSnapshot,
  insertImportedGuests,
  markGuestInvitationAndReminderSentForSite,
  markGuestInvitationSentForSite,
  markGuestReminderSentForSite,
  markGuestsThankYouSentForSite,
  persistGuestDashboardRsvpConfig,
  persistGuestReminderSettings,
  removeGuestEventInvitation,
  saveAssistedGuestRsvp,
  refreshGuestDashboardSession,
  replaceImportedGuestRsvps,
  resolveGuestDashboardSiteId,
  resolveGuestDashboardConflict,
  resolveGuestDashboardConflicts,
  toEventInvitationRows,
  updateGuest,
  updateGuestCheckInForSite,
  updateGuestHouseholdForSite,
  updateGuestThankYouSentForSite,
} from './guestService';

const {
  refreshSessionMock,
  fromMock,
  rpcMock,
  resolveActiveSiteForUserMock,
  getEventRsvpSnapshotsByInvitationIdsMock,
  deleteEventRsvpsByInvitationIdsMock,
  deleteEventRsvpByInvitationIdMock,
  restoreEventRsvpSnapshotsMock,
} = vi.hoisted(() => ({
  refreshSessionMock: vi.fn(),
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
  resolveActiveSiteForUserMock: vi.fn(),
  getEventRsvpSnapshotsByInvitationIdsMock: vi.fn(),
  deleteEventRsvpsByInvitationIdsMock: vi.fn(),
  deleteEventRsvpByInvitationIdMock: vi.fn(),
  restoreEventRsvpSnapshotsMock: vi.fn(),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      refreshSession: refreshSessionMock,
    },
    from: fromMock,
    rpc: rpcMock,
  },
}));

vi.mock('../../../lib/activeSite', () => ({
  resolveActiveSiteForUser: resolveActiveSiteForUserMock,
}));

vi.mock('../../../lib/eventRsvpCleanup', () => ({
  getEventRsvpSnapshotsByInvitationIds: getEventRsvpSnapshotsByInvitationIdsMock,
  deleteEventRsvpsByInvitationIds: deleteEventRsvpsByInvitationIdsMock,
  restoreEventRsvpSnapshots: restoreEventRsvpSnapshotsMock,
  deleteEventRsvpByInvitationId: deleteEventRsvpByInvitationIdMock,
}));

describe('guestService', () => {
  beforeEach(() => {
    refreshSessionMock.mockReset();
    fromMock.mockReset();
    rpcMock.mockReset();
    resolveActiveSiteForUserMock.mockReset();
    getEventRsvpSnapshotsByInvitationIdsMock.mockReset();
    deleteEventRsvpsByInvitationIdsMock.mockReset();
    deleteEventRsvpByInvitationIdMock.mockReset();
    restoreEventRsvpSnapshotsMock.mockReset();
  });

  it('keeps guest RSVP reads explicitly projected', () => {
    expect(GUEST_DASHBOARD_RSVP_SELECT).toContain('guest_id');
    expect(GUEST_DASHBOARD_RSVP_SELECT).toContain('custom_answers');
    expect(GUEST_SITE_SETTINGS_SELECT).toContain('rsvp_custom_questions');
    expect(GUEST_CONFLICT_SELECT).toContain('conflict_code');
    expect(MAX_GUEST_DASHBOARD_ROWS).toBe(5000);
    expect(GUEST_DASHBOARD_RSVP_SELECT).not.toContain('*');
    expect(MAX_GUEST_RSVP_LOOKUP_IDS).toBe(5000);
    expect(MAX_GUEST_BULK_OPERATION_IDS).toBe(5000);
    expect(MAX_GUEST_BULK_INVITATION_ROWS).toBe(10000);
    expect(MAX_GUEST_RSVP_CONFLICT_ROWS).toBe(20);
    expect(MAX_GUEST_RSVP_CONFLICT_HISTORY_ROWS).toBe(500);
    expect(GUEST_ITINERARY_EVENT_SELECT).toContain('event_name');
    expect(GUEST_ITINERARY_SITE_SELECT).toBe('wedding_data');
    expect(GUEST_EVENT_INVITATION_SELECT).toBe('event_id, guest_id');
    expect(GUEST_AUDIT_SELECT).toContain('changed_at');
    expect(GUEST_SITE_SLUG_SELECT).toBe('site_slug');
    expect(MAX_GUEST_ITINERARY_FILTER_EVENTS).toBe(200);
    expect(MAX_GUEST_ITINERARY_FILTER_INVITATIONS).toBe(10000);
    expect(MAX_GUEST_AUDIT_ROWS).toBe(20);
    expect(MAX_GUEST_DRAWER_EVENTS).toBe(200);
    expect(MAX_GUEST_DRAWER_INVITATIONS).toBe(10000);
    expect(MAX_GUEST_DRAWER_AUDIT_ROWS).toBe(12);
  });

  it('builds scoped event invitation rows for one guest', () => {
    expect(toEventInvitationRows('guest-1', ['event-a', 'event-b'])).toEqual([
      { guest_id: 'guest-1', event_id: 'event-a' },
      { guest_id: 'guest-1', event_id: 'event-b' },
    ]);
  });

  it('keeps guest invite token generation behind the guest service', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/dashboard/Guests.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/guestService.ts'), 'utf8');
    const campaignHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardCampaignActions.ts'), 'utf8');
    const clipboardHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardClipboardActions.ts'), 'utf8');
    const csvImportHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardCsvImport.ts'), 'utf8');
    const viewPropsHelper = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/buildGuestDashboardViewProps.ts'), 'utf8');
    const dataHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardData.ts'), 'utf8');
    const followUpHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardFollowUpActions.ts'), 'utf8');
    const checkInsHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardCheckIns.ts'), 'utf8');
    const crudHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardCrudActions.ts'), 'utf8');
    const conflictHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardConflictActions.ts'), 'utf8');
    const derivedStateHelper = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/buildGuestDashboardDerivedState.ts'), 'utf8');
    const detailHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardGuestDetailActions.ts'), 'utf8');
    const opsHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardOpsActions.ts'), 'utf8');
    const rsvpConfigHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardRsvpConfigActions.ts'), 'utf8');

    expect(page).toContain('useGuestDashboardData({');
    expect(page).toContain('useGuestDashboardClipboardActions({');
    expect(page).toContain('useGuestDashboardCsvImport({');
    expect(page).toContain('useGuestDashboardFollowUpActions({');
    expect(page).toContain('useGuestDashboardCheckIns({');
    expect(page).toContain('useGuestDashboardCrudActions({');
    expect(page).toContain('useGuestDashboardConflictActions({');
    expect(page).toContain('useGuestDashboardGuestDetailActions({');
    expect(page).toContain('useGuestDashboardOpsActions({');
    expect(page).toContain('useGuestDashboardRsvpConfigActions({');
    expect(page).toContain('buildGuestDashboardDerivedState({');
    expect(page).toContain('buildGuestDashboardViewProps({');
    expect(page).toContain('loadPublicSlug: loadGuestDashboardPublicSlug');
    expect(page).toContain('loadSiteSlug: loadGuestDashboardSiteSlug');
    expect(page).toContain('useGuestDashboardCampaignActions({');
    expect(page).not.toContain('generateSecureGuestInviteToken()');
    expect(page).not.toContain('loadGuestDashboardSiteSettings(user.id)');
    expect(page).not.toContain('loadGuestDashboardSnapshot(weddingSiteId)');
    expect(page).not.toContain('loadGuestDashboardItineraryFilters(weddingSiteId)');
    expect(page).not.toContain('loadGuestDashboardRsvpAuditFeed(weddingSiteId)');
    expect(page).not.toContain('refreshGuestDashboardSession()');
    expect(page).not.toContain('const guestEngagementProps = {');
    expect(page).not.toContain('const guestDashboardOpsViewProps = {');
    expect(page).not.toContain('const guestRsvpConfigViewProps = {');
    expect(page).not.toContain('const handleCopyOpsSummary = async () => {');
    expect(page).not.toContain('const handleCopyExceptionChecklist = async () => {');
    expect(page).not.toContain('const handleCopyMissingMealChecklist = async () => {');
    expect(page).not.toContain('const handleCopyNoContactChecklist = async () => {');
    expect(page).not.toContain('const handleCopyFilteredEmails = async () => {');
    expect(page).not.toContain('const saveCurrentSegment = () => {');
    expect(page).not.toContain('const addFollowUpTask = (text: string) => {');
    expect(page).not.toContain('const generateChecklistTasks = () => {');
    expect(page).not.toContain('const handleUndoLastCheckIn = async () => {');
    expect(page).not.toContain('const handleMarkThankYouSent = async (guest: GuestWithRSVP) => {');
    expect(page).not.toContain('const handleMarkAllDueThankYous = async () => {');
    expect(page).not.toContain('const handleClearAllCheckIns = async () => {');
    expect(page).not.toContain('await resolveGuestDashboardConflict(conflictId, resolvedAt);');
    expect(page).not.toContain('await resolveGuestDashboardConflicts(ids, resolvedAt);');
    expect(page).not.toContain('const resolveConflict = useCallback(async (conflictId: string) => {');
    expect(page).not.toContain('const resolveAllVisibleConflicts = useCallback(async () => {');
    expect(page).not.toContain("await persistGuestReminderSettings(weddingSiteId, patch);");
    expect(page).not.toContain('const handleDeleteAllGuests = async () => {');
    expect(page).not.toContain('const selectFilteredGuests = () => {');
    expect(page).not.toContain('const clearGuestSelection = () => {');
    expect(page).not.toContain('const keepOnlyVisibleSelection = () => {');
    expect(page).not.toContain('const filteredGuests = guests.filter((guest) => {');
    expect(page).not.toContain('const stats = {');
    expect(page).not.toContain('const eventReport = effectiveItineraryEvents.map((event) => {');
    expect(page).not.toContain('const dueReminderCandidatesGlobal = guests.filter((g) => !!g.email && !!g.invite_token && isDueReminder(g));');
    expect(page).not.toContain('buildGuestImportPreview({');
    expect(page).not.toContain('readGuestImportRows(file)');
    expect(page).not.toContain('insertImportedGuests(guestRows)');
    expect(page).not.toContain('updateHouseholdGuestIds(ids[0], ids)');
    expect(page).not.toContain('replaceImportedGuestRsvps(rsvpRows)');
    expect(page).not.toContain('loadGuestItineraryDrawerSnapshot(weddingSiteId, guest.id)');
    expect(page).not.toContain('removeGuestEventInvitation(eventId, itineraryDrawerGuest.id)');
    expect(page).not.toContain('addGuestEventInvitation(eventId, itineraryDrawerGuest.id)');
    expect(page).not.toContain('saveAssistedGuestRsvp({');
    expect(page).not.toContain('const addRsvpQuestionTemplate = useCallback((template: RsvpQuestionTemplate) => {');
    expect(page).not.toContain('const handleSaveRsvpConfig = async () => {');
    expect(page).not.toContain('writeStoredDemoRsvpConfig({ questions: cleanedQuestions, mealEnabled: rsvpMealEnabled, mealOptions });');
    expect(page).not.toContain('await persistGuestDashboardRsvpConfig({');
    expect(campaignHook).toContain('await sendGuestInvitationEmail({ guest, weddingSiteId, weddingSiteInfo })');
    expect(campaignHook).toContain('await markGuestInvitationSentForSite(weddingSiteId, guest.id, new Date().toISOString())');
    expect(campaignHook).toContain('await markGuestInvitationAndReminderSentForSite(weddingSiteId, guest.id, sentAtIso)');
    expect(rsvpConfigHook).toContain('const addRsvpQuestionTemplate = useCallback((template: RsvpQuestionTemplate) => {');
    expect(rsvpConfigHook).toContain('const handleSaveRsvpConfig = useCallback(async () => {');
    expect(rsvpConfigHook).toContain('writeStoredDemoRsvpConfig({ questions: cleanedQuestions, mealEnabled: rsvpMealEnabled, mealOptions });');
    expect(rsvpConfigHook).toContain('await persistGuestDashboardRsvpConfig({');
    expect(rsvpConfigHook).toContain('autoSaveTimer.current = window.setTimeout(() => {');
    expect(conflictHook).toContain('const visibleRsvpConflicts = useMemo(');
    expect(conflictHook).toContain('const rsvpConflictStats = useMemo<RsvpConflictStats>(() => {');
    expect(conflictHook).toContain('await resolveGuestDashboardConflict(conflictId, resolvedAt);');
    expect(conflictHook).toContain('await resolveGuestDashboardConflicts(ids, resolvedAt);');
    expect(conflictHook).toContain("toast('RSVP item marked done', 'success');");
    expect(derivedStateHelper).toContain('const filteredGuests = guests.filter((guest) => {');
    expect(derivedStateHelper).toContain('const stats = {');
    expect(derivedStateHelper).toContain('const eventReport = effectiveItineraryEvents.map((event) => {');
    expect(derivedStateHelper).toContain('const dueReminderCandidatesGlobal = guests.filter((guest) => !!guest.email && !!guest.invite_token && isDueReminder(guest));');
    expect(derivedStateHelper).toContain('const reminderCandidates = emailableFilteredGuests.filter((guest) => {');
    expect(opsHook).toContain('const applyCampaignPreset = useCallback((preset:');
    expect(opsHook).toContain('await persistGuestReminderSettings(weddingSiteId, patch);');
    expect(opsHook).toContain('const handleDeleteAllGuests = useCallback(async () => {');
    expect(opsHook).toContain('const selectFilteredGuests = useCallback(() => {');
    expect(opsHook).toContain('const clearGuestSelection = useCallback(() => {');
    expect(opsHook).toContain('const keepOnlyVisibleSelection = useCallback(() => {');
    expect(opsHook).toContain('await deleteAllGuestsForSite(weddingSiteId);');
    expect(campaignHook).toContain('await markGuestReminderSentForSite(weddingSiteId, guest.id, new Date().toISOString())');
    expect(clipboardHook).toContain('const handleCopyOpsSummary = async () => {');
    expect(clipboardHook).toContain('const handleCopyExceptionChecklist = async () => {');
    expect(clipboardHook).toContain('const handleCopyMissingMealChecklist = async () => {');
    expect(clipboardHook).toContain('const handleCopyNoContactChecklist = async () => {');
    expect(clipboardHook).toContain('const handleCopyFilteredEmails = async () => {');
    expect(clipboardHook).toContain('const handleCopyChecklist = async () => {');
    expect(clipboardHook).toContain('const handleCopyCampaignDryRun = async () => {');
    expect(clipboardHook).toContain('copyTextOrDownload(');
    expect(clipboardHook).not.toContain("from '../../../lib/supabase'");
    expect(followUpHook).toContain('const saveCurrentSegment = () => {');
    expect(followUpHook).toContain('const addFollowUpTask = (text: string) => {');
    expect(followUpHook).toContain('const generateChecklistTasks = () => {');
    expect(followUpHook).toContain('buildSavedSegment({');
    expect(followUpHook).toContain('buildFollowUpTask({ now: new Date(), text })');
    expect(followUpHook).toContain('buildGeneratedFollowUpTasks({ now: new Date(), rsvpOps, contactStats })');
    expect(followUpHook).not.toContain("from '../../../lib/supabase'");
    expect(checkInsHook).toContain('await updateGuestForSite(weddingSiteId, lastCheckIn.guestId, { checked_in_at: null });');
    expect(checkInsHook).toContain('await updateGuestForSite(weddingSiteId, guest.id, { thank_you_sent_at: nextValue });');
    expect(checkInsHook).toContain('await updateGuestsForSite(weddingSiteId, ids, { thank_you_sent_at: new Date().toISOString() });');
    expect(checkInsHook).toContain('await clearGuestCheckInsForSite(weddingSiteId);');
    expect(checkInsHook).toContain('await refreshGuestDashboardSession();');
    expect(checkInsHook).not.toContain("from '../../../lib/supabase'");
    expect(crudHook).toContain('await generateSecureGuestInviteToken()');
    expect(crudHook).toContain('await createGuest({');
    expect(crudHook).toContain('await insertEventInvitations(toEventInvitationRows(createdGuestId, realEventIds));');
    expect(crudHook).toContain('await replaceGuestEventInvitations(editingGuest.id, realEventIds);');
    expect(crudHook).toContain('await restoreGuestEventInvitations(editingGuest.id, eventInvitationRollback);');
    expect(crudHook).toContain('const { invitationCount } = await deleteGuestWithDependencies(guestId);');
    expect(crudHook).not.toContain("from '../../../lib/supabase'");
    expect(csvImportHook).toContain('const result = buildGuestImportPreview({');
    expect(csvImportHook).toContain('const { headers, dataRows, samples } = await readGuestImportRows(file);');
    expect(csvImportHook).toContain('const inserted = await insertImportedGuests(guestRows);');
    expect(csvImportHook).toContain('await updateHouseholdGuestIds(ids[0], ids);');
    expect(csvImportHook).toContain('await replaceImportedGuestRsvps(rsvpRows);');
    expect(csvImportHook).toContain('toast(safeGuestImportReadError(err), \'error\')');
    expect(csvImportHook).toContain('resolvedSiteId = userId ? await resolveGuestDashboardSiteId(userId) : null;');
    expect(csvImportHook).not.toContain("from '../../../lib/supabase'");
    expect(viewPropsHelper).toContain('const guestEngagementProps = {');
    expect(viewPropsHelper).toContain('const guestDashboardOpsViewProps = {');
    expect(viewPropsHelper).toContain('const guestRsvpConfigViewProps = {');
    expect(viewPropsHelper).toContain('return {');
    expect(viewPropsHelper).not.toContain("from '../../../lib/supabase'");
    expect(dataHook).toContain('const snapshot = await loadGuestDashboardSiteSettings(userId);');
    expect(dataHook).toContain('const snapshot = await loadGuestDashboardSnapshot(weddingSiteId);');
    expect(dataHook).toContain('const snapshot = await loadGuestDashboardItineraryFilters(weddingSiteId);');
    expect(dataHook).toContain('const feed = await loadGuestDashboardRsvpAuditFeed(weddingSiteId);');
    expect(detailHook).toContain('await refreshGuestDashboardSession();');
    expect(detailHook).toContain('const snapshot = await loadGuestItineraryDrawerSnapshot(weddingSiteId, guest.id);');
    expect(detailHook).toContain('await removeGuestEventInvitation(eventId, itineraryDrawerGuest.id);');
    expect(detailHook).toContain('await addGuestEventInvitation(eventId, itineraryDrawerGuest.id);');
    expect(detailHook).toContain('await saveAssistedGuestRsvp({');
    expect(detailHook).toContain('await assignGuestsToHouseholdForSite(weddingSiteId, ids, householdId);');
    expect(detailHook).toContain('await updateGuestHouseholdForSite(weddingSiteId, guestId, null);');
    expect(page).not.toContain("supabase.rpc('generate_secure_token'");
    expect(page).not.toContain('supabase.auth.refreshSession()');
    expect(page).not.toContain(".from('wedding_sites')\n        .select('id, couple_name_1, couple_name_2");
    expect(page).not.toContain(".from('guests')\n        .select('id, first_name, last_name");
    expect(page).not.toContain(".from('itinerary_events')\n            .select('id, event_name, event_date, start_time, location_name')");
    expect(page).not.toContain(".from('guest_audit_logs')\n          .select('id, guest_id, action, changed_at, changed_by, old_data, new_data')");
    expect(page).not.toContain(".from('event_invitations')\n          .select('id')");
    expect(page).not.toContain(".from('event_invitations')\n          .delete()");
    expect(page).not.toContain(".from('event_invitations')\n          .insert({ event_id: eventId, guest_id: itineraryDrawerGuest.id })");
    expect(page).not.toContain(".from('guests')\n        .update({ rsvp_status: assistedRsvpStatus, rsvp_received_at: recordedAt, notes: nextNotes })");
    expect(page).not.toContain(".from('rsvps')\n        .select('id, notes')");
    expect(page).not.toContain(".from('rsvps')\n          .update(assistedRsvpPayload)");
    expect(page).not.toContain(".from('rsvps')\n          .insert({");
    expect(page).not.toContain(".from('wedding_sites')\n      .select('site_slug')");
    expect(page).not.toContain(".from('wedding_sites')\n      .select('id, site_slug, site_url')");
    expect(page).not.toContain(".from('wedding_sites')\n        .update({ rsvp_custom_questions: cleanedQuestions, rsvp_meal_config: { enabled: rsvpMealEnabled, options: mealOptions } })");
    expect(page).not.toContain('await sendWeddingInvitation({');
    expect(page).not.toContain(".from('guests')\n        .update({ checked_in_at: null })");
    expect(page).not.toContain(".from('guests')\n        .update({ thank_you_sent_at: nextValue })");
    expect(page).not.toContain(".from('guests')\n        .update({ thank_you_sent_at: new Date().toISOString() })");
    expect(page).not.toContain(".from('guests')\n        .update({ invitation_sent_at: new Date().toISOString() })");
    expect(page).not.toContain(".from('guests')\n            .update({ invitation_sent_at: sentAtIso, reminder_last_sent_at: sentAtIso })");
    expect(page).not.toContain(".from('guests')\n            .update({ reminder_last_sent_at: new Date().toISOString() })");
    expect(page).not.toContain(".from('guests')\n        .update({ household_id: householdId })");
    expect(page).not.toContain(".from('wedding_sites')\n      .update(patch)");
    expect(page).not.toContain(".from('rsvp_conflicts')\n          .update({ resolved: true, resolved_at: new Date().toISOString() })");
    expect(page).not.toContain('await resolveActiveSiteForUser(user.id)');
    expect(service).toContain("supabase.rpc('generate_secure_token'");
    expect(service).toContain('export async function generateSecureGuestInviteToken()');
    expect(service).toContain('export async function refreshGuestDashboardSession(): Promise<void>');
    expect(service).toContain('export async function loadGuestDashboardSiteSettings(userId: string)');
    expect(service).toContain('export async function loadGuestDashboardSnapshot(weddingSiteId: string)');
    expect(service).toContain('export async function resolveGuestDashboardConflict(conflictId: string, resolvedAt: string): Promise<void>');
    expect(service).toContain('export async function resolveGuestDashboardConflicts(conflictIds: string[], resolvedAt: string): Promise<void>');
    expect(service).toContain('export async function loadGuestDashboardItineraryFilters(weddingSiteId: string)');
    expect(service).toContain('export async function loadGuestDashboardRsvpAuditFeed(weddingSiteId: string)');
    expect(service).toContain('export async function loadGuestItineraryDrawerSnapshot(weddingSiteId: string, guestId: string)');
    expect(service).toContain('export async function addGuestEventInvitation(eventId: string, guestId: string): Promise<void>');
    expect(service).toContain('export async function removeGuestEventInvitation(eventId: string, guestId: string): Promise<void>');
    expect(service).toContain('export async function saveAssistedGuestRsvp(input: SaveAssistedGuestRsvpInput): Promise<SaveAssistedGuestRsvpResult>');
    expect(service).toContain('export async function resolveGuestDashboardSiteId(userId: string): Promise<string | null>');
    expect(service).toContain('export async function loadGuestDashboardSiteSlug(weddingSiteId: string): Promise<string | null>');
    expect(service).toContain('export async function loadGuestDashboardPublicSlug(weddingSiteId: string): Promise<string | null>');
    expect(service).toContain('export async function updateGuestCheckInForSite(');
    expect(service).toContain('export async function updateGuestThankYouSentForSite(');
    expect(service).toContain('export async function markGuestsThankYouSentForSite(');
    expect(service).toContain('export async function persistGuestDashboardRsvpConfig(input: PersistGuestDashboardRsvpConfigInput): Promise<void>');
    expect(service).toContain("supabase.rpc('guest_dashboard_persist_rsvp_config'");
    expect(service).toContain('export async function markGuestInvitationSentForSite(');
    expect(service).toContain('export async function markGuestInvitationAndReminderSentForSite(');
    expect(service).toContain('export async function markGuestReminderSentForSite(');
    expect(service).toContain('export async function assignGuestsToHouseholdForSite(');
    expect(service).toContain('export async function updateGuestHouseholdForSite(');
    expect(service).toContain("supabase.rpc('guest_dashboard_guest_write'");
    expect(service).toContain("supabase.rpc('guest_dashboard_guest_bulk_patch'");
    expect(service).toContain("supabase.rpc('guest_dashboard_guest_delete'");
    expect(service).toContain("supabase.rpc('guest_dashboard_guest_delete_site'");
    expect(service).toContain("supabase.rpc('guest_dashboard_event_invitation_insert_many'");
    expect(service).toContain("supabase.rpc('guest_dashboard_event_invitation_delete'");
    expect(service).toContain("supabase.rpc('guest_dashboard_import_guests'");
    expect(service).toContain("supabase.rpc('guest_dashboard_rsvp_replace_many'");
    expect(service).toContain("supabase.rpc('guest_dashboard_assisted_rsvp_write'");
    expect(service).toContain('export async function persistGuestReminderSettings(');
    expect(service).toContain("supabase.rpc('guest_dashboard_persist_reminder_settings'");
    expect(service).not.toContain(".from('wedding_sites')\n    .update({\n      rsvp_custom_questions:");
    expect(service).not.toContain(".from('wedding_sites')\n    .update(patch)");
    expect(service).not.toContain(".from('guests')\n    .insert([{");
    expect(service).not.toContain(".from('guests')\n    .delete()");
    expect(service).not.toContain(".from('event_invitations').insert(");
    expect(service).not.toContain(".from('rsvps').delete()");
    expect(service).not.toContain(".from('rsvps').insert(");
    expect(service).toContain('supabase.auth.refreshSession()');
  });

  it('routes guest core writes through dedicated RPCs', async () => {
    rpcMock
      .mockResolvedValueOnce({ data: { id: 'guest-1' }, error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null });

    await expect(createGuest({
      weddingSiteId: 'site-1',
      firstName: 'Alex',
      lastName: 'Jordan',
      email: 'alex@example.com',
      phone: '555-0100',
      preferredLanguage: 'es',
      plusOneAllowed: true,
      invitedToCeremony: true,
      invitedToReception: false,
      inviteToken: 'token-1',
    })).resolves.toBe('guest-1');

    await expect(updateGuest({
      guestId: 'guest-1',
      firstName: 'Alex',
      lastName: 'Jordan',
      name: 'Alex Jordan',
      email: 'alex@example.com',
      phone: '555-0100',
      preferredLanguage: 'fr',
      plusOneAllowed: false,
      invitedToCeremony: true,
      invitedToReception: true,
    })).resolves.toBeUndefined();

    await expect(deleteGuestById('guest-1')).resolves.toBeUndefined();
    await expect(markGuestsThankYouSentForSite('site-1', ['guest-1', 'guest-2'], '2026-05-07T00:00:00Z')).resolves.toBeUndefined();
    await expect(assignGuestsToHouseholdForSite('site-1', ['guest-1', 'guest-2'], 'household-1')).resolves.toBeUndefined();

    expect(rpcMock).toHaveBeenNthCalledWith(1, 'guest_dashboard_guest_write', expect.objectContaining({
      p_wedding_site_id: 'site-1',
      p_guest_id: null,
      p_payload: expect.objectContaining({ preferred_language: 'es' }),
    }));
    expect(rpcMock).toHaveBeenNthCalledWith(2, 'guest_dashboard_guest_write', expect.objectContaining({
      p_wedding_site_id: null,
      p_guest_id: 'guest-1',
      p_payload: expect.objectContaining({ preferred_language: 'fr' }),
    }));
    expect(rpcMock).toHaveBeenNthCalledWith(3, 'guest_dashboard_guest_delete', {
      p_guest_id: 'guest-1',
    });
    expect(rpcMock).toHaveBeenNthCalledWith(4, 'guest_dashboard_guest_bulk_patch', {
      p_wedding_site_id: 'site-1',
      p_guest_ids: ['guest-1', 'guest-2'],
      p_payload: { thank_you_sent_at: '2026-05-07T00:00:00Z' },
    });
    expect(rpcMock).toHaveBeenNthCalledWith(5, 'guest_dashboard_guest_bulk_patch', {
      p_wedding_site_id: 'site-1',
      p_guest_ids: ['guest-1', 'guest-2'],
      p_payload: { household_id: 'household-1' },
    });
  });

  it('refreshes the guest dashboard session through the service', async () => {
    refreshSessionMock.mockResolvedValueOnce({ data: { session: { access_token: 'token' } } });
    await expect(refreshGuestDashboardSession()).resolves.toBeUndefined();
  });

  it('resolves one guest dashboard RSVP conflict through the service', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(resolveGuestDashboardConflict('conflict-1', '2026-05-07T12:00:00.000Z')).resolves.toBeUndefined();

    expect(rpcMock).toHaveBeenCalledWith('guest_dashboard_rsvp_conflict_resolve_many', {
      p_conflict_ids: ['conflict-1'],
      p_resolved_at: '2026-05-07T12:00:00.000Z',
    });
  });

  it('resolves many guest dashboard RSVP conflicts through the service', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(resolveGuestDashboardConflicts(['conflict-1', 'conflict-2'], '2026-05-07T12:00:00.000Z')).resolves.toBeUndefined();

    expect(rpcMock).toHaveBeenCalledWith('guest_dashboard_rsvp_conflict_resolve_many', {
      p_conflict_ids: ['conflict-1', 'conflict-2'],
      p_resolved_at: '2026-05-07T12:00:00.000Z',
    });
  });

  it('keeps guest RSVP lookup fan-out bounded', () => {
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/guestService.ts'), 'utf8');

    expect(service).toContain('MAX_GUEST_RSVP_LOOKUP_IDS = 5000');
    expect(service).toContain('const scopedGuestIds = guestIds.slice(0, MAX_GUEST_RSVP_LOOKUP_IDS);');
    expect(service).toContain(".in('guest_id', scopedGuestIds);");
  });

  it('keeps guest bulk-operation fan-out bounded', () => {
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/guestService.ts'), 'utf8');

    expect(service).toContain('MAX_GUEST_BULK_OPERATION_IDS = 5000');
    expect(service).toContain('MAX_GUEST_BULK_INVITATION_ROWS = 10000');
    expect(service).toContain('const scopedGuestIds = guestIds.slice(0, MAX_GUEST_BULK_OPERATION_IDS);');
    expect(service).toContain(".in('guest_id', scopedGuestIds);");
    expect(service).toContain(".limit(MAX_GUEST_BULK_INVITATION_ROWS);");
    expect(service).toContain('p_guest_ids: scopedGuestIds');
    expect(service).toContain("supabase.rpc('guest_dashboard_rsvp_replace_many'");
  });

  it('loads guest dashboard site settings through the service', async () => {
    resolveActiveSiteForUserMock.mockResolvedValueOnce({
      id: 'site-1',
      role: 'planner',
      permissions: ['guests'],
    });
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'site-1',
        couple_name_1: 'Alex',
        couple_name_2: 'Jordan',
        wedding_date: '2026-06-01',
        venue_name: 'Venue',
        venue_address: '123 Main',
        site_url: 'https://dayof.love/alex-jordan',
        site_slug: 'alex-jordan',
        rsvp_custom_questions: [{ id: 'q1', label: 'Song?', type: 'short_text', required: false, appliesTo: 'all' }],
        rsvp_meal_config: { enabled: true, options: ['Chicken', 'Fish'] },
        reminder_cadence_days: 3,
        auto_reminders_enabled: true,
      },
      error: null,
    });
    const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    fromMock.mockReturnValue({ select: selectMock });

    await expect(loadGuestDashboardSiteSettings('user-1')).resolves.toEqual(expect.objectContaining({
      activeSiteId: 'site-1',
      role: 'planner',
      permissions: ['guests'],
      mealEnabled: true,
      mealOptions: ['Chicken', 'Fish'],
      reminderCadenceDays: 3,
      autoRemindersEnabled: true,
      siteInfo: expect.objectContaining({ id: 'site-1', site_slug: 'alex-jordan' }),
      questions: [expect.objectContaining({ id: 'q1', label: 'Song?' })],
    }));
    expect(resolveActiveSiteForUserMock).toHaveBeenCalledWith('user-1');
  });

  it('loads guest dashboard snapshot through the service', async () => {
    const guestsQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: 'guest-1', name: 'Alex Jordan' }],
              error: null,
            }),
          })),
        })),
      })),
    };
    const rsvpsQuery = {
      select: vi.fn(() => ({
        in: vi.fn().mockResolvedValue({
          data: [{ guest_id: 'guest-1', attending: true }],
          error: null,
        }),
      })),
    };
    const conflictOpenLimit = vi.fn().mockResolvedValue({
      data: [{ id: 'conflict-1', guest_id: 'guest-1', conflict_code: 'missing_meal', message: 'Meal missing', severity: 'warning', created_at: '2026-05-07T00:00:00Z', resolved: false }],
      error: null,
    });
    const conflictHistoryLimit = vi.fn().mockResolvedValue({
      data: [{ id: 'conflict-2', guest_id: 'guest-1', conflict_code: 'late_rsvp', message: 'Late RSVP', severity: 'error', created_at: '2026-05-06T00:00:00Z', resolved: true, resolved_at: '2026-05-07T00:00:00Z' }],
      error: null,
    });
    const conflictsQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({ limit: conflictOpenLimit })),
          })),
          gte: vi.fn(() => ({
            order: vi.fn(() => ({ limit: conflictHistoryLimit })),
          })),
        })),
      })),
    };
    fromMock
      .mockReturnValueOnce(guestsQuery)
      .mockReturnValueOnce(rsvpsQuery)
      .mockReturnValueOnce(conflictsQuery)
      .mockReturnValueOnce(conflictsQuery);

    await expect(loadGuestDashboardSnapshot('site-1')).resolves.toEqual({
      guests: [{ id: 'guest-1', name: 'Alex Jordan', rsvp: { guest_id: 'guest-1', attending: true } }],
      conflicts: [{ id: 'conflict-1', guest_id: 'guest-1', conflict_code: 'missing_meal', message: 'Meal missing', severity: 'warning', created_at: '2026-05-07T00:00:00Z', resolved: false }],
      conflictHistory: [{ id: 'conflict-2', guest_id: 'guest-1', conflict_code: 'late_rsvp', message: 'Late RSVP', severity: 'error', created_at: '2026-05-06T00:00:00Z', resolved: true, resolved_at: '2026-05-07T00:00:00Z' }],
    });
  });

  it('loads guest dashboard itinerary filters through the service', async () => {
    const itineraryQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: 'event-1', event_name: 'Ceremony', event_date: '2026-06-01', start_time: '16:00', location_name: 'Garden' }],
              error: null,
            }),
          })),
        })),
      })),
    };
    const siteQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { wedding_data: { meta: { rsvpEventSeeds: [{ id: 'seed-1', label: 'Ceremony' }] } } },
            error: null,
          }),
        })),
      })),
    };
    const invitesQuery = {
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({
            data: [{ event_id: 'event-1', guest_id: 'guest-1' }],
            error: null,
          }),
        })),
      })),
    };
    fromMock
      .mockReturnValueOnce(itineraryQuery)
      .mockReturnValueOnce(siteQuery)
      .mockReturnValueOnce(invitesQuery);

    await expect(loadGuestDashboardItineraryFilters('site-1')).resolves.toEqual({
      itineraryEvents: [{ id: 'event-1', event_name: 'Ceremony', event_date: '2026-06-01', start_time: '16:00', location_name: 'Garden' }],
      filterEvents: [{ id: 'event-1', event_name: 'Ceremony', event_date: '2026-06-01', start_time: '16:00', location_name: 'Garden' }],
      eventInviteGuestMap: new Map([['event-1', new Set(['guest-1'])]]),
    });
  });

  it('loads guest dashboard RSVP audit feed through the service', async () => {
    const auditQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({
              data: [{
                id: 'audit-1',
                guest_id: 'guest-1',
                action: 'update',
                changed_at: '2026-05-07T00:00:00Z',
                changed_by: 'owner-1',
                old_data: { rsvp_status: 'pending' },
                new_data: { rsvp_status: 'confirmed' },
              }],
              error: null,
            }),
          })),
        })),
      })),
    };
    fromMock.mockReturnValueOnce(auditQuery);

    await expect(loadGuestDashboardRsvpAuditFeed('site-1')).resolves.toEqual([{
      id: 'audit-1',
      guest_id: 'guest-1',
      action: 'update',
      changed_at: '2026-05-07T00:00:00Z',
      changed_by: 'owner-1',
      old_data: { rsvp_status: 'pending' },
      new_data: { rsvp_status: 'confirmed' },
    }]);
  });

  it('loads guest itinerary drawer data through the service', async () => {
    const eventsQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: 'event-1', event_name: 'Ceremony', event_date: '2026-06-01', start_time: '16:00', location_name: 'Garden' }],
              error: null,
            }),
          })),
        })),
      })),
    };
    const invitesQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({
            data: [{ event_id: 'event-1' }],
            error: null,
          }),
        })),
      })),
    };
    const auditQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({
              data: [{
                id: 'audit-1',
                action: 'update',
                changed_at: '2026-05-07T00:00:00Z',
                changed_by: 'owner-1',
                old_data: { rsvp_status: 'pending' },
                new_data: { rsvp_status: 'confirmed' },
              }],
              error: null,
            }),
          })),
        })),
      })),
    };
    fromMock
      .mockReturnValueOnce(eventsQuery)
      .mockReturnValueOnce(invitesQuery)
      .mockReturnValueOnce(auditQuery);

    await expect(loadGuestItineraryDrawerSnapshot('site-1', 'guest-1')).resolves.toEqual({
      events: [{ id: 'event-1', event_name: 'Ceremony', event_date: '2026-06-01', start_time: '16:00', location_name: 'Garden' }],
      guestEventIds: new Set(['event-1']),
      auditEntries: [{
        id: 'audit-1',
        action: 'update',
        changed_at: '2026-05-07T00:00:00Z',
        changed_by: 'owner-1',
        old_data: { rsvp_status: 'pending' },
        new_data: { rsvp_status: 'confirmed' },
      }],
    });
  });

  it('inserts a guest event invitation through the service', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(addGuestEventInvitation('event-1', 'guest-1')).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenCalledWith('guest_dashboard_event_invitation_insert_many', {
      p_rows: [{ event_id: 'event-1', guest_id: 'guest-1' }],
    });
  });

  it('removes a guest event invitation through the service', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: { id: 'invite-1' }, error: null });

    fromMock
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
          })),
        })),
      });
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(removeGuestEventInvitation('event-1', 'guest-1')).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenCalledWith('guest_dashboard_event_invitation_delete', {
      p_guest_id: 'guest-1',
      p_event_id: 'event-1',
      p_guest_ids: null,
    });
  });

  it('imports guests through the service RPC', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ id: 'guest-1', first_name: 'Alex', last_name: 'Jordan', name: 'Alex Jordan', email: 'alex@example.com' }],
      error: null,
    });

    await expect(insertImportedGuests([{
      wedding_site_id: 'site-1',
      first_name: 'Alex',
      last_name: 'Jordan',
      name: 'Alex Jordan',
      email: 'alex@example.com',
    }])).resolves.toEqual([
      { id: 'guest-1', first_name: 'Alex', last_name: 'Jordan', name: 'Alex Jordan', email: 'alex@example.com' },
    ]);

    expect(rpcMock).toHaveBeenCalledWith('guest_dashboard_import_guests', {
      p_rows: [{
        wedding_site_id: 'site-1',
        first_name: 'Alex',
        last_name: 'Jordan',
        name: 'Alex Jordan',
        email: 'alex@example.com',
      }],
    });
  });

  it('replaces imported RSVP rows through the service RPC', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(replaceImportedGuestRsvps([{
      guest_id: 'guest-1',
      attending: true,
      meal_choice: 'Fish',
      plus_one_name: null,
      plus_one_count: 0,
      children_count: 0,
      responded_at: '2026-05-07T00:00:00Z',
    }])).resolves.toBeUndefined();

    expect(rpcMock).toHaveBeenCalledWith('guest_dashboard_rsvp_replace_many', {
      p_rows: [{
        guest_id: 'guest-1',
        attending: true,
        meal_choice: 'Fish',
        plus_one_name: null,
        plus_one_count: 0,
        children_count: 0,
        responded_at: '2026-05-07T00:00:00Z',
      }],
      p_guest_ids: null,
    });
  });

  it('saves an assisted RSVP through the service', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(saveAssistedGuestRsvp({
      guest: {
        id: 'guest-1',
        first_name: 'Alex',
        last_name: 'Jordan',
        name: 'Alex Jordan',
        email: null,
        phone: null,
        plus_one_allowed: false,
        plus_one_name: null,
        invited_to_ceremony: true,
        invited_to_reception: true,
        invite_token: null,
        rsvp_status: 'pending',
        rsvp_received_at: null,
        household_id: null,
        notes: null,
      },
      status: 'confirmed',
      source: 'phone',
      notes: 'Called and confirmed',
    })).resolves.toEqual(expect.objectContaining({
      recordedAt: expect.any(String),
      nextNotes: expect.stringContaining('Called and confirmed'),
    }));
    expect(rpcMock).toHaveBeenCalledWith('guest_dashboard_assisted_rsvp_write', expect.objectContaining({
      p_guest_id: 'guest-1',
      p_status: 'confirmed',
      p_notes: expect.stringContaining('Called and confirmed'),
    }));
  });

  it('deletes all guests through service RPC cleanup paths', async () => {
    const invitationLimitMock = vi.fn().mockResolvedValue({
      data: [{ id: 'invite-1' }],
      error: null,
    });
    const invitationInMock = vi.fn(() => ({ limit: invitationLimitMock }));
    const guestEqMock = vi.fn().mockResolvedValue({
      data: [{ id: 'guest-1' }, { id: 'guest-2' }],
      error: null,
    });

    fromMock
      .mockReturnValueOnce({
        select: vi.fn(() => ({ eq: guestEqMock })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({ in: invitationInMock })),
      });

    rpcMock
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null });

    await expect(deleteAllGuestsForSite('site-1')).resolves.toEqual({
      guestIds: ['guest-1', 'guest-2'],
      invitationIds: ['invite-1'],
    });

    expect(rpcMock).toHaveBeenNthCalledWith(1, 'guest_dashboard_event_invitation_delete', {
      p_guest_id: null,
      p_event_id: null,
      p_guest_ids: ['guest-1', 'guest-2'],
    });
    expect(rpcMock).toHaveBeenNthCalledWith(2, 'guest_dashboard_rsvp_replace_many', {
      p_rows: [],
      p_guest_ids: ['guest-1', 'guest-2'],
    });
    expect(rpcMock).toHaveBeenNthCalledWith(3, 'guest_dashboard_guest_delete_site', {
      p_wedding_site_id: 'site-1',
    });
  });

  it('resolves the guest dashboard site id through the service', async () => {
    resolveActiveSiteForUserMock.mockResolvedValueOnce({ id: 'site-1' });
    await expect(resolveGuestDashboardSiteId('user-1')).resolves.toBe('site-1');
    expect(resolveActiveSiteForUserMock).toHaveBeenCalledWith('user-1');
  });

  it('loads the guest dashboard site slug through the service', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: { site_slug: 'alex-jordan' }, error: null });
    fromMock.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: singleMock })),
      })),
    });

    await expect(loadGuestDashboardSiteSlug('site-1')).resolves.toBe('alex-jordan');
  });

  it('loads the guest dashboard public slug through the service', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: { id: 'site-1', site_slug: 'alex-jordan', site_url: 'https://dayof.love/alex-jordan' },
      error: null,
    });
    fromMock.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
      })),
    });

    await expect(loadGuestDashboardPublicSlug('site-1')).resolves.toBe('alex-jordan');
  });

  it('updates guest check-in through the service', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(updateGuestCheckInForSite('site-1', 'guest-1', '2026-05-07T00:00:00Z')).resolves.toBeUndefined();
  });

  it('updates thank-you state through the service', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(updateGuestThankYouSentForSite('site-1', 'guest-1', null)).resolves.toBeUndefined();
  });

  it('updates bulk thank-you state through the service', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(markGuestsThankYouSentForSite('site-1', ['guest-1', 'guest-2'], '2026-05-07T00:00:00Z')).resolves.toBeUndefined();
  });

  it('updates household state through the service', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(updateGuestHouseholdForSite('site-1', 'guest-1', null)).resolves.toBeUndefined();
  });

  it('assigns guests to a household through the service', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(assignGuestsToHouseholdForSite('site-1', ['guest-1', 'guest-2'], 'guest-1')).resolves.toBeUndefined();
  });

  it('persists reminder settings through the service', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(persistGuestReminderSettings('site-1', { auto_reminders_enabled: true })).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenCalledWith('guest_dashboard_persist_reminder_settings', {
      p_wedding_site_id: 'site-1',
      p_reminder_cadence_days: null,
      p_auto_reminders_enabled: true,
    });
  });

  it('persists guest RSVP config through the service', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(persistGuestDashboardRsvpConfig({
      weddingSiteId: 'site-1',
      questions: [],
      mealEnabled: true,
      mealOptions: ['Chicken', 'Fish'],
    })).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenCalledWith('guest_dashboard_persist_rsvp_config', {
      p_wedding_site_id: 'site-1',
      p_questions: [],
      p_meal_enabled: true,
      p_meal_options: ['Chicken', 'Fish'],
    });
  });

  it('marks guest invitation sent through the service', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(markGuestInvitationSentForSite('site-1', 'guest-1', '2026-05-07T00:00:00Z')).resolves.toBeUndefined();
  });

  it('marks guest invitation and reminder sent through the service', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(markGuestInvitationAndReminderSentForSite('site-1', 'guest-1', '2026-05-07T00:00:00Z')).resolves.toBeUndefined();
  });

  it('marks guest reminder sent through the service', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(markGuestReminderSentForSite('site-1', 'guest-1', '2026-05-07T00:00:00Z')).resolves.toBeUndefined();
  });

  it('clears guest check-ins through the service', async () => {
    const limitMock = vi.fn().mockResolvedValue({
      data: [{ id: 'guest-1' }, { id: 'guest-2' }],
      error: null,
    });
    const notMock = vi.fn(() => ({ limit: limitMock }));
    const eqMock = vi.fn(() => ({ not: notMock }));
    fromMock.mockReturnValueOnce({
      select: vi.fn(() => ({ eq: eqMock })),
    });
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(clearGuestCheckInsForSite('site-1')).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenCalledWith('guest_dashboard_guest_bulk_patch', {
      p_wedding_site_id: 'site-1',
      p_guest_ids: ['guest-1', 'guest-2'],
      p_payload: { checked_in_at: null, checkin_notes: null },
    });
  });

  it('rolls back guest RSVP state when assisted RSVP persistence fails', async () => {
    rpcMock.mockResolvedValueOnce({ error: new Error('nope') });

    await expect(saveAssistedGuestRsvp({
      guest: {
        id: 'guest-1',
        first_name: 'Alex',
        last_name: 'Jordan',
        name: 'Alex Jordan',
        email: null,
        phone: null,
        plus_one_allowed: false,
        plus_one_name: null,
        invited_to_ceremony: true,
        invited_to_reception: true,
        invite_token: null,
        rsvp_status: 'pending',
        rsvp_received_at: null,
        household_id: null,
        notes: 'old note',
      },
      status: 'declined',
      source: 'text',
      notes: 'Declined by text',
    })).rejects.toThrow();
  });
});
