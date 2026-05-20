import { X } from 'lucide-react';
import { Button } from '../../../components/ui';
import type { CsvFieldMap } from '../../../lib/guestImportParser';
import { csvColumnLetter } from './guestDashboardUtils';

type GuestImportMapperModalProps = {
  csvColumnSamples: string[];
  csvFieldMap: CsvFieldMap;
  csvHeaders: string[];
  csvImporting: boolean;
  csvNameMappingValid: boolean;
  csvSelectedFilename: string | null;
  onClose: () => void;
  onContinue: () => void;
  onFieldMapChange: (key: keyof CsvFieldMap, value: number) => void;
  onInvitedEventsChange: (value: number[]) => void;
};

export function GuestImportMapperModal({
  csvColumnSamples,
  csvFieldMap,
  csvHeaders,
  csvImporting,
  csvNameMappingValid,
  csvSelectedFilename,
  onClose,
  onContinue,
  onFieldMapChange,
  onInvitedEventsChange,
}: GuestImportMapperModalProps) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={() => { if (!csvImporting) onClose(); }} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-border-subtle bg-surface">
          <div className="flex items-center justify-between border-b border-border-subtle p-6">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Match columns</h2>
              <p className="mt-0.5 text-sm text-text-secondary">
                Confirm how this file should become your guest list{csvSelectedFilename ? ` · ${csvSelectedFilename}` : ''}
              </p>
            </div>
            <button onClick={onClose} className="rounded-xl p-2 transition-colors hover:bg-surface-subtle">
              <X className="h-5 w-5 text-text-secondary" />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-6">
            {!csvNameMappingValid && (
              <div className="rounded-xl border border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-text-secondary">
                Map First Name + Last Name, or use Full Name instead.
              </div>
            )}
            {([
              ['first_name', 'First Name (recommended)'],
              ['last_name', 'Last Name (recommended)'],
              ['full_name', 'Full Name (optional)'],
              ['email', 'Email'],
              ['phone', 'Phone'],
              ['plus_one', 'Plus One Allowed'],
              ['plus_one_name', 'Plus One Name'],
              ['plus_one_count', 'Plus One Count'],
              ['children_allowed', 'Children Allowed'],
              ['children_count', 'Children Count'],
              ['max_additional_guests', 'Max Additional Guests'],
              ['status', 'RSVP Status'],
              ['meal_choice', 'Meal Choice'],
              ['rsvp_date', 'RSVP Date'],
              ['invite_token', 'Existing invitation link'],
              ['household_id', 'Household ID'],
              ['household_name', 'Household Name / Group Name'],
              ['invited_events', 'Invited Events (list)'],
            ] as Array<[keyof CsvFieldMap, string]>).map(([key, label]) => (
              <label key={key} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2">
                <span className="text-sm text-text-primary">{label}</span>
                <div>
                  {key === 'invited_events' ? (
                    <select
                      multiple
                      value={csvFieldMap.invited_events.map(String)}
                      onChange={(event) => {
                        onInvitedEventsChange(Array.from(event.currentTarget.selectedOptions).map((option) => Number(option.value)));
                      }}
                      className="min-h-[110px] w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                    >
                      {csvHeaders.map((header, index) => (
                        <option key={`${key}-${index}`} value={index}>
                          ({csvColumnLetter(index)}) {header || `column ${index + 1}`} → {csvColumnSamples[index] ? csvColumnSamples[index].slice(0, 40) : 'example'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={csvFieldMap[key] as number}
                      onChange={(event) => onFieldMapChange(key, Number(event.target.value))}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                    >
                      <option value={-1}>— Not mapped —</option>
                      {csvHeaders.map((header, index) => (
                        <option key={`${key}-${index}`} value={index}>
                          ({csvColumnLetter(index)}) {header || `column ${index + 1}`} → {csvColumnSamples[index] ? csvColumnSamples[index].slice(0, 40) : 'example'}
                        </option>
                      ))}
                    </select>
                  )}
                  {key === 'invited_events' && (
                    <p className="mt-1 text-[11px] text-text-tertiary">Multi-select supported (Cmd/Ctrl+Click).</p>
                  )}
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-3 border-t border-border-subtle p-6">
            <Button variant="outline" fullWidth onClick={onClose} disabled={csvImporting}>Cancel</Button>
            <Button variant="primary" fullWidth onClick={onContinue} disabled={csvImporting || !csvNameMappingValid}>
              Continue to Review
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
