#!/usr/bin/env node

import { checkSourceStep, printProofAndExit, runCommandStep } from './v1-proof-utils.mjs';

const commands = [
  {
    id: 'service-role-safety-tests',
    label: 'Service-role guest and messaging safety tests',
    command: 'npm test -- --run src/lib/guestContactLookupSafety.test.ts src/lib/guestContactSubmitSafety.test.ts src/lib/sendWeddingEmailSafety.test.ts src/lib/processEmailQueueSafety.test.ts src/lib/sendBulkMessageSafety.test.ts',
  },
];

const sourceChecks = [
  {
    id: 'guest-contact-lookup-keeps-service-role-server-side',
    label: 'Guest contact lookup keeps service-role usage server-side',
    file: 'supabase/functions/guest-contact-lookup/index.ts',
    mustContain: [
      'SUPABASE_SERVICE_ROLE_KEY',
      'Could not look up guests. Please try again.',
    ],
  },
  {
    id: 'guest-contact-submit-keeps-service-role-server-side',
    label: 'Guest contact submit keeps service-role usage server-side',
    file: 'supabase/functions/guest-contact-submit/index.ts',
    mustContain: [
      'SUPABASE_SERVICE_ROLE_KEY',
      'Could not update this guest. Please try again.',
    ],
  },
  {
    id: 'send-wedding-email-keeps-service-role-server-side',
    label: 'Send wedding email keeps service-role usage server-side',
    file: 'supabase/functions/send-wedding-email/index.ts',
    mustContain: [
      'SUPABASE_SERVICE_ROLE_KEY',
      'Could not send this email. Please try again.',
    ],
  },
  {
    id: 'process-email-queue-keeps-service-role-server-side',
    label: 'Process email queue keeps service-role usage server-side',
    file: 'supabase/functions/process-email-queue/index.ts',
    mustContain: [
      'SUPABASE_SERVICE_ROLE_KEY',
      'Could not process email queue. Please try again.',
    ],
  },
  {
    id: 'validate-rsvp-token-keeps-service-role-server-side',
    label: 'Validate RSVP token keeps service-role usage server-side',
    file: 'supabase/functions/validate-rsvp-token/index.ts',
    mustContain: ['SUPABASE_SERVICE_ROLE_KEY'],
  },
  {
    id: 'send-bulk-message-keeps-service-role-server-side',
    label: 'Send bulk message keeps service-role usage server-side',
    file: 'supabase/functions/send-bulk-message/index.ts',
    mustContain: [
      'SUPABASE_SERVICE_ROLE_KEY',
      'Could not process this message. Please try again.',
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
  slice: 'service-role-authorization',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: failedRequired.length === 0
    ? 'The audited guest-contact, RSVP-token, and messaging functions keep service-role usage server-side, while the paired safety tests continue to lock guest-facing error copy away from internal details.'
    : 'One or more service-role authorization checks failed.',
  stillManualProofNeeded: [
    'Live database policy and preview-token replay checks stay tracked separately under the final release-proof lane.',
  ],
  results,
});
