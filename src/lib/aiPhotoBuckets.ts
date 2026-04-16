export type PhotoBucketKind =
  | 'main-couple'
  | 'couple-gallery'
  | 'weekend-vibe'
  | 'friends-family'
  | 'extras';

export type PhotoBucketItem = {
  id: string;
  url: string;
  bucket: PhotoBucketKind;
  label?: string;
  favorite?: boolean;
  uploadedAt?: string;
};

export type CanonicalPhotoBuckets = Record<PhotoBucketKind, PhotoBucketItem[]>;

export const createEmptyPhotoBuckets = (): CanonicalPhotoBuckets => ({
  'main-couple': [],
  'couple-gallery': [],
  'weekend-vibe': [],
  'friends-family': [],
  extras: [],
});

export const addPhotoToBucket = (
  buckets: CanonicalPhotoBuckets,
  item: PhotoBucketItem
): CanonicalPhotoBuckets => ({
  ...buckets,
  [item.bucket]: [...buckets[item.bucket], item],
});
