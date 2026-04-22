#!/usr/bin/env node

import { execSync } from 'node:child_process';

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

const results = steps.map(runStep);
const blockedRequired = results.filter((result) => result.required && result.blocked);
const failedRequired = results.filter((result) => result.required && !result.ok && !result.blocked);

const output = {
  ok: failedRequired.length === 0 && blockedRequired.length === 0,
  blocked: blockedRequired.length > 0,
  slice: 'canonical-v1-smoke',
  generatedAt: new Date().toISOString(),
  currentV1Line: [
    'couples can create and launch a polished wedding site',
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
  publicV1ClaimStatus: 'not_clear_to_claim_yet',
  launchCallRightNow: 'no_go_for_public_v1_claim',
  automationDoesNotClearLaunch: true,
  publicV1ClaimBlockers: [
    'Canonical couple-path still lacks one logged human route-note pass from Home through public RSVP entry',
    'Privacy/access/publish and marketing/settings/billing wording still lack runtime-truth verification',
  ],
  automatedCoverage: [
    'Build integrity for the current public/onboarding path',
    'Public v1 trust story smoke across Home, Product, and Trust via Playwright live smoke',
    'Canonical entry-route continuity across signup, payment gating, quick-start preview, RSVP entry, collaborator invite load, and login fallback for protected onboarding, setup, and dashboard surfaces',
    'Published site slug/site_url lookup truth through Supabase site lookup smoke',
  ],
  stillManualProofNeeded: [
    'One logged human route-note pass for Home -> signup/demo/auth -> onboarding/builder -> public site -> RSVP, focused on UX quality instead of basic route reachability',
    'Verify privacy/access/publish plus marketing/settings/billing wording against the actual runtime behavior',
    'Log exact pass/fail or blocker details in docs/v1-smoke-proof-log.md, including the current v1 line and any environment blockers',
  ],
  launchTruthGaps: [
    'Guests / RSVP ops proof remains blocked outside this canonical smoke gate because validate-rsvp-token is not callable with current anon credentials (401)',
    'Canonical smoke covers route continuity; it does not replace the remaining manual couple-path and wording-truth pass',
  ],
  launchTruthGapSeverity: {
    guestsRsvpOps: 'critical',
    canonicalManualTruthPass: 'critical',
  },
  highestRiskTrustGap: 'Public v1 claim is still blocked by missing canonical couple-path truth notes and unresolved guests/RSVP ops proof auth',
  trustLieClosedInThisGate: 'Canonical smoke output now explicitly says public v1 is a no-go instead of implying launch-clear status from automation alone',
  automationCaveat: 'Passing canonical smoke is evidence of route continuity and build health, not launch clearance on its own',
  truthGateSummary: 'Automation is green, but launch truth is still red until the canonical manual proof and guests/RSVP proof gaps are closed',
  launchDecisionDependsOnManualTruthPass: true,
  manualTruthPassMissing: true,
  runtimeWordingVerificationMissing: true,
  manualProofRequirements: {
    canonicalCouplePath: {
      required: true,
      status: 'missing',
      route: 'Home -> signup/demo/auth -> onboarding/builder -> public site -> RSVP',
      focus: 'UX quality and runtime truth, not just route reachability',
    },
    runtimeWordingVerification: {
      required: true,
      status: 'missing',
      surfaces: ['privacy/access/publish', 'marketing/settings/billing'],
    },
  },
  whatMustChangeBeforeGo: [
    'Close the anon-auth RSVP blocker on validate-rsvp-token',
    'Log the canonical couple-path truth pass with runtime wording verification',
  ],
  externalBlockedProof: {
    command: 'npm run proof:v1:guests-rsvp-ops',
    blockerType: 'external_fixture_required',
    severity: 'critical',
    message: 'validate-rsvp-token function is not callable with current anon credentials (401)',
    recommendation: 'Provide anon-callable function auth in this environment or run with credentials that can invoke the function.',
  },
  launchCriticalBlockerCommand: 'npm run proof:v1:guests-rsvp-ops',
  highestRiskTrustGapKey: 'guests_rsvp_ops_and_manual_truth_pass',
  publicV1ClaimBlockedByCriticalTrustGaps: true,
  externalFixtureStillRequired: true,
  canonicalSmokeGreenButLaunchRed: true,
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
