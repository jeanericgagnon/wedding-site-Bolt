import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('security automation proof', () => {
  it('keeps dependabot, Semgrep, CodeQL, and secret scanning wired in', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string> };
    const dependabot = readFileSync('.github/dependabot.yml', 'utf8');
    const semgrepConfig = readFileSync('.semgrep/dayof-security.yml', 'utf8');
    const semgrepWorkflow = readFileSync('.github/workflows/semgrep.yml', 'utf8');
    const codeqlWorkflow = readFileSync('.github/workflows/codeql.yml', 'utf8');
    const gitleaksWorkflow = readFileSync('.github/workflows/gitleaks.yml', 'utf8');
    const ciHardpass = readFileSync('.github/workflows/ci-hardpass.yml', 'utf8');
    const releaseGate = readFileSync('.github/workflows/release-launch-gate.yml', 'utf8');

    expect(packageJson.scripts?.['proof:v1:security-automation']).toBe('node scripts/v1-proof-security-automation.mjs');
    expect(packageJson.scripts?.['test:launch']).toContain('npm run proof:v1:security-automation');
    expect(packageJson.scripts?.['test:launch']).toContain('npm run proof:v1:board:freshness');
    expect(packageJson.scripts?.['test:launch']).toContain('npm run proof:v1:board');
    expect(packageJson.scripts?.['test:launch']).toContain('npm run proof:v1:board:md');
    expect(packageJson.scripts?.['test:launch']).toContain('LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 npm run proof:v1:client-rls-matrix -- --require-live');
    expect(dependabot).toContain('package-ecosystem: "npm"');
    expect(dependabot).toContain('package-ecosystem: "github-actions"');
    expect(semgrepConfig).toContain('id: dayof-client-direct-supabase-write');
    expect(semgrepConfig).toContain('id: dayof-no-dangerously-set-inner-html');
    expect(semgrepWorkflow).toContain('semgrep/semgrep-action@v1');
    expect(codeqlWorkflow).toContain('github/codeql-action/init@v4');
    expect(codeqlWorkflow).toContain('github/codeql-action/analyze@v4');
    expect(gitleaksWorkflow).toContain('gitleaks/gitleaks-action@v2');
    expect(ciHardpass).toContain('npm run proof:v1:security-automation');
    expect(ciHardpass).toContain('npm run proof:v1:board:freshness');
    expect(ciHardpass).not.toContain('npm run proof:v1:board\n');
    expect(ciHardpass).not.toContain('npm run proof:v1:board:md');
    expect(releaseGate).toContain('npm run proof:v1:security-automation');
    expect(releaseGate).toContain('npm run proof:v1:board:freshness');
    expect(releaseGate).not.toContain('npm run proof:v1:board\n');
    expect(releaseGate).not.toContain('npm run proof:v1:board:md');
  });
});
