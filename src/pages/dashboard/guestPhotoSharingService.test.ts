import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyPhotoBuckets } from '../../lib/aiPhotoBuckets';
import {
  buildGuestPhotoBucketSiteUpdate,
  getGuestPhotoCurrentUserId,
  invokeGuestPhotoOwnerFunction,
  loadGuestPhotoDashboardSnapshot,
  queueGuestPhotoFollowups,
  refreshGuestPhotoSession,
  resolveGuestPhotoDashboardUserId,
} from './guestPhotoSharingService';

const { getSessionMock, getUserMock, refreshSessionMock, invokeFunctionOrThrowMock, fromMock, resolveActiveSiteForUserMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  getUserMock: vi.fn(),
  refreshSessionMock: vi.fn(),
  invokeFunctionOrThrowMock: vi.fn(),
  fromMock: vi.fn(),
  resolveActiveSiteForUserMock: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      getUser: getUserMock,
      refreshSession: refreshSessionMock,
    },
    from: fromMock,
  },
}));

vi.mock('../../lib/activeSite', () => ({
  resolveActiveSiteForUser: resolveActiveSiteForUserMock,
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
    fromMock.mockReset();
    resolveActiveSiteForUserMock.mockReset();
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

  it('loads the guest photo dashboard snapshot through the service', async () => {
    resolveActiveSiteForUserMock.mockResolvedValueOnce({ id: 'site-1' });

    fromMock
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'site-1', site_slug: 'maya-and-leo', wedding_data: { meta: { photoBuckets: { hero: [] } } } },
              error: null,
            }),
          })),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [{ id: 'event-1', event_name: 'Ceremony', event_date: '2026-06-20', start_time: '16:00', end_time: '16:30' }], error: null }),
              })),
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [{ id: 'album-1', name: 'Ceremony', slug: 'ceremony', parent_album_id: null, hierarchy_label: 'Ceremony', drive_folder_url: null, is_active: true, created_at: 'now', itinerary_event_id: 'event-1', opens_at: null, closes_at: null }], error: null }),
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [{ id: 'upload-1', photo_album_id: 'album-1', original_filename: 'photo.jpg', guest_name: 'Alex', guest_email: null, note: null, mime_type: 'image/jpeg', size_bytes: 123, drive_web_view_link: null, is_hidden: false, is_flagged: false, recap_hidden: false, recap_featured: false, recap_story: false, uploaded_at: 'now' }], error: null }),
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [{ id: 'guestbook-1', guest_name: 'Alex', guest_email: null, message: 'Congrats', is_hidden: false, is_flagged: false, created_at: 'now' }] }),
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [{ id: 'prospect-1', guest_name: 'Alex', email: 'alex@example.com', phone: null, source: 'upload', wants_photo_updates: true, wants_own_event_info: false, recap_email_queued_at: null, future_event_email_queued_at: null, created_at: 'now' }] }),
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [{ id: 'analysis-1', upload_id: 'upload-1', wedding_site_id: 'site-1', photo_album_id: 'album-1', status: 'done', detected_moment: null, suggested_bucket_id: null, suggested_bucket_name: null, bucket_confidence: null, quality_score: null, blur_score: null, people_count_range: null, is_video: false, slideshow_priority: null, caption: null, tags: [], warnings: [], error_message: null, analyzed_at: 'now' }] }),
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [{ upload_id: 'upload-1', taken_at: null, width: 100, height: 100, has_exif: false, has_gps: false, file_sha256: null, perceptual_hash: null, location_label: null, event_match_id: null, event_match_confidence: null, event_match_reason: null }] }),
          })),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [{ id: 'correction-1', upload_id: 'upload-1', action: 'accept', previous_bucket_id: null, suggested_bucket_id: null, chosen_bucket_id: 'album-1', confidence: null, reason: null, created_at: 'now' }] }),
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: { photos_enabled: true, custom_message: null, language_default: 'en' } }),
          })),
        })),
      });

    await expect(loadGuestPhotoDashboardSnapshot('user-1')).resolves.toMatchObject({
      siteId: 'site-1',
      siteSlug: 'maya-and-leo',
      events: [{ id: 'event-1', event_name: 'Ceremony' }],
      buckets: [{ id: 'album-1', name: 'Ceremony' }],
      uploads: [{ id: 'upload-1' }],
      guestbookEntries: [{ id: 'guestbook-1' }],
      guestProspects: [{ id: 'prospect-1' }],
      uploadAnalyses: [{ id: 'analysis-1' }],
      uploadMetadata: [{ upload_id: 'upload-1' }],
      aiBucketCorrections: [{ id: 'correction-1' }],
      hubSettings: expect.objectContaining({ photos_enabled: true, language_default: 'en' }),
    });
  });
});
