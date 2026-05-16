#!/usr/bin/env node

import { execSync, spawn } from 'node:child_process';

const PREVIEW_URL = 'http://127.0.0.1:4173';
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || PREVIEW_URL;
const isLiveBaseUrl = baseUrl !== PREVIEW_URL;
const browserSpec = isLiveBaseUrl
  ? 'tests/e2e/messages-comms-center-live.spec.ts'
  : 'tests/e2e/messages-comms-center.spec.ts';

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
    id: 'messages-browser-proof',
    label: isLiveBaseUrl ? 'Messages authenticated live owner browser proof' : 'Messages local browser proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 ${browserSpec}`,
    required: true,
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
    id: 'messages-browser-proof',
    label: isLiveBaseUrl ? 'Messages authenticated live owner browser proof' : 'Messages local browser proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 ${browserSpec}`,
    required: true,
    ok: false,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    stderr: [previewStderr.trim(), error instanceof Error ? error.message : 'Messages preview server failed to start.'].filter(Boolean).join('\n'),
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
    isLiveBaseUrl
      ? 'Authenticated live owner browser proof for composing and saving each operational message starting point with cleanup'
      : 'Local browser proof for composing and saving message starting points plus scheduled campaign wording',
    'Build integrity after comms-center proof assertions',
  ],
  stillManualProofNeeded: [
    isLiveBaseUrl
      ? 'Verify history state reads credibly after a real runtime delivery attempt once a safe provider-backed live-send lane is explicitly reopened.'
      : 'Rerun compose/save/send flows against an authenticated live owner runtime after the next approved messaging deploy.',
    isLiveBaseUrl
      ? 'Keep live delivery-state grouping green against real message history rows on future deploys.'
      : 'Verify history state reads credibly after runtime delivery attempt',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
