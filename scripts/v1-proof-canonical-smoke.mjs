#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const steps = [
  {
    id: 'build',
    label: 'Build integrity check',
    command: 'npm run build',
    required: true,
  },
  {
    id: 'public-live-smoke',
    label: 'Public v1 Playwright smoke',
    command: 'npm run test:e2e:live',
    required: true,
  },
  {
    id: 'site-lookup-smoke',
    label: 'Site lookup smoke',
    command: 'npm run smoke:site',
    required: true,
  },
];

function extractJsonBlob(text) {
  if (!text || typeof text !== 'string') return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = text.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function classifyParsedResult(parsed) {
  if (!parsed || typeof parsed !== 'object') return { blocked: false, blockerType: null };
  if (parsed.step === 'env_missing' || parsed.step === 'env_invalid_url' || parsed.step === 'target_missing') {
    return { blocked: true, blockerType: parsed.step };
  }
  return { blocked: false, blockerType: null };
}

function runStep(step) {
  const startedAt = new Date().toISOString();
  try {
    const stdout = execSync(step.command, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: '/bin/zsh',
      env: process.env,
      maxBuffer: 20 * 1024 * 1024,
    });

    const parsed = extractJsonBlob(stdout);
    const { blocked, blockerType } = classifyParsedResult(parsed);

    return {
      id: step.id,
      label: step.label,
      command: step.command,
      required: step.required,
      ok: true,
      blocked,
      blockerType,
      startedAt,
      finishedAt: new Date().toISOString(),
      parsed,
      stdout: parsed ? undefined : stdout.trim(),
    };
  } catch (error) {
    const stdout = typeof error?.stdout === 'string' ? error.stdout : Buffer.isBuffer(error?.stdout) ? error.stdout.toString('utf8') : '';
    const stderr = typeof error?.stderr === 'string' ? error.stderr : Buffer.isBuffer(error?.stderr) ? error.stderr.toString('utf8') : '';
    const parsed = extractJsonBlob(stdout);
    const { blocked, blockerType } = classifyParsedResult(parsed);

    return {
      id: step.id,
      label: step.label,
      command: step.command,
      required: step.required,
      ok: false,
      blocked,
      blockerType,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: typeof error?.status === 'number' ? error.status : 1,
      parsed,
      stdout: parsed ? undefined : stdout.trim() || undefined,
      stderr: stderr.trim() || undefined,
    };
  }
}

const PROOF_SCREENSHOTS_ROOT = process.env.V1_PROOF_SCREENSHOTS_ROOT
  || join(process.cwd(), 'docs', 'proof-screenshots', '2026-05-01');

function toRepoRelativePath(path) {
  return relative(process.cwd(), path).replaceAll('\\', '/');
}

function resolveLatestProofArtifact({ familyPattern, familyHint, filename }) {
  if (!existsSync(PROOF_SCREENSHOTS_ROOT)) {
    return {
      path: `${toRepoRelativePath(PROOF_SCREENSHOTS_ROOT)}/${familyHint}*/${filename}`,
      captured: false,
    };
  }

  const latestMatch = readdirSync(PROOF_SCREENSHOTS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const match = entry.name.match(familyPattern);
      if (!match) return null;
      return {
        runId: Number(match[1]),
        path: join(PROOF_SCREENSHOTS_ROOT, entry.name, filename),
      };
    })
    .filter(Boolean)
    .filter((entry) => Number.isFinite(entry.runId))
    .sort((a, b) => b.runId - a.runId)[0];

  if (!latestMatch) {
    return {
      path: `${toRepoRelativePath(PROOF_SCREENSHOTS_ROOT)}/${familyHint}*/${filename}`,
      captured: false,
    };
  }

  return {
    path: toRepoRelativePath(latestMatch.path),
    captured: existsSync(latestMatch.path),
  };
}

const shouldSkipSteps = process.env.V1_PROOF_CANONICAL_SMOKE_SKIP_STEPS === '1';
const results = shouldSkipSteps ? [] : steps.map(runStep);
const blockedRequired = results.filter((result) => result.required && result.blocked);
const failedRequired = results.filter((result) => result.required && !result.ok && !result.blocked);
const canonicalCouplePathEvidence = resolveLatestProofArtifact({
  familyPattern: /^canonical-couple-path-(\d+)$/,
  familyHint: 'canonical-couple-path-',
  filename: 'route-notes.md',
});
const runtimeWordingEvidence = resolveLatestProofArtifact({
  familyPattern: /^runtime-wording-truth-(\d+)$/,
  familyHint: 'runtime-wording-truth-',
  filename: 'notes.md',
});
const localRouteEvidencePath = canonicalCouplePathEvidence.path;
const localWordingEvidencePath = runtimeWordingEvidence.path;
const localRouteEvidenceCaptured = canonicalCouplePathEvidence.captured;
const localWordingEvidenceCaptured = runtimeWordingEvidence.captured;

const output = {
  ok: failedRequired.length === 0 && blockedRequired.length === 0,
  blocked: blockedRequired.length > 0,
  slice: 'canonical-v1-smoke',
  generatedAt: new Date().toISOString(),
  currentV1Line: [
    'couples can build a polished wedding site draft before sharing it with guests',
    'guests can use the public site and RSVP flows reliably',
    'couples can run the core ops layer: guests, RSVP, messages, seating, registry, itinerary, settings',
    'planner/collaborator support exists in a real usable form',
    'marketing, settings, and billing surfaces describe the product honestly',
    'partial features are framed honestly instead of padded into fake completeness',
  ],
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    blocked: blockedRequired.length,
  },
  contractSummary: failedRequired.length === 0 && blockedRequired.length === 0
    ? 'Canonical smoke is green as supporting route/build/site-lookup evidence; it still defers the launch call to the proof-board flow instead of regenerating or replacing launch-truth artifacts.'
    : 'Canonical smoke is not green enough to serve as supporting launch evidence; resolve failed or blocked route/build/site-lookup checks before leaning on the proof-board flow.',
  publicV1ClaimStatus: failedRequired.length === 0 && blockedRequired.length === 0
    ? 'canonical_route_smoke_green_defer_to_current_proof_board_for_launch_call'
    : 'canonical_route_smoke_not_green',
  launchCallRightNow: failedRequired.length === 0 && blockedRequired.length === 0
    ? 'defer_to_docs_v1_smoke_proof_log_and_proof_board'
    : 'hold_until_canonical_route_smoke_is_green',
  automationDoesNotClearLaunch: true,
  publicV1ClaimBlockers: [
    'Canonical smoke is route/build/site-lookup evidence only; launch call belongs to the current proof board flow and proof log (`npm run proof:v1:board:freshness`, `npm run proof:v1:board`, `npm run proof:v1:board:md`)',
    'Secure service-role storage/cross-table integrity proof remains available only in a secure proof environment',
  ],
  automatedCoverage: [
    'Build integrity for the current public/onboarding path',
    'Public v1 trust story smoke across Home, Product, and Trust via Playwright live smoke',
    'Canonical entry-route continuity across signup, payment gating, quick-start preview, RSVP entry, collaborator invite load, and login fallback for protected onboarding, setup, and dashboard surfaces',
    'Published site slug/site_url lookup truth through Supabase site lookup smoke',
  ],
  stillManualProofNeeded: [
    'Keep the canonical couple path and runtime wording proof fresh after future approved frontend deploys',
    'Log exact pass/fail or blocker details in docs/v1-smoke-proof-log.md when canonical smoke finds a new route, wording, or environment blocker',
  ],
  launchTruthGaps: [
    'Guests / RSVP ops is a separate proof gate and must be read from npm run proof:v1:guests-rsvp-ops for the current environment',
    'Canonical smoke covers route continuity; it does not replace post-deploy runtime truth notes',
  ],
  launchTruthGapSeverity: {
    guestsRsvpOps: 'separate_required_gate',
    postDeployRuntimeTruthPass: 'covered_by_current_proof_log_keep_fresh_after_deploy',
  },
  highestRiskTrustGap: 'Canonical smoke is not the launch source of truth; use the current proof board flow and proof log for launch status',
  secondaryTrustGap: 'Production wording and couple-path proof must stay fresh after future approved frontend deploys',
  trustLieClosedInThisGate: 'Canonical smoke output separates automation health from launch-clear status instead of implying launch approval from green checks alone',
  automationCaveat: 'Passing canonical smoke is evidence of route continuity and build health, not launch clearance on its own',
  truthGateSummary: failedRequired.length === 0 && blockedRequired.length === 0
    ? 'Canonical automation is green. It proves route/build/site-lookup continuity and defers the launch call to the current proof board flow and proof log.'
    : 'Canonical automation is not green. Resolve failed or blocked route/build/site-lookup checks before using it as supporting launch evidence.',
  groundedManualProofStatus: 'Manual-proof artifacts are captured when their evidence files exist; rerun them after future approved deploys or when route/copy behavior changes.',
  launchDecisionDependsOnManualTruthPass: false,
  manualTruthPassMissing: !localRouteEvidenceCaptured,
  runtimeWordingVerificationMissing: !localWordingEvidenceCaptured,
  starterDraftWordingVerificationMissing: !localWordingEvidenceCaptured,
  manualProofRequirements: {
    canonicalCouplePath: {
      required: true,
      status: localRouteEvidenceCaptured ? 'local_captured_production_rerun_pending' : 'missing',
      blocking: !localRouteEvidenceCaptured,
      route: 'Home -> signup/demo/auth -> onboarding/builder -> public site -> RSVP',
      focus: 'UX quality and runtime truth, not just route reachability',
      evidenceLogPath: localRouteEvidencePath,
    },
    runtimeWordingVerification: {
      required: true,
      status: localWordingEvidenceCaptured ? 'local_captured_production_rerun_pending' : 'missing',
      blocking: !localWordingEvidenceCaptured,
      surfaces: ['privacy/access/publish', 'marketing/settings/billing'],
      evidenceLogPath: localWordingEvidencePath,
    },
    onboardingStarterDraftWording: {
      required: true,
      status: localWordingEvidenceCaptured ? 'local_captured_production_rerun_pending' : 'missing',
      blocking: !localWordingEvidenceCaptured,
      surfaces: ['onboarding', 'first-run dashboard/site draft'],
      evidenceLogPath: localWordingEvidencePath,
    },
  },
  manualProofSummary: {
    requiredCount: 3,
    missingCount: [localRouteEvidenceCaptured, localWordingEvidenceCaptured, localWordingEvidenceCaptured].filter((captured) => !captured).length,
    blockingCount: [localRouteEvidenceCaptured, localWordingEvidenceCaptured, localWordingEvidenceCaptured].filter((captured) => !captured).length,
    blockingKeys: [
      !localRouteEvidenceCaptured ? 'canonicalCouplePath' : null,
      !localWordingEvidenceCaptured ? 'runtimeWordingVerification' : null,
      !localWordingEvidenceCaptured ? 'onboardingStarterDraftWording' : null,
    ].filter(Boolean),
    blockingNextSteps: [],
    evidenceLogPath: 'docs/v1-smoke-proof-log.md',
  },
  manualProofBlockingReasons: [
    {
      key: 'canonicalCouplePath',
      reason: localRouteEvidenceCaptured ? 'Route notes are captured; keep this fresh after future approved deploys.' : 'No logged route-note pass yet for the canonical couple path.',
      nextStep: localRouteEvidenceCaptured ? 'Rerun this path after future approved frontend deploys or route/copy changes.' : 'Run and log the Home -> signup/demo/auth -> onboarding/builder -> public site -> RSVP truth pass.',
    },
    {
      key: 'runtimeWordingVerification',
      reason: localWordingEvidenceCaptured ? 'Runtime wording is captured; keep this fresh after future approved deploys.' : 'Runtime wording has not been checked against the real privacy/access/publish and marketing/settings/billing behavior.',
      nextStep: localWordingEvidenceCaptured ? 'Rerun wording truth after future approved frontend deploys or copy/route changes.' : 'Verify those surfaces in runtime and log pass/fail notes in docs/v1-smoke-proof-log.md.',
    },
    {
      key: 'onboardingStarterDraftWording',
      reason: localWordingEvidenceCaptured ? 'Onboarding and starter-draft wording proof is captured; keep this fresh after future approved deploys.' : 'Onboarding and first-run starter-draft wording still lack runtime truth verification.',
      nextStep: localWordingEvidenceCaptured ? 'Rerun onboarding plus starter-draft wording after future approved frontend deploys or copy/route changes.' : 'Verify onboarding plus first-run draft wording in runtime and log pass/fail notes in docs/v1-smoke-proof-log.md.',
    },
  ],
  whatMustChangeBeforeGo: [
    'Run and record npm run proof:v1:guests-rsvp-ops in the target environment',
    'Keep production couple-path and runtime wording proof fresh after future approved frontend deploys',
  ],
  externalRequiredProof: {
    command: 'npm run proof:v1:guests-rsvp-ops',
    severity: 'required',
    message: 'Guests / RSVP ops is intentionally outside canonical smoke; use the dedicated bundle result for current pass/blocked/fail state.',
    recommendation: 'Run the dedicated bundle after canonical smoke and log the exact result.',
  },
  launchCriticalBlockerCommand: 'npm run proof:v1:guests-rsvp-ops',
  highestRiskTrustGapKey: 'canonical_smoke_not_launch_source_of_truth',
  secondaryTrustGapKey: 'production_wording_keep_fresh_after_deploy',
  publicV1ClaimBlockedByCriticalTrustGaps: failedRequired.length > 0 || blockedRequired.length > 0,
  externalFixtureStillRequired: false,
  canonicalSmokeGreenButLaunchRed: false,
  blockers: blockedRequired.map((result) => ({
    id: result.id,
    label: result.label,
    blockerType: result.blockerType,
    message: result.parsed?.message ?? 'Blocked by environment or missing public-site fixture.',
    recommendation: result.parsed?.recommendation ?? null,
  })),
  results,
};

console.log(JSON.stringify(output, null, 2));
if (failedRequired.length > 0) process.exit(1);
