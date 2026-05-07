import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const filesThatMustNotReadBrowserProviderKeys = [
  'src/lib/openai.ts',
  'supabase/functions/onboarding-ai-orchestrate/index.ts',
  'supabase/functions/photo-analyze-batch/index.ts',
  'supabase/functions/translate-site-content/index.ts',
  '.env.example',
];

const browserReadableAiSources = [
  'src/pages/dashboard/GuestPhotoSharing.tsx',
  'tests/e2e/photo-upload-write-read.spec.ts',
  'supabase/functions/guest-recap-config/index.ts',
];

const localEnvFilesThatMustNotExposeBrowserAiKeys = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
  '.vercel/.env.production.local',
];

const sensitiveAiPhotoColumns = [
  'provider',
  'model',
  'raw_result',
  'raw_usage',
  'input_tokens',
  'cached_input_tokens',
  'output_tokens',
  'total_tokens',
  'estimated_cost_usd',
  'raw_exif',
  'gps_lat',
  'gps_lng',
  'gps_altitude',
  'metadata',
];

const extractSelectListsForTable = (source: string, tableName: string) => {
  const tablePattern = String.raw`\.from\(['"]${tableName}['"]\)[\s\S]{0,700}?\.select\((['"\`])([\s\S]*?)\1\)`;
  return Array.from(source.matchAll(new RegExp(tablePattern, 'g')), (match) => match[2]);
};

describe('AI provider key security', () => {
  it('keeps model provider API keys out of browser-visible env paths', () => {
    for (const filePath of filesThatMustNotReadBrowserProviderKeys) {
      const source = readFileSync(filePath, 'utf8');
      expect(source, filePath).not.toMatch(/VITE_OPENAI_API_KEY|VITE_OPENAI_MODEL/);
    }
  });

  it('keeps local env files free of browser-readable AI provider keys', () => {
    for (const filePath of localEnvFilesThatMustNotExposeBrowserAiKeys) {
      if (!existsSync(filePath)) continue;
      const source = readFileSync(filePath, 'utf8');
      expect(source, filePath).not.toMatch(/VITE_OPENAI_API_KEY|VITE_OPENAI_MODEL/);
    }
  });

  it('keeps the browser provider helper as a server-route placeholder only', () => {
    const source = readFileSync('src/lib/openai.ts', 'utf8');

    expect(source).not.toMatch(/api\.openai\.com|Authorization|Bearer|OPENAI_API_KEY|OPENAI_MODEL/);
    expect(source).toMatch(/server-side only/i);
  });

  it('does not persist or throw raw provider response bodies from audited AI paths', () => {
    const auditedSources = [
      'src/lib/openai.ts',
      'supabase/functions/onboarding-ai-orchestrate/index.ts',
      'supabase/functions/photo-analyze-batch/index.ts',
    ].map((filePath) => [filePath, readFileSync(filePath, 'utf8')] as const);

    for (const [filePath, source] of auditedSources) {
      expect(source, filePath).not.toMatch(/throw new Error\(await response\.text\(\)\)/);
      expect(source, filePath).not.toMatch(/OpenAI request failed[^`'"]*\$\{errorText\}/);
      expect(source, filePath).not.toMatch(/error_message:\s*error instanceof Error \? error\.message/);
    }
  });

  it('does not return provider or model metadata from onboarding orchestration to browser clients', () => {
    const source = readFileSync('supabase/functions/onboarding-ai-orchestrate/index.ts', 'utf8');
    const responseBlock = source.slice(source.indexOf('return json({', source.indexOf('internal_ai_usage_events')));

    expect(responseBlock).not.toMatch(/\bprovider,/);
    expect(responseBlock).not.toMatch(/\bmodel:/);
  });

  it('keeps onboarding orchestration unexpected failures customer-safe', () => {
    const source = readFileSync('supabase/functions/onboarding-ai-orchestrate/index.ts', 'utf8');

    expect(source).toContain('safeOnboardingAiApiError("INTERNAL_ERROR")');
    expect(source).not.toMatch(/return fail\("INTERNAL_ERROR",\s*err instanceof Error \? err\.message/);
    expect(source).not.toMatch(/return fail\("INTERNAL_ERROR",\s*String\(err/);
  });

  it('keeps regular client-readable AI photo queries off sensitive provider and raw metadata columns', () => {
    for (const filePath of browserReadableAiSources) {
      const source = readFileSync(filePath, 'utf8');
      const selectLists = [
        ...extractSelectListsForTable(source, 'photo_upload_ai_analysis'),
        ...extractSelectListsForTable(source, 'photo_upload_metadata'),
        ...extractSelectListsForTable(source, 'photo_ai_bucket_corrections'),
        ...extractSelectListsForTable(source, 'internal_ai_usage_events'),
      ];

      for (const selectList of selectLists) {
        for (const column of sensitiveAiPhotoColumns) {
          expect(selectList, `${filePath} selects ${column}`).not.toMatch(new RegExp(String.raw`(?:^|,)\s*${column}\b`));
        }
      }
    }
  });

  it('locks sensitive AI photo table columns away from regular browser roles at the database boundary', () => {
    const source = readFileSync('supabase/migrations/20260503100000_harden_ai_photo_column_privileges.sql', 'utf8');

    expect(source).toMatch(/REVOKE SELECT ON public\.photo_upload_ai_analysis FROM anon, authenticated/i);
    expect(source).toMatch(/REVOKE SELECT ON public\.photo_upload_metadata FROM anon, authenticated/i);
    expect(source).toMatch(/REVOKE SELECT ON public\.photo_ai_bucket_corrections FROM anon, authenticated/i);
    expect(source).toMatch(/REVOKE SELECT ON public\.internal_ai_usage_events FROM anon, authenticated/i);
    for (const column of sensitiveAiPhotoColumns) {
      expect(source, `migration grants ${column}`).not.toMatch(new RegExp(String.raw`GRANT SELECT \([\s\S]*\b${column}\b[\s\S]*\) ON public\.`));
    }
  });

  it('keeps photo vision prompts and browser errors away from exact GPS and raw backend details', () => {
    const source = readFileSync('supabase/functions/photo-analyze-batch/index.ts', 'utf8');
    const openAiPromptBlock = source.slice(
      source.indexOf('async function analyzeWithOpenAi'),
      source.indexOf('const requestBody', source.indexOf('async function analyzeWithOpenAi')),
    );
    const geminiPromptBlock = source.slice(
      source.indexOf('async function analyzeWithGemini'),
      source.indexOf('let binary = ""', source.indexOf('async function analyzeWithGemini')),
    );

    for (const [label, promptBlock] of [
      ['openai prompt', openAiPromptBlock],
      ['gemini prompt', geminiPromptBlock],
    ] as const) {
      expect(promptBlock, label).toContain('hasPrivateGps');
      expect(promptBlock, label).toContain('exact coordinates withheld from AI');
      expect(promptBlock, label).not.toMatch(/\bgpsLat\b|\bgpsLng\b|gps_lat|gps_lng|gpsAltitude|gps_altitude|rawExif|raw_exif/);
    }

    expect(source).not.toMatch(/return fail\([^)]*,\s*[^)]*\.message/);
    expect(source).toContain('safePhotoAnalyzeApiError("INTERNAL_ERROR")');
  });
});
