#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const formatPacificTimestamp = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const month = byType.month;
  const day = byType.day;
  const year = byType.year;
  const hour = byType.hour;
  const minute = byType.minute;
  const dayPeriod = byType.dayPeriod;
  const zone = (byType.timeZoneName || 'PT').replace(/^PST$|^PDT$/, 'PT');
  return `${year}-${month}-${day} ${hour}:${minute} ${dayPeriod} ${zone}`;
};

const readTextIfPresent = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
};

const findLatestRuntimeWordingEvidence = () => {
  const root = path.join('docs', 'proof-screenshots');
  const candidates = [];

  try {
    for (const dateDir of fs.readdirSync(root, { withFileTypes: true })) {
      if (!dateDir.isDirectory()) continue;
      const datePath = path.join(root, dateDir.name);
      for (const proofDir of fs.readdirSync(datePath, { withFileTypes: true })) {
        if (!proofDir.isDirectory() || !proofDir.name.startsWith('runtime-wording-truth-')) continue;
        const suffix = Number(proofDir.name.replace('runtime-wording-truth-', ''));
        const notesPath = path.join(datePath, proofDir.name, 'notes.md');
        if (Number.isFinite(suffix) && fs.existsSync(notesPath)) {
          candidates.push({ suffix, notesPath });
        }
      }
    }
  } catch {
    return null;
  }

  candidates.sort((a, b) => b.suffix - a.suffix);
  return candidates[0]?.notesPath ?? null;
};

const proofLogText = readTextIfPresent(path.join('docs', 'v1-smoke-proof-log.md'));
const latestVerifiedDeploy = proofLogText.match(/_Latest verified deploy:_ `([^`]+)`/)?.[1] ?? 'latest verified production deploy';
const latestRuntimeWordingEvidence = findLatestRuntimeWordingEvidence() ?? 'docs/v1-smoke-proof-log.md';
const aiPhotoMigrationCleared = proofLogText.includes('migration_applied_and_readback_green')
  && proofLogText.includes('launchCleared: true')
  && proofLogText.includes('V1_AI_EXPOSURE_LIVE=1 npm run proof:v1:ai-exposure`: PASS');
const secureModelProofCleared = proofLogText.includes('V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model`: PASS')
  && proofLogText.includes('17/17 secure model-backed AI checks passed');
const liveBugFixesPendingDeploy = proofLogText.includes('LIVE_SITEWIDE_BUG_FIXES_PENDING_DEPLOY');
const strictProductionHardeningP0Open = proofLogText.includes('Local P0 Production-Hardening Access-Control Batch')
  && (
    proofLogText.includes('Remaining strict P0 work includes deploy/function-deploy/live proof')
    || proofLogText.includes('Remaining strict P0 blockers are now live deploy/function proof')
    || proofLogText.includes('Active strict P0 items are live deploy/function proof')
  );

const proofBoard = {
  generatedAt: formatPacificTimestamp(),
  purpose: 'Executable map of the current DayOf v1 proof gate.',
  activeUngatedLaunchBlockers: [
    ...(!aiPhotoMigrationCleared ? ['ai-photo-column-privilege-migration-readback'] : []),
    ...(strictProductionHardeningP0Open ? [
      'strict-p0-secure-service-role-queue-storage-proof',
    ] : []),
  ],
  blockedOrApprovalGatedLaunchItems: [
    ...(liveBugFixesPendingDeploy ? ['approved deploy/postdeploy proof for local live bug-sweep fixes'] : []),
    ...(!secureModelProofCleared ? ['secure-env model-backed AI success/failure/fallback proof without exposing secrets'] : []),
    'external OpenAI key rotation before broad public traffic',
  ],
  realV1Line: [
    'A couple can get from setup to a polished live wedding site without obvious trust breaks.',
    'Guests can find the site, access it correctly, and RSVP without weird state drift.',
    'The couple can run the core wedding planning layer from one product: guests, RSVP, messages, seating, registry, itinerary, settings.',
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
      'ai-product-audit',
      'sitewide-bug-testing',
    ],
    shouldShipIfStable: ['memories-photo-return', 'name-change'],
    cutFromPromiseUnlessProven: [
      'external-custom-domains',
      'advanced-analytics-claims',
      'fully-automated-migration-reminders-merchant-sync',
      'enterprise-governance-claims',
    ],
    secondaryTrustGap: aiPhotoMigrationCleared
      ? `Production deploy, runtime wording proof, broad authenticated write/read proof, quick-start owner setup proof, live sitewide browser/write-read proof, media/observability proof, AI/photo column-exposure hardening, photo-upload function readiness, live photo upload/analysis proof, service-role integrity proof, and secure model-backed AI proof are current for ${latestVerifiedDeploy}; live-bundle rollout and live AI/photo exposure readback are green after the Supabase column-privilege migration.`
      : `Production deploy, runtime wording proof, broad authenticated write/read proof, quick-start owner setup proof, live sitewide browser/write-read proof, and local AI/photo column-exposure hardening are current for ${latestVerifiedDeploy}; live-bundle rollout proof is now green on the current production Photos dashboard bundle. Live AI/photo exposure readback is still failing until the Supabase column-privilege migration is explicitly applied and secure-env proof remains open.`,
    secondaryTrustGapKey: 'secure_env_and_full_site_regression_remaining',
    starterDraftWordingVerificationMissing: false,
    localWordingGuard: 'src/lib/launchWordingGuard.test.ts',
  },
  ruthlessNextThree: [
    {
      id: 'sitewide-bug-testing',
      rank: 1,
      title: 'Keep sitewide bug testing green across every reachable flow',
      whyNow: 'The latest live browser/write-read/media pass is green, but the surface is changing quickly. The biggest remaining site risk is regression in a secondary route, modal, empty state, mobile layout, or write/read edge path after future source changes.',
      focusSlices: ['public-site-trust', 'guests-rsvp', 'planner-access', 'coordinator-dayof', 'comms-center', 'seating', 'registry', 'onboarding', 'memories-photo-return', 'name-change'],
      commands: [
        'npm run typecheck -- --pretty false',
        'npm run lint -- --quiet',
        'npm run build',
        'npm run proof:v1:canonical-smoke',
      ],
      manualProof: [
        'Keep the current production public route, mobile, broad authenticated write/read, photo upload, and internal-error-log proofs green',
        'Continue desktop/mobile click-through on public, guest, owner, builder, planner, registry, seating, settings, vendor, vault, memories, and day-of routes as code changes',
        'Log every bug with route, viewport, repro steps, severity, and whether it blocks launch',
        'Do not deploy again until explicitly approved',
      ],
      exitBar: 'Every currently automated reachable non-deferred route group has a fresh bug pass, no critical or high bugs remain open, and medium bugs are either fixed or explicitly accepted.',
      status: 'LATEST_LIVE_SITEWIDE_PASS_GREEN_KEEP_REGRESSION_TESTING',
    },
    {
      id: 'ai-product-audit',
      rank: 2,
      title: aiPhotoMigrationCleared
        ? secureModelProofCleared ? 'Keep AI product proof green' : 'Keep AI product proof green; secure-env model proof is gated'
        : 'Complete the AI product audit and hardening proof',
      whyNow: aiPhotoMigrationCleared
        ? secureModelProofCleared
          ? 'AI now touches first-run setup, generated site copy, photo organization, photo vision, planner suggestions, and vendor/profile flows. The browser-visible provider-key path, audited raw-error paths, local AI/photo column exposure, production live-bundle rollout, live sensitive-column readback, photo upload analysis proof, service-role proof, and secure live model-backed proof are green.'
          : 'AI now touches first-run setup, generated site copy, photo organization, photo vision, planner suggestions, and vendor/profile flows. The browser-visible provider-key path, audited raw-error paths, local AI/photo column exposure, production live-bundle rollout, live sensitive-column readback, and photo upload analysis proof are green. The remaining proof needs secure provider/server secrets or an explicit deterministic-only launch decision, so it is not a runnable no-secret backlog lane.'
        : 'AI now touches first-run setup, generated site copy, photo organization, photo vision, planner suggestions, and vendor/profile flows. The browser-visible provider-key path, audited raw-error paths, local AI/photo column exposure, local safe-frontend rollout proof, and production live-bundle rollout proof are green. Live readback still fails until the Supabase column-privilege migration is explicitly applied/readback-proven.',
      focusSlices: ['ai-product-audit', 'onboarding', 'memories-photo-return', 'qa-observability'],
      commands: [
        'npm run typecheck -- --pretty false',
        'npm run lint -- --quiet',
        'npm run build',
        'npm run proof:v1:ai-product-readiness',
        'npm run proof:v1:ai-secure-model',
        'npm run proof:v1:ai-clearance',
        'npm run proof:v1:ai-migration-ready',
        'npm run proof:v1:ai-rollout',
        'npm run proof:v1:ai-exposure',
        'npm test -- --run src/lib/aiProviderKeySecurity.test.ts src/lib/launchWordingGuard.test.ts src/lib/photoAnalysisCustomerCopy.test.ts',
      ],
      manualProof: [
        'Keep the provider-key regression guard green so no production frontend can access or bundle a provider API key',
        'Use `npm run proof:v1:ai-clearance` for local readiness and `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance` for true launch-clearance status',
        aiPhotoMigrationCleared
          ? 'Use `V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance` after future deploys to confirm live readback remains green'
          : 'Use `PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-migration-ready` before applying the DB migration; it should report `safeToApplyMigration: true` and `state: frontend_ready_migration_pending`',
        'Keep `npm run proof:v1:ai-rollout` green so the production frontend no longer requests columns the migration revokes',
        'Run `V1_AI_ROLLOUT_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-rollout` after any future approved deploy if the full postdeploy proof was not just run',
        secureModelProofCleared
          ? 'Keep `V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model` green after any future AI Edge Function, model, or secret change'
          : 'Run secure-env model-backed proof for quick-start/onboarding, photo vision, and site translation without printing secret values',
        'Keep generated copy, legacy onboarding extraction, photo organizer, and planner suggestions in deterministic launch scope unless server routes are added',
        'Exercise provider failure, invalid output, and fallback paths on desktop and mobile',
        aiPhotoMigrationCleared
          ? 'Keep the applied AI/photo sensitive-column migration readback-green after future schema or frontend changes'
          : 'Apply and readback-prove the AI/photo sensitive-column migration in a secure Supabase environment only after the safe frontend is deployed or deployment order is explicitly coordinated',
        'Confirm customer UI, browser console, and regular client-readable rows do not expose provider, model, key, token, spend, service-role, raw provider error details, raw EXIF, or exact GPS',
        'Do not deploy again until explicitly approved',
      ],
      exitBar: 'AI is server-side for model-backed calls or explicitly deterministic-only for launch, live secure-env proof passes, and no customer-visible or regular-client-readable surface leaks provider/key/spend/token/raw-error details.',
      status: aiPhotoMigrationCleared
        ? secureModelProofCleared ? 'AI_PRODUCT_AUDIT_LIVE_GREEN_SECURE_MODEL_PROOF_GREEN' : 'AI_PRODUCT_AUDIT_LIVE_GREEN_SECURE_ENV_PROOF_GATED'
        : 'AI_PRODUCT_AUDIT_PRODUCTION_BUNDLE_GREEN_DB_MIGRATION_BLOCKED',
      blocker: aiPhotoMigrationCleared && !secureModelProofCleared
        ? 'Secure-env model-backed proof requires server-side provider access without exposing secret values. Treat as blocked/gated until that environment or deterministic-only launch scope is explicitly provided.'
        : undefined,
      auditEvidence: 'docs/ai-product-audit-2026-05-03.md',
    },
    secureModelProofCleared ? {
      id: 'external-openai-key-rotation',
      rank: 3,
      title: 'External OpenAI key rotation remains external',
      whyNow: 'Secure model-backed AI proof is green, but broad public traffic should still use a freshly rotated provider key because a previous key was shared outside the secret manager.',
      focusSlices: ['qa-observability', 'ai-onboarding', 'memories-photo-return'],
      commands: [
        'npm run proof:v1:ai-product-readiness',
        'V1_AI_SECURE_MODEL_LIVE=1 npm run proof:v1:ai-secure-model',
        'npm run proof:v1:ai-clearance',
      ],
      manualProof: [
        'Rotate the external OpenAI key in the provider dashboard before broad public traffic',
        'Update only secure server-side secret stores; do not paste the key into docs, chat, screenshots, or repo files',
        'Rerun secure model-backed proof after rotation',
      ],
      exitBar: 'Provider key is rotated externally, secure server-side secret stores are updated, and secure model-backed AI proof remains green without exposing secret values.',
      status: 'EXTERNAL_OPENAI_KEY_ROTATION_PENDING',
      blocker: 'External provider key rotation is outside the repo and should be handled in the provider/secret-manager surfaces.',
      note: 'Service-role, full data-integrity, secure model-backed AI provider proof, production live-bundle rollout, live AI/photo exposure readback, and photo upload analysis proof are green.',
    } : {
      id: 'secure-ai-provider-proof',
      rank: 3,
      title: 'Secure AI provider proof is gated',
      whyNow: 'Service-role storage/cross-table integrity is now green, but server-side AI success/failure/invalid-output proof still needs secure provider access that should not be committed or exposed.',
      focusSlices: ['qa-observability', 'ai-onboarding', 'memories-photo-return'],
      commands: [
        'npm run proof:v1:ai-product-readiness',
        'npm run proof:v1:ai-clearance',
        'npm run proof:v1:ai-exposure',
      ],
      manualProof: [
        'Confirm server-side OPENAI_API_KEY is configured where onboarding/photo AI proof is expected',
        'Exercise model success, provider failure, invalid output, and fallback states without printing secret values',
        'Keep AI spend/provider details internal only',
      ],
      exitBar: 'AI proof confirms server-side configuration, model success, provider failure, invalid output, and fallback handling without customer-visible secrets or raw provider details.',
      status: 'SECURE_AI_PROVIDER_PROOF_GATED',
      blocker: 'Requires secure provider proof access. Do not run or document secret values in the local repo or chat.',
      note: aiPhotoMigrationCleared
        ? secureModelProofCleared
          ? 'Service-role prereqs, full data-integrity proof, secure model-backed AI provider proof, production live-bundle rollout, live AI/photo exposure readback, and photo upload analysis proof are green after the column-privilege migration.'
          : 'Service-role prereqs and full data-integrity proof are green; production live-bundle rollout, live AI/photo exposure readback, and photo upload analysis proof are green after the column-privilege migration. Secure model-backed AI provider proof remains environment-gated.'
        : 'Service-role prereqs and full data-integrity proof are green; production live-bundle rollout proof is green on the current Photos dashboard chunk, live AI/photo exposure readback is failing until the column-privilege migration is explicitly applied and proven. Secure model-backed AI provider proof remains environment-gated.',
    },
  ],
  slices: [
    {
      id: 'sitewide-bug-testing',
      title: 'Sitewide bug testing',
      status: 'LATEST_LIVE_BROWSER_AND_WRITE_READ_PASS_GREEN_KEEP_RUNNING',
      tier: 1,
      exitBar: 'Every currently automated reachable non-deferred route group and major interaction has been clicked through on desktop and mobile, with no unresolved critical/high bugs.',
      automatedProof: [
        'npm run proof:v1:canonical-smoke',
        'npm run proof:v1:guests-rsvp-ops',
        'npm run proof:v1:collaborator-access',
        'npm run proof:v1:coordinator-dayof',
        'npm run proof:v1:seating-continuity',
        'npm run proof:v1:registry',
      ],
      manualProof: [
        'Latest live pass covered public route smoke, mobile core smoke, launch/public/guest wording, vendor template smoke, 19/19 authenticated write/read specs, photo upload analysis, and internal-error-log proof',
        'Continue desktop/mobile passes over all public, auth, onboarding, builder, dashboard, guest, vendor, vault, memories, registry, seating, settings, planner, and day-of routes as code changes',
        'Click major CTAs, menus, modals, drawers, form submit paths, disabled states, empty states, retry states, upload paths, publish/share paths, and authenticated write/read paths where safe credentials are available',
        'Record route, viewport, repro steps, expected behavior, actual behavior, severity, owner, and fix/accept decision for every bug',
      ],
      evidenceTarget: 'docs/v1-smoke-proof-log.md',
    },
    {
      id: 'ai-product-audit',
      title: 'AI product audit and hardening proof',
      status: aiPhotoMigrationCleared
        ? secureModelProofCleared ? 'LIVE_COLUMN_PRIVILEGES_AND_SECURE_MODEL_PROOF_GREEN' : 'LIVE_COLUMN_PRIVILEGES_GREEN_SECURE_ENV_PRODUCT_AUDIT_GATED'
        : 'PRODUCTION_BUNDLE_GREEN_DB_COLUMN_EXPOSURE_BLOCKED',
      tier: 1,
      exitBar: 'All AI-assisted surfaces have secure server-side model calls or deterministic-only behavior, live success/failure/fallback proof, safe customer output, and no provider/key/spend/token/raw-error leakage.',
      automatedProof: [
        'npm test -- --run src/lib/aiProviderKeySecurity.test.ts src/lib/launchWordingGuard.test.ts src/lib/photoAnalysisCustomerCopy.test.ts',
        'npm run proof:v1:ai-product-readiness',
        'npm run proof:v1:ai-secure-model',
        'npm run proof:v1:ai-clearance',
        'npm run proof:v1:ai-migration-ready',
        'npm run proof:v1:ai-rollout',
        'npm run proof:v1:ai-exposure',
        'npm run typecheck -- --pretty false',
        'npm run lint -- --quiet',
        'npm run build',
      ],
      manualProof: [
        'Audit quick-start/onboarding AI, generated site copy, clarifying questions, photo organizer, photo vision, planner suggestions, and vendor/profile generation',
        'Keep browser-visible provider keys blocked and move any required model-backed production lane behind server-side routes',
        'Run secure-env live model proof for current server model-capable routes: quick-start/onboarding, photo vision, and site translation, without exposing secret values',
        'Treat generated copy, legacy onboarding extraction, photo organizer, and planner suggestions as deterministic launch lanes unless server routes are added',
        aiPhotoMigrationCleared
          ? '`20260503100000_harden_ai_photo_column_privileges.sql` is applied and live readback is green; keep rerunning live clearance after future AI/photo schema or deploy changes'
          : 'Deploy or explicitly order-coordinate the safe frontend, then apply and readback-prove `20260503100000_harden_ai_photo_column_privileges.sql` before launch-clear; live readback is currently failing',
        'Live-bundle rollout proof is green on the current production Photos dashboard chunk; keep rerunning it after future deploys',
        'Run desktop/mobile bug proof for AI success, slow, failure, invalid-output, and deterministic fallback states',
        'Confirm customer UI, browser console, public pages, and regular client-readable rows hide provider/model/key/token/spend/service-role/raw-error/raw EXIF/exact GPS details',
      ],
      evidenceTarget: 'docs/ai-product-audit-2026-05-03.md',
    },
    {
      id: 'public-site-trust',
      title: 'Public site / launch path / trust surface',
      status: 'PRODUCTION_AUTOMATED_AND_OWNER_SETUP_PASS',
      tier: 1,
      exitBar: 'Home -> auth/demo -> onboarding/builder -> site -> RSVP feels coherent, and privacy/access/publish behavior matches the copy.',
      automatedProof: [
        'npm run proof:v1:canonical-smoke',
      ],
      manualProof: [
        `Production runtime wording truth captured at ${latestRuntimeWordingEvidence}`,
        'Production public route smoke passed 35/35 on https://dayof.love',
        'Production authenticated write/read proof passed 19/19 on https://dayof.love',
        'Production quick-start owner setup proof passed against https://dayof.love using approved test account',
      ],
      runtimeWordingVerificationMissing: false,
      starterDraftWordingVerificationMissing: false,
      localRouteEvidence: 'docs/proof-screenshots/2026-05-01/canonical-couple-path-1777676061693/route-notes.md',
      localWordingEvidence: latestRuntimeWordingEvidence,
      localWordingGuard: 'src/lib/launchWordingGuard.test.ts',
      secondaryTrustGapKey: 'secure_env_and_sitewide_bug_testing_remaining',
      evidenceTarget: 'docs/v1-smoke-proof-log.md',
    },
    {
      id: 'guests-rsvp',
      title: 'Guests / RSVP follow-up',
      status: 'AUTOMATED_AND_RUNTIME_WRITE_READ_PASS',
      tier: 1,
      exitBar: 'Guest list, householding, public RSVP, assisted RSVP, and downstream dashboard truth stay aligned enough for real planning.',
      automatedProof: [
        'npm run proof:v1:guests-rsvp-ops',
        'tests/e2e/guest-import-write.spec.ts',
        'tests/e2e/rsvp-write-read.spec.ts',
        'tests/e2e/event-rsvp-write-read.spec.ts',
        'tests/e2e/site-rsvp-widget-write-read.spec.ts',
        'tests/e2e/guest-hub-write-read.spec.ts',
        'tests/e2e/guest-contact-update-write-read.spec.ts',
      ],
      manualProof: [
        'Keep the broad 19/19 production write/read suite green as guest features evolve',
        'Rerun production write/read proof on the current deploy after source changes when authenticated cleanup approval is available',
      ],
      note: 'Automated proof is green in the linked Supabase environment; manual route notes remain launch evidence.',
      evidenceTarget: 'docs/v1-smoke-proof-log.md',
    },
    {
      id: 'planner-access',
      title: 'Planner / collaborator access',
      status: 'AUTOMATED_AND_RUNTIME_PERMISSION_PASS',
      tier: 1,
      exitBar: 'Invite flow feels safe, collaborator lands in a role-aware surface, and at least one forbidden action is actually blocked per non-owner role tested.',
      automatedProof: [
        'npm run proof:v1:collaborator-access',
        'tests/e2e/settings-team-invite.spec.ts',
        'tests/e2e/settings-team-invite-claim.spec.ts',
        'tests/e2e/collaborator-permission-rls.spec.ts',
      ],
      manualProof: [
        'Keep invite create/revoke, invite claim, and permission-key RLS proof green as role surfaces expand',
        'Add new forbidden-action proof when new collaborator capabilities are added',
      ],
      evidenceTarget: 'docs/v1-smoke-proof-log.md',
    },
    {
      id: 'coordinator-dayof',
      title: 'Coordinator / day-of',
      status: 'AUTOMATED_AND_RUNTIME_SMOKE_PASS',
      tier: 1,
      exitBar: 'Queue/check-in/timeline/Q&A feel calmer under realistic use and do not collapse into role or state confusion.',
      automatedProof: [
        'npm run proof:v1:coordinator-dayof',
        'tests/e2e/mobile-core-smoke.spec.ts',
      ],
      manualProof: [
        'Keep coordinator/day-of proof green as Q&A/check-in/timeline surfaces expand',
        'Run production smoke on the current deploy when coordinator surfaces change',
      ],
      evidenceTarget: 'docs/v1-smoke-proof-log.md',
    },
    {
      id: 'comms-center',
      title: 'Comms center',
      status: 'AUTOMATED_DRAFT_AND_HISTORY_PASS',
      tier: 2,
      exitBar: 'Draft -> schedule/send -> history state reads trustworthy enough that core wedding messaging can stay inside DayOf.',
      automatedProof: [
        'npm run proof:v1:comms-center',
        'tests/e2e/settings-notifications-config.spec.ts',
      ],
      manualProof: [
        'Keep message composer, scheduling, review, templates, and history proof green as messaging surfaces evolve',
        'Run message composer/history proof on the current deploy when authenticated cleanup approval is available',
      ],
      evidenceTarget: 'docs/v1-smoke-proof-log.md',
    },
    {
      id: 'seating',
      title: 'Seating',
      status: 'AUTOMATED_AND_RUNTIME_WRITE_READ_PASS',
      tier: 2,
      exitBar: 'RSVP-backed seating assignment, lookup, and counts stay coherent without embarrassing event-level drift.',
      automatedProof: [
        'npm run proof:v1:seating-continuity',
        'tests/e2e/seating-write-read.spec.ts',
      ],
      manualProof: [
        'Keep seating write/read and continuity proof green as seating features evolve',
        'Run production seating proof on the current deploy when authenticated cleanup approval is available',
      ],
      evidenceTarget: 'docs/v1-smoke-proof-log.md',
    },
    {
      id: 'registry',
      title: 'Registry',
      status: 'AUTOMATED_AND_RUNTIME_WRITE_READ_PASS',
      tier: 2,
      exitBar: 'Add/import/edit/repair plus purchased-state handling survives one realistic smoke without trust drift.',
      automatedProof: [
        'npm run proof:v1:registry',
        'tests/e2e/registry-write-read.spec.ts',
      ],
      manualProof: [
        'Keep registry write/read, import/edit, and public purchase proof green as gift-detail import evolves',
        'Run production registry proof on the current deploy when authenticated cleanup approval is available',
      ],
      evidenceTarget: 'docs/v1-smoke-proof-log.md',
    },
    {
      id: 'onboarding',
      title: 'Onboarding truth / first-run continuity',
      status: 'AUTOMATED_AND_PRODUCTION_OWNER_SETUP_PASS',
      tier: 1,
      exitBar: 'Entry -> onboarding -> usable draft site/dashboard state is fast, honest, and does not oversell launch-readiness.',
      automatedProof: [
        'npm run build',
      ],
      manualProof: [
        'Production runtime wording proof is captured for public and gated entry routes',
        'Production quick-start owner setup proof passed with live Supabase readback and proof-site restore',
      ],
      runtimeWordingVerificationMissing: false,
      starterDraftWordingVerificationMissing: false,
      localWordingEvidence: latestRuntimeWordingEvidence,
      secondaryTrustGapKey: 'production_wording_rerun_missing',
      evidenceTarget: 'docs/v1-smoke-proof-log.md',
    },
  ],
};

const asMarkdown = process.argv.includes('--markdown');

if (asMarkdown) {
  console.log('# V1 Proof Board\n');
  console.log(`_Generated:_ ${proofBoard.generatedAt}\n`);
  console.log('## Active Ungated Launch Blockers');
  if (proofBoard.activeUngatedLaunchBlockers.length === 0) {
    console.log('- none; remaining launch-critical items are blocked, approval-gated, external, or rerun-after-change regression work');
  } else {
    for (const item of proofBoard.activeUngatedLaunchBlockers) console.log(`- ${item}`);
  }
  console.log('');
  console.log('## Blocked Or Approval-Gated Launch Items');
  for (const item of proofBoard.blockedOrApprovalGatedLaunchItems) console.log(`- ${item}`);
  console.log('');
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
