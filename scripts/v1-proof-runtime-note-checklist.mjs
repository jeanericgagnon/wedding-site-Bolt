#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const checklistPath = 'docs/v1-runtime-operator-notes-checklist.md';
const smokeLogPath = 'docs/v1-smoke-proof-log.md';

if (!existsSync(checklistPath)) {
  throw new Error(`${checklistPath} is missing.`);
}

const checklist = readFileSync(checklistPath, 'utf8');

const requiredPhrases = [
  'Canonical Couple Path + Runtime Wording',
  'Guests / RSVP Ops',
  'Collaborator Access',
  'Coordinator Day-Of',
  'Registry',
  'Comms Center',
  'Seating Continuity',
  smokeLogPath,
  'npm run proof:v1:board',
  'npm run proof:v1:board:freshness',
  'npm run proof:v1:board:md',
  'local/helper proof paths regenerate the raw and markdown board outputs',
  'launch stays `HOLD` until that secure closeout bundle is green',
  'npm run proof:v1:launch-closeout',
];

const missingPhrases = requiredPhrases.filter((phrase) => !checklist.includes(phrase));

const result = {
  generatedAt: new Date().toISOString(),
  status: missingPhrases.length === 0 ? 'pass' : 'fail',
  checklistPath,
  summary:
    missingPhrases.length === 0
      ? 'Runtime operator notes stay aligned: workflow gates stop at freshness while helper/local proof paths regenerate the raw and markdown board artifacts when needed.'
      : 'Runtime operator notes drifted from the required workflow-versus-helper board contract.',
  contractSummary:
    missingPhrases.length === 0
      ? 'This checker guards the operator-facing runtime checklist contract; it keeps the human proof path aligned, but it is not a launch-truth artifact by itself.'
      : 'This checker found drift in the operator-facing runtime checklist contract and the checklist should not be trusted until repaired.',
  checks: {
    requiredPhrases: requiredPhrases.length,
    missingPhrases,
  },
};

console.log(JSON.stringify(result, null, 2));

if (result.status !== 'pass') {
  process.exitCode = 1;
}
