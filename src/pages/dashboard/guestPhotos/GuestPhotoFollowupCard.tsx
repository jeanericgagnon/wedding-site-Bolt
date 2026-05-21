import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import type { GuestProspectOptinRow } from '../guestPhotoSharingUtils';

type FollowupQueueKind = 'recap' | 'future_event';

type GuestPhotoFollowupCardProps = {
  guestProspects: GuestProspectOptinRow[];
  queueingFollowups: FollowupQueueKind | null;
  onExportProspectsCsv: () => void;
  onQueueGuestFollowups: (kind: FollowupQueueKind) => void;
};

export function GuestPhotoFollowupCard({
  guestProspects,
  queueingFollowups,
  onExportProspectsCsv,
  onQueueGuestFollowups,
}: GuestPhotoFollowupCardProps) {
  return (
    <Card className="p-6 border border-neutral-200 bg-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Guest follow-up</h2>
          <p className="mt-1 text-sm text-neutral-600">Guests who asked for recap updates or want to hear about using dayof later.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-700">
            <span className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1">{guestProspects.length} captured</span>
            <span className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1">{guestProspects.filter((entry) => entry.wants_photo_updates).length} want recap updates</span>
            <span className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1">{guestProspects.filter((entry) => entry.wants_own_event_info).length} want their own event link</span>
            <span className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1">{guestProspects.filter((entry) => entry.recap_email_queued_at).length} recap prepared</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button size="sm" variant="outline" onClick={onExportProspectsCsv}>Export guests</Button>
          <Button size="sm" variant="outline" disabled={queueingFollowups !== null} onClick={() => onQueueGuestFollowups('recap')}>
            {queueingFollowups === 'recap' ? 'Preparing...' : 'Prepare recap emails'}
          </Button>
          <Button size="sm" variant="outline" disabled={queueingFollowups !== null} onClick={() => onQueueGuestFollowups('future_event')}>
            {queueingFollowups === 'future_event' ? 'Preparing...' : 'Prepare later-interest emails'}
          </Button>
        </div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {guestProspects.slice(0, 6).map((entry) => (
          <div key={entry.id} className="rounded-[20px] border border-border-subtle bg-surface-subtle px-4 py-3">
            <p className="text-sm font-medium text-neutral-900">{entry.guest_name || 'Guest'}</p>
            <p className="mt-1 text-xs text-neutral-600">{entry.email || entry.phone || 'Contact info not added'} · {entry.source}</p>
            <p className="mt-2 text-xs text-neutral-500">
              {entry.wants_photo_updates ? 'Recap updates' : 'No recap updates'}
              {entry.wants_own_event_info ? ' · Future event interest' : ''}
              {entry.recap_email_queued_at ? ' · Recap prepared' : ''}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
