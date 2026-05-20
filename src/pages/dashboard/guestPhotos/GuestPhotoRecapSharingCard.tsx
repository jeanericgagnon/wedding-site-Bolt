import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import type { GuestHubSettings } from '../guestPhotoSharingUtils';

type GuestPhotoRecapSharingCardProps = {
  guestRecapUrl: string;
  isPublished: boolean;
  hubSettings: GuestHubSettings;
  savingHubSettings: boolean;
  uploadCount: number;
  recapFeaturedCount: number;
  recapStoryCount: number;
  recapHiddenCount: number;
  recapPublishWarnings: string[];
  onOpenAppUrl: (url: string) => void;
  onSaveHubSettings: () => void;
  onHubSettingsChange: (settings: GuestHubSettings) => void;
};

const recapStatusLabel = (status: GuestHubSettings['recap_status']) =>
  status === 'private_link' ? 'Private link' : status.charAt(0).toUpperCase() + status.slice(1);

export function GuestPhotoRecapSharingCard({
  guestRecapUrl,
  isPublished,
  hubSettings,
  savingHubSettings,
  uploadCount,
  recapFeaturedCount,
  recapStoryCount,
  recapHiddenCount,
  recapPublishWarnings,
  onOpenAppUrl,
  onSaveHubSettings,
  onHubSettingsChange,
}: GuestPhotoRecapSharingCardProps) {
  const previewDisabled =
    !guestRecapUrl || !isPublished || hubSettings.recap_status === 'draft' || hubSettings.recap_status === 'closed';

  return (
    <Card className="p-6 border border-border-subtle bg-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-text-tertiary">Recap sharing</p>
          <h2 className="mt-2 text-xl font-semibold text-text-primary">Control when the photo recap is guest-facing.</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
            Keep the recap in draft while curating, use private link for a quiet review, publish when it is ready, or close it after the event.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button variant="outline" onClick={() => onOpenAppUrl(guestRecapUrl)} disabled={previewDisabled}>
            Preview recap
          </Button>
          <Button variant="accent" onClick={onSaveHubSettings} disabled={savingHubSettings}>
            {savingHubSettings ? 'Saving...' : 'Save status'}
          </Button>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-[220px_1fr]">
        <select
          value={hubSettings.recap_status}
          onChange={(e) => onHubSettingsChange({
            ...hubSettings,
            recap_status: e.target.value as GuestHubSettings['recap_status'],
            recap_published_at: e.target.value === 'published' ? (hubSettings.recap_published_at ?? new Date().toISOString()) : hubSettings.recap_published_at,
            recap_closed_at: e.target.value === 'closed' ? new Date().toISOString() : null,
          })}
          className="h-11 rounded-xl border border-border-subtle bg-white px-3 text-sm text-text-primary"
        >
          <option value="draft">Draft</option>
          <option value="private_link">Private link</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
        </select>
        <div className="grid gap-2 sm:grid-cols-4">
          <span className="rounded-xl border border-border-subtle bg-surface-subtle px-4 py-3 text-sm text-text-primary">{uploadCount} uploads</span>
          <span className="rounded-xl border border-border-subtle bg-surface-subtle px-4 py-3 text-sm text-text-primary">{recapFeaturedCount} featured</span>
          <span className="rounded-xl border border-border-subtle bg-surface-subtle px-4 py-3 text-sm text-text-primary">{recapStoryCount} story picks</span>
          <span className="rounded-xl border border-border-subtle bg-surface-subtle px-4 py-3 text-sm text-text-primary">{recapHiddenCount} recap hidden</span>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-border-subtle bg-surface-subtle p-4">
        <p className="text-sm font-semibold text-text-primary">Current mode: {recapStatusLabel(hubSettings.recap_status)}</p>
        <p className="mt-1 text-sm text-text-secondary">
          {!isPublished && 'Publish the site before opening or sharing the guest recap. '}
          {hubSettings.recap_status === 'draft' && 'Guests cannot view the recap yet. Use this while curating.'}
          {hubSettings.recap_status === 'private_link' && 'Anyone with the recap link can view it, but it is treated as quietly shared.'}
          {hubSettings.recap_status === 'published' && 'The recap is live for guests.'}
          {hubSettings.recap_status === 'closed' && 'The recap is intentionally unavailable.'}
        </p>
        {recapPublishWarnings.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-text-secondary">
            {recapPublishWarnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        )}
      </div>
    </Card>
  );
}
