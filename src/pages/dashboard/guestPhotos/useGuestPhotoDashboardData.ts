import { useCallback, useEffect } from 'react';

import type { AiPhotoOpsPlan } from '../../../lib/aiPhotoOps';
import {
  loadGuestPhotoDashboardSnapshot,
  refreshGuestPhotoSession,
  resolveGuestPhotoDashboardUserId,
} from '../guestPhotoSharingService';
import {
  DEFAULT_HUB_SETTINGS,
  safePhotoOwnerError,
  type ItineraryEvent,
  type PhotoBucketRow,
} from '../guestPhotoSharingUtils';
import { toDatetimeLocalOrEmpty } from '../guestPhotoDateTime';
import type { GuestPhotoBucketsState } from './useGuestPhotoBucketWorkspace';
import type { GuestPhotoDashboardUiState } from './useGuestPhotoDashboardUiState';
import { readDemoGuestPhotoState } from './guestPhotoDemoState';

interface UseGuestPhotoDashboardDataArgs {
  isDemoMode: boolean;
  setPhotoBuckets: React.Dispatch<React.SetStateAction<GuestPhotoBucketsState>>;
  uiState: Pick<
    GuestPhotoDashboardUiState,
    | 'setAiBucketCorrections'
    | 'setAiPhotoOpsPlan'
    | 'setBucketUploadLinks'
    | 'setBuckets'
    | 'setError'
    | 'setEvents'
    | 'setGuestProspects'
    | 'setGuestbookEntries'
    | 'setHubSettings'
    | 'setIsPublished'
    | 'setLoading'
    | 'setSiteId'
    | 'setSiteSlug'
    | 'setUploadAnalyses'
    | 'setUploadMetadata'
    | 'setUploads'
    | 'setWindowDrafts'
  >;
}

export function useGuestPhotoDashboardData({
  isDemoMode,
  setPhotoBuckets,
  uiState,
}: UseGuestPhotoDashboardDataArgs) {
  const {
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
  } = uiState;

  const loadDemoPhotoSpace = useCallback(() => {
    const demoState = readDemoGuestPhotoState();

    setSiteId(demoState.siteId);
    setSiteSlug(demoState.siteSlug);
    setIsPublished(true);
    setEvents(demoState.events as ItineraryEvent[]);
    setBuckets(demoState.buckets as PhotoBucketRow[]);
    setUploads(demoState.uploads);
    setUploadAnalyses(demoState.uploadAnalyses);
    setUploadMetadata(demoState.uploadMetadata);
    setAiBucketCorrections([]);
    setGuestbookEntries(demoState.guestbookEntries);
    setGuestProspects(demoState.guestProspects);
    setHubSettings(demoState.hubSettings ?? DEFAULT_HUB_SETTINGS);
    setBucketUploadLinks(demoState.bucketUploadLinks);
    setWindowDrafts(Object.fromEntries(demoState.buckets.map((album) => [album.id, { opensAt: '', closesAt: '' }])));
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
    if (!userId) {
      setIsPublished(false);
      throw new Error('Your session needs a quick refresh. Please refresh and try again.');
    }

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
      setIsPublished(snapshot.isPublished);
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
      setIsPublished(false);
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
    setIsPublished,
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
