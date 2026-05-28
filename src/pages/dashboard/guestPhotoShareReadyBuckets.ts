export type GuestPhotoShareBucket = {
  id: string;
  name: string;
  is_active: boolean;
};

export type GuestPhotoShareReadyBucket = GuestPhotoShareBucket & {
  uploadLink: string;
};

export const getGuestPhotoShareReadyBuckets = <T extends GuestPhotoShareBucket>(
  buckets: T[],
  bucketUploadLinks: Record<string, string>,
): Array<T & { uploadLink: string }> =>
  buckets.reduce<Array<T & { uploadLink: string }>>((readyBuckets, bucket) => {
    if (!bucket.is_active) return readyBuckets;
    const uploadLink = bucketUploadLinks[bucket.id]?.trim() ?? '';
    if (!uploadLink) return readyBuckets;
    readyBuckets.push({ ...bucket, uploadLink });
    return readyBuckets;
  }, []);
