#!/usr/bin/env node

import { execSync, spawn } from 'node:child_process';

const PREVIEW_URL = 'http://127.0.0.1:4177';
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
let previewStdout = '';
let previewStderr = '';

try {
  if (baseUrl === PREVIEW_URL) {
    previewProcess = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4177'], {
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
    stderr: [previewStderr.trim(), error instanceof Error ? error.message : 'Preview server failed to start.'].filter(Boolean).join('\n'),
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
  slice: 'budget-vendor-ledger',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  automatedCoverage: [
    'Demo planning ledger persistence for budget, vendors, and vendor reminder metadata',
    'Role-safe budget and vendor readback surfaces',
    'Browser add/edit/delete continuity across reloads for owner budget and vendor flows',
    'Build integrity after ledger proof assertions',
  ],
  stillManualProofNeeded: [
    'Live owner add/edit/delete proof with cleanup on the shipped production runtime after the next approved planning deploy',
    'Planner collaborator runtime CRUD/readback confirmation on a real shared site',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
