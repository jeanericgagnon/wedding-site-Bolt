#!/usr/bin/env node

import { execSync } from 'node:child_process';

const steps = [
  {
    id: 'invite-utils-tests',
    label: 'Invite acceptance utility tests',
    command: 'npm test -- src/pages/acceptCollaboratorInviteUtils.test.ts',
    required: true,
  },
  {
    id: 'planner-access-matrix-tests',
    label: 'Planner access role-matrix tests',
    command: 'npm test -- src/lib/plannerAccess.test.ts',
    required: true,
  },
  {
    id: 'planning-financial-readonly-tests',
    label: 'Planning financial read-only surface tests',
    command: 'npm test -- --run src/pages/dashboard/planning/BudgetTab.test.tsx src/pages/dashboard/planning/VendorsTab.test.tsx',
    required: true,
  },
  {
    id: 'build',
    label: 'Build integrity check',
    command: 'npm run build',
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
      parsed: extractJsonBlob(stdout),
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
      parsed: extractJsonBlob(stdout),
      stdout: stdout.trim() || undefined,
      stderr: stderr.trim() || undefined,
    };
  }
}

const results = steps.map(runStep);
const failedRequired = results.filter((result) => result.required && !result.ok);

const output = {
  ok: failedRequired.length === 0,
  slice: 'collaborator-access',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  automatedCoverage: [
    'Invite validation + redirect utility behavior',
    'Role-permission matrix boundaries for owner/planner/coordinator/viewer',
    'Read-only budget and vendor ledger surfaces for non-edit collaborator roles',
    'Build integrity after collaborator-proof assertions',
  ],
  stillManualProofNeeded: [
    'Owner invite -> accept flow with a real pending invite',
    'Role-aware landing surface check after claim',
    'At least one forbidden action attempt for a non-owner role in runtime',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
