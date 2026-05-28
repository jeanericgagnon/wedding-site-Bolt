import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, ExternalLink, Camera, Plus, Link as LinkIcon, CalendarClock, Mail, EyeOff, Eye, Flag, Clapperboard } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
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
import { buildPhotoMemoryCuratorModel } from '../../lib/memoryCurator';
import { MemoryCuratorCard } from '../../components/dashboard/MemoryCuratorCard';
import { parseDatetimeLocalToIso, toDatetimeLocalOrEmpty } from './guestPhotoDateTime';
import { formatGuestPhotoDate, formatGuestPhotoDateTime, getGuestPhotoSortTime, toGuestPhotoCsvTimestamp } from './guestPhotoUploadTime';
import { formatGuestPhotoEventDate, getSuggestedGuestPhotoWindowStart } from './guestPhotoEventDate';
import { getBulkGuestPhotoModerationTargets, getVisibleGuestPhotoUploads } from './guestPhotoModerationTargets';
import { readStoredPhotoBucketLinks, writeStoredPhotoBucketLinks } from './photoBucketLinksStorage';

type ItineraryEvent = {
  id: string;
  event_name: string;
  event_date: string;
};

type PhotoBucketRow = {
  id: string;
  name: string;
  slug: string;
  drive_folder_url: string | null;
  is_active: boolean;
  created_at: string;
  itinerary_event_id: string | null;
  opens_at: string | null;
  closes_at: string | null;
};

type PhotoUploadRow = {
  id: string;
  photo_bucket_id: string;
  original_filename: string;
  guest_name: string | null;
  guest_email: string | null;
  is_hidden: boolean;
  is_flagged: boolean;
  uploaded_at: string;
};

type SlideshowOrderMode = 'newest' | 'oldest' | 'shuffled';
type SlideshowTheme = 'classic' | 'editorial' | 'party';

type SlideshowFrame = {
  uploadId: string;
  bucketId: string;
  bucketName: string;
  title: string;
  caption: string;
};

export const GuestPhotoSharing: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { fromQuickStart, nextStep } = readQuickStartDashboardContinuation(searchParams);
  const search = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [siteId, setSiteId] = useState<string | null>(null);
  const [events, setEvents] = useState<ItineraryEvent[]>([]);
  const [buckets, setBuckets] = useState<PhotoBucketRow[]>([]);
  const [uploads, setUploads] = useState<PhotoUploadRow[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);

  const [name, setName] = useState(search.get('eventName') ?? '');
  const [itineraryEventId, setItineraryEventId] = useState(search.get('eventId') ?? '');
  const [bucketSearch, setBucketSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  const [latestUploadUrl, setLatestUploadUrl] = useState<string>('');
  const [bucketUploadLinks, setBucketUploadLinks] = useState<Record<string, string>>(() => readStoredPhotoBucketLinks());
  const [copied, setCopied] = useState<string>('');
  const [workingBucketId, setWorkingBucketId] = useState<string>('');

  const [windowDrafts, setWindowDrafts] = useState<Record<string, { opensAt: string; closesAt: string }>>({});
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkRegenerating, setBulkRegenerating] = useState(false);
  const [bulkModerating, setBulkModerating] = useState(false);
  const [photoBuckets, setPhotoBuckets] = useState(() => createEmptyPhotoBuckets());
  const [slideshowOrder, setSlideshowOrder] = useState<SlideshowOrderMode>('newest');
  const [slideshowBucketFilter, setSlideshowBucketFilter] = useState<string>('all');
  const [slideshowTheme, setSlideshowTheme] = useState<SlideshowTheme>('classic');
  const [slideshowPreviewOpen, setSlideshowPreviewOpen] = useState(false);
  const bucketFileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingBucket, setPendingBucket] = useState<PhotoBucketKind | null>(null);
  const archiveMode = useMemo(() => getArchiveModeDescriptor({ weddingDate: events[0]?.event_date ?? null }), [events]);
  const photoMemoryCurator = useMemo(() => buildPhotoMemoryCuratorModel({
    photoBuckets,
    albums: buckets.map((bucket) => ({ id: bucket.id, name: bucket.name, is_active: bucket.is_active })),
    uploads: uploads.map((upload) => ({
      photo_bucket_id: upload.photo_bucket_id,
      is_hidden: upload.is_hidden,
      is_flagged: upload.is_flagged,
    })),
    isArchiveLike: archiveMode.isArchiveLike,
  }), [archiveMode.isArchiveLike, buckets, photoBuckets, uploads]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    writeStoredPhotoBucketLinks(bucketUploadLinks);
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
      setSuccess('Photo removed from bucket.');
    } catch (err) {
      setPhotoBuckets(previousBuckets);
      setError((err as Error)?.message || 'Failed to remove photo bucket item.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBucketFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !pendingBucket || !siteId) return;
    const previousBuckets = photoBuckets;
    try {
      setSubmitting(true);
      const nextBuckets = { ...photoBuckets };
      for (const file of Array.from(files)) {
        const uploaded = await mediaRepository.upload(siteId, file);
        nextBuckets[pendingBucket] = [
          ...nextBuckets[pendingBucket],
          {
            id: uploaded.path,
            url: uploaded.url,
            bucket: pendingBucket,
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
      setSuccess(placementSummary ? `Photo bucket updated. Current auto-placement: ${placementSummary}.` : 'Photo bucket updated.');
    } catch (err) {
      setPhotoBuckets(previousBuckets);
      setError((err as Error)?.message || 'Failed to upload photo bucket items.');
    } finally {
      setSubmitting(false);
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
      if (!userId) throw new Error('Session expired. Refresh and try again.');

      const { data: site, error: siteErr } = await supabase
        .from('wedding_sites')
        .select('id, site_slug, wedding_data')
        .eq('user_id', userId)
        .single();

      if (siteErr || !site) throw new Error(siteErr?.message ?? 'No wedding site found.');

      setSiteId(site.id as string);
      const savedBuckets = ((((site.wedding_data as Record<string, unknown> | null)?.meta as Record<string, unknown> | undefined)?.photoBuckets as ReturnType<typeof createEmptyPhotoBuckets> | undefined) ?? null);
      if (savedBuckets) setPhotoBuckets(savedBuckets);

      const [{ data: eventsData, error: eventsError }, { data: bucketData, error: bucketError }, { data: uploadsData, error: uploadsError }] = await Promise.all([
        supabase
          .from('itinerary_events')
          .select('id,event_name,event_date')
          .eq('wedding_site_id', site.id)
          .order('event_date', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase
          .from('photo_buckets')
          .select('id,name,slug,drive_folder_url,is_active,created_at,itinerary_event_id,opens_at,closes_at')
          .eq('wedding_site_id', site.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('photo_uploads')
          .select('id,photo_bucket_id,original_filename,guest_name,guest_email,is_hidden,is_flagged,uploaded_at')
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
      setEvents([]);
      setBuckets([]);
      setUploads([]);
      setWindowDrafts({});
      setError((err as Error)?.message || 'Failed to load photo sharing.');
    } finally {
      setLoading(false);
    }
  }

  const countsByBucket = useMemo(() => {
    const m = new Map<string, number>();
    uploads.forEach((u) => m.set(u.photo_bucket_id, (m.get(u.photo_bucket_id) ?? 0) + 1));
    return m;
  }, [uploads]);

  const hiddenCountsByBucket = useMemo(() => {
    const m = new Map<string, number>();
    uploads.filter((u) => u.is_hidden).forEach((u) => m.set(u.photo_bucket_id, (m.get(u.photo_bucket_id) ?? 0) + 1));
    return m;
  }, [uploads]);

  const flaggedCountsByBucket = useMemo(() => {
    const m = new Map<string, number>();
    uploads.filter((u) => u.is_flagged).forEach((u) => m.set(u.photo_bucket_id, (m.get(u.photo_bucket_id) ?? 0) + 1));
    return m;
  }, [uploads]);

  const recentByBucket = useMemo(() => {
    const m = new Map<string, PhotoUploadRow[]>();
    getVisibleGuestPhotoUploads(uploads, { showHidden, showFlaggedOnly }).forEach((u) => {
      const arr = m.get(u.photo_bucket_id) ?? [];
      if (arr.length < 5) arr.push(u);
      m.set(u.photo_bucket_id, arr);
    });
    return m;
  }, [uploads, showHidden, showFlaggedOnly]);

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
      .filter((upload) => !upload.is_hidden && !upload.is_flagged && sourceBucketIds.has(upload.photo_bucket_id))
      .map((upload) => {
        const bucket = buckets.find((entry) => entry.id === upload.photo_bucket_id);
        return {
          uploadId: upload.id,
          bucketId: upload.photo_bucket_id,
          bucketName: bucket?.name || 'Bucket',
          title: upload.original_filename,
          caption: `${upload.guest_name || 'Guest'} · ${formatGuestPhotoDate(upload.uploaded_at)}`,
          uploadedAt: upload.uploaded_at,
        };
      });

    if (slideshowOrder === 'newest') {
      selectedUploads = selectedUploads.sort((a, b) => getGuestPhotoSortTime(b.uploadedAt) - getGuestPhotoSortTime(a.uploadedAt));
    } else if (slideshowOrder === 'oldest') {
      selectedUploads = selectedUploads.sort((a, b) => getGuestPhotoSortTime(a.uploadedAt) - getGuestPhotoSortTime(b.uploadedAt));
    } else {
      selectedUploads = [...selectedUploads].sort((a, b) => a.uploadId.localeCompare(b.uploadId));
    }

    return selectedUploads.slice(0, 24).map((frame) => ({
      uploadId: frame.uploadId,
      bucketId: frame.bucketId,
      bucketName: frame.bucketName,
      title: frame.title,
      caption: frame.caption,
    }));
  }, [buckets, uploads, countsByBucket, slideshowBucketFilter, slideshowOrder]);

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
      cardClass: 'bg-violet-50 border-violet-200',
      chipClass: 'bg-violet-100 text-violet-800',
      helper: 'More energetic framing for reception and dance-floor moments.',
    },
  };

  const copyText = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(''), 1400);
    } catch {
      window.prompt('Copy this link:', value);
      setCopied(key);
      setTimeout(() => setCopied(''), 1400);
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
    };

    const text = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied('slideshow-plan');
      setTimeout(() => setCopied(''), 1400);
    } catch {
      window.prompt('Copy slideshow plan JSON:', text);
      setCopied('slideshow-plan');
      setTimeout(() => setCopied(''), 1400);
    }
  };

  const exportBucketCsv = (bucketId: string, bucketName: string) => {
    const rows = uploads.filter((u) => u.photo_bucket_id === bucketId);
    if (rows.length === 0) return;

    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const header = ['filename', 'guest_name', 'guest_email', 'uploaded_at'];
    const lines = [
      header.join(','),
      ...rows.map((r) => [
        escapeCsv(r.original_filename),
        escapeCsv(r.guest_name || ''),
        escapeCsv(r.guest_email || ''),
        escapeCsv(toGuestPhotoCsvTimestamp(r.uploaded_at)),
      ].join(',')),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bucketName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'bucket'}-uploads.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const totalUploads = useMemo(() => uploads.length, [uploads]);
  const activeBucketsCount = useMemo(() => buckets.filter((a) => a.is_active).length, [buckets]);
  const pausedBucketsCount = useMemo(() => buckets.filter((a) => !a.is_active).length, [buckets]);

  const filteredBuckets = useMemo(() => {
    const q = bucketSearch.trim().toLowerCase();
    return buckets.filter((a) => {
      const statusOk = statusFilter === 'all' || (statusFilter === 'active' ? a.is_active : !a.is_active);
      const searchOk = !q || a.name.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q);
      return statusOk && searchOk;
    });
  }, [buckets, bucketSearch, statusFilter]);

  const missingItineraryEvents = useMemo(() => {
    const linked = new Set(buckets.map((a) => a.itinerary_event_id).filter(Boolean));
    return events.filter((e) => !linked.has(e.id));
  }, [events, buckets]);

  const makeShareMessage = (bucketName: string, link: string) =>
    `Please upload your ${bucketName} photos here: ${link}`;

  const bucketCardTone = (bucketName: string) => {
    const name = bucketName.toLowerCase();
    if (/ceremony|vows|aisle/.test(name)) return 'Save the quiet, meaningful moments.';
    if (/welcome|party|cocktail/.test(name)) return 'Capture the energy before everyone settles in.';
    if (/dance|after party|after-party/.test(name)) return 'This is for the blurry, loud, great stuff.';
    if (/brunch|recovery|farewell/.test(name)) return 'Keep the softer next-day memories here.';
    return 'A clean bucket for one specific moment guests can easily understand.';
  };

  const sendAllActiveBucketRequests = () => {
    const lines = buckets
      .filter((a) => a.is_active)
      .map((a) => {
        const link = bucketUploadLinks[a.id];
        if (!link) return null;
        return `${a.name}: ${makeShareMessage(a.name, link)}`;
      })
      .filter((v): v is string => typeof v === 'string');

    if (lines.length === 0) {
      setError('No active buckets with links available to send.');
      return;
    }

    const subject = encodeURIComponent('Photo upload links');
    const body = encodeURIComponent(lines.join('\n\n'));
    window.location.href = `/dashboard/messages?prefillSubject=${subject}&prefillBody=${body}`;
  };

  const copyAllShareMessages = async () => {
    const lines = buckets
      .map((a) => {
        const link = bucketUploadLinks[a.id];
        if (!link) return null;
        return `${a.name}: ${makeShareMessage(a.name, link)}`;
      })
      .filter((v): v is string => typeof v === 'string');

    if (lines.length === 0) {
      setError('No share messages are ready yet. Create links first.');
      return;
    }

    await copyText(lines.join('\n\n'), 'all-share-messages');
    setSuccess(`Copied ${lines.length} share message(s).`);
  };

  const copyAllKnownLinks = async () => {
    const links = buckets
      .map((a) => bucketUploadLinks[a.id])
      .filter((v): v is string => typeof v === 'string' && v.length > 0);

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
      setError('No bucket links are ready to refresh yet.');
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
      setSuccess(`Rotated ${Object.keys(updated).length} link(s).`);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to rotate links.');
    } finally {
      setBulkRegenerating(false);
    }
  };

  const exportSharePackCsv = () => {
    const rows = buckets
      .map((a) => {
        const link = bucketUploadLinks[a.id] || '';
        return {
          name: a.name,
          status: a.is_active ? 'active' : 'paused',
          upload_link: link,
          suggested_message: link ? makeShareMessage(a.name, link) : '',
        };
      })
      .filter((r) => r.upload_link);

    if (rows.length === 0) return;

    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      ['name', 'status', 'upload_link', 'suggested_message'].join(','),
      ...rows.map((r) => [esc(r.name), esc(r.status), esc(r.upload_link), esc(r.suggested_message)].join(',')),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'photo-share-pack.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportBucketLinksCsv = () => {
    const rows = buckets
      .map((a) => ({
        name: a.name,
        slug: a.slug,
        status: a.is_active ? 'active' : 'paused',
        upload_link: bucketUploadLinks[a.id] || '',
        drive_folder_url: a.drive_folder_url || '',
      }))
      .filter((r) => r.upload_link || r.drive_folder_url);

    if (rows.length === 0) return;

    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      ['name', 'slug', 'status', 'upload_link', 'drive_folder_url'].join(','),
      ...rows.map((r) => [esc(r.name), esc(r.slug), esc(r.status), esc(r.upload_link), esc(r.drive_folder_url)].join(',')),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'photo-bucket-links.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const createMissingBucketsFromItinerary = async () => {
    if (!siteId) return;
    if (missingItineraryEvents.length === 0) {
      setSuccess('All itinerary events already have buckets.');
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
        if (data?.bucket?.id) {
          created.push(event.event_name);
          if (typeof data.uploadUrl === 'string' && data.uploadUrl) {
            links[String(data.bucket.id)] = data.uploadUrl;
          }
        }
      }

      if (Object.keys(links).length > 0) {
        setBucketUploadLinks((prev) => ({ ...prev, ...links }));
      }

      await load();
      setSuccess(`Created ${created.length} bucket(s) from itinerary events.`);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to create itinerary buckets.');
    } finally {
      setBulkCreating(false);
    }
  };

  const setUploadsHiddenByFilter = async (hide: boolean) => {
    const target = getBulkGuestPhotoModerationTargets(uploads, { showHidden, showFlaggedOnly }, { type: 'hide', hidden: hide });
    if (target.length === 0) {
      setSuccess(`No visible uploads need to be ${hide ? 'hidden' : 'unhidden'}.`);
      return;
    }

    try {
      setBulkModerating(true);
      setError(null);
      const ids = target.map((u) => u.id);
      await invokeOrThrow('photo-upload-moderate', { uploadIds: ids, patch: { is_hidden: hide } });
      await load();
      setSuccess(`${hide ? 'Hidden' : 'Unhidden'} ${ids.length} upload(s) from current view.`);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Bulk moderation failed.');
    } finally {
      setBulkModerating(false);
    }
  };

  const setUploadsFlaggedByFilter = async (flagged: boolean) => {
    const target = getBulkGuestPhotoModerationTargets(uploads, { showHidden, showFlaggedOnly }, { type: 'flag', flagged });
    if (target.length === 0) {
      setSuccess(`No visible uploads need to be ${flagged ? 'flagged' : 'unflagged'}.`);
      return;
    }

    try {
      setBulkModerating(true);
      setError(null);
      const ids = target.map((u) => u.id);
      await invokeOrThrow('photo-upload-moderate', { uploadIds: ids, patch: { is_flagged: flagged } });
      await load();
      setSuccess(`${flagged ? 'Flagged' : 'Unflagged'} ${ids.length} upload(s) from current view.`);
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Bulk moderation failed.');
    } finally {
      setBulkModerating(false);
    }
  };

  const moderateUpload = async (uploadId: string, patch: Partial<Pick<PhotoUploadRow, 'is_hidden' | 'is_flagged'>>) => {
    try {
      setError(null);
      await invokeOrThrow('photo-upload-moderate', { uploadIds: [uploadId], patch });
      await load();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to update upload moderation status.');
    }
  };

  const setBucketActive = async (bucketId: string, isActive: boolean) => {
    try {
      setWorkingBucketId(bucketId);
      setError(null);
      await invokeOrThrow('photo-album-manage', { action: 'set_active', albumId: bucketId, isActive });
      await load();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to update bucket status.');
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
      setSuccess('Bucket link regenerated. Old link is now invalid.');
      await load();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to regenerate upload link.');
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
        throw new Error('Enter valid open and close times.');
      }
      if (opensAt && closesAt && new Date(closesAt) <= new Date(opensAt)) {
        throw new Error('Close time must be after open time.');
      }
      await invokeOrThrow('photo-album-manage', { action: 'set_window', albumId: bucketId, opensAt, closesAt });
      setSuccess('Upload window saved.');
      await load();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to save upload window.');
    } finally {
      setWorkingBucketId('');
    }
  };

  const getBucketQrUrl = (uploadUrl: string) => `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(uploadUrl)}`;

  const createBucket = async () => {
    if (!siteId) return;
    if (!name.trim()) {
      setError('Bucket name is required.');
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
      });
      if (!data?.bucket?.id) throw new Error('Bucket creation failed.');

      const uploadUrl = (data.uploadUrl as string) ?? '';
      setLatestUploadUrl(uploadUrl);
      if (uploadUrl && data.bucket?.id) {
        setBucketUploadLinks((prev) => ({ ...prev, [String(data.bucket.id)]: uploadUrl }));
      }
      setSuccess(`Bucket "${data.bucket.name}" created.`);
      await load();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Failed to create bucket.');
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
                <p className="text-xs text-text-secondary mt-1">Upload couple photos here. When you are ready, continue into your dashboard to review the draft and keep shaping the site.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate(buildQuickStartOverviewPath())}>
                Continue to review
              </Button>
            </div>
          </Card>
        )}
        <div className="rounded-[28px] border border-neutral-200 bg-gradient-to-br from-white via-rose-50 to-amber-50 p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">Memories</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-900">Build a beautiful bucket board for every memory you want guests to upload.</h1>
              <p className="mt-3 text-sm leading-6 text-neutral-600">Start with a blank bucket sheet, create the moments you care about, then share one clean upload dashboard link or QR so guests can send photos without confusion.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:w-[420px]">
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">Buckets</p>
                <p className="mt-2 text-2xl font-semibold text-neutral-900">{buckets.length}</p>
                <p className="mt-1 text-xs text-neutral-500">Blank sheet first, then create what you need.</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">Uploads</p>
                <p className="mt-2 text-2xl font-semibold text-neutral-900">{totalUploads}</p>
                <p className="mt-1 text-xs text-neutral-500">Across all live memory buckets.</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <p className="text-xs uppercase tracking-wide text-neutral-500">Sharing</p>
                <p className="mt-2 text-sm font-semibold text-neutral-900">Link + QR ready</p>
                <p className="mt-1 text-xs text-neutral-500">Give guests one obvious way to upload.</p>
              </div>
            </div>
          </div>
        </div>

        <MemoryCuratorCard model={photoMemoryCurator} />

        <Card className="border-0 bg-neutral-950 text-white shadow-sm">
          <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">Memory system</p>
              <h2 className="mt-2 text-xl font-semibold">Buckets are for collecting new uploads. Archive Vaults are for preserving what matters after the wedding.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">Use buckets to gather photos fast. Use Archive Vaults when you want to keep, curate, and revisit the memories that matter long term.</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/dashboard/vault')} className="border-white/20 bg-white/5 text-white hover:bg-white/10">
              Open Archive Vaults
            </Button>
          </div>
        </Card>

        <Card className="p-6 border border-border bg-surface">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-neutral-900">Couple photo buckets</h2>
            <p className="mt-1 text-sm text-neutral-600">Create your own couple-photo buckets here so uploads stay organized by the moments and photo types you actually care about.</p>
          </div>
          <PhotoBucketCards buckets={photoBuckets} onUploadClick={handleBucketUploadClick} onRemoveClick={handleBucketRemoveClick} />
          <input ref={bucketFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBucketFilesSelected} />
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-xs text-neutral-500">Buckets</p>
            <p className="text-2xl font-semibold text-neutral-900">{buckets.length}</p>
            <p className="text-xs text-neutral-500">{activeBucketsCount} active · {pausedBucketsCount} paused</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-neutral-500">Uploads</p>
            <p className="text-2xl font-semibold text-neutral-900">{totalUploads}</p>
            <p className="text-xs text-neutral-500">Across all buckets</p>
          </Card>
        </div>

        <Card className="p-6 border border-violet-200 bg-violet-50/40">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clapperboard className="w-5 h-5 text-violet-700" />
                <h2 className="text-xl font-semibold text-violet-950">Slideshow generator</h2>
              </div>
              <p className="text-sm text-violet-900/80">
                Turn uploaded guest photos into a simple bucket-driven slideshow. Start with your strongest event buckets, preview the sequence, then polish later.
              </p>
              <p className="mt-2 text-xs text-violet-900/70">
                Ready now: <span className="font-semibold text-violet-950">{slideshowReadyBucketCount}</span> bucket{slideshowReadyBucketCount === 1 ? '' : 's'} with 3+ uploads.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" className="border-violet-300 text-violet-900 hover:bg-violet-100">
                <Clapperboard className="w-4 h-4 mr-2" />
                Slideshow v1 ready below
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Slideshow builder v1</h2>
              <p className="mt-1 text-sm text-neutral-600">Assemble a simple slideshow sequence from your uploaded guest photos.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={slideshowBucketFilter}
                onChange={(e) => setSlideshowBucketFilter(e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="all">All slideshow-ready buckets</option>
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
                <option value="shuffled">Stable shuffled</option>
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
                {copied === 'slideshow-plan' ? 'Copied plan' : 'Export plan'}
              </Button>
            </div>
          </div>

          {slideshowFrames.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-surface-subtle/20 px-4 py-6 text-sm text-neutral-600">
              Need at least one active bucket with 3+ visible uploads before a slideshow can be assembled.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-4 py-3 text-sm text-neutral-700">
                Built <span className="font-semibold text-neutral-900">{slideshowFrames.length}</span> frames from <span className="font-semibold text-neutral-900">{slideshowBucketFilter === 'all' ? slideshowReadyBucketCount : 1}</span> bucket source{slideshowBucketFilter === 'all' ? 's' : ''}.
              </div>
              <div className="rounded-xl border border-border-subtle bg-surface-subtle/20 px-4 py-3 text-sm text-neutral-700">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${slideshowThemeMeta[slideshowTheme].chipClass}`}>
                  {slideshowThemeMeta[slideshowTheme].label}
                </span>
                <span className="ml-2">{slideshowThemeMeta[slideshowTheme].helper}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {slideshowFrames.map((frame, index) => (
                  <div key={frame.uploadId} className={`rounded-xl border px-4 py-3 ${slideshowThemeMeta[slideshowTheme].cardClass}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-neutral-900">Frame {index + 1}</p>
                      <span className={`text-xs rounded-full px-2 py-0.5 ${slideshowThemeMeta[slideshowTheme].chipClass}`}>{frame.bucketName}</span>
                    </div>
                    <p className="mt-2 text-sm text-neutral-800 truncate">{frame.title}</p>
                    <p className="mt-1 text-xs text-neutral-500">{frame.caption}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {slideshowPreviewOpen && slideshowFrames.length > 0 && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-white rounded-2xl border border-border shadow-xl p-5 space-y-4 max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">Slideshow preview</h3>
                  <p className="text-sm text-neutral-600">{slideshowThemeMeta[slideshowTheme].label} · {slideshowFrames.length} frames · {slideshowOrder}</p>
                </div>
                <Button variant="outline" onClick={() => setSlideshowPreviewOpen(false)}>Close</Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {slideshowFrames.map((frame, index) => (
                  <div key={frame.uploadId} className={`rounded-xl border px-4 py-4 ${slideshowThemeMeta[slideshowTheme].cardClass}`}>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">Slide {index + 1}</p>
                    <p className="mt-2 text-base font-semibold text-neutral-900 truncate">{frame.title}</p>
                    <p className="mt-1 text-sm text-neutral-700">{frame.bucketName}</p>
                    <p className="mt-2 text-xs text-neutral-500">{frame.caption}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <Card className="overflow-hidden border-0 bg-white shadow-sm">
          <div className="border-b border-neutral-100 bg-neutral-50/80 px-6 py-5">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="w-5 h-5 text-rose-600" />
              <h2 className="text-xl font-semibold text-neutral-900">Bucket sheet</h2>
            </div>
            <p className="text-sm text-neutral-600">Create buckets for the moments you want people to upload into. Think welcome party, dance floor, disposables, table shots, brunch, or anything else worth collecting.</p>
          </div>
          <div className="p-6 space-y-5">

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Welcome party', hint: 'pre-wedding energy' },
              { label: 'Ceremony', hint: 'the core moment' },
              { label: 'Dance floor', hint: 'the fun stuff' },
              { label: 'Disposables', hint: 'film and candid dumps' },
            ].map((template) => (
              <button
                key={template.label}
                type="button"
                onClick={() => setName(template.label)}
                className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-left transition hover:border-neutral-300 hover:bg-white"
              >
                <p className="text-sm font-medium text-neutral-900">{template.label}</p>
                <p className="mt-1 text-xs text-neutral-500">{template.hint}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Bucket name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ceremony" />
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
                {submitting ? 'Creating...' : 'Add bucket'}
              </Button>
              {latestUploadUrl && (
                <Button variant="outline" onClick={() => void copyText(latestUploadUrl, 'sheet-dashboard-link')} className="w-full sm:w-auto">
                  <Copy className="w-4 h-4 mr-1" />
                  {copied === 'sheet-dashboard-link' ? 'Copied newest bucket link' : 'Copy newest bucket link'}
                </Button>
              )}
              {latestUploadUrl && (
                <Button variant="outline" onClick={() => window.open(getBucketQrUrl(latestUploadUrl), '_blank')} className="w-full sm:w-auto">
                  QR for newest bucket
                </Button>
              )}
              {latestUploadUrl && (
                <Button variant="outline" onClick={() => window.open(latestUploadUrl, '_blank')} className="w-full sm:w-auto">
                  <ExternalLink className="w-4 h-4 mr-1" /> Open newest bucket link
                </Button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-border-subtle bg-surface-subtle/40 px-3 py-2">
              <p className="text-xs text-text-secondary">
                Missing event buckets: <span className="font-semibold text-text-primary">{missingItineraryEvents.length}</span>
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void createMissingBucketsFromItinerary()}
                disabled={bulkCreating || loading || missingItineraryEvents.length === 0}
                className="w-full sm:w-auto"
              >
                {bulkCreating ? 'Creating event buckets...' : 'Create missing event buckets'}
              </Button>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {success && <p className="mt-3 text-sm text-emerald-700">{success}</p>}

          {latestUploadUrl && (
            <div className="grid gap-3 lg:grid-cols-[1.35fr_0.9fr]">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-900 mb-1">Newest bucket upload link</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-emerald-800 break-all">{latestUploadUrl}</code>
                  <Button size="sm" variant="outline" onClick={() => copyText(latestUploadUrl, 'latest')}>
                    <Copy className="w-3 h-3 mr-1" /> {copied === 'latest' ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Newest bucket link</p>
                <p className="mt-2 text-sm text-neutral-700">Use a real bucket upload link here. Don’t hand out a generic site URL and hope guests find the right place.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {latestUploadUrl ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => window.open(latestUploadUrl, '_blank')}>Open newest bucket link</Button>
                      <Button size="sm" variant="outline" onClick={() => window.open(getBucketQrUrl(latestUploadUrl), '_blank')}>Open QR</Button>
                    </>
                  ) : (
                    <p className="text-xs text-neutral-500">Create or refresh a bucket link before sharing uploads.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          </div>
        </Card>

        <Card className="p-6 border-0 shadow-sm">
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-neutral-900">Buckets</h2>
              <div className="text-xs text-neutral-500">{filteredBuckets.length} visible</div>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Sharing dashboard</p>
                <p className="mt-2 text-sm text-neutral-700">Copy links, QR codes, and guest-facing prompts without digging through menus.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => void copyAllKnownLinks()}>
                    {copied === 'all-links' ? 'Copied all links' : 'Copy all bucket links'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void copyAllShareMessages()}>
                    {copied === 'all-share-messages' ? 'Copied prompts' : 'Copy all share prompts'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => sendAllActiveBucketRequests()}>
                    Send all active bucket requests
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void regenerateAllKnownBucketLinks()} disabled={bulkRegenerating}>
                    {bulkRegenerating ? 'Refreshing links...' : 'Refresh all links'}
                  </Button>
                </div>
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Ops tools</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportBucketLinksCsv()}>Export bucket links</Button>
                  <Button size="sm" variant="outline" onClick={() => exportSharePackCsv()}>Export share kit</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowFlaggedOnly((v) => !v)}>
                    {showFlaggedOnly ? 'Show all uploads' : 'Show flagged only'}
                  </Button>
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
              value={bucketSearch}
              onChange={(e) => setBucketSearch(e.target.value)}
              placeholder="Search bucket name or slug"
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
            <div className="text-xs text-neutral-500 flex items-center">{filteredBuckets.length} bucket(s)</div>
          </div>

          {loading ? (
            <p className="text-sm text-neutral-500">Loading buckets…</p>
          ) : buckets.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-neutral-300 bg-gradient-to-br from-neutral-50 to-rose-50/50 p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">Blank bucket sheet</p>
              <h3 className="mt-3 text-2xl font-semibold text-neutral-900">Start with the moments you actually want back.</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">Create a few simple buckets first, then share the upload dashboard link or QR so guests know exactly where to send photos.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {['Welcome party', 'Ceremony', 'Dance floor', 'Brunch'].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setName(suggestion)}
                    className="rounded-2xl border border-white bg-white/80 px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <p className="text-sm font-medium text-neutral-900">{suggestion}</p>
                    <p className="mt-1 text-xs text-neutral-500">Use this as your next bucket</p>
                  </button>
                ))}
              </div>
            </div>
          ) : filteredBuckets.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-600">
              No buckets match those filters. Try a different search, switch the status filter, or clear your hidden / flagged view.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBuckets.map((bucket) => {
                const uploadCount = countsByBucket.get(bucket.id) ?? 0;
                const hiddenCount = hiddenCountsByBucket.get(bucket.id) ?? 0;
                const flaggedCount = flaggedCountsByBucket.get(bucket.id) ?? 0;
                const recents = recentByBucket.get(bucket.id) ?? [];
                const draft = windowDrafts[bucket.id] ?? { opensAt: '', closesAt: '' };
                const knownUploadLink = bucketUploadLinks[bucket.id] || '';
                const hasWindow = Boolean(bucket.opens_at || bucket.closes_at);
                const hasLink = Boolean(knownUploadLink);

                return (
                  <div key={bucket.id} className="overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-sm">
                    <div className="border-b border-neutral-100 bg-gradient-to-r from-white via-rose-50/50 to-amber-50/60 px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-neutral-900">{bucket.name}</p>
                          <p className="mt-1 text-sm text-neutral-600">{bucketCardTone(bucket.name)}</p>
                          <p className="text-xs text-neutral-500">Created {formatGuestPhotoDateTime(bucket.created_at)}</p>
                          <div className="mt-1 text-xs text-neutral-500 flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex rounded px-2 py-0.5 ${bucket.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>
                              {bucket.is_active ? 'Active' : 'Paused'}
                            </span>
                            <span>{uploadCount} uploads</span>
                            {!hasLink && <span className="text-rose-700">no saved link yet</span>}
                            {!hasWindow && <span className="text-amber-700">no upload window yet</span>}
                            {flaggedCount > 0 && <span className="text-amber-700">{flaggedCount} flagged</span>}
                            {hiddenCount > 0 && <span className="text-neutral-600">{hiddenCount} hidden</span>}
                            <span>slug: {bucket.slug}</span>
                          {hasLink && <span className="text-emerald-700">upload dashboard ready</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-end">
                        {bucket.drive_folder_url && (
                          <Button size="sm" variant="outline" onClick={() => window.open(bucket.drive_folder_url!, '_blank')}>
                            <ExternalLink className="w-3 h-3 mr-1" /> Drive
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={workingBucketId === bucket.id}
                          onClick={() => void regenerateLink(bucket.id)}
                        >
                          <LinkIcon className="w-3 h-3 mr-1" />
                          {workingBucketId === bucket.id ? 'Working...' : 'Refresh upload dashboard link'}
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
                          onClick={() => window.open(getBucketQrUrl(knownUploadLink), '_blank')}
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
                          Export CSV
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!knownUploadLink}
                          onClick={() => void copyText(makeShareMessage(bucket.name, knownUploadLink), `share-msg-${bucket.id}`)}
                        >
                          {copied === `share-msg-${bucket.id}` ? 'Copied share prompt' : 'Copy share prompt'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const shareUrl = knownUploadLink || latestUploadUrl || `${window.location.origin}/photos/upload`;
                            const subject = encodeURIComponent(`${bucket.name} photos upload`);
                            const body = encodeURIComponent(makeShareMessage(bucket.name, shareUrl));
                            window.location.href = `/dashboard/messages?prefillSubject=${subject}&prefillBody=${body}`;
                          }}
                        >
                          <Mail className="w-3 h-3 mr-1" /> Send to messaging
                        </Button>
                        </div>
                      </div>
                    </div>
                    <div className="px-5 py-4 space-y-4">

                    {hasLink && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Upload dashboard ready</p>
                        <p className="mt-1 text-sm text-emerald-900">Share one clean upload destination for this bucket.</p>
                        <p className="mt-2 truncate text-xs text-emerald-800">{knownUploadLink}</p>
                      </div>
                    )}

                    <div className="rounded-2xl border border-neutral-200 p-3 bg-neutral-50">
                      <div className="flex items-center gap-2 mb-2 text-xs font-medium text-neutral-700">
                        <CalendarClock className="w-3.5 h-3.5" /> Collect between
                      </div>
                      <p className="mb-3 text-xs text-neutral-500">Optional. Use this when you want uploads to open and close around a specific event.</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1">Opens</label>
                          <Input
                            type="datetime-local"
                            value={draft.opensAt}
                            onChange={(e) => setWindowDrafts((prev) => ({ ...prev, [bucket.id]: { ...draft, opensAt: e.target.value } }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-500 mb-1">Closes</label>
                          <Input
                            type="datetime-local"
                            value={draft.closesAt}
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
                                <span>
                                  {u.original_filename} · {u.guest_name || 'Guest'}{u.guest_email ? ` (${u.guest_email})` : ''} · {formatGuestPhotoDateTime(u.uploaded_at)}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    className={`inline-flex items-center rounded px-1.5 py-0.5 border ${u.is_flagged ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-neutral-600 border-neutral-300'}`}
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
                                    {u.is_hidden ? 'Unhide' : 'Hide'}
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
