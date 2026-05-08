import type { GuestPhotoDashboardLiveContentProps } from './GuestPhotoDashboardLiveContent';

type LiveContentProps = GuestPhotoDashboardLiveContentProps;

type BuildGuestPhotoDashboardLiveContentPropsParams = {
  activeAlbumCount: number;
  aiAcceptedCorrectionCount: number;
  aiHighConfidenceMoveCount: number;
  aiPhotoMovesBusy: boolean;
  aiPhotoOpsBusy: boolean;
  aiPhotoOpsPlan: LiveContentProps['organizerCardProps']['aiPhotoOpsPlan'] | null;
  aiRejectedCorrectionCount: number;
  aiSlideshowFrameCount: number;
  albumCount: number;
  availableAiTags: LiveContentProps['albumControlsProps']['availableAiTags'];
  bucketById: LiveContentProps['bucketListProps']['bucketById'];
  bucketCardTone: LiveContentProps['bucketListProps']['bucketTone'];
  bucketDepthById: LiveContentProps['bucketListProps']['bucketDepthById'];
  bucketDisplayName: LiveContentProps['bucketListProps']['bucketDisplayName'];
  bucketFileInputRef: LiveContentProps['coupleAlbumsCardProps']['bucketFileInputRef'];
  analysisByUploadId: LiveContentProps['bucketListProps']['analysisByUploadId'];
  bucketSearch: string;
  bucketUploadLinks: LiveContentProps['bucketListProps']['bucketUploadLinks'];
  buckets: LiveContentProps['bucketListProps']['buckets'];
  bulkCreating: boolean;
  bulkModerating: boolean;
  bulkRegenerating: boolean;
  childBucketsByParent: LiveContentProps['bucketListProps']['childBucketsByParent'];
  chronologicalUploads: LiveContentProps['reviewCardProps']['chronologicalUploads'];
  copied: string;
  copyFallbackValue: string;
  countsByBucket: LiveContentProps['bucketListProps']['countsByBucket'];
  descendantBucketIdsByParent: LiveContentProps['bucketListProps']['descendantBucketIdsByParent'];
  duplicateExtraCount: number;
  error: string | null;
  events: LiveContentProps['albumCreateCardProps']['events'];
  filteredBucketCount: number;
  filteredBuckets: LiveContentProps['bucketListProps']['filteredBuckets'];
  flaggedUploadCount: number;
  flaggedCountsByBucket: LiveContentProps['bucketListProps']['flaggedCountsByBucket'];
  followupCardPropsShouldRender: boolean;
  formatEventDate: LiveContentProps['albumCreateCardProps']['formatEventDate'];
  formatDateTime: LiveContentProps['bucketListProps']['formatDateTime'];
  fromQuickStart: boolean;
  getBucketQrUrl: LiveContentProps['bucketListProps']['getBucketQrUrl'];
  guestHubActionSummary: LiveContentProps['hubQrCardProps']['guestHubActionSummary'];
  guestHubActions: LiveContentProps['hubQrCardProps']['guestHubActions'];
  guestHubQrAssetCount: number;
  guestHubUrl: string | null;
  guestRecapUrl: string | null;
  guestProspects: LiveContentProps['followupCardProps']['guestProspects'];
  guestbookEntries: LiveContentProps['guestbookCardProps']['guestbookEntries'];
  hiddenCountsByBucket: LiveContentProps['bucketListProps']['hiddenCountsByBucket'];
  hiddenUploadCount: number;
  highlightUploads: LiveContentProps['reviewCardProps']['highlightUploads'];
  hubSettings: LiveContentProps['hubControlsCardProps']['hubSettings'];
  itineraryEventId: string;
  latestUploadUrl: string;
  loading: boolean;
  memoryChapters: LiveContentProps['reviewCardProps']['memoryChapters'];
  memoryFlowReadiness: LiveContentProps['memoryFlowCardProps']['memoryFlowReadiness'];
  metadataByUploadId: LiveContentProps['momentsCardProps']['metadataByUploadId'];
  metadataEventMatchCount: number;
  metadataExifCount: number;
  metadataGpsCount: number;
  missingItineraryEventCount: number;
  momentBucketSuggestions: LiveContentProps['momentAlbumsCardProps']['suggestions'];
  moderatingGuestbookId: string;
  name: string;
  nextStep: string | null;
  onOpenVaults: LiveContentProps['memoryVaultsCardProps']['onOpenVaults'];
  organizerCardPropsShouldRender: boolean;
  parentAlbumId: string;
  pausedAlbumCount: number;
  photoBuckets: LiveContentProps['coupleAlbumsCardProps']['photoBuckets'];
  recapFeaturedCount: number;
  recapHiddenCount: number;
  recapPublishWarnings: LiveContentProps['recapSharingCardProps']['recapPublishWarnings'];
  recapStoryCount: number;
  recentByBucket: LiveContentProps['bucketListProps']['recentByBucket'];
  reviewUploads: LiveContentProps['reviewCardProps']['reviewUploads'];
  savingHubSettings: boolean;
  shouldRenderGuestHubControlsCard: boolean;
  shouldRenderGuestHubQrCard: boolean;
  shouldRenderGuestPhotoRecapSharingCard: boolean;
  shouldRenderGuestbookCard: boolean;
  showFlaggedOnly: boolean;
  showHidden: boolean;
  similarPhotoGroups: LiveContentProps['reviewCardProps']['similarPhotoGroups'];
  siteId: string | null;
  slideshowBucketFilter: string;
  slideshowDraftCardUploadCount: number;
  slideshowFrames: LiveContentProps['slideshowCardProps']['slideshowFrames'];
  slideshowOrder: LiveContentProps['slideshowCardProps']['slideshowOrder'];
  slideshowPreviewOpen: boolean;
  slideshowReadyBucketCount: number;
  slideshowTheme: LiveContentProps['slideshowCardProps']['slideshowTheme'];
  statsUploadCount: number;
  statusFilter: LiveContentProps['albumControlsProps']['statusFilter'];
  submitting: boolean;
  success: string | null;
  tagFilter: string;
  totalUploadCount: number;
  unanalyzedUploadCount: number;
  uploadAnalyses: LiveContentProps['momentsCardProps']['uploadAnalyses'];
  uploadCountWithChildren: LiveContentProps['bucketListProps']['uploadCountWithChildren'];
  uploads: LiveContentProps['momentsCardProps']['uploads'];
  visionAiBusy: boolean;
  visionFallbackCount: number;
  visionHighConfidenceMoveCount: number;
  visionMovesBusy: boolean;
  visionReadyCount: number;
  windowDrafts: LiveContentProps['bucketListProps']['windowDrafts'];
  workingBucketId: string;
  queueingFollowups: LiveContentProps['followupCardProps']['queueingFollowups'];
  onAnalyzeNewPhotos: () => void;
  onAnalyzeVisiblePhotos: () => void;
  onApplyHighConfidencePhotoMoves: () => void;
  onApplyHighConfidenceVisionMoves: () => void;
  onApplySuggestedWindow: LiveContentProps['bucketListProps']['onApplySuggestedWindow'];
  onApplyVisionSuggestion: LiveContentProps['momentsCardProps']['onApplyVisionSuggestion'];
  onBucketFilesSelected: LiveContentProps['coupleAlbumsCardProps']['onBucketFilesSelected'];
  onBucketSearchChange: (value: string) => void;
  onBucketUploadClick: LiveContentProps['coupleAlbumsCardProps']['onBucketUploadClick'];
  onBucketRemoveClick: LiveContentProps['coupleAlbumsCardProps']['onBucketRemoveClick'];
  onCopyAllKnownLinks: () => void;
  onCopyAllShareMessages: () => void;
  onCopyOrganizerNotes: () => void;
  onCopyText: (text: string, key: string) => void;
  onCreateBucket: () => void;
  onCreateMissingBuckets: () => void;
  onCreateMomentBucket: LiveContentProps['momentAlbumsCardProps']['onCreateMomentBucket'];
  onDownloadGuestHubPrintPack: () => void;
  onExportBucketCsv: LiveContentProps['bucketListProps']['onExportBucketCsv'];
  onExportBucketLinksCsv: () => void;
  onExportCuratedRecap: () => void;
  onExportCurationCsv: () => void;
  onExportGuestbookCsv: () => void;
  onExportMediaManifestCsv: () => void;
  onExportMemoryChapters: () => void;
  onExportProspectsCsv: () => void;
  onExportSharePackCsv: () => void;
  onExportSlideshowPlan: () => void;
  onGenerateAiPhotoOpsPlan: () => void;
  onHideDuplicateExtras: () => void;
  onHideReviewUploads: () => void;
  onHubSettingsChange: LiveContentProps['hubControlsCardProps']['onHubSettingsChange'];
  onItineraryEventChange: (value: string) => void;
  onModerateUpload: LiveContentProps['bucketListProps']['onModerateUpload'];
  onNameChange: (value: string) => void;
  onOpenAppUrl: (url: string) => void;
  onOpenSafePublicUrl: (url: string | null | undefined) => void;
  onBucketFilterChange: LiveContentProps['slideshowCardProps']['onBucketFilterChange'];
  onOrderChange: LiveContentProps['slideshowCardProps']['onOrderChange'];
  onParentAlbumChange: (value: string) => void;
  onParentChange: LiveContentProps['bucketListProps']['onParentChange'];
  onPreviewOpenChange: LiveContentProps['slideshowCardProps']['onPreviewOpenChange'];
  onQueueGuestFollowups: LiveContentProps['followupCardProps']['onQueueGuestFollowups'];
  onQuickStartContinue: () => void;
  onRegenerateAllKnownBucketLinks: () => void;
  onRegenerateLink: LiveContentProps['bucketListProps']['onRegenerateLink'];
  onRejectVisionSuggestion: LiveContentProps['momentsCardProps']['onRejectVisionSuggestion'];
  onRestoreHiddenUploads: () => void;
  onSaveHubSettings: () => void;
  onSaveWindow: LiveContentProps['bucketListProps']['onSaveWindow'];
  onSendAllActiveBucketRequests: LiveContentProps['albumControlsProps']['onSendAllActiveBucketRequests'];
  onSetBucketActive: LiveContentProps['bucketListProps']['onSetBucketActive'];
  onSetUploadsFlaggedByFilter: LiveContentProps['albumControlsProps']['onSetUploadsFlaggedByFilter'];
  onSetUploadsHiddenByFilter: LiveContentProps['albumControlsProps']['onSetUploadsHiddenByFilter'];
  onShowFlaggedOnlyChange: LiveContentProps['albumControlsProps']['onShowFlaggedOnlyChange'];
  onShowHiddenChange: LiveContentProps['albumControlsProps']['onShowHiddenChange'];
  onStatusFilterChange: LiveContentProps['albumControlsProps']['onStatusFilterChange'];
  onTagFilterChange: LiveContentProps['albumControlsProps']['onTagFilterChange'];
  onThemeChange: LiveContentProps['slideshowCardProps']['onThemeChange'];
  onUpdateGuestbookEntry: LiveContentProps['guestbookCardProps']['onUpdateGuestbookEntry'];
  onUseHighlightsInSlideshow: () => void;
  onUseSavedPhotoTimes: () => void;
  setWindowDraft: (bucketId: string, draft: { opensAt: string; closesAt: string }) => void;
};

export function buildGuestPhotoDashboardLiveContentProps({
  activeAlbumCount,
  aiAcceptedCorrectionCount,
  aiHighConfidenceMoveCount,
  aiPhotoMovesBusy,
  aiPhotoOpsBusy,
  aiPhotoOpsPlan,
  aiRejectedCorrectionCount,
  aiSlideshowFrameCount,
  albumCount,
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
  filteredBucketCount,
  filteredBuckets,
  flaggedUploadCount,
  flaggedCountsByBucket,
  followupCardPropsShouldRender,
  formatEventDate,
  formatDateTime,
  fromQuickStart,
  getBucketQrUrl,
  guestHubActionSummary,
  guestHubActions,
  guestHubQrAssetCount,
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
  missingItineraryEventCount,
  moderatingGuestbookId,
  momentBucketSuggestions,
  name,
  nextStep,
  onOpenVaults,
  organizerCardPropsShouldRender,
  onAnalyzeNewPhotos,
  onAnalyzeVisiblePhotos,
  onApplyHighConfidencePhotoMoves,
  onApplyHighConfidenceVisionMoves,
  onApplySuggestedWindow,
  onApplyVisionSuggestion,
  onBucketFilesSelected,
  onBucketRemoveClick,
  onBucketSearchChange,
  onBucketUploadClick,
  onCopyAllKnownLinks,
  onCopyAllShareMessages,
  onCopyOrganizerNotes,
  onCopyText,
  onCreateBucket,
  onCreateMissingBuckets,
  onCreateMomentBucket,
  onDownloadGuestHubPrintPack,
  onExportBucketCsv,
  onExportBucketLinksCsv,
  onExportCuratedRecap,
  onExportCurationCsv,
  onExportGuestbookCsv,
  onExportMediaManifestCsv,
  onExportMemoryChapters,
  onExportProspectsCsv,
  onExportSharePackCsv,
  onExportSlideshowPlan,
  onGenerateAiPhotoOpsPlan,
  onHideDuplicateExtras,
  onHideReviewUploads,
  onHubSettingsChange,
  onItineraryEventChange,
  onModerateUpload,
  onNameChange,
  onOpenAppUrl,
  onOpenSafePublicUrl,
  onBucketFilterChange,
  onOrderChange,
  onParentAlbumChange,
  onParentChange,
  onPreviewOpenChange,
  onQueueGuestFollowups,
  onQuickStartContinue,
  onRegenerateAllKnownBucketLinks,
  onRegenerateLink,
  onRejectVisionSuggestion,
  onRestoreHiddenUploads,
  onSaveHubSettings,
  onSaveWindow,
  onSendAllActiveBucketRequests,
  onSetBucketActive,
  onSetUploadsFlaggedByFilter,
  onSetUploadsHiddenByFilter,
  onShowFlaggedOnlyChange,
  onShowHiddenChange,
  onStatusFilterChange,
  onTagFilterChange,
  onThemeChange,
  onUpdateGuestbookEntry,
  onUseHighlightsInSlideshow,
  onUseSavedPhotoTimes,
  parentAlbumId,
  pausedAlbumCount,
  photoBuckets,
  queueingFollowups,
  recapFeaturedCount,
  recapHiddenCount,
  recapPublishWarnings,
  recapStoryCount,
  recentByBucket,
  reviewUploads,
  savingHubSettings,
  setWindowDraft,
  shouldRenderGuestHubControlsCard,
  shouldRenderGuestHubQrCard,
  shouldRenderGuestPhotoRecapSharingCard,
  shouldRenderGuestbookCard,
  showFlaggedOnly,
  showHidden,
  similarPhotoGroups,
  siteId,
  slideshowBucketFilter,
  slideshowDraftCardUploadCount,
  slideshowFrames,
  slideshowOrder,
  slideshowPreviewOpen,
  slideshowReadyBucketCount,
  slideshowTheme,
  statsUploadCount,
  statusFilter,
  submitting,
  success,
  tagFilter,
  totalUploadCount,
  unanalyzedUploadCount,
  uploadAnalyses,
  uploadCountWithChildren,
  uploads,
  visionAiBusy,
  visionFallbackCount,
  visionHighConfidenceMoveCount,
  visionMovesBusy,
  visionReadyCount,
  windowDrafts,
  workingBucketId,
}: BuildGuestPhotoDashboardLiveContentPropsParams): GuestPhotoDashboardLiveContentProps {
  return {
    albumControlsProps: {
      visibleAlbumCount: filteredBucketCount,
      totalUploadCount,
      copied,
      bulkRegenerating,
      bulkModerating,
      showFlaggedOnly,
      showHidden,
      tagFilter,
      availableAiTags,
      bucketSearch,
      statusFilter,
      onCopyAllKnownLinks,
      onCopyAllShareMessages,
      onSendAllActiveBucketRequests,
      onRegenerateAllKnownBucketLinks,
      onExportBucketLinksCsv,
      onExportSharePackCsv,
      onExportMediaManifestCsv,
      onShowFlaggedOnlyChange,
      onTagFilterChange,
      onShowHiddenChange,
      onSetUploadsFlaggedByFilter,
      onSetUploadsHiddenByFilter,
      onBucketSearchChange,
      onStatusFilterChange,
    },
    albumCreateCardProps: {
      name,
      parentAlbumId,
      itineraryEventId,
      buckets,
      events,
      submitting,
      loading,
      latestUploadUrl,
      copied,
      missingItineraryEventCount,
      bulkCreating,
      error,
      success,
      copyFallbackValue,
      onNameChange,
      onParentAlbumChange,
      onItineraryEventChange,
      onCreateBucket,
      onCreateMissingBuckets,
      onCopyText,
      onOpenSafePublicUrl,
      onOpenAppUrl,
      getBucketQrUrl,
      bucketDisplayName,
      formatEventDate,
    },
    albumListStateProps: {
      loading,
      bucketCount: albumCount,
      filteredBucketCount,
      onSuggestionSelect: onNameChange,
    },
    bucketListProps: {
      filteredBuckets,
      buckets,
      countsByBucket,
      hiddenCountsByBucket,
      flaggedCountsByBucket,
      recentByBucket,
      windowDrafts,
      bucketUploadLinks,
      bucketById,
      childBucketsByParent,
      bucketDepthById,
      descendantBucketIdsByParent,
      analysisByUploadId,
      latestUploadUrl,
      workingBucketId,
      copied,
      uploadCountWithChildren,
      bucketTone: bucketCardTone,
      bucketDisplayName,
      formatDateTime,
      getBucketQrUrl,
      onOpenSafePublicUrl,
      onRegenerateLink,
      onCopyText,
      onSetBucketActive,
      onExportBucketCsv,
      onBucketSearchChange,
      onParentChange,
      onDraftChange: setWindowDraft,
      onApplySuggestedWindow,
      onSaveWindow,
      onTagFilterChange,
      onModerateUpload,
    },
    coupleAlbumsCardProps: {
      photoBuckets,
      uploadDisabled: !siteId || submitting,
      bucketFileInputRef,
      onBucketUploadClick,
      onBucketRemoveClick,
      onBucketFilesSelected,
    },
    followupCardProps: {
      guestProspects,
      queueingFollowups,
      onExportProspectsCsv,
      onQueueGuestFollowups,
    },
    guestbookCardProps: {
      guestbookEntries,
      moderatingGuestbookId: moderatingGuestbookId || null,
      onExportGuestbookCsv,
      onUpdateGuestbookEntry,
      formatDateTime,
    },
    heroCardProps: { albumCount, uploadCount: statsUploadCount },
    hubControlsCardProps: {
      hubSettings,
      savingHubSettings,
      onSaveHubSettings,
      onHubSettingsChange,
    },
    hubQrCardProps: {
      guestHubUrl: guestHubUrl || '',
      guestRecapUrl: guestRecapUrl || '',
      guestHubActionSummary,
      guestHubActions,
      copied,
      guestHubQrAssetCount,
      getBucketQrUrl,
      onCopyText,
      onOpenAppUrl,
      onOpenSafePublicUrl,
      onDownloadGuestHubPrintPack,
    },
    memoryFlowCardProps: { memoryFlowReadiness },
    memoryVaultsCardProps: { onOpenVaults },
    momentAlbumsCardProps: {
      suggestions: momentBucketSuggestions,
      submitting,
      onCreateMomentBucket,
    },
    momentsCardProps: {
      uploadAnalyses,
      uploads,
      metadataByUploadId,
      visionReadyCount,
      visionFallbackCount,
      unanalyzedUploadCount,
      metadataExifCount,
      metadataGpsCount,
      metadataEventMatchCount,
      aiAcceptedCorrectionCount,
      aiRejectedCorrectionCount,
      visionAiBusy,
      visionMovesBusy,
      visionHighConfidenceMoveCount,
      onAnalyzeNewPhotos,
      onAnalyzeVisiblePhotos,
      onApplyHighConfidenceMoves: onApplyHighConfidenceVisionMoves,
      onApplyVisionSuggestion,
      onRejectVisionSuggestion,
      formatDateTime,
    },
    onQuickStartContinue,
    organizerCardProps: {
      aiPhotoOpsPlan: aiPhotoOpsPlan!,
      aiSlideshowFrameCount,
      aiPhotoMovesBusy,
      aiHighConfidenceMoveCount,
      copied,
      onApplyHighConfidencePhotoMoves,
      onCopyOrganizerNotes,
    },
    recapSharingCardProps: {
      guestRecapUrl: guestRecapUrl || '',
      hubSettings,
      savingHubSettings,
      uploadCount: uploads.length,
      recapFeaturedCount,
      recapStoryCount,
      recapHiddenCount,
      recapPublishWarnings,
      onOpenAppUrl,
      onSaveHubSettings,
      onHubSettingsChange,
    },
    reviewCardProps: {
      highlightUploads,
      chronologicalUploads,
      similarPhotoGroups,
      reviewUploads,
      memoryChapters,
      hiddenUploadCount,
      flaggedUploadCount,
      recapFeaturedCount,
      recapStoryCount,
      recapHiddenCount,
      uploadCount: uploads.length,
      bulkModerating,
      duplicateExtraCount,
      onUseHighlightsInSlideshow,
      onUseSavedPhotoTimes,
      onExportCurationCsv,
      onExportMemoryChapters,
      onExportCuratedRecap,
      onHideReviewUploads,
      onHideDuplicateExtras,
      onRestoreHiddenUploads,
      onModerateUpload,
      formatDateTime,
    },
    shouldRenderAlbumListState: loading || buckets.length === 0 || filteredBuckets.length === 0,
    shouldRenderFollowupCard: followupCardPropsShouldRender,
    shouldRenderGuestHubControlsCard,
    shouldRenderGuestHubQrCard,
    shouldRenderGuestPhotoRecapSharingCard,
    shouldRenderGuestbookCard,
    shouldRenderOrganizerCard: organizerCardPropsShouldRender,
    shouldRenderQuickStartBanner: fromQuickStart && nextStep === 'review',
    slideshowCardProps: {
      buckets,
      countsByBucket,
      slideshowBucketFilter,
      slideshowOrder,
      slideshowTheme,
      slideshowFrames,
      slideshowReadyBucketCount,
      slideshowPreviewOpen,
      copied,
      onBucketFilterChange,
      onOrderChange,
      onThemeChange,
      onPreviewOpenChange,
      onExportSlideshowPlan,
      formatDateTime,
    },
    slideshowDraftCardProps: {
      slideshowReadyBucketCount,
      aiPhotoOpsBusy,
      uploadCount: slideshowDraftCardUploadCount,
      bucketCount: buckets.length,
      onGenerateAiPhotoOpsPlan,
    },
    statsCardsProps: {
      albumCount,
      activeAlbumCount,
      pausedAlbumCount,
      uploadCount: statsUploadCount,
    },
  };
}
