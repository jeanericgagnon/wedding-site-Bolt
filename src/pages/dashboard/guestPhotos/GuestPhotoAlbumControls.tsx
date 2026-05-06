import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

type GuestPhotoAlbumControlsProps = {
  visibleAlbumCount: number;
  totalUploadCount: number;
  copied: string;
  bulkRegenerating: boolean;
  bulkModerating: boolean;
  showFlaggedOnly: boolean;
  showHidden: boolean;
  tagFilter: string;
  availableAiTags: Array<[string, number]>;
  bucketSearch: string;
  statusFilter: 'all' | 'active' | 'paused';
  onCopyAllKnownLinks: () => void;
  onCopyAllShareMessages: () => void;
  onSendAllActiveBucketRequests: () => void;
  onRegenerateAllKnownBucketLinks: () => void;
  onExportBucketLinksCsv: () => void;
  onExportSharePackCsv: () => void;
  onExportMediaManifestCsv: () => void;
  onShowFlaggedOnlyChange: (next: boolean) => void;
  onTagFilterChange: (value: string) => void;
  onShowHiddenChange: (next: boolean) => void;
  onSetUploadsFlaggedByFilter: (isFlagged: boolean) => void;
  onSetUploadsHiddenByFilter: (isHidden: boolean) => void;
  onBucketSearchChange: (value: string) => void;
  onStatusFilterChange: (value: 'all' | 'active' | 'paused') => void;
};

export function GuestPhotoAlbumControls({
  visibleAlbumCount,
  totalUploadCount,
  copied,
  bulkRegenerating,
  bulkModerating,
  showFlaggedOnly,
  showHidden,
  tagFilter,
  availableAiTags,
  bucketSearch,
  statusFilter,
  onCopyAllKnownLinks,
  onCopyAllShareMessages,
  onSendAllActiveBucketRequests,
  onRegenerateAllKnownBucketLinks,
  onExportBucketLinksCsv,
  onExportSharePackCsv,
  onExportMediaManifestCsv,
  onShowFlaggedOnlyChange,
  onTagFilterChange,
  onShowHiddenChange,
  onSetUploadsFlaggedByFilter,
  onSetUploadsHiddenByFilter,
  onBucketSearchChange,
  onStatusFilterChange,
}: GuestPhotoAlbumControlsProps) {
  return (
    <>
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-neutral-900">Albums</h2>
          <div className="text-xs text-neutral-500">{visibleAlbumCount} visible</div>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-lg border border-border-subtle bg-surface-subtle p-4">
            <p className="text-xs font-semibold text-text-tertiary">Sharing home</p>
            <p className="mt-2 text-sm text-neutral-700">Copy links, QR codes, and guest-facing prompts without digging through menus.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={onCopyAllKnownLinks}>
                {copied === 'all-links' ? 'Copied all links' : 'Copy all album links'}
              </Button>
              <Button size="sm" variant="outline" onClick={onCopyAllShareMessages}>
                {copied === 'all-share-messages' ? 'Copied prompts' : 'Copy all share prompts'}
              </Button>
              <Button size="sm" variant="outline" onClick={onSendAllActiveBucketRequests}>
                Send all active album requests
              </Button>
              <Button size="sm" variant="outline" onClick={onRegenerateAllKnownBucketLinks} disabled={bulkRegenerating}>
                {bulkRegenerating ? 'Refreshing links...' : 'Refresh all links'}
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-border-subtle bg-white p-4">
            <p className="text-xs font-medium text-text-tertiary">Owner controls</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={onExportBucketLinksCsv}>Save album link sheet</Button>
              <Button size="sm" variant="outline" onClick={onExportSharePackCsv}>Save sharing notes</Button>
              <Button size="sm" variant="outline" onClick={onExportMediaManifestCsv} disabled={totalUploadCount === 0}>Save photo handoff sheet</Button>
              <Button size="sm" variant="outline" onClick={() => onShowFlaggedOnlyChange(!showFlaggedOnly)}>
                {showFlaggedOnly ? 'Show all uploads' : 'Show flagged only'}
              </Button>
              <select
                value={tagFilter}
                onChange={(event) => onTagFilterChange(event.target.value)}
                className="h-9 rounded-lg border border-neutral-300 bg-white px-3 text-xs text-neutral-700"
              >
                <option value="all">All tags</option>
                {availableAiTags.map(([tag, count]) => (
                  <option key={tag} value={tag}>
                    {tag} ({count})
                  </option>
                ))}
              </select>
              <Button size="sm" variant="outline" onClick={() => onShowHiddenChange(!showHidden)}>
                {showHidden ? 'Hide hidden items' : 'Show hidden items'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onSetUploadsFlaggedByFilter(true)} disabled={bulkModerating}>Flag visible</Button>
              <Button size="sm" variant="outline" onClick={() => onSetUploadsFlaggedByFilter(false)} disabled={bulkModerating}>Unflag visible</Button>
              <Button size="sm" variant="outline" onClick={() => onSetUploadsHiddenByFilter(true)} disabled={bulkModerating}>Hide visible</Button>
              <Button size="sm" variant="outline" onClick={() => onSetUploadsHiddenByFilter(false)} disabled={bulkModerating}>Unhide visible</Button>
            </div>
          </div>
        </div>
      </div>
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-2">
        <Input
          value={bucketSearch ?? ''}
          onChange={(event) => onBucketSearchChange(event.target.value)}
          placeholder="Search album name"
        />
        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value as 'all' | 'active' | 'paused')}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="paused">Paused only</option>
        </select>
        <div className="text-xs text-neutral-500 flex items-center">{visibleAlbumCount} album{visibleAlbumCount === 1 ? '' : 's'}</div>
      </div>
    </>
  );
}
