import { useEffect, useRef } from 'react';

import { parseDatetimeLocalToIso } from '../guestPhotoDateTime';
import { getSuggestedGuestPhotoWindowStart } from '../guestPhotoEventDate';
import { createGuestPhotoAlbum, manageGuestPhotoAlbum } from '../guestPhotoSharingService';
import { safePhotoOwnerError, type ItineraryEvent, type PhotoBucketRow } from '../guestPhotoSharingUtils';

type WindowDraft = { opensAt: string; closesAt: string };

type MomentSuggestion = {
  tag: string;
  label: string;
  eventId: string;
  eventName: string;
  parentBucket: PhotoBucketRow | null;
};

interface UseGuestPhotoAlbumActionsInput {
  bucketById: Map<string, PhotoBucketRow>;
  bucketDisplayName: (bucket: PhotoBucketRow | undefined | null) => string;
  buckets: PhotoBucketRow[];
  events: ItineraryEvent[];
  itineraryEventId: string;
  load: () => Promise<void>;
  logPhotoAction: (type: string, summary: string, metadata?: Record<string, unknown>, targetId?: string | null, targetLabel?: string | null) => void;
  missingItineraryEvents: ItineraryEvent[];
  name: string;
  parentAlbumId: string;
  setBucketUploadLinks: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setBulkCreating: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setLatestUploadUrl: React.Dispatch<React.SetStateAction<string>>;
  setName: React.Dispatch<React.SetStateAction<string>>;
  setParentAlbumId: React.Dispatch<React.SetStateAction<string>>;
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setSuccess: React.Dispatch<React.SetStateAction<string | null>>;
  setWorkingBucketId: React.Dispatch<React.SetStateAction<string>>;
  setWindowDrafts: React.Dispatch<React.SetStateAction<Record<string, WindowDraft>>>;
  siteId: string | null;
  windowDrafts: Record<string, WindowDraft>;
}

export function useGuestPhotoAlbumActions({
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
}: UseGuestPhotoAlbumActionsInput) {
  const mountedRef = useRef(true);
  const albumActionRequestIdRef = useRef(0);
  const siteIdRef = useRef(siteId);
  siteIdRef.current = siteId;

  useEffect(() => () => {
    mountedRef.current = false;
    albumActionRequestIdRef.current += 1;
  }, []);

  useEffect(() => {
    albumActionRequestIdRef.current += 1;
    setBulkCreating(false);
    setSubmitting(false);
    setWorkingBucketId('');
  }, [setBulkCreating, setSubmitting, setWorkingBucketId, siteId]);

  const beginAlbumAction = () => {
    const requestId = ++albumActionRequestIdRef.current;
    const requestSiteId = siteId;
    return () => (
      mountedRef.current &&
      requestId === albumActionRequestIdRef.current &&
      siteIdRef.current === requestSiteId
    );
  };

  const createMissingBucketsFromItinerary = async () => {
    if (!siteId) return;
    if (missingItineraryEvents.length === 0) {
      setSuccess('All itinerary events already have albums.');
      return;
    }

    const isCurrentAlbumAction = beginAlbumAction();
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
        if (!isCurrentAlbumAction()) return;
        const createdAlbum = data?.album ?? data?.bucket;
        if (createdAlbum?.id) {
          created.push(event.event_name);
          if (typeof data.uploadUrl === 'string' && data.uploadUrl) {
            links[String(createdAlbum.id)] = data.uploadUrl;
          }
        }
      }

      if (Object.keys(links).length > 0) {
        if (!isCurrentAlbumAction()) return;
        setBucketUploadLinks((prev) => ({ ...prev, ...links }));
      }

      await load();
      if (!isCurrentAlbumAction()) return;
      setSuccess(`Created ${created.length} album${created.length === 1 ? '' : 's'} from itinerary events.`);
    } catch (err: unknown) {
      if (!isCurrentAlbumAction()) return;
      setError(safePhotoOwnerError(err, 'Couldn’t create itinerary albums yet.'));
    } finally {
      if (isCurrentAlbumAction()) setBulkCreating(false);
    }
  };

  const createMomentBucketFromSuggestion = async (suggestion: MomentSuggestion) => {
    if (!siteId) return;
    const isCurrentAlbumAction = beginAlbumAction();
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
      if (!isCurrentAlbumAction()) return;
      const createdAlbum = data?.album ?? data?.bucket;
      if (!createdAlbum?.id) throw new Error('Couldn’t create that moment album yet.');
      const uploadUrl = (data.uploadUrl as string) ?? '';
      if (uploadUrl) setBucketUploadLinks((prev) => ({ ...prev, [String(createdAlbum.id)]: uploadUrl }));
      await load();
      if (!isCurrentAlbumAction()) return;
      setSuccess(suggestion.parentBucket ? `Created ${suggestion.parentBucket.name} / ${suggestion.label}.` : `Created ${suggestion.label} from ${suggestion.eventName}.`);
    } catch (err: unknown) {
      if (!isCurrentAlbumAction()) return;
      setError(safePhotoOwnerError(err, 'Couldn’t create that moment album yet.'));
    } finally {
      if (isCurrentAlbumAction()) setSubmitting(false);
    }
  };

  const setBucketActive = async (bucketId: string, isActive: boolean) => {
    const isCurrentAlbumAction = beginAlbumAction();
    try {
      setWorkingBucketId(bucketId);
      setError(null);
      await manageGuestPhotoAlbum({ action: 'set_active', albumId: bucketId, isActive });
      await load();
      if (!isCurrentAlbumAction()) return;
      logPhotoAction(isActive ? 'bucket_activated' : 'bucket_paused', `${isActive ? 'Opened' : 'Paused'} a photo album.`, { isActive }, bucketId, bucketDisplayName(bucketById.get(bucketId)));
    } catch (err: unknown) {
      if (!isCurrentAlbumAction()) return;
      setError(safePhotoOwnerError(err, 'Couldn’t update album sharing yet.'));
    } finally {
      if (isCurrentAlbumAction()) setWorkingBucketId('');
    }
  };

  const setBucketParent = async (bucketId: string, nextParentAlbumId: string) => {
    const isCurrentAlbumAction = beginAlbumAction();
    try {
      setWorkingBucketId(bucketId);
      setError(null);
      await manageGuestPhotoAlbum({ action: 'set_parent', albumId: bucketId, parentAlbumId: nextParentAlbumId || null });
      await load();
      if (!isCurrentAlbumAction()) return;
      setSuccess(nextParentAlbumId ? 'Sub-album relationship saved.' : 'Album moved back to top level.');
    } catch (err: unknown) {
      if (!isCurrentAlbumAction()) return;
      setError(safePhotoOwnerError(err, 'Couldn’t update the album grouping yet.'));
    } finally {
      if (isCurrentAlbumAction()) setWorkingBucketId('');
    }
  };

  const regenerateLink = async (bucketId: string) => {
    const isCurrentAlbumAction = beginAlbumAction();
    try {
      setWorkingBucketId(bucketId);
      setError(null);
      setSuccess(null);
      const data = await manageGuestPhotoAlbum({ action: 'regenerate_link', albumId: bucketId });
      if (!isCurrentAlbumAction()) return;
      const uploadUrl = (data?.uploadUrl as string) ?? '';
      setLatestUploadUrl(uploadUrl);
      if (uploadUrl) {
        setBucketUploadLinks((prev) => ({ ...prev, [bucketId]: uploadUrl }));
      }
      setSuccess('Album link refreshed. The previous link no longer accepts uploads.');
      await load();
      if (!isCurrentAlbumAction()) return;
    } catch (err: unknown) {
      if (!isCurrentAlbumAction()) return;
      setError(safePhotoOwnerError(err, 'Couldn’t refresh that upload link yet.'));
    } finally {
      if (isCurrentAlbumAction()) setWorkingBucketId('');
    }
  };

  const applySuggestedWindow = (bucketId: string) => {
    const bucket = buckets.find((album) => album.id === bucketId);
    if (!bucket) return;

    const event = events.find((item) => item.id === bucket.itinerary_event_id);
    const baseDate = getSuggestedGuestPhotoWindowStart(event?.event_date);
    const opens = baseDate;
    const closes = new Date(baseDate.getTime() + 72 * 60 * 60 * 1000);

    const toLocal = (date: Date) => {
      const pad = (value: number) => String(value).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    setWindowDrafts((prev) => ({
      ...prev,
      [bucketId]: { opensAt: toLocal(opens), closesAt: toLocal(closes) },
    }));
  };

  const saveWindow = async (bucketId: string) => {
    const isCurrentAlbumAction = beginAlbumAction();
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
      if (!isCurrentAlbumAction()) return;
      setSuccess('Upload window saved.');
      await load();
      if (!isCurrentAlbumAction()) return;
    } catch (err: unknown) {
      if (!isCurrentAlbumAction()) return;
      setError(safePhotoOwnerError(err, 'Couldn’t save that upload window yet.'));
    } finally {
      if (isCurrentAlbumAction()) setWorkingBucketId('');
    }
  };

  const createBucket = async () => {
    if (!siteId) return;
    if (!name.trim()) {
      setError('Album name is required.');
      return;
    }

    const isCurrentAlbumAction = beginAlbumAction();
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
      if (!isCurrentAlbumAction()) return;
      const createdAlbum = data?.album ?? data?.bucket;
      if (!createdAlbum?.id) throw new Error('Couldn’t create that album yet.');

      const uploadUrl = (data.uploadUrl as string) ?? '';
      setLatestUploadUrl(uploadUrl);
      if (uploadUrl && createdAlbum.id) {
        setBucketUploadLinks((prev) => ({ ...prev, [String(createdAlbum.id)]: uploadUrl }));
      }

      await load();
      if (!isCurrentAlbumAction()) return;
      setSuccess(`Album "${createdAlbum.name ?? name.trim()}" created.`);
      setName('');
      setParentAlbumId('');
    } catch (err: unknown) {
      if (!isCurrentAlbumAction()) return;
      setError(safePhotoOwnerError(err, 'Couldn’t create that album yet.'));
    } finally {
      if (isCurrentAlbumAction()) setSubmitting(false);
    }
  };

  return {
    applySuggestedWindow,
    createBucket,
    createMissingBucketsFromItinerary,
    createMomentBucketFromSuggestion,
    regenerateLink,
    saveWindow,
    setBucketActive,
    setBucketParent,
  };
}
