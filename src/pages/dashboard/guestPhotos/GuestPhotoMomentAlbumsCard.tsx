import { FolderTree } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import type { PhotoBucketRow } from '../guestPhotoSharingUtils';

export type GuestPhotoMomentBucketSuggestion = {
  tag: string;
  label: string;
  eventId: string;
  eventName: string;
  parentBucket: PhotoBucketRow | null;
  count: number;
};

type GuestPhotoMomentAlbumsCardProps = {
  suggestions: GuestPhotoMomentBucketSuggestion[];
  submitting: boolean;
  onCreateMomentBucket: (suggestion: GuestPhotoMomentBucketSuggestion) => void;
};

export function GuestPhotoMomentAlbumsCard({
  suggestions,
  submitting,
  onCreateMomentBucket,
}: GuestPhotoMomentAlbumsCardProps) {
  return (
    <Card className="p-6 border border-border-subtle bg-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-text-primary">Moment albums from the schedule</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
            The schedule helps suggest natural groups like cocktail hour, aisle walk, first dance, toasts, and dance floor. When those moments appear in reviewed photos, you can turn them into real albums or sub-albums.
          </p>
        </div>
        <div className="text-xs text-text-secondary">
          <span className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-1">{suggestions.length} suggestions</span>
        </div>
      </div>
      {suggestions.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {suggestions.slice(0, 9).map((suggestion) => (
            <div key={`${suggestion.eventId}-${suggestion.tag}`} className="rounded-lg border border-border-subtle bg-surface-subtle p-4">
              <p className="text-sm font-semibold text-text-primary">{suggestion.label}</p>
              <p className="mt-1 text-xs text-text-secondary">
                {suggestion.parentBucket ? `${suggestion.parentBucket.name} / ${suggestion.label}` : suggestion.eventName}
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                {suggestion.count > 0 ? `${suggestion.count} reviewed photo${suggestion.count === 1 ? '' : 's'} tagged #${suggestion.tag}` : `Expected from ${suggestion.eventName}`}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                disabled={submitting}
                onClick={() => onCreateMomentBucket(suggestion)}
              >
                Create album
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-border-subtle bg-surface-subtle px-4 py-5 text-sm text-text-secondary">
          No new moment album suggestions right now. Add itinerary events or sort photos after uploads to unlock more.
        </div>
      )}
    </Card>
  );
}
