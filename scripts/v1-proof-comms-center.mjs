#!/usr/bin/env node

import { execSync } from 'node:child_process';

const steps = [
  {
    id: 'message-delivery-state-tests',
    label: 'Message delivery-state truth tests',
    command: 'npm test -- --run src/lib/messageDeliveryState.test.ts src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts src/pages/dashboard/messages/MessageDetailModal.test.tsx',
    required: true,
  },
  {
    id: 'messages-guard',
    label: 'Messaging permission guard smoke',
    command: 'node scripts/smoke_messages_guard.js',
    required: true,
  },
  {
    id: 'build',
    label: 'Build integrity check',
    command: 'npm run build',
    required: true,
  },
];

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
      required: step.required,
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
      required: step.required,
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: typeof error?.status === 'number' ? error.status : 1,
      stdout: stdout.trim() || undefined,
      stderr: stderr.trim() || undefined,
    };
  }
}

const results = steps.map(runStep);
const failedRequired = results.filter((result) => result.required && !result.ok);

const output = {
  ok: failedRequired.length === 0,
  slice: 'comms-center',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  automatedCoverage: [
    'Draft/queued/sent/failed message-state truth',
    'Focused retry, next-send exclusion, and customer-safe delivery review grouping coverage',
    'Compose/send/retry/reschedule permission guard coverage',
    'Build integrity after comms-center proof assertions',
  ],
  stillManualProofNeeded: [
    'Create or inspect a real draft',
    'Schedule or send a real message',
    'Verify history state reads credibly after runtime delivery attempt',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
