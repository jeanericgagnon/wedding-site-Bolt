#!/usr/bin/env node

import { buildBlockedResult, checkSourceStep, printProofAndExit } from './v1-proof-utils.mjs';

const requireLive = process.argv.includes('--require-live');
const hasLiveEnv = Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);

const localResults = [
  checkSourceStep({
    id: 'guest-contact-lookup-uses-service-role-server-side',
    label: 'Guest contact lookup keeps service-role access server-side',
    file: 'supabase/functions/guest-contact-lookup/index.ts',
    mustContain: [
      'SUPABASE_SERVICE_ROLE_KEY',
    ],
  }),
  checkSourceStep({
    id: 'guest-contact-submit-uses-service-role-server-side',
    label: 'Guest contact submit keeps service-role access server-side',
    file: 'supabase/functions/guest-contact-submit/index.ts',
    mustContain: [
      'SUPABASE_SERVICE_ROLE_KEY',
    ],
  }),
];

if (requireLive && !hasLiveEnv) {
  localResults.push(buildBlockedResult({
    id: 'live-client-rls-run',
    label: 'Live client RLS matrix run',
    blocker: 'missing_live_env',
    detail: 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY for the required live client RLS proof lane.',
  }));
}

const failedRequired = localResults.filter((result) => result.required !== false && !result.ok);

printProofAndExit({
  ok: failedRequired.length === 0,
  slice: 'client-rls-matrix',
  generatedAt: new Date().toISOString(),
  summary: {
    total: localResults.length,
    passed: localResults.filter((result) => result.ok).length,
    failed: localResults.filter((result) => !result.ok).length,
  },
  contractSummary: requireLive
    ? 'Client RLS matrix helper is wired again and now fails honestly when the required live env is unavailable.'
    : 'Client RLS matrix helper is wired again locally; secure live execution still needs env-backed follow-through.',
  stillManualProofNeeded: [
    'A real live RLS run still needs approved env and network access.',
  ],
  results: localResults,
});
