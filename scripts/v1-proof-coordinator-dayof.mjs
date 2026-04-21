#!/usr/bin/env node

import { execSync } from 'node:child_process';

const steps = [
  {
    id: 'coordinator-role-access-tests',
    label: 'Coordinator role-access tests',
    command: 'npm test -- src/lib/coordinatorRoleAccess.test.ts',
    required: true,
  },
  {
    id: 'coordinator-checkin-queue-tests',
    label: 'Coordinator check-in queue tests',
    command: 'npm test -- src/lib/coordinatorCheckInQueue.test.ts',
    required: true,
  },
  {
    id: 'coordinator-timeline-state-tests',
    label: 'Coordinator timeline state tests',
    command: 'npm test -- src/lib/coordinatorTimelineState.test.ts',
    required: true,
  },
  {
    id: 'checkin-guard',
    label: 'Check-in guard',
    command: 'npm run smoke:checkin',
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
  slice: 'coordinator-dayof',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  automatedCoverage: [
    'Role-aware coordinator live-ops boundaries',
    'Check-in queue filtering behavior',
    'Single-live-event timeline state truth',
    'Check-in mode guardrail',
    'Build integrity after coordinator proof assertions',
  ],
  stillManualProofNeeded: [
    'Run coordinator mode with realistic guest/event data',
    'Verify queue/check-in/timeline/Q&A feel calm under actual usage',
    'Confirm a coordinator can answer who is here / what is next / what needs action in runtime',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
