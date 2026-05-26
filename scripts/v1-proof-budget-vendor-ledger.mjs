#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { resolvePreviewRuntime, stopPreviewRuntime } from './proofPreviewRuntime.mjs';

const PREVIEW_PORT = 4180;
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`;
const requestedBaseUrl = process.env.PLAYWRIGHT_BASE_URL || PREVIEW_URL;
const browserSpec = 'tests/e2e/mobile-core-smoke.spec.ts';
const browserGrep = 'authenticated dashboard core routes render on mobile without native dialog regressions';

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
    id: 'budget-vendor-logic-tests',
    label: 'Budget and vendor date + action boundary tests',
    command: 'NODE_OPTIONS=--max-old-space-size=4096 npm test -- --run src/pages/dashboard/planning/vendorDate.test.ts src/pages/dashboard/planning/usePlanningDashboardActions.test.tsx src/lib/plannerAccess.test.ts',
  }),
  runStep({
    id: 'build',
    label: 'Build integrity check',
    command: 'npm run build',
  }),
];

let previewProcess = null;
let previewOutput = { stdout: '', stderr: '' };
let activeBaseUrl = requestedBaseUrl;

try {
  if (requestedBaseUrl === PREVIEW_URL) {
    const previewRuntime = await resolvePreviewRuntime({
      preferredPort: PREVIEW_PORT,
      requestedBaseUrl,
      cwd: process.cwd(),
    });
    previewProcess = previewRuntime.previewProcess;
    previewOutput = previewRuntime.previewOutput;
    activeBaseUrl = previewRuntime.baseUrl;
  }

  results.push(runStep({
    id: 'budget-vendor-browser-proof',
    label: 'Budget and vendor mobile dashboard proof',
    command: `PLAYWRIGHT_BASE_URL=${activeBaseUrl} npx playwright test --workers=1 ${browserSpec} -g "${browserGrep}"`,
  }));
} catch (error) {
  results.push({
    id: 'budget-vendor-browser-proof',
    label: 'Budget and vendor mobile dashboard proof',
    command: `PLAYWRIGHT_BASE_URL=${activeBaseUrl} npx playwright test --workers=1 ${browserSpec} -g "${browserGrep}"`,
    required: true,
    ok: false,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    stderr: [previewOutput.stderr.trim(), error instanceof Error ? error.message : 'Budget/vendor preview server failed to start.'].filter(Boolean).join('\n'),
  });
} finally {
  await stopPreviewRuntime(previewProcess);
}

const failedRequired = results.filter((result) => result.required && !result.ok);
const output = {
  ok: failedRequired.length === 0,
  slice: 'budget-vendor-ledger',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: failedRequired.length === 0
    ? 'Budget and vendor ledger proof is green: the current owner/planner ledger boundaries and dashboard surface are intact.'
    : 'Budget and vendor ledger proof is not green yet: required planner logic, build, or dashboard browser evidence is still failing.',
  automatedCoverage: [
    'Vendor date normalization and planning-action permission boundaries',
    'Planner/coordinator role boundary truth for budget and vendor access',
    'Mobile dashboard presence of the budget and vendor ledger surface, payment review, and export control',
    'Build integrity after budget/vendor assertions',
  ],
  stillManualProofNeeded: [
    'Keep live add/edit/delete and export cleanup proof fresh on the shipped runtime after future planning-surface deploys.',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
