import { describe, expect, it } from 'vitest';
import { buildMemoryFlowReadiness } from './memoryFlowReadiness';

describe('memoryFlowReadiness', () => {
  it('marks the no-app memory flow ready when albums, hub, moderation, guestbook, and recap are in shape', () => {
    const readiness = buildMemoryFlowReadiness({
      albumCount: 3,
      activeAlbumCount: 2,
      uploadCount: 24,
      videoUploadCount: 2,
      guestbookEnabled: true,
      guestbookCount: 6,
      photoUploadEnabled: true,
      flaggedUploadCount: 0,
      reviewQueueCount: 0,
      recapStatus: 'published',
      recapFeaturedCount: 4,
      recapStoryCount: 3,
      slideshowFrameCount: 12,
      slideshowReadyAlbumCount: 2,
      guestHubActionCount: 5,
      guestProspectCount: 8,
    });

    expect(readiness.readyCount).toBe(9);
    expect(readiness.blockers).toEqual([]);
    expect(readiness.steps.find((step) => step.id === 'video-capture')?.status).toBe('ready');
    expect(readiness.steps.find((step) => step.id === 'slideshow')?.status).toBe('ready');
    expect(readiness.steps.find((step) => step.id === 'export')?.detail).toContain('full-resolution download jobs can be saved');
  });

  it('surfaces concrete actions when sharing or moderation is not ready', () => {
    const readiness = buildMemoryFlowReadiness({
      albumCount: 2,
      activeAlbumCount: 0,
      uploadCount: 10,
      videoUploadCount: 0,
      guestbookEnabled: false,
      guestbookCount: 0,
      photoUploadEnabled: true,
      flaggedUploadCount: 2,
      reviewQueueCount: 3,
      recapStatus: 'draft',
      recapFeaturedCount: 1,
      recapStoryCount: 0,
      slideshowFrameCount: 0,
      slideshowReadyAlbumCount: 0,
      guestHubActionCount: 0,
      guestProspectCount: 0,
    });

    expect(readiness.steps.find((step) => step.id === 'guest-hub')?.status).toBe('needs-action');
    expect(readiness.steps.find((step) => step.id === 'album-links')?.status).toBe('needs-action');
    expect(readiness.steps.find((step) => step.id === 'guestbook')?.status).toBe('planned');
    expect(readiness.steps.find((step) => step.id === 'moderation')?.status).toBe('needs-action');
    expect(readiness.steps.find((step) => step.id === 'slideshow')?.status).toBe('needs-action');
    expect(readiness.steps.find((step) => step.id === 'recap')?.status).toBe('needs-action');
    expect(readiness.steps.find((step) => step.id === 'export')?.status).toBe('needs-action');
    expect(readiness.blockers.length).toBeGreaterThanOrEqual(4);
  });

  it('keeps guestbook off as an optional planned step instead of a blocker', () => {
    const readiness = buildMemoryFlowReadiness({
      albumCount: 2,
      activeAlbumCount: 1,
      uploadCount: 6,
      videoUploadCount: 1,
      guestbookEnabled: false,
      guestbookCount: 0,
      photoUploadEnabled: true,
      flaggedUploadCount: 0,
      reviewQueueCount: 0,
      recapStatus: 'private_link',
      recapFeaturedCount: 2,
      recapStoryCount: 1,
      slideshowFrameCount: 4,
      slideshowReadyAlbumCount: 1,
      guestHubActionCount: 4,
      guestProspectCount: 1,
    });

    expect(readiness.steps.find((step) => step.id === 'guestbook')).toMatchObject({
      status: 'planned',
      detail: 'Guestbook notes are optional and currently off in the guest hub controls.',
    });
    expect(readiness.blockers).not.toContain('Guestbook notes are optional and currently off in the guest hub controls.');
  });

  it('keeps empty states distinct from blockers before guests submit anything', () => {
    const readiness = buildMemoryFlowReadiness({
      albumCount: 0,
      activeAlbumCount: 0,
      uploadCount: 0,
      videoUploadCount: 0,
      guestbookEnabled: true,
      guestbookCount: 0,
      photoUploadEnabled: true,
      flaggedUploadCount: 0,
      reviewQueueCount: 0,
      recapStatus: 'draft',
      recapFeaturedCount: 0,
      recapStoryCount: 0,
      slideshowFrameCount: 0,
      slideshowReadyAlbumCount: 0,
      guestHubActionCount: 2,
      guestProspectCount: 0,
    });

    expect(readiness.steps.find((step) => step.id === 'album-links')?.status).toBe('empty');
    expect(readiness.steps.find((step) => step.id === 'video-capture')?.status).toBe('planned');
    expect(readiness.steps.find((step) => step.id === 'moderation')?.status).toBe('empty');
    expect(readiness.steps.find((step) => step.id === 'slideshow')?.status).toBe('empty');
    expect(readiness.steps.find((step) => step.id === 'follow-up')?.status).toBe('empty');
    expect(readiness.steps.find((step) => step.id === 'export')?.detail).toContain('full-resolution download jobs');
    expect(readiness.blockers).toEqual([]);
  });

  it('does not call handoff exports ready when flagged uploads still need review', () => {
    const readiness = buildMemoryFlowReadiness({
      albumCount: 1,
      activeAlbumCount: 1,
      uploadCount: 5,
      videoUploadCount: 1,
      guestbookEnabled: true,
      guestbookCount: 1,
      photoUploadEnabled: true,
      flaggedUploadCount: 1,
      reviewQueueCount: 0,
      recapStatus: 'private_link',
      recapFeaturedCount: 2,
      recapStoryCount: 1,
      slideshowFrameCount: 5,
      slideshowReadyAlbumCount: 1,
      guestHubActionCount: 4,
      guestProspectCount: 0,
    });

    expect(readiness.steps.find((step) => step.id === 'export')).toMatchObject({
      status: 'needs-action',
      detail: 'Review flagged uploads before relying on photo handoff exports.',
    });
    expect(readiness.blockers).toContain('Review flagged uploads before relying on photo handoff exports.');
  });
});
