import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
describe('event hub page boundary', () => {
  it('routes missing-slug, config-status, and live-content shells through dedicated components', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/EventHub.tsx'), 'utf8');
    const routeView = readFileSync(join(process.cwd(), 'src/pages/EventHubRouteView.tsx'), 'utf8');
    const liveContent = readFileSync(join(process.cwd(), 'src/pages/EventHubLiveContent.tsx'), 'utf8');

    expect(page).toContain("from './EventHubRouteView'");
    expect(page).toContain("from './EventHubLiveContent'");
    expect(page).toContain("from '../lib/guestHubOfflineSnapshot'");
    expect(page).toContain('<EventHubRouteView');
    expect(page).toContain('<EventHubLiveContent');
    expect(page).toContain('readGuestHubOfflineSnapshot(slug)');
    expect(page).toContain('writeGuestHubOfflineSnapshot(slug, {');
    expect(page).toContain('captureGuestInviteTokenFromSearch(slug, searchParams)');
    expect(page).toContain('const guestIdentity = useMemo(() => buildGuestHubIdentityPayload(slug, searchParams)');
    expect(page).toContain("'x-dayof-guest-invite-token'");
    expect(page).not.toContain('if (!slug) {');
    expect(routeView).toContain('if (!hasSlug) return <>{missingSlugView}</>;');
    expect(liveContent).toContain("from './EventHubConfigStatusCard'");
    expect(liveContent).toContain('<EventHubConfigStatusCard');
    expect(liveContent).toContain("Travel guest path");
    expect(liveContent).toContain("Travel quick plan");
    expect(liveContent).toContain("Latest update");
    expect(liveContent).toContain("Your day-of status");
    expect(liveContent).toContain("Coordinator handoff");
    expect(liveContent).toContain("Link access");
    expect(liveContent).toContain("Hub details");
  });
});
