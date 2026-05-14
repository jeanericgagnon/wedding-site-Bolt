import { buildGuestHubActions, summarizeGuestHubActions } from '../../../lib/guestHubActions';
import { buildGuestHubQrAssets } from '../../../lib/guestHubQrAssets';
import { buildMemoryFlowReadiness } from '../../../lib/memoryFlowReadiness';
import { buildPublicSiteUrl } from '../../../lib/publicSiteSlug';
import {
  buildPhotoDashboardCounts,
  buildPhotoMemoryCollections,
  eventMomentTags,
  slugTag,
  tagLabel,
  type GuestHubSettings,
  type GuestProspectOptinRow,
  type GuestbookEntryRow,
  type ItineraryEvent,
  type PhotoAiBucketCorrectionRow,
  type PhotoBucketRow,
  type PhotoUploadAiAnalysisRow,
  type PhotoUploadMetadataRow,
  type PhotoUploadRow,
} from '../guestPhotoSharingUtils';

type BuildGuestPhotoDashboardDerivedStateArgs = {
  aiBucketCorrections: PhotoAiBucketCorrectionRow[];
  analysisByUploadId: Map<string, PhotoUploadAiAnalysisRow>;
  availableAiTags: Map<string, number>;
  bucketById: Map<string, PhotoBucketRow>;
  bucketDepthById: Map<string, number>;
  bucketSearch: string;
  buckets: PhotoBucketRow[];
  events: ItineraryEvent[];
  guestProspects: GuestProspectOptinRow[];
  guestbookEntries: GuestbookEntryRow[];
  hubSettings: GuestHubSettings;
  metadataByUploadId: Map<string, PhotoUploadMetadataRow>;
  photoMemoryFlowQaEnabled?: boolean;
  showFlaggedOnly: boolean;
  showHidden: boolean;
  siteSlug: string | null;
  slideshowFramesLength: number;
  slideshowReadyBucketCount: number;
  statusFilter: 'all' | 'active' | 'paused';
  tagFilter: string;
  uploadAnalyses: PhotoUploadAiAnalysisRow[];
  uploadMetadata: PhotoUploadMetadataRow[];
  uploads: PhotoUploadRow[];
};

export function buildGuestPhotoDashboardDerivedState({
  aiBucketCorrections,
  analysisByUploadId,
  availableAiTags,
  bucketById,
  bucketDepthById,
  bucketSearch,
  buckets,
  events,
  guestProspects,
  guestbookEntries,
  hubSettings,
  metadataByUploadId,
  photoMemoryFlowQaEnabled = false,
  showFlaggedOnly,
  showHidden,
  siteSlug,
  slideshowFramesLength,
  slideshowReadyBucketCount,
  statusFilter,
  tagFilter,
  uploadAnalyses,
  uploadMetadata,
  uploads,
}: BuildGuestPhotoDashboardDerivedStateArgs) {
  const photoDashboardCounts = buildPhotoDashboardCounts({
    uploads,
    buckets,
    uploadAnalyses,
    uploadMetadata,
    aiBucketCorrections,
  });

  const photoMemoryCollections = buildPhotoMemoryCollections({
    uploads,
    analysisByUploadId,
    metadataByUploadId,
  });

  const {
    activeBucketsCount,
    flaggedUploadCount,
    recapFeaturedCount,
    recapStoryCount,
  } = photoDashboardCounts;
  const { reviewUploads } = photoMemoryCollections;

  const publicSiteUrl = buildPublicSiteUrl(siteSlug);
  const guestHubUrl = publicSiteUrl ? `${publicSiteUrl}/event/${encodeURIComponent(siteSlug ?? '')}` : '';
  const guestRecapBaseUrl = photoMemoryFlowQaEnabled && typeof window !== 'undefined'
    ? window.location.origin
    : publicSiteUrl;
  const guestRecapUrl = guestRecapBaseUrl
    ? `${guestRecapBaseUrl}/event/${encodeURIComponent(siteSlug ?? '')}/recap${photoMemoryFlowQaEnabled ? '?photoMemoryFlowQa=1' : ''}`
    : '';
  const guestHubActions = siteSlug ? buildGuestHubActions(siteSlug, hubSettings) : [];
  const guestHubActionSummary = summarizeGuestHubActions(guestHubActions);
  const guestHubQrAssets = buildGuestHubQrAssets({
    hubUrl: guestHubUrl,
    coupleLabel: siteSlug ?? 'Wedding guests',
    actionSummary: guestHubActionSummary,
    includePhotoPrompt: hubSettings.photos_enabled,
  });

  const recapPublishWarnings = [
    !hubSettings.photos_enabled ? 'Photo upload and recap sharing are off from the guest hub controls.' : null,
    flaggedUploadCount > 0 ? `${flaggedUploadCount} flagged upload${flaggedUploadCount === 1 ? '' : 's'} still need review.` : null,
    reviewUploads.length > 0 ? `${reviewUploads.length} upload${reviewUploads.length === 1 ? '' : 's'} are in the review queue.` : null,
    recapFeaturedCount === 0 && recapStoryCount === 0 ? 'No photos have been featured or marked for story yet.' : null,
  ].filter(Boolean) as string[];

  const memoryFlowReadiness = buildMemoryFlowReadiness({
    albumCount: buckets.length,
    activeAlbumCount: activeBucketsCount,
    uploadCount: uploads.length,
    videoUploadCount: uploads.filter((upload) => upload.mime_type?.startsWith('video/') || analysisByUploadId.get(upload.id)?.is_video).length,
    guestbookEnabled: hubSettings.guestbook_enabled,
    guestbookCount: guestbookEntries.length,
    photoUploadEnabled: hubSettings.photos_enabled,
    flaggedUploadCount,
    reviewQueueCount: reviewUploads.length,
    recapStatus: hubSettings.recap_status,
    recapFeaturedCount,
    recapStoryCount,
    slideshowFrameCount: slideshowFramesLength,
    slideshowReadyAlbumCount: slideshowReadyBucketCount,
    guestHubActionCount: guestHubActions.length,
    guestProspectCount: guestProspects.length,
  });

  const q = bucketSearch.trim().toLowerCase();
  const filteredBuckets = buckets.filter((bucket) => {
    const statusOk = statusFilter === 'all' || (statusFilter === 'active' ? bucket.is_active : !bucket.is_active);
    const parent = bucket.parent_album_id ? bucketById.get(bucket.parent_album_id) : null;
    const haystack = `${bucket.name} ${bucket.slug} ${bucket.hierarchy_label ?? ''} ${parent?.name ?? ''}`.toLowerCase();
    const searchOk = !q || haystack.includes(q);
    return statusOk && searchOk;
  }).sort((a, b) => {
    const aParent = a.parent_album_id ? bucketById.get(a.parent_album_id)?.name ?? '' : a.name;
    const bParent = b.parent_album_id ? bucketById.get(b.parent_album_id)?.name ?? '' : b.name;
    return aParent.localeCompare(bParent) || (bucketDepthById.get(a.id) ?? 0) - (bucketDepthById.get(b.id) ?? 0) || a.name.localeCompare(b.name);
  });

  const linked = new Set(buckets.map((bucket) => bucket.itinerary_event_id).filter(Boolean));
  const missingItineraryEvents = events.filter((event) => !linked.has(event.id));

  const tagCounts = new Map(availableAiTags);
  const bucketNameTags = new Set(
    buckets.flatMap((bucket) => [slugTag(bucket.name), slugTag(bucket.hierarchy_label ?? ''), bucket.slug].filter(Boolean))
  );
  const momentBucketSuggestions = events
    .flatMap((event) => {
      const parentBucket = buckets.find((bucket) => bucket.itinerary_event_id === event.id) ?? null;
      return eventMomentTags(event.event_name)
        .map((tag) => ({
          tag,
          label: tagLabel(tag),
          eventId: event.id,
          eventName: event.event_name,
          parentBucket,
          count: tagCounts.get(tag) ?? 0,
        }))
        .filter((suggestion) => suggestion.tag && !bucketNameTags.has(suggestion.tag));
    })
    .sort((a, b) => b.count - a.count || a.eventName.localeCompare(b.eventName) || a.label.localeCompare(b.label))
    .slice(0, 18);

  const recentByBucket = new Map<string, PhotoUploadRow[]>();
  uploads
    .filter((upload) => (showHidden || !upload.is_hidden) && (!showFlaggedOnly || upload.is_flagged))
    .filter((upload) => {
      if (tagFilter === 'all') return true;
      return (analysisByUploadId.get(upload.id)?.tags ?? []).some((rawTag) => rawTag.trim().toLowerCase() === tagFilter);
    })
    .forEach((upload) => {
      const existing = recentByBucket.get(upload.photo_album_id) ?? [];
      if (existing.length < 5) existing.push(upload);
      recentByBucket.set(upload.photo_album_id, existing);
    });

  return {
    filteredBuckets,
    guestHubActions,
    guestHubActionSummary,
    guestHubQrAssets,
    guestHubUrl,
    guestRecapUrl,
    memoryFlowReadiness,
    missingItineraryEvents,
    momentBucketSuggestions,
    photoDashboardCounts,
    photoMemoryCollections,
    recapPublishWarnings,
    recentByBucket,
  };
}
