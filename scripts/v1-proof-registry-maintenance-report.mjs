#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRegistryMaintenanceReport, buildRegistryMaintenanceReportText } from '../src/pages/dashboard/registry/registryMaintenanceReport.ts';
import { buildRegistryMaintenanceSnapshot } from '../src/pages/dashboard/registry/registryMaintenanceSnapshot.ts';
import { MAX_REGISTRY_ITEMS, REGISTRY_ITEM_SELECT } from '../src/pages/dashboard/registry/registryQueries.ts';

const ENV_FILES = ['.env', '.env.local', '.env.production', '.env.production.local', '.vercel/.env.production.local'];

function parseArgs(argv) {
  const args = {
    format: 'json',
    input: null,
    output: null,
    siteId: null,
    siteSlug: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    if (token === '--format' && next) {
      args.format = next === 'text' ? 'text' : 'json';
      index += 1;
      continue;
    }
    if (token === '--input' && next) {
      args.input = next;
      index += 1;
      continue;
    }
    if (token === '--output' && next) {
      args.output = next;
      index += 1;
      continue;
    }
    if (token === '--site-id' && next) {
      args.siteId = next;
      index += 1;
      continue;
    }
    if (token === '--site-slug' && next) {
      args.siteSlug = next;
      index += 1;
    }
  }

  return args;
}

function parseEnvFile(filePath) {
  try {
    const raw = readFileSync(filePath, 'utf8');
    const parsed = {};
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const separatorIndex = trimmed.indexOf('=');
      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      parsed[key] = value;
    }
    return parsed;
  } catch {
    return {};
  }
}

const fileEnv = ENV_FILES.reduce((merged, filePath) => ({ ...merged, ...parseEnvFile(filePath) }), {});

function getEnv(key) {
  const runtimeValue = process.env[key];
  if (runtimeValue && runtimeValue.trim()) return runtimeValue.trim();
  const fileValue = fileEnv[key];
  return typeof fileValue === 'string' ? fileValue.trim() : '';
}

function buildBlockedResult(reason, args) {
  return {
    ok: false,
    blocked: true,
    generatedAt: new Date().toISOString(),
    reason,
    requested: {
      input: args.input,
      siteId: args.siteId,
      siteSlug: args.siteSlug,
      format: args.format,
    },
  };
}

function normalizeInputPayload(raw, fallbackLabel) {
  const payload = Array.isArray(raw) ? { items: raw } : raw;
  const items = Array.isArray(payload?.items) ? payload.items : null;
  if (!items) {
    throw new Error('Input file must be a JSON array of registry items or an object with an items array.');
  }

  return {
    items,
    siteLabel: payload.siteLabel || payload.siteSlug || payload.siteId || fallbackLabel,
    lastRepairRunSummary: payload.lastRepairRunSummary ?? null,
  };
}

async function fetchLiveRegistryPayload({ siteId, siteSlug }) {
  const supabaseUrl = getEnv('VITE_SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('V1_SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl) {
    throw new Error('Set VITE_SUPABASE_URL for live registry maintenance proof.');
  }
  if (!serviceRoleKey) {
    throw new Error('Set SUPABASE_SERVICE_ROLE_KEY or V1_SUPABASE_SERVICE_ROLE_KEY for live registry maintenance proof.');
  }
  if (!siteId && !siteSlug) {
    throw new Error('Provide --site-id or --site-slug for live registry maintenance proof.');
  }

  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let siteQuery = admin.from('wedding_sites').select('id, site_slug');
  siteQuery = siteId ? siteQuery.eq('id', siteId) : siteQuery.eq('site_slug', siteSlug);
  const { data: site, error: siteError } = await siteQuery.maybeSingle();
  if (siteError) throw siteError;
  if (!site?.id) {
    throw new Error('Could not find a wedding site for this registry maintenance proof.');
  }

  const { data: items, error: itemsError } = await admin
    .from('registry_items')
    .select(REGISTRY_ITEM_SELECT)
    .eq('wedding_site_id', site.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(MAX_REGISTRY_ITEMS);

  if (itemsError) throw itemsError;

  return {
    items: items ?? [],
    siteLabel: site.site_slug || site.id,
    lastRepairRunSummary: null,
  };
}

export function buildRegistryMaintenanceProofReport({
  items,
  siteLabel = 'fixture',
  source = 'fixture',
  lastRepairRunSummary = null,
}) {
  const snapshot = buildRegistryMaintenanceSnapshot(items);
  const cleanupGroups = snapshot.cleanupGroups.map((group) => ({
    key: group.key,
    label: group.label,
    count: group.items.length,
    recommendedAction: group.recommendedAction,
  }));
  const maintenanceReport = buildRegistryMaintenanceReport({
    legacyRepairReport: snapshot.legacyRepairReport,
    cleanupQueueCount: snapshot.repairQueue.length,
    cleanupGroups: cleanupGroups.map((group) => ({ label: group.label, count: group.count })),
    lastRepairRunSummary,
    truthSweepPrediction: snapshot.truthSweepPrediction,
  });

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    source,
    siteLabel,
    itemCount: items.length,
    actionableBadImportCount: snapshot.actionableBadImportCount,
    cleanupQueueCount: snapshot.repairQueue.length,
    cleanupGroups,
    legacyRepairReport: snapshot.legacyRepairReport,
    truthSweepPrediction: snapshot.truthSweepPrediction,
    maintenanceReport,
    maintenanceReportText: buildRegistryMaintenanceReportText({
      legacyRepairReport: snapshot.legacyRepairReport,
      cleanupQueueCount: snapshot.repairQueue.length,
      cleanupGroups: cleanupGroups.map((group) => ({ label: group.label, count: group.count })),
      lastRepairRunSummary,
      truthSweepPrediction: snapshot.truthSweepPrediction,
    }),
  };
}

export async function runRegistryMaintenanceProof(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  try {
    const payload = args.input
      ? normalizeInputPayload(JSON.parse(readFileSync(resolve(args.input), 'utf8')), basename(args.input))
      : await fetchLiveRegistryPayload(args);

    const result = buildRegistryMaintenanceProofReport({
      items: payload.items,
      siteLabel: payload.siteLabel,
      source: args.input ? 'fixture' : 'live',
      lastRepairRunSummary: payload.lastRepairRunSummary,
    });

    const output = args.format === 'text'
      ? result.maintenanceReportText
      : JSON.stringify(result, null, 2);

    if (args.output) {
      writeFileSync(resolve(args.output), output);
    } else {
      console.log(output);
    }

    return result;
  } catch (error) {
    const blocked = buildBlockedResult(error instanceof Error ? error.message : String(error), args);
    const output = args.format === 'text'
      ? [blocked.reason, '', 'Provide --input <file> for fixture mode or --site-id/--site-slug plus Supabase env for live mode.'].join('\n')
      : JSON.stringify(blocked, null, 2);

    if (args.output) {
      writeFileSync(resolve(args.output), output);
    } else {
      console.log(output);
    }

    return blocked;
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectRun) {
  const result = await runRegistryMaintenanceProof();
  process.exit(result.ok ? 0 : 1);
}
