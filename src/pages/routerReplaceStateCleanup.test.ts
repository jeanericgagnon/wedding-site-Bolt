import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('router replace-state cleanup', () => {
  it('uses router navigation instead of raw history replacement for builder publishNow cleanup', () => {
    const source = read('src/builder/components/BuilderShell.tsx');

    expect(source).toContain("params.delete('publishNow');");
    expect(source).toContain("navigate(next, { replace: true });");
    expect(source).not.toContain("window.history.replaceState({}, '', next);");
  });

  it('uses router navigation instead of raw history replacement for quick-start reset cleanup', () => {
    const source = read('src/pages/onboarding/QuickStart.tsx');

    expect(source).toContain("const nextParams = new URLSearchParams(searchParams);");
    expect(source).toContain("nextParams.delete('resetQuickStart');");
    expect(source).toContain("{ replace: true },");
    expect(source).not.toContain("window.history.replaceState(window.history.state, '',");
  });

  it('uses router navigation instead of raw history replacement for vault oauth query cleanup', () => {
    const source = read('src/pages/dashboard/useVaultDashboardData.ts');

    expect(source).toContain('const clearOAuthParams = () => {');
    expect(source).toContain("url.delete('google_drive_code');");
    expect(source).toContain("url.delete('code');");
    expect(source).toContain("url.delete('state');");
    expect(source).toContain("url.delete('error');");
    expect(source).toContain("{ replace: true },");
    expect(source).not.toContain("window.history.replaceState({}, '', url.toString());");
  });

  it('uses router navigation instead of forcing reloads for onboarding and setup reset links', () => {
    const quickStartSource = read('src/pages/onboarding/QuickStart.tsx');
    const setupSource = read('src/pages/setup/SetupShell.tsx');

    expect(quickStartSource).toContain("navigate(`${buildQuickStartEntryPath()}&resetQuickStart=1`);");
    expect(quickStartSource).not.toContain("window.location.href = `${buildQuickStartEntryPath()}&resetQuickStart=1`;");

    expect(setupSource).toContain("const navigate = useNavigate();");
    expect(setupSource).toContain("navigate('/setup/names');");
    expect(setupSource).not.toContain("window.location.href = '/setup/names';");
  });
});
