#!/usr/bin/env node

import { printProofAndExit, runCommandStep } from './v1-proof-utils.mjs';

const results = [
  runCommandStep({
    id: 'file-size-guard',
    label: 'File size guard',
    command: 'npm run guard:file-size',
  }),
  runCommandStep({
    id: 'asset-budget-guard',
    label: 'Asset budget guard',
    command: 'npm run guard:assets',
  }),
];

const failedRequired = results.filter((result) => result.required !== false && !result.ok);

printProofAndExit({
  ok: failedRequired.length === 0,
  slice: 'performance-budget',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: failedRequired.length === 0
    ? 'The local file-size and asset-budget guards are green for the current launch scope.'
    : 'One or more local file-size or asset-budget guards failed.',
  results,
});
