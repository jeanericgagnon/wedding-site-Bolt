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
    expect(readiness.summaryBadges).toEqual([
      '24 uploads live',
      'Published recap',
      '43% story coverage',
      'Handoff ready',
      '8 opt-ins captured',
    ]);
    expect(readiness.lanes).toEqual([
      { id: 'collection', label: 'Collection', detail: '24 uploads across 2 active albums, including 2 videos.', status: 'ready' },
      { id: 'curation', label: 'Curation', detail: '7 curated picks and 12 slideshow frames are ready for recap review.', status: 'ready' },
      { id: 'sharing', label: 'Sharing', detail: 'Recap is published with 7 curated picks, including 3 story picks (43% story coverage).', status: 'ready' },
      { id: 'handoff', label: 'Handoff', detail: 'Owner handoff export and full-resolution download are ready from 24 reviewed uploads, with 8 guest opt-ins saved for follow-up.', status: 'ready' },
    ]);
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
    expect(readiness.summaryBadges).toEqual([
      'Upload lane needs setup',
      'Recap saved, not shareable',
      'No story picks yet',
      '5 review items need attention',
      'No follow-up opt-ins',
    ]);
    expect(readiness.lanes.find((lane) => lane.id === 'collection')).toMatchObject({
      status: 'needs-action',
      detail: 'Albums exist, but guest uploads still need at least one active album.',
    });
    expect(readiness.lanes.find((lane) => lane.id === 'curation')).toMatchObject({
      status: 'needs-action',
      detail: '2 flagged uploads and 3 review items still need review before the story is clean.',
    });
    expect(readiness.lanes.find((lane) => lane.id === 'sharing')).toMatchObject({
      status: 'needs-action',
      detail: '1 curated pick saved, but the recap is not shareable yet.',
    });
    expect(readiness.lanes.find((lane) => lane.id === 'handoff')).toMatchObject({
      status: 'needs-action',
      detail: 'Review flagged uploads before relying on owner handoff exports or full-resolution jobs.',
    });
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
    expect(readiness.summaryBadges).toEqual([
      '6 uploads live',
      'Private recap link',
      '33% story coverage',
      'Handoff ready',
      '1 opt-in captured',
    ]);
    expect(readiness.lanes.find((lane) => lane.id === 'sharing')).toMatchObject({
      status: 'ready',
      detail: 'Recap is private-link ready with 3 curated picks, including 1 story pick (33% story coverage).',
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
    expect(readiness.summaryBadges).toEqual([
      'No live upload lane',
      'Recap not shareable',
      'No story curation yet',
      'No handoff yet',
      'No follow-up opt-ins',
    ]);
    expect(readiness.lanes.find((lane) => lane.id === 'collection')).toMatchObject({
      status: 'empty',
      detail: 'Create an active album and leave uploads on before sharing the memory-flow QR.',
    });
    expect(readiness.lanes.find((lane) => lane.id === 'sharing')).toMatchObject({
      status: 'empty',
      detail: 'Guest recap sharing will unlock after uploads and curation are in place.',
    });
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
    expect(readiness.summaryBadges).toEqual([
      '5 uploads live',
      'Private recap link',
      '33% story coverage',
      '1 review item need attention',
      'No follow-up opt-ins',
    ]);
    expect(readiness.lanes.find((lane) => lane.id === 'handoff')).toMatchObject({
      status: 'needs-action',
      detail: 'Review flagged uploads before relying on owner handoff exports or full-resolution jobs.',
    });
    expect(readiness.blockers).toContain('Review flagged uploads before relying on photo handoff exports.');
  });
});
