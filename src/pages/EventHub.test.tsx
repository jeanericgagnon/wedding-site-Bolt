import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
describe('event hub page boundary', () => {
  it('routes missing-slug, config-status, and live-content shells through dedicated components', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/EventHub.tsx'), 'utf8');
    const routeView = readFileSync(join(process.cwd(), 'src/pages/EventHubRouteView.tsx'), 'utf8');
    const liveContent = readFileSync(join(process.cwd(), 'src/pages/EventHubLiveContent.tsx'), 'utf8');
    const helpers = readFileSync(join(process.cwd(), 'src/pages/eventHubPageHelpers.ts'), 'utf8');

    expect(page).toContain("from './EventHubRouteView'");
    expect(page).toContain("from './EventHubLiveContent'");
    expect(page).toContain("from '../lib/guestHubOfflineSnapshot'");
    expect(page).toContain('<EventHubRouteView');
    expect(page).toContain('<EventHubLiveContent');
    expect(page).toContain('readGuestHubOfflineSnapshot(slug)');
    expect(page).toContain('writeGuestHubOfflineSnapshot(slug, {');
    expect(page).toContain('captureGuestInviteTokenFromSearch(slug, searchParams)');
    expect(page).toContain('const guestIdentity = useMemo(() => buildGuestHubIdentityPayload(slug, searchParams)');
    expect(helpers).toContain("'x-dayof-guest-invite-token'");
    expect(page).toContain("setHubConfigStatus((current) => (current === 'offline' ? current : 'ready'));");
    expect(page).not.toContain('if (!slug) {');
    expect(routeView).toContain('if (!hasSlug) return <>{missingSlugView}</>;');
    expect(liveContent).toContain("from './EventHubConfigStatusCard'");
    expect(liveContent).toContain('<EventHubConfigStatusCard');
    expect(liveContent).toContain("Travel path from this link");
    expect(liveContent).toContain("Travel plan from this link");
    expect(liveContent).toContain("Latest update for this link");
    expect(liveContent).toContain("Your status on this link");
    expect(liveContent).toContain("Coordinator handoff status");
    expect(liveContent).toContain("Access from this link");
    expect(liveContent).toContain("Readiness from this link");
  });

  it('guards travel-plan copy feedback against stale route and spotlight context', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/EventHub.tsx'), 'utf8');

    expect(page).toContain('const travelCopyContextKey = JSON.stringify({');
    expect(page).toContain('shareText: travelHubSpotlight?.shareText ?? null');
    expect(page).toContain('const requestContextKey = travelCopyContextKeyRef.current;');
    expect(page).toContain('requestContextKey === travelCopyContextKeyRef.current');
  });
});
