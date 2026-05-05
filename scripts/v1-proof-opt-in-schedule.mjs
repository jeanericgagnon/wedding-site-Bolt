import { existsSync, readFileSync } from 'node:fs';

const schedulePath = 'docs/v1-opt-in-live-proof-schedule.md';
const requiredSpecs = [
  'tests/e2e/seating-write-read.spec.ts',
  'tests/e2e/quick-start-onboarding-write-read.spec.ts',
  'tests/e2e/planner-starter-suite-write-read.spec.ts',
  'tests/e2e/site-rsvp-widget-write-read.spec.ts',
  'tests/e2e/settings-team-invite-claim.spec.ts',
  'tests/e2e/vendor-profile-publish-inquiry.spec.ts',
  'tests/e2e/vendor-templates-smoke.spec.ts',
  'tests/e2e/guest-import-write.spec.ts',
  'tests/e2e/rsvp-write-read.spec.ts',
  'tests/e2e/event-rsvp-write-read.spec.ts',
  'tests/e2e/guest-hub-write-read.spec.ts',
  'tests/e2e/guest-contact-update-write-read.spec.ts',
];

if (!existsSync(schedulePath)) {
  throw new Error(`${schedulePath} is missing.`);
}

const schedule = readFileSync(schedulePath, 'utf8');
const missingFiles = requiredSpecs.filter((spec) => !existsSync(spec));
const missingScheduleRows = requiredSpecs.filter((spec) => !schedule.includes(spec));
const missingGuardrails = [
  'authenticated write/cleanup approval',
  'Do not print secrets',
  'Exit bar',
].filter((phrase) => !schedule.includes(phrase));

const result = {
  generatedAt: new Date().toISOString(),
  status: missingFiles.length === 0 && missingScheduleRows.length === 0 && missingGuardrails.length === 0 ? 'pass' : 'fail',
  schedulePath,
  requiredSpecs,
  missingFiles,
  missingScheduleRows,
  missingGuardrails,
};

console.log(JSON.stringify(result, null, 2));

if (result.status !== 'pass') {
  process.exitCode = 1;
}

