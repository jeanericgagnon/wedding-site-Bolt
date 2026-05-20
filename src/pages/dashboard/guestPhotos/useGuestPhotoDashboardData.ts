import { useCallback, useEffect, useRef } from 'react';

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
import { createEmptyPhotoBuckets } from '../../../lib/aiPhotoBuckets';

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
  const loadRequestIdRef = useRef(0);

  const resetGuestPhotoDashboardState = useCallback(() => {
    setSiteId(null);
    setSiteSlug(null);
    setIsPublished(false);
    setEvents([]);
    setBuckets([]);
    setPhotoBuckets(createEmptyPhotoBuckets());
    setUploads([]);
    setUploadAnalyses([]);
    setUploadMetadata([]);
    setAiBucketCorrections([]);
    setAiPhotoOpsPlan(null);
    setGuestbookEntries([]);
    setGuestProspects([]);
    setHubSettings(DEFAULT_HUB_SETTINGS);
    setBucketUploadLinks({});
    setWindowDrafts({});
  }, [
    setAiBucketCorrections,
    setAiPhotoOpsPlan,
    setBucketUploadLinks,
    setBuckets,
    setEvents,
    setGuestProspects,
    setGuestbookEntries,
    setHubSettings,
    setIsPublished,
    setPhotoBuckets,
    setSiteId,
    setSiteSlug,
    setUploadAnalyses,
    setUploadMetadata,
    setUploads,
    setWindowDrafts,
  ]);

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
    setAiPhotoOpsPlan(null);
    setAiBucketCorrections([]);
    setGuestbookEntries(demoState.guestbookEntries);
    setGuestProspects(demoState.guestProspects);
    setHubSettings(demoState.hubSettings ?? DEFAULT_HUB_SETTINGS);
    setBucketUploadLinks(demoState.bucketUploadLinks);
    setWindowDrafts(Object.fromEntries(demoState.buckets.map((album) => [album.id, { opensAt: '', closesAt: '' }])));
  }, [
    setAiBucketCorrections,
    setAiPhotoOpsPlan,
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

  const load = useCallback(async (retried = false, requestId?: number) => {
    const activeRequestId = requestId ?? ++loadRequestIdRef.current;
    const isCurrentLoad = () => activeRequestId === loadRequestIdRef.current;
    try {
      setLoading(true);
      setError(null);

      const userId = await resolveGuestPhotoDashboardUserId();
      if (!isCurrentLoad()) return;
      if (!userId && isDemoMode) {
        loadDemoPhotoSpace();
        return;
      }
      if (!userId) {
        resetGuestPhotoDashboardState();
        throw new Error('Your session needs a quick refresh. Please refresh and try again.');
      }

      const snapshot = await loadGuestPhotoDashboardSnapshot(userId).catch((err) => {
        const message = err instanceof Error ? err.message : '';
        if (isDemoMode && message === 'Choose a wedding site before managing photos.') {
          return null;
        }
        throw err;
      });
      if (!isCurrentLoad()) return;
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
      setPhotoBuckets(savedBuckets ?? createEmptyPhotoBuckets());
      const savedAiPhotoOps = ((weddingMeta.aiPhotoOps as AiPhotoOpsPlan | undefined) ?? null);
      setAiPhotoOpsPlan(savedAiPhotoOps ?? null);
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
        if (!isCurrentLoad()) return;
        await load(true, activeRequestId);
        return;
      }
      if (!isCurrentLoad()) return;
      resetGuestPhotoDashboardState();
      setError(safePhotoOwnerError(err, 'Couldn’t load the photo space. Please refresh and try again.'));
    } finally {
      if (isCurrentLoad()) setLoading(false);
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
    resetGuestPhotoDashboardState,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    load,
  };
}
