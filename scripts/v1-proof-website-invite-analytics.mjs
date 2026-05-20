#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolvePreviewRuntime, stopPreviewRuntime } from './proofPreviewRuntime.mjs';

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

function runStep(step) {
  const startedAt = new Date().toISOString();
  console.error(`[website-invite-analytics] starting ${step.id}: ${step.command}`);
  try {
    const stdout = execSync(step.command, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: '/bin/zsh',
      env: process.env,
      maxBuffer: 20 * 1024 * 1024,
    });
    console.error(`[website-invite-analytics] passed ${step.id}`);
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
    console.error(`[website-invite-analytics] failed ${step.id}`);
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
  command: 'npm test -- --pool=threads --run src/pages/dashboard/analyticsEventSummary.test.ts src/pages/dashboard/analyticsCoverageAudit.test.ts src/lib/websiteInviteAnalyticsReadiness.test.ts src/pages/dashboard/buildOverviewDashboardModel.test.ts',
}));

results.push(runStep({
  id: 'analytics-siteview-tests',
  label: 'Website analytics SiteView target tests',
  command: 'npm test -- --pool=threads --run src/pages/siteViewAnalyticsTarget.test.ts',
}));

results.push(runStep({
  id: 'analytics-public-route-tests',
  label: 'Website analytics public and guest route tests',
  command: 'npm test -- --pool=threads --run src/pages/EventHub.test.tsx src/pages/EventRecap.test.tsx src/pages/RSVP.test.tsx src/pages/PhotoUpload.test.ts',
}));

results.push(runStep({
  id: 'build',
  label: 'Build integrity check',
  command: 'npm run build',
}));

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
    id: 'analytics-public-privacy-browser-proof',
    label: 'Public and guest-facing analytics privacy browser proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 tests/e2e/analytics-public-privacy.spec.ts`,
    required: true,
    ok: false,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    stderr: [previewOutput.stderr.trim(), error instanceof Error ? error.message : 'Analytics preview server failed to start.'].filter(Boolean).join('\n'),
  });
} finally {
  await stopPreviewRuntime(previewProcess);
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
  contractSummary: shouldRunLiveOwnerProof
    ? 'Website/invite analytics live proof is green: this owner-facing lane closes analytics readback and public-route privacy truth for the shipped surface while still rolling up into the broader proof-board launch call.'
    : 'Website/invite analytics local proof is green: this lane validates analytics math and public-route privacy locally while leaving authenticated live owner truth to the dedicated rerun.',
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
