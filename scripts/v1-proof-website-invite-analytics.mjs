#!/usr/bin/env node

import { execSync, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PREVIEW_URL = 'http://127.0.0.1:4173';
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || PREVIEW_URL;

function envValue(key, fallback = '') {
  if (process.env[key]) return String(process.env[key]);
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return fallback;
  const match = readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .find((line) => line.startsWith(`${key}=`));
  if (!match) return fallback;
  return match.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, '');
}

const ownerEmail = envValue('V1_OWNER_EMAIL', '');
const ownerPassword = envValue('V1_OWNER_PASSWORD', '');
const shouldRunLiveOwnerProof = baseUrl !== PREVIEW_URL && /^https?:\/\//i.test(baseUrl) && Boolean(ownerEmail && ownerPassword);

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
  id: 'analytics-core-unit-tests',
  label: 'Website and invite analytics core unit tests',
  command: 'npm test -- --run src/pages/dashboard/analyticsEventSummary.test.ts src/pages/dashboard/analyticsCoverageAudit.test.ts src/lib/websiteInviteAnalyticsReadiness.test.ts src/pages/dashboard/buildOverviewDashboardModel.test.ts',
}));

results.push(runStep({
  id: 'analytics-siteview-tests',
  label: 'Website analytics SiteView target tests',
  command: 'npm test -- --run src/pages/siteViewAnalyticsTarget.test.ts',
}));

results.push(runStep({
  id: 'analytics-public-route-tests',
  label: 'Website analytics public and guest route tests',
  command: 'npm test -- --run src/pages/EventHub.test.tsx src/pages/EventRecap.test.tsx src/pages/RSVP.test.tsx src/pages/PhotoUpload.test.ts',
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
    id: 'analytics-public-privacy-browser-proof',
    label: 'Public and guest-facing analytics privacy browser proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 tests/e2e/analytics-public-privacy.spec.ts`,
  }));

  if (shouldRunLiveOwnerProof) {
    results.push(runStep({
      id: 'analytics-owner-live-proof',
      label: 'Owner analytics live readback proof',
      command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 tests/e2e/analytics-owner-live.spec.ts`,
    }));
  }

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
    id: 'analytics-public-privacy-browser-proof',
    label: 'Public and guest-facing analytics privacy browser proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 tests/e2e/analytics-public-privacy.spec.ts`,
    required: true,
    ok: false,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    stderr: [previewStderr.trim(), error instanceof Error ? error.message : 'Analytics preview server failed to start.'].filter(Boolean).join('\n'),
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
  slice: 'website-invite-analytics',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  automatedCoverage: [
    'Aggregate analytics math, readiness wiring, and retention/guardrail truth',
    'Audited invite-entry and QR-entry route coverage staying aligned with the owner aggregate summary targets',
    'Public site, RSVP, guest hub, and photo-upload routes staying free of owner analytics detail',
    'Authenticated owner overview analytics readback on the shipped runtime when live credentials are available',
  ],
  stillManualProofNeeded: shouldRunLiveOwnerProof
    ? [
        'Keep the live owner analytics and public-route privacy proof green on future deploys.',
      ]
    : [
        'Rerun the owner analytics readback against a live authenticated runtime once V1_OWNER_EMAIL, V1_OWNER_PASSWORD, and a live PLAYWRIGHT_BASE_URL are available.',
        'Keep the local/public analytics coverage audit green while waiting for the next live owner proof rerun.',
      ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
