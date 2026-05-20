import React, { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { formatGuestPhotoDateTime } from './guestPhotoUploadTime';
import { formatGuestPhotoEventDate } from './guestPhotoEventDate';
import { useAuth } from '../../contexts/AuthContext';
import { writeStoredBucketLinks } from './guestPhotoSharingUtils';
import { GuestPhotoDashboardLiveContent } from './guestPhotos/GuestPhotoDashboardLiveContent';
import { useGuestPhotoAiActions } from './guestPhotos/useGuestPhotoAiActions';
import { buildGuestPhotoDashboardLiveContentProps } from './guestPhotos/buildGuestPhotoDashboardLiveContentProps';
import { useGuestPhotoAlbumActions } from './guestPhotos/useGuestPhotoAlbumActions';
import { buildGuestPhotoDashboardDerivedState } from './guestPhotos/buildGuestPhotoDashboardDerivedState';
import { buildGuestPhotoDashboardMediaState } from './guestPhotos/buildGuestPhotoDashboardMediaState';
import {
  getGuestPhotoBucketQrUrl,
  getGuestPhotoBucketTone,
  openGuestPhotoAppUrl,
  openGuestPhotoSafePublicUrl,
} from './guestPhotos/guestPhotoDashboardPresentation';
import { useGuestPhotoHubActions } from './guestPhotos/useGuestPhotoHubActions';
import { useGuestPhotoModerationActions } from './guestPhotos/useGuestPhotoModerationActions';
import { useGuestPhotoExportActions } from './guestPhotos/useGuestPhotoExportActions';
import { useGuestPhotoDashboardData } from './guestPhotos/useGuestPhotoDashboardData';
import { useGuestPhotoDashboardUiState } from './guestPhotos/useGuestPhotoDashboardUiState';
import { type GuestPhotoBucketsState, useGuestPhotoBucketWorkspace } from './guestPhotos/useGuestPhotoBucketWorkspace';
import { useGuestPhotoDashboardRouteSupport } from './guestPhotos/useGuestPhotoDashboardRouteSupport';
import { resolveGuestPhotoScrollTargets } from './guestPhotos/guestPhotoRouteState';

export const GuestPhotoSharing: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDemoMode } = useAuth();
  const search = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const {
    aiBucketCorrections,
    aiPhotoOpsPlan,
    bucketSearch,
    bucketUploadLinks,
    buckets,
    bulkCreating,
    error,
    events,
    guestProspects,
    guestbookEntries,
    hubSettings,
    isPublished,
    itineraryEventId,
    latestUploadUrl,
    loading,
    name,
    parentAlbumId,
    showFlaggedOnly,
    showHidden,
    siteId,
    siteSlug,
    slideshowBucketFilter,
    slideshowOrder,
    slideshowPreviewOpen,
    slideshowTheme,
    statusFilter,
    submitting,
    success,
    tagFilter,
    uploadAnalyses,
    uploadMetadata,
    uploads,
    windowDrafts,
    workingBucketId,
    setAiBucketCorrections,
    setAiPhotoOpsPlan,
    setBucketSearch,
    setBucketUploadLinks,
    setBuckets,
    setBulkCreating,
    setError,
    setEvents,
    setGuestProspects,
    setGuestbookEntries,
    setHubSettings,
    setIsPublished,
    setItineraryEventId,
    setLatestUploadUrl,
    setLoading,
    setName,
    setParentAlbumId,
    setShowFlaggedOnly,
    setShowHidden,
    setSiteId,
    setSiteSlug,
    setStorageScope,
    setSlideshowBucketFilter,
    setSlideshowOrder,
    setSlideshowPreviewOpen,
    setSlideshowTheme,
    setStatusFilter,
    setSubmitting,
    setSuccess,
    setTagFilter,
    setUploadAnalyses,
    setUploadMetadata,
    setUploads,
    setWindowDrafts,
    setWorkingBucketId,
    resetGuestPhotoDashboardInteractionState,
  } = useGuestPhotoDashboardUiState({ search });
  const {
    archiveMode,
    fromQuickStart,
    logPhotoAction,
    nextStep,
    quickStartOverviewPath,
  } = useGuestPhotoDashboardRouteSupport({
    eventDate: events[0]?.event_date ?? null,
    searchParams,
    siteId,
  });
  const {
    bucketFileInputRef,
    handleBucketFilesSelected,
    handleBucketRemoveClick,
    handleBucketUploadClick,
    photoBuckets,
    resetGuestPhotoBucketWorkspace,
    setPhotoBuckets,
  } = useGuestPhotoBucketWorkspace({
    setError,
    setSubmitting,
    setSuccess,
    siteId,
  });
  const previousSiteIdRef = useRef<string | null>(null);

  const { load } = useGuestPhotoDashboardData({
    isDemoMode,
    setPhotoBuckets,
    uiState: {
      setAiBucketCorrections,
      setAiPhotoOpsPlan,
      setBucketUploadLinks,
      setBuckets,
      setError,
      setEvents,
      setGuestProspects,
      setGuestbookEntries,
      setHubSettings,
      setIsPublished,
      setLoading,
      setSiteId,
      setSiteSlug,
      setUploadAnalyses,
      setUploadMetadata,
      setUploads,
      setWindowDrafts,
    },
  });

  useEffect(() => {
    if (!siteId) return;
    writeStoredBucketLinks(bucketUploadLinks, siteId);
  }, [bucketUploadLinks, siteId]);

  useEffect(() => {
    setStorageScope(siteId);
  }, [setStorageScope, siteId]);

  useEffect(() => {
    if (previousSiteIdRef.current && siteId && previousSiteIdRef.current !== siteId) {
      resetGuestPhotoDashboardInteractionState();
    }
    previousSiteIdRef.current = siteId;
  }, [siteId, resetGuestPhotoDashboardInteractionState]);

  useEffect(() => {
    if (!siteId && !isDemoMode) {
      resetGuestPhotoDashboardInteractionState();
      resetGuestPhotoBucketWorkspace();
    }
  }, [isDemoMode, siteId, resetGuestPhotoBucketWorkspace, resetGuestPhotoDashboardInteractionState]);

  useEffect(() => {
    const targetIds = resolveGuestPhotoScrollTargets(location.search);
    if (targetIds.length === 0) return;

    const consumeToolParam = () => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('tool');
      navigate(
        {
          pathname: location.pathname,
          search: nextParams.toString() ? `?${nextParams.toString()}` : '',
          hash: location.hash,
        },
        { replace: true },
      );
    };

    const scrollToTarget = () => {
      for (const id of targetIds) {
        const target = document.getElementById(id);
        if (!target) continue;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        consumeToolParam();
        return true;
      }
      return false;
    };

    if (scrollToTarget()) return;
    const timeout = window.setTimeout(scrollToTarget, 50);
    return () => window.clearTimeout(timeout);
  }, [location.hash, location.pathname, location.search, navigate, searchParams]);

  const {
    analysisByUploadId,
    availableAiTagCounts,
    availableAiTags,
    bucketById,
    bucketDepthById,
    bucketDisplayName,
    childBucketsByParent,
    countsByBucket,
    descendantBucketIdsByParent,
    flaggedCountsByBucket,
    hiddenCountsByBucket,
    metadataByUploadId,
    slideshowFrames,
    slideshowReadyBucketCount,
    uploadCountWithChildren,
  } = useMemo(() => buildGuestPhotoDashboardMediaState({
    buckets,
    slideshowBucketFilter,
    slideshowOrder,
    tagFilter,
    uploadAnalyses,
    uploadMetadata,
    uploads,
  }), [buckets, slideshowBucketFilter, slideshowOrder, tagFilter, uploadAnalyses, uploadMetadata, uploads]);

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
    isPublished,
    metadataByUploadId,
    photoMemoryFlowQaEnabled: searchParams.has('photoMemoryFlowQa'),
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
    isPublished,
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
    copyNotice,
    copyAllKnownLinks,
    copyAllShareMessages,
    copyFallbackValue,
    copyText,
    downloadGuestHubPrintPack,
    exportBucketCsv,
    exportBucketLinksCsv,
    exportCuratedRecapJson,
    exportCurationCsv,
    exportFullResolutionDownloadJob,
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
    bucketCardTone: getGuestPhotoBucketTone,
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
    copyNotice,
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
    getBucketQrUrl: getGuestPhotoBucketQrUrl,
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
    isPublished,
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
    onExportFullResolutionDownloadJob: () => void exportFullResolutionDownloadJob(),
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
    onOpenAppUrl: openGuestPhotoAppUrl,
    onOpenSafePublicUrl: openGuestPhotoSafePublicUrl,
    onOpenVaults: () => navigate('/dashboard/vault'),
    onOrderChange: setSlideshowOrder,
    onParentAlbumChange: setParentAlbumId,
    onParentChange: (bucketId, parentBucketId) => void setBucketParent(bucketId, parentBucketId),
    onPreviewOpenChange: setSlideshowPreviewOpen,
    onQueueGuestFollowups: (kind) => void queueGuestFollowups(kind),
    onQuickStartContinue: () => navigate(quickStartOverviewPath),
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
