#!/usr/bin/env node

import { checkSourceStep, printProofAndExit, runCommandStep } from './v1-proof-utils.mjs';

const commands = [
  {
    id: 'public-launch-surface-tests',
    label: 'Public and guest launch-surface tests',
    command: 'npm test -- --run src/lib/publicSiteProject.test.ts src/lib/publicSiteBoundary.test.ts src/pages/SiteView.test.ts src/pages/RSVP.test.tsx src/pages/EventRSVP.test.tsx src/pages/GuestContactUpdate.test.tsx src/pages/PhotoUpload.test.tsx src/pages/VaultContribute.test.ts',
  },
];

const sourceChecks = [
  {
    id: 'guest-contact-submit-stays-guest-safe',
    label: 'Guest contact submit stays guest-safe',
    file: 'supabase/functions/guest-contact-submit/index.ts',
    mustContain: [
      'Could not update this guest. Please try again.',
    ],
    mustNotContain: [
      'JSON.stringify({ error: updateError.message })',
    ],
  },
  {
    id: 'public-site-boundary-strips-internal-fields',
    label: 'Public site boundary keeps internal fields stripped',
    file: 'src/lib/publicSiteBoundary.ts',
    mustContain: [
      'provider',
      'bucket',
      'command',
      'debug',
      'servicerole',
    ],
  },
];

const results = [
  ...commands.map(runCommandStep),
  ...sourceChecks.map(checkSourceStep),
];

const failedRequired = results.filter((result) => result.required !== false && !result.ok);

printProofAndExit({
  ok: failedRequired.length === 0,
  slice: 'public-access-coverage',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: failedRequired.length === 0
    ? 'Current public, guest, RSVP, upload, and vault launch surfaces stay locally covered by tests plus guest-safe boundary checks.'
    : 'One or more public launch-surface coverage checks failed.',
  stillManualProofNeeded: [
    'Signed-in browser smoke for the top public launch paths still needs separate QA evidence.',
  ],
  results,
});
