import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('strict pocket wiring', () => {
  it('keeps the strict pocket proof and CI hook wired into launch checks', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string> };
    const ciHardpass = readFileSync('.github/workflows/ci-hardpass.yml', 'utf8');
    const eslint = readFileSync('eslint.config.js', 'utf8');

    expect(packageJson.scripts?.['proof:v1:strict-pocket']).toBe('eslint --max-warnings 0 src/components/auth/ProtectedRoute.tsx src/lib/publicRenderContract.ts src/lib/publicSiteAccess.ts src/lib/publicSiteSlug.ts src/lib/siteConfigValidate.ts src/lib/stripeService.ts src/lib/vendorProfiles.ts');
    expect(packageJson.scripts?.['test:launch']).toContain('npm run proof:v1:strict-pocket');
    expect(ciHardpass).toContain('run: npm run proof:v1:strict-pocket');
    expect(eslint).toContain("'src/lib/publicRenderContract.ts'");
    expect(eslint).toContain("'src/lib/publicSiteAccess.ts'");
    expect(eslint).toContain("'src/lib/publicSiteSlug.ts'");
    expect(eslint).toContain("'src/lib/stripeService.ts'");
    expect(eslint).toContain("'@typescript-eslint/no-explicit-any': 'error'");
  });
});
