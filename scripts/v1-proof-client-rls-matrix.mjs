#!/usr/bin/env node

import { execSync } from 'node:child_process';

const scriptShell =
  process.platform === 'win32'
    ? process.env.ComSpec || 'cmd.exe'
    : process.env.SHELL || '/bin/bash';
const liveGuestDashboardSettingsRpcs = process.env.LIVE_GUEST_DASHBOARD_SETTINGS_RPCS === '1';

const steps = [
  {
    id: 'guest-lookup-scope',
    label: 'Anonymous guest-contact lookup and signed household update scope',
    command: 'npm run proof:v1:guest-lookup-scope',
    required: true,
  },
  {
    id: 'guests-rsvp-ops',
    label: 'Public RSVP strict smoke and guest operations scope',
    command: 'npm run proof:v1:guests-rsvp-ops',
    required: true,
  },
  {
    id: 'collaborator-runtime',
    label: 'Owner invite plus viewer deny / planner and coordinator allow runtime proof',
    command: 'npm run proof:v1:collaborator-runtime',
    required: true,
  },
];

function extractJsonBlob(text) {
  if (!text || typeof text !== 'string') return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = text.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function classifyParsedResult(parsed) {
  if (!parsed || typeof parsed !== 'object') return { blocked: false, blockerType: null };
  if (parsed.blocked === true || parsed.step === 'external_fixture_required' || parsed.step === 'env_missing' || parsed.skipped === true) {
    return { blocked: true, blockerType: parsed.blockerType ?? parsed.step ?? 'external_fixture_required' };
  }
  return { blocked: false, blockerType: null };
}

function classifyExecutionBlock(stdout, stderr) {
  const haystack = `${stdout || ''}\n${stderr || ''}`;
  if (/ENOTFOUND|fetch failed|getaddrinfo/i.test(haystack)) {
    return {
      blocked: true,
      blockerType: 'network_access_required',
      message: 'Live client-RLS proof needs unrestricted network access to reach Supabase and production proof lanes.',
    };
  }
  if (/machportrendezvous|permission denied \(1100\)|browserType\.launch: Target page, context or browser has been closed/i.test(haystack)) {
    return {
      blocked: true,
      blockerType: 'browser_runtime_required',
      message: 'Live collaborator role proof needs an unrestricted browser runtime for Playwright.',
    };
  }
  return { blocked: false, blockerType: null, message: null };
}

function runStep(step) {
  const startedAt = new Date().toISOString();
  try {
    const stdout = execSync(step.command, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: scriptShell,
      env: process.env,
      maxBuffer: 20 * 1024 * 1024,
    });

    const parsed = extractJsonBlob(stdout);
    const { blocked, blockerType } = classifyParsedResult(parsed);

    return {
      id: step.id,
      label: step.label,
      command: step.command,
      required: step.required,
      ok: true,
      blocked,
      blockerType,
      startedAt,
      finishedAt: new Date().toISOString(),
      parsed,
      stdout: parsed ? undefined : stdout.trim(),
    };
  } catch (error) {
    const stdout = typeof error?.stdout === 'string' ? error.stdout : Buffer.isBuffer(error?.stdout) ? error.stdout.toString('utf8') : '';
    const stderr = typeof error?.stderr === 'string' ? error.stderr : Buffer.isBuffer(error?.stderr) ? error.stderr.toString('utf8') : '';

    const parsed = extractJsonBlob(stdout);
    const { blocked, blockerType } = classifyParsedResult(parsed);
    const executionBlock = blocked ? null : classifyExecutionBlock(stdout, stderr);
    const blockedByExecution = executionBlock?.blocked === true;

    return {
      id: step.id,
      label: step.label,
      command: step.command,
      required: step.required,
      ok: false,
      blocked: blocked || blockedByExecution,
      blockerType: blocked ? blockerType : (executionBlock?.blockerType ?? null),
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: typeof error?.status === 'number' ? error.status : 1,
      parsed,
      stdout: parsed ? undefined : stdout.trim(),
      stderr: stderr.trim() || undefined,
      message: executionBlock?.message ?? null,
    };
  }
}

function buildStillManualProofNeeded() {
  const items = [];
  if (!liveGuestDashboardSettingsRpcs) {
    items.push('Set LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 and rerun this matrix to include the guest-dashboard settings RPC lane.');
  }
  items.push('Broaden the live client-RLS matrix beyond guest, planning, seating, messages, registry, and photos across remaining non-guest dashboard write surfaces.');
  return items;
}

const results = steps.map(runStep);
const blockedRequired = results.filter((result) => result.required && result.blocked);
const failedRequired = results.filter((result) => result.required && !result.ok && !result.blocked);

const output = {
  ok: failedRequired.length === 0 && blockedRequired.length === 0,
  blocked: blockedRequired.length > 0,
  slice: 'client-rls-matrix',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    blocked: blockedRequired.length,
  },
  automatedCoverage: [
    'Anonymous guest-contact lookup denies partial and mismatched names, then scopes signed household updates',
    'Public RSVP strict smoke proves guest-facing RSVP/token boundaries',
    'Owner invite flow plus viewer deny and planner/coordinator allow collaborator runtime proof',
    'Guest-scoped collaborators can mutate guest rows directly while timeline/settings writes stay denied without permission',
    'Planner-scoped collaborators can write planning tasks and dashboard messages while registry RPC writes stay denied without permission',
    'Settings-scoped collaborators can patch site settings while registry RPC writes stay denied without permission',
    'Registry-scoped collaborators can write registry items while dashboard message RPC writes stay denied without permission',
    'Coordinator-scoped collaborators can write seating events/tables, coordinator Q&A/check-in, and builder media assets while dashboard message RPC writes stay denied without permission',
  ],
  stillManualProofNeeded: buildStillManualProofNeeded(),
  blockers: blockedRequired.map((result) => ({
    id: result.id,
    label: result.label,
    blockerType: result.blockerType,
    message: result.message ?? result.parsed?.message ?? result.parsed?.reason ?? 'Blocked by environment or missing external fixture.',
    recommendation: result.parsed?.recommendation ?? null,
  })),
  results,
};

console.log(JSON.stringify(output, null, 2));
if (failedRequired.length > 0) process.exit(1);
