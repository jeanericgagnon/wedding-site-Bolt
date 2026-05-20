import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import type { GuestbookEntryRow } from '../guestPhotoSharingUtils';

type GuestPhotoGuestbookCardProps = {
  guestbookEntries: GuestbookEntryRow[];
  moderatingGuestbookId: string | null;
  onExportGuestbookCsv: () => void;
  onUpdateGuestbookEntry: (entryId: string, patch: Partial<Pick<GuestbookEntryRow, 'is_flagged' | 'is_hidden'>>) => void;
  formatDateTime: (value: string | null | undefined) => string;
};

export function GuestPhotoGuestbookCard({
  guestbookEntries,
  moderatingGuestbookId,
  onExportGuestbookCsv,
  onUpdateGuestbookEntry,
  formatDateTime,
}: GuestPhotoGuestbookCardProps) {
  return (
    <Card className="p-6 border border-neutral-200 bg-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Guestbook notes</h2>
          <p className="mt-1 text-sm text-neutral-600">Written messages submitted from the one-QR hub.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onExportGuestbookCsv}>Export notes</Button>
          <span className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700">{guestbookEntries.length} recent</span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {guestbookEntries.slice(0, 6).map((entry) => (
          <div key={entry.id} className={`rounded-2xl border p-4 ${entry.is_hidden ? 'border-border-subtle bg-surface-subtle opacity-75' : entry.is_flagged ? 'border-border-subtle bg-surface' : 'border-border-subtle bg-surface-subtle'}`}>
            <p className="text-sm leading-6 text-neutral-800">{entry.message}</p>
            <p className="mt-3 text-xs text-neutral-500">
              {entry.guest_name || 'Guest'}{entry.guest_email ? ` · ${entry.guest_email}` : ''} · {formatDateTime(entry.created_at)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={moderatingGuestbookId === entry.id} onClick={() => onUpdateGuestbookEntry(entry.id, { is_flagged: !entry.is_flagged })}>
                {entry.is_flagged ? 'Unflag' : 'Flag'}
              </Button>
              <Button size="sm" variant="outline" disabled={moderatingGuestbookId === entry.id} onClick={() => onUpdateGuestbookEntry(entry.id, { is_hidden: !entry.is_hidden })}>
                {entry.is_hidden ? 'Unhide' : 'Hide'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
