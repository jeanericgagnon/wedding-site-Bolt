import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, ExternalLink, Camera, Plus, Link as LinkIcon, CalendarClock, Mail, EyeOff, Eye, Flag, Clapperboard, QrCode, Sparkles, FolderTree } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ShareQrPanel } from '../../components/ui/ShareQrPanel';
import { supabase } from '../../lib/supabase';
import { invokeFunctionOrThrow } from '../../lib/invokeFunctionOrThrow';
import { getArchiveModeDescriptor } from '../../lib/archiveMode';
import { createEmptyPhotoBuckets } from '../../lib/aiPhotoBuckets';
import { PhotoBucketCards } from '../../components/dashboard/PhotoBucketCards';
import { mediaRepository } from '../../builder/services/mediaRepository';
import { PhotoBucketKind } from '../../lib/aiPhotoBuckets';
import { buildPhotoPlacementPlan } from '../../lib/aiPhotoPlacement';
import { mergeGeneratedDraftIntoBuilderProject } from '../../lib/aiBuilderProjectPatch';
import { buildQuickStartOverviewPath, readQuickStartDashboardContinuation } from '../../lib/quickStartContinuation';
import { parseDatetimeLocalToIso, toDatetimeLocalOrEmpty } from './guestPhotoDateTime';
import { formatGuestPhotoDate, formatGuestPhotoDateTime, getGuestPhotoSortTime, toGuestPhotoCsvTimestamp } from './guestPhotoUploadTime';
import { formatGuestPhotoEventDate, getSuggestedGuestPhotoWindowStart } from './guestPhotoEventDate';
import { buildAiPhotoOpsPlan, type AiPhotoOpsPlan } from '../../lib/aiPhotoOps';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { copyTextOrDownload } from '../../lib/copyText';
import { safeOptionalPhotoAnalysisText, safePhotoAnalysisList, safePhotoAnalysisText } from '../../lib/photoAnalysisCustomerCopy';
import { logAppAction } from '../../lib/actionAudit';
import { useAuth } from '../../contexts/AuthContext';
import { demoEvents, demoWeddingSite } from '../../lib/demoData';
import { getSafePublicWebUrl } from '../../sections/publicLinks';
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

  const invokeOrThrow = async (fnName: string, body: Record<string, unknown>) => {
    try {
      return await invokeFunctionOrThrow(supabase, fnName, body);
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const authish = msg.includes('invalid jwt') || msg.includes('jwt') || msg.includes('401') || msg.includes('auth');
      if (!authish) throw err;

      const { data } = await supabase.auth.refreshSession();
      if (!data.session) throw err;
      return await invokeFunctionOrThrow(supabase, fnName, body);
    }
  };

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
    const { data, error } = await supabase
      .from('wedding_sites')
      .select('wedding_data, site_json')
      .eq('id', siteId)
      .maybeSingle();
    if (error) throw error;
    const weddingData = (data?.wedding_data as Record<string, unknown> | null) ?? {};
    const nextWeddingData = {
      ...weddingData,
      meta: {
        ...(((weddingData.meta as Record<string, unknown> | undefined) ?? {})),
        photoBuckets: nextBuckets,
      },
    };
    const aiDraft = ((((weddingData.meta as Record<string, unknown> | undefined) ?? {}).aiDraft as import('../../lib/aiDraftGenerator').DraftGenerationResult | undefined) ?? null);
    const aiContent = ((((weddingData.meta as Record<string, unknown> | undefined) ?? {}).aiContent as import('../../lib/aiCanonicalContent').AiCanonicalSectionContent | undefined) ?? null);
    const nextSiteJson = aiDraft
      ? mergeGeneratedDraftIntoBuilderProject((data?.site_json as Record<string, unknown> | null) ?? null, aiDraft, aiContent, nextBuckets)
      : data?.site_json;
    const { error: updateError } = await supabase.from('wedding_sites').update({ wedding_data: nextWeddingData, site_json: nextSiteJson }).eq('id', siteId);
    if (updateError) throw updateError;
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

      await supabase.auth.getSession();
      const { data: userRes } = await supabase.auth.getUser();
      let userId = userRes.user?.id;
      if (!userId) {
        const { data: sessionRes } = await supabase.auth.getSession();
        userId = sessionRes.session?.user?.id;
      }
      if (!userId) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        userId = refreshed.session?.user?.id;
      }
      if (!userId && isDemoMode) {
        loadDemoPhotoSpace();
        return;
      }
      if (!userId) throw new Error('Your session needs a quick refresh. Please refresh and try again.');

      const activeSite = await resolveActiveSiteForUser(userId);
      if (!activeSite?.id && isDemoMode) {
        loadDemoPhotoSpace();
        return;
      }
      if (!activeSite?.id) throw new Error('Choose a wedding site before managing photos.');

      const { data: site, error: siteErr } = await supabase
        .from('wedding_sites')
        .select('id, site_slug, wedding_data')
        .eq('id', activeSite.id)
        .maybeSingle();

      if (siteErr || !site) throw new Error(siteErr?.message ?? 'Choose a wedding site before managing photos.');

      setSiteId(site.id as string);
      setSiteSlug((site.site_slug as string) ?? null);
      const weddingMeta = (((site.wedding_data as Record<string, unknown> | null)?.meta as Record<string, unknown> | undefined) ?? {});
      const savedBuckets = ((weddingMeta.photoBuckets as ReturnType<typeof createEmptyPhotoBuckets> | undefined) ?? null);
      if (savedBuckets) setPhotoBuckets(savedBuckets);
      const savedAiPhotoOps = ((weddingMeta.aiPhotoOps as AiPhotoOpsPlan | undefined) ?? null);
      if (savedAiPhotoOps) setAiPhotoOpsPlan(savedAiPhotoOps);

      const [{ data: eventsData, error: eventsError }, { data: bucketData, error: bucketError }, { data: uploadsData, error: uploadsError }] = await Promise.all([
        supabase
          .from('itinerary_events')
          .select('id,event_name,event_date,start_time,end_time')
          .eq('wedding_site_id', site.id)
          .order('event_date', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase
          .from('photo_albums')
          .select('id,name,slug,parent_album_id,hierarchy_label,drive_folder_url,is_active,created_at,itinerary_event_id,opens_at,closes_at')
          .eq('wedding_site_id', site.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('photo_uploads')
          .select('id,photo_album_id,original_filename,guest_name,guest_email,note,mime_type,size_bytes,drive_web_view_link,is_hidden,is_flagged,recap_hidden,recap_featured,recap_story,uploaded_at')
          .eq('wedding_site_id', site.id)
          .order('uploaded_at', { ascending: false })
          .limit(200),
      ]);

      if (eventsError) throw eventsError;
      if (bucketError) throw bucketError;
      if (uploadsError) throw uploadsError;

      const nextBuckets = (bucketData as PhotoBucketRow[] | null) ?? [];
      setEvents((eventsData as ItineraryEvent[] | null) ?? []);
      setBuckets(nextBuckets);
      setUploads((uploadsData as PhotoUploadRow[] | null) ?? []);
      const { data: guestbookData } = await supabase
        .from('guestbook_entries')
        .select('id,guest_name,guest_email,message,is_hidden,is_flagged,created_at')
        .eq('wedding_site_id', site.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setGuestbookEntries((guestbookData as GuestbookEntryRow[] | null) ?? []);
      const { data: prospectData } = await supabase
        .from('guest_prospect_optins')
        .select('id,guest_name,email,phone,source,wants_photo_updates,wants_own_event_info,recap_email_queued_at,future_event_email_queued_at,created_at')
        .eq('wedding_site_id', site.id)
        .order('created_at', { ascending: false })
        .limit(200);
      setGuestProspects((prospectData as GuestProspectOptinRow[] | null) ?? []);
      const { data: analysisData } = await supabase
        .from('photo_upload_ai_analysis')
        .select('id,upload_id,wedding_site_id,photo_album_id,status,detected_moment,suggested_bucket_id,suggested_bucket_name,bucket_confidence,quality_score,blur_score,people_count_range,is_video,slideshow_priority,caption,tags,warnings,error_message,analyzed_at')
        .eq('wedding_site_id', site.id)
        .order('analyzed_at', { ascending: false })
        .limit(250);
      setUploadAnalyses((analysisData as PhotoUploadAiAnalysisRow[] | null) ?? []);
      const { data: metadataData } = await supabase
        .from('photo_upload_metadata')
        .select('upload_id,taken_at,width,height,has_exif,has_gps,file_sha256,perceptual_hash,location_label,event_match_id,event_match_confidence,event_match_reason')
        .eq('wedding_site_id', site.id)
        .limit(250);
      setUploadMetadata((metadataData as PhotoUploadMetadataRow[] | null) ?? []);
      const { data: correctionData } = await supabase
        .from('photo_ai_bucket_corrections')
        .select('id,upload_id,action,previous_bucket_id,suggested_bucket_id,chosen_bucket_id,confidence,reason,created_at')
        .eq('wedding_site_id', site.id)
        .order('created_at', { ascending: false })
        .limit(100);
      setAiBucketCorrections((correctionData as PhotoAiBucketCorrectionRow[] | null) ?? []);
      const { data: hubData } = await supabase
        .from('guest_hub_settings')
        .select('rsvp_enabled,photos_enabled,guestbook_enabled,registry_enabled,schedule_enabled,travel_enabled,recap_status,recap_published_at,recap_closed_at,custom_message,language_default')
        .eq('wedding_site_id', site.id)
        .maybeSingle();
      const nextHubSettings = { ...DEFAULT_HUB_SETTINGS, ...(hubData as Partial<GuestHubSettings> | null ?? {}) };
      setHubSettings({
        ...nextHubSettings,
        custom_message: nextHubSettings.custom_message ?? '',
        language_default: nextHubSettings.language_default ?? DEFAULT_HUB_SETTINGS.language_default,
      });
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
        await supabase.auth.refreshSession();
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
    const { data, error: readError } = await supabase
      .from('wedding_sites')
      .select('wedding_data')
      .eq('id', siteId)
      .maybeSingle();

    if (readError) throw readError;

    const weddingData = (data?.wedding_data as Record<string, unknown> | null) ?? {};
    const nextWeddingData = {
      ...weddingData,
      meta: {
        ...(((weddingData.meta as Record<string, unknown> | undefined) ?? {})),
        aiPhotoOps: plan,
      },
    };

    const { error: updateError } = await supabase
      .from('wedding_sites')
      .update({ wedding_data: nextWeddingData })
      .eq('id', siteId);

    if (updateError) throw updateError;
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
        const { error: moveError } = await supabase
          .from('photo_uploads')
          .update({ photo_album_id: move.targetBucketId })
          .eq('id', move.uploadId)
          .eq('wedding_site_id', siteId);
        if (moveError) throw moveError;
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
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      wedding_site_id: siteId,
      upload_id: analysis.upload_id,
      previous_bucket_id: analysis.photo_album_id,
      suggested_bucket_id: analysis.suggested_bucket_id,
      chosen_bucket_id: chosenBucketId,
      action,
      confidence: analysis.bucket_confidence,
      reason,
      metadata: {
        detected_moment: analysis.detected_moment,
        suggested_bucket_name: analysis.suggested_bucket_name,
      },
      created_by: user?.id ?? null,
    };

    const { data, error: correctionError } = await supabase
      .from('photo_ai_bucket_corrections')
      .insert(payload)
      .select('id,upload_id,action,previous_bucket_id,suggested_bucket_id,chosen_bucket_id,confidence,reason,created_at')
      .single();
    if (correctionError) throw correctionError;
    setAiBucketCorrections((prev) => [data as PhotoAiBucketCorrectionRow, ...prev].slice(0, 100));
  };

  const applyVisionSuggestion = async (analysis: PhotoUploadAiAnalysisRow) => {
    if (!siteId || !analysis.suggested_bucket_id) return;
    setVisionMovesBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const { error: moveError } = await supabase
        .from('photo_uploads')
        .update({ photo_album_id: analysis.suggested_bucket_id })
        .eq('id', analysis.upload_id)
        .eq('wedding_site_id', siteId);
      if (moveError) throw moveError;
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

      const data = await invokeOrThrow('photo-analyze-batch', {
        siteId,
        uploadIds,
        limit: uploadIds.length,
        force,
        mode: force ? 'vision' : 'auto',
      }) as { analyzed?: number; skipped?: number; results?: PhotoUploadAiAnalysisRow[] };

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
        const { error: moveError } = await supabase
          .from('photo_uploads')
          .update({ photo_album_id: move.suggested_bucket_id })
          .eq('id', move.upload_id)
          .eq('wedding_site_id', siteId);
        if (moveError) throw moveError;
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
      const data = await invokeOrThrow('photo-export-manifest', { siteId, includeHidden: showHidden });
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
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      const { error: upsertError } = await supabase
        .from('guest_hub_settings')
        .upsert({
          wedding_site_id: siteId,
          ...hubSettings,
          recap_published_at: hubSettings.recap_status === 'published' ? (hubSettings.recap_published_at ?? now) : hubSettings.recap_published_at,
          recap_closed_at: hubSettings.recap_status === 'closed' ? (hubSettings.recap_closed_at ?? now) : null,
          custom_message: hubSettings.custom_message.trim() || null,
          language_default: hubSettings.language_default.trim() || 'en',
          updated_by: user?.id ?? null,
          updated_at: now,
        }, { onConflict: 'wedding_site_id' });
      if (upsertError) throw upsertError;
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
      const data = await invokeFunctionOrThrow(supabase, 'queue-guest-followups', { siteId, kind });
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
      const { error: updateError } = await supabase
        .from('guestbook_entries')
        .update({ ...patch, moderated_at: new Date().toISOString() })
        .eq('id', entryId);
      if (updateError) throw updateError;
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
        const data = await invokeOrThrow('photo-album-manage', { action: 'regenerate_link', albumId: bucket.id });
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
        const data = await invokeOrThrow('photo-album-create', {
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
      const data = await invokeOrThrow('photo-album-create', {
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
      await invokeOrThrow('photo-upload-moderate', { uploadIds: ids, patch: { is_hidden: hide } });
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
      await invokeOrThrow('photo-upload-moderate', { uploadIds: targetIds, patch: { is_hidden: true } });
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
      await invokeOrThrow('photo-upload-moderate', { uploadIds: targetIds, patch: { is_hidden: true } });
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
      await invokeOrThrow('photo-upload-moderate', { uploadIds: targetIds, patch: { is_hidden: false } });
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
      await invokeOrThrow('photo-upload-moderate', { uploadIds: ids, patch: { is_flagged: flagged } });
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
        await invokeOrThrow('photo-album-manage', { action: 'set_active', albumId: bucket.id, isActive });
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
      await invokeOrThrow('photo-upload-moderate', { uploadIds: [uploadId], patch });
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
      await invokeOrThrow('photo-album-manage', { action: 'set_active', albumId: bucketId, isActive });
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
      await invokeOrThrow('photo-album-manage', { action: 'set_parent', albumId: bucketId, parentAlbumId: nextParentAlbumId || null });
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
      const data = await invokeOrThrow('photo-album-manage', { action: 'regenerate_link', albumId: bucketId });
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
      await invokeOrThrow('photo-album-manage', { action: 'set_window', albumId: bucketId, opensAt, closesAt });
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

      const data = await invokeOrThrow('photo-album-create', {
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
        <div className="rounded-lg border border-border-subtle bg-white p-5">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-neutral-500">Memories</p>
              <h1 className="mt-3 text-4xl font-semibold text-neutral-900">Collect guest photos around the moments you care about.</h1>
              <p className="mt-3 text-sm leading-6 text-neutral-600">Create simple photo albums, share one upload link or QR code, and let guests send photos without making an account.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:w-[420px]">
              <div className="rounded-lg border border-border-subtle bg-surface-subtle p-4">
                <p className="text-xs font-medium text-neutral-500">Albums</p>
                <p className="mt-2 text-2xl font-semibold text-neutral-900">{buckets.length}</p>
                <p className="mt-1 text-xs text-neutral-500">Start simple, then add the moments you want.</p>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-subtle p-4">
                <p className="text-xs font-medium text-neutral-500">Uploads</p>
                <p className="mt-2 text-2xl font-semibold text-neutral-900">{totalUploads}</p>
                <p className="mt-1 text-xs text-neutral-500">Across all live memory albums.</p>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-subtle p-4">
                <p className="text-xs font-medium text-neutral-500">Sharing</p>
                <p className="mt-2 text-sm font-semibold text-neutral-900">Link + QR ready</p>
                <p className="mt-1 text-xs text-neutral-500">Give guests one obvious way to upload.</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="border border-stone-200 bg-stone-50/80 text-neutral-900">
          <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-medium text-text-tertiary">Memories and vaults</p>
              <h2 className="mt-2 text-xl font-semibold text-text-primary">Albums collect the weekend. Vaults keep the pieces you want to revisit later.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Use albums for easy guest uploads, then save the most meaningful notes and media for anniversaries and quiet moments after the wedding.</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/dashboard/vault')}>
              Open Vaults
            </Button>
          </div>
        </Card>

        <Card className="p-6 border border-neutral-200 bg-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold text-text-tertiary">No-app memory flow</p>
              <h2 className="mt-2 text-xl font-semibold text-text-primary">Know what is ready before the QR goes on a sign.</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                This keeps upload links, guestbook notes, moderation, recap, and follow-up in one launch checklist instead of scattered album controls.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1.5 text-sm font-medium text-text-primary">
              {memoryFlowReadiness.readyCount} of {memoryFlowReadiness.steps.length} ready
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {memoryFlowReadiness.steps.map((step) => (
              <div key={step.id} className="rounded-lg border border-border-subtle bg-surface-subtle/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">{step.label}</p>
                  <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                    step.status === 'ready'
                      ? 'bg-success/10 text-success'
                      : step.status === 'needs-action'
                        ? 'bg-warning/10 text-warning'
                        : step.status === 'planned'
                          ? 'bg-surface-subtle text-text-tertiary'
                          : 'bg-white text-text-tertiary'
                  }`}>
                    {step.status === 'ready' ? 'Ready' : step.status === 'needs-action' ? 'Needs action' : step.status === 'planned' ? 'Planned' : 'Empty'}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-text-secondary">{step.detail}</p>
              </div>
            ))}
          </div>
          {memoryFlowReadiness.blockers.length > 0 && (
            <div className="mt-4 rounded-lg border border-warning/20 bg-warning/5 p-4">
              <p className="text-sm font-semibold text-text-primary">Before sharing broadly</p>
              <ul className="mt-2 space-y-1 text-xs text-text-secondary">
                {memoryFlowReadiness.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {guestHubUrl && (
          <Card className="p-6 border border-neutral-200 bg-white">
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.85fr] lg:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-neutral-900" />
                  <h2 className="text-xl font-semibold text-neutral-900">One QR guest hub</h2>
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Print this single link on signage. Guests can RSVP, upload photos or video, leave a guestbook note, and find guest update flows without installing anything.
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  Current hub includes {guestHubActionSummary}.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {guestHubActions.map((action) => (
                    <span key={action.id} className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] font-medium text-neutral-600">
                      {action.id === 'rsvp' ? 'RSVP' : action.id.replace(/^\w/, (char) => char.toUpperCase())}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void copyText(guestHubUrl, 'guest-hub')}>
                    <Copy className="w-4 h-4 mr-2" /> {copied === 'guest-hub' ? 'Copied' : 'Copy hub link'}
                  </Button>
                  <Button variant="outline" onClick={() => openAppUrl(guestHubUrl)}>
                    <ExternalLink className="w-4 h-4 mr-2" /> Open hub
                  </Button>
                  <Button variant="outline" onClick={() => openSafePublicUrl(getBucketQrUrl(guestHubUrl))}>
                    <QrCode className="w-4 h-4 mr-2" /> Open QR
                  </Button>
                  <Button variant="outline" onClick={downloadGuestHubPrintPack} disabled={guestHubQrAssets.length === 0}>
                    <QrCode className="w-4 h-4 mr-2" /> Save print cards
                  </Button>
                  {guestRecapUrl && (
                    <>
                      <Button variant="outline" onClick={() => void copyText(guestRecapUrl, 'guest-recap')}>
                        <Sparkles className="w-4 h-4 mr-2" /> {copied === 'guest-recap' ? 'Copied' : 'Copy recap'}
                      </Button>
                      <Button variant="outline" onClick={() => openAppUrl(guestRecapUrl)}>
                        <ExternalLink className="w-4 h-4 mr-2" /> Open recap
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid gap-3">
                <ShareQrPanel
                  title="Guest hub QR"
                  description={`One QR for ${guestHubActionSummary}.`}
                  url={guestHubUrl}
                  copyLabel="Copy hub link"
                />
                {guestRecapUrl && (
                  <ShareQrPanel
                    title="Photo recap QR"
                    description="Share highlight moments, memory chapters, and opt-in capture after the event."
                    url={guestRecapUrl}
                    copyLabel="Copy recap link"
                  />
                )}
              </div>
            </div>
          </Card>
        )}

        {guestRecapUrl && (
          <Card className="p-6 border border-border-subtle bg-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold text-text-tertiary">Recap sharing</p>
                <h2 className="mt-2 text-xl font-semibold text-text-primary">Control when the photo recap is guest-facing.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                  Keep the recap in draft while curating, use private link for a quiet review, publish when it is ready, or close it after the event.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button variant="outline" onClick={() => openAppUrl(guestRecapUrl)} disabled={hubSettings.recap_status === 'draft' || hubSettings.recap_status === 'closed'}>
                  Preview recap
                </Button>
                <Button variant="accent" onClick={() => void saveHubSettings()} disabled={savingHubSettings}>
                  {savingHubSettings ? 'Saving...' : 'Save status'}
                </Button>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-[220px_1fr]">
              <select
                value={hubSettings.recap_status}
                onChange={(e) => setHubSettings((prev) => ({
                  ...prev,
                  recap_status: e.target.value as GuestHubSettings['recap_status'],
                  recap_published_at: e.target.value === 'published' ? (prev.recap_published_at ?? new Date().toISOString()) : prev.recap_published_at,
                  recap_closed_at: e.target.value === 'closed' ? new Date().toISOString() : null,
                }))}
                className="h-11 rounded-lg border border-border-subtle bg-white px-3 text-sm text-text-primary"
              >
                <option value="draft">Draft</option>
                <option value="private_link">Private link</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
              </select>
              <div className="grid gap-2 sm:grid-cols-4">
                <span className="rounded-lg border border-border-subtle bg-surface-subtle px-4 py-3 text-sm text-text-primary">{uploads.length} uploads</span>
                <span className="rounded-lg border border-border-subtle bg-surface-subtle px-4 py-3 text-sm text-text-primary">{recapFeaturedCount} featured</span>
                <span className="rounded-lg border border-border-subtle bg-surface-subtle px-4 py-3 text-sm text-text-primary">{recapStoryCount} story picks</span>
                <span className="rounded-lg border border-border-subtle bg-surface-subtle px-4 py-3 text-sm text-text-primary">{recapHiddenCount} recap hidden</span>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-border-subtle bg-surface-subtle p-4">
              <p className="text-sm font-semibold text-text-primary">
                Current mode: {hubSettings.recap_status === 'private_link' ? 'Private link' : hubSettings.recap_status.charAt(0).toUpperCase() + hubSettings.recap_status.slice(1)}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {hubSettings.recap_status === 'draft' && 'Guests cannot view the recap yet. Use this while curating.'}
                {hubSettings.recap_status === 'private_link' && 'Anyone with the recap link can view it, but it is treated as quietly shared.'}
                {hubSettings.recap_status === 'published' && 'The recap is live for guests.'}
                {hubSettings.recap_status === 'closed' && 'The recap is intentionally unavailable.'}
              </p>
              {recapPublishWarnings.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-text-secondary">
                  {recapPublishWarnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              )}
            </div>
          </Card>
        )}

        {guestHubUrl && (
          <Card className="p-6 border border-neutral-200 bg-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">Guest hub controls</h2>
                <p className="mt-1 text-sm text-neutral-600">Choose which no-login guest actions are available from the one QR code. Turning photos off also blocks upload links and the public recap.</p>
              </div>
              <Button variant="outline" onClick={() => void saveHubSettings()} disabled={savingHubSettings}>
                {savingHubSettings ? 'Saving...' : 'Save hub controls'}
              </Button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['rsvp_enabled', 'RSVP'],
                ['photos_enabled', 'Photo upload + recap'],
                ['guestbook_enabled', 'Guestbook notes'],
                ['registry_enabled', 'Registry'],
                ['schedule_enabled', 'Schedule'],
                ['travel_enabled', 'Travel'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-subtle px-4 py-3 text-sm font-medium text-text-primary">
                  {label}
                  <input
                    type="checkbox"
                    checked={Boolean(hubSettings[key as keyof GuestHubSettings])}
                    onChange={(e) => setHubSettings((prev) => ({ ...prev, [key]: e.target.checked }))}
                    className="h-4 w-4"
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px]">
              <Input
                value={hubSettings.custom_message ?? ''}
                onChange={(e) => setHubSettings((prev) => ({ ...prev, custom_message: e.target.value }))}
                placeholder="Optional custom message for the hub"
              />
              <Input
                value={hubSettings.language_default ?? DEFAULT_HUB_SETTINGS.language_default}
                onChange={(e) => setHubSettings((prev) => ({ ...prev, language_default: e.target.value }))}
                placeholder="Default language"
              />
            </div>
          </Card>
        )}

        {guestProspects.length > 0 && (
          <Card className="p-6 border border-neutral-200 bg-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">Guest follow-up</h2>
                <p className="mt-1 text-sm text-neutral-600">Guests who asked for recap updates or want to hear about using dayof later.</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-700">
                  <span className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1">{guestProspects.length} captured</span>
                  <span className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1">{guestProspects.filter((p) => p.wants_photo_updates).length} want recap updates</span>
                  <span className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1">{guestProspects.filter((p) => p.wants_own_event_info).length} want their own event link</span>
                  <span className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1">{guestProspects.filter((p) => p.recap_email_queued_at).length} recap prepared</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button size="sm" variant="outline" onClick={exportProspectsCsv}>Export guests</Button>
                <Button size="sm" variant="outline" disabled={queueingFollowups !== null} onClick={() => void queueGuestFollowups('recap')}>
                  {queueingFollowups === 'recap' ? 'Preparing...' : 'Prepare recap emails'}
                </Button>
                <Button size="sm" variant="outline" disabled={queueingFollowups !== null} onClick={() => void queueGuestFollowups('future_event')}>
                  {queueingFollowups === 'future_event' ? 'Preparing...' : 'Prepare later-interest emails'}
                </Button>
              </div>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {guestProspects.slice(0, 6).map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border-subtle bg-surface-subtle px-4 py-3">
                  <p className="text-sm font-medium text-neutral-900">{entry.guest_name || 'Guest'}</p>
                  <p className="mt-1 text-xs text-neutral-600">{entry.email || entry.phone || 'Contact info not added'} · {entry.source}</p>
                  <p className="mt-2 text-xs text-neutral-500">
                    {entry.wants_photo_updates ? 'Recap updates' : 'No recap updates'}
                    {entry.wants_own_event_info ? ' · Future event interest' : ''}
                    {entry.recap_email_queued_at ? ' · Recap prepared' : ''}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {guestbookEntries.length > 0 && (
          <Card className="p-6 border border-neutral-200 bg-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">Guestbook notes</h2>
                <p className="mt-1 text-sm text-neutral-600">Written messages submitted from the one-QR hub.</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button size="sm" variant="outline" onClick={exportGuestbookCsv}>Export notes</Button>
                <span className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700">{guestbookEntries.length} recent</span>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {guestbookEntries.slice(0, 6).map((entry) => (
                <div key={entry.id} className={`rounded-lg border p-4 ${entry.is_hidden ? 'border-border-subtle bg-surface-subtle opacity-75' : entry.is_flagged ? 'border-border-subtle bg-surface' : 'border-border-subtle bg-surface-subtle'}`}>
                  <p className="text-sm leading-6 text-neutral-800">{entry.message}</p>
                  <p className="mt-3 text-xs text-neutral-500">
                    {entry.guest_name || 'Guest'}{entry.guest_email ? ` · ${entry.guest_email}` : ''} · {formatGuestPhotoDateTime(entry.created_at)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={moderatingGuestbookId === entry.id} onClick={() => void updateGuestbookEntry(entry.id, { is_flagged: !entry.is_flagged })}>
                      {entry.is_flagged ? 'Unflag' : 'Flag'}
                    </Button>
                    <Button size="sm" variant="outline" disabled={moderatingGuestbookId === entry.id} onClick={() => void updateGuestbookEntry(entry.id, { is_hidden: !entry.is_hidden })}>
                      {entry.is_hidden ? 'Unhide' : 'Hide'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6 border border-border bg-surface">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-neutral-900">Couple photo albums</h2>
            <p className="mt-1 text-sm text-neutral-600">Create your own couple-photo albums here so uploads stay organized by the moments and photo types you actually care about.</p>
          </div>
          <PhotoBucketCards buckets={photoBuckets} uploadDisabled={!siteId || submitting} onUploadClick={handleBucketUploadClick} onRemoveClick={handleBucketRemoveClick} />
          <input ref={bucketFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBucketFilesSelected} />
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-xs text-neutral-500">Albums</p>
            <p className="text-2xl font-semibold text-neutral-900">{buckets.length}</p>
            <p className="text-xs text-neutral-500">{activeBucketsCount} active · {pausedBucketsCount} paused</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-neutral-500">Uploads</p>
            <p className="text-2xl font-semibold text-neutral-900">{totalUploads}</p>
            <p className="text-xs text-neutral-500">Across all albums</p>
          </Card>
        </div>

        <Card className="p-6 border border-border-subtle bg-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clapperboard className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-text-primary">Slideshow draft</h2>
              </div>
              <p className="text-sm text-text-secondary">
                Turn uploaded guest photos into a simple slideshow. Start with your strongest moments, preview the sequence, then polish later.
              </p>
              <p className="mt-2 text-xs text-text-tertiary">
                Ready now: <span className="font-semibold text-text-primary">{slideshowReadyBucketCount}</span> album{slideshowReadyBucketCount === 1 ? '' : 's'} with 3+ uploads.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="accent"
                onClick={() => void generateAiPhotoOpsPlan()}
                disabled={aiPhotoOpsBusy || uploads.length === 0 || buckets.length === 0}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {aiPhotoOpsBusy ? 'Organizing...' : 'Organize uploads'}
              </Button>
              <Button variant="outline">
                <Clapperboard className="w-4 h-4 mr-2" />
                Slideshow draft ready
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-border-subtle bg-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-text-primary">Photo moments</h2>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                Sort new guest photos into the moments they belong to, then reuse that work for albums, slideshow order, captions, and quality checks.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
                <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{uploadAnalyses.length} reviewed</span>
                <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{visionReadyCount} ready</span>
                <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{visionFallbackCount} waiting</span>
                <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{unanalyzedUploads.length} new photos</span>
                <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{metadataExifCount} with time details</span>
                <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{metadataGpsCount} with private place details</span>
                <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{metadataEventMatchCount} matched to the day</span>
                <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{aiAcceptedCorrectionCount} accepted changes</span>
                <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{aiRejectedCorrectionCount} kept as-is</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="accent"
                disabled={visionAiBusy || uploads.length === 0}
                onClick={() => void analyzeUploadsWithVision(false)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {visionAiBusy ? 'Reviewing...' : 'Sort new photos'}
              </Button>
              <Button
                variant="outline"
                disabled={visionAiBusy || uploads.length === 0}
                onClick={() => void analyzeUploadsWithVision(true)}
              >
                Review visible
              </Button>
              <Button
                variant="outline"
                disabled={visionMovesBusy || visionHighConfidenceMoves.length === 0}
                onClick={() => void applyHighConfidenceVisionMoves()}
              >
                {visionMovesBusy ? 'Applying...' : `Apply ${visionHighConfidenceMoves.length} album move${visionHighConfidenceMoves.length === 1 ? '' : 's'}`}
              </Button>
            </div>
          </div>

          {uploadAnalyses.length > 0 && (
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {uploadAnalyses.slice(0, 6).map((analysis) => {
                const upload = uploads.find((entry) => entry.id === analysis.upload_id);
                const metadata = metadataByUploadId.get(analysis.upload_id);
                return (
                  <div key={analysis.id} className="rounded-lg border border-border-subtle bg-surface-subtle px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{safePhotoAnalysisText(analysis.detected_moment, 'Photo')}</p>
                        <p className="mt-1 text-xs text-text-tertiary">{upload?.original_filename ?? 'Upload'} · {analysisSourceLabel(analysis)}</p>
                      </div>
                      <span className="rounded-lg border border-border-subtle bg-white px-2 py-0.5 text-xs font-medium text-text-secondary">{Math.round(analysis.bucket_confidence * 100)}% sure</span>
                    </div>
                    <p className="mt-2 text-sm leading-5 text-neutral-700">{safePhotoAnalysisText(analysis.caption, 'No caption yet.')}</p>
                    {safeOptionalPhotoAnalysisText(analysis.suggested_bucket_name) && (
                      <p className="mt-2 text-xs font-medium text-text-primary">
                        Best album: {safeOptionalPhotoAnalysisText(analysis.suggested_bucket_name)}
                      </p>
                    )}
                    {metadata && (
                      <p className="mt-2 text-xs text-text-tertiary">
                        {metadata.taken_at ? `Taken ${formatGuestPhotoDateTime(metadata.taken_at)}` : 'Time not available'} · {metadata.width && metadata.height ? `${metadata.width}x${metadata.height}` : 'Size unavailable'}{metadata.has_gps ? ' · place details stay private' : ''}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {safePhotoAnalysisList(analysis.tags).slice(0, 4).map((tag) => (
                        <span key={tag} className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{tag}</span>
                      ))}
                    </div>
                    {analysis.suggested_bucket_id && analysis.suggested_bucket_id !== analysis.photo_album_id && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={visionMovesBusy} onClick={() => void applyVisionSuggestion(analysis)}>
                          Move photo
                        </Button>
                        <Button size="sm" variant="outline" disabled={visionMovesBusy} onClick={() => void rejectVisionSuggestion(analysis)}>
                          Keep here
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-6 border border-border-subtle bg-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-text-primary">Moment albums from the schedule</h2>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                The schedule helps suggest natural groups like cocktail hour, aisle walk, first dance, toasts, and dance floor. When those moments appear in reviewed photos, you can turn them into real albums or sub-albums.
              </p>
            </div>
            <div className="text-xs text-text-secondary">
              <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{momentBucketSuggestions.length} suggestions</span>
            </div>
          </div>
          {momentBucketSuggestions.length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {momentBucketSuggestions.slice(0, 9).map((suggestion) => (
                <div key={`${suggestion.eventId}-${suggestion.tag}`} className="rounded-lg border border-border-subtle bg-surface-subtle p-4">
                  <p className="text-sm font-semibold text-text-primary">{suggestion.label}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {suggestion.parentBucket ? `${suggestion.parentBucket.name} / ${suggestion.label}` : suggestion.eventName}
                  </p>
                  <p className="mt-2 text-xs text-neutral-500">
                    {suggestion.count > 0 ? `${suggestion.count} reviewed photo${suggestion.count === 1 ? '' : 's'} tagged #${suggestion.tag}` : `Expected from ${suggestion.eventName}`}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    disabled={submitting}
                    onClick={() => void createMomentBucketFromSuggestion(suggestion)}
                  >
                    Create album
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-border-subtle bg-surface-subtle px-4 py-5 text-sm text-text-secondary">
              No new moment album suggestions right now. Add itinerary events or sort photos after uploads to unlock more.
            </div>
          )}
        </Card>

        <Card className="p-6 border border-border-subtle bg-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-text-primary">Photo review</h2>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                Uses saved time details and previous review work to surface highlights, the day in order, possible duplicates, and photos worth checking.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary sm:grid-cols-4">
              <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{highlightUploads.length} highlights</span>
              <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{chronologicalUploads.length} with times</span>
              <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{similarPhotoGroups.length} similar sets</span>
              <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{reviewUploads.length} to check</span>
              <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{hiddenUploadCount} hidden</span>
              <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{flaggedUploadCount} flagged</span>
              <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{recapFeaturedCount} featured</span>
              <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{recapStoryCount} in recap story</span>
              <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{recapHiddenCount} recap hidden</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setSlideshowOrder('highlights')} disabled={highlightUploads.length === 0}>
              Use highlights in slideshow
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSlideshowOrder('capture')} disabled={chronologicalUploads.length === 0}>
              Use saved photo times
            </Button>
            <Button size="sm" variant="outline" onClick={exportCurationCsv} disabled={uploads.length === 0}>
              Export review sheet
            </Button>
            <Button size="sm" variant="outline" onClick={exportMemoryChaptersJson} disabled={memoryChapters.length === 0}>
              Copy chapter notes
            </Button>
            <Button size="sm" variant="outline" onClick={exportCuratedRecapJson} disabled={uploads.length === 0}>
              Copy recap notes
            </Button>
            <Button size="sm" variant="outline" onClick={() => void hideReviewUploads()} disabled={bulkModerating || reviewUploads.length === 0}>
              Hide review items
            </Button>
            <Button size="sm" variant="outline" onClick={() => void hideDuplicateExtras()} disabled={bulkModerating || duplicateExtraCount === 0}>
              Tuck away similar extras
            </Button>
            <Button size="sm" variant="outline" onClick={() => void restoreHiddenUploads()} disabled={bulkModerating || hiddenUploadCount === 0}>
              Restore hidden
            </Button>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-4">
            <div className="rounded-lg border border-border-subtle bg-surface-subtle px-4 py-4">
              <p className="text-sm font-semibold text-text-primary">Highlights</p>
              <div className="mt-3 space-y-2">
                {highlightUploads.slice(0, 3).map(({ upload, analysis }) => (
                  <div key={upload.id} className="rounded-lg bg-neutral-50 px-3 py-2">
                    <p className="truncate text-sm font-medium text-neutral-900">{safePhotoAnalysisText(analysis?.caption, upload.original_filename)}</p>
                    <p className="mt-1 text-xs text-neutral-500">{safePhotoAnalysisText(analysis?.suggested_bucket_name, 'Reviewed')} · {analysis ? Math.round(analysis.slideshow_priority) : 0}/100</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" onClick={() => void moderateUpload(upload.id, { recap_featured: !upload.recap_featured })}>
                        {upload.recap_featured ? 'Unfeature' : 'Feature'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void moderateUpload(upload.id, { recap_story: !upload.recap_story })}>
                        {upload.recap_story ? 'Remove from story' : 'Add to story'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void moderateUpload(upload.id, { recap_hidden: !upload.recap_hidden })}>
                        {upload.recap_hidden ? 'Show recap' : 'Hide recap'}
                      </Button>
                    </div>
                  </div>
                ))}
                {highlightUploads.length === 0 && <p className="text-xs text-neutral-500">Review a few photos to fill this.</p>}
              </div>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-subtle px-4 py-4">
              <p className="text-sm font-semibold text-text-primary">Timeline</p>
              <div className="mt-3 space-y-2">
                {chronologicalUploads.slice(0, 3).map(({ upload, metadata }) => (
                  <div key={upload.id} className="rounded-lg bg-neutral-50 px-3 py-2">
                    <p className="truncate text-sm font-medium text-neutral-900">{upload.original_filename}</p>
                    <p className="mt-1 text-xs text-neutral-500">{metadata?.taken_at ? formatGuestPhotoDateTime(metadata.taken_at) : 'Time not available'}</p>
                  </div>
                ))}
                {chronologicalUploads.length === 0 && <p className="text-xs text-neutral-500">Capture times appear when photos include saved time details.</p>}
              </div>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-subtle px-4 py-4">
              <p className="text-sm font-semibold text-text-primary">Similar sets</p>
              <div className="mt-3 space-y-2">
                {similarPhotoGroups.slice(0, 3).map((group) => (
                  <div key={group.key} className="rounded-lg bg-neutral-50 px-3 py-2">
                    <p className="text-sm font-medium text-neutral-900">{group.entries.length} matching uploads · keep 1</p>
                    <p className="mt-1 truncate text-xs text-neutral-500">{group.entries.map((entry) => entry.upload.original_filename).join(', ')}</p>
                  </div>
                ))}
                {similarPhotoGroups.length === 0 && <p className="text-xs text-neutral-500">No exact or similar matches yet.</p>}
                {duplicateExtraCount > 0 && <p className="text-xs text-primary">{duplicateExtraCount} similar photo{duplicateExtraCount === 1 ? '' : 's'} can be tucked away.</p>}
              </div>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-subtle px-4 py-4">
              <p className="text-sm font-semibold text-text-primary">Worth checking</p>
              <div className="mt-3 space-y-2">
                {reviewUploads.slice(0, 3).map(({ upload, analysis }) => (
                  <div key={upload.id} className="rounded-lg bg-neutral-50 px-3 py-2">
                    <p className="truncate text-sm font-medium text-neutral-900">{upload.original_filename}</p>
                    <p className="mt-1 text-xs text-neutral-500">{analysisDisplayStatus(analysis)}{analysis?.bucket_confidence ? ` · ${Math.round(analysis.bucket_confidence * 100)}%` : ''}</p>
                  </div>
                ))}
                {reviewUploads.length === 0 && <p className="text-xs text-neutral-500">Everything visible looks clean.</p>}
              </div>
            </div>
          </div>
          {memoryChapters.length > 0 && (
            <div className="mt-5 rounded-lg border border-border-subtle bg-surface-subtle px-4 py-4">
              <p className="text-sm font-semibold text-text-primary">Memory chapters</p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {memoryChapters.map((chapter) => (
                  <div key={chapter.date} className="rounded-lg bg-neutral-50 px-3 py-2">
                    <p className="text-sm font-medium text-neutral-900">{formatGuestPhotoDate(chapter.date)}</p>
                    <p className="mt-1 text-xs text-neutral-500">{chapter.entries.length} timed upload{chapter.entries.length === 1 ? '' : 's'} · {chapter.highlights} highlight{chapter.highlights === 1 ? '' : 's'}</p>
                    {chapter.bucketNames.length > 0 && <p className="mt-1 truncate text-xs text-neutral-500">{chapter.bucketNames.join(' · ')}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {aiPhotoOpsPlan && (
          <Card className="p-6 border border-border-subtle bg-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold text-text-primary">Photo organizer</h2>
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                  {safePhotoAnalysisText(aiPhotoOpsPlan.summary, 'Created an organization and slideshow plan for review.')}
                </p>
                <p className="mt-2 text-xs text-text-tertiary">
                  {aiPhotoOpsPlan.bucketSuggestions.length} photos reviewed · {aiSlideshowFrameCount} slideshow frames drafted
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  className="border-border-subtle text-text-primary hover:bg-surface-subtle"
                  disabled={aiPhotoMovesBusy || aiHighConfidenceMoves.length === 0}
                  onClick={() => void applyHighConfidencePhotoMoves()}
                >
                  {aiPhotoMovesBusy ? 'Applying...' : `Apply ${aiHighConfidenceMoves.length} suggested move${aiHighConfidenceMoves.length === 1 ? '' : 's'}`}
                </Button>
                <Button
                  variant="outline"
                  className="border-border-subtle text-text-primary hover:bg-surface-subtle"
                  onClick={() => void copyText(JSON.stringify(aiPhotoOpsPlan, null, 2), 'ai-photo-plan')}
                >
                  {copied === 'ai-photo-plan' ? 'Copied notes' : 'Copy organizer notes'}
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 px-4 py-4">
                <p className="text-sm font-semibold text-text-primary">Suggested album moves</p>
                <div className="mt-3 space-y-2">
                  {aiPhotoOpsPlan.bucketSuggestions.slice(0, 6).map((suggestion) => (
                    <div key={suggestion.uploadId} className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-neutral-900">{suggestion.targetBucketName}</p>
                        <span className="rounded-lg bg-white px-2 py-0.5 text-xs font-medium text-text-secondary ring-1 ring-border-subtle">{Math.round(suggestion.confidence * 100)}%</span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-600">
                        {safePhotoAnalysisText(suggestion.reason, 'This looks like the best fit for the album.')}
                      </p>
                      {(suggestion.detectedMoment || (suggestion.tags?.length ?? 0) > 0) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {suggestion.detectedMoment && (
                            <span className="rounded-lg bg-white px-2 py-0.5 text-[11px] font-medium text-text-secondary ring-1 ring-border-subtle">
                              {suggestion.detectedMoment}
                            </span>
                          )}
                          {suggestion.tags?.slice(0, 5).map((tag) => (
                            <span key={`${suggestion.uploadId}-${tag}`} className="rounded-lg bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-600 ring-1 ring-neutral-200">
                              {tagLabel(tag)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 px-4 py-4">
                <p className="text-sm font-semibold text-text-primary">{aiPhotoOpsPlan.slideshow.title}</p>
                <p className="mt-1 text-xs text-text-tertiary">{aiPhotoOpsPlan.slideshow.mood}</p>
                <div className="mt-3 space-y-2">
                  {aiPhotoOpsPlan.slideshow.frames.slice(0, 5).map((frame, index) => (
                    <div key={`${frame.uploadId}-${index}`} className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                      <p className="text-xs font-semibold text-neutral-500">Frame {index + 1} · {frame.bucketName}</p>
                      <p className="mt-1 text-sm text-neutral-800">
                        {safePhotoAnalysisText(frame.caption, 'A warm wedding moment.')}
                      </p>
                      {(frame.tags?.length ?? 0) > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {frame.tags?.slice(0, 4).map((tag) => (
                            <span key={`${frame.uploadId}-${tag}`} className="rounded-lg bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-600 ring-1 ring-neutral-200">
                              {tagLabel(tag)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Slideshow draft</h2>
              <p className="mt-1 text-sm text-neutral-600">Turn uploaded guest photos into a simple sequence you can preview, adjust, and share.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={slideshowBucketFilter}
                onChange={(e) => setSlideshowBucketFilter(e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="all">All slideshow-ready albums</option>
                {buckets
                  .filter((bucket) => bucket.is_active && (countsByBucket.get(bucket.id) ?? 0) >= 3)
                  .map((bucket) => (
                    <option key={bucket.id} value={bucket.id}>{bucket.name}</option>
                  ))}
              </select>
              <select
                value={slideshowOrder}
                onChange={(e) => setSlideshowOrder(e.target.value as SlideshowOrderMode)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="capture">Capture time</option>
                <option value="highlights">Best highlights</option>
              </select>
              <select
                value={slideshowTheme}
                onChange={(e) => setSlideshowTheme(e.target.value as SlideshowTheme)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="classic">Classic</option>
                <option value="editorial">Editorial</option>
                <option value="party">Party</option>
              </select>
              <Button variant="outline" onClick={() => setSlideshowPreviewOpen(true)} disabled={slideshowFrames.length === 0}>
                Preview
              </Button>
              <Button variant="outline" onClick={() => void exportSlideshowPlan()} disabled={slideshowFrames.length === 0}>
                {copied === 'slideshow-plan' ? 'Copied notes' : 'Copy slideshow notes'}
              </Button>
            </div>
          </div>

          {slideshowFrames.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-surface-subtle/20 px-4 py-6 text-sm text-neutral-600">
              Add at least three visible uploads to an active album to start a slideshow draft.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-4 py-3 text-sm text-neutral-700">
                Ready with <span className="font-semibold text-neutral-900">{slideshowFrames.length}</span> slides from <span className="font-semibold text-neutral-900">{slideshowBucketFilter === 'all' ? slideshowReadyBucketCount : 1}</span> album{slideshowBucketFilter === 'all' ? 's' : ''}.
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-subtle/20 px-4 py-3 text-sm text-neutral-700">
                <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${slideshowThemeMeta[slideshowTheme].chipClass}`}>
                  {slideshowThemeMeta[slideshowTheme].label}
                </span>
                <span className="ml-2">{slideshowThemeMeta[slideshowTheme].helper}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {slideshowFrames.map((frame, index) => (
                  <div key={frame.uploadId} className={`rounded-lg border px-4 py-3 ${slideshowThemeMeta[slideshowTheme].cardClass}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-neutral-900">Frame {index + 1}</p>
                      <span className={`text-xs rounded-lg px-2 py-0.5 ${slideshowThemeMeta[slideshowTheme].chipClass}`}>{frame.bucketName}</span>
                    </div>
                    <p className="mt-2 text-sm text-neutral-800 truncate">{frame.title}</p>
                    <p className="mt-1 text-xs text-neutral-500">{frame.caption}</p>
                    {frame.takenAt && <p className="mt-1 text-xs text-neutral-400">Taken {formatGuestPhotoDateTime(frame.takenAt)}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {slideshowPreviewOpen && slideshowFrames.length > 0 && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-white rounded-lg border border-border p-5 space-y-4 max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">Slideshow preview</h3>
                  <p className="text-sm text-neutral-600">{slideshowThemeMeta[slideshowTheme].label} · {slideshowFrames.length} frames · {slideshowOrder}</p>
                </div>
                <Button variant="outline" onClick={() => setSlideshowPreviewOpen(false)}>Close</Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {slideshowFrames.map((frame, index) => (
                  <div key={frame.uploadId} className={`rounded-lg border px-4 py-4 ${slideshowThemeMeta[slideshowTheme].cardClass}`}>
                    <p className="text-xs text-neutral-500">Slide {index + 1}</p>
                    <p className="mt-2 text-base font-semibold text-neutral-900 truncate">{frame.title}</p>
                    <p className="mt-1 text-sm text-neutral-700">{frame.bucketName}</p>
                    <p className="mt-2 text-xs text-neutral-500">{frame.caption}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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
