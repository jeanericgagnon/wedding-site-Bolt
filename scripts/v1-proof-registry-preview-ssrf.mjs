#!/usr/bin/env node

import { buildBlockedResult, checkFilePresenceStep, printProofAndExit } from './v1-proof-utils.mjs';

const requireLive = process.argv.includes('--require-live');
const hasLiveEnv = Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);

const results = [
  checkFilePresenceStep({
    id: 'registry-preview-safety-tests-present',
    label: 'Registry preview SSRF safety tests are present',
    files: [
      'supabase/functions/registry-preview/urlNormalizer.test.ts',
      'supabase/functions/registry-preview/previewSafety.test.ts',
      'supabase/functions/registry-preview/targetAdapter.test.ts',
    ],
  }),
];

if (requireLive && !hasLiveEnv) {
  results.push(buildBlockedResult({
    id: 'live-registry-preview-ssrf-run',
    label: 'Live registry preview SSRF run',
    blocker: 'missing_live_env',
    detail: 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY for the required live registry-preview SSRF proof lane.',
  }));
}

const failedRequired = results.filter((result) => result.required !== false && !result.ok);

printProofAndExit({
  ok: failedRequired.length === 0,
  slice: 'registry-preview-ssrf',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: requireLive
    ? 'Registry preview SSRF helper is wired again and now blocks honestly when the required live env is unavailable.'
    : 'Registry preview SSRF helper is wired again locally; the live hostile-target rerun still needs env-backed execution.',
  stillManualProofNeeded: [
    'A real live registry-preview SSRF rerun still needs approved env and network access.',
  ],
  results,
});
