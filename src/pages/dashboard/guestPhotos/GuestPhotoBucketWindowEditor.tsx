import { CalendarClock } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import type { PhotoBucketRow } from '../guestPhotoSharingUtils';

type WindowDraft = {
  opensAt: string;
  closesAt: string;
};

type GuestPhotoBucketWindowEditorProps = {
  bucket: PhotoBucketRow;
  buckets: PhotoBucketRow[];
  descendantBucketIds: string[];
  draft: WindowDraft;
  workingBucketId: string;
  onParentChange: (bucketId: string, parentBucketId: string) => void;
  onDraftChange: (bucketId: string, draft: WindowDraft) => void;
  onApplySuggestedWindow: (bucketId: string) => void;
  onSaveWindow: (bucketId: string) => void;
  bucketDisplayName: (bucket: PhotoBucketRow | undefined | null) => string;
};

export function GuestPhotoBucketWindowEditor({
  bucket,
  buckets,
  descendantBucketIds,
  draft,
  workingBucketId,
  onParentChange,
  onDraftChange,
  onApplySuggestedWindow,
  onSaveWindow,
  bucketDisplayName,
}: GuestPhotoBucketWindowEditorProps) {
  const isWorking = workingBucketId === bucket.id;

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-subtle p-3">
      <div className="mb-3">
        <label className="block text-xs text-neutral-500 mb-1">Parent album</label>
        <select
          value={bucket.parent_album_id ?? ''}
          onChange={(event) => onParentChange(bucket.id, event.target.value)}
          disabled={isWorking}
          className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Top-level album</option>
          {buckets
            .filter((candidate) => candidate.id !== bucket.id && !descendantBucketIds.includes(candidate.id))
            .sort((a, b) => bucketDisplayName(a).localeCompare(bucketDisplayName(b)))
            .map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {bucketDisplayName(candidate)}
              </option>
            ))}
        </select>
      </div>

      <div className="flex items-center gap-2 mb-2 text-xs font-medium text-neutral-700">
        <CalendarClock className="w-3.5 h-3.5" /> Collect between
      </div>
      <p className="mb-3 text-xs text-neutral-500">Optional. Use this when you want uploads to open and close around a specific event.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Opens</label>
          <Input
            type="datetime-local"
            value={draft.opensAt ?? ''}
            onChange={(event) => onDraftChange(bucket.id, { ...draft, opensAt: event.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Closes</label>
          <Input
            type="datetime-local"
            value={draft.closesAt ?? ''}
            onChange={(event) => onDraftChange(bucket.id, { ...draft, closesAt: event.target.value })}
          />
        </div>
        <Button size="sm" variant="outline" disabled={isWorking} onClick={() => onApplySuggestedWindow(bucket.id)}>
          Suggested window
        </Button>
        <Button size="sm" variant="outline" disabled={isWorking} onClick={() => onSaveWindow(bucket.id)}>
          {isWorking ? 'Saving...' : 'Save window'}
        </Button>
      </div>
    </div>
  );
}
