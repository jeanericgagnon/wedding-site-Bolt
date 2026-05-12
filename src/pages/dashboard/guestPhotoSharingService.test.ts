import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyPhotoBuckets } from '../../lib/aiPhotoBuckets';
import {
  analyzeGuestPhotoUploads,
  buildGuestPhotoBucketSiteUpdate,
  createGuestPhotoAlbum,
  createGuestPhotoBucketCorrection,
  exportGuestPhotoManifest,
  getGuestPhotoCurrentUserId,
  invokeGuestPhotoOwnerFunction,
  loadGuestPhotoDashboardSnapshot,
  manageGuestPhotoAlbum,
  moveGuestPhotoUploadToBucket,
  moderateGuestPhotoUploads,
  moderateGuestbookEntry,
  persistGuestPhotoAiOpsPlan,
  queueGuestPhotoFollowups,
  refreshGuestPhotoSession,
  resolveGuestPhotoDashboardUserId,
  saveGuestPhotoHubSettings,
} from './guestPhotoSharingService';

const { getSessionMock, getUserMock, refreshSessionMock, invokeFunctionOrThrowMock, fromMock, rpcMock, resolveActiveSiteForUserMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  getUserMock: vi.fn(),
  refreshSessionMock: vi.fn(),
  invokeFunctionOrThrowMock: vi.fn(),
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
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
    rpc: rpcMock,
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
    rpcMock.mockReset();
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

  it('runs guest photo upload analysis through the service helper', async () => {
    invokeFunctionOrThrowMock.mockResolvedValueOnce({ analyzed: 2, results: [] });

    await expect(analyzeGuestPhotoUploads('site-1', ['upload-1', 'upload-2'], true, 'vision')).resolves.toEqual({ analyzed: 2, results: [] });
    expect(invokeFunctionOrThrowMock).toHaveBeenCalledWith(
      expect.anything(),
      'photo-analyze-batch',
      { siteId: 'site-1', uploadIds: ['upload-1', 'upload-2'], limit: 2, force: true, mode: 'vision' },
    );
  });

  it('exports the guest photo manifest through the service helper', async () => {
    invokeFunctionOrThrowMock.mockResolvedValueOnce({ rows: [{ id: 'row-1' }] });

    await expect(exportGuestPhotoManifest('site-1', true)).resolves.toEqual({ rows: [{ id: 'row-1' }] });
    expect(invokeFunctionOrThrowMock).toHaveBeenCalledWith(
      expect.anything(),
      'photo-export-manifest',
      { siteId: 'site-1', includeHidden: true },
    );
  });

  it('moderates guest photo uploads through the service helper', async () => {
    invokeFunctionOrThrowMock.mockResolvedValueOnce({ ok: true });

    await expect(moderateGuestPhotoUploads(['upload-1'], { is_hidden: true })).resolves.toBeUndefined();
    expect(invokeFunctionOrThrowMock).toHaveBeenCalledWith(
      expect.anything(),
      'photo-upload-moderate',
      { uploadIds: ['upload-1'], patch: { is_hidden: true } },
    );
  });

  it('manages guest photo albums through the service helper', async () => {
    invokeFunctionOrThrowMock.mockResolvedValueOnce({ uploadUrl: 'https://example.com/upload' });

    await expect(manageGuestPhotoAlbum({ action: 'regenerate_link', albumId: 'album-1' })).resolves.toEqual({ uploadUrl: 'https://example.com/upload' });
    expect(invokeFunctionOrThrowMock).toHaveBeenCalledWith(
      expect.anything(),
      'photo-album-manage',
      { action: 'regenerate_link', albumId: 'album-1' },
    );
  });

  it('creates guest photo albums through the service helper', async () => {
    invokeFunctionOrThrowMock.mockResolvedValueOnce({ album: { id: 'album-1', name: 'Ceremony' }, uploadUrl: 'https://example.com/upload' });

    await expect(createGuestPhotoAlbum({ siteId: 'site-1', name: 'Ceremony', itineraryEventId: 'event-1' })).resolves.toEqual({
      album: { id: 'album-1', name: 'Ceremony' },
      uploadUrl: 'https://example.com/upload',
    });
    expect(invokeFunctionOrThrowMock).toHaveBeenCalledWith(
      expect.anything(),
      'photo-album-create',
      { siteId: 'site-1', name: 'Ceremony', itineraryEventId: 'event-1' },
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

  it('saves guest hub settings through the service', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: 'user-1' } } });
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(saveGuestPhotoHubSettings('site-1', {
      rsvp_enabled: true,
      photos_enabled: true,
      guestbook_enabled: true,
      registry_enabled: true,
      schedule_enabled: true,
      travel_enabled: true,
      recap_status: 'draft',
      recap_published_at: null,
      recap_closed_at: null,
      custom_message: '',
      language_default: 'en',
    })).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenCalledWith('guest_hub_settings_write', expect.objectContaining({
      p_wedding_site_id: 'site-1',
    }));
  });

  it('moderates guestbook entries through the service', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(moderateGuestbookEntry('entry-1', { is_hidden: true })).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenCalledWith('guestbook_entry_moderate', {
      p_entry_id: 'entry-1',
      p_payload: expect.objectContaining({ is_hidden: true }),
    });
  });

  it('persists guest photo AI ops plans through the service', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: { wedding_data: { meta: { existing: true } } },
      error: null,
    });
    const readEqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
    fromMock
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: readEqMock,
        })),
      });
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(persistGuestPhotoAiOpsPlan('site-1', { summary: 'plan' })).resolves.toBeUndefined();
    expect(readEqMock).toHaveBeenCalledWith('id', 'site-1');
    expect(rpcMock).toHaveBeenCalledWith('wedding_site_settings_patch', {
      p_wedding_site_id: 'site-1',
      p_patch: {
        wedding_data: {
          meta: {
            existing: true,
            aiPhotoOps: { summary: 'plan' },
          },
        },
      },
    });
  });

  it('moves guest photo uploads through the service', async () => {
    rpcMock.mockResolvedValueOnce({ error: null });

    await expect(moveGuestPhotoUploadToBucket('site-1', 'upload-1', 'album-2')).resolves.toBeUndefined();
    expect(rpcMock).toHaveBeenCalledWith('photo_upload_bucket_move', {
      p_wedding_site_id: 'site-1',
      p_upload_id: 'upload-1',
      p_photo_album_id: 'album-2',
    });
  });

  it('creates guest photo bucket corrections through the service', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: 'user-1' } } });

    rpcMock.mockResolvedValueOnce({
      data: {
        id: 'correction-1',
        upload_id: 'upload-1',
        action: 'accepted',
        previous_bucket_id: 'album-1',
        suggested_bucket_id: 'album-2',
        chosen_bucket_id: 'album-2',
        confidence: 0.9,
        reason: 'Accepted album suggestion.',
        created_at: 'now',
      },
      error: null,
    });

    await expect(createGuestPhotoBucketCorrection(
      'site-1',
      {
        id: 'analysis-1',
        upload_id: 'upload-1',
        wedding_site_id: 'site-1',
        photo_album_id: 'album-1',
        status: 'ready',
        detected_moment: 'dance-floor',
        suggested_bucket_id: 'album-2',
        suggested_bucket_name: 'Reception',
        bucket_confidence: 0.9,
        quality_score: 0.8,
        blur_score: 0.1,
        people_count_range: '2-4',
        is_video: false,
        slideshow_priority: 50,
        caption: 'Caption',
        tags: [],
        warnings: [],
        error_message: null,
        analyzed_at: 'now',
      },
      'accepted',
      'album-2',
      'Accepted album suggestion.',
    )).resolves.toMatchObject({ id: 'correction-1', upload_id: 'upload-1' });
    expect(rpcMock).toHaveBeenCalledWith('photo_ai_bucket_correction_write', expect.objectContaining({
      p_wedding_site_id: 'site-1',
    }));
  });
});
