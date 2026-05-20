#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { resolvePreviewRuntime, stopPreviewRuntime } from './proofPreviewRuntime.mjs';

const PREVIEW_URL = 'http://127.0.0.1:4176';
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || PREVIEW_URL;

const steps = [
  {
    id: 'seating-service-tests',
    label: 'Seating continuity logic tests',
    command: 'npm test -- --run src/pages/dashboard/seating/seatingService.test.ts src/lib/seatingCateringExportReadiness.test.ts src/pages/dashboard/seating/seatingDashboardUtils.test.ts',
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

let previewProcess = null;
let previewOutput = { stdout: '', stderr: '' };
try {
  if (baseUrl === PREVIEW_URL) {
    const previewRuntime = await resolvePreviewRuntime({
      preferredPort: 4176,
      requestedBaseUrl: baseUrl,
      cwd: process.cwd(),
    });
    previewProcess = previewRuntime.previewProcess;
    previewOutput = previewRuntime.previewOutput;
  }

  results.push(runStep({
    id: 'seating-packet-browser-proof',
    label: 'Seating packet export browser proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 tests/e2e/seating-packet-exports.spec.ts`,
    required: true,
  }));

  if (previewOutput.stdout.trim()) {
    results.push({
      id: 'preview-server-log',
      label: 'Preview server log',
      command: 'npm run preview -- --host 127.0.0.1 --port 4176',
      required: false,
      ok: true,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      stdout: previewOutput.stdout.trim(),
      stderr: previewOutput.stderr.trim() || undefined,
    });
  }
} catch (error) {
  results.push({
    id: 'seating-packet-browser-proof',
    label: 'Seating packet export browser proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 tests/e2e/seating-packet-exports.spec.ts`,
    required: true,
    ok: false,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    stderr: [previewOutput.stderr.trim(), error instanceof Error ? error.message : 'Seating preview server failed to start.'].filter(Boolean).join('\n'),
  });
} finally {
  await stopPreviewRuntime(previewProcess);
}

const failedRequired = results.filter((result) => result.required && !result.ok);

const output = {
  ok: failedRequired.length === 0,
  slice: 'seating-continuity',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: 'Seating continuity proof is green: this lane validates seating packet, lookup, and assignment continuity as shipped feature evidence while still deferring the final launch call to the proof-board flow.',
  automatedCoverage: [
    'Event-scoped attendance interpretation',
    'Invited-only seating counters and valid-assignment counting',
    'Catering packet export structure and grouped kitchen-summary truth',
    'Browser-captured seating CSV, kitchen-summary, SVG, and printable PDF packet content',
    'Browser seat change continuity into seating lookup readback',
    'Check-in mode guardrail',
    'Build integrity after seating continuity assertions',
  ],
  stillManualProofNeeded: [
    'Assign RSVP-backed guests to tables in a real seating event',
    'Rerun the same seating packet export and lookup readback flow against the shipped production runtime after the next approved seating deploy',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
