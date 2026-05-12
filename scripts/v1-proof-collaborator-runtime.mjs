#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
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
    parsed[key] = value.replace(/\\n$/, '').trim();
  }
  return parsed;
}

const fileEnv = envFiles.reduce((merged, filePath) => ({ ...merged, ...parseEnvFile(filePath) }), {});
const getEnv = (key, fallback = '') => {
  const runtimeValue = process.env[key];
  if (runtimeValue && runtimeValue.trim()) return runtimeValue.trim();
  const fileValue = fileEnv[key];
  if (typeof fileValue === 'string' && fileValue.trim()) return fileValue.trim();
  return fallback;
};

const baseUrl = getEnv('PLAYWRIGHT_BASE_URL', 'https://dayof.love');
const ownerEmail = getEnv('V1_OWNER_EMAIL', 'test@gmail.com');
const ownerPassword = getEnv('V1_OWNER_PASSWORD', '12345678');
const liveGuestDashboardSettingsRpcs = getEnv('LIVE_GUEST_DASHBOARD_SETTINGS_RPCS') === '1';
const runtimeSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const collaboratorEmail = getEnv('V1_COLLABORATOR_EMAIL', `qa-collab-${runtimeSeed}@example.com`);
const collaboratorPassword = getEnv('V1_COLLABORATOR_PASSWORD', `DayOf${runtimeSeed}!`);

function buildStillManualProofNeeded() {
  return liveGuestDashboardSettingsRpcs
    ? [
        'Broaden the live client-RLS matrix beyond guest, planning, settings, registry, seating, coordinator, messages, and photos across any remaining non-guest dashboard write surfaces.',
      ]
    : [
        'Set LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 and rerun this proof to include the guest-dashboard settings RPC lane.',
        'Broaden the live client-RLS matrix beyond guest, planning, settings, registry, seating, coordinator, messages, and photos across any remaining non-guest dashboard write surfaces.',
      ];
}

function classifyBlocker() {
  if (!ownerEmail || !ownerPassword) {
    return {
      blocked: true,
      blockerType: 'missing_runtime_credentials',
      message: 'Runtime collaborator proof needs V1_OWNER_EMAIL and V1_OWNER_PASSWORD.',
      recommendation: 'Provide a disposable owner proof account and rerun the runtime collaborator proof bundle.',
    };
  }

  return { blocked: false, blockerType: null, message: null, recommendation: null };
}

function runRuntimeInviteFlow() {
  const command = 'node scripts/playwright-owner-create-invite-and-claim.mjs [baseUrl] [ownerEmail] [ownerPassword] [collaboratorEmail] [collaboratorPassword]';

  try {
    const stdout = execFileSync('node', [
      'scripts/playwright-owner-create-invite-and-claim.mjs',
      baseUrl,
      ownerEmail,
      ownerPassword,
      collaboratorEmail,
      collaboratorPassword,
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      env: process.env,
      maxBuffer: 20 * 1024 * 1024,
    });

    let parsed = null;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      parsed = null;
    }

    const failedSteps = Array.isArray(parsed?.steps) ? parsed.steps.filter((step) => !step.ok) : [];

    return {
      id: 'invite-accept-runtime',
      label: 'Owner invite -> collaborator accept runtime flow',
      command,
      required: true,
      ok: failedSteps.length === 0,
      blocked: false,
      blockerType: null,
      parsed,
      stdout: parsed ? undefined : stdout.trim(),
      failures: failedSteps.map((step) => ({ name: step.name, error: step.error ?? 'unknown runtime flow error' })),
    };
  } catch (error) {
    const stdout = typeof error?.stdout === 'string' ? error.stdout : Buffer.isBuffer(error?.stdout) ? error.stdout.toString('utf8') : '';
    const stderr = typeof error?.stderr === 'string' ? error.stderr : Buffer.isBuffer(error?.stderr) ? error.stderr.toString('utf8') : '';

    let parsed = null;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      parsed = null;
    }

    return {
      id: 'invite-accept-runtime',
      label: 'Owner invite -> collaborator accept runtime flow',
      command,
      required: true,
      ok: false,
      blocked: false,
      blockerType: null,
      exitCode: typeof error?.status === 'number' ? error.status : 1,
      parsed,
      stdout: parsed ? undefined : stdout.trim(),
      stderr: stderr.trim() || undefined,
      failures: Array.isArray(parsed?.steps)
        ? parsed.steps.filter((step) => !step.ok).map((step) => ({ name: step.name, error: step.error ?? 'unknown runtime flow error' }))
        : [],
    };
  }
}

function runCollaboratorRoleProof() {
  const command = 'LIVE_COLLABORATOR_PERMISSION_RLS=1 npx playwright test --workers=1 tests/e2e/collaborator-permission-rls.spec.ts';

  try {
    const stdout = execFileSync('npx', [
      'playwright',
      'test',
      '--workers=1',
      'tests/e2e/collaborator-permission-rls.spec.ts',
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: baseUrl,
        LIVE_COLLABORATOR_PERMISSION_RLS: '1',
        V1_OWNER_EMAIL: ownerEmail,
        V1_OWNER_PASSWORD: ownerPassword,
      },
      maxBuffer: 20 * 1024 * 1024,
    });

    return {
      id: 'forbidden-action-permission-rls',
      label: 'Viewer deny + planner/coordinator allow collaborator runtime proof',
      command,
      required: true,
      ok: true,
      blocked: false,
      blockerType: null,
      stdout: stdout.trim(),
      failures: [],
    };
  } catch (error) {
    const stdout = typeof error?.stdout === 'string' ? error.stdout : Buffer.isBuffer(error?.stdout) ? error.stdout.toString('utf8') : '';
    const stderr = typeof error?.stderr === 'string' ? error.stderr : Buffer.isBuffer(error?.stderr) ? error.stderr.toString('utf8') : '';

    return {
      id: 'forbidden-action-permission-rls',
      label: 'Viewer deny + planner/coordinator allow collaborator runtime proof',
      command,
      required: true,
      ok: false,
      blocked: false,
      blockerType: null,
      exitCode: typeof error?.status === 'number' ? error.status : 1,
      stdout: stdout.trim() || undefined,
      stderr: stderr.trim() || undefined,
      failures: [{ name: 'forbidden action RLS proof', error: 'collaborator permission RLS proof failed' }],
    };
  }
}

const blocker = classifyBlocker();

const output = blocker.blocked
  ? {
      ok: false,
      blocked: true,
      slice: 'collaborator-runtime-proof',
      generatedAt: new Date().toISOString(),
      summary: { total: 1, passed: 0, failed: 0, blocked: 1 },
      automatedCoverage: [
        'Owner invite creation in settings',
        'Collaborator accept flow',
        'Role-aware post-accept landing evidence',
        'Viewer deny plus planner/coordinator allowed-action runtime proof',
        'Guest-scoped collaborators can mutate guest rows directly while timeline/settings writes stay denied without permission',
        'Planner-scoped collaborators can write planning tasks, itinerary events, and dashboard messages while registry RPC writes stay denied without permission',
        'Settings-scoped collaborators can patch site settings and write sections while registry RPC writes stay denied without permission',
        'Registry-scoped collaborators can write registry items while dashboard message RPC writes stay denied without permission',
        'Photos-scoped collaborators can write vault configs and patch vault providers while dashboard message RPC writes stay denied without permission',
        'Coordinator-scoped collaborators can write seating events/tables, coordinator Q&A/check-in, and builder media assets while dashboard message RPC writes stay denied without permission',
      ],
      stillManualProofNeeded: buildStillManualProofNeeded(),
      blockers: [blocker],
      results: [],
    }
  : (() => {
      const results = [
        runRuntimeInviteFlow(),
        runCollaboratorRoleProof(),
      ];
      const passed = results.filter((result) => result.ok).length;
      const failed = results.filter((result) => !result.ok).length;
      const ok = failed === 0;
      return {
        ok,
        blocked: false,
        slice: 'collaborator-runtime-proof',
        generatedAt: new Date().toISOString(),
        summary: { total: results.length, passed, failed, blocked: 0 },
        automatedCoverage: [
          'Owner invite creation in settings',
          'Collaborator accept flow',
          'Role-aware post-accept landing evidence',
          'Viewer deny plus planner/coordinator allowed-action runtime proof',
          'Guest-scoped collaborators can mutate guest rows directly while timeline/settings writes stay denied without permission',
          'Planner-scoped collaborators can write planning tasks, itinerary events, and dashboard messages while registry RPC writes stay denied without permission',
          'Settings-scoped collaborators can patch site settings and write sections while registry RPC writes stay denied without permission',
          'Registry-scoped collaborators can write registry items while dashboard message RPC writes stay denied without permission',
          'Photos-scoped collaborators can write vault configs and patch vault providers while dashboard message RPC writes stay denied without permission',
          'Coordinator-scoped collaborators can write seating events/tables, coordinator Q&A/check-in, and builder media assets while dashboard message RPC writes stay denied without permission',
        ],
        stillManualProofNeeded: buildStillManualProofNeeded(),
        blockers: [],
        results,
      };
    })();

console.log(JSON.stringify(output, null, 2));
if (!output.ok && !output.blocked) process.exit(1);
