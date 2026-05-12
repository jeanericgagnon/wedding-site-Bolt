#!/usr/bin/env node

import { execSync } from 'node:child_process';

const scriptShell =
  process.platform === 'win32'
    ? process.env.ComSpec || 'cmd.exe'
    : process.env.SHELL || '/bin/bash';

const steps = [
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
    const { blocked, blockerType } = classifyParsedResult(parsed);

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
    const { blocked, blockerType } = classifyParsedResult(parsed);

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

const results = steps.map(runStep);
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
  automatedCoverage: [
    'RSVP token validation + scope guards',
    'CSV mapper guardrail',
    'Check-in mode / guest ops guardrail',
  ],
  stillManualProofNeeded: [
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
