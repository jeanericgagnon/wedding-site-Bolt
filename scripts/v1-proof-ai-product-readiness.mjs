#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const read = (filePath) => fs.readFileSync(filePath, 'utf8');
const exists = (filePath) => fs.existsSync(filePath);

const checks = [];

function addCheck(id, ok, detail) {
  checks.push({ id, ok: Boolean(ok), detail });
}

function has(filePath, pattern) {
  return pattern.test(read(filePath));
}

function notHas(filePath, pattern) {
  return !pattern.test(read(filePath));
}

const sensitiveBrowserEnv = /VITE_OPENAI_API_KEY|VITE_OPENAI_MODEL|sk-proj|api\.openai\.com|generativelanguage\.googleapis\.com/;
const keyFiles = [
  'src/lib/openai.ts',
  'src/lib/aiDraftGenerator.ts',
  'src/lib/aiOnboarding.ts',
  'src/lib/aiClarifyingQuestions.ts',
  'src/lib/aiPhotoOps.ts',
  'supabase/functions/translate-site-content/index.ts',
  '.env.example',
];

const localEnvFiles = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
  '.vercel/.env.production.local',
];

for (const filePath of keyFiles) {
  addCheck(
    `no-browser-provider-key-path:${filePath}`,
    exists(filePath) && notHas(filePath, /VITE_OPENAI_API_KEY|VITE_OPENAI_MODEL|sk-proj/),
    `${filePath} must not expose browser-readable model keys or model env names.`,
  );
}

for (const filePath of localEnvFiles) {
  if (!exists(filePath)) continue;
  addCheck(
    `no-browser-provider-key-in-local-env:${filePath}`,
    notHas(filePath, /VITE_OPENAI_API_KEY|VITE_OPENAI_MODEL/),
    `${filePath} must not contain browser-readable AI provider env keys.`,
  );
}

addCheck(
  'browser-openai-helper-is-server-only-placeholder',
  has('src/lib/openai.ts', /isOpenAiConfigured\s*=\s*\(\)\s*=>\s*false/)
    && notHas('src/lib/openai.ts', sensitiveBrowserEnv)
    && has('src/lib/openai.ts', /server-side only/i),
  'Browser helper must not call providers directly; model-backed work belongs behind server routes.',
);

addCheck(
  'quick-start-edge-model-backed-with-deterministic-fallback',
  has('supabase/functions/onboarding-ai-orchestrate/index.ts', /Deno\.env\.get\("OPENAI_API_KEY"\)/)
    && has('supabase/functions/onboarding-ai-orchestrate/index.ts', /fallbackDecision/)
    && has('supabase/functions/onboarding-ai-orchestrate/index.ts', /fallbackUsed/)
    && has('supabase/functions/onboarding-ai-orchestrate/index.ts', /maxLoopCount/),
  'Quick Start orchestration must be server-side model-backed when configured and deterministic when not.',
);

const onboardingSource = read('supabase/functions/onboarding-ai-orchestrate/index.ts');
const onboardingReturnBlock = onboardingSource.slice(onboardingSource.lastIndexOf('return json({'));
addCheck(
  'quick-start-edge-does-not-return-provider-model',
  !/\bprovider\b|\bmodel\b/.test(onboardingReturnBlock),
  'Quick Start response must not return provider/model metadata to the browser.',
);

addCheck(
  'quick-start-edge-safe-unexpected-errors',
  has('supabase/functions/onboarding-ai-orchestrate/index.ts', /safeOnboardingAiApiError\("INTERNAL_ERROR"\)/)
    && !/return fail\("INTERNAL_ERROR",\s*err instanceof Error \? err\.message/.test(onboardingSource),
  'Quick Start unexpected failures must return customer-safe copy, not raw exception text.',
);

addCheck(
  'generated-copy-launch-scope-is-deterministic-in-browser',
  has('src/lib/aiDraftGenerator.ts', /if \(!isOpenAiConfigured\(\)\)[\s\S]{0,220}return deterministic/)
    && has('src/lib/aiDraftGenerator.ts', /guardGeneratedDraft/)
    && has('src/lib/aiDraftGenerator.ts', /normalizeHumanCopyPunctuation/),
  'Generated site copy must be deterministic in browser launch scope and guarded if a server route is later wired.',
);

addCheck(
  'legacy-onboarding-extraction-launch-scope-is-deterministic-in-browser',
  has('src/lib/aiOnboarding.ts', /if \(!isOpenAiConfigured\(\)\)[\s\S]{0,240}return deterministic/)
    && has('src/lib/aiOnboarding.ts', /deterministicExtractWeddingProfileUpdates/)
    && has('src/lib/aiOnboarding.ts', /requiresConfirmation/),
  'Legacy onboarding extraction must not need browser model access and must keep deterministic conflict handling.',
);

addCheck(
  'legacy-clarifying-helper-has-no-browser-provider-key-path',
  has('src/lib/aiClarifyingQuestions.ts', /OpenAiNotConfiguredError/)
    && notHas('src/lib/aiClarifyingQuestions.ts', sensitiveBrowserEnv),
  'Legacy clarifying helper must not contain direct provider endpoints or browser keys.',
);

addCheck(
  'photo-organizer-launch-scope-is-deterministic-in-browser',
  has('src/lib/aiPhotoOps.ts', /if \(uploads\.length === 0 \|\| buckets\.length === 0 \|\| !isOpenAiConfigured\(\)\)[\s\S]{0,140}return buildFallbackPhotoOpsPlan/)
    && has('src/lib/aiPhotoOps.ts', /possibleDuplicateOf/)
    && has('src/lib/aiPhotoOps.ts', /detectedMoment/),
  'Photo organizer must remain useful without browser model access.',
);

addCheck(
  'photo-vision-edge-model-backed-with-safe-fallback',
  has('supabase/functions/photo-analyze-batch/index.ts', /Deno\.env\.get\("OPENAI_API_KEY"\)/)
    && has('supabase/functions/photo-analyze-batch/index.ts', /fallbackAnalyze/)
    && has('supabase/functions/photo-analyze-batch/index.ts', /safePhotoAiErrorMessage/)
    && has('supabase/functions/photo-analyze-batch/index.ts', /safePhotoAnalyzeApiError\("INTERNAL_ERROR"\)/),
  'Photo vision must run server-side with deterministic fallback and safe browser-facing errors.',
);

addCheck(
  'site-translation-edge-model-backed-owner-gated-safe-errors',
  has('supabase/functions/translate-site-content/index.ts', /Deno\.env\.get\("OPENAI_API_KEY"\)/)
    && has('supabase/functions/translate-site-content/index.ts', /auth\.getUser/)
    && has('supabase/functions/translate-site-content/index.ts', /site\.user_id !== userData\.user\.id/)
    && has('supabase/functions/translate-site-content/index.ts', /safeTranslateSiteContentError\("INTERNAL_ERROR"\)/)
    && notHas('supabase/functions/translate-site-content/index.ts', /siteError\.message|saveError\.message|err instanceof Error \? err\.message/),
  'Site translation must be server-side model-backed, owner-gated, and free of raw database/provider errors.',
);

addCheck(
  'photo-vision-does-not-share-exact-gps-or-face-identity',
  has('supabase/functions/photo-analyze-batch/index.ts', /hasPrivateGps/)
    && has('supabase/functions/photo-analyze-batch/index.ts', /exact coordinates withheld from AI/)
    && has('supabase/functions/photo-analyze-batch/index.ts', /Do not identify people by (?:name from )?faces?/)
    && notHas('supabase/functions/photo-analyze-batch/index.ts', /safeMetadata:[\s\S]{0,500}\bgpsLat\b|safeMetadata:[\s\S]{0,500}\bgpsLng\b/),
  'Photo vision prompts must withhold exact GPS and avoid face identity.',
);

addCheck(
  'customer-copy-guards-block-ai-provider-leakage',
  has('src/lib/launchWordingGuard.test.ts', /OPENAI_API_KEY/)
    && has('src/lib/launchWordingGuard.test.ts', /AI spend/)
    && has('src/lib/photoAnalysisCustomerCopy.ts', /openai|gpt/)
    && has('src/lib/photoAnalysisCustomerCopy.ts', /service\[-_\\s\]\*role/),
  'Customer-visible wording guards must block provider/key/spend/raw infrastructure language.',
);

addCheck(
  'ai-photo-column-privilege-migration-present',
  exists('supabase/migrations/20260503100000_harden_ai_photo_column_privileges.sql')
    && has('supabase/migrations/20260503100000_harden_ai_photo_column_privileges.sql', /REVOKE SELECT ON public\.photo_upload_ai_analysis FROM anon, authenticated/i)
    && has('scripts/v1-proof-ai-exposure.mjs', /photo_upload_ai_analysis/)
    && has('scripts/v1-proof-ai-clearance.mjs', /launchCleared/),
  'Sensitive AI/photo internals need DB privilege proof plus executable exposure/clearance gates.',
);

addCheck(
  'vendor-profile-preview-bounds-public-source-fetching',
  has('supabase/functions/vendor-profile-preview/index.ts', /function isBlockedHostname/)
    && has('supabase/functions/vendor-profile-preview/index.ts', /function isPrivateIpv4/)
    && has('supabase/functions/vendor-profile-preview/index.ts', /allowedHost && !allowedHost\.test/)
    && has('supabase/functions/vendor-profile-preview/index.ts', /Enter a public website URL\./)
    && has('supabase/functions/vendor-profile-preview/index.ts', /Could not prepare vendor preview\. Please try again\./)
    && notHas('supabase/functions/vendor-profile-preview/index.ts', /error instanceof Error \? error\.message/),
  'Vendor profile public-source draft must avoid private/local fetches and raw error leakage.',
);

addCheck(
  'registry-preview-bounds-public-source-fetching',
  has('supabase/functions/registry-preview/urlNormalizer.ts', /function isBlockedHostname/)
    && has('supabase/functions/registry-preview/urlNormalizer.ts', /function isPrivateIpv4/)
    && has('supabase/functions/registry-preview/urlNormalizer.ts', /metadata\.google\.internal/)
    && has('supabase/functions/registry-preview/index.ts', /Enter a public product URL\./)
    && has('supabase/functions/registry-preview/index.ts', /extractProductData\(normalized\.canonical\)/)
    && notHas('supabase/functions/registry-preview/index.ts', /details: msg/),
  'Registry preview public-source fetches must reject private/local URLs and avoid raw error details.',
);

addCheck(
  'ai-product-audit-doc-has-current-launch-scope',
  has('docs/ai-product-audit-2026-05-03.md', /deterministic(?:-only)? (?:browser )?launch (?:scope|lanes)|deterministic-only launch decision/i)
    && has('docs/ai-product-audit-2026-05-03.md', /secure (?:live )?model(?:-backed)? proof (?:now )?passes|secure-env model(?:-backed)? end-to-end proof/i),
  'AI audit doc must distinguish deterministic launch scope from secure model proof status.',
);

const ok = checks.every((check) => check.ok);
const report = {
  ok,
  generatedAt: new Date().toISOString(),
  summary: `${checks.filter((check) => check.ok).length}/${checks.length} AI product-readiness checks passed`,
  contractSummary: ok
    ? 'AI product-readiness proof is green: this launch-scope lane validates audited AI product posture and labeling, but it still depends on the dedicated secure-model and AI-clearance gates for deeper runtime truth.'
    : 'AI product-readiness proof is not green: audited AI product posture or launch-scope distinctions drifted and need correction before stronger AI readiness claims remain credible.',
  checks,
  launchScope: {
    modelBackedServerRoutes: ['onboarding-ai-orchestrate', 'photo-analyze-batch', 'translate-site-content'],
    deterministicBrowserLanes: ['generated wedding-site copy', 'legacy onboarding extraction', 'photo organizer plan', 'planner suggestions'],
    clearedProof: ['secure-env model success/failure/invalid-output proof', 'secure service-role deep integrity proof'],
    gatedProof: ['external OpenAI key rotation'],
  },
};

console.log(JSON.stringify(report, null, 2));
process.exit(ok ? 0 : 1);
