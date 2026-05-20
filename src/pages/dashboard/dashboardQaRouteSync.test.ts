import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('dashboard and onboarding QA route sync guards', () => {
  it('keeps settings identity export QA mode tied to live router search params', () => {
    const source = read('src/pages/dashboard/Settings.tsx');

    expect(source).toContain("const [searchParams] = useSearchParams();");
    expect(source).toContain("const identityExportsQaMode = searchParams.get('identityExportsQa') === '1';");
  });

  it('keeps planning starter suite QA visibility tied to live router search params', () => {
    const source = read('src/pages/dashboard/planning/PlanningOverviewTab.tsx');

    expect(source).toContain("const [searchParams] = useSearchParams();");
    expect(source).toContain("searchParams.has('starterSuiteQa'),");
  });

  it('keeps vault google drive return handling tied to live router search params', () => {
    const source = read('src/pages/dashboard/useVaultDashboardData.ts');

    expect(source).toContain("const [searchParams] = useSearchParams();");
    expect(source).toContain("const oauthError = searchParams.get('error');");
    expect(source).toContain("const googleCode = searchParams.get('google_drive_code') || searchParams.get('code');");
    expect(source).toContain("const googleState = searchParams.get('state');");
    expect(source).toContain("}, [checkGoogleDriveHealth, ensureHostedVaultProvider, loadData, searchParams, weddingSiteId]);");
  });

  it('keeps quick start debug and reset flags tied to live router search params', () => {
    const source = read('src/pages/onboarding/QuickStart.tsx');

    expect(source).toContain("const [searchParams] = useSearchParams();");
    expect(source).toContain("const showAiDebug = searchParams.get('quickStartDebug') === '1';");
    expect(source).toContain("const shouldReset = searchParams.get('resetQuickStart') === '1';");
    expect(source).toContain("}, [searchParams]);");
  });
});
