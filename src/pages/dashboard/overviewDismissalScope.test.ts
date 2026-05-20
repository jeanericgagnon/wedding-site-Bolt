import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('overview dismissal scope guards', () => {
  it('scopes overview intelligence dismissals to the active site storage context', () => {
    const routeSupport = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/useOverviewDashboardRouteSupport.ts'),
      'utf8',
    );
    const utils = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/overviewUtils.ts'),
      'utf8',
    );

    expect(utils).toContain("const OVERVIEW_DISMISSAL_STORAGE_KEY = 'dayof_intelligence_dismissed_v1';");
    expect(utils).toContain('export const buildOverviewDismissalStorageKey = (storageScope?: string | null): string => {');
    expect(routeSupport).toContain("const [activeSiteId, setActiveSiteId] = useState<string | null>(() => getStoredActiveSiteId());");
    expect(routeSupport).toContain('const storageKey = useMemo(() => buildOverviewDismissalStorageKey(activeSiteId), [activeSiteId]);');
    expect(routeSupport).toContain('setDismissedIntelligenceIds(readOverviewDismissalIds(storageKey));');
    expect(routeSupport).toContain('window.addEventListener(ACTIVE_SITE_STORAGE_CHANGED_EVENT, handleActiveSiteChanged);');
    expect(routeSupport).toContain('window.removeEventListener(ACTIVE_SITE_STORAGE_CHANGED_EVENT, handleActiveSiteChanged);');
  });
});
