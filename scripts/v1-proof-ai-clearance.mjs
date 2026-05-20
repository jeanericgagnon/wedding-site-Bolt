#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const liveEnabled = process.env.V1_AI_CLEARANCE_LIVE === '1';
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || process.env.V1_AI_ROLLOUT_BASE_URL || 'https://dayof.love';

function extractJson(stdout) {
  const text = String(stdout || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function runNodeScript(id, scriptPath, env = {}) {
  const startedAt = new Date().toISOString();
  try {
    const stdout = execFileSync('node', [scriptPath], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      encoding: 'utf8',
      maxBuffer: 30 * 1024 * 1024,
      timeout: 240_000,
    });
    return {
      id,
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      parsed: extractJson(stdout),
    };
  } catch (error) {
    const stdout = typeof error?.stdout === 'string' ? error.stdout : Buffer.isBuffer(error?.stdout) ? error.stdout.toString('utf8') : '';
    const stderr = typeof error?.stderr === 'string' ? error.stderr : Buffer.isBuffer(error?.stderr) ? error.stderr.toString('utf8') : '';
    return {
      id,
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: typeof error?.status === 'number' ? error.status : 1,
      parsed: extractJson(stdout),
      stderr: stderr.slice(-2000),
    };
  }
}

const results = [
  runNodeScript('local-frontend-rollout', 'scripts/v1-proof-ai-rollout.mjs'),
  runNodeScript('static-column-exposure', 'scripts/v1-proof-ai-exposure.mjs'),
];

if (liveEnabled) {
  results.push(
    runNodeScript('deployed-frontend-rollout', 'scripts/v1-proof-ai-rollout.mjs', {
      V1_AI_ROLLOUT_LIVE: '1',
      V1_AI_ROLLOUT_BASE_URL: baseUrl,
    }),
  );
  results.push(
    runNodeScript('live-column-exposure', 'scripts/v1-proof-ai-exposure.mjs', {
      V1_AI_EXPOSURE_LIVE: '1',
    }),
  );
}

const failures = results.filter((result) => !result.ok);
const resultById = Object.fromEntries(results.map((result) => [result.id, result]));
const liveExposure = resultById['live-column-exposure'];
const localRolloutOk = resultById['local-frontend-rollout']?.ok === true;
const staticExposureOk = resultById['static-column-exposure']?.ok === true;
const deployedRolloutOk = !liveEnabled || resultById['deployed-frontend-rollout']?.ok === true;
const liveSensitiveFailures = liveExposure?.parsed?.live?.failures?.filter((failure) => failure.selectKind === 'sensitive') ?? [];
const liveSafeFailures = liveExposure?.parsed?.live?.failures?.filter((failure) => failure.selectKind === 'safe-product') ?? [];
const authenticatedSafeChecks = liveExposure?.parsed?.live?.checks?.filter((check) => (
  check.principal === 'authenticated_owner'
  && check.selectKind === 'safe-product'
  && check.ok === true
)) ?? [];
const authenticatedReadbackReady = liveExposure?.parsed?.live?.ownerAuth?.enabled === true && authenticatedSafeChecks.length >= 3;
const expectedMigrationPending = Boolean(
  liveEnabled
  && localRolloutOk
  && staticExposureOk
  && deployedRolloutOk
  && liveExposure?.ok === false
  && authenticatedReadbackReady
  && liveSensitiveFailures.length >= 8
  && liveSensitiveFailures.every((failure) => failure.classification === 'readable')
  && liveSafeFailures.length === 0,
);
const migrationReadiness = liveEnabled
  ? {
      safeToApplyMigration: expectedMigrationPending,
      authenticatedReadbackReady,
      migrationAlreadyApplied: liveExposure?.ok === true,
      state: liveExposure?.ok === true
        ? 'migration_applied_and_readback_green'
        : expectedMigrationPending
          ? 'frontend_ready_migration_pending'
          : 'not_ready',
    }
  : undefined;

const output = {
  ok: failures.length === 0 && liveEnabled,
  launchCleared: failures.length === 0 && liveEnabled,
  generatedAt: new Date().toISOString(),
  mode: liveEnabled ? 'local_and_live' : 'local_only_not_launch_clearance',
  baseUrl,
  summary: {
    total: results.length,
    passed: results.length - failures.length,
    failed: failures.length,
  },
  contractSummary: liveEnabled
    ? 'AI clearance live proof is the launch-gating AI/privacy lane: it closes deployed rollout plus live readback truth for the hardened AI/photo surface.'
    : 'AI clearance local-only proof is green, but it is not launch clearance; this lane still needs the live frontend and live readback rerun before AI/privacy launch truth is closed.',
  results,
  migrationReadiness,
  blockers: [
    ...(!liveEnabled ? ['Run with V1_AI_CLEARANCE_LIVE=1 to include deployed frontend and live Supabase readback gates.'] : []),
    ...failures.map((failure) => {
      if (failure.id === 'deployed-frontend-rollout') return 'Production bundle is not migration-ready yet. Deploy the safe frontend, then rerun live rollout proof.';
      if (failure.id === 'live-column-exposure' && expectedMigrationPending) return 'Safe frontend is deployed and authenticated readback ran; live Supabase still exposes sensitive AI/photo columns. Apply the AI/photo column-privilege migration only with explicit approval, then rerun clearance.';
      if (failure.id === 'live-column-exposure') return 'Live Supabase still exposes sensitive AI/photo columns or live readback could not complete.';
      return `${failure.id} proof failed.`;
    }),
  ],
  requiredOrder: [
    'Keep local frontend rollout and static exposure proof green.',
    'Deploy the safe frontend only after explicit approval.',
    'Run V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance until deployed frontend rollout is green.',
    'Apply supabase/migrations/20260503100000_harden_ai_photo_column_privileges.sql only after deployed frontend rollout is green.',
    'Rerun V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance until live column exposure is green.',
  ],
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
