import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public registry purchase memory scope guards', () => {
  it('keeps public registry purchase memory scoped to the active wedding site', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/sections/components/RegistrySection.tsx'),
      'utf8',
    );

    expect(source).toContain('function buildRegistryPurchaseMemoryStorageKey(storageScope?: string | null): string {');
    expect(source).toContain('function buildRegistryPurchaseCookieKey(storageScope?: string | null): string {');
    expect(source).toContain('export function readRegistryPurchaseMemory(storageScope?: string | null): string[] {');
    expect(source).toContain('export function rememberRegistryPurchase(itemId: string, storageScope?: string | null): string[] {');
    expect(source).toContain('const [rememberedPurchaseIds, setRememberedPurchaseIds] = useState<string[]>(() => readRegistryPurchaseMemory(storageScope));');
    expect(source).toContain('setRememberedPurchaseIds(rememberRegistryPurchase(purchasingItem.id, storageScope));');
    expect(source).toContain('storageScope={weddingSiteId}');
  });
});
