#!/usr/bin/env node

import { checkFilePresenceStep, checkSourceStep, printProofAndExit } from './v1-proof-utils.mjs';

const results = [
  checkFilePresenceStep({
    id: 'security-automation-files-present',
    label: 'Security automation files are present',
    files: [
      '.github/dependabot.yml',
      '.github/workflows/codeql.yml',
      '.github/workflows/gitleaks.yml',
      '.github/workflows/semgrep.yml',
      '.semgrep/dayof-security.yml',
    ],
  }),
  checkSourceStep({
    id: 'launch-gate-keeps-board-freshness-contract',
    label: 'Launch gate keeps the board freshness contract explicit',
    file: 'package.json',
    mustContain: [
      'npm run proof:v1:board:freshness',
      'npm run proof:v1:board',
      'npm run proof:v1:board:md',
    ],
  }),
  checkSourceStep({
    id: 'semgrep-rules-guard-key-launch-leaks',
    label: 'Semgrep rules guard key launch leak patterns',
    file: '.semgrep/dayof-security.yml',
    mustContain: [
      'dangerouslySetInnerHTML',
      'VITE_OPENAI_API_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ],
  }),
];

const failedRequired = results.filter((result) => result.required !== false && !result.ok);

printProofAndExit({
  ok: failedRequired.length === 0,
  slice: 'security-automation',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: failedRequired.length === 0
    ? 'Security automation wiring is back in place locally: dependency, static-analysis, secret-scan, and CodeQL workflow artifacts exist again, with a repo-local Semgrep ruleset covering the current launch leak concerns.'
    : 'One or more security automation artifacts are missing or stale.',
  stillManualProofNeeded: [
    'Hosted CI execution still needs remote confirmation outside this local no-deploy batch.',
  ],
  results,
});
