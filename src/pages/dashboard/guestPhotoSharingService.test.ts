import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyPhotoBuckets } from '../../lib/aiPhotoBuckets';
import {
  buildGuestPhotoBucketSiteUpdate,
  getGuestPhotoCurrentUserId,
  invokeGuestPhotoOwnerFunction,
  queueGuestPhotoFollowups,
  refreshGuestPhotoSession,
  resolveGuestPhotoDashboardUserId,
} from './guestPhotoSharingService';

const { getSessionMock, getUserMock, refreshSessionMock, invokeFunctionOrThrowMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  getUserMock: vi.fn(),
  refreshSessionMock: vi.fn(),
  invokeFunctionOrThrowMock: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      getUser: getUserMock,
      refreshSession: refreshSessionMock,
    },
    from: vi.fn(),
  },
}));

vi.mock('../../lib/invokeFunctionOrThrow', () => ({
  invokeFunctionOrThrow: invokeFunctionOrThrowMock,
}));

describe('guestPhotoSharingService', () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    getUserMock.mockReset();
    refreshSessionMock.mockReset();
    invokeFunctionOrThrowMock.mockReset();
  });

  it('preserves existing wedding data meta while replacing photo buckets', () => {
    const buckets = {
      ...createEmptyPhotoBuckets(),
      'main-couple': [{ id: 'photo-1', url: 'https://example.com/photo.jpg', bucket: 'main-couple' as const }],
    };

    expect(buildGuestPhotoBucketSiteUpdate({
      wedding_data: {
        couple: { name: 'Alex and Jordan' },
        meta: {
          existing: true,
          photoBuckets: { old: [] },
        },
      },
      site_json: { sections: [] },
    }, buckets)).toEqual({
      wedding_data: {
        couple: { name: 'Alex and Jordan' },
        meta: {
          existing: true,
          photoBuckets: buckets,
        },
      },
      site_json: { sections: [] },
    });
  });

  it('returns whether refreshing the guest photo session produced a session', async () => {
    refreshSessionMock.mockResolvedValueOnce({ data: { session: { user: { id: 'user-1' } } } });
    await expect(refreshGuestPhotoSession()).resolves.toBe(true);

    refreshSessionMock.mockResolvedValueOnce({ data: { session: null } });
    await expect(refreshGuestPhotoSession()).resolves.toBe(false);
  });

  it('reads the current guest photo user id from auth', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: 'user-42' } } });
    await expect(getGuestPhotoCurrentUserId()).resolves.toBe('user-42');
  });

  it('falls back from current user to session and then refresh for dashboard user lookup', async () => {
    getSessionMock
      .mockResolvedValueOnce({ data: { session: null } })
      .mockResolvedValueOnce({ data: { session: { user: { id: 'session-user' } } } });
    getUserMock.mockResolvedValueOnce({ data: { user: null } });

    await expect(resolveGuestPhotoDashboardUserId()).resolves.toBe('session-user');
    expect(refreshSessionMock).not.toHaveBeenCalled();

    getSessionMock
      .mockResolvedValueOnce({ data: { session: null } })
      .mockResolvedValueOnce({ data: { session: null } });
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    refreshSessionMock.mockResolvedValueOnce({ data: { session: { user: { id: 'refreshed-user' } } } });

    await expect(resolveGuestPhotoDashboardUserId()).resolves.toBe('refreshed-user');
  });

  it('retries guest photo owner function calls after refreshing auth for authish failures', async () => {
    invokeFunctionOrThrowMock
      .mockRejectedValueOnce(new Error('invalid jwt'))
      .mockResolvedValueOnce({ ok: true });
    refreshSessionMock.mockResolvedValueOnce({ data: { session: { user: { id: 'user-1' } } } });

    await expect(invokeGuestPhotoOwnerFunction('photo-export-manifest', { siteId: 'site-1' })).resolves.toEqual({ ok: true });
    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(invokeFunctionOrThrowMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      'photo-export-manifest',
      { siteId: 'site-1' },
    );
    expect(invokeFunctionOrThrowMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      'photo-export-manifest',
      { siteId: 'site-1' },
    );
  });

  it('queues guest photo followups through the service helper', async () => {
    invokeFunctionOrThrowMock.mockResolvedValueOnce({ queued: 3 });

    await expect(queueGuestPhotoFollowups('site-1', 'recap')).resolves.toEqual({ queued: 3 });
    expect(invokeFunctionOrThrowMock).toHaveBeenCalledWith(
      expect.anything(),
      'queue-guest-followups',
      { siteId: 'site-1', kind: 'recap' },
    );
  });
});
