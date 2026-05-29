#!/usr/bin/env node

import { checkSourceStep, printProofAndExit, runCommandStep } from './v1-proof-utils.mjs';

const commands = [
  {
    id: 'boundary-safety-tests',
    label: 'Public boundary and OpenAI client safety tests',
    command: 'npm test -- --run src/lib/publicSiteBoundary.test.ts src/lib/openaiClientSafety.test.ts',
  },
];

const sourceChecks = [
  {
    id: 'public-launch-pages-avoid-dangerous-html',
    label: 'Public launch pages avoid dangerouslySetInnerHTML',
    file: 'src/pages/SiteView.tsx',
    mustNotContain: ['dangerouslySetInnerHTML'],
  },
  {
    id: 'rsvp-pages-avoid-dangerous-html',
    label: 'RSVP pages avoid dangerouslySetInnerHTML',
    file: 'src/pages/RSVP.tsx',
    mustNotContain: ['dangerouslySetInnerHTML'],
  },
  {
    id: 'guest-contact-pages-avoid-dangerous-html',
    label: 'Guest contact pages avoid dangerouslySetInnerHTML',
    file: 'src/pages/GuestContactUpdate.tsx',
    mustNotContain: ['dangerouslySetInnerHTML'],
  },
  {
    id: 'openai-client-stays-off-browser-provider-keys',
    label: 'OpenAI client path stays off browser provider keys',
    file: 'src/lib/openai.ts',
    mustContain: [
      "getEnvValue('OPENAI_API_KEY')",
      "getEnvValue('OPENAI_MODEL')",
    ],
    mustNotContain: [
      'VITE_OPENAI_API_KEY',
      'VITE_OPENAI_MODEL',
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
  slice: 'ast-security',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: failedRequired.length === 0
    ? 'The current public launch surface keeps the important local AST/source invariants: no dangerous HTML on key guest routes, no browser-exposed OpenAI key path, and boundary tests still guard internal-field stripping.'
    : 'One or more local AST/source invariants failed.',
  stillManualProofNeeded: [
    'Broader repository-wide security review remains separate from this launch-scope proof lane.',
  ],
  results,
});
