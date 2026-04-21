#!/usr/bin/env node

const proofBoard = {
  generatedAt: new Date().toISOString(),
  purpose: 'Executable map of the current DayOf v1 proof gate.',
  realV1Line: [
    'A couple can get from setup to a polished live wedding site without obvious trust breaks.',
    'Guests can find the site, access it correctly, and RSVP without weird state drift.',
    'The couple can run the core wedding ops layer from one product: guests, RSVP, messages, seating, registry, itinerary, settings.',
    'A planner or coordinator can be invited into a role-aware version of the product without fake permissions.',
    'The public story matches the real runtime closely enough that launch does not feel dishonest.',
  ],
  summary: {
    mustShip: [
      'public-site-trust',
      'guests-rsvp',
      'planner-access',
      'coordinator-dayof',
      'comms-center',
      'seating',
      'registry',
      'onboarding',
    ],
    shouldShipIfStable: ['memories-photo-return', 'name-change'],
    cutFromPromiseUnlessProven: [
      'external-custom-domains',
      'advanced-analytics-claims',
      'fully-automated-migration-reminders-merchant-sync',
      'enterprise-governance-claims',
    ],
  },
  ruthlessNextThree: [
    {
      id: 'canonical-v1-smoke',
      rank: 1,
      title: 'Capture the canonical v1 smoke run',
      whyNow: 'This is the top cross-product truth gate. Until one real couple path is captured, readiness is still argued instead of proven.',
      focusSlices: ['public-site-trust', 'onboarding'],
      commands: [
        'npm run proof:v1:canonical-smoke',
      ],
      manualProof: [
        'Home -> signup/demo/auth -> onboarding/builder -> public site -> RSVP route notes',
        'Capture exact pass/fail points in docs/v1-smoke-proof-log.md',
      ],
      exitBar: 'One clean logged canonical path or one exact blocker, with no hand-waving.',
      status: 'READY',
    },
    {
      id: 'guest-rsvp-continuity-proof',
      rank: 2,
      title: 'Prove guest -> RSVP -> downstream ops continuity',
      whyNow: 'Guest truth feeds seating, messaging, and event counts. If this seam is weak, the wedding ops story is weak.',
      focusSlices: ['guests-rsvp', 'seating', 'comms-center'],
      commands: [
        'npm run proof:v1:guests-rsvp-ops',
      ],
      manualProof: [
        'Create/edit/review guest + household state',
        'Submit/update RSVP and verify dashboard/event readback',
      ],
      exitBar: 'One guest can move through dashboard and public RSVP without trust drift.',
      status: 'BLOCKED_ON_ENV',
      blocker: 'RSVP strict smoke is currently environment-blocked by validate-rsvp-token anon auth (401) in this environment.',
    },
    {
      id: 'collaborator-forbidden-action-proof',
      rank: 3,
      title: 'Capture role-aware collaborator runtime proof with forbidden actions',
      whyNow: 'Planner/coordinator support is a core differentiator and the easiest slice to overclaim if runtime boundaries are not captured.',
      focusSlices: ['planner-access', 'coordinator-dayof'],
      commands: [
        'npm run proof:v1:collaborator-access',
        'npm run proof:v1:collaborator-runtime',
      ],
      manualProof: [
        'Owner invite -> accept -> planner/coordinator dashboard framing',
        'Attempt at least one forbidden action per non-owner role tested',
      ],
      exitBar: 'One planner and one coordinator runtime path logged with at least one blocked forbidden action each.',
      status: 'READY_IF_CREDENTIALS_EXIST',
      blocker: 'Runtime proof still depends on disposable owner/collaborator proof credentials.',
    },
  ],
  slices: [
    {
      id: 'public-site-trust',
      title: 'Public site / launch path / trust surface',
      status: 'PROOF_NEEDED',
      tier: 1,
      exitBar: 'Home -> auth/demo -> onboarding/builder -> site -> RSVP feels coherent, and privacy/access/publish behavior matches the copy.',
      automatedProof: [
        'npm run proof:v1:canonical-smoke',
      ],
      manualProof: [
        'Home -> signup/demo/auth -> onboarding/builder -> public site route notes',
        'Verify privacy/access/publish wording against live behavior',
      ],
      evidenceTarget: 'docs/v1-smoke-proof-log.md',
    },
    {
      id: 'guests-rsvp',
      title: 'Guests / RSVP ops',
      status: 'BLOCKED_ON_ENV_PROOF',
      tier: 1,
      exitBar: 'Guest list, householding, public RSVP, assisted RSVP, and downstream dashboard truth stay aligned enough for real planning.',
      automatedProof: [
        'npm run proof:v1:guests-rsvp-ops',
      ],
      manualProof: [
        'Create/edit/review guest + household state',
        'Submit/update RSVP and verify dashboard/event readback',
      ],
      blocker: 'RSVP strict smoke is currently environment-blocked by validate-rsvp-token anon auth (401) in this environment.',
      evidenceTarget: 'docs/v1-smoke-proof-log.md',
    },
    {
      id: 'planner-access',
      title: 'Planner / collaborator access',
      status: 'MOSTLY_DONE_PROOF_NEEDED',
      tier: 1,
      exitBar: 'Invite flow feels safe, collaborator lands in a role-aware surface, and at least one forbidden action is actually blocked per non-owner role tested.',
      automatedProof: [
        'npm run proof:v1:collaborator-access',
        'npm run proof:v1:collaborator-runtime',
      ],
      manualProof: [
        'Owner invite -> accept -> planner/coordinator dashboard framing',
        'Attempt at least one forbidden action per non-owner role',
      ],
      evidenceTarget: 'docs/v1-smoke-proof-log.md',
    },
    {
      id: 'coordinator-dayof',
      title: 'Coordinator / day-of',
      status: 'MOSTLY_DONE_PROOF_NEEDED',
      tier: 1,
      exitBar: 'Queue/check-in/timeline/Q&A feel calmer under realistic use and do not collapse into role or state confusion.',
      automatedProof: [
        'npm run proof:v1:coordinator-dayof',
      ],
      manualProof: [
        'Coordinator mode queue/check-in/timeline/Q&A smoke',
        'Verify a coordinator can answer who is here / what is next / what needs action',
      ],
      evidenceTarget: 'docs/v1-smoke-proof-log.md',
    },
    {
      id: 'comms-center',
      title: 'Comms center',
      status: 'MUST_PROVE',
      tier: 2,
      exitBar: 'Draft -> schedule/send -> history state reads trustworthy enough that core wedding messaging can stay inside DayOf.',
      automatedProof: [
        'npm run proof:v1:comms-center',
      ],
      manualProof: [
        'Create or inspect a draft',
        'Schedule or send a message',
        'Verify history state shows believable draft/scheduled/sent/partial/failed state',
      ],
      evidenceTarget: 'docs/v1-smoke-proof-log.md',
    },
    {
      id: 'seating',
      title: 'Seating',
      status: 'PROOF_NEEDED',
      tier: 2,
      exitBar: 'RSVP-backed seating assignment, lookup, and counts stay coherent without embarrassing event-level drift.',
      automatedProof: [
        'npm run proof:v1:seating-continuity',
      ],
      manualProof: [
        'Assign guests using RSVP-backed data',
        'Use seating lookup/export and verify counts/eligibility match event truth',
      ],
      evidenceTarget: 'docs/v1-smoke-proof-log.md',
    },
    {
      id: 'registry',
      title: 'Registry',
      status: 'MUST_PROVE',
      tier: 2,
      exitBar: 'Add/import/edit/repair plus purchased-state handling survives one realistic smoke without trust drift.',
      automatedProof: [
        'npm run proof:v1:registry',
      ],
      manualProof: [
        'Add/import/edit a registry item',
        'Run a repair/cleanup path if needed',
        'Verify internal/public purchased-state behavior',
      ],
      evidenceTarget: 'docs/v1-smoke-proof-log.md',
    },
    {
      id: 'onboarding',
      title: 'Onboarding truth / first-run continuity',
      status: 'MUST_PROVE',
      tier: 1,
      exitBar: 'Entry -> onboarding -> usable draft site/dashboard state is fast, honest, and does not oversell launch-readiness.',
      automatedProof: [
        'npm run build',
      ],
      manualProof: [
        'Entry -> onboarding -> dashboard/site first-run smoke',
        'Verify starter-draft wording matches actual first-run output',
      ],
      evidenceTarget: 'docs/v1-smoke-proof-log.md',
    },
  ],
};

const asMarkdown = process.argv.includes('--markdown');

if (asMarkdown) {
  console.log('# V1 Proof Board\n');
  console.log(`_Generated:_ ${proofBoard.generatedAt}\n`);
  console.log('## Real v1 line');
  for (const line of proofBoard.realV1Line) console.log(`- ${line}`);
  console.log('');
  console.log('## Ruthless next 3');
  for (const item of proofBoard.ruthlessNextThree) {
    console.log(`### ${item.rank}) ${item.title}`);
    console.log(`- status: ${item.status}`);
    console.log(`- why now: ${item.whyNow}`);
    console.log(`- focus slices: ${item.focusSlices.join(', ')}`);
    console.log(`- commands:`);
    for (const cmd of item.commands) console.log(`  - \`${cmd}\``);
    console.log(`- manual proof:`);
    for (const step of item.manualProof) console.log(`  - ${step}`);
    console.log(`- exit bar: ${item.exitBar}`);
    if (item.blocker) console.log(`- blocker: ${item.blocker}`);
    console.log('');
  }
  for (const slice of proofBoard.slices) {
    console.log(`## ${slice.title}`);
    console.log(`- status: ${slice.status}`);
    console.log(`- tier: ${slice.tier}`);
    console.log(`- exit bar: ${slice.exitBar}`);
    console.log(`- automated proof:`);
    for (const cmd of slice.automatedProof) console.log(`  - \`${cmd}\``);
    console.log(`- manual proof:`);
    for (const step of slice.manualProof) console.log(`  - ${step}`);
    if (slice.blocker) console.log(`- blocker: ${slice.blocker}`);
    console.log(`- evidence target: ${slice.evidenceTarget}\n`);
  }
} else {
  console.log(JSON.stringify(proofBoard, null, 2));
}
