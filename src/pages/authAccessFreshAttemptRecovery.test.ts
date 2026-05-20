import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('auth and access fresh-attempt recovery guards', () => {
  it('clears stale login notice and error state when auth flows start over', () => {
    const source = read('src/pages/Login.tsx');

    expect(source).toContain("const clearAuthFeedback = () => {");
    expect(source).toContain("setError('');");
    expect(source).toContain("setNotice('');");
    expect(source).toContain('clearAuthFeedback();');
    expect(source).toContain("onChange={(e) => { setResetEmail(e.target.value); clearAuthFeedback(); }}");
  });

  it('clears stale public registry purchase errors when guests retry a different purchase path', () => {
    const source = read('src/sections/components/RegistrySection.tsx');

    expect(source).toContain('const clearPurchaseError = () => setPurchaseError(null);');
    expect(source).toContain('const handleStartPurchase = (item: RegistryItem) => {');
    expect(source).toContain('clearPurchaseError();');
    expect(source).toContain('onNameChange={clearPurchaseError}');
    expect(source).toContain('onPurchase={handleStartPurchase}');
  });
});
