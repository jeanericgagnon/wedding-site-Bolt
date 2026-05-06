import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function collectRuntimeTsxFiles(root: string): string[] {
  const entries = readdirSync(root);
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(root, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...collectRuntimeTsxFiles(path));
      continue;
    }
    if (entry.endsWith('.tsx') && !entry.includes('.test.') && !entry.includes('.spec.')) {
      files.push(path);
    }
  }

  return files;
}

function collectRuntimeSourceFiles(root: string): string[] {
  const entries = readdirSync(root);
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(root, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...collectRuntimeSourceFiles(path));
      continue;
    }
    if (
      (entry.endsWith('.ts') || entry.endsWith('.tsx')) &&
      !entry.includes('.test.') &&
      !entry.includes('.spec.')
    ) {
      files.push(path);
    }
  }

  return files;
}

describe('dashboard data boundary guards', () => {
  it('keeps runtime pages, builder screens, and public sections from owning direct Supabase table access', () => {
    const roots = [
      join(process.cwd(), 'src/pages'),
      join(process.cwd(), 'src/builder'),
      join(process.cwd(), 'src/sections'),
    ];
    const files = roots.flatMap(collectRuntimeTsxFiles);
    const offenders = files.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const hasDirectTableAccess = /supabase\s*(?:\.\s*from|\n\s*\.\s*from)\s*\(/.test(source);
      return hasDirectTableAccess ? [file.replace(`${process.cwd()}/`, '')] : [];
    });

    expect(offenders).toEqual([]);
  });

  it('keeps runtime pages, builder code, and public sections from using select star', () => {
    const roots = [
      join(process.cwd(), 'src/pages'),
      join(process.cwd(), 'src/builder'),
      join(process.cwd(), 'src/sections'),
    ];
    const files = roots.flatMap(collectRuntimeSourceFiles);
    const offenders = files.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const hasSelectStar = /\.select\(\s*['"`]\*['"`]/.test(source);
      return hasSelectStar ? [file.replace(`${process.cwd()}/`, '')] : [];
    });

    expect(offenders).toEqual([]);
  });

  it('does not load message dashboard rows with select star', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/Messages.tsx'), 'utf8');
    const selectSource = readFileSync(join(process.cwd(), 'src/pages/dashboard/messages/messageSelect.ts'), 'utf8');
    const serviceSource = readFileSync(join(process.cwd(), 'src/pages/dashboard/messages/messageService.ts'), 'utf8');

    expect(selectSource).toContain('const MESSAGES_DASHBOARD_SELECT = [');
    expect(serviceSource).toContain('.select(MESSAGES_DASHBOARD_SELECT)');
    expect(source).toContain('loadDashboardMessages(weddingSite.id)');
    expect(source).toContain('loadMessageGuests(weddingSite.id)');
    expect(source).toContain('loadMessagesActiveSite(user.id)');
    expect(source).toContain('loadMessageDeliveries(messageIds)');
    expect(source).toContain('loadMessageItineraryAudience(weddingSite.id)');
    expect(source).toContain('loadSmsCreditPreview(weddingSite.id, cutoff)');
    expect(source).toContain('insertDashboardMessageMinimal({');
    expect(source).toContain('updateDashboardMessage(message.id, {');
    expect(serviceSource).toContain('createDashboardMessage');
    expect(source).toContain('createDashboardMessage(payload)');
    expect(source).not.toContain("supabase.from('messages').insert(payload)");
    expect(source).not.toMatch(/supabase\s*\n\s*\.from/);
    expect(serviceSource).toContain('export const MESSAGES_SITE_SELECT = ');
    expect(serviceSource).toContain('export const MESSAGE_GUEST_SELECT = ');
    expect(serviceSource).toContain('export const MESSAGE_DELIVERY_SELECT = ');
    expect(serviceSource).toContain('export const MESSAGE_EVENT_SELECT = ');
    expect(serviceSource).toContain('export const MESSAGE_EVENT_INVITATION_SELECT = ');
    expect(serviceSource).toContain('export const SMS_EXPIRING_CREDIT_SELECT = ');
    expect(serviceSource).toContain('export const SMS_TRANSACTION_SELECT = ');
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
    const checkInSource = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardCheckIns.ts'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/guestService.ts'), 'utf8');

    expect(source).toContain('loadGuestDashboardSite(user.id)');
    expect(source).toContain('loadGuestDashboardRows(weddingSiteId)');
    expect(source).toContain('loadGuestDrawerDetails(weddingSiteId, guest.id)');
    expect(source).toContain('loadGuestItineraryFilters(weddingSiteId)');
    expect(source).toContain('loadGuestRsvpAuditFeed(weddingSiteId)');
    expect(source).toContain('setGuestEventInvitation(itineraryDrawerGuest.id, eventId, !currentlyInvited)');
    expect(source).toContain('saveAssistedGuestRsvp({');
    expect(source).toContain('resolveGuestRsvpConflict(conflictId)');
    expect(source).toContain('resolveGuestRsvpConflicts(ids)');
    expect(source).toContain('saveGuestRsvpConfig(weddingSiteId, cleanedConfig.questions, rsvpMealEnabled, cleanedConfig.mealOptions)');
    expect(checkInSource).toContain('updateGuestForSite(weddingSiteId, guest.id, { checked_in_at: nextValue })');
    expect(checkInSource).toContain('updateGuestsForSite(weddingSiteId, ids, { thank_you_sent_at: new Date().toISOString() })');
    expect(checkInSource).toContain('clearGuestCheckInsForSite(weddingSiteId)');
    expect(source).toContain('saveGuestReminderSettings(weddingSiteId, patch)');
    expect(source).toContain('updateGuestInvitationTimestamps(guest.id, { invitation_sent_at: new Date().toISOString() })');
    expect(source).toContain('deleteGuestWithDependencies(guestId)');
    expect(source).toContain('deleteAllGuestsForSite(weddingSiteId)');
    expect(source).toContain('insertImportedGuests(guestRows)');
    expect(service).toContain('export const GUEST_DASHBOARD_SITE_SELECT = ');
    expect(service).toContain('export const GUEST_DASHBOARD_GUEST_SELECT = ');
    expect(service).toContain('export const GUEST_DASHBOARD_RSVP_SELECT = ');
    expect(service).toContain('export const GUEST_DASHBOARD_CONFLICT_SELECT = ');
    expect(service).toContain('export const GUEST_DASHBOARD_ITINERARY_EVENT_SELECT = ');
    expect(service).toContain('export const GUEST_DASHBOARD_WEDDING_DATA_SELECT = ');
    expect(service).toContain('export const GUEST_DASHBOARD_EVENT_INVITATION_SELECT = ');
    expect(service).toContain('export const GUEST_DASHBOARD_AUDIT_SELECT = ');
    expect(service).toContain('export const GUEST_DRAWER_EVENT_INVITATION_SELECT = ');
    expect(service).toContain('export const GUEST_DRAWER_AUDIT_SELECT = ');
    expect(service).toContain('export const GUEST_ASSISTED_RSVP_SELECT = ');
    expect(service).toContain('.select(GUEST_DASHBOARD_SITE_SELECT)');
    expect(service).toContain('.select(GUEST_DASHBOARD_GUEST_SELECT)');
    expect(service).toContain('.select(GUEST_DASHBOARD_RSVP_SELECT)');
    expect(service).toContain('.select(GUEST_DASHBOARD_CONFLICT_SELECT)');
    expect(service).toContain('.select(GUEST_DASHBOARD_ITINERARY_EVENT_SELECT)');
    expect(service).toContain('.select(GUEST_DASHBOARD_WEDDING_DATA_SELECT)');
    expect(service).toContain('.select(GUEST_DASHBOARD_EVENT_INVITATION_SELECT)');
    expect(service).toContain('.select(GUEST_DASHBOARD_AUDIT_SELECT)');
    expect(service).toContain('.select(GUEST_DRAWER_EVENT_INVITATION_SELECT)');
    expect(service).toContain('.select(GUEST_DRAWER_AUDIT_SELECT)');
    expect(service).toContain('.select(GUEST_ASSISTED_RSVP_SELECT)');
    expect(service).toContain('deleteGuestWithDependencies');
    expect(service).toContain('deleteAllGuestsForSite');
    expect(service).toContain('insertImportedGuests');
    expect(service).toContain('updateGuestForSite');
    expect(service).toContain('updateGuestsForSite');
    expect(service).toContain('clearGuestCheckInsForSite');
    expect(service).toContain('saveGuestReminderSettings');
    expect(service).toContain('updateGuestInvitationTimestamps');
    expect(source).not.toContain(".from('guests')\n        .select('id, first_name, last_name");
    expect(source).not.toContain(".from('guests')\n        .update({ checked_in_at: nextValue })");
    expect(source).not.toContain(".from('guests')\n        .update({ thank_you_sent_at: nextValue })");
    expect(source).not.toContain(".from('wedding_sites')\n      .update(patch)");
    expect(source).not.toContain(".from('wedding_sites')\n      .select('site_slug')");
    expect(source).not.toContain(".from('rsvp_conflicts')");
    expect(source).not.toContain(".from('guest_audit_logs')\n          .select('id, guest_id, action, changed_at, changed_by, old_data, new_data')");
    expect(source).not.toContain(".from('event_invitations')");
    expect(source).not.toContain(".from('rsvps')");
    expect(source).not.toMatch(/supabase\s*\n\s*\.from/);
    expect(source).not.toContain(".from('guests')\n        .select('*')");
    expect(source).not.toContain("supabase.from('rsvps').select('*')");
    expect(source).not.toContain("supabase.from('event_invitations').insert(rows)");
    expect(source).not.toContain("supabase.from('event_invitations').insert(eventInviteRows)");
    expect(source).not.toContain("supabase.from('rsvps').insert(rsvpRows)");
    expect(source).not.toContain("supabase.from('guests').delete().eq('id', createdGuestId)");
  });

  it('loads itinerary events and event guest picker rows with explicit projections', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/Itinerary.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/itineraryService.ts'), 'utf8');

    expect(source).toContain('loadItineraryEventsForUser(user.id, hasEventRsvpsTable)');
    expect(source).toContain('saveItineraryEvent(siteId, payload, editingEvent?.id ?? null)');
    expect(source).toContain('deleteItineraryEvent(eventId)');
    expect(source).toContain('updateItineraryEventTimes(siteId, nextEvents)');
    expect(source).toContain('createItineraryTemplateEvents(siteId, newEvents)');
    expect(source).toContain('loadEventGuestPicker(user.id, eventId)');
    expect(source).toContain('upsertEventGuestInvitations(eventId, [guestId])');
    expect(source).toContain('removeEventGuestInvitation(eventId, guestId)');
    expect(source).toContain('removeAllEventInvitations(eventId)');
    expect(source).not.toContain("from '../../lib/activeSite'");
    expect(source).not.toMatch(/supabase\s*\n\s*\.from/);
    expect(service).toContain('export const ITINERARY_EVENT_SELECT = ');
    expect(service).toContain('export const EVENT_GUEST_PICKER_SELECT = ');
    expect(service).toContain('export const ITINERARY_SITE_SELECT = ');
    expect(service).toContain('export const ITINERARY_WEDDING_DATA_SELECT = ');
    expect(service).toContain('export const ITINERARY_SCHEDULE_SECTION_SELECT = ');
    expect(service).toContain('export const EVENT_INVITATION_ID_SELECT = ');
    expect(service).toContain('export const EVENT_INVITATION_GUEST_SELECT = ');
    expect(service).toContain('export const EVENT_RSVP_ATTENDING_SELECT = ');
    expect(service).toContain('.select(ITINERARY_EVENT_SELECT)');
    expect(service).toContain('.select(EVENT_GUEST_PICKER_SELECT)');
    expect(service).toContain('.select(ITINERARY_SITE_SELECT)');
    expect(service).toContain('.select(ITINERARY_WEDDING_DATA_SELECT)');
    expect(service).toContain('.select(ITINERARY_SCHEDULE_SECTION_SELECT)');
    expect(source).not.toContain("createItineraryTemplateEvents(activeSite.id, newEvents)");
    expect(source).not.toContain("supabase.from('itinerary_events').insert(newEvents.map");
    expect(service).toContain('buildItineraryTemplateInsertRows(weddingSiteId, events)');
    expect(source).not.toContain(".from('itinerary_events')\n        .select('*')");
    expect(source).not.toContain(".from('guests')\n        .select('*')");
  });

  it('loads registry service items with an explicit projection', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/dashboard/Registry.tsx'), 'utf8');
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/registry/registryService.ts'), 'utf8');

    expect(source).toContain('const REGISTRY_ITEM_SELECT = ');
    expect(source).toContain('export const REGISTRY_DASHBOARD_SITE_SELECT = ');
    expect(source).toContain('.select(REGISTRY_ITEM_SELECT)');
    expect(source).toContain('.select(REGISTRY_DASHBOARD_SITE_SELECT)');
    expect(page).toContain('loadRegistryDashboardSite(user.id)');
    expect(page).toContain('saveRegistryRefreshPolicy(weddingSiteId, {');
    expect(page).toContain('updateRegistryRefreshBudget(weddingSiteId, {');
    expect(page).not.toContain("from '../../lib/supabase'");
    expect(page).not.toContain("from '../../lib/activeSite'");
    expect(page).not.toMatch(/supabase\s*\n\s*\.from/);
    expect(source).not.toContain(".from('registry_items')\n    .select('*')");
    expect(source).not.toContain(".from('wedding_sites')\n    .select('*')");
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
    expect(builderProjectSource).toContain('loadEntrySite(weddingSiteId: string)');
    expect(builderProjectSource).toContain('.select(BUILDER_PROJECT_SITE_SELECT)');
    expect(builderProjectSource).toContain('.select(BUILDER_WEDDING_DATA_SITE_SELECT)');
    expect(builderProjectSource).toContain('.select(BUILDER_ENTRY_SITE_SELECT)');
    expect(mediaSource).toContain('const BUILDER_MEDIA_ASSET_SELECT = ');
    expect(mediaSource).toContain('.select(BUILDER_MEDIA_ASSET_SELECT)');
    expect(builderPageSource).toContain('builderProjectService.loadEntrySite(activeSite?.id ?? \'\')');
    expect(builderPageSource).not.toContain("from '../lib/supabase'");
    expect(builderPageSource).not.toContain('BUILDER_ENTRY_SITE_SELECT');
    expect(builderProjectSource).not.toContain(".from('wedding_sites')\n      .select('*')");
    expect(mediaSource).not.toContain(".from('builder_media_assets')\n      .select('*')");
    expect(builderPageSource).not.toContain(".from('wedding_sites')");
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
    expect(source).not.toContain(".from('seating_events')\n    .select('*')");
    expect(source).not.toContain(".from('seating_tables')\n    .select('*')");
    expect(source).not.toContain(".from('seating_assignments')\n    .select('*')");
    expect(source).not.toContain(".from('seating_tables')\n    .insert(tables)\n    .select()");
    expect(source).not.toContain(".from('seating_assignments')\n    .upsert(assignments, { onConflict: 'seating_event_id,guest_id' })\n    .select()");
    expect(source).not.toContain(".from('guests')\n    .select('*')");
    expect(source).not.toContain(".from('seating_layout_versions')\n    .select('*')");
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
    expect(service).not.toContain(".from('vault_configs')\n    .select('*')");
    expect(service).not.toContain(".from('vault_entries')\n    .select('*')");
    expect(service).not.toContain(".from('wedding_sites')\n    .select('*')");
    expect(source).not.toContain(".select('*');");
  });

  it('keeps overview intelligence persistence behind its service', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/Overview.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/overviewService.ts'), 'utf8');

    expect(source).toContain('loadOverviewActiveSite(user.id)');
    expect(source).toContain('loadOverviewGuests(site?.id)');
    expect(source).toContain('loadOverviewCounts(site?.id)');
    expect(source).toContain('loadOverviewInteractiveActivity(slug)');
    expect(source).toContain('markOverviewBuilderFieldAsUserEdited(stats.siteId, fieldPath)');
    expect(source).toContain('loadOverviewDraftSource(stats.siteId)');
    expect(source).toContain('updateOverviewDraftFromBrief(stats.siteId, {');
    expect(source).toContain('persistOverviewIntelligenceDismissals(stats.siteId, next)');
    expect(source).toContain('hideInteractiveSuggestion(id)');
    expect(source).not.toContain("from '../../lib/supabase'");
    expect(source).not.toContain("from '../../lib/activeSite'");
    expect(source).not.toMatch(/supabase\s*\n\s*\.from/);
    expect(source).not.toContain("supabase.from('interactive_suggestions').update({ is_hidden: true })");
    expect(source).not.toContain('intelligenceDismissals: next');
    expect(service).toContain('export const OVERVIEW_SITE_SELECT = ');
    expect(service).toContain('export const OVERVIEW_GUEST_SELECT = ');
    expect(service).toContain('export const OVERVIEW_DRAFT_SOURCE_SELECT = ');
    expect(service).toContain('export const OVERVIEW_BUILDER_SITE_JSON_SELECT = ');
    expect(service).toContain('export const OVERVIEW_INTERACTIVE_SUGGESTION_SELECT = ');
    expect(service).toContain('export const OVERVIEW_INTERACTIVE_VOTE_SELECT = ');
    expect(service).toContain('.select(OVERVIEW_SITE_SELECT)');
    expect(service).toContain('.select(OVERVIEW_GUEST_SELECT)');
    expect(service).toContain('.select(OVERVIEW_DRAFT_SOURCE_SELECT)');
    expect(service).toContain('.select(OVERVIEW_BUILDER_SITE_JSON_SELECT)');
    expect(service).toContain('.select(OVERVIEW_INTERACTIVE_SUGGESTION_SELECT)');
    expect(service).toContain('.select(OVERVIEW_INTERACTIVE_VOTE_SELECT)');
    expect(service).toContain("const OVERVIEW_DISMISSALS_SITE_SELECT = 'wedding_data'");
    expect(service).toContain('.select(OVERVIEW_DISMISSALS_SITE_SELECT)');
    expect(service).not.toContain(".from('wedding_sites')\n    .select('*')");
    expect(service).not.toContain(".from('guests')\n    .select('*')");
    expect(service).not.toContain(".from('interactive_suggestions')\n    .select('*')");
    expect(service).not.toContain(".from('interactive_votes')\n    .select('*')");
  });

  it('keeps RSVP board reads behind its service', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/dashboard/RsvpBoard.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/rsvpBoardService.ts'), 'utf8');

    expect(page).toContain('loadRsvpBoardRows(weddingSiteId)');
    expect(page).toContain('resolveRsvpBoardSiteId(user.id)');
    expect(page).not.toContain("from '../../lib/supabase'");
    expect(page).not.toContain("from '../../lib/activeSite'");
    expect(page).not.toMatch(/supabase\s*\n\s*\.from/);
    expect(service).toContain('export const RSVP_BOARD_GUEST_SELECT = ');
    expect(service).toContain('export const RSVP_BOARD_EVENT_SELECT = ');
    expect(service).toContain('export const RSVP_BOARD_EVENT_INVITATION_SELECT = ');
    expect(service).toContain('.select(RSVP_BOARD_GUEST_SELECT)');
    expect(service).toContain('.select(RSVP_BOARD_EVENT_SELECT)');
    expect(service).toContain('.select(RSVP_BOARD_EVENT_INVITATION_SELECT)');
    expect(service).not.toContain(".from('guests')\n    .select('*')");
    expect(service).not.toContain(".from('itinerary_events')\n    .select('*')");
    expect(service).not.toContain(".from('event_invitations')\n    .select('*')");
  });

  it('keeps audit and error log reads behind service modules', () => {
    const auditPage = readFileSync(join(process.cwd(), 'src/pages/dashboard/AuditLogs.tsx'), 'utf8');
    const auditService = readFileSync(join(process.cwd(), 'src/pages/dashboard/auditLogService.ts'), 'utf8');
    const errorPage = readFileSync(join(process.cwd(), 'src/pages/dashboard/ErrorLogs.tsx'), 'utf8');
    const errorService = readFileSync(join(process.cwd(), 'src/pages/dashboard/errorLogService.ts'), 'utf8');

    expect(auditPage).toContain('loadDashboardAuditLogs(user.id)');
    expect(auditPage).not.toContain("from '../../lib/supabase'");
    expect(auditPage).not.toContain("from '../../lib/activeSite'");
    expect(auditPage).not.toMatch(/supabase\s*\n\s*\.from/);
    expect(auditService).toContain('export const AUDIT_GUEST_LOG_SELECT = ');
    expect(auditService).toContain('export const AUDIT_GUEST_NAME_SELECT = ');
    expect(auditService).toContain('.select(AUDIT_GUEST_LOG_SELECT)');
    expect(auditService).toContain('.select(AUDIT_GUEST_NAME_SELECT)');
    expect(auditService).not.toContain(".from('guest_audit_logs')\n      .select('*')");
    expect(auditService).not.toContain(".from('guests')\n    .select('*')");

    expect(errorPage).toContain('isErrorLogAdmin(user.id)');
    expect(errorPage).toContain('loadDashboardErrorLogs()');
    expect(errorPage).not.toContain("from '../../lib/supabase'");
    expect(errorPage).not.toMatch(/supabase\s*\n\s*\.from/);
    expect(errorService).toContain('export const ADMIN_USER_SELECT = ');
    expect(errorService).toContain('export const ERROR_LOG_SELECT = ');
    expect(errorService).toContain('.select(ADMIN_USER_SELECT)');
    expect(errorService).toContain('.select(ERROR_LOG_SELECT)');
    expect(errorService).not.toContain(".from('admin_users')\n    .select('*')");
    expect(errorService).not.toContain(".from('app_error_logs')\n    .select('*')");
  });

  it('keeps guest photo dashboard reads and writes behind its service', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/dashboard/GuestPhotoSharing.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/guestPhotoSharingService.ts'), 'utf8');

    expect(page).toContain('loadGuestPhotoSharingSpace(userId)');
    expect(page).toContain('persistGuestPhotoBuckets(siteId, nextBuckets)');
    expect(page).toContain('movePhotoUploadToBucket(');
    expect(page).toContain('saveGuestHubSettingsForSite({');
    expect(page).toContain('updateGuestbookEntryModeration(entryId, patch)');
    expect(page).not.toContain("from '../../lib/activeSite'");
    expect(page).not.toMatch(/supabase\s*\n\s*\.from/);
    expect(page).not.toContain('supabase.from(');
    expect(page).not.toContain("supabase.from('wedding_sites').update({ wedding_data: nextWeddingData, site_json: nextSiteJson })");
    expect(page).not.toContain("import { mergeGeneratedDraftIntoBuilderProject } from '../../lib/aiBuilderProjectPatch'");
    expect(service).toContain("const GUEST_PHOTO_BUCKET_SITE_SELECT = 'wedding_data, site_json'");
    expect(service).toContain('const GUEST_PHOTO_SHARING_SITE_SELECT = ');
    expect(service).toContain('const GUEST_PHOTO_ITINERARY_EVENT_SELECT = ');
    expect(service).toContain('const GUEST_PHOTO_ALBUM_SELECT = ');
    expect(service).toContain('const GUEST_PHOTO_UPLOAD_SELECT = ');
    expect(service).toContain('const GUEST_PHOTO_GUESTBOOK_SELECT = ');
    expect(service).toContain('const GUEST_PHOTO_PROSPECT_SELECT = ');
    expect(service).toContain('const GUEST_PHOTO_AI_ANALYSIS_SELECT = ');
    expect(service).toContain('const GUEST_PHOTO_METADATA_SELECT = ');
    expect(service).toContain('const GUEST_PHOTO_BUCKET_CORRECTION_SELECT = ');
    expect(service).toContain('const GUEST_PHOTO_HUB_SETTINGS_SELECT = ');
    expect(service).toContain('.select(GUEST_PHOTO_BUCKET_SITE_SELECT)');
    expect(service).toContain('.select(GUEST_PHOTO_SHARING_SITE_SELECT)');
    expect(service).toContain('.select(GUEST_PHOTO_ITINERARY_EVENT_SELECT)');
    expect(service).toContain('.select(GUEST_PHOTO_ALBUM_SELECT)');
    expect(service).toContain('.select(GUEST_PHOTO_UPLOAD_SELECT)');
    expect(service).toContain('.select(GUEST_PHOTO_GUESTBOOK_SELECT)');
    expect(service).toContain('.select(GUEST_PHOTO_PROSPECT_SELECT)');
    expect(service).toContain('.select(GUEST_PHOTO_AI_ANALYSIS_SELECT)');
    expect(service).toContain('.select(GUEST_PHOTO_METADATA_SELECT)');
    expect(service).toContain('.select(GUEST_PHOTO_BUCKET_CORRECTION_SELECT)');
    expect(service).toContain('.select(GUEST_PHOTO_HUB_SETTINGS_SELECT)');
    expect(service).not.toContain(".from('wedding_sites')\n    .select('*')");
    expect(service).not.toContain(".from('photo_uploads')\n    .select('*')");
    expect(service).not.toContain(".from('guestbook_entries')\n    .select('*')");
    expect(service).not.toContain(".from('guest_hub_settings')\n    .select('*')");
  });
});
