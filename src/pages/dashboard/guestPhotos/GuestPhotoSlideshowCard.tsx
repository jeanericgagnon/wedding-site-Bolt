import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import type { PhotoBucketRow, SlideshowFrame, SlideshowOrderMode, SlideshowTheme } from '../guestPhotoSharingUtils';

const slideshowThemeMeta: Record<SlideshowTheme, { label: string; cardClass: string; chipClass: string; helper: string }> = {
  classic: {
    label: 'Classic',
    cardClass: 'bg-white border-border-subtle',
    chipClass: 'bg-neutral-100 text-neutral-700',
    helper: 'Clean, neutral presentation focused on the photos.',
  },
  editorial: {
    label: 'Editorial',
    cardClass: 'bg-stone-50 border-stone-200',
    chipClass: 'bg-stone-200 text-stone-800',
    helper: 'Softer gallery feel with a more polished keepsake vibe.',
  },
  party: {
    label: 'Party',
    cardClass: 'bg-surface-subtle border-border-subtle',
    chipClass: 'bg-surface-subtle text-text-primary border border-border-subtle',
    helper: 'More energetic framing for reception and dance-floor moments.',
  },
};

type GuestPhotoSlideshowCardProps = {
  buckets: PhotoBucketRow[];
  countsByBucket: Map<string, number>;
  slideshowBucketFilter: string;
  slideshowOrder: SlideshowOrderMode;
  slideshowTheme: SlideshowTheme;
  slideshowFrames: SlideshowFrame[];
  slideshowReadyBucketCount: number;
  slideshowPreviewOpen: boolean;
  copyNotice: { key: string; mode: 'copied' | 'downloaded' } | null;
  onBucketFilterChange: (value: string) => void;
  onOrderChange: (value: SlideshowOrderMode) => void;
  onThemeChange: (value: SlideshowTheme) => void;
  onPreviewOpenChange: (open: boolean) => void;
  onExportSlideshowPlan: () => void;
  formatDateTime: (value: string | null | undefined) => string;
};

export function GuestPhotoSlideshowCard({
  buckets,
  countsByBucket,
  slideshowBucketFilter,
  slideshowOrder,
  slideshowTheme,
  slideshowFrames,
  slideshowReadyBucketCount,
  slideshowPreviewOpen,
  copyNotice,
  onBucketFilterChange,
  onOrderChange,
  onThemeChange,
  onPreviewOpenChange,
  onExportSlideshowPlan,
  formatDateTime,
}: GuestPhotoSlideshowCardProps) {
  const theme = slideshowThemeMeta[slideshowTheme];

  return (
    <>
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Slideshow draft</h2>
            <p className="mt-1 text-sm text-neutral-600">Turn uploaded guest photos into a simple sequence you can preview, adjust, and share.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={slideshowBucketFilter}
              onChange={(event) => onBucketFilterChange(event.target.value)}
              className="rounded-xl border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="all">All slideshow-ready albums</option>
              {buckets
                .filter((bucket) => bucket.is_active && (countsByBucket.get(bucket.id) ?? 0) >= 3)
                .map((bucket) => (
                  <option key={bucket.id} value={bucket.id}>{bucket.name}</option>
                ))}
            </select>
            <select
              value={slideshowOrder}
              onChange={(event) => onOrderChange(event.target.value as SlideshowOrderMode)}
              className="rounded-xl border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="capture">Capture time</option>
              <option value="highlights">Best highlights</option>
            </select>
            <select
              value={slideshowTheme}
              onChange={(event) => onThemeChange(event.target.value as SlideshowTheme)}
              className="rounded-xl border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="classic">Classic</option>
              <option value="editorial">Editorial</option>
              <option value="party">Party</option>
            </select>
            <Button variant="outline" onClick={() => onPreviewOpenChange(true)} disabled={slideshowFrames.length === 0}>
              Preview
            </Button>
            <Button variant="outline" onClick={onExportSlideshowPlan} disabled={slideshowFrames.length === 0}>
              {copyNotice?.key === 'slideshow-plan'
                ? copyNotice.mode === 'downloaded'
                  ? 'Downloaded slideshow notes'
                  : 'Copied slideshow notes'
                : 'Copy slideshow notes'}
            </Button>
          </div>
        </div>

        {slideshowFrames.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-neutral-300 bg-surface-subtle/20 px-4 py-6 text-sm text-neutral-600">
            Add at least three visible uploads to an active album to start a slideshow draft.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/20 px-4 py-3 text-sm text-neutral-700">
              Ready with <span className="font-semibold text-neutral-900">{slideshowFrames.length}</span> slides from <span className="font-semibold text-neutral-900">{slideshowBucketFilter === 'all' ? slideshowReadyBucketCount : 1}</span> album{slideshowBucketFilter === 'all' ? 's' : ''}.
            </div>
            <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/20 px-4 py-3 text-sm text-neutral-700">
              <span className={`inline-flex items-center rounded-xl px-2.5 py-1 text-xs font-medium ${theme.chipClass}`}>
                {theme.label}
              </span>
              <span className="ml-2">{theme.helper}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {slideshowFrames.map((frame, index) => (
                <div key={frame.uploadId} className={`rounded-[20px] border px-4 py-3 ${theme.cardClass}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-neutral-900">Frame {index + 1}</p>
                    <span className={`rounded-xl px-2 py-0.5 text-xs ${theme.chipClass}`}>{frame.bucketName}</span>
                  </div>
                  <p className="mt-2 text-sm text-neutral-800 truncate">{frame.title}</p>
                  <p className="mt-1 text-xs text-neutral-500">{frame.caption}</p>
                  {frame.takenAt && <p className="mt-1 text-xs text-neutral-400">Taken {formatDateTime(frame.takenAt)}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {slideshowPreviewOpen && slideshowFrames.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-h-[90vh] w-full max-w-4xl space-y-4 overflow-auto rounded-[20px] border border-border bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">Slideshow preview</h3>
                <p className="text-sm text-neutral-600">{theme.label} · {slideshowFrames.length} frames · {slideshowOrder}</p>
              </div>
              <Button variant="outline" onClick={() => onPreviewOpenChange(false)}>Close</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {slideshowFrames.map((frame, index) => (
                <div key={frame.uploadId} className={`rounded-[20px] border px-4 py-4 ${theme.cardClass}`}>
                  <p className="text-xs text-neutral-500">Slide {index + 1}</p>
                  <p className="mt-2 text-base font-semibold text-neutral-900 truncate">{frame.title}</p>
                  <p className="mt-1 text-sm text-neutral-700">{frame.bucketName}</p>
                  <p className="mt-2 text-xs text-neutral-500">{frame.caption}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
