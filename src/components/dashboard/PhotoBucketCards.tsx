import React from 'react';
import { ImagePlus } from 'lucide-react';
import { CanonicalPhotoBuckets, PhotoBucketKind } from '../../lib/aiPhotoBuckets';
import { buildPhotoBucketStatusMap } from '../../lib/memoryCurator';

const BUCKETS: Array<{ key: PhotoBucketKind; title: string; description: string; placementHint: string }> = [
  { key: 'main-couple', title: 'Main photo of you two', description: 'One favorite photo. We use this for the hero by default.', placementHint: 'Usually lands in the hero first.' },
  { key: 'couple-gallery', title: 'A few more of you two', description: 'More couple photos for story and gallery placement.', placementHint: 'Usually feeds the story section and top gallery slots.' },
  { key: 'weekend-vibe', title: 'Weekend / destination photos', description: 'Hotel, beach, town, views, and weekend atmosphere.', placementHint: 'Usually feeds travel sections and supporting gallery images.' },
  { key: 'friends-family', title: 'Friends, family, candid', description: 'Supportive gallery photos and candid moments.', placementHint: 'Usually fills the broader gallery.' },
  { key: 'extras', title: 'Extras', description: 'Anything else. Saved with lower placement priority.', placementHint: 'Used last when we need more gallery coverage.' },
];

type Props = {
  buckets: CanonicalPhotoBuckets;
  onUploadClick?: (bucket: PhotoBucketKind) => void;
  onRemoveClick?: (bucket: PhotoBucketKind, itemId: string) => void;
};

export const PhotoBucketCards: React.FC<Props> = ({ buckets, onUploadClick, onRemoveClick }) => {
  const bucketStatusMap = buildPhotoBucketStatusMap(buckets);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {BUCKETS.map((bucket) => {
        const items = buckets[bucket.key] ?? [];
        const status = bucketStatusMap[bucket.key];
        const chipClass = status.tone === 'ready'
          ? 'bg-emerald-50 text-emerald-700'
          : status.tone === 'growing'
            ? 'bg-amber-50 text-amber-700'
            : 'bg-neutral-100 text-neutral-600';
        return (
          <div key={bucket.key} className="rounded-3xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-text-primary">{bucket.title}</h3>
                <p className="mt-1 text-sm text-text-secondary">{bucket.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${chipClass}`}>{status.label}</span>
                  <p className="text-xs text-text-tertiary">{status.detail}</p>
                </div>
                <p className="mt-2 text-xs text-text-tertiary">{bucket.placementHint}</p>
              </div>
              <span className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-medium text-primary">{items.length}</span>
            </div>
            <div className="mt-4 flex min-h-[72px] flex-wrap gap-2 rounded-2xl bg-muted/40 p-2">
              {items.length > 0 ? items.slice(0, 4).map((item) => (
                <div key={item.id} className="group relative">
                  <img src={item.url} alt={item.label ?? bucket.title} className="h-16 w-16 rounded-xl object-cover" />
                  {onRemoveClick && (
                    <button
                      type="button"
                      onClick={() => onRemoveClick(bucket.key, item.id)}
                      className="absolute -right-1 -top-1 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-primary shadow opacity-0 transition group-hover:opacity-100"
                      aria-label={`Remove ${item.label ?? bucket.title}`}
                    >
                      Remove
                    </button>
                  )}
                </div>
              )) : (
                <div className="flex h-16 w-full items-center justify-center rounded-xl border border-dashed border-border text-xs text-text-tertiary">
                  No uploads yet
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onUploadClick?.(bucket.key)}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm font-medium text-text-primary hover:bg-muted/50"
            >
              <ImagePlus className="h-4 w-4" />
              Upload to this bucket
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default PhotoBucketCards;
