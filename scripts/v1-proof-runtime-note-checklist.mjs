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
  'launch stays `HOLD` until that secure closeout bundle is green',
  'npm run proof:v1:launch-closeout',
];

const missingPhrases = requiredPhrases.filter((phrase) => !checklist.includes(phrase));

const result = {
  generatedAt: new Date().toISOString(),
  status: missingPhrases.length === 0 ? 'pass' : 'fail',
  checklistPath,
  checks: {
    requiredPhrases: requiredPhrases.length,
    missingPhrases,
  },
};

console.log(JSON.stringify(result, null, 2));

if (result.status !== 'pass') {
  process.exitCode = 1;
}
