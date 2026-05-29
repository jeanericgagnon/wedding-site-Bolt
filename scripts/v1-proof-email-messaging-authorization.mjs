#!/usr/bin/env node

import { checkSourceStep, printProofAndExit, runCommandStep } from './v1-proof-utils.mjs';

const commands = [
  {
    id: 'email-messaging-safety-tests',
    label: 'Email and messaging authorization safety tests',
    command: 'npm test -- --run src/lib/sendWeddingEmailSafety.test.ts src/lib/processEmailQueueSafety.test.ts src/lib/sendBulkMessageSafety.test.ts',
  },
];

const sourceChecks = [
  {
    id: 'send-wedding-email-keeps-guest-safe-copy',
    label: 'Send wedding email keeps guest-safe copy',
    file: 'supabase/functions/send-wedding-email/index.ts',
    mustContain: [
      'Could not send this email. Please try again.',
      'SEND_WEDDING_EMAIL_PROVIDER_FAILED',
    ],
  },
  {
    id: 'process-email-queue-keeps-guest-safe-copy',
    label: 'Process email queue keeps guest-safe copy',
    file: 'supabase/functions/process-email-queue/index.ts',
    mustContain: [
      'Could not process email queue. Please try again.',
      'PROCESS_EMAIL_QUEUE_UNEXPECTED_FAILED',
    ],
  },
  {
    id: 'send-bulk-message-stays-reviewable-but-locked',
    label: 'Send bulk message stays reviewable but locked',
    file: 'supabase/functions/send-bulk-message/index.ts',
    mustContain: [
      'Texting stays locked until sender setup, consent, opt-out, and delivery readiness are complete.',
      'const SMS_SENDING_ENABLED = smsSendingEnabledRaw === "true"',
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
  slice: 'email-messaging-authorization',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: failedRequired.length === 0
    ? 'Email and messaging flows remain locally constrained to guest-safe failure copy, with SMS still explicitly disabled until the provider/compliance lane is intentionally reopened.'
    : 'One or more email or messaging authorization checks failed.',
  stillManualProofNeeded: [
    'Live provider delivery confirmation remains outside this no-deploy V2 closeout batch.',
  ],
  results,
});
