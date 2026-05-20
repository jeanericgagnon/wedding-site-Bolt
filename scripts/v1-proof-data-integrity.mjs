#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const envFiles = ['.env', '.env.local', '.env.production', '.env.production.local', '.vercel/.env.production.local'];

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const parsed = {};
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    value = value.replace(/\\n$/, '').trim();
    parsed[key] = value;
  }
  return parsed;
}

const fileEnv = envFiles.reduce((merged, filePath) => ({ ...merged, ...parseEnvFile(filePath) }), {});
const getEnv = (key) => {
  const runtimeValue = process.env[key];
  if (runtimeValue && runtimeValue.trim()) return runtimeValue;
  return fileEnv[key] ?? '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL').trim();
const anonKey = getEnv('VITE_SUPABASE_ANON_KEY').trim();
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY').trim() || getEnv('V1_SUPABASE_SERVICE_ROLE_KEY').trim();
const readKey = serviceRoleKey || anonKey;
const proofMode = serviceRoleKey ? 'service_role_full' : 'anon_limited';

if (!/^https:\/\/.+\.supabase\.co$/.test(supabaseUrl) || !readKey) {
  console.log(JSON.stringify({
    ok: false,
    generatedAt: new Date().toISOString(),
    proofMode: 'blocked_missing_supabase_env',
    error: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Add SUPABASE_SERVICE_ROLE_KEY for full integrity proof.',
  }, null, 2));
  process.exit(1);
}

function restUrl(table, params = {}) {
  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

async function restGet(table, select) {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; offset < 5000; offset += pageSize) {
    const response = await fetch(restUrl(table, { select }), {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${readKey}`,
        Range: `${offset}-${offset + pageSize - 1}`,
      },
      signal: AbortSignal.timeout(15_000),
    });
    const bodyText = await response.text();
    if (!response.ok) {
      const error = new Error(`${table} read failed (${response.status}): ${bodyText.slice(0, 240)}`);
      error.status = response.status;
      throw error;
    }
    const page = JSON.parse(bodyText);
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

function idSet(rows) {
  return new Set(rows.map((row) => String(row.id)).filter(Boolean));
}

function missingRefs(rows, foreignKey, allowedIds) {
  return rows
    .filter((row) => row[foreignKey] && !allowedIds.has(String(row[foreignKey])))
    .map((row) => ({ id: row.id, [foreignKey]: row[foreignKey] }))
    .slice(0, 25);
}

function duplicateValues(rows, key) {
  const seen = new Map();
  const duplicates = [];
  for (const row of rows) {
    const value = String(row[key] ?? '').trim();
    if (!value) continue;
    if (seen.has(value)) duplicates.push({ value, ids: [seen.get(value), row.id] });
    else seen.set(value, row.id);
  }
  return duplicates.slice(0, 25);
}

function invalidSlugs(rows) {
  return rows
    .filter((row) => {
      const slug = String(row.site_slug ?? '').trim();
      return slug && !/^[a-z0-9-]{2,80}$/.test(slug);
    })
    .map((row) => ({ id: row.id, site_slug: row.site_slug }))
    .slice(0, 25);
}

const tableSelects = {
  wedding_sites: 'id,site_slug,user_id,is_published',
  guests: 'id,wedding_site_id,household_id',
  photo_albums: 'id,wedding_site_id',
  photo_uploads: 'id,wedding_site_id,photo_album_id',
  photo_upload_metadata: 'id,upload_id,wedding_site_id,photo_album_id',
  vault_configs: 'id,wedding_site_id',
  vault_entries: 'id,wedding_site_id,vault_config_id',
  seating_events: 'id,wedding_site_id',
  seating_tables: 'id,seating_event_id',
  seating_assignments: 'id,seating_event_id,guest_id,table_id',
  site_rsvps: 'id,wedding_site_id',
  event_invitations: 'id,event_id,guest_id',
  event_rsvps: 'id,event_invitation_id',
  itinerary_events: 'id,wedding_site_id',
  public_submission_events: 'id,wedding_site_id,scope,subject',
};

const results = {};
const skippedTables = {};
const failures = [];

try {
  for (const [table, select] of Object.entries(tableSelects)) {
    try {
      results[table] = await restGet(table, select);
    } catch (error) {
      const status = error && typeof error === 'object' ? error.status : undefined;
      if (proofMode === 'anon_limited' && (status === 401 || status === 403)) {
        results[table] = [];
        skippedTables[table] = {
          status,
          reason: 'anon_read_blocked_by_rls_or_column_privileges',
        };
        continue;
      }
      throw error;
    }
  }
} catch (error) {
  console.log(JSON.stringify({
    ok: false,
    generatedAt: new Date().toISOString(),
    proofMode,
    error: error instanceof Error ? error.message : String(error),
    hint: proofMode === 'anon_limited' ? 'Anon mode may be blocked by RLS. Add SUPABASE_SERVICE_ROLE_KEY for full integrity proof.' : undefined,
  }, null, 2));
  process.exit(1);
}

const siteIds = idSet(results.wedding_sites);
const guestIds = idSet(results.guests);
const photoAlbumIds = idSet(results.photo_albums);
const photoUploadIds = idSet(results.photo_uploads);
const vaultConfigIds = idSet(results.vault_configs);
const seatingEventIds = idSet(results.seating_events);
const seatingTableIds = idSet(results.seating_tables);
const itineraryEventIds = idSet(results.itinerary_events);
const eventInvitationIds = idSet(results.event_invitations);

const checks = {
  invalidSiteSlugs: invalidSlugs(results.wedding_sites),
  duplicateSiteSlugs: duplicateValues(results.wedding_sites, 'site_slug'),
  guestsMissingSites: missingRefs(results.guests, 'wedding_site_id', siteIds),
  photoAlbumsMissingSites: missingRefs(results.photo_albums, 'wedding_site_id', siteIds),
  photoUploadsMissingSites: missingRefs(results.photo_uploads, 'wedding_site_id', siteIds),
  photoUploadsMissingAlbums: missingRefs(results.photo_uploads, 'photo_album_id', photoAlbumIds),
  photoMetadataMissingUploads: missingRefs(results.photo_upload_metadata, 'upload_id', photoUploadIds),
  photoMetadataMissingSites: missingRefs(results.photo_upload_metadata, 'wedding_site_id', siteIds),
  photoMetadataMissingAlbums: missingRefs(results.photo_upload_metadata, 'photo_album_id', photoAlbumIds),
  vaultConfigsMissingSites: missingRefs(results.vault_configs, 'wedding_site_id', siteIds),
  vaultEntriesMissingSites: missingRefs(results.vault_entries, 'wedding_site_id', siteIds),
  vaultEntriesMissingConfigs: missingRefs(results.vault_entries, 'vault_config_id', vaultConfigIds),
  seatingEventsMissingSites: missingRefs(results.seating_events, 'wedding_site_id', siteIds),
  seatingTablesMissingEvents: missingRefs(results.seating_tables, 'seating_event_id', seatingEventIds),
  seatingAssignmentsMissingEvents: missingRefs(results.seating_assignments, 'seating_event_id', seatingEventIds),
  seatingAssignmentsMissingGuests: missingRefs(results.seating_assignments, 'guest_id', guestIds),
  seatingAssignmentsMissingTables: missingRefs(results.seating_assignments, 'table_id', seatingTableIds),
  siteRsvpsMissingSites: missingRefs(results.site_rsvps, 'wedding_site_id', siteIds),
  eventInvitationsMissingEvents: missingRefs(results.event_invitations, 'event_id', itineraryEventIds),
  eventInvitationsMissingGuests: missingRefs(results.event_invitations, 'guest_id', guestIds),
  eventRsvpsMissingInvitations: missingRefs(results.event_rsvps, 'event_invitation_id', eventInvitationIds),
  publicSubmissionEventsMissingSites: missingRefs(results.public_submission_events, 'wedding_site_id', siteIds),
};

const hardCheckNames = proofMode === 'service_role_full'
  ? Object.keys(checks)
  : ['invalidSiteSlugs', 'duplicateSiteSlugs'];

for (const [name, rows] of Object.entries(checks)) {
  if (!hardCheckNames.includes(name)) continue;
  if (rows.length > 0) failures.push({ name, count: rows.length, sample: rows.slice(0, 5) });
}

const output = {
  ok: failures.length === 0,
  generatedAt: new Date().toISOString(),
  proofMode,
  summary: Object.fromEntries(Object.entries(results).map(([table, rows]) => [table, rows.length])),
  contractSummary: proofMode === 'service_role_full'
    ? 'Data-integrity proof is running in secure full mode: this cross-table lane closes deeper storage/queue/runtime integrity truth that weaker anon-safe proofs cannot establish.'
    : 'Data-integrity proof is running in anon-limited mode: this lane provides partial cross-table evidence only and still defers the full integrity call to the secure service-role proof environment.',
  skippedTables,
  checks,
  hardCheckNames,
  limitedCheckNames: Object.keys(checks).filter((name) => !hardCheckNames.includes(name)),
  failures,
  caveat: proofMode === 'anon_limited'
    ? 'This proof only hard-gates checks that are meaningful with anon visibility. Set SUPABASE_SERVICE_ROLE_KEY for full cross-table integrity proof.'
    : undefined,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
