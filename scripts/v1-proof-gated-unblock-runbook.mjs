import { existsSync, readFileSync } from 'node:fs';

const runbookPath = 'docs/v1-final-gated-unblock-runbook.md';
const packagePath = 'package.json';

if (!existsSync(runbookPath)) {
  throw new Error(`${runbookPath} is missing.`);
}

const runbook = readFileSync(runbookPath, 'utf8');
const pkg = readFileSync(packagePath, 'utf8');

const requiredPhrases = [
  'Do not deploy or apply migrations without explicit approval.',
  'Do not print, paste, commit, screenshot, or log secret values.',
  'photo-upload',
  'supabase functions deploy photo-upload --project-ref atuzuobpprjstfmdnwso',
  'LIVE_PHOTO_UPLOAD_WRITE_READ=1 LIVE_PHOTO_ANALYSIS_WRITE_READ=1 PLAYWRIGHT_BASE_URL=https://dayof.love npx playwright test --workers=1 tests/e2e/photo-upload-write-read.spec.ts',
  'Secure-Env Model-Backed AI Proof',
  'V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance',
  'Secure Service-Role Storage/Cross-Table Integrity Proof',
  'npm run proof:v1:data-integrity',
  'proofMode: "service_role_full"',
  'Secure Service-Role And Queue Closeout Bundle',
  'npm run proof:v1:launch-closeout',
  'External OpenAI Key Rotation',
  'V1_AI_EXPOSURE_LIVE=1 npm run proof:v1:ai-exposure',
  'npm run proof:v1:board:md',
  'docs/v1-smoke-proof-log.md',
  'docs/full-suite-launch-backlog-2026-04-30.md',
];

const missingPhrases = requiredPhrases.filter((phrase) => !runbook.includes(phrase));
const packageScriptPresent = pkg.includes('"proof:v1:gated-unblock-runbook": "node scripts/v1-proof-gated-unblock-runbook.mjs"');

const result = {
  generatedAt: new Date().toISOString(),
  status: missingPhrases.length === 0 && packageScriptPresent ? 'pass' : 'fail',
  runbookPath,
  checks: {
    requiredPhrases: requiredPhrases.length,
    missingPhrases,
    packageScriptPresent,
  },
};

console.log(JSON.stringify(result, null, 2));

if (result.status !== 'pass') {
  process.exitCode = 1;
}
