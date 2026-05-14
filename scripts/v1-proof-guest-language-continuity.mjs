#!/usr/bin/env node

import { execSync, spawn } from 'node:child_process';

const PREVIEW_URL = 'http://127.0.0.1:4173';
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

const results = [];

results.push(runStep({
  id: 'guest-language-unit-tests',
  label: 'Guest language continuity unit tests',
  command: 'npm test -- --run src/lib/guestLanguagePreference.test.ts src/lib/guestMessageLanguagePreview.test.ts src/lib/rsvpTranslationAssets.test.ts src/pages/RSVP.test.tsx',
}));

results.push(runStep({
  id: 'build',
  label: 'Build integrity check',
  command: 'npm run build',
}));

let previewProcess = null;
let previewStdout = '';
let previewStderr = '';
try {
  if (baseUrl === PREVIEW_URL) {
    previewProcess = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173'], {
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
    id: 'guest-language-browser-proof',
    label: 'Guest language browser continuity proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 tests/e2e/guest-i18n.spec.ts`,
  }));

  if (previewStdout.trim()) {
    results.push({
      id: 'preview-server-log',
      label: 'Preview server log',
      command: 'npm run preview -- --host 127.0.0.1 --port 4173',
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
    id: 'guest-language-browser-proof',
    label: 'Guest language browser continuity proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 tests/e2e/guest-i18n.spec.ts`,
    required: true,
    ok: false,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    stderr: [previewStderr.trim(), error instanceof Error ? error.message : 'Guest language preview server failed to start.'].filter(Boolean).join('\n'),
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
  slice: 'guest-language-continuity',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  automatedCoverage: [
    'Stored guest language preference and owner-preview language derivation truth',
    'Translated RSVP question and meal-choice continuity coverage',
    'Guest-facing RSVP, event hub, photo upload, and recap language continuity in a browser',
  ],
  stillManualProofNeeded: [
    'Rerun the same flow on production after the next guest-language deploy wave.',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
