import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('dashboard data boundary guards', () => {
  it('does not load message dashboard rows with select star', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/Messages.tsx'), 'utf8');
    const serviceSource = readFileSync(join(process.cwd(), 'src/pages/dashboard/messages/messageService.ts'), 'utf8');

    expect(serviceSource).toContain('const MESSAGE_SELECT = [');
    expect(serviceSource).toContain('.select(MESSAGE_SELECT)');
    expect(serviceSource).toContain('createDashboardMessage');
    expect(serviceSource).toContain('export async function getMessageAccessToken()');
    expect(serviceSource).toContain('supabase.auth.getSession()');
    expect(source).toContain('createDashboardMessage(payload)');
    expect(source).toContain('getMessageAccessToken()');
    expect(source).toContain('loadDashboardMessages(weddingSite.id)');
    expect(source).not.toContain("from '../../lib/supabase'");
    expect(source).not.toContain("supabase.from('messages').insert(payload)");
    expect(source).not.toContain('supabase.auth.getSession()');
    expect(source).not.toContain(".from('messages')\n        .select('*')");
    expect(source).not.toContain('.from("messages")\n        .select("*")');
  });

  it('keeps legacy public site repository reads out of private gate internals', () => {
    const source = readFileSync(join(process.cwd(), 'src/data/siteRepository.ts'), 'utf8');
    const fetchPublicSiteBody = source.match(/async fetchPublicSiteBySlug[\s\S]*?async fetchPublicSiteTranslation/)?.[0] ?? '';

    expect(fetchPublicSiteBody).not.toContain("'privacy_mode'");
    expect(fetchPublicSiteBody).not.toContain("'hide_from_search'");
    expect(fetchPublicSiteBody).not.toContain('.ilike(');
    expect(fetchPublicSiteBody).toContain('buildSiteUrlLookupCandidates(slug)');
  });

  it('loads persisted builder/public sections with an explicit section projection', () => {
    const source = readFileSync(join(process.cwd(), 'src/data/siteRepository.ts'), 'utf8');

    expect(source).toContain('const PERSISTED_SECTION_SELECT = ');
    expect(source).toContain('.select(PERSISTED_SECTION_SELECT)');
    expect(source).not.toContain(".from('sections')\n      .select('*')");
    expect(source).not.toContain(".from('sections')\n      .upsert({ ...rest, updated_at: new Date().toISOString() })\n      .select()\n      .single()");
    expect(source).not.toContain(".from('sections')\n      .insert({ ...section, site_id: siteId, created_at: now, updated_at: now })\n      .select()\n      .single()");
  });

  it('loads guest dashboard guest and RSVP rows with explicit projections', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/Guests.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/guestService.ts'), 'utf8');

    expect(source).toContain('loadGuestDashboardSiteSettings(user.id)');
    expect(source).toContain('loadGuestDashboardSnapshot(weddingSiteId)');
    expect(source).toContain('deleteGuestWithDependencies(guestId)');
    expect(source).toContain('deleteAllGuestsForSite(weddingSiteId)');
    expect(source).toContain('insertImportedGuests(guestRows)');
    expect(service).toContain('export const GUEST_SITE_SETTINGS_SELECT = ');
    expect(service).toContain('export const GUEST_DASHBOARD_RSVP_SELECT = ');
    expect(service).toContain('export const GUEST_CONFLICT_SELECT = ');
    expect(service).toContain('export async function loadGuestDashboardSiteSettings(userId: string)');
    expect(service).toContain('export async function loadGuestDashboardSnapshot(weddingSiteId: string)');
    expect(service).toContain('resolveActiveSiteForUser(userId)');
    expect(service).toContain('.select(GUEST_SITE_SETTINGS_SELECT)');
    expect(service).toContain(".from('guests')");
    expect(service).toContain('.select(GUEST_DASHBOARD_RSVP_SELECT)');
    expect(service).toContain('.select(GUEST_CONFLICT_SELECT)');
    expect(service).toContain('deleteGuestWithDependencies');
    expect(service).toContain('deleteAllGuestsForSite');
    expect(service).toContain('insertImportedGuests');
    expect(source).not.toContain(".from('guests')\n        .select('*')");
    expect(source).not.toContain(".from('wedding_sites')\n        .select('id, couple_name_1, couple_name_2");
    expect(source).not.toContain("supabase.from('rsvps').select('*')");
    expect(source).not.toContain("supabase.from('event_invitations').insert(rows)");
    expect(source).not.toContain("supabase.from('event_invitations').insert(eventInviteRows)");
    expect(source).not.toContain("supabase.from('rsvps').insert(rsvpRows)");
    expect(source).not.toContain("supabase.from('guests').delete().eq('id', createdGuestId)");
  });

  it('loads itinerary events and event guest picker rows with explicit projections', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/Itinerary.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/itineraryService.ts'), 'utf8');

    expect(source).toContain('const ITINERARY_EVENT_SELECT = ');
    expect(source).toContain('const EVENT_GUEST_PICKER_SELECT = ');
    expect(source).toContain('.select(ITINERARY_EVENT_SELECT)');
    expect(source).toContain('.select(EVENT_GUEST_PICKER_SELECT)');
    expect(source).toContain('resolveItinerarySiteId()');
    expect(source).toContain('createItineraryTemplateEvents(siteId, newEvents)');
    expect(source).toContain('syncItineraryScheduleMirror(siteId, eventList)');
    expect(source).not.toContain('supabase.auth.getUser()');
    expect(source).not.toContain("supabase.from('itinerary_events').insert(newEvents.map");
    expect(source).not.toContain(".from('wedding_sites')\n        .select('wedding_data')");
    expect(source).not.toContain(".from('sections')\n        .select('id,data')");
    expect(service).toContain('buildItineraryTemplateInsertRows(weddingSiteId, events)');
    expect(service).toContain('export async function resolveItinerarySiteId()');
    expect(service).toContain("const ITINERARY_SCHEDULE_MIRROR_SITE_SELECT = 'wedding_data'");
    expect(service).toContain("const ITINERARY_SCHEDULE_SECTION_SELECT = 'id,data'");
    expect(service).toContain('buildScheduleSectionEvents(eventList)');
    expect(service).toContain('buildWeddingSchedule(eventList)');
    expect(service).toContain('supabase.auth.getUser()');
    expect(source).not.toContain(".from('itinerary_events')\n        .select('*')");
    expect(source).not.toContain(".from('guests')\n        .select('*')");
  });

  it('loads registry service items with an explicit projection', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/registry/registryService.ts'), 'utf8');

    expect(source).toContain('const REGISTRY_ITEM_SELECT = ');
    expect(source).toContain('.select(REGISTRY_ITEM_SELECT)');
    expect(source).not.toContain(".from('registry_items')\n    .select('*')");
  });

  it('loads planning service rows with explicit projections', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/planning/planningService.ts'), 'utf8');
    const page = readFileSync(join(process.cwd(), 'src/pages/dashboard/Planning.tsx'), 'utf8');
    const addressTab = readFileSync(join(process.cwd(), 'src/pages/dashboard/planning/AddressCollectionTab.tsx'), 'utf8');
    const songTab = readFileSync(join(process.cwd(), 'src/pages/dashboard/planning/SongRequestsTab.tsx'), 'utf8');

    expect(source).toContain('const PLANNING_TASK_SELECT = ');
    expect(source).toContain('const PLANNING_VENDOR_SELECT = ');
    expect(source).toContain('const PLANNING_BUDGET_ITEM_SELECT = ');
    expect(source).toContain('const PLANNING_SITE_META_SELECT = ');
    expect(source).toContain('const PLANNING_TOTAL_BUDGET_SELECT = ');
    expect(source).toContain('const SEATING_READINESS_EVENT_SELECT = ');
    expect(source).toContain('const ADDRESS_COLLECTION_SITE_SELECT = ');
    expect(source).toContain('const ADDRESS_COLLECTION_GUEST_SELECT = ');
    expect(source).toContain('const SONG_REQUEST_SITE_SELECT = ');
    expect(source).toContain('const SONG_REQUEST_RSVP_SELECT = ');
    expect(source).toContain('.select(PLANNING_TASK_SELECT)');
    expect(source).toContain('const { data, error } = await query(PLANNING_VENDOR_SELECT)');
    expect(source).toContain('const fallback = await query(PLANNING_VENDOR_LEGACY_SELECT)');
    expect(source).toContain('.select(PLANNING_BUDGET_ITEM_SELECT)');
    expect(source).toContain('.select(PLANNING_SITE_META_SELECT)');
    expect(source).toContain('.select(PLANNING_TOTAL_BUDGET_SELECT)');
    expect(source).toContain('.select(SEATING_READINESS_EVENT_SELECT)');
    expect(source).toContain('.select(ADDRESS_COLLECTION_SITE_SELECT)');
    expect(source).toContain('.select(ADDRESS_COLLECTION_GUEST_SELECT)');
    expect(source).toContain('.select(SONG_REQUEST_SITE_SELECT)');
    expect(source).toContain('.select(SONG_REQUEST_RSVP_SELECT)');
    expect(source).not.toContain(".from('planning_tasks')\n    .select('*')");
    expect(source).not.toContain(".from('planning_vendors')\n    .select('*')");
    expect(source).not.toContain(".from('planning_budget_items')\n    .select('*')");
    expect(source).not.toContain('.insert(mutablePayload).select().single()');
    expect(page).not.toContain("supabase.from('wedding_sites')");
    expect(page).not.toContain("supabase.from('guests')");
    expect(page).not.toContain("supabase\n        .from('wedding_sites')");
    expect(addressTab).not.toContain("from '../../../lib/supabase'");
    expect(addressTab).not.toContain("supabase.from('wedding_sites')");
    expect(addressTab).not.toContain(".from('guests')");
    expect(songTab).not.toContain("from '../../../lib/supabase'");
    expect(songTab).not.toContain("supabase.from('wedding_sites')");
    expect(songTab).not.toContain(".from('rsvps')");
  });

  it('loads builder editor and media rows with explicit projections', () => {
    const builderProjectSource = readFileSync(join(process.cwd(), 'src/builder/services/builderProjectService.ts'), 'utf8');
    const mediaSource = readFileSync(join(process.cwd(), 'src/builder/services/mediaRepository.ts'), 'utf8');
    const builderPageSource = readFileSync(join(process.cwd(), 'src/builder/BuilderPage.tsx'), 'utf8');

    expect(builderProjectSource).toContain('const BUILDER_PROJECT_SITE_SELECT = ');
    expect(builderProjectSource).toContain('const BUILDER_WEDDING_DATA_SITE_SELECT = ');
    expect(builderProjectSource).toContain('const BUILDER_ENTRY_SITE_SELECT = ');
    expect(builderProjectSource).toContain('.select(BUILDER_PROJECT_SITE_SELECT)');
    expect(builderProjectSource).toContain('.select(BUILDER_WEDDING_DATA_SITE_SELECT)');
    expect(builderProjectSource).toContain('.select(BUILDER_ENTRY_SITE_SELECT)');
    expect(mediaSource).toContain('const BUILDER_MEDIA_ASSET_SELECT = ');
    expect(mediaSource).toContain('.select(BUILDER_MEDIA_ASSET_SELECT)');
    expect(builderPageSource).toContain('builderProjectService.loadEntrySite(activeSite?.id ?? \'\')');
    expect(builderProjectSource).not.toContain(".from('wedding_sites')\n      .select('*')");
    expect(mediaSource).not.toContain(".from('builder_media_assets')\n      .select('*')");
    expect(builderPageSource).not.toContain(".from('wedding_sites')\n        .select('*')");
  });

  it('loads vendor profile rows with an explicit public profile projection', () => {
    const source = readFileSync(join(process.cwd(), 'src/lib/vendorProfiles.ts'), 'utf8');

    expect(source).toContain('const VENDOR_PROFILE_SELECT = ');
    expect(source).toContain('.select(VENDOR_PROFILE_SELECT)');
    expect(source).not.toContain(".from('vendor_profiles')\n      .select('*')");
    expect(source).not.toContain(".from('vendor_profiles')\n    .select('*')");
  });

  it('loads seating service rows with explicit projections', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/seating/seatingService.ts'), 'utf8');
    const page = readFileSync(join(process.cwd(), 'src/pages/dashboard/Seating.tsx'), 'utf8');
    const lookupPage = readFileSync(join(process.cwd(), 'src/pages/dashboard/SeatingLookup.tsx'), 'utf8');

    expect(source).toContain('const SEATING_EVENT_SELECT = ');
    expect(source).toContain('const SEATING_TABLE_SELECT = ');
    expect(source).toContain('const SEATING_ASSIGNMENT_SELECT = ');
    expect(source).toContain('const SEATING_ELIGIBLE_GUEST_SELECT = ');
    expect(source).toContain('const SEATING_LAYOUT_VERSION_SELECT = ');
    expect(source).toContain('const SEATING_LOOKUP_EVENT_SELECT = ');
    expect(source).toContain('const SEATING_LOOKUP_ASSIGNMENT_SELECT = ');
    expect(source).toContain('const SEATING_LOOKUP_TABLE_SELECT = ');
    expect(source).toContain('const SEATING_LOOKUP_GUEST_SELECT = ');
    expect(source).toContain('.select(SEATING_EVENT_SELECT)');
    expect(source).toContain('.select(SEATING_TABLE_SELECT)');
    expect(source).toContain('.select(SEATING_ASSIGNMENT_SELECT)');
    expect(source).toContain('.select(SEATING_ELIGIBLE_GUEST_SELECT)');
    expect(source).toContain('.select(SEATING_LAYOUT_VERSION_SELECT)');
    expect(source).toContain('.select(SEATING_LOOKUP_EVENT_SELECT)');
    expect(source).toContain('.select(SEATING_LOOKUP_ASSIGNMENT_SELECT)');
    expect(source).toContain('.select(SEATING_LOOKUP_TABLE_SELECT)');
    expect(source).toContain('.select(SEATING_LOOKUP_GUEST_SELECT)');
    expect(source).toContain('export async function refreshSeatingSession()');
    expect(source).toContain('supabase.auth.refreshSession()');
    expect(source).not.toContain(".from('seating_events')\n    .select('*')");
    expect(source).not.toContain(".from('seating_tables')\n    .select('*')");
    expect(source).not.toContain(".from('seating_assignments')\n    .select('*')");
    expect(source).not.toContain(".from('seating_tables')\n    .insert(tables)\n    .select()");
    expect(source).not.toContain(".from('seating_assignments')\n    .upsert(assignments, { onConflict: 'seating_event_id,guest_id' })\n    .select()");
    expect(source).not.toContain(".from('guests')\n    .select('*')");
    expect(source).not.toContain(".from('seating_layout_versions')\n    .select('*')");
    expect(page).toContain('refreshSeatingSession()');
    expect(page).not.toContain("from '../../lib/supabase'");
    expect(page).not.toContain('supabase.auth.refreshSession()');
    expect(lookupPage).not.toContain("from '../../lib/supabase'");
    expect(lookupPage).not.toContain("from '../../lib/activeSite'");
    expect(lookupPage).not.toContain("supabase.from(");
  });

  it('keeps coordinator mode dashboard reads and writes behind its service', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/dashboard/CoordinatorMode.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/coordinator/coordinatorService.ts'), 'utf8');

    expect(service).toContain('const COORDINATOR_GUEST_SELECT = ');
    expect(service).toContain('const COORDINATOR_EVENT_SELECT = ');
    expect(service).toContain('const COORDINATOR_EVENT_INVITATION_SELECT = ');
    expect(service).toContain('const COORDINATOR_QNA_SELECT = ');
    expect(service).toContain('const COORDINATOR_QNA_INSERT_SELECT = ');
    expect(service).toContain('.select(COORDINATOR_GUEST_SELECT)');
    expect(service).toContain('.select(COORDINATOR_EVENT_SELECT)');
    expect(service).toContain('.select(COORDINATOR_EVENT_INVITATION_SELECT)');
    expect(service).toContain('.select(COORDINATOR_QNA_SELECT)');
    expect(service).toContain('.select(COORDINATOR_QNA_INSERT_SELECT)');
    expect(service).not.toContain(".from('guests')\n      .select('*')");
    expect(service).not.toContain(".from('itinerary_events')\n      .select('*')");
    expect(service).not.toContain(".from('guest_qna_items')\n      .select('*')");
    expect(page).not.toContain("from '../../lib/supabase'");
    expect(page).not.toContain("from '../../lib/activeSite'");
    expect(page).not.toContain("supabase.from(");
  });

  it('loads name-change planner rows with explicit projections', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/planning/nameChangeService.ts'), 'utf8');

    expect(source).toContain('const NAME_CHANGE_CASE_SELECT = ');
    expect(source).toContain('const NAME_CHANGE_DOCUMENT_SELECT = ');
    expect(source).toContain('const NAME_CHANGE_EXTRACTED_FIELD_SELECT = ');
    expect(source).toContain('const NAME_CHANGE_PLAN_SNAPSHOT_SELECT = ');
    expect(source).toContain('const NAME_CHANGE_REMINDER_SELECT = ');
    expect(source).toContain('.select(NAME_CHANGE_CASE_SELECT)');
    expect(source).toContain('.select(NAME_CHANGE_DOCUMENT_SELECT)');
    expect(source).toContain('.select(NAME_CHANGE_EXTRACTED_FIELD_SELECT)');
    expect(source).toContain('.select(NAME_CHANGE_PLAN_SNAPSHOT_SELECT)');
    expect(source).toContain('.select(NAME_CHANGE_REMINDER_SELECT)');
    expect(source).toContain('function toPersistedNameChangeReminderRow');
    expect(source).toContain('toPersistedNameChangeReminderRow(reminder, caseId)');
    expect(source).not.toContain(".from('name_change_cases').select('*')");
    expect(source).not.toContain(".from('name_change_documents').select('*')");
    expect(source).not.toContain(".from('name_change_extracted_fields').select('*')");
    expect(source).not.toContain(".from('name_change_plan_snapshots').select('*')");
    expect(source).not.toContain(".from('name_change_reminders').select('*')");
    expect(source).not.toContain('.upsert(payload, { onConflict: \'wedding_site_id\' })\n    .select()\n    .single()');
  });

  it('loads vault dashboard rows with explicit projections', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/Vault.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/vaultService.ts'), 'utf8');

    expect(service).toContain('export const VAULT_CONFIG_SELECT = ');
    expect(service).toContain('export const VAULT_ENTRY_SELECT = ');
    expect(service).toContain('const VAULT_SITE_SELECT = ');
    expect(service).toContain('.select(VAULT_CONFIG_SELECT)');
    expect(service).toContain('.select(VAULT_ENTRY_SELECT)');
    expect(service).toContain('.select(VAULT_SITE_SELECT)');
    expect(source).not.toContain(".from('vault_configs')\n            .select('*')");
    expect(source).not.toContain(".from('vault_entries')\n              .select('*')");
    expect(source).not.toContain(".from('vault_configs')\n        .select('*')");
    expect(source).not.toContain(".from('vault_entries')\n          .select('*')");
    expect(source).not.toContain("supabase.from('vault_entries')");
    expect(source).not.toContain("supabase.from('vault_configs')");
    expect(source).not.toContain(".from('wedding_sites')");
    expect(source).not.toContain("supabase.functions.invoke('vault-resolve-entry-link'");
    expect(source).not.toContain("supabase.functions.invoke('google-drive-health'");
    expect(source).not.toContain("supabase.functions.invoke('google-drive-auth-start'");
    expect(source).not.toContain("supabase.functions.invoke('google-drive-auth-callback'");
    expect(source).toContain('resolveVaultEntryLinkFromService(entry.id)');
    expect(source).toContain('checkVaultGoogleDriveHealth(weddingSiteId)');
    expect(source).toContain('startVaultGoogleDriveAuth(weddingSiteId)');
    expect(source).toContain('finishVaultGoogleDriveAuth(googleCode, googleState)');
    expect(service).toContain('export async function resolveVaultEntryLink(entryId: string): Promise<string | null>');
    expect(service).toContain('export async function checkVaultGoogleDriveHealth(siteId: string): Promise<{');
    expect(service).toContain('export async function startVaultGoogleDriveAuth(siteId: string): Promise<string>');
    expect(service).toContain('export async function finishVaultGoogleDriveAuth(code: string, state: string): Promise<{');
    expect(service).not.toContain(".from('vault_configs')\n    .select('*')");
    expect(service).not.toContain(".from('vault_entries')\n    .select('*')");
    expect(service).not.toContain(".from('wedding_sites')\n    .select('*')");
    expect(source).not.toContain(".select('*');");
  });

  it('keeps overview intelligence persistence behind its service', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/Overview.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/overviewService.ts'), 'utf8');

    expect(source).toContain('persistOverviewIntelligenceDismissals(stats.siteId, next)');
    expect(source).toContain('hideInteractiveSuggestion(id)');
    expect(source).toContain('loadOverviewDashboardSnapshot(user.id)');
    expect(source).toContain('loadOverviewInteractiveData(slug)');
    expect(source).toContain('markOverviewBuilderFieldAsUserEdited(stats.siteId, fieldPath)');
    expect(source).not.toContain("supabase.from('interactive_suggestions').update({ is_hidden: true })");
    expect(source).not.toContain('intelligenceDismissals: next');
    expect(source).not.toContain("supabase.from('wedding_sites')");
    expect(source).not.toContain("supabase.from('guests')");
    expect(source).not.toContain("supabase.from('interactive_suggestions')");
    expect(source).not.toContain("supabase.from('interactive_votes')");
    expect(service).toContain("const OVERVIEW_DISMISSALS_SITE_SELECT = 'wedding_data'");
    expect(service).toContain("const OVERVIEW_SITE_SELECT = 'id, site_slug, site_url, is_published, site_json, updated_at, template_id, wedding_data, onboarding_answers, couple_name_1, couple_name_2, venue_name, wedding_date, venue_date, wedding_location'");
    expect(service).toContain('.select(OVERVIEW_DISMISSALS_SITE_SELECT)');
    expect(service).toContain('.select(OVERVIEW_SITE_SELECT)');
    expect(service).toContain('.select(OVERVIEW_GUEST_SELECT)');
    expect(service).not.toContain(".from('wedding_sites')\n    .select('*')");
  });

  it('keeps guest photo bucket persistence behind its service', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/GuestPhotoSharing.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/guestPhotoSharingService.ts'), 'utf8');

    expect(source).toContain('persistGuestPhotoBuckets(siteId, nextBuckets)');
    expect(source).toContain('resolveGuestPhotoDashboardUserId()');
    expect(source).toContain('refreshGuestPhotoSession()');
    expect(source).toContain('getGuestPhotoCurrentUserId()');
    expect(source).toContain('invokeGuestPhotoOwnerFunction<T>(fnName, body)');
    expect(source).toContain('queueGuestPhotoFollowupsFromService(siteId, kind)');
    expect(source).not.toContain('supabase.auth.getUser()');
    expect(source).not.toContain('supabase.auth.getSession()');
    expect(source).not.toContain('supabase.auth.refreshSession()');
    expect(source).not.toContain("invokeFunctionOrThrow(supabase, fnName, body)");
    expect(source).not.toContain("invokeFunctionOrThrow(supabase, 'queue-guest-followups'");
    expect(source).not.toContain("supabase.from('wedding_sites').update({ wedding_data: nextWeddingData, site_json: nextSiteJson })");
    expect(service).toContain("const GUEST_PHOTO_BUCKET_SITE_SELECT = 'wedding_data, site_json'");
    expect(service).toContain('export async function refreshGuestPhotoSession(): Promise<boolean>');
    expect(service).toContain('export async function getGuestPhotoCurrentUserId(): Promise<string | null>');
    expect(service).toContain('export async function resolveGuestPhotoDashboardUserId(): Promise<string | null>');
    expect(service).toContain('export async function invokeGuestPhotoOwnerFunction<T = unknown>(');
    expect(service).toContain("export async function queueGuestPhotoFollowups(");
    expect(service).toContain('supabase.auth.getUser()');
    expect(service).toContain('supabase.auth.getSession()');
    expect(service).toContain('supabase.auth.refreshSession()');
    expect(service).toContain("const data = await invokeFunctionOrThrow(supabase, fnName, body);");
    expect(service).toContain("return await invokeGuestPhotoOwnerFunction<{ queued?: number }>('queue-guest-followups', { siteId, kind })");
    expect(service).toContain('.select(GUEST_PHOTO_BUCKET_SITE_SELECT)');
    expect(service).not.toContain(".from('wedding_sites')\n    .select('*')");
  });
});
