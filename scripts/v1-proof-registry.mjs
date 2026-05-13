#!/usr/bin/env node

import { execSync } from 'node:child_process';

const requireLive = process.argv.includes('--require-live');
const liveEnabled = process.env.LIVE_REGISTRY_WRITE_READ === '1';

const localSteps = [
  {
    id: 'registry-service-tests',
    label: 'Registry service trust tests',
    command: 'npm test -- src/pages/dashboard/registry/registryService.test.ts',
    required: true,
  },
  {
    id: 'registry-types-tests',
    label: 'Registry metadata + attention-state tests',
    command: 'npm test -- src/pages/dashboard/registry/registryTypes.test.ts',
    required: true,
  },
  {
    id: 'registry-barcode-tests',
    label: 'Registry barcode normalization tests',
    command: 'npm test -- src/lib/registryBarcode.test.ts src/lib/registryBarcodeMatch.test.ts src/pages/dashboard/registry/registryRefreshFields.test.ts src/pages/dashboard/registry/RegistryItemForm.test.tsx',
    required: true,
  },
  {
    id: 'registry-guard',
    label: 'Registry dashboard guard smoke',
    command: 'node scripts/smoke_registry_guard.js',
    required: true,
  },
  {
    id: 'build',
    label: 'Build integrity check',
    command: 'npm run build',
    required: true,
  },
];

const liveSteps = liveEnabled ? [
  {
    id: 'registry-live-write-read',
    label: 'Registry live write/read + duplicate merge proof',
    command: 'npx playwright test --workers=1 tests/e2e/registry-write-read.spec.ts',
    required: true,
  },
] : [];

const steps = [...localSteps, ...liveSteps];

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
const failedRequired = results.filter((result) => result.required && !result.ok);

if (requireLive && !liveEnabled) {
  console.log(JSON.stringify({
    ok: false,
    slice: 'registry',
    proof: 'registry-live',
    blocking: true,
    message: 'Run LIVE_REGISTRY_WRITE_READ=1 npm run proof:v1:registry to verify the live owner registry import, duplicate merge, barcode-backed item creation, and public registry readback route.',
  }, null, 2));
  process.exit(1);
}

const output = {
  ok: failedRequired.length === 0,
  slice: 'registry',
  proof: liveEnabled ? 'registry-live' : 'registry-local',
  generatedAt: new Date().toISOString(),
  launchClaim: {
    status: liveEnabled ? 'live-proof-green' : 'local-proof-green-live-proof-pending',
    highestRiskTrustGap: liveEnabled ? null : 'runtime_registry_truth_after_real_edits',
    secondaryTrustGap: liveEnabled ? null : 'barcode_lookup_runtime_truth_after_deploy',
    manualProofRequired: !liveEnabled,
    truthGateSummary: liveEnabled ? 'automation_green_live_truth_green' : 'automation_green_live_truth_pending',
    evidenceLogPath: 'docs/v1-smoke-proof-log.md',
    manualProofStatus: liveEnabled ? 'closed' : 'pending_live_registry_write_read',
    manualProofRequirements: liveEnabled ? [] : [
      'owner_manage_import_persistence_runtime_pass',
      'owner_duplicate_merge_runtime_pass',
      'owner_barcode_lookup_save_runtime_pass',
      'guest_visible_registry_endpoint_runtime_pass',
    ],
    manualProofBlockingReasons: liveEnabled ? {} : {
      owner_manage_import_persistence_runtime_pass: 'run the authenticated live registry add/edit proof',
      owner_duplicate_merge_runtime_pass: 'run the live duplicate-merge proof against deployed runtime',
      owner_barcode_lookup_save_runtime_pass: 'run the live barcode lookup/save proof against deployed runtime',
      guest_visible_registry_endpoint_runtime_pass: 'confirm the public registry endpoint stays readable after runtime edits',
    },
  },
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  automatedCoverage: [
    'Purchased-state normalization and duplicate detection',
    'Metadata confidence / blocked retailer / repair-state attention truth',
    'Barcode normalization and registry barcode form behavior',
    'Registry dashboard guard coverage',
    'Build integrity after registry proof assertions',
    ...(liveEnabled ? ['Live owner registry URL import, duplicate merge collapse/readback, barcode-backed item persistence, and public registry endpoint readability'] : []),
  ],
  stillManualProofNeeded: liveEnabled ? [] : [
    'Add or import a real registry item on live runtime',
    'Merge a real duplicate registry pair on live runtime',
    'Add a real barcode-backed item on live runtime',
    'Verify the public registry endpoint stays readable after runtime edits',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
