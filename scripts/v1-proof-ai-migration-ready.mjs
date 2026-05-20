#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || process.env.V1_AI_ROLLOUT_BASE_URL || 'https://dayof.love';
const expectedPendingSensitiveFailures = 8;
const expectedAuthenticatedSafeProductChecks = 3;

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

function sensitiveExposureFailures(result) {
  return result.parsed?.live?.failures?.filter((failure) => failure.selectKind === 'sensitive') ?? [];
}

function safeProductFailures(result) {
  return result.parsed?.live?.failures?.filter((failure) => failure.selectKind === 'safe-product') ?? [];
}

function ownerAuthEnabled(result) {
  return result.parsed?.live?.ownerAuth?.enabled === true;
}

function authenticatedSafeProductChecks(result) {
  return result.parsed?.live?.checks?.filter((check) => (
    check.principal === 'authenticated_owner'
    && check.selectKind === 'safe-product'
    && check.ok === true
  )) ?? [];
}

const localRollout = runNodeScript('local-frontend-rollout', 'scripts/v1-proof-ai-rollout.mjs');
const staticExposure = runNodeScript('static-column-exposure', 'scripts/v1-proof-ai-exposure.mjs');
const deployedRollout = runNodeScript('deployed-frontend-rollout', 'scripts/v1-proof-ai-rollout.mjs', {
  V1_AI_ROLLOUT_LIVE: '1',
  V1_AI_ROLLOUT_BASE_URL: baseUrl,
});
const liveExposure = runNodeScript('live-column-exposure-readback', 'scripts/v1-proof-ai-exposure.mjs', {
  V1_AI_EXPOSURE_LIVE: '1',
});

const rolloutReady = localRollout.ok && staticExposure.ok && deployedRollout.ok;
const sensitiveFailures = sensitiveExposureFailures(liveExposure);
const safeFailures = safeProductFailures(liveExposure);
const authenticatedReadbackReady = ownerAuthEnabled(liveExposure)
  && authenticatedSafeProductChecks(liveExposure).length >= expectedAuthenticatedSafeProductChecks;
const migrationAlreadyApplied = liveExposure.ok;
const migrationPending = !liveExposure.ok
  && authenticatedReadbackReady
  && sensitiveFailures.length >= expectedPendingSensitiveFailures
  && sensitiveFailures.every((failure) => failure.classification === 'readable')
  && safeFailures.length === 0;
const migrationReadbackBroken = !liveExposure.ok && !migrationPending;

const output = {
  ok: rolloutReady && !migrationReadbackBroken,
  safeToApplyMigration: rolloutReady && migrationPending,
  migrationAlreadyApplied,
  launchCleared: rolloutReady && migrationAlreadyApplied,
  authenticatedReadbackReady,
  expectedPendingSensitiveFailures,
  expectedAuthenticatedSafeProductChecks,
  generatedAt: new Date().toISOString(),
  baseUrl,
  summary: {
    total: 4,
    passed: [localRollout, staticExposure, deployedRollout, liveExposure].filter((result) => result.ok).length,
    failed: [localRollout, staticExposure, deployedRollout, liveExposure].filter((result) => !result.ok).length,
  },
  contractSummary: migrationAlreadyApplied
    ? 'AI migration-readiness proof is green after migration: this lane confirms deployed rollout plus live readback compatibility for the hardened AI/photo column split.'
    : rolloutReady && migrationPending
      ? 'AI migration-readiness proof is green for apply readiness: this lane confirms the frontend and live readback are ready for the AI/photo column migration, but it is not the post-migration clearance proof by itself.'
      : 'AI migration-readiness proof is not green: do not treat the AI/photo column migration as safe to apply until this rollout/readback lane is fixed.',
  results: [localRollout, staticExposure, deployedRollout, liveExposure],
  state: migrationAlreadyApplied
    ? 'migration_applied_and_readback_green'
    : migrationPending
      ? 'frontend_ready_migration_pending'
      : 'not_ready',
  blockers: [
    ...(!localRollout.ok ? ['Local frontend rollout proof failed.'] : []),
    ...(!staticExposure.ok ? ['Static AI/photo exposure proof failed.'] : []),
    ...(!deployedRollout.ok ? ['Deployed frontend rollout proof failed; do not apply the DB migration.'] : []),
    ...(!authenticatedReadbackReady ? ['Authenticated owner readback did not run or safe product checks were missing; do not apply the DB migration from this proof.'] : []),
    ...(migrationReadbackBroken ? ['Live exposure readback failed in an unexpected way; inspect live-column-exposure-readback before applying the migration.'] : []),
  ],
  nextSteps: [
    ...(rolloutReady && migrationPending
      ? ['Safe frontend is deployed. With explicit approval, apply supabase/migrations/20260503100000_harden_ai_photo_column_privileges.sql, then rerun V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance.']
      : []),
    ...(migrationAlreadyApplied
      ? ['Migration readback is green. Continue with live photo analysis proof and secure model-backed AI proof before launch-clear.']
      : []),
  ],
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
