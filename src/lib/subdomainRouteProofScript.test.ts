import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('subdomain route proof script', () => {
  it('keeps the package script wired to the dedicated live proof wrapper', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string> };
    expect(packageJson.scripts?.['proof:v1:subdomain-route']).toBe('node scripts/v1-proof-subdomain-route.mjs');
  });
});
