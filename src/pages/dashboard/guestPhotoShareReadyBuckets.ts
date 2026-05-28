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
): GuestPhotoShareReadyBucket[] =>
  buckets
    .filter((bucket) => bucket.is_active)
    .map((bucket) => {
      const uploadLink = bucketUploadLinks[bucket.id]?.trim() ?? '';
      if (!uploadLink) return null;
      return { ...bucket, uploadLink };
    })
    .filter((bucket): bucket is GuestPhotoShareReadyBucket => Boolean(bucket));
