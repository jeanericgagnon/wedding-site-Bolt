#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { resolvePreviewRuntime, stopPreviewRuntime } from './proofPreviewRuntime.mjs';

const PREVIEW_URL = 'http://127.0.0.1:4176';
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || PREVIEW_URL;

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
    id: 'photo-memory-tests',
    label: 'Photo memory flow unit and boundary tests',
    command: 'node_modules/.bin/vitest run src/lib/memoryFlowReadiness.test.ts src/pages/dashboard/guestPhotos/guestPhotoDemoState.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/PhotoUpload.test.ts --config scripts/photo-memory-vitest.config.mjs --environment jsdom --pool=threads --maxWorkers=1 --no-file-parallelism --reporter=verbose',
    timeoutMs: 240_000,
  }),
  runStep({
    id: 'build',
    label: 'Build integrity check',
    command: 'npm run build',
    timeoutMs: 900_000,
  }),
];

let previewProcess = null;
let previewOutput = { stdout: '', stderr: '' };
try {
  if (baseUrl === PREVIEW_URL) {
    const previewRuntime = await resolvePreviewRuntime({
      preferredPort: 4176,
      requestedBaseUrl: baseUrl,
      cwd: process.cwd(),
      startupTimeoutMs: 120_000,
    });
    previewProcess = previewRuntime.previewProcess;
    previewOutput = previewRuntime.previewOutput;
  }

  results.push(runStep({
    id: 'photo-memory-browser-proof',
    label: 'Photo memory flow browser proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 tests/e2e/photo-memory-flow.spec.ts`,
    timeoutMs: 900_000,
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
    id: 'photo-memory-browser-proof',
    label: 'Photo memory flow browser proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 tests/e2e/photo-memory-flow.spec.ts`,
    required: true,
    ok: false,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    stderr: [previewOutput.stderr.trim(), error instanceof Error ? error.message : 'Photo memory flow preview server failed to start.'].filter(Boolean).join('\n'),
  });
} finally {
  await stopPreviewRuntime(previewProcess);
}

const failedRequired = results.filter((result) => result.required && !result.ok);
const output = {
  ok: failedRequired.length === 0,
  slice: 'photo-memory-flow',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: failedRequired.length === 0
    ? 'Photo memory flow proof is green: this feature bundle validates memory/recap upload-and-readback continuity as shipped lane evidence while still deferring the final launch call to the proof-board flow.'
    : 'Photo memory flow proof is not green yet: required unit, build, or browser evidence is still failing.',
  automatedCoverage: [
    'Memory-flow readiness truth for slideshow, recap, video, follow-up, and export lanes',
    'Demo/local dashboard continuity for recap-status readback and full-resolution download-job export',
    'Guest-side QA video upload now persists into the shared demo memory-flow state and is read back by the owner dashboard in browser proof',
    'Owner-side recap preview handoff plus guest-facing published recap display with story/video moment readback in the local browser proof',
    'Mobile guest photo-upload route proof for the no-app memory flow without raw-token leakage',
  ],
  stillManualProofNeeded: [
    'Rerun the strengthened live photo-memory production lane, including the owner-side "Preview recap" handoff, against the shipped runtime after the next approved deploy.',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
