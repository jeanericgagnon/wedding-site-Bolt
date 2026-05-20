#!/usr/bin/env node

import { execSync } from 'node:child_process';

function runStep(step) {
  const startedAt = new Date().toISOString();
  try {
    const stdout = execSync(step.command, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: '/bin/zsh',
      env: process.env,
      timeout: step.timeoutMs ?? 180_000,
      maxBuffer: 20 * 1024 * 1024,
    });

    return {
      id: step.id,
      label: step.label,
      command: step.command,
      required: true,
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      stdout: stdout.trim(),
    };
  } catch (error) {
    const stdout = typeof error?.stdout === 'string' ? error.stdout : Buffer.isBuffer(error?.stdout) ? error.stdout.toString('utf8') : '';
    const stderr = typeof error?.stderr === 'string' ? error.stderr : Buffer.isBuffer(error?.stderr) ? error.stderr.toString('utf8') : '';
    return {
      id: step.id,
      label: step.label,
      command: step.command,
      required: true,
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: typeof error?.status === 'number' ? error.status : 1,
      stdout: stdout.trim() || undefined,
      stderr: stderr.trim() || undefined,
    };
  }
}

const results = [
  runStep({
    id: 'digest-tests',
    label: 'Notification digest truth tests',
    command: 'node_modules/.bin/vitest run src/lib/calmOwnerDigest.test.ts src/lib/calmDigestEmail.test.ts src/pages/dashboard/buildOverviewSnapshotState.test.ts src/pages/dashboard/buildOverviewDashboardModel.test.ts src/pages/dashboard/overviewService.test.ts src/pages/dashboard/settings/SettingsNotificationsPanel.test.tsx --config scripts/notification-digest-vitest.config.mjs --environment jsdom --pool=threads --maxWorkers=1 --no-file-parallelism --reporter=verbose',
    timeoutMs: 240_000,
  }),
  runStep({
    id: 'build',
    label: 'Build integrity check',
    command: 'npm run build',
    timeoutMs: 900_000,
  }),
];

const failedRequired = results.filter((result) => result.required && !result.ok);
const output = {
  ok: failedRequired.length === 0,
  slice: 'notification-digest',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: failedRequired.length === 0
    ? 'Notification digest proof is green: this owner-summary lane validates digest wording and dashboard-count continuity as shipped feature evidence while still leaving live inbox delivery truth to its own downstream pipeline proof.'
    : 'Notification digest proof is not green yet: required digest unit or build evidence is still failing.',
  automatedCoverage: [
    'Digest delivery preview wording stays honest about scheduled state versus actual inbox connectivity',
    'Overview snapshot-to-stats-to-model continuity preserves real message, task, payment, photo, and seating counts',
    'Overview service keeps digest source counts wired to real dashboard tables instead of placeholders',
  ],
  stillManualProofNeeded: [
    'Live inbox delivery/readback proof still waits on a real digest-delivery pipeline beyond saved schedule/readback state.',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
