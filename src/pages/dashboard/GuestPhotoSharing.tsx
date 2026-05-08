import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { getArchiveModeDescriptor } from '../../lib/archiveMode';
import { PhotoBucketCards } from '../../components/dashboard/PhotoBucketCards';
import { buildQuickStartOverviewPath, readQuickStartDashboardContinuation } from '../../lib/quickStartContinuation';
import { toDatetimeLocalOrEmpty } from './guestPhotoDateTime';
import { formatGuestPhotoDate, formatGuestPhotoDateTime, getGuestPhotoSortTime, toGuestPhotoCsvTimestamp } from './guestPhotoUploadTime';
import { formatGuestPhotoEventDate } from './guestPhotoEventDate';
import { type AiPhotoOpsPlan } from '../../lib/aiPhotoOps';
import { safeOptionalPhotoAnalysisText, safePhotoAnalysisList, safePhotoAnalysisText } from '../../lib/photoAnalysisCustomerCopy';
import { logAppAction } from '../../lib/actionAudit';
import { useAuth } from '../../contexts/AuthContext';
import { demoEvents, demoWeddingSite } from '../../lib/demoData';
import { getSafePublicWebUrl } from '../../sections/publicLinks';
import {
  getGuestPhotoCurrentUserId,
  loadGuestPhotoDashboardSnapshot,
  MAX_GUEST_PHOTO_ALBUMS,
  MAX_GUEST_PHOTO_ANALYSES,
  MAX_GUEST_PHOTO_BUCKET_CORRECTIONS,
  MAX_GUEST_PHOTO_EVENTS,
  MAX_GUEST_PHOTO_GUESTBOOK_ENTRIES,
  MAX_GUEST_PHOTO_METADATA_ROWS,
  MAX_GUEST_PHOTO_PROSPECTS,
  MAX_GUEST_PHOTO_UPLOADS,
  analyzeGuestPhotoUploads,
  createGuestPhotoAlbum,
  createGuestPhotoBucketCorrection,
  manageGuestPhotoAlbum,
  moveGuestPhotoUploadToBucket,
  persistGuestPhotoAiOpsPlan,
  queueGuestPhotoFollowups as queueGuestPhotoFollowupsFromService,
  refreshGuestPhotoSession,
  resolveGuestPhotoDashboardUserId,
  saveGuestPhotoHubSettings,
} from './guestPhotoSharingService';
import {
  DEFAULT_HUB_SETTINGS,
  analysisDisplayStatus,
  analysisSourceLabel,
  makePhotoShareMessage,
  readStoredBucketLinks,
  safePhotoOwnerError,
  writeStoredBucketLinks,
  type GuestHubSettings,
  type GuestProspectOptinRow,
  type GuestbookEntryRow,
  type ItineraryEvent,
  type PhotoAiBucketCorrectionRow,
  type PhotoBucketRow,
  type PhotoUploadAiAnalysisRow,
  type PhotoUploadMetadataRow,
  type PhotoUploadRow,
  type SlideshowFrame,
  type SlideshowOrderMode,
  type SlideshowTheme,
} from './guestPhotoSharingUtils';
import { GuestPhotoDashboardLiveContent } from './guestPhotos/GuestPhotoDashboardLiveContent';
import { useGuestPhotoAiActions } from './guestPhotos/useGuestPhotoAiActions';
import { buildGuestPhotoDashboardLiveContentProps } from './guestPhotos/buildGuestPhotoDashboardLiveContentProps';
import { useGuestPhotoAlbumActions } from './guestPhotos/useGuestPhotoAlbumActions';
import { buildGuestPhotoDashboardDerivedState } from './guestPhotos/buildGuestPhotoDashboardDerivedState';
import { useGuestPhotoHubActions } from './guestPhotos/useGuestPhotoHubActions';
import { useGuestPhotoModerationActions } from './guestPhotos/useGuestPhotoModerationActions';
import { useGuestPhotoExportActions } from './guestPhotos/useGuestPhotoExportActions';
import { useGuestPhotoDashboardData } from './guestPhotos/useGuestPhotoDashboardData';
import { type GuestPhotoBucketsState, useGuestPhotoBucketWorkspace } from './guestPhotos/useGuestPhotoBucketWorkspace';

export const GuestPhotoSharing: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDemoMode } = useAuth();
  const { fromQuickStart, nextStep } = readQuickStartDashboardContinuation(searchParams);
  const search = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteSlug, setSiteSlug] = useState<string | null>(null);
  const [events, setEvents] = useState<ItineraryEvent[]>([]);
  const [buckets, setBuckets] = useState<PhotoBucketRow[]>([]);
  const [uploads, setUploads] = useState<PhotoUploadRow[]>([]);
  const [uploadAnalyses, setUploadAnalyses] = useState<PhotoUploadAiAnalysisRow[]>([]);
  const [uploadMetadata, setUploadMetadata] = useState<PhotoUploadMetadataRow[]>([]);
  const [aiBucketCorrections, setAiBucketCorrections] = useState<PhotoAiBucketCorrectionRow[]>([]);
  const [guestbookEntries, setGuestbookEntries] = useState<GuestbookEntryRow[]>([]);
  const [guestProspects, setGuestProspects] = useState<GuestProspectOptinRow[]>([]);
  const [hubSettings, setHubSettings] = useState<GuestHubSettings>(DEFAULT_HUB_SETTINGS);
  const [showHidden, setShowHidden] = useState(false);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [tagFilter, setTagFilter] = useState('all');

  const [name, setName] = useState(search.get('eventName') ?? '');
  const [itineraryEventId, setItineraryEventId] = useState(search.get('eventId') ?? '');
  const [parentAlbumId, setParentAlbumId] = useState(search.get('parentBucket') ?? '');
  const [bucketSearch, setBucketSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  const [latestUploadUrl, setLatestUploadUrl] = useState<string>('');
  const [bucketUploadLinks, setBucketUploadLinks] = useState<Record<string, string>>(() => readStoredBucketLinks());
  const [workingBucketId, setWorkingBucketId] = useState<string>('');

  const [windowDrafts, setWindowDrafts] = useState<Record<string, { opensAt: string; closesAt: string }>>({});
  const [bulkCreating, setBulkCreating] = useState(false);
  const [slideshowOrder, setSlideshowOrder] = useState<SlideshowOrderMode>('newest');
  const [slideshowBucketFilter, setSlideshowBucketFilter] = useState<string>('all');
  const [slideshowTheme, setSlideshowTheme] = useState<SlideshowTheme>('classic');
  const [slideshowPreviewOpen, setSlideshowPreviewOpen] = useState(false);
  const [aiPhotoOpsPlan, setAiPhotoOpsPlan] = useState<AiPhotoOpsPlan | null>(null);
  const archiveMode = useMemo(() => getArchiveModeDescriptor({ weddingDate: events[0]?.event_date ?? null }), [events]);
  const {
    bucketFileInputRef,
    handleBucketFilesSelected,
    handleBucketRemoveClick,
    handleBucketUploadClick,
    photoBuckets,
    setPhotoBuckets,
  } = useGuestPhotoBucketWorkspace({
    setError,
    setSubmitting,
    setSuccess,
    siteId,
  });

  const { load } = useGuestPhotoDashboardData({
    isDemoMode,
    setAiBucketCorrections,
    setAiPhotoOpsPlan,
    setBucketUploadLinks,
    setBuckets,
    setError,
    setEvents,
    setGuestProspects,
    setGuestbookEntries,
    setHubSettings,
    setLoading,
    setPhotoBuckets,
    setSiteId,
    setSiteSlug,
    setUploadAnalyses,
    setUploadMetadata,
    setUploads,
    setWindowDrafts,
  });

  useEffect(() => {
    writeStoredBucketLinks(bucketUploadLinks);
  }, [bucketUploadLinks]);

  const logPhotoAction = (type: string, summary: string, metadata?: Record<string, unknown>, targetId?: string | null, targetLabel?: string | null) => {
    if (!siteId) return;
    void logAppAction({
      weddingSiteId: siteId,
      area: 'photos',
      type,
      summary,
      targetId,
      targetLabel,
      metadata,
    });
  };

  const countsByBucket = useMemo(() => {
    const m = new Map<string, number>();
    uploads.forEach((u) => m.set(u.photo_album_id, (m.get(u.photo_album_id) ?? 0) + 1));
    return m;
  }, [uploads]);

  const bucketById = useMemo(() => new Map(buckets.map((bucket) => [bucket.id, bucket])), [buckets]);

  const childBucketsByParent = useMemo(() => {
    const m = new Map<string, PhotoBucketRow[]>();
    buckets.forEach((bucket) => {
      if (!bucket.parent_album_id) return;
      const children = m.get(bucket.parent_album_id) ?? [];
      children.push(bucket);
      m.set(bucket.parent_album_id, children);
    });
    m.forEach((children) => children.sort((a, b) => a.name.localeCompare(b.name)));
    return m;
  }, [buckets]);

  const bucketDepthById = useMemo(() => {
    const depthFor = (bucket: PhotoBucketRow, seen = new Set<string>()): number => {
      if (!bucket.parent_album_id || seen.has(bucket.id)) return 0;
      const parent = bucketById.get(bucket.parent_album_id);
      if (!parent) return 0;
      return 1 + depthFor(parent, new Set([...seen, bucket.id]));
    };
    return new Map(buckets.map((bucket) => [bucket.id, Math.min(2, depthFor(bucket))]));
  }, [buckets, bucketById]);

  const bucketDisplayName = (bucket: PhotoBucketRow | undefined | null) => {
    if (!bucket) return 'Album';
    const parent = bucket.parent_album_id ? bucketById.get(bucket.parent_album_id) : null;
    return parent ? `${parent.name} / ${bucket.name}` : bucket.hierarchy_label || bucket.name;
  };

  const descendantBucketIdsByParent = useMemo(() => {
    const collect = (bucketId: string, seen = new Set<string>()): string[] => {
      if (seen.has(bucketId)) return [];
      const nextSeen = new Set([...seen, bucketId]);
      const children = childBucketsByParent.get(bucketId) ?? [];
      return children.flatMap((child) => [child.id, ...collect(child.id, nextSeen)]);
    };
    return new Map(buckets.map((bucket) => [bucket.id, collect(bucket.id)]));
  }, [buckets, childBucketsByParent]);

  const uploadCountWithChildren = (bucketId: string) => {
    const ids = [bucketId, ...(descendantBucketIdsByParent.get(bucketId) ?? [])];
    return ids.reduce((sum, id) => sum + (countsByBucket.get(id) ?? 0), 0);
  };

  const hiddenCountsByBucket = useMemo(() => {
    const m = new Map<string, number>();
    uploads.filter((u) => u.is_hidden).forEach((u) => m.set(u.photo_album_id, (m.get(u.photo_album_id) ?? 0) + 1));
    return m;
  }, [uploads]);

  const flaggedCountsByBucket = useMemo(() => {
    const m = new Map<string, number>();
    uploads.filter((u) => u.is_flagged).forEach((u) => m.set(u.photo_album_id, (m.get(u.photo_album_id) ?? 0) + 1));
    return m;
  }, [uploads]);

  const analysisByUploadId = useMemo(() => new Map(uploadAnalyses.map((analysis) => [analysis.upload_id, analysis])), [uploadAnalyses]);
  const metadataByUploadId = useMemo(() => new Map(uploadMetadata.map((metadata) => [metadata.upload_id, metadata])), [uploadMetadata]);
  const availableAiTagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    uploadAnalyses.forEach((analysis) => {
      safePhotoAnalysisList(analysis.tags).forEach((rawTag) => {
        const tag = rawTag.trim().toLowerCase();
        if (!tag) return;
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      });
    });
    return counts;
  }, [uploadAnalyses]);
  const availableAiTags = useMemo(() => {
    return Array.from(availableAiTagCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 24);
  }, [availableAiTagCounts]);

  const uploadMatchesTagFilter = (upload: PhotoUploadRow) => {
    if (tagFilter === 'all') return true;
    const analysis = analysisByUploadId.get(upload.id);
    return safePhotoAnalysisList(analysis?.tags).some((rawTag) => rawTag.trim().toLowerCase() === tagFilter);
  };

  const slideshowReadyBucketCount = useMemo(
    () => buckets.filter((bucket) => (countsByBucket.get(bucket.id) ?? 0) >= 3).length,
    [buckets, countsByBucket]
  );

  const slideshowFrames = useMemo<SlideshowFrame[]>(() => {
    const sourceBuckets = buckets.filter((bucket) => {
      if (!bucket.is_active) return false;
      if ((countsByBucket.get(bucket.id) ?? 0) < 3) return false;
      if (slideshowBucketFilter === 'all') return true;
      return bucket.id === slideshowBucketFilter;
    });

    const sourceBucketIds = new Set(sourceBuckets.map((bucket) => bucket.id));
    let selectedUploads = uploads
      .filter((upload) => !upload.is_hidden && !upload.is_flagged && sourceBucketIds.has(upload.photo_album_id))
      .filter(uploadMatchesTagFilter)
      .map((upload) => {
        const bucket = buckets.find((entry) => entry.id === upload.photo_album_id);
        const analysis = analysisByUploadId.get(upload.id);
        const metadata = metadataByUploadId.get(upload.id);
        return {
          uploadId: upload.id,
          bucketId: upload.photo_album_id,
          bucketName: bucketDisplayName(bucket),
          title: upload.original_filename,
          caption: safePhotoAnalysisText(analysis?.caption, `${upload.guest_name || 'Guest'} · ${formatGuestPhotoDate(metadata?.taken_at || upload.uploaded_at)}`),
          priority: analysis?.slideshow_priority ?? 50,
          quality: analysis?.quality_score ?? 0.5,
          uploadedAt: upload.uploaded_at,
          takenAt: metadata?.taken_at ?? null,
        };
      });

    if (slideshowOrder === 'newest') {
      selectedUploads = selectedUploads.sort((a, b) => getGuestPhotoSortTime(b.uploadedAt) - getGuestPhotoSortTime(a.uploadedAt));
    } else if (slideshowOrder === 'oldest') {
      selectedUploads = selectedUploads.sort((a, b) => getGuestPhotoSortTime(a.uploadedAt) - getGuestPhotoSortTime(b.uploadedAt));
    } else if (slideshowOrder === 'capture') {
      selectedUploads = selectedUploads.sort((a, b) => getGuestPhotoSortTime(a.takenAt || a.uploadedAt) - getGuestPhotoSortTime(b.takenAt || b.uploadedAt));
    } else {
      selectedUploads = [...selectedUploads].sort((a, b) => b.priority - a.priority || b.quality - a.quality || a.uploadId.localeCompare(b.uploadId));
    }

    return selectedUploads.slice(0, 24).map(({ uploadedAt: _uploadedAt, priority: _priority, quality: _quality, ...frame }) => frame);
  }, [buckets, uploads, countsByBucket, slideshowBucketFilter, slideshowOrder, analysisByUploadId, metadataByUploadId, tagFilter]);

  const slideshowThemeMeta: Record<SlideshowTheme, { label: string; cardClass: string; chipClass: string; helper: string }> = {
    classic: {
      label: 'Classic',
      cardClass: 'bg-white border-border-subtle',
      chipClass: 'bg-neutral-100 text-neutral-700',
      helper: 'Clean, neutral presentation focused on the photos.',
    },
    editorial: {
      label: 'Editorial',
      cardClass: 'bg-stone-50 border-stone-200',
      chipClass: 'bg-stone-200 text-stone-800',
      helper: 'Softer gallery feel with a more polished keepsake vibe.',
    },
    party: {
      label: 'Party',
      cardClass: 'bg-surface-subtle border-border-subtle',
      chipClass: 'bg-surface-subtle text-text-primary border border-border-subtle',
      helper: 'More energetic framing for reception and dance-floor moments.',
    },
  };

  const aiHighConfidenceMoves = useMemo(
    () => aiPhotoOpsPlan?.bucketSuggestions.filter((suggestion) => suggestion.confidence >= 0.74 && suggestion.targetBucketId !== suggestion.currentBucketId) ?? [],
    [aiPhotoOpsPlan]
  );
  const aiSlideshowFrameCount = aiPhotoOpsPlan?.slideshow.frames.length ?? 0;
  const unanalyzedUploads = useMemo(
    () => uploads.filter((upload) => !upload.is_hidden && !upload.is_flagged && !analysisByUploadId.has(upload.id)),
    [uploads, analysisByUploadId]
  );
  const visionHighConfidenceMoves = useMemo(
    () => uploadAnalyses.filter((analysis) => (
      analysis.suggested_bucket_id &&
      analysis.photo_album_id &&
      analysis.suggested_bucket_id !== analysis.photo_album_id &&
      analysis.bucket_confidence >= 0.74
    )),
    [uploadAnalyses]
  );
  const {
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
  } = useMemo(() => buildGuestPhotoDashboardDerivedState({
    aiBucketCorrections,
    analysisByUploadId,
    availableAiTags: availableAiTagCounts,
    bucketById,
    bucketDepthById,
    bucketSearch,
    buckets,
    events,
    guestProspects,
    guestbookEntries,
    hubSettings,
    metadataByUploadId,
    showFlaggedOnly,
    showHidden,
    siteSlug,
    slideshowFramesLength: slideshowFrames.length,
    slideshowReadyBucketCount,
    statusFilter,
    tagFilter,
    uploadAnalyses,
    uploadMetadata,
    uploads,
  }), [
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
    showFlaggedOnly,
    showHidden,
    siteSlug,
    slideshowFrames.length,
    slideshowReadyBucketCount,
    statusFilter,
    tagFilter,
    uploadAnalyses,
    uploadMetadata,
    uploads,
  ]);
  const {
    totalUploads,
    activeBucketsCount,
    pausedBucketsCount,
    visionReadyCount,
    visionFallbackCount,
    metadataExifCount,
    metadataGpsCount,
    metadataEventMatchCount,
    aiAcceptedCorrectionCount,
    aiRejectedCorrectionCount,
    hiddenUploadCount,
    flaggedUploadCount,
    recapHiddenCount,
    recapFeaturedCount,
    recapStoryCount,
  } = photoDashboardCounts;
  const {
    chronologicalUploads,
    memoryChapters,
    highlightUploads,
    reviewUploads,
    similarPhotoGroups,
    duplicateExtraCount,
  } = photoMemoryCollections;

  const bucketCardTone = (bucketName: string) => {
    const name = bucketName.toLowerCase();
    if (/ceremony|vows|aisle/.test(name)) return 'Save the quiet, meaningful moments.';
    if (/welcome|party|cocktail/.test(name)) return 'Capture the energy before everyone settles in.';
    if (/dance|after party|after-party/.test(name)) return 'This is for the blurry, loud, great stuff.';
    if (/brunch|recovery|farewell/.test(name)) return 'Keep the softer next-day memories here.';
    return 'A clean album for one specific moment guests can easily understand.';
  };

  const {
    aiPhotoMovesBusy,
    aiPhotoOpsBusy,
    analyzeUploadsWithVision,
    applyHighConfidencePhotoMoves,
    applyHighConfidenceVisionMoves,
    applyVisionSuggestion,
    generateAiPhotoOpsPlan,
    rejectVisionSuggestion,
    visionAiBusy,
    visionMovesBusy,
  } = useGuestPhotoAiActions({
    buckets,
    bucketDisplayName,
    load,
    setAiBucketCorrections,
    setAiPhotoOpsPlan,
    setError,
    setSuccess,
    setUploadAnalyses,
    setUploads,
    siteId,
    siteSlug,
    unanalyzedUploads,
    uploadAnalyses,
    uploads,
    visionHighConfidenceMoves,
  });

  const {
    bulkModerating,
    bulkUpdatingStatus,
    hideDuplicateExtras,
    hideReviewUploads,
    moderateUpload,
    moderatingGuestbookId,
    restoreHiddenUploads,
    setAllBucketsActive,
    setUploadsFlaggedByFilter,
    setUploadsHiddenByFilter,
    updateGuestbookEntry,
  } = useGuestPhotoModerationActions({
    buckets,
    load,
    logPhotoAction,
    reviewUploads,
    setError,
    setGuestbookEntries,
    setSuccess,
    showFlaggedOnly,
    showHidden,
    similarPhotoGroups,
    uploads,
  });

  const {
    bulkRegenerating,
    copied,
    copyAllKnownLinks,
    copyAllShareMessages,
    copyFallbackValue,
    copyText,
    downloadGuestHubPrintPack,
    exportBucketCsv,
    exportBucketLinksCsv,
    exportCuratedRecapJson,
    exportCurationCsv,
    exportGuestbookCsv,
    exportMediaManifestCsv,
    exportMemoryChaptersJson,
    exportProspectsCsv,
    exportSharePackCsv,
    exportSlideshowPlan,
    regenerateAllKnownBucketLinks,
    sendAllActiveBucketRequests,
  } = useGuestPhotoExportActions({
    aiPhotoOpsPlan,
    analysisByUploadId,
    bucketUploadLinks,
    buckets,
    chronologicalUploads,
    flaggedUploadCount,
    guestHubQrAssets,
    guestProspects,
    guestbookEntries,
    hiddenUploadCount,
    highlightUploads,
    logPhotoAction,
    memoryChapters,
    metadataByUploadId,
    recapFeaturedCount,
    recapStoryCount,
    reviewUploads,
    setBucketUploadLinks,
    setError,
    setSuccess,
    showHidden,
    similarPhotoGroups,
    siteId,
    siteSlug,
    slideshowBucketFilter,
    slideshowFrames,
    slideshowOrder,
    slideshowTheme,
    uploadAnalyses,
    uploads,
  });

  const {
    queueGuestFollowups,
    queueingFollowups,
    saveHubSettings,
    savingHubSettings,
  } = useGuestPhotoHubActions({
    hubSettings,
    load,
    logPhotoAction,
    setError,
    setSuccess,
    siteId,
  });

  const {
    applySuggestedWindow,
    createBucket,
    createMissingBucketsFromItinerary,
    createMomentBucketFromSuggestion,
    regenerateLink,
    saveWindow,
    setBucketActive,
    setBucketParent,
  } = useGuestPhotoAlbumActions({
    bucketById,
    bucketDisplayName,
    buckets,
    events,
    itineraryEventId,
    load,
    logPhotoAction,
    missingItineraryEvents,
    name,
    parentAlbumId,
    setBucketUploadLinks,
    setBulkCreating,
    setError,
    setLatestUploadUrl,
    setName,
    setParentAlbumId,
    setSubmitting,
    setSuccess,
    setWorkingBucketId,
    setWindowDrafts,
    siteId,
    windowDrafts,
  });

  const getBucketQrUrl = (uploadUrl: string) => `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(uploadUrl)}`;
  const openSafePublicUrl = (url: string | null | undefined) => {
    const safeUrl = getSafePublicWebUrl(url);
    if (safeUrl) window.open(safeUrl, '_blank', 'noopener,noreferrer');
  };
  const openAppUrl = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');
  const guestPhotoDashboardLiveContentProps = buildGuestPhotoDashboardLiveContentProps({
    activeAlbumCount: activeBucketsCount,
    aiAcceptedCorrectionCount,
    aiHighConfidenceMoveCount: aiHighConfidenceMoves.length,
    aiPhotoMovesBusy,
    aiPhotoOpsBusy,
    aiPhotoOpsPlan,
    aiRejectedCorrectionCount,
    aiSlideshowFrameCount,
    albumCount: buckets.length,
    analysisByUploadId,
    availableAiTags,
    bucketById,
    bucketCardTone,
    bucketDepthById,
    bucketDisplayName,
    bucketFileInputRef,
    bucketSearch,
    bucketUploadLinks,
    buckets,
    bulkCreating,
    bulkModerating,
    bulkRegenerating,
    childBucketsByParent,
    chronologicalUploads,
    copied,
    copyFallbackValue,
    countsByBucket,
    descendantBucketIdsByParent,
    duplicateExtraCount,
    error,
    events,
    filteredBucketCount: filteredBuckets.length,
    filteredBuckets,
    flaggedUploadCount,
    flaggedCountsByBucket,
    followupCardPropsShouldRender: guestProspects.length > 0,
    formatDateTime: formatGuestPhotoDateTime,
    formatEventDate: formatGuestPhotoEventDate,
    fromQuickStart,
    getBucketQrUrl,
    guestHubActionSummary,
    guestHubActions,
    guestHubQrAssetCount: guestHubQrAssets.length,
    guestHubUrl,
    guestProspects,
    guestRecapUrl,
    guestbookEntries,
    hiddenCountsByBucket,
    hiddenUploadCount,
    highlightUploads,
    hubSettings,
    itineraryEventId,
    latestUploadUrl,
    loading,
    memoryChapters,
    memoryFlowReadiness,
    metadataByUploadId,
    metadataEventMatchCount,
    metadataExifCount,
    metadataGpsCount,
    missingItineraryEventCount: missingItineraryEvents.length,
    moderatingGuestbookId,
    momentBucketSuggestions,
    name,
    nextStep,
    onAnalyzeNewPhotos: () => void analyzeUploadsWithVision(false),
    onAnalyzeVisiblePhotos: () => void analyzeUploadsWithVision(true),
    onApplyHighConfidencePhotoMoves: () => void applyHighConfidencePhotoMoves(aiPhotoOpsPlan),
    onApplyHighConfidenceVisionMoves: () => void applyHighConfidenceVisionMoves(),
    onApplySuggestedWindow: applySuggestedWindow,
    onApplyVisionSuggestion: (analysis) => void applyVisionSuggestion(analysis),
    onBucketFilesSelected: handleBucketFilesSelected,
    onBucketFilterChange: setSlideshowBucketFilter,
    onBucketRemoveClick: handleBucketRemoveClick,
    onBucketSearchChange: setBucketSearch,
    onBucketUploadClick: handleBucketUploadClick,
    onCopyAllKnownLinks: () => void copyAllKnownLinks(),
    onCopyAllShareMessages: () => void copyAllShareMessages(),
    onCopyOrganizerNotes: () => void copyText(JSON.stringify(aiPhotoOpsPlan, null, 2), 'ai-photo-plan'),
    onCopyText: (text, key) => void copyText(text, key),
    onCreateBucket: () => void createBucket(),
    onCreateMissingBuckets: () => void createMissingBucketsFromItinerary(),
    onCreateMomentBucket: (suggestion) => void createMomentBucketFromSuggestion(suggestion),
    onDownloadGuestHubPrintPack: downloadGuestHubPrintPack,
    onExportBucketCsv: exportBucketCsv,
    onExportBucketLinksCsv: exportBucketLinksCsv,
    onExportCuratedRecap: exportCuratedRecapJson,
    onExportCurationCsv: exportCurationCsv,
    onExportGuestbookCsv: exportGuestbookCsv,
    onExportMediaManifestCsv: () => void exportMediaManifestCsv(),
    onExportMemoryChapters: exportMemoryChaptersJson,
    onExportProspectsCsv: exportProspectsCsv,
    onExportSharePackCsv: exportSharePackCsv,
    onExportSlideshowPlan: () => void exportSlideshowPlan(),
    onGenerateAiPhotoOpsPlan: () => void generateAiPhotoOpsPlan(),
    onHideDuplicateExtras: () => void hideDuplicateExtras(),
    onHideReviewUploads: () => void hideReviewUploads(),
    onHubSettingsChange: setHubSettings,
    onItineraryEventChange: setItineraryEventId,
    onModerateUpload: (uploadId, patch) => void moderateUpload(uploadId, patch),
    onNameChange: setName,
    onOpenAppUrl: openAppUrl,
    onOpenSafePublicUrl: openSafePublicUrl,
    onOpenVaults: () => navigate('/dashboard/vault'),
    onOrderChange: setSlideshowOrder,
    onParentAlbumChange: setParentAlbumId,
    onParentChange: (bucketId, parentBucketId) => void setBucketParent(bucketId, parentBucketId),
    onPreviewOpenChange: setSlideshowPreviewOpen,
    onQueueGuestFollowups: (kind) => void queueGuestFollowups(kind),
    onQuickStartContinue: () => navigate(buildQuickStartOverviewPath()),
    onRegenerateAllKnownBucketLinks: () => void regenerateAllKnownBucketLinks(),
    onRegenerateLink: (bucketId) => void regenerateLink(bucketId),
    onRejectVisionSuggestion: (analysis) => void rejectVisionSuggestion(analysis),
    onRestoreHiddenUploads: () => void restoreHiddenUploads(),
    onSaveHubSettings: () => void saveHubSettings(),
    onSaveWindow: (bucketId) => void saveWindow(bucketId),
    onSendAllActiveBucketRequests: sendAllActiveBucketRequests,
    onSetBucketActive: (bucketId, isActive) => void setBucketActive(bucketId, isActive),
    onSetUploadsFlaggedByFilter: (isFlagged) => void setUploadsFlaggedByFilter(isFlagged),
    onSetUploadsHiddenByFilter: (isHidden) => void setUploadsHiddenByFilter(isHidden),
    onShowFlaggedOnlyChange: setShowFlaggedOnly,
    onShowHiddenChange: setShowHidden,
    onStatusFilterChange: setStatusFilter,
    onTagFilterChange: setTagFilter,
    onThemeChange: setSlideshowTheme,
    onUpdateGuestbookEntry: (entryId, patch) => void updateGuestbookEntry(entryId, patch),
    onUseHighlightsInSlideshow: () => setSlideshowOrder('highlights'),
    onUseSavedPhotoTimes: () => setSlideshowOrder('capture'),
    organizerCardPropsShouldRender: Boolean(aiPhotoOpsPlan),
    parentAlbumId,
    pausedAlbumCount: pausedBucketsCount,
    photoBuckets,
    queueingFollowups,
    recapFeaturedCount,
    recapHiddenCount,
    recapPublishWarnings,
    recapStoryCount,
    recentByBucket,
    reviewUploads,
    savingHubSettings,
    setWindowDraft: (bucketId, draft) => setWindowDrafts((prev) => ({ ...prev, [bucketId]: draft })),
    shouldRenderGuestHubControlsCard: Boolean(guestHubUrl),
    shouldRenderGuestHubQrCard: Boolean(guestHubUrl),
    shouldRenderGuestPhotoRecapSharingCard: Boolean(guestRecapUrl),
    shouldRenderGuestbookCard: guestbookEntries.length > 0,
    showFlaggedOnly,
    showHidden,
    similarPhotoGroups,
    siteId,
    slideshowBucketFilter,
    slideshowDraftCardUploadCount: uploads.length,
    slideshowFrames,
    slideshowOrder,
    slideshowPreviewOpen,
    slideshowReadyBucketCount,
    slideshowTheme,
    statsUploadCount: totalUploads,
    statusFilter,
    submitting,
    success,
    tagFilter,
    totalUploadCount: uploads.length,
    unanalyzedUploadCount: unanalyzedUploads.length,
    uploadAnalyses,
    uploadCountWithChildren,
    uploads,
    visionAiBusy,
    visionFallbackCount,
    visionHighConfidenceMoveCount: visionHighConfidenceMoves.length,
    visionMovesBusy,
    visionReadyCount,
    windowDrafts,
    workingBucketId,
  });

  return (
    <DashboardLayout currentPage="photos">
      <GuestPhotoDashboardLiveContent {...guestPhotoDashboardLiveContentProps} />
    </DashboardLayout>
  );
};

export default GuestPhotoSharing;
