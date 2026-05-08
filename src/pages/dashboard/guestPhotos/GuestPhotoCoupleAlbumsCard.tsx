import { PhotoBucketCards } from '../../../components/dashboard/PhotoBucketCards';
import { Card } from '../../../components/ui/Card';
import type { CanonicalPhotoBuckets, PhotoBucketKind } from '../../../lib/aiPhotoBuckets';
import type { ChangeEvent, RefObject } from 'react';

type GuestPhotoCoupleAlbumsCardProps = {
  photoBuckets: CanonicalPhotoBuckets;
  uploadDisabled: boolean;
  bucketFileInputRef: RefObject<HTMLInputElement>;
  onBucketUploadClick: (bucket: PhotoBucketKind) => void;
  onBucketRemoveClick: (bucket: PhotoBucketKind, itemId: string) => void;
  onBucketFilesSelected: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function GuestPhotoCoupleAlbumsCard({
  photoBuckets,
  uploadDisabled,
  bucketFileInputRef,
  onBucketUploadClick,
  onBucketRemoveClick,
  onBucketFilesSelected,
}: GuestPhotoCoupleAlbumsCardProps) {
  return (
    <Card className="p-6 border border-border bg-surface">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-neutral-900">Couple photo albums</h2>
        <p className="mt-1 text-sm text-neutral-600">Create your own couple-photo albums here so uploads stay organized by the moments and photo types you actually care about.</p>
      </div>
      <PhotoBucketCards buckets={photoBuckets} uploadDisabled={uploadDisabled} onUploadClick={onBucketUploadClick} onRemoveClick={onBucketRemoveClick} />
      <input ref={bucketFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onBucketFilesSelected} />
    </Card>
  );
}
