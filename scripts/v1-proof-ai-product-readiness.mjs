#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';

const commands = [
  {
    id: 'ai-launch-contract-tests',
    label: 'AI-assisted copy and deterministic-draft contract tests',
    command: 'npm test -- src/pages/onboarding/Celebration.test.tsx src/pages/onboarding/QuickStart.test.tsx src/pages/onboarding/quickStartCopy.test.ts src/lib/aiDraftGenerator.test.ts src/lib/aiOnboarding.test.ts',
    required: true,
  },
  {
    id: 'public-boundary-tests',
    label: 'Public leak-boundary tests',
    command: 'npm test -- src/lib/publicSiteBoundary.test.ts',
    required: true,
  },
  {
    id: 'photo-and-album-safety-tests',
    label: 'Photo and album safety tests',
    command: 'npm test -- src/lib/photoUploadSafety.test.ts src/lib/photoUploadModerateSafety.test.ts src/lib/photoAlbumCreateSafety.test.ts src/lib/photoAlbumManageSafety.test.ts',
    required: true,
  },
  {
    id: 'openai-client-safety-tests',
    label: 'Client OpenAI safety tests',
    command: 'npm test -- src/lib/openaiClientSafety.test.ts',
    required: true,
  },
];

function runCommandStep(step) {
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
    const stdout = typeof error?.stdout === 'string'
      ? error.stdout
      : Buffer.isBuffer(error?.stdout)
        ? error.stdout.toString('utf8')
        : '';
    const stderr = typeof error?.stderr === 'string'
      ? error.stderr
      : Buffer.isBuffer(error?.stderr)
        ? error.stderr.toString('utf8')
        : '';

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

function checkSourceStep(step) {
  const startedAt = new Date().toISOString();

  try {
    const source = fs.readFileSync(step.file, 'utf8');
    const failures = [];

    for (const pattern of step.mustContain ?? []) {
      if (!source.includes(pattern)) failures.push(`Missing required text: ${pattern}`);
    }

    for (const pattern of step.mustNotContain ?? []) {
      if (source.includes(pattern)) failures.push(`Unexpected text present: ${pattern}`);
    }

    return {
      id: step.id,
      label: step.label,
      file: step.file,
      required: step.required,
      ok: failures.length === 0,
      startedAt,
      finishedAt: new Date().toISOString(),
      details: failures.length === 0 ? ['All source assertions passed.'] : failures,
    };
  } catch (error) {
    return {
      id: step.id,
      label: step.label,
      file: step.file,
      required: step.required,
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      details: [error instanceof Error ? error.message : String(error)],
    };
  }
}

const sourceChecks = [
  {
    id: 'server-only-openai-key-path',
    label: 'OpenAI key path stays server-only by source',
    file: 'src/lib/openai.ts',
    required: true,
    mustContain: [
      "getEnvValue('OPENAI_API_KEY')",
      "getEnvValue('OPENAI_MODEL')",
    ],
    mustNotContain: [
      'VITE_OPENAI_API_KEY',
      'VITE_OPENAI_MODEL',
    ],
  },
  {
    id: 'ai-copy-stays-assisted',
    label: 'Customer-facing AI copy stays framed as assisted help',
    file: 'src/pages/onboarding/Celebration.tsx',
    required: true,
    mustContain: [
      'AI-assisted setup',
      'AI-assisted first draft',
    ],
    mustNotContain: [
      'AI-led fastest path',
      'smart autopilot',
    ],
  },
  {
    id: 'quick-start-copy-stays-assisted',
    label: 'Quick Start helper copy stays grounded',
    file: 'src/pages/onboarding/QuickStart.tsx',
    required: true,
    mustContain: [
      'AI-assisted draft help, with the real product flow behind it',
    ],
    mustNotContain: [
      'A few smart follow-ups before we build',
      'These are just the highest-leverage details the AI still wants.',
    ],
  },
];

const results = [
  ...commands.map(runCommandStep),
  ...sourceChecks.map(checkSourceStep),
];

const failedRequired = results.filter((result) => result.required && !result.ok);

const output = {
  ok: failedRequired.length === 0,
  slice: 'ai-product-readiness',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  launchContract: {
    modelBacked: [
      'Server-side AI is allowed only when configured outside the browser bundle.',
    ],
    deterministicOrFallback: [
      'Quick Start extraction and wedding-site draft generation fall back cleanly when model-backed AI is unavailable.',
      'Customer-facing onboarding copy stays framed as assisted draft help instead of autonomous automation.',
    ],
    customerSafety: [
      'Public leak boundaries remain active.',
      'Photo and album error paths stay customer-safe.',
      'Browser bundle no longer relies on Vite-exposed OpenAI key variables.',
    ],
  },
  automatedCoverage: [
    'AI-assisted onboarding copy stays grounded instead of overclaiming automation.',
    'Deterministic Quick Start and wedding-draft fallbacks remain usable.',
    'Public surfaces still strip internal-looking provider/token/debug values.',
    'Photo and album safety rails keep errors customer-safe.',
    'OpenAI client path no longer relies on browser-exposed Vite key variables.',
  ],
  stillManualProofNeeded: [
    'Server-side secure-model/live-readback proof for any retained model-backed routes must stay green where those routes still exist.',
    'Cross-surface AI claims matrix and final release copy review still need human readback before V2 signoff.',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
