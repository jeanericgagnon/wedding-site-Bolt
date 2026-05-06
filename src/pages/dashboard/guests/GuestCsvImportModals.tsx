import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/ui';
import type { CsvFieldMap } from '../../../lib/guestImportParser';
import { csvColumnLetter } from './guestDashboardUtils';

export interface CsvMappingSummary {
  core: string[];
  rsvp: string[];
  household: string[];
  eventCols: string[];
  weak: string[];
}

export interface GuestCsvMapperModalProps {
  columnSamples: string[];
  dataRows: string[][];
  fieldMap: CsvFieldMap;
  headers: string[];
  importing: boolean;
  nameMappingValid: boolean;
  selectedFilename: string | null;
  onBuildPreview: (headers: string[], dataRows: string[][], fieldMap: CsvFieldMap) => void;
  onClose: () => void;
  onSetFieldMap: React.Dispatch<React.SetStateAction<CsvFieldMap | null>>;
}

const CSV_FIELD_OPTIONS: Array<[keyof CsvFieldMap, string]> = [
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
];

export function GuestCsvMapperModal({
  columnSamples,
  dataRows,
  fieldMap,
  headers,
  importing,
  nameMappingValid,
  selectedFilename,
  onBuildPreview,
  onClose,
  onSetFieldMap,
}: GuestCsvMapperModalProps) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { if (!importing) onClose(); }} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-surface rounded-lg border border-border-subtle w-full max-w-2xl max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-border-subtle">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Match columns</h2>
              <p className="text-sm text-text-secondary mt-0.5">Confirm how this file should become your guest list{selectedFilename ? ` · ${selectedFilename}` : ''}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface-subtle rounded-lg transition-colors">
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-6 space-y-3">
            {!nameMappingValid && (
              <div className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-xs text-text-secondary">
                Map First Name + Last Name, or use Full Name instead.
              </div>
            )}
            {CSV_FIELD_OPTIONS.map(([key, label]) => (
              <label key={key} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                <span className="text-sm text-text-primary">{label}</span>
                <div>
                  {key === 'invited_events' ? (
                    <select
                      multiple
                      value={fieldMap.invited_events.map(String)}
                      onChange={(event) => {
                        const vals = Array.from(event.currentTarget.selectedOptions).map((option) => Number(option.value));
                        onSetFieldMap((prev) => prev ? { ...prev, invited_events: vals } : prev);
                      }}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface min-h-[110px]"
                    >
                      {headers.map((header, idx) => (
                        <option key={`${key}-${idx}`} value={idx}>
                          ({csvColumnLetter(idx)}) {header || `column ${idx + 1}`} → {columnSamples[idx] ? columnSamples[idx].slice(0, 40) : 'example'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={fieldMap[key] as number}
                      onChange={(event) => onSetFieldMap((prev) => prev ? { ...prev, [key]: Number(event.target.value) } : prev)}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface"
                    >
                      <option value={-1}>— Not mapped —</option>
                      {headers.map((header, idx) => (
                        <option key={`${key}-${idx}`} value={idx}>
                          ({csvColumnLetter(idx)}) {header || `column ${idx + 1}`} → {columnSamples[idx] ? columnSamples[idx].slice(0, 40) : 'example'}
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
          <div className="flex gap-3 p-6 border-t border-border-subtle">
            <Button variant="outline" fullWidth onClick={onClose} disabled={importing}>Cancel</Button>
            <Button
              variant="primary"
              fullWidth
              onClick={() => onBuildPreview(headers, dataRows, fieldMap)}
              disabled={importing || !nameMappingValid}
            >
              Continue to Review
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export interface GuestCsvReviewModalProps {
  duplicateNames: string[];
  householdWarnings: string[];
  importing: boolean;
  mappingSummary: CsvMappingSummary;
  preview: Record<string, unknown>[];
  skipped: string[];
  unknownEvents: string[];
  onCancel: () => void;
  onConfirm: () => void;
}

export function GuestCsvReviewModal({
  duplicateNames,
  householdWarnings,
  importing,
  mappingSummary,
  preview,
  skipped,
  unknownEvents,
  onCancel,
  onConfirm,
}: GuestCsvReviewModalProps) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { if (!importing) onCancel(); }} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-surface rounded-lg border border-border-subtle w-full max-w-2xl max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-border-subtle">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Review Import</h2>
              <p className="text-sm text-text-secondary mt-0.5">
                {preview.length} guest{preview.length !== 1 ? 's' : ''} ready to import
                {skipped.length > 0 && ` · ${skipped.length} row${skipped.length !== 1 ? 's' : ''} need review`}
              </p>
            </div>
            {!importing && (
              <button onClick={onCancel} className="p-2 hover:bg-surface-subtle rounded-lg transition-colors">
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1 p-6">
            <CsvMappingSummaryBlock mappingSummary={mappingSummary} />
            <CsvWarningList title={`${skipped.length} row${skipped.length !== 1 ? 's' : ''} need a guest name`} items={skipped} />
            <CsvWarningList
              title={`Unmatched itinerary event names (${unknownEvents.length})`}
              detail="Match these names to a schedule event when you are ready. Those event invites will stay unassigned for now."
              items={unknownEvents}
            />
            <CsvWarningList
              title={`Household matches to review (${householdWarnings.length})`}
              detail="These name-only groups mix last names, so they will stay separate until you confirm them."
              items={householdWarnings}
            />
            <CsvWarningList
              title={`Possible repeated names (${duplicateNames.length})`}
              detail="These guests share the same First + Last name. Import will continue, but they are worth checking."
              items={duplicateNames}
            />

            <div className="divide-y divide-border-subtle">
              {preview.slice(0, 50).map((guest, index) => (
                <div key={index} className="py-2.5 flex items-center gap-4">
                  <div className="w-7 h-7 rounded-lg bg-surface-subtle flex items-center justify-center text-xs font-medium text-text-secondary flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {String(guest.first_name || '')} {String(guest.last_name || '')}
                    </p>
                    {Boolean(guest.email) && <p className="text-xs text-text-secondary truncate">{String(guest.email)}</p>}
                    {Boolean(guest.group_name) && <p className="text-[11px] text-text-tertiary truncate">Household: {String(guest.group_name)}</p>}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Boolean(guest.rsvp_status) && <span className="text-[10px] px-1.5 py-0.5 rounded-lg border border-border text-text-tertiary">{String(guest.rsvp_status)}</span>}
                      {Boolean(guest.__meal_choice) && <span className="text-[10px] px-1.5 py-0.5 rounded-lg border border-border text-text-tertiary">Meal: {String(guest.__meal_choice)}</span>}
                      {Boolean(guest.__plus_one_name) && <span className="text-[10px] px-1.5 py-0.5 rounded-lg border border-border text-text-tertiary">+1: {String(guest.__plus_one_name)}</span>}
                      {Number(guest.__children_count ?? 0) > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-lg border border-border text-text-tertiary">Children: {String(guest.__children_count)}</span>}
                      {Array.isArray(guest.__invited_event_ids) && (guest.__invited_event_ids as unknown[]).length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-lg border border-primary/30 text-primary">{(guest.__invited_event_ids as unknown[]).length} event invites</span>}
                    </div>
                  </div>
                  {Boolean(guest.plus_one_allowed) && (
                    <span className="text-xs px-2 py-0.5 bg-surface-subtle rounded-lg text-text-secondary flex-shrink-0">+1</span>
                  )}
                </div>
              ))}
              {preview.length > 50 && (
                <p className="py-3 text-sm text-text-secondary text-center">
                  …and {preview.length - 50} more
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 p-6 border-t border-border-subtle">
            <Button variant="outline" fullWidth onClick={onCancel} disabled={importing}>
              Cancel
            </Button>
            <Button variant="primary" fullWidth onClick={onConfirm} disabled={importing}>
              {importing ? 'Importing...' : `Import ${preview.length} Guest${preview.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function CsvMappingSummaryBlock({ mappingSummary }: { mappingSummary: CsvMappingSummary }) {
  if (
    mappingSummary.core.length === 0 &&
    mappingSummary.rsvp.length === 0 &&
    mappingSummary.household.length === 0 &&
    mappingSummary.eventCols.length === 0 &&
    mappingSummary.weak.length === 0
  ) {
    return null;
  }

  return (
    <div className="mb-4 p-3 bg-surface-subtle border border-border rounded-lg space-y-2">
      <p className="text-xs font-medium text-text-primary">Detected mapping</p>
      {mappingSummary.core.length > 0 && <p className="text-xs text-text-secondary"><span className="font-medium text-text-primary">Core:</span> {mappingSummary.core.join(', ')}</p>}
      {mappingSummary.rsvp.length > 0 && <p className="text-xs text-text-secondary"><span className="font-medium text-text-primary">RSVP:</span> {mappingSummary.rsvp.join(', ')}</p>}
      {mappingSummary.household.length > 0 && <p className="text-xs text-text-secondary"><span className="font-medium text-text-primary">Households:</span> {mappingSummary.household.join(', ')}</p>}
      {mappingSummary.eventCols.length > 0 && <p className="text-xs text-text-secondary"><span className="font-medium text-text-primary">Itinerary columns:</span> {mappingSummary.eventCols.join(', ')}</p>}
      {mappingSummary.weak.length > 0 && <p className="text-xs text-primary"><span className="font-medium text-primary">Review closely:</span> {mappingSummary.weak.join(' · ')}</p>}
      <p className="text-[11px] text-text-tertiary">Invite values: Yes/Y/1/True/Included/Invited = invited · No/N/0/False/Excluded/Not Invited = not invited</p>
    </div>
  );
}

function CsvWarningList({
  detail,
  items,
  title,
}: {
  detail?: string;
  items: string[];
  title: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="mb-4 p-3 bg-surface-subtle border border-border-subtle rounded-lg">
      <p className="text-xs font-medium text-text-primary mb-1">{title}</p>
      {detail && <p className="text-xs text-text-secondary mb-1">{detail}</p>}
      <ul className="space-y-0.5">
        {items.slice(0, 10).map((item, index) => <li key={index} className="text-xs text-text-secondary">• {item}</li>)}
      </ul>
    </div>
  );
}
