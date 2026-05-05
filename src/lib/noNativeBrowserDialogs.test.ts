import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const repoRoot = process.cwd();
const sourceRoots = ['src/pages', 'src/components', 'src/builder', 'src/lib'];
const sourceExtensions = new Set(['.ts', '.tsx']);
const nativeDialogPattern = /\b(?:window\.)?(?:alert|confirm|prompt)\s*\(/;

function collectSourceFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectSourceFiles(fullPath, files);
      continue;
    }

    if (!sourceExtensions.has(fullPath.slice(fullPath.lastIndexOf('.')))) continue;
    if (/\.(test|spec)\.[tj]sx?$/.test(fullPath)) continue;
    files.push(fullPath);
  }
  return files;
}

describe('native browser dialog guard', () => {
  it('keeps product code on app-owned dialogs, toasts, and copy fallbacks', () => {
    const offenders = sourceRoots
      .flatMap((root) => collectSourceFiles(join(repoRoot, root)))
      .filter((file) => nativeDialogPattern.test(readFileSync(file, 'utf8')))
      .map((file) => relative(repoRoot, file));

    expect(offenders).toEqual([]);
  });
});
