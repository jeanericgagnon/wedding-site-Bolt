#!/usr/bin/env node

import { execSync, spawn } from 'node:child_process';

const PREVIEW_URL = 'http://127.0.0.1:4176';
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || PREVIEW_URL;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPreview(url, timeoutMs = 20_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
      if (response.ok) return;
    } catch {
      // keep waiting
    }
    await sleep(500);
  }
  throw new Error(`Preview server did not become ready at ${url} within ${timeoutMs}ms`);
}

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
    id: 'photo-memory-tests',
    label: 'Photo memory flow unit and boundary tests',
    command: 'npm test -- --run src/lib/memoryFlowReadiness.test.ts src/pages/dashboard/guestPhotos/guestPhotoDemoState.test.ts src/pages/dashboard/guestPhotoSharingService.test.ts src/pages/PhotoUpload.test.ts',
  }),
  runStep({
    id: 'build',
    label: 'Build integrity check',
    command: 'npm run build',
  }),
];

let previewProcess = null;
let previewStdout = '';
let previewStderr = '';
try {
  if (baseUrl === PREVIEW_URL) {
    previewProcess = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4176'], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    previewProcess.stdout.on('data', (chunk) => {
      previewStdout += chunk.toString('utf8');
    });
    previewProcess.stderr.on('data', (chunk) => {
      previewStderr += chunk.toString('utf8');
    });

    await waitForPreview(PREVIEW_URL);
  }

  results.push(runStep({
    id: 'photo-memory-browser-proof',
    label: 'Photo memory flow browser proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 tests/e2e/photo-memory-flow.spec.ts`,
  }));

  if (previewStdout.trim()) {
    results.push({
      id: 'preview-server-log',
      label: 'Preview server log',
      command: 'npm run preview -- --host 127.0.0.1 --port 4176',
      required: false,
      ok: true,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      stdout: previewStdout.trim(),
      stderr: previewStderr.trim() || undefined,
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
    stderr: [previewStderr.trim(), error instanceof Error ? error.message : 'Photo memory flow preview server failed to start.'].filter(Boolean).join('\n'),
  });
} finally {
  if (previewProcess) {
    previewProcess.kill('SIGTERM');
    await sleep(300);
    if (!previewProcess.killed) previewProcess.kill('SIGKILL');
  }
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
  automatedCoverage: [
    'Memory-flow readiness truth for slideshow, recap, video, follow-up, and export lanes',
    'Demo/local dashboard continuity for recap-status readback and full-resolution download-job export',
    'Mobile guest photo-upload route proof for the no-app memory flow without raw-token leakage',
  ],
  stillManualProofNeeded: [
    'Add live guest video upload browser proof.',
    'Add live slideshow publish/display proof beyond owner-draft readiness.',
    'Prove owner moderation readback after real live uploads.',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
