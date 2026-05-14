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
    command: 'npm test -- --run src/lib/calmOwnerDigest.test.ts src/lib/calmDigestEmail.test.ts src/pages/dashboard/buildOverviewSnapshotState.test.ts src/pages/dashboard/buildOverviewDashboardModel.test.ts src/pages/dashboard/overviewService.test.ts src/pages/dashboard/settings/SettingsNotificationsPanel.test.tsx',
  }),
  runStep({
    id: 'build',
    label: 'Build integrity check',
    command: 'npm run build',
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
