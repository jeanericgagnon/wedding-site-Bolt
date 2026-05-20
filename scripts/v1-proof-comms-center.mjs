#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { resolvePreviewRuntime, stopPreviewRuntime } from './proofPreviewRuntime.mjs';

const PREVIEW_URL = 'http://127.0.0.1:4173';
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || PREVIEW_URL;
const isLiveBaseUrl = baseUrl !== PREVIEW_URL;
const browserSpec = isLiveBaseUrl
  ? 'tests/e2e/messages-comms-center-live.spec.ts'
  : 'tests/e2e/messages-comms-center.spec.ts';

const steps = [
  {
    id: 'message-delivery-state-tests',
    label: 'Message delivery-state truth tests',
    command: 'DAYOF_FOCUSED_VITEST_TIMEOUT_MS=180000 npm run test:focused -- src/lib/messageDeliveryState.test.ts src/pages/dashboard/messages/messageDashboardUtils.test.ts src/pages/dashboard/messages/messageService.boundary.test.ts src/pages/dashboard/messages/MessageDetailModal.test.tsx',
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
  console.error(`[comms-center-proof] starting ${step.id}: ${step.command}`);
  try {
    const stdout = execSync(step.command, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: '/bin/zsh',
      env: process.env,
      maxBuffer: 20 * 1024 * 1024,
    });

    console.error(`[comms-center-proof] passed ${step.id}`);
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
    console.error(`[comms-center-proof] failed ${step.id}`);
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
      preferredPort: 4173,
      requestedBaseUrl: baseUrl,
      cwd: process.cwd(),
    });
    previewProcess = previewRuntime.previewProcess;
    previewOutput = previewRuntime.previewOutput;
  }

  results.push(runStep({
    id: 'messages-browser-proof',
    label: isLiveBaseUrl ? 'Messages authenticated live owner browser proof' : 'Messages local browser proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 ${browserSpec}`,
    required: true,
  }));

  if (previewOutput.stdout.trim()) {
    results.push({
      id: 'preview-server-log',
      label: 'Preview server log',
      command: 'npm run preview -- --host 127.0.0.1 --port 4173',
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
    id: 'messages-browser-proof',
    label: isLiveBaseUrl ? 'Messages authenticated live owner browser proof' : 'Messages local browser proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 ${browserSpec}`,
    required: true,
    ok: false,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    stderr: [previewOutput.stderr.trim(), error instanceof Error ? error.message : 'Messages preview server failed to start.'].filter(Boolean).join('\n'),
  });
} finally {
  await stopPreviewRuntime(previewProcess);
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
  contractSummary: isLiveBaseUrl
    ? 'Comms-center live proof is green for the non-SMS owner lane: this bundle validates compose/save/review truth without implying reopened live SMS-send clearance.'
    : 'Comms-center local proof is green: this bundle validates owner messaging workflow truth locally and still defers any live-send reopening decision to explicit provider-backed proof.',
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
