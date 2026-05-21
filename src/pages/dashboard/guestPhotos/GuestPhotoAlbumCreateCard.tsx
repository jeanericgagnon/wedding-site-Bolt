import { Camera, Copy, ExternalLink, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { ShareQrPanel } from '../../../components/ui/ShareQrPanel';
import type { ItineraryEvent, PhotoBucketRow } from '../guestPhotoSharingUtils';

type GuestPhotoAlbumCreateCardProps = {
  name: string;
  parentAlbumId: string;
  itineraryEventId: string;
  buckets: PhotoBucketRow[];
  events: ItineraryEvent[];
  submitting: boolean;
  loading: boolean;
  latestUploadUrl: string;
  copyNotice: { key: string; mode: 'copied' | 'downloaded' } | null;
  missingItineraryEventCount: number;
  bulkCreating: boolean;
  error: string | null;
  success: string | null;
  copyFallbackValue: string;
  onNameChange: (value: string) => void;
  onParentAlbumChange: (value: string) => void;
  onItineraryEventChange: (value: string) => void;
  onCreateBucket: () => void;
  onCreateMissingBuckets: () => void;
  onCopyText: (value: string, key: string) => void;
  onOpenSafePublicUrl: (url: string) => void;
  onOpenAppUrl: (url: string) => void;
  getBucketQrUrl: (url: string) => string;
  bucketDisplayName: (bucket: PhotoBucketRow | undefined | null) => string;
  formatEventDate: (value: string | null | undefined) => string;
};

export function GuestPhotoAlbumCreateCard({
  name,
  parentAlbumId,
  itineraryEventId,
  buckets,
  events,
  submitting,
  loading,
  latestUploadUrl,
  copyNotice,
  missingItineraryEventCount,
  bulkCreating,
  error,
  success,
  copyFallbackValue,
  onNameChange,
  onParentAlbumChange,
  onItineraryEventChange,
  onCreateBucket,
  onCreateMissingBuckets,
  onCopyText,
  onOpenSafePublicUrl,
  onOpenAppUrl,
  getBucketQrUrl,
  bucketDisplayName,
  formatEventDate,
}: GuestPhotoAlbumCreateCardProps) {
  return (
    <Card className="overflow-hidden border border-border-subtle bg-white">
      <div className="border-b border-neutral-100 bg-neutral-50/80 px-6 py-5">
        <div className="flex items-center gap-2 mb-2">
          <Plus className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-neutral-900">Album links</h2>
        </div>
        <p className="text-sm text-neutral-600">Create albums for the moments you want people to upload into. Think welcome party, dance floor, disposables, table shots, brunch, or anything else worth collecting.</p>
      </div>
      <div className="p-6 space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Ceremony', hint: 'The core moment' },
            { label: 'Walking down aisle', hint: 'A smaller ceremony album' },
            { label: 'Reception', hint: 'Dinner and the party' },
            { label: 'Dance floor', hint: 'The fun stuff' },
          ].map((template) => (
            <button
              key={template.label}
              type="button"
              onClick={() => onNameChange(template.label)}
              className="rounded-[20px] border border-border-subtle bg-surface-subtle px-4 py-4 text-left transition hover:border-neutral-300 hover:bg-white"
            >
              <p className="text-sm font-medium text-neutral-900">{template.label}</p>
              <p className="mt-1 text-xs text-neutral-500">{template.hint}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Album name</label>
            <Input value={name ?? ''} onChange={(event) => onNameChange(event.target.value)} placeholder="Ceremony" />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Parent album (optional)</label>
            <select
              value={parentAlbumId}
              onChange={(event) => onParentAlbumChange(event.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="">Top-level album</option>
              {buckets
                .sort((a, b) => bucketDisplayName(a).localeCompare(bucketDisplayName(b)))
                .map((bucket) => (
                  <option key={bucket.id} value={bucket.id}>
                    {bucketDisplayName(bucket)}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-xs text-neutral-500">Use this for Ceremony / Walking down aisle, Reception / Dance floor, and other moment groups.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Link to itinerary event (optional)</label>
            <select
              value={itineraryEventId}
              onChange={(event) => onItineraryEventChange(event.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="">None</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.event_name} ({formatEventDate(event.event_date)})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Button onClick={onCreateBucket} disabled={submitting || loading} className="w-full sm:w-auto">
              <Camera className="w-4 h-4 mr-1" />
              {submitting ? 'Creating...' : 'Add album'}
            </Button>
            {latestUploadUrl && (
              <Button variant="outline" onClick={() => onCopyText(latestUploadUrl, 'sheet-dashboard-link')} className="w-full sm:w-auto">
                <Copy className="w-4 h-4 mr-1" />
                {copyNotice?.key === 'sheet-dashboard-link'
                  ? copyNotice.mode === 'downloaded'
                    ? 'Downloaded newest album link'
                    : 'Copied newest album link'
                  : 'Copy newest album link'}
              </Button>
            )}
            {latestUploadUrl && (
              <Button variant="outline" onClick={() => onOpenSafePublicUrl(getBucketQrUrl(latestUploadUrl))} className="w-full sm:w-auto">
                QR for newest album
              </Button>
            )}
            {latestUploadUrl && (
              <Button variant="outline" onClick={() => onOpenAppUrl(latestUploadUrl)} className="w-full sm:w-auto">
                <ExternalLink className="w-4 h-4 mr-1" /> Open newest album link
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface-subtle/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-text-secondary">
              Missing event albums: <span className="font-semibold text-text-primary">{missingItineraryEventCount}</span>
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={onCreateMissingBuckets}
              disabled={bulkCreating || loading || missingItineraryEventCount === 0}
              className="w-full sm:w-auto"
            >
              {bulkCreating ? 'Creating event albums...' : 'Create missing event albums'}
            </Button>
          </div>
        </div>

        {error && <p className="mt-3 rounded-xl border border-border-subtle bg-surface-secondary px-3 py-2 text-sm text-text-secondary">{error}</p>}
        {success && <p className="mt-3 rounded-xl border border-border-subtle bg-surface-secondary px-3 py-2 text-sm text-text-secondary">{success}</p>}
        {copyFallbackValue && (
          <textarea
            className="mt-3 min-h-24 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-text-primary"
            readOnly
            value={copyFallbackValue ?? ''}
            onFocus={(event) => event.currentTarget.select()}
            aria-label="Copy text"
          />
        )}

        {latestUploadUrl && (
          <div className="grid gap-3 lg:grid-cols-[1.35fr_0.9fr]">
            <div className="rounded-[20px] border border-border-subtle bg-surface-subtle p-4">
              <p className="text-sm font-medium text-text-primary mb-1">Newest album link</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-text-secondary break-all">{latestUploadUrl}</code>
                <Button size="sm" variant="outline" onClick={() => onCopyText(latestUploadUrl, 'latest')}>
                  <Copy className="w-3 h-3 mr-1" />
                  {copyNotice?.key === 'latest'
                    ? copyNotice.mode === 'downloaded'
                      ? 'Downloaded latest link'
                      : 'Copied latest link'
                    : 'Copy latest link'}
                </Button>
              </div>
            </div>
            <div className="rounded-[20px] border border-border-subtle bg-surface-subtle p-4">
              <p className="text-xs font-semibold text-text-tertiary">Newest album link</p>
              <p className="mt-2 text-sm text-neutral-700">Use a real album upload link here. Guests should land in the right place immediately.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => onOpenAppUrl(latestUploadUrl)}>Open newest album link</Button>
                <Button size="sm" variant="outline" onClick={() => onOpenSafePublicUrl(getBucketQrUrl(latestUploadUrl))}>Open QR</Button>
              </div>
              <ShareQrPanel
                title="Newest album QR"
                description="Use this on table cards or signage for the latest upload album."
                url={latestUploadUrl}
                copyLabel="Copy upload link"
                className="mt-4"
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
