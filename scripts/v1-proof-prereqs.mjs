#!/usr/bin/env node

import { checkFilePresenceStep, checkSourceStep, printProofAndExit } from './v1-proof-utils.mjs';

const results = [
  checkFilePresenceStep({
    id: 'required-proof-scripts-present',
    label: 'Current local launch-proof scripts exist',
    files: [
      'scripts/v1-proof-board.mjs',
      'scripts/v1-proof-prereqs.mjs',
      'scripts/v1-proof-public-access-coverage.mjs',
      'scripts/v1-proof-client-write-inventory.mjs',
      'scripts/v1-proof-ast-security.mjs',
      'scripts/v1-proof-security-automation.mjs',
      'scripts/v1-proof-performance-budget.mjs',
      'scripts/v1-proof-client-rls-matrix.mjs',
      'scripts/v1-proof-registry-preview-ssrf.mjs',
    ],
  }),
  checkSourceStep({
    id: 'launch-gate-still-points-at-proof-lanes',
    label: 'Launch gate still points at the maintained proof lanes',
    file: 'package.json',
    mustContain: [
      '"test:launch": "npm run typecheck -- --pretty false',
      'npm run proof:v1:public-access-coverage',
      'npm run proof:v1:client-write-inventory',
      'npm run proof:v1:ast-security',
      'npm run proof:v1:security-automation',
      'npm run proof:v1:client-rls-matrix -- --require-live',
      'npm run proof:v1:registry-preview-ssrf -- --require-live',
      'npm run proof:v1:performance-budget',
      'npm run proof:v1:board:freshness',
    ],
  }),
  checkSourceStep({
    id: 'backlog-current-state-block-exists',
    label: 'Backlog keeps the current-state block required by board freshness',
    file: 'BACKLOG.md',
    mustContain: [
      '| Field | Current State |',
      '| Current date/time |',
      '| Current proof state |',
      '| Current next actions |',
    ],
  }),
];

const failedRequired = results.filter((result) => result.required && !result.ok);

printProofAndExit({
  ok: failedRequired.length === 0,
  slice: 'release-proof-prereqs',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: failedRequired.length === 0
    ? 'Local release-proof prerequisites are wired again: the active package proof commands, backlog freshness source, and current launch-proof script files are all present.'
    : 'Local release-proof prerequisites are still missing a required script or contract file.',
  stillManualProofNeeded: [
    'Live guest RLS proof still needs approved env-backed execution.',
    'Live registry-preview SSRF proof still needs approved env-backed execution.',
  ],
  results,
});
