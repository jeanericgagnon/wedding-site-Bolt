import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('release proof wiring', () => {
  it('keeps test:security pointed at current files', () => {
    const packageJson = read('package.json');

    expect(packageJson).toContain('src/lib/publicSiteBoundary.test.ts');
    expect(packageJson).toContain('src/lib/publicSiteProject.test.ts');
    expect(packageJson).toContain('src/lib/guestContactLookupSafety.test.ts');
    expect(packageJson).toContain('src/lib/guestContactSubmitSafety.test.ts');
    expect(packageJson).toContain('src/lib/sendWeddingEmailSafety.test.ts');
    expect(packageJson).toContain('src/lib/processEmailQueueSafety.test.ts');
    expect(packageJson).toContain('src/lib/sendBulkMessageSafety.test.ts');
    expect(packageJson).toContain('src/lib/openaiClientSafety.test.ts');
    expect(packageJson).toContain('src/pages/VaultContribute.test.ts');
  });

  it('keeps current release-proof script files wired in package.json', () => {
    const packageJson = read('package.json');

    expect(packageJson).toContain('"proof:v1:prereqs": "node scripts/v1-proof-prereqs.mjs"');
    expect(packageJson).toContain('"proof:v1:public-access-coverage": "node scripts/v1-proof-public-access-coverage.mjs"');
    expect(packageJson).toContain('"proof:v1:client-write-inventory": "node scripts/v1-proof-client-write-inventory.mjs"');
    expect(packageJson).toContain('"proof:v1:ast-security": "node scripts/v1-proof-ast-security.mjs"');
    expect(packageJson).toContain('"proof:v1:security-automation": "node scripts/v1-proof-security-automation.mjs"');
    expect(packageJson).toContain('"proof:v1:client-rls-matrix": "node scripts/v1-proof-client-rls-matrix.mjs"');
    expect(packageJson).toContain('"proof:v1:registry-preview-ssrf": "node scripts/v1-proof-registry-preview-ssrf.mjs"');
    expect(packageJson).toContain('"proof:v1:performance-budget": "node scripts/v1-proof-performance-budget.mjs"');
  });

  it('keeps security automation artifacts present', () => {
    expect(read('.github/dependabot.yml')).toContain('package-ecosystem: npm');
    expect(read('.github/workflows/codeql.yml')).toContain('github/codeql-action');
    expect(read('.github/workflows/gitleaks.yml')).toContain('gitleaks/gitleaks-action');
    expect(read('.github/workflows/semgrep.yml')).toContain('semgrep/semgrep-action');
    expect(read('.semgrep/dayof-security.yml')).toContain('VITE_OPENAI_API_KEY');
  });

  it('keeps local budget guard scripts present', () => {
    expect(read('scripts/check-file-size-guard.mjs')).toContain('file-size-guard');
    expect(read('scripts/check-asset-budget.mjs')).toContain('asset-budget');
  });
});
