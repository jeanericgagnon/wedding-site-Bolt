import { safePhotoAnalysisList, safePhotoAnalysisText } from '../../../lib/photoAnalysisCustomerCopy';
import { formatGuestPhotoDate, getGuestPhotoSortTime } from '../guestPhotoUploadTime';
import {
  type PhotoBucketRow,
  type PhotoUploadAiAnalysisRow,
  type PhotoUploadMetadataRow,
  type PhotoUploadRow,
  type SlideshowFrame,
  type SlideshowOrderMode,
} from '../guestPhotoSharingUtils';

type Args = {
  buckets: PhotoBucketRow[];
  slideshowBucketFilter: string;
  slideshowOrder: SlideshowOrderMode;
  tagFilter: string;
  uploadAnalyses: PhotoUploadAiAnalysisRow[];
  uploadMetadata: PhotoUploadMetadataRow[];
  uploads: PhotoUploadRow[];
};

export function buildGuestPhotoDashboardMediaState(args: Args) {
  const countsByBucket = new Map<string, number>();
  args.uploads.forEach((upload) => {
    countsByBucket.set(upload.photo_album_id, (countsByBucket.get(upload.photo_album_id) ?? 0) + 1);
  });

  const bucketById = new Map(args.buckets.map((bucket) => [bucket.id, bucket]));

  const childBucketsByParent = new Map<string, PhotoBucketRow[]>();
  args.buckets.forEach((bucket) => {
    if (!bucket.parent_album_id) return;
    const children = childBucketsByParent.get(bucket.parent_album_id) ?? [];
    children.push(bucket);
    childBucketsByParent.set(bucket.parent_album_id, children);
  });
  childBucketsByParent.forEach((children) => children.sort((a, b) => a.name.localeCompare(b.name)));

  const bucketDepthById = new Map(
    args.buckets.map((bucket) => [bucket.id, Math.min(2, getBucketDepth(bucket, bucketById))])
  );

  const bucketDisplayName = (bucket: PhotoBucketRow | undefined | null) => {
    if (!bucket) return 'Album';
    const parent = bucket.parent_album_id ? bucketById.get(bucket.parent_album_id) : null;
    return parent ? `${parent.name} / ${bucket.name}` : bucket.hierarchy_label || bucket.name;
  };

  const descendantBucketIdsByParent = new Map(
    args.buckets.map((bucket) => [bucket.id, collectDescendantBucketIds(bucket.id, childBucketsByParent)])
  );

  const uploadCountWithChildren = (bucketId: string) => {
    const ids = [bucketId, ...(descendantBucketIdsByParent.get(bucketId) ?? [])];
    return ids.reduce((sum, id) => sum + (countsByBucket.get(id) ?? 0), 0);
  };

  const hiddenCountsByBucket = new Map<string, number>();
  args.uploads
    .filter((upload) => upload.is_hidden)
    .forEach((upload) => hiddenCountsByBucket.set(upload.photo_album_id, (hiddenCountsByBucket.get(upload.photo_album_id) ?? 0) + 1));

  const flaggedCountsByBucket = new Map<string, number>();
  args.uploads
    .filter((upload) => upload.is_flagged)
    .forEach((upload) => flaggedCountsByBucket.set(upload.photo_album_id, (flaggedCountsByBucket.get(upload.photo_album_id) ?? 0) + 1));

  const analysisByUploadId = new Map(args.uploadAnalyses.map((analysis) => [analysis.upload_id, analysis]));
  const metadataByUploadId = new Map(args.uploadMetadata.map((metadata) => [metadata.upload_id, metadata]));

  const availableAiTagCounts = new Map<string, number>();
  args.uploadAnalyses.forEach((analysis) => {
    safePhotoAnalysisList(analysis.tags).forEach((rawTag) => {
      const tag = rawTag.trim().toLowerCase();
      if (!tag) return;
      availableAiTagCounts.set(tag, (availableAiTagCounts.get(tag) ?? 0) + 1);
    });
  });

  const availableAiTags = Array.from(availableAiTagCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 24);

  const uploadMatchesTagFilter = (upload: PhotoUploadRow) => {
    if (args.tagFilter === 'all') return true;
    const analysis = analysisByUploadId.get(upload.id);
    return safePhotoAnalysisList(analysis?.tags).some((rawTag) => rawTag.trim().toLowerCase() === args.tagFilter);
  };

  const slideshowReadyBucketCount = args.buckets.filter((bucket) => (countsByBucket.get(bucket.id) ?? 0) >= 3).length;

  const sourceBuckets = args.buckets.filter((bucket) => {
    if (!bucket.is_active) return false;
    if ((countsByBucket.get(bucket.id) ?? 0) < 3) return false;
    if (args.slideshowBucketFilter === 'all') return true;
    return bucket.id === args.slideshowBucketFilter;
  });

  const sourceBucketIds = new Set(sourceBuckets.map((bucket) => bucket.id));
  let slideshowFrames = args.uploads
    .filter((upload) => !upload.is_hidden && !upload.is_flagged && sourceBucketIds.has(upload.photo_album_id))
    .filter(uploadMatchesTagFilter)
    .map((upload) => {
      const bucket = bucketById.get(upload.photo_album_id);
      const analysis = analysisByUploadId.get(upload.id);
      const metadata = metadataByUploadId.get(upload.id);
      return {
        uploadId: upload.id,
        bucketId: upload.photo_album_id,
        bucketName: bucketDisplayName(bucket),
        title: upload.original_filename,
        caption: safePhotoAnalysisText(
          analysis?.caption,
          `${upload.guest_name || 'Guest'} · ${formatGuestPhotoDate(metadata?.taken_at || upload.uploaded_at)}`
        ),
        priority: analysis?.slideshow_priority ?? 50,
        quality: analysis?.quality_score ?? 0.5,
        uploadedAt: upload.uploaded_at,
        takenAt: metadata?.taken_at ?? null,
      };
    });

  if (args.slideshowOrder === 'newest') {
    slideshowFrames = slideshowFrames.sort((a, b) => getGuestPhotoSortTime(b.uploadedAt) - getGuestPhotoSortTime(a.uploadedAt));
  } else if (args.slideshowOrder === 'oldest') {
    slideshowFrames = slideshowFrames.sort((a, b) => getGuestPhotoSortTime(a.uploadedAt) - getGuestPhotoSortTime(b.uploadedAt));
  } else if (args.slideshowOrder === 'capture') {
    slideshowFrames = slideshowFrames.sort(
      (a, b) => getGuestPhotoSortTime(a.takenAt || a.uploadedAt) - getGuestPhotoSortTime(b.takenAt || b.uploadedAt)
    );
  } else {
    slideshowFrames = [...slideshowFrames].sort(
      (a, b) => b.priority - a.priority || b.quality - a.quality || a.uploadId.localeCompare(b.uploadId)
    );
  }

  return {
    analysisByUploadId,
    availableAiTagCounts,
    availableAiTags,
    bucketById,
    bucketDepthById,
    bucketDisplayName,
    childBucketsByParent,
    countsByBucket,
    descendantBucketIdsByParent,
    flaggedCountsByBucket,
    hiddenCountsByBucket,
    metadataByUploadId,
    slideshowFrames: slideshowFrames.slice(0, 24).map(({ uploadedAt: _uploadedAt, priority: _priority, quality: _quality, ...frame }) => frame),
    slideshowReadyBucketCount,
    uploadCountWithChildren,
  };
}

function getBucketDepth(bucket: PhotoBucketRow, bucketById: Map<string, PhotoBucketRow>, seen = new Set<string>()): number {
  if (!bucket.parent_album_id || seen.has(bucket.id)) return 0;
  const parent = bucketById.get(bucket.parent_album_id);
  if (!parent) return 0;
  return 1 + getBucketDepth(parent, bucketById, new Set([...seen, bucket.id]));
}

function collectDescendantBucketIds(
  bucketId: string,
  childBucketsByParent: Map<string, PhotoBucketRow[]>,
  seen = new Set<string>()
): string[] {
  if (seen.has(bucketId)) return [];
  const nextSeen = new Set([...seen, bucketId]);
  const children = childBucketsByParent.get(bucketId) ?? [];
  return children.flatMap((child) => [child.id, ...collectDescendantBucketIds(child.id, childBucketsByParent, nextSeen)]);
}
