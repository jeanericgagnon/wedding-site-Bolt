import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('dashboard route access guards', () => {
  it('keeps activity accessible as a first-class dashboard page for signed-in roles', () => {
    const layout = readFileSync(join(process.cwd(), 'src/components/dashboard/DashboardLayout.tsx'), 'utf8');

    expect(layout).toContain("if (itemId === 'activity') return true;");
  });

  it('waits for site context before redirecting guarded dashboard pages back to home', () => {
    const layout = readFileSync(join(process.cwd(), 'src/components/dashboard/DashboardLayout.tsx'), 'utf8');

    expect(layout).toContain("const [siteContextReady, setSiteContextReady] = useState(false);");
    expect(layout).toContain("if (!siteContextReady || !activeSiteRole) return;");
    expect(layout).toContain('setSiteContextReady(true);');
  });

  it('keeps more tools exportable through the route lazy loader', () => {
    const moreTools = readFileSync(join(process.cwd(), 'src/pages/dashboard/MoreTools.tsx'), 'utf8');

    expect(moreTools).toContain('export default DashboardMoreTools;');
  });
});
