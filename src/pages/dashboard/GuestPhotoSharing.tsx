import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, ExternalLink, Camera, Plus, Link as LinkIcon, CalendarClock, Mail, EyeOff, Eye, Flag, Clapperboard, Sparkles, FolderTree } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ShareQrPanel } from '../../components/ui/ShareQrPanel';
import { getArchiveModeDescriptor } from '../../lib/archiveMode';
import { createEmptyPhotoBuckets } from '../../lib/aiPhotoBuckets';
import { PhotoBucketCards } from '../../components/dashboard/PhotoBucketCards';
import { mediaRepository } from '../../builder/services/mediaRepository';
import { PhotoBucketKind } from '../../lib/aiPhotoBuckets';
import { buildPhotoPlacementPlan } from '../../lib/aiPhotoPlacement';
import { buildQuickStartOverviewPath, readQuickStartDashboardContinuation } from '../../lib/quickStartContinuation';
import { parseDatetimeLocalToIso, toDatetimeLocalOrEmpty } from './guestPhotoDateTime';
import { formatGuestPhotoDate, formatGuestPhotoDateTime, getGuestPhotoSortTime, toGuestPhotoCsvTimestamp } from './guestPhotoUploadTime';
import { formatGuestPhotoEventDate, getSuggestedGuestPhotoWindowStart } from './guestPhotoEventDate';
import { buildAiPhotoOpsPlan, type AiPhotoOpsPlan } from '../../lib/aiPhotoOps';
import { copyTextOrDownload } from '../../lib/copyText';
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
  exportGuestPhotoManifest,
  manageGuestPhotoAlbum,
  moveGuestPhotoUploadToBucket,
  moderateGuestPhotoUploads,
  moderateGuestbookEntry as moderateGuestbookEntryFromService,
  persistGuestPhotoBuckets,
  persistGuestPhotoAiOpsPlan,
  queueGuestPhotoFollowups as queueGuestPhotoFollowupsFromService,
  refreshGuestPhotoSession,
  resolveGuestPhotoDashboardUserId,
  saveGuestPhotoHubSettings,
} from './guestPhotoSharingService';
import { buildGuestHubActions, summarizeGuestHubActions } from '../../lib/guestHubActions';
import { buildMemoryFlowReadiness } from '../../lib/memoryFlowReadiness';
import { buildGuestHubQrAssets, renderGuestHubQrPrintHtml } from '../../lib/guestHubQrAssets';
import {
  DEFAULT_HUB_SETTINGS,
  analysisDisplayStatus,
  analysisSourceLabel,
  buildPhotoBucketLinksCsv,
  buildPhotoDashboardCounts,
  buildPhotoKnownLinks,
  buildPhotoMemoryCollections,
  buildPhotoShareMessageLines,
  buildPhotoSharePackCsv,
  buildBucketUploadsCsv,
  buildCurationCsv,
  buildCuratedRecapExportPayload,
  buildGuestProspectsCsv,
  buildGuestbookCsv,
  buildMemoryChaptersExportPayload,
  eventMomentTags,
  getPhotoBucketDownloadName,
  makePhotoShareMessage,
  readStoredBucketLinks,
  safePhotoOwnerError,
  slugTag,
  tagLabel,
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
import { GuestPhotoCoupleAlbumsCard } from './guestPhotos/GuestPhotoCoupleAlbumsCard';
import { GuestPhotoFollowupCard } from './guestPhotos/GuestPhotoFollowupCard';
import { GuestPhotoGuestbookCard } from './guestPhotos/GuestPhotoGuestbookCard';
import { GuestPhotoHeroCard } from './guestPhotos/GuestPhotoHeroCard';
import { GuestPhotoHubControlsCard } from './guestPhotos/GuestPhotoHubControlsCard';
import { GuestPhotoHubQrCard } from './guestPhotos/GuestPhotoHubQrCard';
import { GuestPhotoMemoryFlowCard } from './guestPhotos/GuestPhotoMemoryFlowCard';
import { GuestPhotoMemoryVaultsCard } from './guestPhotos/GuestPhotoMemoryVaultsCard';
import { GuestPhotoMomentAlbumsCard } from './guestPhotos/GuestPhotoMomentAlbumsCard';
import { GuestPhotoMomentsCard } from './guestPhotos/GuestPhotoMomentsCard';
import { GuestPhotoOrganizerCard } from './guestPhotos/GuestPhotoOrganizerCard';
import { GuestPhotoRecapSharingCard } from './guestPhotos/GuestPhotoRecapSharingCard';
import { GuestPhotoReviewCard } from './guestPhotos/GuestPhotoReviewCard';
import { GuestPhotoSlideshowCard } from './guestPhotos/GuestPhotoSlideshowCard';
import { GuestPhotoSlideshowDraftCard } from './guestPhotos/GuestPhotoSlideshowDraftCard';
import { GuestPhotoStatsCards } from './guestPhotos/GuestPhotoStatsCards';

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
  const [savingHubSettings, setSavingHubSettings] = useState(false);
  const [queueingFollowups, setQueueingFollowups] = useState<'recap' | 'future_event' | null>(null);
  const [moderatingGuestbookId, setModeratingGuestbookId] = useState<string>('');
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
  const [copied, setCopied] = useState<string>('');
  const [copyFallbackValue, setCopyFallbackValue] = useState<string>('');
  const [workingBucketId, setWorkingBucketId] = useState<string>('');

  const [windowDrafts, setWindowDrafts] = useState<Record<string, { opensAt: string; closesAt: string }>>({});
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkUpdatingStatus, setBulkUpdatingStatus] = useState(false);
  const [bulkRegenerating, setBulkRegenerating] = useState(false);
  const [bulkModerating, setBulkModerating] = useState(false);
  const [photoBuckets, setPhotoBuckets] = useState(() => createEmptyPhotoBuckets());
  const [slideshowOrder, setSlideshowOrder] = useState<SlideshowOrderMode>('newest');
  const [slideshowBucketFilter, setSlideshowBucketFilter] = useState<string>('all');
  const [slideshowTheme, setSlideshowTheme] = useState<SlideshowTheme>('classic');
  const [slideshowPreviewOpen, setSlideshowPreviewOpen] = useState(false);
  const [aiPhotoOpsPlan, setAiPhotoOpsPlan] = useState<AiPhotoOpsPlan | null>(null);
  const [aiPhotoOpsBusy, setAiPhotoOpsBusy] = useState(false);
  const [aiPhotoMovesBusy, setAiPhotoMovesBusy] = useState(false);
  const [visionAiBusy, setVisionAiBusy] = useState(false);
  const [visionMovesBusy, setVisionMovesBusy] = useState(false);
  const bucketFileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingBucketRef = useRef<PhotoBucketKind | null>(null);
  const [pendingBucket, setPendingBucket] = useState<PhotoBucketKind | null>(null);
  const archiveMode = useMemo(() => getArchiveModeDescriptor({ weddingDate: events[0]?.event_date ?? null }), [events]);

  const loadDemoPhotoSpace = () => {
    const now = '2026-05-02T12:00:00.000Z';
    const demoAlbums: PhotoBucketRow[] = [
      {
        id: 'demo-photo-album-ceremony',
        name: 'Ceremony',
        slug: 'ceremony',
        parent_album_id: null,
        hierarchy_label: 'Ceremony',
        drive_folder_url: null,
        is_active: true,
        created_at: now,
        itinerary_event_id: 'ceremony-id',
        opens_at: null,
        closes_at: null,
      },
      {
        id: 'demo-photo-album-reception',
        name: 'Reception',
        slug: 'reception',
        parent_album_id: null,
        hierarchy_label: 'Reception',
        drive_folder_url: null,
        is_active: true,
        created_at: now,
        itinerary_event_id: 'reception-id',
        opens_at: null,
        closes_at: null,
      },
      {
        id: 'demo-photo-album-dance-floor',
        name: 'Dance floor',
        slug: 'dance-floor',
        parent_album_id: 'demo-photo-album-reception',
        hierarchy_label: 'Reception / Dance floor',
        drive_folder_url: null,
        is_active: true,
        created_at: now,
        itinerary_event_id: 'reception-id',
        opens_at: null,
        closes_at: null,
      },
    ];

    setSiteId(demoWeddingSite.id);
    setSiteSlug(demoWeddingSite.site_url);
    setEvents(demoEvents as ItineraryEvent[]);
    setBuckets(demoAlbums);
    setUploads([]);
    setUploadAnalyses([]);
    setUploadMetadata([]);
    setAiBucketCorrections([]);
    setGuestbookEntries([]);
    setGuestProspects([]);
    setHubSettings(DEFAULT_HUB_SETTINGS);
    setBucketUploadLinks({
      'demo-photo-album-ceremony': `${window.location.origin}/photos/upload/demo-site-id/ceremony`,
      'demo-photo-album-reception': `${window.location.origin}/photos/upload/demo-site-id/reception`,
      'demo-photo-album-dance-floor': `${window.location.origin}/photos/upload/demo-site-id/dance-floor`,
    });
    setWindowDrafts(Object.fromEntries(demoAlbums.map((album) => [album.id, { opensAt: '', closesAt: '' }])));
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const persistPhotoBuckets = async (nextBuckets: ReturnType<typeof createEmptyPhotoBuckets>) => {
    if (!siteId) return;
    await persistGuestPhotoBuckets(siteId, nextBuckets);
  };

  const handleBucketUploadClick = (bucket: PhotoBucketKind) => {
    pendingBucketRef.current = bucket;
    setPendingBucket(bucket);
    bucketFileInputRef.current?.click();
  };

  const handleBucketRemoveClick = async (bucket: PhotoBucketKind, itemId: string) => {
    const previousBuckets = photoBuckets;
    try {
      setSubmitting(true);
      const nextBuckets = {
        ...photoBuckets,
        [bucket]: photoBuckets[bucket].filter((item) => item.id !== itemId),
      };
      setPhotoBuckets(nextBuckets);
      await persistPhotoBuckets(nextBuckets);
      setSuccess('Photo removed from album.');
    } catch (err) {
      setPhotoBuckets(previousBuckets);
      setError(safePhotoOwnerError(err, 'Couldn’t remove that photo from the album.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBucketFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    const targetBucket = pendingBucketRef.current ?? pendingBucket;
    if (!files || !targetBucket || !siteId) return;
    const previousBuckets = photoBuckets;
    try {
      setSubmitting(true);
      const nextBuckets = { ...photoBuckets };
      for (const file of Array.from(files)) {
        const uploaded = await mediaRepository.upload(siteId, file);
        nextBuckets[targetBucket] = [
          ...nextBuckets[targetBucket],
          {
            id: uploaded.path,
            url: uploaded.url,
            bucket: targetBucket,
            label: file.name,
            uploadedAt: new Date().toISOString(),
          },
        ];
      }
      setPhotoBuckets(nextBuckets);
      await persistPhotoBuckets(nextBuckets);
      const placement = buildPhotoPlacementPlan(nextBuckets);
      const placementSummary = [
        placement.heroImage ? 'hero' : null,
        placement.storyImage ? 'story' : null,
        placement.travelImage ? 'travel' : null,
        placement.galleryImages.length ? `gallery (${placement.galleryImages.length})` : null,
      ].filter(Boolean).join(', ');
      setSuccess(placementSummary ? `Photo album updated. Current suggested placement: ${placementSummary}.` : 'Photo album updated.');
    } catch (err) {
      setPhotoBuckets(previousBuckets);
      setError(safePhotoOwnerError(err, 'Couldn’t add those photos to the album.'));
    } finally {
      setSubmitting(false);
      pendingBucketRef.current = null;
      setPendingBucket(null);
      if (event.target) event.target.value = '';
    }
  };

  async function load(retried = false) {
    try {
      setLoading(true);
      setError(null);

      const userId = await resolveGuestPhotoDashboardUserId();
      if (!userId && isDemoMode) {
        loadDemoPhotoSpace();
        return;
      }
      if (!userId) throw new Error('Your session needs a quick refresh. Please refresh and try again.');

      const snapshot = await loadGuestPhotoDashboardSnapshot(userId).catch((err) => {
        const message = err instanceof Error ? err.message : '';
        if (isDemoMode && message === 'Choose a wedding site before managing photos.') {
          return null;
        }
        throw err;
      });
      if (!snapshot && isDemoMode) {
        loadDemoPhotoSpace();
        return;
      }
      if (!snapshot) throw new Error('Choose a wedding site before managing photos.');

      setSiteId(snapshot.siteId);
      setSiteSlug(snapshot.siteSlug);
      const weddingMeta = snapshot.weddingMeta;
      const savedBuckets = ((weddingMeta.photoBuckets as ReturnType<typeof createEmptyPhotoBuckets> | undefined) ?? null);
      if (savedBuckets) setPhotoBuckets(savedBuckets);
      const savedAiPhotoOps = ((weddingMeta.aiPhotoOps as AiPhotoOpsPlan | undefined) ?? null);
      if (savedAiPhotoOps) setAiPhotoOpsPlan(savedAiPhotoOps);
      const nextBuckets = snapshot.buckets;
      setEvents(snapshot.events);
      setBuckets(nextBuckets);
      setUploads(snapshot.uploads);
      setGuestbookEntries(snapshot.guestbookEntries);
      setGuestProspects(snapshot.guestProspects);
      setUploadAnalyses(snapshot.uploadAnalyses);
      setUploadMetadata(snapshot.uploadMetadata);
      setAiBucketCorrections(snapshot.aiBucketCorrections);
      setHubSettings(snapshot.hubSettings);
      setBucketUploadLinks((prev) => {
        const liveBucketIds = new Set(nextBuckets.map((bucket) => bucket.id));
        const nextLinks = Object.fromEntries(
          Object.entries(prev).filter(([bucketId, link]) => liveBucketIds.has(bucketId) && typeof link === 'string' && link.length > 0)
        );
        return JSON.stringify(prev) === JSON.stringify(nextLinks) ? prev : nextLinks;
      });

      const nextDrafts: Record<string, { opensAt: string; closesAt: string }> = {};
      nextBuckets.forEach((a) => {
        nextDrafts[a.id] = {
          opensAt: toDatetimeLocalOrEmpty(a.opens_at),
          closesAt: toDatetimeLocalOrEmpty(a.closes_at),
        };
      });
      setWindowDrafts(nextDrafts);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const authish = msg.includes('invalid jwt') || msg.includes('jwt') || msg.includes('401') || msg.includes('auth');
      if (authish && !retried) {
        await refreshGuestPhotoSession();
        await load(true);
        return;
      }
      setSiteId(null);
      setSiteSlug(null);
      setEvents([]);
      setBuckets([]);
      setUploads([]);
      setUploadAnalyses([]);
      setUploadMetadata([]);
      setAiBucketCorrections([]);
      setGuestbookEntries([]);
      setGuestProspects([]);
      setHubSettings(DEFAULT_HUB_SETTINGS);
      setWindowDrafts({});
      setError(safePhotoOwnerError(err, 'Couldn’t load the photo space. Please refresh and try again.'));
    } finally {
      setLoading(false);
    }
  }

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

  const recentByBucket = useMemo(() => {
    const m = new Map<string, PhotoUploadRow[]>();
    const analysisMap = new Map(uploadAnalyses.map((analysis) => [analysis.upload_id, analysis]));
    uploads
      .filter((u) => (showHidden || !u.is_hidden) && (!showFlaggedOnly || u.is_flagged))
      .filter((u) => {
        if (tagFilter === 'all') return true;
        return safePhotoAnalysisList(analysisMap.get(u.id)?.tags).some((rawTag) => rawTag.trim().toLowerCase() === tagFilter);
      })
      .forEach((u) => {
        const arr = m.get(u.photo_album_id) ?? [];
        if (arr.length < 5) arr.push(u);
        m.set(u.photo_album_id, arr);
      });
    return m;
  }, [uploads, uploadAnalyses, showHidden, showFlaggedOnly, tagFilter]);
  const analysisByUploadId = useMemo(() => new Map(uploadAnalyses.map((analysis) => [analysis.upload_id, analysis])), [uploadAnalyses]);
  const metadataByUploadId = useMemo(() => new Map(uploadMetadata.map((metadata) => [metadata.upload_id, metadata])), [uploadMetadata]);
  const availableAiTags = useMemo(() => {
    const counts = new Map<string, number>();
    uploadAnalyses.forEach((analysis) => {
      safePhotoAnalysisList(analysis.tags).forEach((rawTag) => {
        const tag = rawTag.trim().toLowerCase();
        if (!tag) return;
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 24);
  }, [uploadAnalyses]);

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

  const copyText = async (value: string, key: string) => {
    try {
      const result = await copyTextOrDownload(value, `dayof-photo-${key}.txt`);
      setCopied(key);
      setCopyFallbackValue('');
      setTimeout(() => setCopied(''), 1400);
      if (result === 'downloaded') {
        setSuccess('Clipboard was blocked, so I saved a small text file instead.');
      }
    } catch {
      setCopyFallbackValue(value);
      setError('Clipboard access is blocked here. The text is ready below so you can select it.');
    }
  };

  const exportSlideshowPlan = async () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      theme: slideshowTheme,
      order: slideshowOrder,
      bucketFilter: slideshowBucketFilter,
      frameCount: slideshowFrames.length,
      frames: slideshowFrames,
      aiPhotoOps: aiPhotoOpsPlan
        ? {
            generatedAt: aiPhotoOpsPlan.generatedAt,
            source: aiPhotoOpsPlan.source,
            summary: aiPhotoOpsPlan.summary,
            slideshow: aiPhotoOpsPlan.slideshow,
          }
        : null,
    };

    const text = JSON.stringify(payload, null, 2);
    const result = await copyTextOrDownload(text, 'dayof-slideshow-plan.json', 'application/json;charset=utf-8');
    setCopied('slideshow-plan');
    setCopyFallbackValue('');
    setTimeout(() => setCopied(''), 1400);
    if (result === 'downloaded') {
      setSuccess('Clipboard was blocked, so I saved the slideshow notes instead.');
    }
  };

  const persistAiPhotoOpsPlan = async (plan: AiPhotoOpsPlan) => {
    if (!siteId) return;
    await persistGuestPhotoAiOpsPlan(siteId, plan);
  };

  const generateAiPhotoOpsPlan = async () => {
    if (!siteId) return;
    if (uploads.length === 0) {
      setError('Upload a few guest photos before organizing them.');
      return;
    }
    if (buckets.length === 0) {
      setError('Create at least one photo album before organizing uploads.');
      return;
    }

    setAiPhotoOpsBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const bucketCounts = new Map<string, number>();
      uploads.forEach((upload) => bucketCounts.set(upload.photo_album_id, (bucketCounts.get(upload.photo_album_id) ?? 0) + 1));
      const bucketById = new Map(buckets.map((bucket) => [bucket.id, bucket]));
      const plan = await buildAiPhotoOpsPlan({
        coupleLabel: siteSlug ?? 'this wedding',
        buckets: buckets.map((bucket) => ({
          id: bucket.id,
          name: bucket.name,
          slug: bucket.slug,
          parentBucketId: bucket.parent_album_id,
          hierarchyLabel: bucketDisplayName(bucket),
          isActive: bucket.is_active,
          uploadCount: bucketCounts.get(bucket.id) ?? 0,
        })),
        uploads: uploads
          .filter((upload) => !upload.is_hidden && !upload.is_flagged)
          .map((upload) => {
            const bucket = bucketById.get(upload.photo_album_id);
            return {
              id: upload.id,
              currentBucketId: upload.photo_album_id,
              currentBucketName: bucketDisplayName(bucket),
              filename: upload.original_filename,
              guestName: upload.guest_name,
              note: upload.note,
              mimeType: upload.mime_type,
              uploadedAt: upload.uploaded_at,
            };
          }),
      });
      setAiPhotoOpsPlan(plan);
      await persistAiPhotoOpsPlan(plan);
      setSuccess('Organized the photo board and saved a slideshow plan.');
    } catch (err) {
      setError(safePhotoOwnerError(err, 'Couldn’t organize the photo uploads yet.'));
    } finally {
      setAiPhotoOpsBusy(false);
    }
  };

  const applyHighConfidencePhotoMoves = async () => {
    if (!siteId || !aiPhotoOpsPlan) return;
    const moves = aiPhotoOpsPlan.bucketSuggestions.filter(
      (suggestion) => suggestion.confidence >= 0.74 && suggestion.targetBucketId !== suggestion.currentBucketId
    );

    if (moves.length === 0) {
      setSuccess('No high-confidence album moves to apply yet.');
      return;
    }

    setAiPhotoMovesBusy(true);
    setError(null);
    setSuccess(null);
    try {
      for (const move of moves) {
        await moveGuestPhotoUploadToBucket(siteId, move.uploadId, move.targetBucketId);
      }

      setUploads((prev) => prev.map((upload) => {
        const move = moves.find((entry) => entry.uploadId === upload.id);
        return move ? { ...upload, photo_album_id: move.targetBucketId } : upload;
      }));
      setSuccess(`Moved ${moves.length} upload${moves.length === 1 ? '' : 's'} into stronger albums.`);
    } catch (err) {
      setError(safePhotoOwnerError(err, 'Couldn’t move those photos yet.'));
    } finally {
      setAiPhotoMovesBusy(false);
    }
  };

  const recordVisionCorrection = async (
    analysis: PhotoUploadAiAnalysisRow,
    action: PhotoAiBucketCorrectionRow['action'],
    chosenBucketId: string | null,
    reason: string
  ) => {
    if (!siteId) return;
    const nextCorrection = await createGuestPhotoBucketCorrection(siteId, analysis, action, chosenBucketId, reason);
    setAiBucketCorrections((prev) => [nextCorrection, ...prev].slice(0, 100));
  };

  const applyVisionSuggestion = async (analysis: PhotoUploadAiAnalysisRow) => {
    if (!siteId || !analysis.suggested_bucket_id) return;
    setVisionMovesBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await moveGuestPhotoUploadToBucket(siteId, analysis.upload_id, analysis.suggested_bucket_id);
      await recordVisionCorrection(analysis, 'accepted', analysis.suggested_bucket_id, 'Accepted album suggestion.');
      setUploads((prev) => prev.map((upload) => upload.id === analysis.upload_id ? { ...upload, photo_album_id: analysis.suggested_bucket_id as string } : upload));
      setUploadAnalyses((prev) => prev.map((entry) => entry.upload_id === analysis.upload_id ? { ...entry, photo_album_id: analysis.suggested_bucket_id } : entry));
      setSuccess('Moved the photo and saved the preference.');
    } catch {
      setError('Couldn’t move that photo right now. Please try again.');
    } finally {
      setVisionMovesBusy(false);
    }
  };

  const rejectVisionSuggestion = async (analysis: PhotoUploadAiAnalysisRow) => {
    if (!siteId) return;
    setVisionMovesBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await recordVisionCorrection(analysis, 'rejected', analysis.photo_album_id, 'Rejected album suggestion.');
      setSuccess('Saved. Future sorting will use that correction.');
    } catch (err) {
      setError(safePhotoOwnerError(err, 'Couldn’t save that preference yet.'));
    } finally {
      setVisionMovesBusy(false);
    }
  };

  const analyzeUploadsWithVision = async (force = false) => {
    if (!siteId) return;
    if (uploads.length === 0) {
      setError('Upload photos before sorting them.');
      return;
    }

    setVisionAiBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const targetUploads = force ? uploads.filter((upload) => !upload.is_hidden && !upload.is_flagged) : unanalyzedUploads;
      const uploadIds = targetUploads.slice(0, 40).map((upload) => upload.id);
      if (uploadIds.length === 0) {
        setSuccess('All visible uploads already have saved photo details.');
        return;
      }

      const data = await analyzeGuestPhotoUploads(siteId, uploadIds, force, force ? 'vision' : 'auto');

      const nextResults = data.results ?? [];
      setUploadAnalyses((prev) => {
        const byId = new Map(prev.map((analysis) => [analysis.upload_id, analysis]));
        nextResults.forEach((analysis) => byId.set(analysis.upload_id, analysis));
        return Array.from(byId.values()).sort((a, b) => new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime());
      });
      setSuccess(`Photo details updated for ${data.analyzed ?? nextResults.length} upload${(data.analyzed ?? nextResults.length) === 1 ? '' : 's'}.`);
      await load();
    } catch (err) {
      setError(safePhotoOwnerError(err, 'Couldn’t review those photos yet.'));
    } finally {
      setVisionAiBusy(false);
    }
  };

  const applyHighConfidenceVisionMoves = async () => {
    if (!siteId) return;
    const moves = visionHighConfidenceMoves;
    if (moves.length === 0) {
      setSuccess('No high-confidence album moves to apply yet.');
      return;
    }

    setVisionMovesBusy(true);
    setError(null);
    setSuccess(null);
    try {
      for (const move of moves) {
        if (!move.suggested_bucket_id) continue;
        await moveGuestPhotoUploadToBucket(siteId, move.upload_id, move.suggested_bucket_id);
        await recordVisionCorrection(move, 'accepted', move.suggested_bucket_id, 'Accepted high-confidence album suggestion.');
      }

      setUploads((prev) => prev.map((upload) => {
        const move = moves.find((entry) => entry.upload_id === upload.id);
        return move?.suggested_bucket_id ? { ...upload, photo_album_id: move.suggested_bucket_id } : upload;
      }));
      setUploadAnalyses((prev) => prev.map((analysis) => {
        const move = moves.find((entry) => entry.upload_id === analysis.upload_id);
        return move?.suggested_bucket_id ? { ...analysis, photo_album_id: move.suggested_bucket_id } : analysis;
      }));
      setSuccess(`Applied ${moves.length} confirmed album move${moves.length === 1 ? '' : 's'}.`);
    } catch (err) {
      setError(safePhotoOwnerError(err, 'Couldn’t apply album moves.'));
    } finally {
      setVisionMovesBusy(false);
    }
  };

  const exportBucketCsv = (bucketId: string, bucketName: string) => {
    const rows = uploads.filter((u) => u.photo_album_id === bucketId);
    if (rows.length === 0) return;

    const blob = new Blob([buildBucketUploadsCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getPhotoBucketDownloadName(bucketName);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadTextFile = (filename: string, content: string, type = 'text/csv;charset=utf-8') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadGuestHubPrintPack = () => {
    if (guestHubQrAssets.length === 0) {
      setError('Set a public guest hub link before saving print cards.');
      return;
    }

    downloadTextFile(
      'dayof-guest-hub-qr-print-pack.html',
      renderGuestHubQrPrintHtml(guestHubQrAssets),
      'text/html;charset=utf-8'
    );
    setSuccess('Guest hub print cards saved.');
  };

  const exportMediaManifestCsv = async () => {
    if (uploads.length === 0) return;
    const esc = (value: string | number | null | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    try {
      if (!siteId) throw new Error('Choose a wedding site before exporting photos.');
      const data = await exportGuestPhotoManifest(siteId, showHidden);
      const rows = Array.isArray(data?.rows) ? data.rows as Array<Record<string, unknown>> : [];
      const lines = [
        ['album', 'filename', 'guest_name', 'guest_email', 'note', 'mime_type', 'size_bytes', 'uploaded_at', 'download_url', 'hidden', 'flagged'].join(','),
        ...rows.map((row) => [
          esc(row.bucket as string),
          esc(row.filename as string),
          esc(row.guest_name as string),
          esc(row.guest_email as string),
          esc(row.note as string),
          esc(row.mime_type as string),
          esc(row.size_bytes as string | number),
          esc(toGuestPhotoCsvTimestamp(String(row.uploaded_at ?? ''))),
          esc(row.download_url as string),
          esc(row.hidden as string),
          esc(row.flagged as string),
        ].join(',')),
      ];
      downloadTextFile('photo-handoff-links.csv', lines.join('\n'));
      logPhotoAction('media_manifest_exported', 'Guest media handoff sheet was saved.', {
        rowCount: rows.length,
        includeHidden: showHidden,
        signedLinks: true,
      });
      setSuccess('Saved a fresh photo handoff sheet. Private file links are refreshed for 24 hours.');
    } catch (err) {
      const bucketById = new Map(buckets.map((bucket) => [bucket.id, bucket]));
      const lines = [
        ['album', 'filename', 'guest_name', 'guest_email', 'note', 'mime_type', 'size_bytes', 'uploaded_at', 'download_url', 'hidden', 'flagged'].join(','),
        ...uploads.map((upload) => [
          esc(bucketById.get(upload.photo_album_id)?.name ?? ''),
          esc(upload.original_filename),
          esc(upload.guest_name),
          esc(upload.guest_email),
          esc(upload.note),
          esc(upload.mime_type),
          esc(upload.size_bytes),
          esc(toGuestPhotoCsvTimestamp(upload.uploaded_at)),
          esc(upload.drive_web_view_link),
          esc(upload.is_hidden ? 'yes' : 'no'),
          esc(upload.is_flagged ? 'yes' : 'no'),
        ].join(',')),
      ];
      downloadTextFile('photo-handoff-sheet.csv', lines.join('\n'));
      logPhotoAction('media_manifest_exported', 'Guest media handoff sheet was saved with current links.', {
        rowCount: uploads.length,
        includeHidden: showHidden,
        signedLinks: false,
      });
      setError(safePhotoOwnerError(err, 'Saved the current photo handoff sheet, but fresh private links need another try.'));
    }
  };

  const exportGuestbookCsv = () => {
    if (guestbookEntries.length === 0) return;
    downloadTextFile('guestbook-notes.csv', buildGuestbookCsv(guestbookEntries));
    logPhotoAction('guestbook_notes_exported', 'Guestbook notes were exported.', { rowCount: guestbookEntries.length });
  };

  const exportProspectsCsv = () => {
    if (guestProspects.length === 0) return;
    downloadTextFile('guest-photo-prospects.csv', buildGuestProspectsCsv(guestProspects));
    logPhotoAction('guest_prospects_exported', 'Guest photo prospect opt-ins were exported.', { rowCount: guestProspects.length });
  };

  const exportCurationCsv = () => {
    if (uploads.length === 0) return;
    downloadTextFile('photo-curation-queue.csv', buildCurationCsv({ uploads, buckets, analysisByUploadId, metadataByUploadId }));
    logPhotoAction('photo_curation_queue_exported', 'Photo curation queue was exported.', { rowCount: uploads.length });
  };

  const exportMemoryChaptersJson = () => {
    const payload = buildMemoryChaptersExportPayload({
      generatedAt: new Date().toISOString(),
      siteSlug,
      memoryChapters,
    });
    downloadTextFile('photo-memory-chapters.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  };

  const exportCuratedRecapJson = () => {
    const payload = buildCuratedRecapExportPayload({
      generatedAt: new Date().toISOString(),
      siteSlug,
      uploads,
      buckets,
      uploadAnalyses,
      hiddenUploadCount,
      flaggedUploadCount,
      highlightUploads,
      chronologicalUploads,
      memoryChapters,
      similarPhotoGroups,
      duplicateExtraCount,
      slideshowOrder,
      slideshowTheme,
      slideshowFrames,
    });
    downloadTextFile('photo-curated-recap.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  };

  const saveHubSettings = async () => {
    if (!siteId) return;
    try {
      setSavingHubSettings(true);
      setError(null);
      await saveGuestPhotoHubSettings(siteId, hubSettings);
      logPhotoAction('guest_hub_settings_saved', 'Guest hub settings were updated.', {
        photosEnabled: hubSettings.photos_enabled,
        guestbookEnabled: hubSettings.guestbook_enabled,
        recapStatus: hubSettings.recap_status,
        languageDefault: hubSettings.language_default,
      });
      setSuccess('Guest hub settings saved.');
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t save guest hub controls yet.'));
    } finally {
      setSavingHubSettings(false);
    }
  };

  const queueGuestFollowups = async (kind: 'recap' | 'future_event') => {
    if (!siteId) return;
    try {
      setQueueingFollowups(kind);
      setError(null);
      const data = await queueGuestPhotoFollowupsFromService(siteId, kind);
      const queued = Number((data as { queued?: number } | null)?.queued ?? 0);
      setSuccess(queued > 0 ? `Prepared ${queued} ${kind === 'recap' ? 'recap' : 'future event'} follow-up email${queued === 1 ? '' : 's'}.` : 'No new guest follow-ups are ready right now.');
      await load();
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t prepare guest follow-ups yet.'));
    } finally {
      setQueueingFollowups(null);
    }
  };

  const updateGuestbookEntry = async (entryId: string, patch: Partial<Pick<GuestbookEntryRow, 'is_hidden' | 'is_flagged'>>) => {
    try {
      setModeratingGuestbookId(entryId);
      await moderateGuestbookEntryFromService(entryId, patch);
      setGuestbookEntries((prev) => prev.map((entry) => entry.id === entryId ? { ...entry, ...patch } : entry));
      logPhotoAction('guestbook_entry_moderated', 'Guestbook entry moderation was updated.', patch, entryId, 'Guestbook entry');
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t update that guestbook note yet.'));
    } finally {
      setModeratingGuestbookId('');
    }
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
  const photoDashboardCounts = useMemo(() => buildPhotoDashboardCounts({
    uploads,
    buckets,
    uploadAnalyses,
    uploadMetadata,
    aiBucketCorrections,
  }), [aiBucketCorrections, buckets, uploadAnalyses, uploadMetadata, uploads]);
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
  const photoMemoryCollections = useMemo(() => buildPhotoMemoryCollections({
    uploads,
    analysisByUploadId,
    metadataByUploadId,
  }), [analysisByUploadId, metadataByUploadId, uploads]);
  const {
    chronologicalUploads,
    memoryChapters,
    highlightUploads,
    reviewUploads,
    similarPhotoGroups,
    duplicateExtraCount,
  } = photoMemoryCollections;
  const guestHubUrl = siteSlug ? `${window.location.origin}/event/${encodeURIComponent(siteSlug)}` : '';
  const guestRecapUrl = siteSlug ? `${window.location.origin}/event/${encodeURIComponent(siteSlug)}/recap` : '';
  const guestHubActions = useMemo(() => siteSlug ? buildGuestHubActions(siteSlug, hubSettings) : [], [hubSettings, siteSlug]);
  const guestHubActionSummary = useMemo(() => summarizeGuestHubActions(guestHubActions), [guestHubActions]);
  const guestHubQrAssets = useMemo(() => buildGuestHubQrAssets({
    hubUrl: guestHubUrl,
    coupleLabel: siteSlug ?? 'Wedding guests',
    actionSummary: guestHubActionSummary,
    includePhotoPrompt: hubSettings.photos_enabled,
  }), [guestHubActionSummary, guestHubUrl, hubSettings.photos_enabled, siteSlug]);
  const recapPublishWarnings = useMemo(() => [
    !hubSettings.photos_enabled ? 'Photo upload and recap sharing are off from the guest hub controls.' : null,
    flaggedUploadCount > 0 ? `${flaggedUploadCount} flagged upload${flaggedUploadCount === 1 ? '' : 's'} still need review.` : null,
    reviewUploads.length > 0 ? `${reviewUploads.length} upload${reviewUploads.length === 1 ? '' : 's'} are in the review queue.` : null,
    recapFeaturedCount === 0 && recapStoryCount === 0 ? 'No photos have been featured or marked for story yet.' : null,
  ].filter(Boolean) as string[], [hubSettings.photos_enabled, flaggedUploadCount, reviewUploads.length, recapFeaturedCount, recapStoryCount]);
  const memoryFlowReadiness = useMemo(() => buildMemoryFlowReadiness({
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
    slideshowFrameCount: slideshowFrames.length,
    slideshowReadyAlbumCount: slideshowReadyBucketCount,
    guestHubActionCount: guestHubActions.length,
    guestProspectCount: guestProspects.length,
  }), [
    activeBucketsCount,
    analysisByUploadId,
    buckets.length,
    flaggedUploadCount,
    guestHubActions.length,
    guestProspects.length,
    guestbookEntries.length,
    hubSettings.guestbook_enabled,
    hubSettings.photos_enabled,
    hubSettings.recap_status,
    recapFeaturedCount,
    recapStoryCount,
    reviewUploads.length,
    slideshowFrames.length,
    slideshowReadyBucketCount,
    uploads.length,
    uploads,
  ]);

  const filteredBuckets = useMemo(() => {
    const q = bucketSearch.trim().toLowerCase();
    return buckets.filter((a) => {
      const statusOk = statusFilter === 'all' || (statusFilter === 'active' ? a.is_active : !a.is_active);
      const parent = a.parent_album_id ? bucketById.get(a.parent_album_id) : null;
      const haystack = `${a.name} ${a.slug} ${a.hierarchy_label ?? ''} ${parent?.name ?? ''}`.toLowerCase();
      const searchOk = !q || haystack.includes(q);
      return statusOk && searchOk;
    }).sort((a, b) => {
      const aParent = a.parent_album_id ? bucketById.get(a.parent_album_id)?.name ?? '' : a.name;
      const bParent = b.parent_album_id ? bucketById.get(b.parent_album_id)?.name ?? '' : b.name;
      return aParent.localeCompare(bParent) || (bucketDepthById.get(a.id) ?? 0) - (bucketDepthById.get(b.id) ?? 0) || a.name.localeCompare(b.name);
    });
  }, [buckets, bucketSearch, statusFilter, bucketById, bucketDepthById]);

  const missingItineraryEvents = useMemo(() => {
    const linked = new Set(buckets.map((a) => a.itinerary_event_id).filter(Boolean));
    return events.filter((e) => !linked.has(e.id));
  }, [events, buckets]);

  const momentBucketSuggestions = useMemo(() => {
    const tagCounts = new Map(availableAiTags);
    const bucketNameTags = new Set(buckets.flatMap((bucket) => [
      slugTag(bucket.name),
      slugTag(bucket.hierarchy_label ?? ''),
      bucket.slug,
    ].filter(Boolean)));
    return events.flatMap((event) => {
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
  }, [availableAiTags, buckets, events]);

  const bucketCardTone = (bucketName: string) => {
    const name = bucketName.toLowerCase();
    if (/ceremony|vows|aisle/.test(name)) return 'Save the quiet, meaningful moments.';
    if (/welcome|party|cocktail/.test(name)) return 'Capture the energy before everyone settles in.';
    if (/dance|after party|after-party/.test(name)) return 'This is for the blurry, loud, great stuff.';
    if (/brunch|recovery|farewell/.test(name)) return 'Keep the softer next-day memories here.';
    return 'A clean album for one specific moment guests can easily understand.';
  };

  const sendAllActiveBucketRequests = () => {
    const lines = buildPhotoShareMessageLines({ buckets, bucketUploadLinks, activeOnly: true });

    if (lines.length === 0) {
      setError('No active albums with links available to send.');
      return;
    }

    const subject = encodeURIComponent('Photo upload links');
    const body = encodeURIComponent(lines.join('\n\n'));
    window.location.href = `/dashboard/messages?prefillSubject=${subject}&prefillBody=${body}`;
  };

  const copyAllShareMessages = async () => {
    const lines = buildPhotoShareMessageLines({ buckets, bucketUploadLinks });

    if (lines.length === 0) {
      setError('No share messages are ready yet. Create links first.');
      return;
    }

    await copyText(lines.join('\n\n'), 'all-share-messages');
    setSuccess(`Copied ${lines.length} share message(s).`);
  };

  const copyAllKnownLinks = async () => {
    const links = buildPhotoKnownLinks({ buckets, bucketUploadLinks });

    if (links.length === 0) {
      setError('No upload links are ready yet. Create or refresh links first.');
      return;
    }

    await copyText(links.join('\n'), 'all-links');
    setSuccess(`Copied ${links.length} link(s).`);
  };

  const regenerateAllKnownBucketLinks = async () => {
    const targetBuckets = buckets.filter((a) => bucketUploadLinks[a.id]);
    if (targetBuckets.length === 0) {
      setError('No album links are ready to refresh yet.');
      return;
    }

    try {
      setBulkRegenerating(true);
      setError(null);
      const updated: Record<string, string> = {};

      for (const bucket of targetBuckets) {
        const data = await manageGuestPhotoAlbum({ action: 'regenerate_link', albumId: bucket.id });
        const link = typeof data?.uploadUrl === 'string' ? data.uploadUrl : '';
        if (link) updated[bucket.id] = link;
      }

      if (Object.keys(updated).length > 0) {
        setBucketUploadLinks((prev) => ({ ...prev, ...updated }));
      }
      setSuccess(`Refreshed ${Object.keys(updated).length} link${Object.keys(updated).length === 1 ? '' : 's'}.`);
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t refresh those links yet.'));
    } finally {
      setBulkRegenerating(false);
    }
  };

  const exportSharePackCsv = () => {
    const csv = buildPhotoSharePackCsv({ buckets, bucketUploadLinks });
    if (!csv) return;
    downloadTextFile('photo-share-pack.csv', csv);
  };

  const exportBucketLinksCsv = () => {
    const csv = buildPhotoBucketLinksCsv({ buckets, bucketUploadLinks });
    if (!csv) return;
    downloadTextFile('photo-album-links.csv', csv);
  };

  const createMissingBucketsFromItinerary = async () => {
    if (!siteId) return;
    if (missingItineraryEvents.length === 0) {
      setSuccess('All itinerary events already have albums.');
      return;
    }

    try {
      setBulkCreating(true);
      setError(null);
      setSuccess(null);

      const created: string[] = [];
      const links: Record<string, string> = {};

      for (const event of missingItineraryEvents) {
        const data = await createGuestPhotoAlbum({
          siteId,
          name: event.event_name,
          itineraryEventId: event.id,
        });
        const createdAlbum = data?.album ?? data?.bucket;
        if (createdAlbum?.id) {
          created.push(event.event_name);
          if (typeof data.uploadUrl === 'string' && data.uploadUrl) {
            links[String(createdAlbum.id)] = data.uploadUrl;
          }
        }
      }

      if (Object.keys(links).length > 0) {
        setBucketUploadLinks((prev) => ({ ...prev, ...links }));
      }

      await load();
      setSuccess(`Created ${created.length} album${created.length === 1 ? '' : 's'} from itinerary events.`);
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t create itinerary albums yet.'));
    } finally {
      setBulkCreating(false);
    }
  };

  const createMomentBucketFromSuggestion = async (suggestion: {
    tag: string;
    label: string;
    eventId: string;
    eventName: string;
    parentBucket: PhotoBucketRow | null;
  }) => {
    if (!siteId) return;
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      const data = await createGuestPhotoAlbum({
        siteId,
        name: suggestion.label,
        itineraryEventId: suggestion.eventId,
        parentAlbumId: suggestion.parentBucket?.id ?? null,
      });
      const createdAlbum = data?.album ?? data?.bucket;
      if (!createdAlbum?.id) throw new Error('Couldn’t create that moment album yet.');
      const uploadUrl = (data.uploadUrl as string) ?? '';
      if (uploadUrl) setBucketUploadLinks((prev) => ({ ...prev, [String(createdAlbum.id)]: uploadUrl }));
      await load();
      setSuccess(suggestion.parentBucket ? `Created ${suggestion.parentBucket.name} / ${suggestion.label}.` : `Created ${suggestion.label} from ${suggestion.eventName}.`);
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t create that moment album yet.'));
    } finally {
      setSubmitting(false);
    }
  };

  const setUploadsHiddenByFilter = async (hide: boolean) => {
    const target = uploads.filter((u) => (showFlaggedOnly ? u.is_flagged : true) && (showHidden || !u.is_hidden));
    if (target.length === 0) {
      setSuccess('No uploads match current filters.');
      return;
    }

    try {
      setBulkModerating(true);
      setError(null);
      const ids = target.map((u) => u.id);
      await moderateGuestPhotoUploads(ids, { is_hidden: hide });
      await load();
      logPhotoAction(hide ? 'uploads_hidden_bulk' : 'uploads_unhidden_bulk', `${hide ? 'Hidden' : 'Unhidden'} uploads from the filtered photo view.`, {
        uploadCount: ids.length,
        showFlaggedOnly,
        showHidden,
      });
      setSuccess(`${hide ? 'Hidden' : 'Unhidden'} ${ids.length} upload(s) from current view.`);
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t update those photos yet.'));
    } finally {
      setBulkModerating(false);
    }
  };

  const hideReviewUploads = async () => {
    const targetIds = reviewUploads.map((entry) => entry.upload.id);
    if (targetIds.length === 0) {
      setSuccess('No review uploads to hide.');
      return;
    }

    try {
      setBulkModerating(true);
      setError(null);
      await moderateGuestPhotoUploads(targetIds, { is_hidden: true });
      await load();
      logPhotoAction('review_uploads_hidden_bulk', 'Review uploads were hidden in bulk.', { uploadCount: targetIds.length });
      setSuccess(`Hidden ${targetIds.length} review upload${targetIds.length === 1 ? '' : 's'}.`);
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t hide those review photos yet.'));
    } finally {
      setBulkModerating(false);
    }
  };

  const hideDuplicateExtras = async () => {
    const targetIds = Array.from(new Set(similarPhotoGroups.flatMap((group) => group.duplicateIds)));
    if (targetIds.length === 0) {
      setSuccess('No similar extras to tuck away.');
      return;
    }

    try {
      setBulkModerating(true);
      setError(null);
      await moderateGuestPhotoUploads(targetIds, { is_hidden: true });
      await load();
      logPhotoAction('duplicate_uploads_hidden_bulk', 'Duplicate extra uploads were hidden in bulk.', { uploadCount: targetIds.length });
      setSuccess(`Kept the best shot in each set and hid ${targetIds.length} extra similar photo${targetIds.length === 1 ? '' : 's'}.`);
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t hide the extra similar photos yet.'));
    } finally {
      setBulkModerating(false);
    }
  };

  const restoreHiddenUploads = async () => {
    const targetIds = uploads.filter((upload) => upload.is_hidden).map((upload) => upload.id);
    if (targetIds.length === 0) {
      setSuccess('No hidden uploads to restore.');
      return;
    }

    try {
      setBulkModerating(true);
      setError(null);
      await moderateGuestPhotoUploads(targetIds, { is_hidden: false });
      await load();
      logPhotoAction('hidden_uploads_restored_bulk', 'Hidden uploads were restored in bulk.', { uploadCount: targetIds.length });
      setSuccess(`Restored ${targetIds.length} hidden upload${targetIds.length === 1 ? '' : 's'}.`);
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t restore hidden photos yet.'));
    } finally {
      setBulkModerating(false);
    }
  };

  const setUploadsFlaggedByFilter = async (flagged: boolean) => {
    const target = uploads.filter((u) => (showHidden || !u.is_hidden));
    if (target.length === 0) {
      setSuccess('No uploads match current filters.');
      return;
    }

    try {
      setBulkModerating(true);
      setError(null);
      const ids = target.map((u) => u.id);
      await moderateGuestPhotoUploads(ids, { is_flagged: flagged });
      await load();
      logPhotoAction(flagged ? 'uploads_flagged_bulk' : 'uploads_unflagged_bulk', `${flagged ? 'Flagged' : 'Unflagged'} uploads from the filtered photo view.`, {
        uploadCount: ids.length,
        showHidden,
      });
      setSuccess(`${flagged ? 'Flagged' : 'Unflagged'} ${ids.length} upload(s) from current view.`);
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t update those photos yet.'));
    } finally {
      setBulkModerating(false);
    }
  };

  const setAllBucketsActive = async (isActive: boolean) => {
    const targetBuckets = buckets.filter((a) => a.is_active !== isActive);
    if (targetBuckets.length === 0) {
      setSuccess(isActive ? 'All albums are already active.' : 'All albums are already paused.');
      return;
    }

    try {
      setBulkUpdatingStatus(true);
      setError(null);
      setSuccess(null);

      for (const bucket of targetBuckets) {
        await manageGuestPhotoAlbum({ action: 'set_active', albumId: bucket.id, isActive });
      }

      await load();
      logPhotoAction(isActive ? 'buckets_activated_bulk' : 'buckets_paused_bulk', `${isActive ? 'Opened' : 'Paused'} photo albums in bulk.`, {
        bucketCount: targetBuckets.length,
      });
      setSuccess(`${isActive ? 'Activated' : 'Paused'} ${targetBuckets.length} album${targetBuckets.length === 1 ? '' : 's'}.`);
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t update album sharing yet.'));
    } finally {
      setBulkUpdatingStatus(false);
    }
  };

  const moderateUpload = async (uploadId: string, patch: Partial<Pick<PhotoUploadRow, 'is_hidden' | 'is_flagged' | 'recap_hidden' | 'recap_featured' | 'recap_story'>>) => {
    try {
      setError(null);
      await moderateGuestPhotoUploads([uploadId], patch);
      await load();
      logPhotoAction('upload_moderated', 'Photo upload moderation was updated.', patch, uploadId, 'Photo upload');
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t update that photo yet.'));
    }
  };

  const setBucketActive = async (bucketId: string, isActive: boolean) => {
    try {
      setWorkingBucketId(bucketId);
      setError(null);
      await manageGuestPhotoAlbum({ action: 'set_active', albumId: bucketId, isActive });
      await load();
      logPhotoAction(isActive ? 'bucket_activated' : 'bucket_paused', `${isActive ? 'Opened' : 'Paused'} a photo album.`, { isActive }, bucketId, bucketDisplayName(bucketById.get(bucketId)));
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t update album sharing yet.'));
    } finally {
      setWorkingBucketId('');
    }
  };

  const setBucketParent = async (bucketId: string, nextParentAlbumId: string) => {
    try {
      setWorkingBucketId(bucketId);
      setError(null);
      await manageGuestPhotoAlbum({ action: 'set_parent', albumId: bucketId, parentAlbumId: nextParentAlbumId || null });
      await load();
      setSuccess(nextParentAlbumId ? 'Sub-album relationship saved.' : 'Album moved back to top level.');
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t update the album grouping yet.'));
    } finally {
      setWorkingBucketId('');
    }
  };

  const regenerateLink = async (bucketId: string) => {
    try {
      setWorkingBucketId(bucketId);
      setError(null);
      setSuccess(null);
      const data = await manageGuestPhotoAlbum({ action: 'regenerate_link', albumId: bucketId });
      const uploadUrl = (data?.uploadUrl as string) ?? '';
      setLatestUploadUrl(uploadUrl);
      if (uploadUrl) {
        setBucketUploadLinks((prev) => ({ ...prev, [bucketId]: uploadUrl }));
      }
      setSuccess('Album link refreshed. The previous link no longer accepts uploads.');
      await load();
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t refresh that upload link yet.'));
    } finally {
      setWorkingBucketId('');
    }
  };

  const applySuggestedWindow = (bucketId: string) => {
    const bucket = buckets.find((a) => a.id === bucketId);
    if (!bucket) return;

    const event = events.find((e) => e.id === bucket.itinerary_event_id);
    const baseDate = getSuggestedGuestPhotoWindowStart(event?.event_date);
    const opens = baseDate;
    const closes = new Date(baseDate.getTime() + 72 * 60 * 60 * 1000); // +72h

    const toLocal = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setWindowDrafts((prev) => ({
      ...prev,
      [bucketId]: { opensAt: toLocal(opens), closesAt: toLocal(closes) },
    }));
  };

  const saveWindow = async (bucketId: string) => {
    try {
      setWorkingBucketId(bucketId);
      setError(null);
      setSuccess(null);
      const draft = windowDrafts[bucketId] ?? { opensAt: '', closesAt: '' };
      const opensAt = parseDatetimeLocalToIso(draft.opensAt);
      const closesAt = parseDatetimeLocalToIso(draft.closesAt);
      if (opensAt === undefined || closesAt === undefined) {
        throw new Error('Enter a clear open and close time.');
      }
      if (opensAt && closesAt && new Date(closesAt) <= new Date(opensAt)) {
        throw new Error('Close time must be after open time.');
      }
      await manageGuestPhotoAlbum({ action: 'set_window', albumId: bucketId, opensAt, closesAt });
      setSuccess('Upload window saved.');
      await load();
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t save that upload window yet.'));
    } finally {
      setWorkingBucketId('');
    }
  };

  const getBucketQrUrl = (uploadUrl: string) => `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(uploadUrl)}`;
  const openSafePublicUrl = (url: string | null | undefined) => {
    const safeUrl = getSafePublicWebUrl(url);
    if (safeUrl) window.open(safeUrl, '_blank', 'noopener,noreferrer');
  };
  const openAppUrl = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  const createBucket = async () => {
    if (!siteId) return;
    if (!name.trim()) {
      setError('Album name is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const data = await createGuestPhotoAlbum({
        siteId,
        name: name.trim(),
        itineraryEventId: itineraryEventId || null,
        parentAlbumId: parentAlbumId || null,
      });
      const createdAlbum = data?.album ?? data?.bucket;
      if (!createdAlbum?.id) throw new Error('Couldn’t create that album yet.');

      const uploadUrl = (data.uploadUrl as string) ?? '';
      setLatestUploadUrl(uploadUrl);
      if (uploadUrl && createdAlbum.id) {
        setBucketUploadLinks((prev) => ({ ...prev, [String(createdAlbum.id)]: uploadUrl }));
      }
      setSuccess(`Album "${createdAlbum.name ?? name.trim()}" created.`);
      setName('');
      setParentAlbumId('');
      await load();
    } catch (err: unknown) {
      setError(safePhotoOwnerError(err, 'Couldn’t create that album yet.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout currentPage="photos">
      <div className="space-y-6">
        {fromQuickStart && nextStep === 'review' && (
          <Card className="p-4 border border-primary/20 bg-primary/5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">Next up: add photos, then review your draft</p>
                <p className="text-xs text-text-secondary mt-1">Upload couple photos here. When you are ready, continue to your wedding home to review the draft and keep shaping the site.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate(buildQuickStartOverviewPath())}>
                Continue to review
              </Button>
            </div>
          </Card>
        )}
        <GuestPhotoHeroCard albumCount={buckets.length} uploadCount={totalUploads} />

        <GuestPhotoMemoryVaultsCard onOpenVaults={() => navigate('/dashboard/vault')} />

        <GuestPhotoMemoryFlowCard memoryFlowReadiness={memoryFlowReadiness} />

        {guestHubUrl && (
          <GuestPhotoHubQrCard
            guestHubUrl={guestHubUrl}
            guestRecapUrl={guestRecapUrl || ''}
            guestHubActionSummary={guestHubActionSummary}
            guestHubActions={guestHubActions}
            copied={copied}
            guestHubQrAssetCount={guestHubQrAssets.length}
            getBucketQrUrl={getBucketQrUrl}
            onCopyText={(text, key) => void copyText(text, key)}
            onOpenAppUrl={openAppUrl}
            onOpenSafePublicUrl={openSafePublicUrl}
            onDownloadGuestHubPrintPack={downloadGuestHubPrintPack}
          />
        )}

        {guestRecapUrl && (
          <GuestPhotoRecapSharingCard
            guestRecapUrl={guestRecapUrl}
            hubSettings={hubSettings}
            savingHubSettings={savingHubSettings}
            uploadCount={uploads.length}
            recapFeaturedCount={recapFeaturedCount}
            recapStoryCount={recapStoryCount}
            recapHiddenCount={recapHiddenCount}
            recapPublishWarnings={recapPublishWarnings}
            onOpenAppUrl={openAppUrl}
            onSaveHubSettings={() => void saveHubSettings()}
            onHubSettingsChange={setHubSettings}
          />
        )}

        {guestHubUrl && (
          <GuestPhotoHubControlsCard
            hubSettings={hubSettings}
            savingHubSettings={savingHubSettings}
            onSaveHubSettings={() => void saveHubSettings()}
            onHubSettingsChange={setHubSettings}
          />
        )}

        {guestProspects.length > 0 && (
          <GuestPhotoFollowupCard
            guestProspects={guestProspects}
            queueingFollowups={queueingFollowups}
            onExportProspectsCsv={exportProspectsCsv}
            onQueueGuestFollowups={(kind) => void queueGuestFollowups(kind)}
          />
        )}

        {guestbookEntries.length > 0 && (
          <GuestPhotoGuestbookCard
            guestbookEntries={guestbookEntries}
            moderatingGuestbookId={moderatingGuestbookId || null}
            onExportGuestbookCsv={exportGuestbookCsv}
            onUpdateGuestbookEntry={(entryId, patch) => void updateGuestbookEntry(entryId, patch)}
            formatDateTime={formatGuestPhotoDateTime}
          />
        )}

        <GuestPhotoCoupleAlbumsCard
          photoBuckets={photoBuckets}
          uploadDisabled={!siteId || submitting}
          bucketFileInputRef={bucketFileInputRef}
          onBucketUploadClick={handleBucketUploadClick}
          onBucketRemoveClick={handleBucketRemoveClick}
          onBucketFilesSelected={handleBucketFilesSelected}
        />

        <GuestPhotoStatsCards
          albumCount={buckets.length}
          activeAlbumCount={activeBucketsCount}
          pausedAlbumCount={pausedBucketsCount}
          uploadCount={totalUploads}
        />

        <GuestPhotoSlideshowDraftCard
          slideshowReadyBucketCount={slideshowReadyBucketCount}
          aiPhotoOpsBusy={aiPhotoOpsBusy}
          uploadCount={uploads.length}
          bucketCount={buckets.length}
          onGenerateAiPhotoOpsPlan={() => void generateAiPhotoOpsPlan()}
        />

        <GuestPhotoMomentsCard
          uploadAnalyses={uploadAnalyses}
          uploads={uploads}
          metadataByUploadId={metadataByUploadId}
          visionReadyCount={visionReadyCount}
          visionFallbackCount={visionFallbackCount}
          unanalyzedUploadCount={unanalyzedUploads.length}
          metadataExifCount={metadataExifCount}
          metadataGpsCount={metadataGpsCount}
          metadataEventMatchCount={metadataEventMatchCount}
          aiAcceptedCorrectionCount={aiAcceptedCorrectionCount}
          aiRejectedCorrectionCount={aiRejectedCorrectionCount}
          visionAiBusy={visionAiBusy}
          visionMovesBusy={visionMovesBusy}
          visionHighConfidenceMoveCount={visionHighConfidenceMoves.length}
          onAnalyzeNewPhotos={() => void analyzeUploadsWithVision(false)}
          onAnalyzeVisiblePhotos={() => void analyzeUploadsWithVision(true)}
          onApplyHighConfidenceMoves={() => void applyHighConfidenceVisionMoves()}
          onApplyVisionSuggestion={(analysis) => void applyVisionSuggestion(analysis)}
          onRejectVisionSuggestion={(analysis) => void rejectVisionSuggestion(analysis)}
          formatDateTime={formatGuestPhotoDateTime}
        />

        <GuestPhotoMomentAlbumsCard
          suggestions={momentBucketSuggestions}
          submitting={submitting}
          onCreateMomentBucket={(suggestion) => void createMomentBucketFromSuggestion(suggestion)}
        />

        <GuestPhotoReviewCard
          highlightUploads={highlightUploads}
          chronologicalUploads={chronologicalUploads}
          similarPhotoGroups={similarPhotoGroups}
          reviewUploads={reviewUploads}
          memoryChapters={memoryChapters}
          hiddenUploadCount={hiddenUploadCount}
          flaggedUploadCount={flaggedUploadCount}
          recapFeaturedCount={recapFeaturedCount}
          recapStoryCount={recapStoryCount}
          recapHiddenCount={recapHiddenCount}
          uploadCount={uploads.length}
          bulkModerating={bulkModerating}
          duplicateExtraCount={duplicateExtraCount}
          onUseHighlightsInSlideshow={() => setSlideshowOrder('highlights')}
          onUseSavedPhotoTimes={() => setSlideshowOrder('capture')}
          onExportCurationCsv={exportCurationCsv}
          onExportMemoryChapters={exportMemoryChaptersJson}
          onExportCuratedRecap={exportCuratedRecapJson}
          onHideReviewUploads={() => void hideReviewUploads()}
          onHideDuplicateExtras={() => void hideDuplicateExtras()}
          onRestoreHiddenUploads={() => void restoreHiddenUploads()}
          onModerateUpload={(uploadId, patch) => void moderateUpload(uploadId, patch)}
          formatDateTime={formatGuestPhotoDateTime}
        />

        {aiPhotoOpsPlan && (
          <GuestPhotoOrganizerCard
            aiPhotoOpsPlan={aiPhotoOpsPlan}
            aiSlideshowFrameCount={aiSlideshowFrameCount}
            aiPhotoMovesBusy={aiPhotoMovesBusy}
            aiHighConfidenceMoveCount={aiHighConfidenceMoves.length}
            copied={copied}
            onApplyHighConfidencePhotoMoves={() => void applyHighConfidencePhotoMoves()}
            onCopyOrganizerNotes={() => void copyText(JSON.stringify(aiPhotoOpsPlan, null, 2), 'ai-photo-plan')}
          />
        )}

        <GuestPhotoSlideshowCard
          buckets={buckets}
          countsByBucket={countsByBucket}
          slideshowBucketFilter={slideshowBucketFilter}
          slideshowOrder={slideshowOrder}
          slideshowTheme={slideshowTheme}
          slideshowFrames={slideshowFrames}
          slideshowReadyBucketCount={slideshowReadyBucketCount}
          slideshowPreviewOpen={slideshowPreviewOpen}
          copied={copied}
          onBucketFilterChange={setSlideshowBucketFilter}
          onOrderChange={setSlideshowOrder}
          onThemeChange={setSlideshowTheme}
          onPreviewOpenChange={setSlideshowPreviewOpen}
          onExportSlideshowPlan={() => void exportSlideshowPlan()}
          formatDateTime={formatGuestPhotoDateTime}
        />

        <GuestPhotoReviewCard
          highlightUploads={highlightUploads}
          chronologicalUploads={chronologicalUploads}
          similarPhotoGroups={similarPhotoGroups}
          reviewUploads={reviewUploads}
          memoryChapters={memoryChapters}
          hiddenUploadCount={hiddenUploadCount}
          flaggedUploadCount={flaggedUploadCount}
          recapFeaturedCount={recapFeaturedCount}
          recapStoryCount={recapStoryCount}
          recapHiddenCount={recapHiddenCount}
          uploadCount={uploads.length}
          bulkModerating={bulkModerating}
          duplicateExtraCount={duplicateExtraCount}
          onUseHighlightsInSlideshow={() => setSlideshowOrder('highlights')}
          onUseSavedPhotoTimes={() => setSlideshowOrder('capture')}
          onExportCurationCsv={exportCurationCsv}
          onExportMemoryChapters={exportMemoryChaptersJson}
          onExportCuratedRecap={exportCuratedRecapJson}
          onHideReviewUploads={() => void hideReviewUploads()}
          onHideDuplicateExtras={() => void hideDuplicateExtras()}
          onRestoreHiddenUploads={() => void restoreHiddenUploads()}
          onModerateUpload={(uploadId, patch) => void moderateUpload(uploadId, patch)}
          formatDateTime={formatGuestPhotoDateTime}
        />

        <Card className="overflow-hidden border border-border-subtle bg-white">
          <div className="border-b border-neutral-100 bg-neutral-50/80 px-6 py-5">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-neutral-900">Album links</h2>
            </div>
            <p className="text-sm text-neutral-600">Create albums for the moments you want people to upload into. Think welcome party, dance floor, disposables, table shots, brunch, or anything else worth collecting.</p>
          </div>
          <div className="p-6 space-y-5">

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Ceremony', hint: 'The core moment' },
              { label: 'Walking down aisle', hint: 'A smaller ceremony album' },
              { label: 'Reception', hint: 'Dinner and the party' },
              { label: 'Dance floor', hint: 'The fun stuff' },
            ].map((template) => (
              <button
                key={template.label}
                type="button"
                onClick={() => setName(template.label)}
                className="rounded-lg border border-border-subtle bg-surface-subtle px-4 py-4 text-left transition hover:border-neutral-300 hover:bg-white"
              >
                <p className="text-sm font-medium text-neutral-900">{template.label}</p>
                <p className="mt-1 text-xs text-neutral-500">{template.hint}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Album name</label>
              <Input value={name ?? ''} onChange={(e) => setName(e.target.value)} placeholder="Ceremony" />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Parent album (optional)</label>
              <select
                value={parentAlbumId}
                onChange={(e) => setParentAlbumId(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">Top-level album</option>
                {buckets
                  .sort((a, b) => bucketDisplayName(a).localeCompare(bucketDisplayName(b)))
                  .map((bucket) => (
                    <option key={bucket.id} value={bucket.id}>
                      {bucketDisplayName(bucket)}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-neutral-500">Use this for Ceremony / Walking down aisle, Reception / Dance floor, and other moment groups.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Link to itinerary event (optional)</label>
              <select
                value={itineraryEventId}
                onChange={(e) => setItineraryEventId(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.event_name} ({formatGuestPhotoEventDate(event.event_date)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Button onClick={createBucket} disabled={submitting || loading} className="w-full sm:w-auto">
                <Camera className="w-4 h-4 mr-1" />
                {submitting ? 'Creating...' : 'Add album'}
              </Button>
              {latestUploadUrl && (
                <Button variant="outline" onClick={() => void copyText(latestUploadUrl, 'sheet-dashboard-link')} className="w-full sm:w-auto">
                  <Copy className="w-4 h-4 mr-1" />
                  {copied === 'sheet-dashboard-link' ? 'Copied newest album link' : 'Copy newest album link'}
                </Button>
              )}
              {latestUploadUrl && (
                <Button variant="outline" onClick={() => openSafePublicUrl(getBucketQrUrl(latestUploadUrl))} className="w-full sm:w-auto">
                  QR for newest album
                </Button>
              )}
              {latestUploadUrl && (
                <Button variant="outline" onClick={() => openAppUrl(latestUploadUrl)} className="w-full sm:w-auto">
                  <ExternalLink className="w-4 h-4 mr-1" /> Open newest album link
                </Button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-border-subtle bg-surface-subtle/40 px-3 py-2">
              <p className="text-xs text-text-secondary">
                Missing event albums: <span className="font-semibold text-text-primary">{missingItineraryEvents.length}</span>
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void createMissingBucketsFromItinerary()}
                disabled={bulkCreating || loading || missingItineraryEvents.length === 0}
                className="w-full sm:w-auto"
              >
                {bulkCreating ? 'Creating event albums...' : 'Create missing event albums'}
              </Button>
            </div>
          </div>

          {error && <p className="mt-3 rounded-lg border border-border-subtle bg-surface-secondary px-3 py-2 text-sm text-text-secondary">{error}</p>}
          {success && <p className="mt-3 rounded-lg border border-border-subtle bg-surface-secondary px-3 py-2 text-sm text-text-secondary">{success}</p>}
          {copyFallbackValue && (
            <textarea
              className="mt-3 min-h-24 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-text-primary"
              readOnly
              value={copyFallbackValue ?? ''}
              onFocus={(event) => event.currentTarget.select()}
              aria-label="Copy text"
            />
          )}

          {latestUploadUrl && (
            <div className="grid gap-3 lg:grid-cols-[1.35fr_0.9fr]">
              <div className="rounded-lg border border-border-subtle bg-surface-subtle p-4">
                <p className="text-sm font-medium text-text-primary mb-1">Newest album link</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-text-secondary break-all">{latestUploadUrl}</code>
                  <Button size="sm" variant="outline" onClick={() => copyText(latestUploadUrl, 'latest')}>
                    <Copy className="w-3 h-3 mr-1" /> {copied === 'latest' ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-subtle p-4">
                <p className="text-xs font-semibold text-text-tertiary">Newest album link</p>
                <p className="mt-2 text-sm text-neutral-700">Use a real album upload link here. Guests should land in the right place immediately.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {latestUploadUrl ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openAppUrl(latestUploadUrl)}>Open newest album link</Button>
                      <Button size="sm" variant="outline" onClick={() => openSafePublicUrl(getBucketQrUrl(latestUploadUrl))}>Open QR</Button>
                    </>
                  ) : (
                    <p className="text-xs text-neutral-500">Create or refresh an album link before sharing uploads.</p>
                  )}
                </div>
                {latestUploadUrl && (
                  <ShareQrPanel
                    title="Newest album QR"
                    description="Use this on table cards or signage for the latest upload album."
                    url={latestUploadUrl}
                    copyLabel="Copy upload link"
                    className="mt-4"
                  />
                )}
              </div>
            </div>
          )}
          </div>
        </Card>

        <Card className="p-6 border border-border-subtle">
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-neutral-900">Albums</h2>
              <div className="text-xs text-neutral-500">{filteredBuckets.length} visible</div>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
              <div className="rounded-lg border border-border-subtle bg-surface-subtle p-4">
                <p className="text-xs font-semibold text-text-tertiary">Sharing home</p>
                <p className="mt-2 text-sm text-neutral-700">Copy links, QR codes, and guest-facing prompts without digging through menus.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => void copyAllKnownLinks()}>
                    {copied === 'all-links' ? 'Copied all links' : 'Copy all album links'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void copyAllShareMessages()}>
                    {copied === 'all-share-messages' ? 'Copied prompts' : 'Copy all share prompts'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => sendAllActiveBucketRequests()}>
                    Send all active album requests
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void regenerateAllKnownBucketLinks()} disabled={bulkRegenerating}>
                    {bulkRegenerating ? 'Refreshing links...' : 'Refresh all links'}
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-border-subtle bg-white p-4">
                <p className="text-xs font-medium text-text-tertiary">Owner controls</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportBucketLinksCsv()}>Save album link sheet</Button>
                  <Button size="sm" variant="outline" onClick={() => exportSharePackCsv()}>Save sharing notes</Button>
                  <Button size="sm" variant="outline" onClick={() => void exportMediaManifestCsv()} disabled={uploads.length === 0}>Save photo handoff sheet</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowFlaggedOnly((v) => !v)}>
                    {showFlaggedOnly ? 'Show all uploads' : 'Show flagged only'}
                  </Button>
                  <select
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    className="h-9 rounded-lg border border-neutral-300 bg-white px-3 text-xs text-neutral-700"
                  >
                    <option value="all">All tags</option>
                    {availableAiTags.map(([tag, count]) => (
                      <option key={tag} value={tag}>
                        {tag} ({count})
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" onClick={() => setShowHidden((v) => !v)}>
                    {showHidden ? 'Hide hidden items' : 'Show hidden items'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void setUploadsFlaggedByFilter(true)} disabled={bulkModerating}>Flag visible</Button>
                  <Button size="sm" variant="outline" onClick={() => void setUploadsFlaggedByFilter(false)} disabled={bulkModerating}>Unflag visible</Button>
                  <Button size="sm" variant="outline" onClick={() => void setUploadsHiddenByFilter(true)} disabled={bulkModerating}>Hide visible</Button>
                  <Button size="sm" variant="outline" onClick={() => void setUploadsHiddenByFilter(false)} disabled={bulkModerating}>Unhide visible</Button>
                </div>
              </div>
            </div>
          </div>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              value={bucketSearch ?? ''}
              onChange={(e) => setBucketSearch(e.target.value)}
              placeholder="Search album name"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'paused')}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="paused">Paused only</option>
            </select>
            <div className="text-xs text-neutral-500 flex items-center">{filteredBuckets.length} album{filteredBuckets.length === 1 ? '' : 's'}</div>
          </div>

          {loading ? (
            <p className="text-sm text-neutral-500">Loading albums…</p>
          ) : buckets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-subtle bg-surface-subtle p-8">
              <p className="text-xs font-semibold text-neutral-500">Blank album sheet</p>
              <h3 className="mt-3 text-2xl font-semibold text-neutral-900">Start with the moments you actually want back.</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">Create a few simple albums first, then share the upload link or QR so guests know exactly where to send photos.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {['Welcome party', 'Ceremony', 'Dance floor', 'Brunch'].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setName(suggestion)}
                    className="rounded-lg border border-border-subtle bg-white px-4 py-4 text-left transition-colors hover:bg-surface-subtle"
                  >
                    <p className="text-sm font-medium text-neutral-900">{suggestion}</p>
                    <p className="mt-1 text-xs text-neutral-500">Use this as your next album</p>
                  </button>
                ))}
              </div>
            </div>
          ) : filteredBuckets.length === 0 ? (
            <div className="rounded-lg border border-border-subtle bg-surface-subtle px-4 py-5 text-sm text-text-secondary">
              No albums match those filters. Try a different search, switch the status filter, or clear your hidden / flagged view.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBuckets.map((bucket) => {
                const uploadCount = countsByBucket.get(bucket.id) ?? 0;
                const rollupUploadCount = uploadCountWithChildren(bucket.id);
                const hiddenCount = hiddenCountsByBucket.get(bucket.id) ?? 0;
                const flaggedCount = flaggedCountsByBucket.get(bucket.id) ?? 0;
                const recents = recentByBucket.get(bucket.id) ?? [];
                const draft = windowDrafts[bucket.id] ?? { opensAt: '', closesAt: '' };
                const knownUploadLink = bucketUploadLinks[bucket.id] || '';
                const hasWindow = Boolean(bucket.opens_at || bucket.closes_at);
                const hasLink = Boolean(knownUploadLink);
                const parentBucket = bucket.parent_album_id ? bucketById.get(bucket.parent_album_id) : null;
                const childBuckets = childBucketsByParent.get(bucket.id) ?? [];
                const depth = bucketDepthById.get(bucket.id) ?? 0;

                return (
                  <div key={bucket.id} className="overflow-hidden rounded-lg border border-border-subtle bg-white">
                    <div className="border-b border-border-subtle bg-surface-subtle px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className={depth > 0 ? 'pl-4 border-l-2 border-border-subtle' : ''}>
                          {parentBucket && (
                            <p className="mb-1 inline-flex items-center rounded-lg bg-white px-2 py-0.5 text-xs font-medium text-text-secondary border border-border-subtle">
                              <FolderTree className="mr-1 h-3 w-3" /> {parentBucket.name}
                            </p>
                          )}
                          <p className="font-medium text-neutral-900">{bucket.name}</p>
                          <p className="mt-1 text-sm text-neutral-600">{bucketCardTone(bucket.name)}</p>
                          <p className="text-xs text-neutral-500">Created {formatGuestPhotoDateTime(bucket.created_at)}</p>
                          <div className="mt-1 text-xs text-neutral-500 flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex rounded px-2 py-0.5 ${bucket.is_active ? 'bg-surface-secondary text-text-primary border border-border-subtle' : 'bg-neutral-100 text-neutral-600'}`}>
                              {bucket.is_active ? 'Active' : 'Paused'}
                            </span>
                            <span>{uploadCount} direct uploads</span>
                            {childBuckets.length > 0 && <span>{rollupUploadCount} with sub-albums</span>}
                            {!hasLink && <span className="text-primary">no saved link yet</span>}
                            {!hasWindow && <span className="text-primary">no upload window yet</span>}
                            {flaggedCount > 0 && <span className="text-primary">{flaggedCount} flagged</span>}
                            {hiddenCount > 0 && <span className="text-neutral-600">{hiddenCount} hidden</span>}
                            <span>Guest album label: {bucket.slug}</span>
                          {hasLink && <span className="text-text-secondary">upload link ready</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-end">
                        {getSafePublicWebUrl(bucket.drive_folder_url) && (
                          <Button size="sm" variant="outline" onClick={() => openSafePublicUrl(bucket.drive_folder_url)}>
                            <ExternalLink className="w-3 h-3 mr-1" /> Backup
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={workingBucketId === bucket.id}
                          onClick={() => void regenerateLink(bucket.id)}
                        >
                          <LinkIcon className="w-3 h-3 mr-1" />
                          {workingBucketId === bucket.id ? 'Working...' : 'Refresh upload link'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!knownUploadLink}
                          onClick={() => void copyText(knownUploadLink, `uplink-${bucket.id}`)}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          {copied === `uplink-${bucket.id}` ? 'Copy ready' : 'Copy link'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!knownUploadLink}
                          onClick={() => openSafePublicUrl(getBucketQrUrl(knownUploadLink))}
                        >
                          QR code
                        </Button>
                        <Button
                          size="sm"
                          variant={bucket.is_active ? 'outline' : 'accent'}
                          disabled={workingBucketId === bucket.id}
                          onClick={() => void setBucketActive(bucket.id, !bucket.is_active)}
                        >
                          {workingBucketId === bucket.id ? 'Working...' : bucket.is_active ? 'Pause' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportBucketCsv(bucket.id, bucket.name)}
                          disabled={uploadCount === 0}
                        >
                          Save photo list
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!knownUploadLink}
                          onClick={() => void copyText(makePhotoShareMessage(bucket.name, knownUploadLink), `share-msg-${bucket.id}`)}
                        >
                          {copied === `share-msg-${bucket.id}` ? 'Copied share prompt' : 'Copy share prompt'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const shareUrl = knownUploadLink || latestUploadUrl || `${window.location.origin}/photos/upload`;
                            const subject = encodeURIComponent(`${bucket.name} photos upload`);
                            const body = encodeURIComponent(makePhotoShareMessage(bucket.name, shareUrl));
                            window.location.href = `/dashboard/messages?prefillSubject=${subject}&prefillBody=${body}`;
                          }}
                        >
                          <Mail className="w-3 h-3 mr-1" /> Send to messaging
                        </Button>
                        </div>
                      </div>
                    </div>
                    <div className="px-5 py-4 space-y-4">

                    {childBuckets.length > 0 && (
                      <div className="rounded-lg border border-border-subtle bg-surface-subtle p-3">
                        <p className="text-xs font-semibold text-text-primary">Sub-albums</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {childBuckets.map((child) => (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => setBucketSearch(child.name)}
                              className="rounded-lg border border-border-subtle bg-white px-3 py-1 text-xs font-medium text-text-primary"
                            >
                              {child.name} · {countsByBucket.get(child.id) ?? 0}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {hasLink && (
                      <div className="rounded-lg border border-border-subtle bg-surface-subtle p-3">
                        <p className="text-xs font-semibold text-text-primary">Upload link ready</p>
                        <p className="mt-1 text-sm text-text-primary">Share one clean upload destination for this album.</p>
                        <p className="mt-2 truncate text-xs text-text-secondary">{knownUploadLink}</p>
                      </div>
                    )}

                    <div className="rounded-lg border border-border-subtle p-3 bg-surface-subtle">
                      <div className="mb-3">
                        <label className="block text-xs text-neutral-500 mb-1">Parent album</label>
                        <select
                          value={bucket.parent_album_id ?? ''}
                          onChange={(e) => void setBucketParent(bucket.id, e.target.value)}
                          disabled={workingBucketId === bucket.id}
                          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">Top-level album</option>
                          {buckets
                            .filter((candidate) => candidate.id !== bucket.id && !(descendantBucketIdsByParent.get(bucket.id) ?? []).includes(candidate.id))
                            .sort((a, b) => bucketDisplayName(a).localeCompare(bucketDisplayName(b)))
                            .map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {bucketDisplayName(candidate)}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2 mb-2 text-xs font-medium text-neutral-700">
                        <CalendarClock className="w-3.5 h-3.5" /> Collect between
                      </div>
                      <p className="mb-3 text-xs text-neutral-500">Optional. Use this when you want uploads to open and close around a specific event.</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1">Opens</label>
                          <Input
                            type="datetime-local"
                            value={draft.opensAt ?? ''}
                            onChange={(e) => setWindowDrafts((prev) => ({ ...prev, [bucket.id]: { ...draft, opensAt: e.target.value } }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1">Closes</label>
                          <Input
                            type="datetime-local"
                            value={draft.closesAt ?? ''}
                            onChange={(e) => setWindowDrafts((prev) => ({ ...prev, [bucket.id]: { ...draft, closesAt: e.target.value } }))}
                          />
                        </div>
                        <Button size="sm" variant="outline" disabled={workingBucketId === bucket.id} onClick={() => applySuggestedWindow(bucket.id)}>
                          Suggested window
                        </Button>
                        <Button size="sm" variant="outline" disabled={workingBucketId === bucket.id} onClick={() => void saveWindow(bucket.id)}>
                          {workingBucketId === bucket.id ? 'Saving...' : 'Save window'}
                        </Button>
                      </div>
                    </div>

                    {recents.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-neutral-700 mb-1">Recent uploads</p>
                        <ul className="space-y-2 text-xs text-neutral-600">
                          {recents.map((u) => (
                            <li key={u.id} className={`rounded border px-2 py-1 ${u.is_hidden ? 'bg-neutral-100 border-neutral-200' : 'bg-white border-neutral-200'}`}>
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <span>
                                    {u.original_filename} · {u.guest_name || 'Guest'}{u.guest_email ? ` (${u.guest_email})` : ''} · {formatGuestPhotoDateTime(u.uploaded_at)}
                                  </span>
                                  {safePhotoAnalysisList(analysisByUploadId.get(u.id)?.tags).length ? (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {safePhotoAnalysisList(analysisByUploadId.get(u.id)?.tags).slice(0, 5).map((tag) => (
                                        <button
                                          key={`${u.id}-${tag}`}
                                          type="button"
                                          onClick={() => setTagFilter(tag.trim().toLowerCase())}
                                          className="rounded-lg bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600 hover:bg-neutral-200"
                                        >
                                          #{tag}
                                        </button>
                                      ))}
                                    </div>
                                  ) : null}
                                  {(u.recap_featured || u.recap_story || u.recap_hidden) && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {u.recap_featured && <span className="rounded-lg bg-surface-subtle px-2 py-0.5 text-[11px] text-text-secondary border border-border-subtle">Featured</span>}
                                      {u.recap_story && <span className="rounded-lg bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-700">Story</span>}
                                      {u.recap_hidden && <span className="rounded-lg bg-neutral-200 px-2 py-0.5 text-[11px] text-neutral-700">Recap hidden</span>}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    className={`inline-flex items-center rounded px-1.5 py-0.5 border ${u.recap_featured ? 'bg-surface-subtle text-text-primary border-border-subtle' : 'bg-white text-neutral-600 border-neutral-300'}`}
                                    onClick={() => void moderateUpload(u.id, { recap_featured: !u.recap_featured })}
                                  >
                                    {u.recap_featured ? 'Unfeature' : 'Feature'}
                                  </button>
                                  <button
                                    type="button"
                                    className={`inline-flex items-center rounded px-1.5 py-0.5 border ${u.recap_story ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-300'}`}
                                    onClick={() => void moderateUpload(u.id, { recap_story: !u.recap_story })}
                                  >
                                    {u.recap_story ? 'Unstory' : 'Story'}
                                  </button>
                                  <button
                                    type="button"
                                    className={`inline-flex items-center rounded px-1.5 py-0.5 border ${u.recap_hidden ? 'bg-neutral-200 text-neutral-700 border-neutral-300' : 'bg-white text-neutral-600 border-neutral-300'}`}
                                    onClick={() => void moderateUpload(u.id, { recap_hidden: !u.recap_hidden })}
                                  >
                                    {u.recap_hidden ? 'Show recap' : 'Hide recap'}
                                  </button>
                                  <button
                                    type="button"
                                    className={`inline-flex items-center rounded px-1.5 py-0.5 border ${u.is_flagged ? 'bg-surface-subtle text-text-primary border-border-subtle' : 'bg-white text-neutral-600 border-neutral-300'}`}
                                    onClick={() => void moderateUpload(u.id, { is_flagged: !u.is_flagged })}
                                  >
                                    <Flag className="w-3 h-3 mr-1" /> {u.is_flagged ? 'Unflag' : 'Flag'}
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-flex items-center rounded px-1.5 py-0.5 border bg-white text-neutral-600 border-neutral-300"
                                    onClick={() => void moderateUpload(u.id, { is_hidden: !u.is_hidden })}
                                  >
                                    {u.is_hidden ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                                    {u.is_hidden ? 'Restore' : 'Remove'}
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default GuestPhotoSharing;
