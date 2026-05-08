import { useCallback, useEffect } from 'react';

import { demoEvents, demoWeddingSite } from '../../../lib/demoData';
import type { AiPhotoOpsPlan } from '../../../lib/aiPhotoOps';
import {
  loadGuestPhotoDashboardSnapshot,
  refreshGuestPhotoSession,
  resolveGuestPhotoDashboardUserId,
} from '../guestPhotoSharingService';
import {
  DEFAULT_HUB_SETTINGS,
  safePhotoOwnerError,
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
import { toDatetimeLocalOrEmpty } from '../guestPhotoDateTime';
import type { GuestPhotoBucketsState } from './useGuestPhotoBucketWorkspace';

interface UseGuestPhotoDashboardDataArgs {
  isDemoMode: boolean;
  setAiBucketCorrections: React.Dispatch<React.SetStateAction<PhotoAiBucketCorrectionRow[]>>;
  setAiPhotoOpsPlan: React.Dispatch<React.SetStateAction<AiPhotoOpsPlan | null>>;
  setBucketUploadLinks: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setBuckets: React.Dispatch<React.SetStateAction<PhotoBucketRow[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setEvents: React.Dispatch<React.SetStateAction<ItineraryEvent[]>>;
  setGuestProspects: React.Dispatch<React.SetStateAction<GuestProspectOptinRow[]>>;
  setGuestbookEntries: React.Dispatch<React.SetStateAction<GuestbookEntryRow[]>>;
  setHubSettings: React.Dispatch<React.SetStateAction<GuestHubSettings>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setPhotoBuckets: React.Dispatch<React.SetStateAction<GuestPhotoBucketsState>>;
  setSiteId: React.Dispatch<React.SetStateAction<string | null>>;
  setSiteSlug: React.Dispatch<React.SetStateAction<string | null>>;
  setUploadAnalyses: React.Dispatch<React.SetStateAction<PhotoUploadAiAnalysisRow[]>>;
  setUploadMetadata: React.Dispatch<React.SetStateAction<PhotoUploadMetadataRow[]>>;
  setUploads: React.Dispatch<React.SetStateAction<PhotoUploadRow[]>>;
  setWindowDrafts: React.Dispatch<React.SetStateAction<Record<string, { opensAt: string; closesAt: string }>>>;
}

export function useGuestPhotoDashboardData({
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
}: UseGuestPhotoDashboardDataArgs) {
  const loadDemoPhotoSpace = useCallback(() => {
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
  }, [
    setAiBucketCorrections,
    setBucketUploadLinks,
    setBuckets,
    setEvents,
    setGuestProspects,
    setGuestbookEntries,
    setHubSettings,
    setSiteId,
    setSiteSlug,
    setUploadAnalyses,
    setUploadMetadata,
    setUploads,
    setWindowDrafts,
  ]);

  const load = useCallback(async (retried = false) => {
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
      const savedBuckets = ((weddingMeta.photoBuckets as GuestPhotoBucketsState | undefined) ?? null);
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
          Object.entries(prev).filter(([bucketId, link]) => liveBucketIds.has(bucketId) && typeof link === 'string' && link.length > 0),
        );
        return JSON.stringify(prev) === JSON.stringify(nextLinks) ? prev : nextLinks;
      });

      const nextDrafts: Record<string, { opensAt: string; closesAt: string }> = {};
      nextBuckets.forEach((bucket) => {
        nextDrafts[bucket.id] = {
          opensAt: toDatetimeLocalOrEmpty(bucket.opens_at),
          closesAt: toDatetimeLocalOrEmpty(bucket.closes_at),
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
  }, [
    isDemoMode,
    loadDemoPhotoSpace,
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
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    load,
  };
}
