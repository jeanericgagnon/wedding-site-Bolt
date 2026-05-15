export type MemoryFlowReadinessStatus = 'ready' | 'needs-action' | 'empty' | 'planned';

export interface MemoryFlowReadinessInput {
  albumCount: number;
  activeAlbumCount: number;
  uploadCount: number;
  videoUploadCount?: number;
  guestbookEnabled: boolean;
  guestbookCount: number;
  photoUploadEnabled: boolean;
  flaggedUploadCount: number;
  reviewQueueCount: number;
  recapStatus: 'draft' | 'private_link' | 'published' | 'closed';
  recapFeaturedCount: number;
  recapStoryCount: number;
  slideshowFrameCount?: number;
  slideshowReadyAlbumCount?: number;
  guestHubActionCount: number;
  guestProspectCount: number;
}

export interface MemoryFlowReadinessStep {
  id: 'guest-hub' | 'album-links' | 'guestbook' | 'video-capture' | 'moderation' | 'slideshow' | 'recap' | 'follow-up' | 'export';
  label: string;
  detail: string;
  status: MemoryFlowReadinessStatus;
}

export interface MemoryFlowReadinessLane {
  id: 'collection' | 'curation' | 'sharing' | 'handoff';
  label: string;
  detail: string;
  status: MemoryFlowReadinessStatus;
}

export interface MemoryFlowReadiness {
  readyCount: number;
  summaryBadges: string[];
  mainGapLabel: string | null;
  lanes: MemoryFlowReadinessLane[];
  steps: MemoryFlowReadinessStep[];
  blockers: string[];
}

const countLabel = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

export function buildMemoryFlowReadiness(input: MemoryFlowReadinessInput): MemoryFlowReadiness {
  const hasAlbums = input.albumCount > 0;
  const hasActiveAlbum = input.activeAlbumCount > 0;
  const hasUploads = input.uploadCount > 0;
  const needsReview = input.flaggedUploadCount > 0 || input.reviewQueueCount > 0;
  const recapHasPicks = input.recapFeaturedCount > 0 || input.recapStoryCount > 0;
  const recapShareable = input.recapStatus === 'private_link' || input.recapStatus === 'published';
  const videoUploadCount = Math.max(input.videoUploadCount ?? 0, 0);
  const slideshowFrameCount = Math.max(input.slideshowFrameCount ?? 0, 0);
  const slideshowReadyAlbumCount = Math.max(input.slideshowReadyAlbumCount ?? 0, 0);
  const handoffExportReady = hasUploads && !needsReview;
  const curatedPickCount = input.recapFeaturedCount + input.recapStoryCount;
  const storyPickCoverageRate = curatedPickCount > 0
    ? Math.round((input.recapStoryCount / curatedPickCount) * 100)
    : 0;
  const moderationItemCount = input.flaggedUploadCount + input.reviewQueueCount;
  const curationCounts = [curatedPickCount > 0 ? countLabel(curatedPickCount, 'curated pick') : null, slideshowFrameCount >= 3 ? countLabel(slideshowFrameCount, 'slideshow frame') : null]
    .filter(Boolean)
    .join(' and ');

  const lanes: MemoryFlowReadinessLane[] = [
    {
      id: 'collection',
      label: 'Collection',
      detail: hasActiveAlbum && input.photoUploadEnabled
        ? `${countLabel(input.uploadCount, 'upload')} across ${countLabel(input.activeAlbumCount, 'active album')}${videoUploadCount > 0 ? `, including ${countLabel(videoUploadCount, 'video')}` : ''}.`
        : hasAlbums
          ? input.photoUploadEnabled
            ? 'Albums exist, but guest uploads still need at least one active album.'
            : 'Albums exist, but photo uploads are off in guest hub controls.'
          : 'Create an active album and leave uploads on before sharing the memory-flow QR.',
      status: hasActiveAlbum && input.photoUploadEnabled ? 'ready' : hasAlbums ? 'needs-action' : 'empty',
    },
    {
      id: 'curation',
      label: 'Curation',
      detail: hasUploads
        ? needsReview
          ? `${countLabel(input.flaggedUploadCount, 'flagged upload')} and ${countLabel(input.reviewQueueCount, 'review item')} still need review before the story is clean.`
          : curatedPickCount > 0 || slideshowFrameCount >= 3
            ? `${curationCounts} ${curationCounts.includes(' and ') ? 'are' : 'is'} ready for recap review.`
            : 'Uploads are in, but curation still needs story picks or slideshow-ready moments.'
        : 'Guest uploads will unlock curation and story-building.',
      status: !hasUploads ? 'empty' : needsReview ? 'needs-action' : curatedPickCount > 0 || slideshowFrameCount >= 3 ? 'ready' : 'needs-action',
    },
    {
      id: 'sharing',
      label: 'Sharing',
      detail: recapShareable && recapHasPicks
        ? `Recap is ${input.recapStatus === 'private_link' ? 'private-link ready' : 'published'} with ${countLabel(curatedPickCount, 'curated pick')}${input.recapStoryCount > 0 ? `, including ${countLabel(input.recapStoryCount, 'story pick')} (${storyPickCoverageRate}% story coverage)` : ''}.`
        : recapHasPicks
          ? `${countLabel(curatedPickCount, 'curated pick')} saved, but the recap is not shareable yet.`
          : hasUploads
            ? 'Uploads exist, but guests still need featured or story picks before recap sharing is ready.'
            : 'Guest recap sharing will unlock after uploads and curation are in place.',
      status: recapShareable && recapHasPicks ? 'ready' : recapHasPicks || hasUploads ? 'needs-action' : 'empty',
    },
    {
      id: 'handoff',
      label: 'Handoff',
      detail: handoffExportReady
        ? `Owner handoff export and full-resolution download are ready from ${countLabel(input.uploadCount, 'reviewed upload')}${input.guestProspectCount > 0 ? `, with ${countLabel(input.guestProspectCount, 'guest opt-in')} saved for follow-up.` : '.'}`
        : needsReview
          ? 'Review flagged uploads before relying on owner handoff exports or full-resolution jobs.'
          : hasUploads
            ? 'Reviewed uploads will unlock owner handoff exports and full-resolution jobs.'
            : 'Owner handoff exports will appear after guests start uploading moments.',
      status: handoffExportReady ? 'ready' : needsReview || hasUploads ? 'needs-action' : 'empty',
    },
  ];

  const steps: MemoryFlowReadinessStep[] = [
    {
      id: 'guest-hub',
      label: 'No-app guest hub',
      detail: input.guestHubActionCount > 0
        ? `${countLabel(input.guestHubActionCount, 'guest action')} enabled from the QR hub.`
        : 'Turn on at least one guest action before printing the hub QR.',
      status: input.guestHubActionCount > 0 ? 'ready' : 'needs-action',
    },
    {
      id: 'album-links',
      label: 'Photo upload links',
      detail: hasActiveAlbum
        ? `${countLabel(input.activeAlbumCount, 'active album')} can receive uploads.`
        : hasAlbums
          ? 'Albums exist, but none are active for guest uploads.'
          : 'Create an album before sharing photo upload links.',
      status: hasActiveAlbum && input.photoUploadEnabled ? 'ready' : hasAlbums ? 'needs-action' : 'empty',
    },
    {
      id: 'guestbook',
      label: 'Guestbook notes',
      detail: input.guestbookEnabled
        ? `${countLabel(input.guestbookCount, 'guestbook note')} captured.`
        : 'Guestbook notes are optional and currently off in the guest hub controls.',
      status: input.guestbookEnabled ? 'ready' : 'planned',
    },
    {
      id: 'video-capture',
      label: 'Video memories',
      detail: videoUploadCount > 0
        ? `${countLabel(videoUploadCount, 'video')} captured for the memory flow.`
        : 'Video upload is supported, but live video capture still needs a proof pass.',
      status: videoUploadCount > 0 ? 'ready' : 'planned',
    },
    {
      id: 'moderation',
      label: 'Moderation queue',
      detail: needsReview
        ? `${countLabel(input.flaggedUploadCount, 'flagged upload')} and ${countLabel(input.reviewQueueCount, 'review item')} need a look.`
        : hasUploads
          ? 'No flagged uploads or review items are blocking the current recap.'
          : 'No uploads to moderate yet.',
      status: needsReview ? 'needs-action' : hasUploads ? 'ready' : 'empty',
    },
    {
      id: 'slideshow',
      label: 'Slideshow draft',
      detail: slideshowFrameCount > 0
        ? `${countLabel(slideshowFrameCount, 'slide')} ready from ${countLabel(slideshowReadyAlbumCount, 'album')}.`
        : hasUploads
          ? 'Needs at least three visible, unflagged uploads in an active album.'
          : 'Guest uploads will unlock the slideshow draft.',
      status: slideshowFrameCount >= 3 ? 'ready' : hasUploads ? 'needs-action' : 'empty',
    },
    {
      id: 'recap',
      label: 'Guest recap',
      detail: recapShareable && recapHasPicks
        ? `Recap is ${input.recapStatus === 'private_link' ? 'private-link ready' : 'published'} with curated picks${input.recapStoryCount > 0 ? ` and ${countLabel(input.recapStoryCount, 'story pick')}` : ''}.`
        : recapHasPicks
          ? 'Curated picks exist, but the recap is not shareable yet.'
          : 'Feature photos or mark story picks before sharing the recap.',
      status: recapShareable && recapHasPicks ? 'ready' : recapHasPicks ? 'needs-action' : 'empty',
    },
    {
      id: 'follow-up',
      label: 'Guest follow-up',
      detail: input.guestProspectCount > 0
        ? `${countLabel(input.guestProspectCount, 'guest opt-in')} available for recap or future-event follow-up.`
        : 'No guest follow-up opt-ins captured yet.',
      status: input.guestProspectCount > 0 ? 'ready' : 'empty',
    },
    {
      id: 'export',
      label: 'Photo handoff export',
      detail: handoffExportReady
        ? 'Owner handoff sheets and full-resolution download jobs can be saved from reviewed guest uploads.'
        : needsReview
          ? 'Review flagged uploads before relying on photo handoff exports.'
          : 'Guest uploads will unlock owner handoff exports and full-resolution download jobs.',
      status: handoffExportReady ? 'ready' : needsReview ? 'needs-action' : 'empty',
    },
  ];

  const blockers = steps
    .filter((step) => step.status === 'needs-action')
    .map((step) => step.detail);
  const blockerCount = blockers.length;
  const firstBlockingStep = steps.find((step) => step.status === 'needs-action') ?? null;
  const highestPriorityGap = lanes.find((lane) => lane.status === 'needs-action')
    ?? lanes.find((lane) => lane.status === 'empty')
    ?? null;
  const readyLaneCount = lanes.filter((lane) => lane.status === 'ready').length;
  const actionLaneCount = lanes.filter((lane) => lane.status === 'needs-action').length;
  const emptyLaneCount = lanes.filter((lane) => lane.status === 'empty').length;
  const readyStepCount = steps.filter((step) => step.status === 'ready').length;
  const actionStepCount = steps.filter((step) => step.status === 'needs-action').length;
  const emptyStepCount = steps.filter((step) => step.status === 'empty').length;
  const plannedStepCount = steps.filter((step) => step.status === 'planned').length;
  const stepCoverageRate = steps.length > 0
    ? Math.round((readyStepCount / steps.length) * 100)
    : 0;
  const summaryBadges = [
    `${readyLaneCount} of ${lanes.length} memory lanes ready`,
    `${stepCoverageRate}% step coverage`,
    `${readyStepCount} of ${steps.length} memory steps ready`,
    hasActiveAlbum && input.photoUploadEnabled
      ? `${countLabel(input.uploadCount, 'upload')} live across ${countLabel(input.activeAlbumCount, 'active album')}`
      : hasAlbums
        ? 'Upload lane needs setup'
        : 'No live upload lane',
    recapShareable
      ? input.recapStatus === 'published'
        ? 'Published recap'
        : 'Private recap link'
      : recapHasPicks
        ? 'Recap saved, not shareable'
        : 'Recap not shareable',
    recapHasPicks && input.recapStoryCount > 0
      ? `${storyPickCoverageRate}% story coverage`
      : recapHasPicks
        ? 'No story picks yet'
        : 'No story curation yet',
    handoffExportReady
      ? 'Handoff ready'
      : needsReview
        ? `${countLabel(moderationItemCount, 'review item')} need attention`
        : hasUploads
          ? 'Handoff not ready'
          : 'No handoff yet',
    input.guestProspectCount > 0
      ? `${countLabel(input.guestProspectCount, 'opt-in')} captured`
      : 'No follow-up opt-ins',
    blockerCount > 0
      ? `${countLabel(blockerCount, 'active blocker')} before sharing`
      : 'No blockers before sharing',
    ...(highestPriorityGap === null ? ['No memory gaps right now'] : []),
    ...(actionLaneCount > 0 ? [`${actionLaneCount} memory lane${actionLaneCount === 1 ? '' : 's'} still need action`] : []),
    ...(actionStepCount > 0 ? [`${actionStepCount} memory step${actionStepCount === 1 ? '' : 's'} still need action`] : []),
    ...(emptyLaneCount > 0 ? [`${emptyLaneCount} memory lane${emptyLaneCount === 1 ? '' : 's'} still empty`] : []),
    ...(emptyStepCount > 0 ? [`${emptyStepCount} memory step${emptyStepCount === 1 ? '' : 's'} still empty`] : []),
    ...(plannedStepCount > 0 ? [`${plannedStepCount} memory step${plannedStepCount === 1 ? '' : 's'} still planned`] : []),
    ...(firstBlockingStep ? [`First blocker: ${firstBlockingStep.label}`] : []),
  ];

  return {
    readyCount: readyStepCount,
    summaryBadges,
    mainGapLabel: highestPriorityGap ? `Main gap: ${highestPriorityGap.label}` : 'Main gap: none right now',
    lanes,
    steps,
    blockers,
  };
}
