import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPublicItineraryRows, hasLiveRegistryItems } from './siteViewService';

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

describe('siteViewService', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('keeps public itinerary and registry invokes behind the site view service', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/SiteView.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/siteViewService.ts'), 'utf8');

    expect(page).toContain("from './siteViewService'");
    expect(page).toContain('fetchPublicItineraryRows(siteSlug, access)');
    expect(page).toContain('hasLiveRegistryItems(data.id as string, subresourceAccess)');
    expect(page).not.toContain('hasLiveRegistryItems(siteId, access)');
    expect(page).not.toContain("supabase.functions.invoke('public-itinerary-by-slug'");
    expect(page).not.toContain("supabase.functions.invoke('public-registry-items'");
    expect(service).toContain("supabase.functions.invoke('public-itinerary-by-slug'");
    expect(service).toContain("supabase.functions.invoke('public-registry-items'");
  });

  it('loads public itinerary rows through the service', async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        events: [{ id: 'evt-1', event_name: 'Ceremony' }],
      },
      error: null,
    });

    await expect(fetchPublicItineraryRows('maya-leo', { inviteToken: 'token-1' })).resolves.toEqual([
      { id: 'evt-1', event_name: 'Ceremony' },
    ]);
  });

  it('checks whether live registry items exist through the service', async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        items: [{ id: 'item-1' }],
      },
    });

    await expect(hasLiveRegistryItems('site-1', { passwordSession: 'pw-session' })).resolves.toBe(true);
  });
});
