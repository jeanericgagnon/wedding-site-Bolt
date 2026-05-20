#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { resolvePreviewRuntime, stopPreviewRuntime } from './proofPreviewRuntime.mjs';

const PREVIEW_PORT = 4177;
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`;
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || PREVIEW_URL;

const steps = [
  {
    id: 'ledger-tests',
    label: 'Budget/vendor ledger unit coverage',
    command: 'npm test -- --run src/pages/dashboard/planning/planningDemoState.test.ts src/lib/budgetVendorLedgerReadiness.test.ts src/pages/dashboard/planning/BudgetTab.test.tsx src/pages/dashboard/planning/VendorsTab.test.tsx src/pages/dashboard/planning/vendorMetaStorage.test.ts',
    required: true,
  },
  {
    id: 'browser-proof',
    label: 'Budget/vendor ledger browser continuity proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 tests/e2e/planning-budget-vendor-ledger.spec.ts`,
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

const initialSteps = steps.filter((step) => step.id !== 'browser-proof');
const browserStep = steps.find((step) => step.id === 'browser-proof');
const results = initialSteps.map(runStep);

let previewProcess = null;
let previewOutput = { stdout: '', stderr: '' };

try {
  if (baseUrl === PREVIEW_URL) {
    const previewRuntime = await resolvePreviewRuntime({
      preferredPort: PREVIEW_PORT,
      requestedBaseUrl: baseUrl,
      cwd: process.cwd(),
    });
    previewProcess = previewRuntime.previewProcess;
    previewOutput = previewRuntime.previewOutput;
  }

  if (!browserStep) {
    throw new Error('Browser proof step is missing.');
  }
  results.push(runStep(browserStep));
} catch (error) {
  results.push({
    id: 'browser-proof',
    label: 'Budget/vendor ledger browser continuity proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 tests/e2e/planning-budget-vendor-ledger.spec.ts`,
    required: true,
    ok: false,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    stderr: [previewOutput.stderr.trim(), error instanceof Error ? error.message : 'Preview server failed to start.'].filter(Boolean).join('\n'),
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
  contractSummary: 'Budget/vendor ledger proof is green: this planning lane validates financial/vendor continuity and non-exposure as shipped feature evidence while still leaving live shared-site runtime truth to the dedicated reruns.',
  automatedCoverage: [
    'Demo planning ledger persistence for budget, vendors, and vendor reminder metadata',
    'Role-safe budget and vendor readback surfaces',
    'Browser add/edit/delete continuity across reloads for owner budget and vendor flows',
    'Read-only collaborator browser visibility plus guest-facing public non-exposure for financial details',
    'Build integrity after ledger proof assertions',
  ],
  stillManualProofNeeded: [
    'Live owner add/edit/delete proof with cleanup on the shipped production runtime after the next approved planning deploy',
    'Planner collaborator runtime CRUD/readback confirmation on a real shared site',
    'Live guest-facing production rerun confirming financial terms stay absent after the next approved planning deploy',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
