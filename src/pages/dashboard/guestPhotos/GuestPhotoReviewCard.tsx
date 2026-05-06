import { Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { analysisDisplayStatus, type PhotoHighlightEntry, type PhotoMemoryChapter, type PhotoMemoryChapterEntry, type SimilarPhotoGroup } from '../guestPhotoSharingUtils';
import { safePhotoAnalysisText } from '../../../lib/photoAnalysisCustomerCopy';
import { formatGuestPhotoDate } from '../guestPhotoUploadTime';

type RecapModerationPatch = {
  recap_featured?: boolean;
  recap_story?: boolean;
  recap_hidden?: boolean;
};

type GuestPhotoReviewCardProps = {
  highlightUploads: PhotoHighlightEntry[];
  chronologicalUploads: PhotoMemoryChapterEntry[];
  similarPhotoGroups: SimilarPhotoGroup[];
  reviewUploads: PhotoHighlightEntry[];
  memoryChapters: PhotoMemoryChapter[];
  hiddenUploadCount: number;
  flaggedUploadCount: number;
  recapFeaturedCount: number;
  recapStoryCount: number;
  recapHiddenCount: number;
  uploadCount: number;
  bulkModerating: boolean;
  duplicateExtraCount: number;
  onUseHighlightsInSlideshow: () => void;
  onUseSavedPhotoTimes: () => void;
  onExportCurationCsv: () => void;
  onExportMemoryChapters: () => void;
  onExportCuratedRecap: () => void;
  onHideReviewUploads: () => void;
  onHideDuplicateExtras: () => void;
  onRestoreHiddenUploads: () => void;
  onModerateUpload: (uploadId: string, patch: RecapModerationPatch) => void;
  formatDateTime: (value: string | null | undefined) => string;
};

export function GuestPhotoReviewCard({
  highlightUploads,
  chronologicalUploads,
  similarPhotoGroups,
  reviewUploads,
  memoryChapters,
  hiddenUploadCount,
  flaggedUploadCount,
  recapFeaturedCount,
  recapStoryCount,
  recapHiddenCount,
  uploadCount,
  bulkModerating,
  duplicateExtraCount,
  onUseHighlightsInSlideshow,
  onUseSavedPhotoTimes,
  onExportCurationCsv,
  onExportMemoryChapters,
  onExportCuratedRecap,
  onHideReviewUploads,
  onHideDuplicateExtras,
  onRestoreHiddenUploads,
  onModerateUpload,
  formatDateTime,
}: GuestPhotoReviewCardProps) {
  return (
    <Card className="p-6 border border-border-subtle bg-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-text-primary">Photo review</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
            Uses saved time details and previous review work to surface highlights, the day in order, possible duplicates, and photos worth checking.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary sm:grid-cols-4">
          <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{highlightUploads.length} highlights</span>
          <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{chronologicalUploads.length} with times</span>
          <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{similarPhotoGroups.length} similar sets</span>
          <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{reviewUploads.length} to check</span>
          <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{hiddenUploadCount} hidden</span>
          <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{flaggedUploadCount} flagged</span>
          <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{recapFeaturedCount} featured</span>
          <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{recapStoryCount} in recap story</span>
          <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{recapHiddenCount} recap hidden</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onUseHighlightsInSlideshow} disabled={highlightUploads.length === 0}>
          Use highlights in slideshow
        </Button>
        <Button size="sm" variant="outline" onClick={onUseSavedPhotoTimes} disabled={chronologicalUploads.length === 0}>
          Use saved photo times
        </Button>
        <Button size="sm" variant="outline" onClick={onExportCurationCsv} disabled={uploadCount === 0}>
          Export review sheet
        </Button>
        <Button size="sm" variant="outline" onClick={onExportMemoryChapters} disabled={memoryChapters.length === 0}>
          Copy chapter notes
        </Button>
        <Button size="sm" variant="outline" onClick={onExportCuratedRecap} disabled={uploadCount === 0}>
          Copy recap notes
        </Button>
        <Button size="sm" variant="outline" onClick={onHideReviewUploads} disabled={bulkModerating || reviewUploads.length === 0}>
          Hide review items
        </Button>
        <Button size="sm" variant="outline" onClick={onHideDuplicateExtras} disabled={bulkModerating || duplicateExtraCount === 0}>
          Tuck away similar extras
        </Button>
        <Button size="sm" variant="outline" onClick={onRestoreHiddenUploads} disabled={bulkModerating || hiddenUploadCount === 0}>
          Restore hidden
        </Button>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-border-subtle bg-surface-subtle px-4 py-4">
          <p className="text-sm font-semibold text-text-primary">Highlights</p>
          <div className="mt-3 space-y-2">
            {highlightUploads.slice(0, 3).map(({ upload, analysis }) => (
              <div key={upload.id} className="rounded-lg bg-neutral-50 px-3 py-2">
                <p className="truncate text-sm font-medium text-neutral-900">{safePhotoAnalysisText(analysis?.caption, upload.original_filename)}</p>
                <p className="mt-1 text-xs text-neutral-500">{safePhotoAnalysisText(analysis?.suggested_bucket_name, 'Reviewed')} · {analysis ? Math.round(analysis.slideshow_priority) : 0}/100</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" onClick={() => onModerateUpload(upload.id, { recap_featured: !upload.recap_featured })}>
                    {upload.recap_featured ? 'Unfeature' : 'Feature'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onModerateUpload(upload.id, { recap_story: !upload.recap_story })}>
                    {upload.recap_story ? 'Remove from story' : 'Add to story'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onModerateUpload(upload.id, { recap_hidden: !upload.recap_hidden })}>
                    {upload.recap_hidden ? 'Show recap' : 'Hide recap'}
                  </Button>
                </div>
              </div>
            ))}
            {highlightUploads.length === 0 && <p className="text-xs text-neutral-500">Review a few photos to fill this.</p>}
          </div>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-subtle px-4 py-4">
          <p className="text-sm font-semibold text-text-primary">Timeline</p>
          <div className="mt-3 space-y-2">
            {chronologicalUploads.slice(0, 3).map(({ upload, metadata }) => (
              <div key={upload.id} className="rounded-lg bg-neutral-50 px-3 py-2">
                <p className="truncate text-sm font-medium text-neutral-900">{upload.original_filename}</p>
                <p className="mt-1 text-xs text-neutral-500">{metadata?.taken_at ? formatDateTime(metadata.taken_at) : 'Time not available'}</p>
              </div>
            ))}
            {chronologicalUploads.length === 0 && <p className="text-xs text-neutral-500">Capture times appear when photos include saved time details.</p>}
          </div>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-subtle px-4 py-4">
          <p className="text-sm font-semibold text-text-primary">Similar sets</p>
          <div className="mt-3 space-y-2">
            {similarPhotoGroups.slice(0, 3).map((group) => (
              <div key={group.key} className="rounded-lg bg-neutral-50 px-3 py-2">
                <p className="text-sm font-medium text-neutral-900">{group.entries.length} matching uploads · keep 1</p>
                <p className="mt-1 truncate text-xs text-neutral-500">{group.entries.map((entry) => entry.upload.original_filename).join(', ')}</p>
              </div>
            ))}
            {similarPhotoGroups.length === 0 && <p className="text-xs text-neutral-500">No exact or similar matches yet.</p>}
            {duplicateExtraCount > 0 && <p className="text-xs text-primary">{duplicateExtraCount} similar photo{duplicateExtraCount === 1 ? '' : 's'} can be tucked away.</p>}
          </div>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-subtle px-4 py-4">
          <p className="text-sm font-semibold text-text-primary">Worth checking</p>
          <div className="mt-3 space-y-2">
            {reviewUploads.slice(0, 3).map(({ upload, analysis }) => (
              <div key={upload.id} className="rounded-lg bg-neutral-50 px-3 py-2">
                <p className="truncate text-sm font-medium text-neutral-900">{upload.original_filename}</p>
                <p className="mt-1 text-xs text-neutral-500">{analysisDisplayStatus(analysis)}{analysis?.bucket_confidence ? ` · ${Math.round(analysis.bucket_confidence * 100)}%` : ''}</p>
              </div>
            ))}
            {reviewUploads.length === 0 && <p className="text-xs text-neutral-500">Everything visible looks clean.</p>}
          </div>
        </div>
      </div>
      {memoryChapters.length > 0 && (
        <div className="mt-5 rounded-lg border border-border-subtle bg-surface-subtle px-4 py-4">
          <p className="text-sm font-semibold text-text-primary">Memory chapters</p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {memoryChapters.map((chapter) => (
              <div key={chapter.date} className="rounded-lg bg-neutral-50 px-3 py-2">
                <p className="text-sm font-medium text-neutral-900">{formatGuestPhotoDate(chapter.date)}</p>
                <p className="mt-1 text-xs text-neutral-500">{chapter.entries.length} timed upload{chapter.entries.length === 1 ? '' : 's'} · {chapter.highlights} highlight{chapter.highlights === 1 ? '' : 's'}</p>
                {chapter.bucketNames.length > 0 && <p className="mt-1 truncate text-xs text-neutral-500">{chapter.bucketNames.join(' · ')}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
