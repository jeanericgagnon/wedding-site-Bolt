import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('planning route sync guards', () => {
  it('drives planning tab sync from live router search params instead of window location', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/Planning.tsx'),
      'utf8',
    );

    expect(source).toContain("const [searchParams] = useSearchParams();");
    expect(source).toContain("const tabFromSearch = resolvePlanningTabFromSearch(searchParams.toString());");
    expect(source).toContain("setActiveTab(tabFromSearch ?? 'overview');");
    expect(source).toContain('}, [searchParams]);');
    expect(source).not.toContain('resolvePlanningTabFromSearch(window.location.search)');
    expect(source).not.toContain('ensurePlanningLocationEventsPatched');
  });

  it('reopens builder top-bar helper surfaces from live route changes', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/builder/components/BuilderTopBar.tsx'),
      'utf8',
    );

    expect(source).toContain('if (shouldOpenPhotoTipsFromSearch(location.search)) {');
    expect(source).toContain('if (initialPublishChecklistOpen || shouldOpenPublishChecklistFromSearch(location.search)) {');
    expect(source).toContain('}, [initialPublishChecklistOpen, location.search]);');
  });

  it('keeps planning name-change hash routing inside React Router instead of mutating window history directly', () => {
    const plannerTabSource = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/planning/NameChangePlannerTab.tsx'),
      'utf8',
    );
    const overviewSource = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/planning/PlanningOverviewTab.tsx'),
      'utf8',
    );

    expect(plannerTabSource).toContain("import { useLocation, useNavigate } from 'react-router-dom';");
    expect(plannerTabSource).toContain('const location = useLocation();');
    expect(plannerTabSource).toContain('const navigate = useNavigate();');
    expect(plannerTabSource).toContain('hash: `#${targetId}`,');
    expect(plannerTabSource).not.toContain('window.history.replaceState');
    expect(plannerTabSource).not.toContain("window.addEventListener('hashchange'");

    expect(overviewSource).toContain("import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';");
    expect(overviewSource).toContain('const location = useLocation();');
    expect(overviewSource).toContain('const navigate = useNavigate();');
    expect(overviewSource).toContain("hash: `#${hash || 'name-change-roadmap'}`,");
    expect(overviewSource).not.toContain('window.history.replaceState');
  });

  it('restores dashboard route-driven defaults when special query params disappear', () => {
    const settingsSource = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/Settings.tsx'),
      'utf8',
    );
    const guestsSource = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/Guests.tsx'),
      'utf8',
    );

    expect(settingsSource).toContain("const nextTab = routeState.activeTab ?? 'account';");
    expect(guestsSource).toContain("setGuestsTab(routeState.guestsTab ?? 'ops');");
    expect(guestsSource).toContain("setViewMode(routeState.viewMode ?? 'households');");
    expect(guestsSource).toContain("setFilterStatus(routeState.filterStatus ?? 'all');");
    expect(guestsSource).toContain('setShowInsights(routeState.showInsights ?? false);');
    expect(guestsSource).toContain('setShowOpsMenu(routeState.showOpsMenu ?? false);');
  });
});
