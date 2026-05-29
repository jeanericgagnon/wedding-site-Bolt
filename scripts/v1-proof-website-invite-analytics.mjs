#!/usr/bin/env node

import { checkSourceStep, printProofAndExit, runCommandStep } from './v1-proof-utils.mjs';

const commands = [
  {
    id: 'analytics-truth-tests',
    label: 'Analytics baseline and overview visibility truth tests',
    command: 'npm test -- --run src/pages/dashboard/analyticsAggregate.test.ts src/pages/dashboard/analyticsBaseline.test.ts src/pages/dashboard/overviewVisibility.test.ts src/lib/siteVisibilityState.test.ts',
  },
];

const sourceChecks = [
  {
    id: 'overview-loads-real-privacy-mode',
    label: 'Overview loads real privacy-mode truth',
    file: 'src/pages/dashboard/Overview.tsx',
    mustContain: [
      'privacy_mode',
      'hide_from_search',
      'getOverviewPrivacyMode',
      'getOverviewHideFromSearch',
      'Only measured product signals shown here. No guessed conversion metrics.',
      'This is still the measured baseline before fuller analytics lands',
      'Latest local save, publish, and rollback events from this browser session history.',
      'Durable cross-device logging is still next.',
    ],
    mustNotContain: [
      "const privacyMode = 'public';",
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
  slice: 'website-invite-analytics',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: failedRequired.length === 0
    ? 'Owner overview analytics stay explicitly limited to measured RSVP, registry, photo, and guest-prompt signals, while access-mode guidance and local activity copy now reflect shipped behavior instead of inventing fuller funnel certainty.'
    : 'One or more owner analytics truth checks failed.',
  stillManualProofNeeded: [
    'Broader cross-device audit/error logging depth remains a separate ops lane and is not implied by this analytics truth proof.',
  ],
  results,
});
