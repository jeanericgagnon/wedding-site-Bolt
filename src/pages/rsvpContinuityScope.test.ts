import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('RSVP continuity scope guards', () => {
  it('scopes RSVP continuity storage and listeners to the active wedding site', () => {
    const rsvpTypes = readFileSync(join(process.cwd(), 'src/pages/rsvpTypes.ts'), 'utf8');
    const rsvpPage = readFileSync(join(process.cwd(), 'src/pages/RSVP.tsx'), 'utf8');
    const eventRsvpPage = readFileSync(join(process.cwd(), 'src/pages/EventRSVP.tsx'), 'utf8');
    const guestLookup = readFileSync(join(process.cwd(), 'src/pages/runRsvpGuestLookup.ts'), 'utf8');
    const messagesPage = readFileSync(join(process.cwd(), 'src/pages/dashboard/Messages.tsx'), 'utf8');
    const continuityHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/messages/useMessageDashboardContinuitySync.ts'), 'utf8');

    expect(rsvpTypes).toContain('export function buildRsvpContinuityStorageKey(siteSlug?: string | null): string {');

    expect(rsvpPage).toContain('const [continuitySiteSlug, setContinuitySiteSlug] = useState<string | null>(null);');
    expect(rsvpPage).toContain('const continuityStorageKey = useMemo(');
    expect(rsvpPage).toContain('notifyRsvpContinuityUpdate: () => notifyRsvpContinuityUpdate(continuitySiteSlug),');
    expect(rsvpPage).toContain('if (event.key !== continuityStorageKey || !isFreshRsvpContinuityStorageValue(event.newValue)) return;');
    expect(rsvpPage).toContain('if (continuityEvent.detail?.storageKey && continuityEvent.detail.storageKey !== continuityStorageKey) return;');

    expect(guestLookup).toContain('onLookupSiteResolved?: (siteSlug: string) => void;');
    expect(guestLookup).toContain('onLookupSiteResolved?.(trackedSiteSlug);');

    expect(eventRsvpPage).toContain('const [continuitySiteSlug, setContinuitySiteSlug] = useState<string | null>(null);');
    expect(eventRsvpPage).toContain('continuityStorageKeyRef.current = buildRsvpContinuityStorageKey(continuitySiteSlug);');
    expect(eventRsvpPage).toContain('notifyRsvpContinuityUpdate(continuitySiteSlug);');
    expect(eventRsvpPage).toContain('if (event.key !== continuityStorageKeyRef.current || !isFreshRsvpContinuityStorageValue(event.newValue)) return;');

    expect(messagesPage).toContain('siteSlug: weddingSite?.site_slug ?? null,');
    expect(continuityHook).toContain('export function shouldRefreshForRsvpContinuityEvent(');
    expect(continuityHook).toContain('const continuityStorageKey = buildRsvpContinuityStorageKey(siteSlug);');
    expect(continuityHook).toContain('if (event.key !== continuityStorageKey || !isFreshRsvpContinuityStorageValue(event.newValue)) return;');
    expect(continuityHook).toContain('if (!shouldRefreshForRsvpContinuityEvent(continuityEvent.detail, continuityStorageKey, siteSlug)) return;');
  });
});
