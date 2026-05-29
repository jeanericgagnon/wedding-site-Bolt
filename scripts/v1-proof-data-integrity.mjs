#!/usr/bin/env node

import { checkSourceStep, printProofAndExit, runCommandStep } from './v1-proof-utils.mjs';

const commands = [
  {
    id: 'builder-v2-integrity-tests',
    label: 'Builder V2 adapter, import, hydration, and link integrity tests',
    command: 'npm test -- --run src/builder-v2/adapter.test.ts src/builder-v2/importPrepare.test.ts src/builder-v2/importSanitize.test.ts src/builder/utils/setupDraftHydration.test.ts src/builder/utils/pageMapIntegrity.test.ts src/pages/builderV2DocumentIo.test.ts src/lib/publicGuestLinks.test.ts src/lib/collaboratorInviteLink.test.ts',
  },
];

const sourceChecks = [
  {
    id: 'import-prepare-keeps-usable-section-guard',
    label: 'Import prepare keeps usable-section guard',
    file: 'src/builder-v2/importPrepare.ts',
    mustContain: [
      'usable sections',
      'prepareImportedBuilderV2Document',
    ],
  },
  {
    id: 'page-integrity-keeps-duplicate-slug-summary',
    label: 'Page integrity keeps duplicate slug watchouts',
    file: 'src/builder/utils/pageMapIntegrity.ts',
    mustContain: [
      'duplicate-slug',
      'hidden-empty',
    ],
  },
  {
    id: 'public-guest-links-keep-invite-token-shape',
    label: 'Public guest links keep invite-token shape',
    file: 'src/lib/publicGuestLinks.ts',
    mustContain: [
      'guest_access_token',
      'invite_token',
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
  slice: 'data-integrity',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: failedRequired.length === 0
    ? 'Builder V2 document conversion, import cleanup, page normalization, hydration, and guest-link token shaping stay locally covered by focused tests and source guards.'
    : 'One or more local data-integrity checks failed.',
  stillManualProofNeeded: [
    'Cross-environment persistence and live database migration confirmation remain part of the final release-proof lane.',
  ],
  results,
});
