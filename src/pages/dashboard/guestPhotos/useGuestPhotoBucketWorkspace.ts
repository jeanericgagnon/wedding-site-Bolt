import { useRef, useState } from 'react';

import { mediaRepository } from '../../../builder/services/mediaRepository';
import { createEmptyPhotoBuckets, type PhotoBucketKind } from '../../../lib/aiPhotoBuckets';
import { buildPhotoPlacementPlan } from '../../../lib/aiPhotoPlacement';
import { persistGuestPhotoBuckets } from '../guestPhotoSharingService';
import { safePhotoOwnerError } from '../guestPhotoSharingUtils';

export type GuestPhotoBucketsState = ReturnType<typeof createEmptyPhotoBuckets>;

interface UseGuestPhotoBucketWorkspaceArgs {
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setSuccess: React.Dispatch<React.SetStateAction<string | null>>;
  siteId: string | null;
}

export function useGuestPhotoBucketWorkspace({
  setError,
  setSubmitting,
  setSuccess,
  siteId,
}: UseGuestPhotoBucketWorkspaceArgs) {
  const [photoBuckets, setPhotoBuckets] = useState<GuestPhotoBucketsState>(() => createEmptyPhotoBuckets());
  const bucketFileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingBucketRef = useRef<PhotoBucketKind | null>(null);
  const [pendingBucket, setPendingBucket] = useState<PhotoBucketKind | null>(null);

  const persistPhotoBuckets = async (nextBuckets: GuestPhotoBucketsState) => {
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

  return {
    bucketFileInputRef,
    handleBucketFilesSelected,
    handleBucketRemoveClick,
    handleBucketUploadClick,
    photoBuckets,
    setPhotoBuckets,
  };
}
