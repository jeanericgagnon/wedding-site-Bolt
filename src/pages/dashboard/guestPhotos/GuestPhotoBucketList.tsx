import { GuestPhotoBucketCard } from './GuestPhotoBucketCard';
import { GuestPhotoBucketWindowEditor } from './GuestPhotoBucketWindowEditor';
import { GuestPhotoRecentUploadsList } from './GuestPhotoRecentUploadsList';
import type {
  PhotoBucketRow,
  PhotoUploadAiAnalysisRow,
  PhotoUploadRow,
} from '../guestPhotoSharingUtils';

type WindowDraft = {
  opensAt: string;
  closesAt: string;
};

type GuestPhotoBucketListProps = {
  filteredBuckets: PhotoBucketRow[];
  buckets: PhotoBucketRow[];
  countsByBucket: Map<string, number>;
  hiddenCountsByBucket: Map<string, number>;
  flaggedCountsByBucket: Map<string, number>;
  recentByBucket: Map<string, PhotoUploadRow[]>;
  windowDrafts: Record<string, WindowDraft>;
  bucketUploadLinks: Record<string, string>;
  bucketById: Map<string, PhotoBucketRow>;
  childBucketsByParent: Map<string, PhotoBucketRow[]>;
  bucketDepthById: Map<string, number>;
  descendantBucketIdsByParent: Map<string, string[]>;
  analysisByUploadId: Map<string, PhotoUploadAiAnalysisRow>;
  latestUploadUrl: string;
  workingBucketId: string;
  copyNotice: { key: string; mode: 'copied' | 'downloaded' } | null;
  uploadCountWithChildren: (bucketId: string) => number;
  bucketTone: (bucketName: string) => string;
  bucketDisplayName: (bucket: PhotoBucketRow | undefined | null) => string;
  formatDateTime: (value: string | null | undefined) => string;
  getBucketQrUrl: (uploadUrl: string) => string;
  onOpenSafePublicUrl: (url: string | null | undefined) => void;
  onRegenerateLink: (bucketId: string) => void;
  onCopyText: (text: string, key: string) => void;
  onSetBucketActive: (bucketId: string, isActive: boolean) => void;
  onExportBucketCsv: (bucketId: string, bucketName: string) => void;
  onBucketSearchChange: (value: string) => void;
  onParentChange: (bucketId: string, parentBucketId: string) => void;
  onDraftChange: (bucketId: string, draft: WindowDraft) => void;
  onApplySuggestedWindow: (bucketId: string) => void;
  onSaveWindow: (bucketId: string) => void;
  onTagFilterChange: (value: string) => void;
  onModerateUpload: (
    uploadId: string,
    patch: Partial<Pick<PhotoUploadRow, 'is_hidden' | 'is_flagged' | 'recap_hidden' | 'recap_featured' | 'recap_story'>>
  ) => void;
};

export function GuestPhotoBucketList({
  filteredBuckets,
  buckets,
  countsByBucket,
  hiddenCountsByBucket,
  flaggedCountsByBucket,
  recentByBucket,
  windowDrafts,
  bucketUploadLinks,
  bucketById,
  childBucketsByParent,
  bucketDepthById,
  descendantBucketIdsByParent,
  analysisByUploadId,
  latestUploadUrl,
  workingBucketId,
  copyNotice,
  uploadCountWithChildren,
  bucketTone,
  bucketDisplayName,
  formatDateTime,
  getBucketQrUrl,
  onOpenSafePublicUrl,
  onRegenerateLink,
  onCopyText,
  onSetBucketActive,
  onExportBucketCsv,
  onBucketSearchChange,
  onParentChange,
  onDraftChange,
  onApplySuggestedWindow,
  onSaveWindow,
  onTagFilterChange,
  onModerateUpload,
}: GuestPhotoBucketListProps) {
  return (
    <div className="space-y-3">
      {filteredBuckets.map((bucket) => {
        const uploadCount = countsByBucket.get(bucket.id) ?? 0;
        const rollupUploadCount = uploadCountWithChildren(bucket.id);
        const hiddenCount = hiddenCountsByBucket.get(bucket.id) ?? 0;
        const flaggedCount = flaggedCountsByBucket.get(bucket.id) ?? 0;
        const recents = recentByBucket.get(bucket.id) ?? [];
        const draft = windowDrafts[bucket.id] ?? { opensAt: '', closesAt: '' };
        const knownUploadLink = bucketUploadLinks[bucket.id] || '';
        const parentBucket = bucket.parent_album_id ? bucketById.get(bucket.parent_album_id) : null;
        const childBuckets = childBucketsByParent.get(bucket.id) ?? [];
        const depth = bucketDepthById.get(bucket.id) ?? 0;

        return (
          <GuestPhotoBucketCard
            key={bucket.id}
            bucket={bucket}
            parentBucket={parentBucket ?? null}
            childBuckets={childBuckets}
            depth={depth}
            uploadCount={uploadCount}
            rollupUploadCount={rollupUploadCount}
            hiddenCount={hiddenCount}
            flaggedCount={flaggedCount}
            knownUploadLink={knownUploadLink}
            latestUploadUrl={latestUploadUrl}
            workingBucketId={workingBucketId}
            copyNotice={copyNotice}
            bucketTone={bucketTone}
            formatDateTime={formatDateTime}
            getBucketQrUrl={getBucketQrUrl}
            getChildUploadCount={(bucketId) => countsByBucket.get(bucketId) ?? 0}
            onOpenSafePublicUrl={onOpenSafePublicUrl}
            onRegenerateLink={onRegenerateLink}
            onCopyText={onCopyText}
            onSetBucketActive={onSetBucketActive}
            onExportBucketCsv={onExportBucketCsv}
            onBucketSearchChange={onBucketSearchChange}
          >
            <GuestPhotoBucketWindowEditor
              bucket={bucket}
              buckets={buckets}
              descendantBucketIds={descendantBucketIdsByParent.get(bucket.id) ?? []}
              draft={draft}
              workingBucketId={workingBucketId}
              onParentChange={onParentChange}
              onDraftChange={onDraftChange}
              onApplySuggestedWindow={onApplySuggestedWindow}
              onSaveWindow={onSaveWindow}
              bucketDisplayName={bucketDisplayName}
            />

            <GuestPhotoRecentUploadsList
              uploads={recents}
              analysisByUploadId={analysisByUploadId}
              onTagFilterChange={onTagFilterChange}
              onModerateUpload={onModerateUpload}
              formatDateTime={formatDateTime}
            />
          </GuestPhotoBucketCard>
        );
      })}
    </div>
  );
}
