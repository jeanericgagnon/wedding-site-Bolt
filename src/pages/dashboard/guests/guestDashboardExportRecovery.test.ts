import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('guest dashboard export recovery', () => {
  it('catches guest export copy failures for update links and SMS RSVP links', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/guests/useGuestDashboardExports.ts'), 'utf8');

    expect(source).toContain("toast('Couldn’t copy the guest update link right now.', 'error');");
    expect(source).toContain("toast('Couldn’t copy the text RSVP links right now.', 'error');");
    expect(source).toContain('const publicSlug = loadPublicSlug');
    expect(source).toContain('const siteSlug = loadSiteSlug');
    expect(source).toContain('const exportCopyContextKey = useMemo(() => JSON.stringify({');
    expect(source).toContain('reminderGuestIds: reminderCandidates.map((guest) => [guest.id, guest.invite_token ?? null])');
    expect(source).toContain('const isCurrentExportCopyAction = beginExportCopyAction();');
    expect(source).toContain('if (!isCurrentExportCopyAction()) return null;');
  });

  it('catches duplicate review export copy failures in the registry maintenance actions', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/registry/useRegistryMaintenanceActions.ts'), 'utf8');

    expect(source).toContain("toast('Couldn’t copy the duplicate review list right now.', 'error');");
  });
});
