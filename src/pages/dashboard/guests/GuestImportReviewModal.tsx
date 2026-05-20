import { X } from 'lucide-react';
import { Button } from '../../../components/ui';

type CsvMappingSummary = {
  core: string[];
  rsvp: string[];
  household: string[];
  eventCols: string[];
  weak: string[];
};

type GuestImportReviewModalProps = {
  csvDuplicateNames: string[];
  csvHouseholdWarnings: string[];
  csvImporting: boolean;
  csvMappingSummary: CsvMappingSummary;
  csvPreview: Record<string, unknown>[];
  csvSkipped: string[];
  csvUnknownEvents: string[];
  onClose: () => void;
  onConfirmImport: () => void;
  onResetWarnings: () => void;
};

export function GuestImportReviewModal({
  csvDuplicateNames,
  csvHouseholdWarnings,
  csvImporting,
  csvMappingSummary,
  csvPreview,
  csvSkipped,
  csvUnknownEvents,
  onClose,
  onConfirmImport,
  onResetWarnings,
}: GuestImportReviewModalProps) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={() => { if (!csvImporting) onResetWarnings(); }} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-border-subtle bg-surface">
          <div className="flex items-center justify-between border-b border-border-subtle p-6">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Review Import</h2>
              <p className="mt-0.5 text-sm text-text-secondary">
                {csvPreview.length} guest{csvPreview.length !== 1 ? 's' : ''} ready to import
                {csvSkipped.length > 0 && ` · ${csvSkipped.length} row${csvSkipped.length !== 1 ? 's' : ''} need review`}
              </p>
            </div>
            {!csvImporting && (
              <button onClick={onResetWarnings} className="rounded-xl p-2 transition-colors hover:bg-surface-subtle">
                <X className="h-5 w-5 text-text-secondary" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {(csvMappingSummary.core.length > 0 || csvMappingSummary.rsvp.length > 0 || csvMappingSummary.household.length > 0 || csvMappingSummary.eventCols.length > 0 || csvMappingSummary.weak.length > 0) && (
              <div className="mb-4 space-y-2 rounded-2xl border border-border bg-surface-subtle p-3">
                <p className="text-xs font-medium text-text-primary">Detected mapping</p>
                {csvMappingSummary.core.length > 0 && <p className="text-xs text-text-secondary"><span className="font-medium text-text-primary">Core:</span> {csvMappingSummary.core.join(', ')}</p>}
                {csvMappingSummary.rsvp.length > 0 && <p className="text-xs text-text-secondary"><span className="font-medium text-text-primary">RSVP:</span> {csvMappingSummary.rsvp.join(', ')}</p>}
                {csvMappingSummary.household.length > 0 && <p className="text-xs text-text-secondary"><span className="font-medium text-text-primary">Households:</span> {csvMappingSummary.household.join(', ')}</p>}
                {csvMappingSummary.eventCols.length > 0 && <p className="text-xs text-text-secondary"><span className="font-medium text-text-primary">Itinerary columns:</span> {csvMappingSummary.eventCols.join(', ')}</p>}
                {csvMappingSummary.weak.length > 0 && <p className="text-xs text-primary"><span className="font-medium text-primary">Review closely:</span> {csvMappingSummary.weak.join(' · ')}</p>}
                <p className="text-[11px] text-text-tertiary">Invite values: Yes/Y/1/True/Included/Invited = invited · No/N/0/False/Excluded/Not Invited = not invited</p>
              </div>
            )}

            {csvSkipped.length > 0 && (
              <div className="mb-4 rounded-2xl border border-border-subtle bg-surface-subtle p-3">
                <p className="mb-1 text-xs font-medium text-text-primary">{csvSkipped.length} row{csvSkipped.length !== 1 ? 's' : ''} need a guest name</p>
                <ul className="space-y-0.5">
                  {csvSkipped.map((skipped, index) => <li key={index} className="text-xs text-text-secondary">• {skipped}</li>)}
                </ul>
              </div>
            )}

            {csvUnknownEvents.length > 0 && (
              <div className="mb-4 rounded-2xl border border-border bg-surface-subtle p-3">
                <p className="mb-1 text-xs font-medium text-text-primary">Unmatched itinerary event names ({csvUnknownEvents.length})</p>
                <p className="mb-1 text-xs text-text-secondary">Match these names to a schedule event when you are ready. Those event invites will stay unassigned for now.</p>
                <ul className="space-y-0.5">
                  {csvUnknownEvents.slice(0, 10).map((name, index) => <li key={index} className="text-xs text-text-secondary">• {name}</li>)}
                </ul>
              </div>
            )}

            {csvHouseholdWarnings.length > 0 && (
              <div className="mb-4 rounded-2xl border border-border-subtle bg-surface-subtle p-3">
                <p className="mb-1 text-xs font-medium text-text-primary">Household matches to review ({csvHouseholdWarnings.length})</p>
                <p className="mb-1 text-xs text-text-secondary">These name-only groups mix last names, so they will stay separate until you confirm them.</p>
                <ul className="space-y-0.5">
                  {csvHouseholdWarnings.slice(0, 10).map((name, index) => <li key={index} className="text-xs text-text-secondary">• {name}</li>)}
                </ul>
              </div>
            )}

            {csvDuplicateNames.length > 0 && (
              <div className="mb-4 rounded-2xl border border-border-subtle bg-surface-subtle p-3">
                <p className="mb-1 text-xs font-medium text-text-primary">Possible repeated names ({csvDuplicateNames.length})</p>
                <p className="mb-1 text-xs text-text-secondary">These guests share the same First + Last name. Import will continue, but they are worth checking.</p>
                <ul className="space-y-0.5">
                  {csvDuplicateNames.slice(0, 10).map((name, index) => <li key={index} className="text-xs text-text-secondary">• {name}</li>)}
                </ul>
              </div>
            )}

            <div className="divide-y divide-border-subtle">
              {csvPreview.slice(0, 50).map((guest, index) => (
                <div key={index} className="flex items-center gap-4 py-2.5">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-surface-subtle text-xs font-medium text-text-secondary">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {String(guest.first_name || '')} {String(guest.last_name || '')}
                    </p>
                    {Boolean(guest.email) && <p className="truncate text-xs text-text-secondary">{String(guest.email)}</p>}
                    {Boolean(guest.group_name) && <p className="truncate text-[11px] text-text-tertiary">Household: {String(guest.group_name)}</p>}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Boolean(guest.rsvp_status) && <span className="rounded-xl border border-border px-1.5 py-0.5 text-[10px] text-text-tertiary">{String(guest.rsvp_status)}</span>}
                      {Boolean(guest.__meal_choice) && <span className="rounded-xl border border-border px-1.5 py-0.5 text-[10px] text-text-tertiary">Meal: {String(guest.__meal_choice)}</span>}
                      {Boolean(guest.__plus_one_name) && <span className="rounded-xl border border-border px-1.5 py-0.5 text-[10px] text-text-tertiary">+1: {String(guest.__plus_one_name)}</span>}
                      {Number(guest.__children_count ?? 0) > 0 && <span className="rounded-xl border border-border px-1.5 py-0.5 text-[10px] text-text-tertiary">Children: {String(guest.__children_count)}</span>}
                      {Array.isArray(guest.__invited_event_ids) && (guest.__invited_event_ids as unknown[]).length > 0 && <span className="rounded-xl border border-primary/30 px-1.5 py-0.5 text-[10px] text-primary">{(guest.__invited_event_ids as unknown[]).length} event invites</span>}
                    </div>
                  </div>
                  {Boolean(guest.plus_one_allowed) && (
                    <span className="flex-shrink-0 rounded-xl bg-surface-subtle px-2 py-0.5 text-xs text-text-secondary">+1</span>
                  )}
                </div>
              ))}
              {csvPreview.length > 50 && (
                <p className="py-3 text-center text-sm text-text-secondary">
                  ...and {csvPreview.length - 50} more
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 border-t border-border-subtle p-6">
            <Button variant="outline" fullWidth onClick={onClose} disabled={csvImporting}>
              Cancel
            </Button>
            <Button variant="primary" fullWidth onClick={onConfirmImport} disabled={csvImporting}>
              {csvImporting ? 'Importing...' : `Import ${csvPreview.length} Guest${csvPreview.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
