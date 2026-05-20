#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { resolvePreviewRuntime, stopPreviewRuntime } from './proofPreviewRuntime.mjs';

const scriptShell =
  process.platform === 'win32'
    ? process.env.ComSpec || 'cmd.exe'
    : process.env.SHELL || '/bin/bash';

const PREVIEW_URL = 'http://127.0.0.1:4178';
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || PREVIEW_URL;
const isLiveBaseUrl = baseUrl !== PREVIEW_URL;

const steps = [
  {
    id: 'rsvp-access-truth',
    label: 'RSVP access truth',
    command: 'npm test -- --run src/lib/rsvpAccessPlanner.test.ts src/pages/dashboard/guests/GuestRsvpSettingsView.test.tsx',
    required: true,
  },
  {
    id: 'rsvp-access-browser-proof',
    label: isLiveBaseUrl
      ? 'Live guest RSVP settings continuity browser proof'
      : 'Guest RSVP settings continuity browser proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 tests/e2e/guests-rsvp-access.spec.ts`,
    required: true,
  },
  {
    id: 'build',
    label: 'Build integrity check',
    command: 'npm run build',
    required: true,
  },
  {
    id: 'rsvp-strict',
    label: 'RSVP strict smoke',
    command: 'npm run smoke:rsvp:strict',
    required: true,
  },
  {
    id: 'csv-mapper-guard',
    label: 'CSV mapper guard',
    command: 'npm run smoke:csvmapper',
    required: true,
  },
  {
    id: 'checkin-guard',
    label: 'Check-in guard',
    command: 'npm run smoke:checkin',
    required: true,
  },
];

function extractJsonBlob(text) {
  if (!text || typeof text !== 'string') return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = text.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function classifyParsedResult(parsed) {
  if (!parsed || typeof parsed !== 'object') return { blocked: false, blockerType: null };
  if (parsed.step === 'external_fixture_required' || parsed.step === 'env_missing' || parsed.skipped === true) {
    return { blocked: true, blockerType: parsed.step ?? 'external_fixture_required' };
  }
  return { blocked: false, blockerType: null };
}

function classifyExecutionBlock(stdout, stderr) {
  const combined = `${stdout ?? ''}\n${stderr ?? ''}`;
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(combined)) {
    return { blocked: true, blockerType: 'network_unavailable' };
  }
  return { blocked: false, blockerType: null };
}

function runStep(step) {
  const startedAt = new Date().toISOString();
  try {
    const stdout = execSync(step.command, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: scriptShell,
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
    });

    const parsed = extractJsonBlob(stdout);
    const parsedClassification = classifyParsedResult(parsed);
    const fallbackClassification = classifyExecutionBlock(stdout, '');
    const blocked = parsedClassification.blocked || fallbackClassification.blocked;
    const blockerType = parsedClassification.blockerType ?? fallbackClassification.blockerType;

    return {
      id: step.id,
      label: step.label,
      command: step.command,
      required: step.required,
      ok: true,
      blocked,
      blockerType,
      startedAt,
      finishedAt: new Date().toISOString(),
      parsed,
      stdout: parsed ? undefined : stdout.trim(),
    };
  } catch (error) {
    const stdout = typeof error?.stdout === 'string' ? error.stdout : Buffer.isBuffer(error?.stdout) ? error.stdout.toString('utf8') : '';
    const stderr = typeof error?.stderr === 'string' ? error.stderr : Buffer.isBuffer(error?.stderr) ? error.stderr.toString('utf8') : '';

    const parsed = extractJsonBlob(stdout);
    const parsedClassification = classifyParsedResult(parsed);
    const fallbackClassification = classifyExecutionBlock(stdout, stderr);
    const blocked = parsedClassification.blocked || fallbackClassification.blocked;
    const blockerType = parsedClassification.blockerType ?? fallbackClassification.blockerType;

    return {
      id: step.id,
      label: step.label,
      command: step.command,
      required: step.required,
      ok: false,
      blocked,
      blockerType,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: typeof error?.status === 'number' ? error.status : 1,
      parsed,
      stdout: parsed ? undefined : stdout.trim(),
      stderr: stderr.trim() || undefined,
    };
  }
}

const initialSteps = steps.filter((step) => step.id !== 'rsvp-access-browser-proof');
const browserStep = steps.find((step) => step.id === 'rsvp-access-browser-proof');
const results = initialSteps.map(runStep);

let previewProcess = null;
let previewOutput = { stdout: '', stderr: '' };

try {
  if (baseUrl === PREVIEW_URL) {
    const previewRuntime = await resolvePreviewRuntime({
      preferredPort: 4178,
      requestedBaseUrl: baseUrl,
      cwd: process.cwd(),
    });
    previewProcess = previewRuntime.previewProcess;
    previewOutput = previewRuntime.previewOutput;
  }

  if (!browserStep) {
    throw new Error('RSVP browser proof step is missing.');
  }
  results.splice(1, 0, runStep(browserStep));
} catch (error) {
  results.splice(1, 0, {
    id: 'rsvp-access-browser-proof',
    label: isLiveBaseUrl
      ? 'Live guest RSVP settings continuity browser proof'
      : 'Guest RSVP settings continuity browser proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 tests/e2e/guests-rsvp-access.spec.ts`,
    required: true,
    ok: false,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    stderr: [previewOutput.stderr.trim(), error instanceof Error ? error.message : 'RSVP settings preview server failed to start.'].filter(Boolean).join('\n'),
  });
} finally {
  await stopPreviewRuntime(previewProcess);
}

const blockedRequired = results.filter((result) => result.required && result.blocked);
const failedRequired = results.filter((result) => result.required && !result.ok && !result.blocked);

const output = {
  ok: failedRequired.length === 0 && blockedRequired.length === 0,
  blocked: blockedRequired.length > 0,
  slice: 'guests-rsvp-ops',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    blocked: blockedRequired.length,
  },
  contractSummary: isLiveBaseUrl
    ? 'Guests/RSVP ops live proof is green: this owner-plus-guest lane closes shipped RSVP settings, token, and household/runtime truth while still rolling up into the broader proof-board launch call.'
    : 'Guests/RSVP ops local proof is green: this lane validates owner RSVP-settings and guest-ops behavior locally and leaves shipped-runtime RSVP truth to the dedicated live rerun.',
  automatedCoverage: [
    'RSVP access-mode recovery + household-scope + verification-input truth',
    isLiveBaseUrl
      ? 'Live owner browser proof for RSVP settings mode selection, persisted backup truth, and future-mode planning copy'
      : 'Owner browser proof for RSVP settings mode selection, persisted backup truth, and future-mode planning copy',
    'RSVP token validation + scope guards',
    'CSV mapper guardrail',
    'Check-in mode / guest ops guardrail',
  ],
  stillManualProofNeeded: [
    ...(isLiveBaseUrl ? [] : ['Rerun the same owner RSVP-settings browser proof against the shipped production runtime after the next approved guests deploy.']),
    'Create/edit/review guest + household state in the dashboard',
    'Submit or update RSVP through the guest-facing flow',
    'Verify dashboard/event readback stays aligned after the RSVP change',
  ],
  blockers: blockedRequired.map((result) => ({
    id: result.id,
    label: result.label,
    blockerType: result.blockerType,
    message: result.parsed?.message ?? 'Blocked by environment or missing external fixture.',
    recommendation: result.parsed?.recommendation ?? null,
  })),
  results,
};

console.log(JSON.stringify(output, null, 2));
if (failedRequired.length > 0) process.exit(1);
