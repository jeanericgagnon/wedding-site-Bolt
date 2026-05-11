import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..', '..');
const scanRoots = [
  path.join(repoRoot, 'src'),
  path.join(repoRoot, 'supabase', 'functions'),
];
const allowedFiles = new Set([
  path.join(repoRoot, 'src', 'lib', 'publicLegacyLayoutFlagAudit.test.ts'),
  path.join(repoRoot, 'src', 'lib', 'publicSiteRenderModel.ts'),
  path.join(repoRoot, 'src', 'lib', 'publicSiteRenderModel.test.ts'),
]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      out.push(...walk(fullPath));
      continue;
    }
    out.push(fullPath);
  }
  return out;
}

describe('legacy layout fallback audit', () => {
  it('does not author the legacyLayoutPublished flag outside the explicit public render consumer and tests', () => {
    const matches: string[] = [];

    for (const root of scanRoots) {
      for (const file of walk(root)) {
        if (file.endsWith('.map')) continue;
        const source = readFileSync(file, 'utf8');
        if (source.includes('legacyLayoutPublished')) {
          matches.push(file);
        }
      }
    }

    expect(matches.sort()).toEqual(Array.from(allowedFiles).sort());
  });
});
