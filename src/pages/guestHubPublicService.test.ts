import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchGuestHubConfig,
  fetchGuestRecapConfig,
  getGuestHubPublicBaseHeaders,
  hasGuestHubPublicRuntime,
  submitGuestHubProspect,
  trackGuestHubEvent,
} from './guestHubPublicService';

describe('guestHubPublicService', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('exposes runtime-aware public headers', () => {
    expect(hasGuestHubPublicRuntime()).toBe(true);
    expect(getGuestHubPublicBaseHeaders({ 'x-dayof-invite-token': 'invite', 'x-dayof-guest-invite-token': 'guest-token' })).toEqual(
      expect.objectContaining({
        apikey: expect.any(String),
        'x-dayof-invite-token': 'invite',
        'x-dayof-guest-invite-token': 'guest-token',
      }),
    );
  });

  it('loads guest hub config through the shared service', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ settings: { guestbook_enabled: true } }),
    }));

    await expect(fetchGuestHubConfig('maya-leo', { 'x-dayof-invite-token': 'invite' })).resolves.toEqual({
      settings: { guestbook_enabled: true },
    });
  });

  it('loads recap config through the shared service', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ site: { slug: 'maya-leo' }, summary: { uploadCount: 1 }, highlights: [], chapters: [] }),
    }));

    await expect(fetchGuestRecapConfig('maya-leo', {})).resolves.toEqual({
      site: { slug: 'maya-leo' },
      summary: { uploadCount: 1 },
      highlights: [],
      chapters: [],
    });
  });

  it('tracks guest hub events through the shared service', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: vi.fn() });
    vi.stubGlobal('fetch', fetchMock);

    await expect(trackGuestHubEvent('maya-leo', 'click', '/event/photos', { inviteToken: 'invite' })).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/guest-hub-track'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          siteSlug: 'maya-leo',
          eventType: 'click',
          target: '/event/photos',
          inviteToken: 'invite',
        }),
      }),
    );
  });

  it('submits guest hub prospects through the shared service', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    }));

    await expect(submitGuestHubProspect({ siteSlug: 'maya-leo', email: 'guest@example.com' }, 'Could not save.')).resolves.toEqual({ ok: true });
  });
});
