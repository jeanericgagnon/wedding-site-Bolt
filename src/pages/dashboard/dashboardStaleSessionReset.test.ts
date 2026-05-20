import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('dashboard stale-session reset guards', () => {
  it('clears message dashboard role and site state when the active user disappears', () => {
    const source = read('src/pages/dashboard/messages/useMessageDashboardData.ts');

    expect(source).toContain('const resetMessageDashboardState = useCallback(() => {');
    expect(source).toContain("setMessagesRole('owner');");
    expect(source).toContain("setActiveSiteRole('owner');");
    expect(source).toContain('setMessagesPermissions(null);');
    expect(source).toContain('if (!userId) {\n      resetMessageDashboardState();\n      setLoading(false);\n      return;\n    }');
  });

  it('ignores stale message active-site lookups after a newer context starts loading', () => {
    const source = read('src/pages/dashboard/messages/useMessageDashboardData.ts');

    expect(source).toContain('const weddingSiteRequestIdRef = useRef(0);');
    expect(source).toContain('const requestId = ++weddingSiteRequestIdRef.current;');
    expect(source).toContain('if (requestId !== weddingSiteRequestIdRef.current) return;\n      setActiveSiteRole(activeSite?.role ?? \'owner\');');
    expect(source).toContain('if (requestId !== weddingSiteRequestIdRef.current) return;\n      toast(\'Couldn’t load your messages right now. Please try again.\', \'error\');');
  });

  it('ignores stale message per-site loader responses after the wedding site changes', () => {
    const source = read('src/pages/dashboard/messages/useMessageDashboardData.ts');

    expect(source).toContain('const currentWeddingSiteIdRef = useRef<string | null>(weddingSite?.id ?? null);');
    expect(source).toContain('currentWeddingSiteIdRef.current = weddingSite?.id ?? null;');
    expect(source).toContain('const isCurrentWeddingSite = useCallback((siteId: string) => currentWeddingSiteIdRef.current === siteId, []);');
    expect(source).toContain('const data = await loadDashboardMessages(siteId);\n      if (!isCurrentWeddingSite(siteId)) return;\n      setMessages(data);');
    expect(source).toContain('const data = await loadMessageGuests(siteId);\n      if (!isCurrentWeddingSite(siteId)) return;\n      setGuests(data);');
    expect(source).toContain('const data = await loadMessageDeliveries(messageIds);\n      if (!isCurrentWeddingSite(siteId)) return;');
    expect(source).toContain('const { options, guestIdsByEvent } = await loadMessageItineraryAudience(siteId);\n      if (!isCurrentWeddingSite(siteId)) return;');
    expect(source).toContain('const { expiringSoon, transactions } = await loadSmsCreditPreview(siteId, cutoff);\n      if (!isCurrentWeddingSite(siteId)) return;');
    expect(source).toContain("toast('Couldn’t load message history right now. Please try again.', 'error');");
  });

  it('clears guest photo dashboard state when the active session disappears', () => {
    const source = read('src/pages/dashboard/guestPhotos/useGuestPhotoDashboardData.ts');

    expect(source).toContain('const loadRequestIdRef = useRef(0);');
    expect(source).toContain('const resetGuestPhotoDashboardState = useCallback(() => {');
    expect(source).toContain('setBucketUploadLinks({});');
    expect(source).toContain('setAiPhotoOpsPlan(null);');
    expect(source).toContain('setPhotoBuckets(createEmptyPhotoBuckets());');
    expect(source).toContain('const activeRequestId = requestId ?? ++loadRequestIdRef.current;');
    expect(source).toContain('const isCurrentLoad = () => activeRequestId === loadRequestIdRef.current;');
    expect(source).toContain('if (!isCurrentLoad()) return;');
    expect(source).toContain('await load(true, activeRequestId);');
    expect(source).toContain('if (isCurrentLoad()) setLoading(false);');
    expect(source).toContain('if (!userId) {\n        resetGuestPhotoDashboardState();\n        throw new Error(\'Your session needs a quick refresh. Please refresh and try again.\');\n      }');
  });

  it('ignores stale guest dashboard site settings and guest snapshot responses', () => {
    const source = read('src/pages/dashboard/guests/useGuestDashboardData.ts');

    expect(source).toContain('const siteSettingsRequestIdRef = useRef(0);');
    expect(source).toContain('const currentGuestWeddingSiteIdRef = useRef<string | null>(weddingSiteId);');
    expect(source).toContain('currentGuestWeddingSiteIdRef.current = weddingSiteId;');
    expect(source).toContain('const isCurrentGuestWeddingSite = useCallback((siteId: string) => currentGuestWeddingSiteIdRef.current === siteId, []);');
    expect(source).toContain('const requestId = ++siteSettingsRequestIdRef.current;');
    expect(source).toContain('if (requestId !== siteSettingsRequestIdRef.current) return;\n      setGuestsRole(snapshot.role);');
    expect(source).toContain('if (requestId !== siteSettingsRequestIdRef.current) return;\n      resetGuestDashboardState();');
    expect(source).toContain('const snapshot = await loadGuestDashboardSnapshot(weddingSiteId);\n      if (!isCurrentGuestWeddingSite(weddingSiteId)) return;');
    expect(source).toContain('if (!isCurrentGuestWeddingSite(weddingSiteId)) return;\n      setGuests([]);');
    expect(source).toContain('if (isCurrentGuestWeddingSite(weddingSiteId)) setLoading(false);');
  });
});
