#!/usr/bin/env node

import { checkSourceStep, printProofAndExit } from './v1-proof-utils.mjs';

const results = [
  checkSourceStep({
    id: 'site-view-stays-read-only',
    label: 'SiteView stays read-only',
    file: 'src/pages/SiteView.tsx',
    mustNotContain: ['supabase.from('],
  }),
  checkSourceStep({
    id: 'rsvp-page-stays-off-direct-browser-writes',
    label: 'RSVP page stays off direct browser writes',
    file: 'src/pages/RSVP.tsx',
    mustNotContain: ['supabase.from('],
  }),
  checkSourceStep({
    id: 'guest-contact-page-stays-off-direct-browser-writes',
    label: 'Guest contact page stays off direct browser writes',
    file: 'src/pages/GuestContactUpdate.tsx',
    mustNotContain: ['supabase.from('],
  }),
  checkSourceStep({
    id: 'photo-upload-page-stays-off-direct-browser-writes',
    label: 'Photo upload page stays off direct browser writes',
    file: 'src/pages/PhotoUpload.tsx',
    mustNotContain: ['supabase.from('],
  }),
  checkSourceStep({
    id: 'event-rsvp-fallback-stays-narrow',
    label: 'Event RSVP fallback stays limited to event_rsvps',
    file: 'src/pages/EventRSVP.tsx',
    mustContain: [
      ".from('event_rsvps')\n            .update({",
      ".from('event_rsvps')\n            .insert([",
    ],
  }),
  checkSourceStep({
    id: 'vault-contribute-write-stays-narrow',
    label: 'Vault contribution write stays limited to vault_entries',
    file: 'src/pages/VaultContribute.tsx',
    mustContain: ["supabase.from('vault_entries').insert(rows);"],
  }),
];

const failedRequired = results.filter((result) => result.required !== false && !result.ok);

printProofAndExit({
  ok: failedRequired.length === 0,
  slice: 'client-write-inventory',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: failedRequired.length === 0
    ? 'The audited public launch surfaces stay off unexpected browser writes; the only remaining direct-write fallbacks in this scope are the intentionally narrow Event RSVP and vault contribution tables.'
    : 'One or more audited public launch surfaces regained an unexpected browser write path.',
  stillManualProofNeeded: [
    'Broader owner/dashboard write-surface cleanup remains separate from this public launch-scope inventory.',
  ],
  results,
});
