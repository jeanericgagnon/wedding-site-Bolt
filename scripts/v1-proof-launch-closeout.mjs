#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const releasePacketPath = 'docs/release-checklists/2026-05-28-v2-closeout-certification.md';
const builderRollbackPath = 'docs/builder-v2-cutover-checklist.md';

const commandSteps = [
  {
    id: 'typecheck',
    label: 'Typecheck',
    command: 'npm run typecheck -- --pretty false',
  },
  {
    id: 'first-session-smoke',
    label: 'First-session couple funnel smoke',
    command: `PLAYWRIGHT_BASE_URL=${JSON.stringify(baseUrl)} npm run test:e2e:first-session`,
  },
  {
    id: 'public-v2-runtime',
    label: 'Public V2 runtime and template parity',
    command: `PLAYWRIGHT_BASE_URL=${JSON.stringify(baseUrl)} npm run proof:v1:public-v2-runtime`,
  },
  {
    id: 'guest-journey',
    label: 'Guest journey proof',
    command: `PLAYWRIGHT_BASE_URL=${JSON.stringify(baseUrl)} npm run proof:v1:guest-journey`,
  },
  {
    id: 'registry-public-parity',
    label: 'Registry public parity',
    command: 'npm run proof:v1:registry-public-parity',
  },
  {
    id: 'sms-disabled-state',
    label: 'SMS disabled-state truth',
    command: 'npm run proof:v1:sms-disabled-state',
  },
  {
    id: 'ai-product-readiness',
    label: 'AI product readiness',
    command: 'npm run proof:v1:ai-product-readiness',
  },
  {
    id: 'photo-memory-flow',
    label: 'Photo, vault, and memory flow',
    command: `PLAYWRIGHT_BASE_URL=${JSON.stringify(baseUrl)} npm run proof:v1:photo-memory-flow`,
  },
  {
    id: 'billing-entitlement-trust',
    label: 'Billing and entitlement trust',
    command: `PLAYWRIGHT_BASE_URL=${JSON.stringify(baseUrl)} npm run proof:v1:billing-entitlement-trust`,
  },
  {
    id: 'data-integrity',
    label: 'Security, privacy, and data integrity',
    command: 'npm run proof:v1:data-integrity',
  },
  {
    id: 'website-invite-analytics',
    label: 'Website and invite analytics truth',
    command: 'npm run proof:v1:website-invite-analytics',
  },
  {
    id: 'whole-product-polish',
    label: 'Whole-product polish matrix',
    command: `PLAYWRIGHT_BASE_URL=${JSON.stringify(baseUrl)} npm run proof:v1:whole-product-polish`,
  },
  {
    id: 'build',
    label: 'Build',
    command: 'npm run build',
  },
  {
    id: 'board-freshness',
    label: 'Proof board freshness',
    command: 'npm run proof:v1:board:freshness',
  },
  {
    id: 'board-raw',
    label: 'Proof board raw render',
    command: 'npm run proof:v1:board',
  },
  {
    id: 'board-markdown',
    label: 'Proof board markdown render',
    command: 'npm run proof:v1:board:md',
  },
  {
    id: 'diff-check',
    label: 'git diff whitespace check',
    command: 'git diff --check',
  },
];

const sourceChecks = [
  {
    id: 'release-packet',
    label: 'Release packet exists and records local-only signoff plus deploy deferrals',
    file: releasePacketPath,
    mustContain: [
      '# DayOf V2 Closeout Certification',
      'Local V2 product closeout verdict: READY',
      'Deploy verdict: NOT APPROVED IN THIS BATCH',
      'No push or deploy was run as part of this closeout batch.',
      'Repo-wide quiet lint was attempted on 2026-05-28 and failed on pre-existing debt outside this batch.',
      'Live-env reruns remain required only when we intentionally prepare a remote release candidate or deploy candidate.',
      '## Rollback and fallback plan',
      'VITE_BUILDER_V2_ENABLED=false',
      'VITE_BUILDER_V2_AUDIENCE=internal',
    ],
  },
  {
    id: 'builder-rollback-checklist',
    label: 'Builder rollback checklist still documents the fallback toggles',
    file: builderRollbackPath,
    mustContain: [
      'document rollback procedure (`/builder` route hard switch)',
      'VITE_BUILDER_V2_ENABLED=false',
      'VITE_BUILDER_V2_AUDIENCE=internal',
      'npm run proof:v1:builder-v2-ci-gate',
    ],
  },
];

function runCommandStep(step) {
  execSync(step.command, {
    stdio: 'inherit',
    shell: '/bin/zsh',
    env: process.env,
  });
}

function runSourceCheck(step) {
  const source = fs.readFileSync(step.file, 'utf8');

  for (const text of step.mustContain) {
    if (!source.includes(text)) {
      throw new Error(`${step.file} is missing required text: ${text}`);
    }
  }
}

for (const step of commandSteps) {
  console.log(`\n[launch-closeout] ${step.label}`);
  runCommandStep(step);
}

for (const step of sourceChecks) {
  console.log(`\n[launch-closeout] ${step.label}`);
  runSourceCheck(step);
}

console.log('\n[launch-closeout] PASS: local V2 closeout packet, board, and proof bundle agree.');
