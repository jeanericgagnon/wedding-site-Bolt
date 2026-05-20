import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('dashboard owner workspace reset wiring', () => {
  it('resets registry data and transient workspace state when site context disappears or changes', () => {
    const registryPage = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/Registry.tsx'),
      'utf8',
    );
    const registryDataHook = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/registry/useRegistryDashboardData.ts'),
      'utf8',
    );

    expect(registryDataHook).toContain('const resetRegistryDashboardState = useCallback(() => {');
    expect(registryDataHook).toContain("if (!site?.id) {\n          resetRegistryDashboardState();\n          return;\n        }");
    expect(registryPage).toContain('const previousWeddingSiteIdRef = useRef<string | null>(null);');
    expect(registryPage).toContain('const resetRegistryDashboardInteractionState = React.useCallback(() => {');
    expect(registryPage).toContain("setShowForm(false);");
    expect(registryPage).toContain("setBulkImportOpen(false);");
    expect(registryPage).toContain(
      "if (\n      previousWeddingSiteIdRef.current &&\n      weddingSiteId &&\n      previousWeddingSiteIdRef.current !== weddingSiteId\n    ) {\n      resetRegistryDashboardInteractionState();\n    }",
    );
    expect(registryPage).toContain(
      "if (!weddingSiteId && !isDemoMode) {\n      resetRegistryDashboardInteractionState();\n    }",
    );
  });

  it('resets vault transient workspace state when site context disappears or changes', () => {
    const vaultPage = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/Vault.tsx'),
      'utf8',
    );

    expect(vaultPage).toContain('const previousWeddingSiteIdRef = useRef<string | null>(null);');
    expect(vaultPage).toContain('const resetVaultDashboardInteractionState = useCallback(() => {');
    expect(vaultPage).toContain("setActiveFormConfigId(null);");
    expect(vaultPage).toContain("setEditingConfig(null);");
    expect(vaultPage).toContain(
      "if (\n      previousWeddingSiteIdRef.current &&\n      weddingSiteId &&\n      previousWeddingSiteIdRef.current !== weddingSiteId\n    ) {\n      resetVaultDashboardInteractionState();\n    }",
    );
    expect(vaultPage).toContain(
      "if (!weddingSiteId && !isDemoMode) {\n      resetVaultDashboardInteractionState();\n    }",
    );
  });
});
