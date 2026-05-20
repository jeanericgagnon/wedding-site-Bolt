import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('dashboard route flag reset guards', () => {
  it('keeps overview detail mode synced to live router search params', () => {
    const source = read('src/pages/dashboard/useOverviewDashboardData.ts');

    expect(source).toContain("const [searchParams] = useSearchParams();");
    expect(source).toContain("const [showMoreDetail, setShowMoreDetail] = useState(() => searchParams.get('details') === '1');");
    expect(source).toContain("setShowMoreDetail(searchParams.get('details') === '1');");
    expect(source).toContain("}, [searchParams]);");
  });

  it('keeps message sending details synced to live router search params', () => {
    const source = read('src/pages/dashboard/messages/useMessageDashboardUiState.ts');

    expect(source).toContain("const [searchParams] = useSearchParams();");
    expect(source).toContain("const [showSendingDetails, setShowSendingDetails] = useState(() => searchParams.get('details') === '1');");
    expect(source).toContain("setShowSendingDetails(searchParams.get('details') === '1');");
    expect(source).toContain("}, [searchParams]);");
  });

  it('keeps the vault anniversary tool deep-link tied to the current route query', () => {
    const source = read('src/pages/dashboard/Vault.tsx');

    expect(source).toContain("const [searchParams] = useSearchParams();");
    expect(source).toContain("if (searchParams.get('tool') !== 'anniversary-capsules') return;");
    expect(source).toContain("}, [location.hash, location.pathname, navigate, searchParams]);");
  });

  it('keeps planning QA mode and overview proof mode tied to the current route query', () => {
    const planningSource = read('src/pages/dashboard/Planning.tsx');
    const overviewRouteSource = read('src/pages/dashboard/useOverviewDashboardRouteSupport.ts');

    expect(planningSource).toContain("const [searchParams] = useSearchParams();");
    expect(planningSource).toContain("const starterSuiteQaRunId = searchParams.get('starterSuiteQa') ?? '';");
    expect(overviewRouteSource).toContain("const [searchParams] = useSearchParams();");
    expect(overviewRouteSource).toContain("const showInternalProof = searchParams.get('proof') === '1';");
  });
});
