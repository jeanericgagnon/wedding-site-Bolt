import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('dashboard data boundary guards', () => {
  it('does not load message dashboard rows with select star', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/Messages.tsx'), 'utf8');
    const selectSource = readFileSync(join(process.cwd(), 'src/pages/dashboard/messages/messageSelect.ts'), 'utf8');

    expect(selectSource).toContain('const MESSAGES_DASHBOARD_SELECT = [');
    expect(source).toContain('.select(MESSAGES_DASHBOARD_SELECT)');
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

    expect(source).toContain(".from('guests')\n        .select('id, first_name, last_name");
    expect(source).toContain("supabase.from('rsvps').select('guest_id, attending, attending_ceremony");
    expect(source).not.toContain(".from('guests')\n        .select('*')");
    expect(source).not.toContain("supabase.from('rsvps').select('*')");
  });

  it('loads itinerary events and event guest picker rows with explicit projections', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/Itinerary.tsx'), 'utf8');

    expect(source).toContain('const ITINERARY_EVENT_SELECT = ');
    expect(source).toContain('const EVENT_GUEST_PICKER_SELECT = ');
    expect(source).toContain('.select(ITINERARY_EVENT_SELECT)');
    expect(source).toContain('.select(EVENT_GUEST_PICKER_SELECT)');
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

    expect(source).toContain('const PLANNING_TASK_SELECT = ');
    expect(source).toContain('const PLANNING_VENDOR_SELECT = ');
    expect(source).toContain('const PLANNING_BUDGET_ITEM_SELECT = ');
    expect(source).toContain('.select(PLANNING_TASK_SELECT)');
    expect(source).toContain('.select(PLANNING_VENDOR_SELECT)');
    expect(source).toContain('.select(PLANNING_BUDGET_ITEM_SELECT)');
    expect(source).not.toContain(".from('planning_tasks')\n    .select('*')");
    expect(source).not.toContain(".from('planning_vendors')\n    .select('*')");
    expect(source).not.toContain(".from('planning_budget_items')\n    .select('*')");
    expect(source).not.toContain('.insert(mutablePayload).select().single()');
  });

  it('loads builder editor and media rows with explicit projections', () => {
    const builderProjectSource = readFileSync(join(process.cwd(), 'src/builder/services/builderProjectService.ts'), 'utf8');
    const mediaSource = readFileSync(join(process.cwd(), 'src/builder/services/mediaRepository.ts'), 'utf8');
    const builderPageSource = readFileSync(join(process.cwd(), 'src/builder/BuilderPage.tsx'), 'utf8');

    expect(builderProjectSource).toContain('const BUILDER_PROJECT_SITE_SELECT = ');
    expect(builderProjectSource).toContain('const BUILDER_WEDDING_DATA_SITE_SELECT = ');
    expect(builderProjectSource).toContain('.select(BUILDER_PROJECT_SITE_SELECT)');
    expect(builderProjectSource).toContain('.select(BUILDER_WEDDING_DATA_SITE_SELECT)');
    expect(mediaSource).toContain('const BUILDER_MEDIA_ASSET_SELECT = ');
    expect(mediaSource).toContain('.select(BUILDER_MEDIA_ASSET_SELECT)');
    expect(builderPageSource).toContain('const BUILDER_ENTRY_SITE_SELECT = ');
    expect(builderPageSource).toContain('.select(BUILDER_ENTRY_SITE_SELECT)');
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

    expect(source).toContain('const SEATING_EVENT_SELECT = ');
    expect(source).toContain('const SEATING_TABLE_SELECT = ');
    expect(source).toContain('const SEATING_ASSIGNMENT_SELECT = ');
    expect(source).toContain('const SEATING_ELIGIBLE_GUEST_SELECT = ');
    expect(source).toContain('const SEATING_LAYOUT_VERSION_SELECT = ');
    expect(source).toContain('.select(SEATING_EVENT_SELECT)');
    expect(source).toContain('.select(SEATING_TABLE_SELECT)');
    expect(source).toContain('.select(SEATING_ASSIGNMENT_SELECT)');
    expect(source).toContain('.select(SEATING_ELIGIBLE_GUEST_SELECT)');
    expect(source).toContain('.select(SEATING_LAYOUT_VERSION_SELECT)');
    expect(source).not.toContain(".from('seating_events')\n    .select('*')");
    expect(source).not.toContain(".from('seating_tables')\n    .select('*')");
    expect(source).not.toContain(".from('seating_assignments')\n    .select('*')");
    expect(source).not.toContain(".from('seating_tables')\n    .insert(tables)\n    .select()");
    expect(source).not.toContain(".from('seating_assignments')\n    .upsert(assignments, { onConflict: 'seating_event_id,guest_id' })\n    .select()");
    expect(source).not.toContain(".from('guests')\n    .select('*')");
    expect(source).not.toContain(".from('seating_layout_versions')\n    .select('*')");
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

    expect(source).toContain('const VAULT_CONFIG_SELECT = ');
    expect(source).toContain('const VAULT_ENTRY_SELECT = ');
    expect(source).toContain('.select(VAULT_CONFIG_SELECT)');
    expect(source).toContain('.select(VAULT_ENTRY_SELECT)');
    expect(source).not.toContain(".from('vault_configs')\n            .select('*')");
    expect(source).not.toContain(".from('vault_entries')\n              .select('*')");
    expect(source).not.toContain(".from('vault_configs')\n        .select('*')");
    expect(source).not.toContain(".from('vault_entries')\n          .select('*')");
    expect(source).not.toContain(".select('*');");
  });
});
