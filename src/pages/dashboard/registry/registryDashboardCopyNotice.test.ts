import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('registry dashboard copy notices', () => {
  it('loads site slugs for a real guest registry link', () => {
    const registryService = readFileSync(join(process.cwd(), 'src/pages/dashboard/registry/registryService.ts'), 'utf8');
    const registryDataHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/registry/useRegistryDashboardData.ts'), 'utf8');
    const registryRoute = readFileSync(join(process.cwd(), 'src/pages/dashboard/Registry.tsx'), 'utf8');

    expect(registryService).toContain("export const REGISTRY_DASHBOARD_SITE_SELECT = 'id, site_slug, wedding_date");
    expect(registryDataHook).toContain('const [siteSlug, setSiteSlug] = useState<string | null>(null);');
    expect(registryDataHook).toContain('setSiteSlug(site.site_slug ?? null);');
    expect(registryRoute).toContain('siteSlug={siteSlug}');
  });

  it('overwrites real-site refresh policy state when loading demo registry mode', () => {
    const registryDataHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/registry/useRegistryDashboardData.ts'), 'utf8');

    expect(registryDataHook).toContain('setWeddingDate(demoWeddingSite.wedding_date);');
    expect(registryDataHook).toContain('setRefreshEnabledUntil(null);');
    expect(registryDataHook).toContain('setMonthlyRefreshCap(100);');
    expect(registryDataHook).toContain('setAutoRefreshEnabled(true);');
    expect(registryDataHook).toContain('setMonthlyRefreshCount(0);');
    expect(registryDataHook).toContain('setMonthlyRefreshMonth(getCurrentMonthKey());');
    expect(registryDataHook).toContain('setRefreshCapDraft(100);');
    expect(registryDataHook).toContain("setRefreshPreset('balanced');");
    expect(registryDataHook).toContain('setRefreshIncludePurchased(false);');
    expect(registryDataHook).toContain('setPolicyUpdatedAt(null);');
    expect(registryDataHook).toContain('setPolicyUpdatedBy(null);');
  });

  it('clears registry dashboard load timeout timers after site and ledger loads settle', () => {
    const registryDataHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/registry/useRegistryDashboardData.ts'), 'utf8');

    expect(registryDataHook).toContain('async function runRegistryDashboardTimed<T>(task: Promise<T>, timeoutMs: number): Promise<T> {');
    expect(registryDataHook).toContain("timeoutId = window.setTimeout(() => reject(new Error('Registry dashboard load timed out.')), timeoutMs);");
    expect(registryDataHook).toContain('if (timeoutId) window.clearTimeout(timeoutId);');
    expect(registryDataHook).toContain('return await Promise.race([task, timeout]);');
  });

  it('clears stale registry dashboard state when the active user disappears', () => {
    const registryDataHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/registry/useRegistryDashboardData.ts'), 'utf8');

    expect(registryDataHook).toContain('const resetRegistryDashboardState = useCallback(() => {');
    expect(registryDataHook).toContain('setSiteSlug(null);');
    expect(registryDataHook).toContain('setItemsState([]);');
    expect(registryDataHook).toContain('setRegistryThankYouLedgerState({});');
    expect(registryDataHook).toContain('if (!userId) {\n          resetRegistryDashboardState();\n          return;\n        }');
  });

  it('ignores stale registry init responses after a newer dashboard load starts', () => {
    const registryDataHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/registry/useRegistryDashboardData.ts'), 'utf8');

    expect(registryDataHook).toContain('const initRequestIdRef = useRef(0);');
    expect(registryDataHook).toContain('const loadItems = useCallback(async (siteId: string, shouldCancel?: () => boolean) => {');
    expect(registryDataHook).toContain('if (shouldCancel?.()) return;\n      setItems(data.map(normalizeOwnerDashboardRegistryItem));');
    expect(registryDataHook).toContain('const requestId = ++initRequestIdRef.current;');
    expect(registryDataHook).toContain('const isCurrentInit = () => requestId === initRequestIdRef.current;');
    expect(registryDataHook).toContain('if (!isCurrentInit()) return;\n        if (!site?.id)');
    expect(registryDataHook).toContain('loadItems(site.id, () => !isCurrentInit())');
    expect(registryDataHook).toContain('if (!isCurrentInit()) return;\n        setRegistryThankYouLedger(ledger);');
    expect(registryDataHook).toContain('if (requestId !== initRequestIdRef.current) return;\n        resetRegistryDashboardState();');
    expect(registryDataHook).toContain('if (requestId === initRequestIdRef.current) setLoading(false);');
  });

  it('shows copied vs downloaded registry link and duplicate-list labels in the route content', () => {
    const routeContent = readFileSync(join(process.cwd(), 'src/pages/dashboard/registry/RegistryDashboardRouteContent.tsx'), 'utf8');
    const maintenanceActions = readFileSync(join(process.cwd(), 'src/pages/dashboard/registry/useRegistryMaintenanceActions.ts'), 'utf8');

    expect(routeContent).toContain('const guestRegistryUrl = props.siteSlug ? `https://${props.siteSlug}.dayof.love/#registry` : null;');
    expect(routeContent).toContain("'Downloaded registry link'");
    expect(routeContent).toContain("'Copied registry link'");
    expect(routeContent).toContain("'Downloaded duplicate list'");
    expect(routeContent).toContain("'Copied duplicate list'");
    expect(routeContent).toContain("'Copying duplicate list...'");
    expect(maintenanceActions).toContain("async function handleCopyDuplicateReviewList(): Promise<CopyActionResult | null> {");
    expect(maintenanceActions).toContain('const duplicateReviewCopyRequestIdRef = useRef(0);');
    expect(maintenanceActions).toContain('const duplicateReviewContextKey = useMemo(() => JSON.stringify(duplicateGroups.map((group) => [');
    expect(maintenanceActions).toContain('const isCurrentDuplicateReviewCopy = () => (');
    expect(maintenanceActions).toContain('if (!isCurrentDuplicateReviewCopy()) return null;');
    expect(maintenanceActions).toContain('return result;');
    expect(maintenanceActions).toContain('return null;');
  });
});
