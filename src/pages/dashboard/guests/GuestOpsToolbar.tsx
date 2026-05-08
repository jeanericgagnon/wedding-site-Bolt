import React from 'react';
import { ChevronDown, Upload, UserPlus } from 'lucide-react';
import { Button, Input } from '../../../components/ui';

export interface GuestOpsToolbarProps {
  autoRemindersEnabled: boolean;
  bulkSending: boolean;
  canEditGuests: boolean;
  csvImporting: boolean;
  csvMaxFileMb: number;
  csvMaxRows: number;
  csvSelectedFilename: string | null;
  dueReminderCount: number;
  guestCount: number;
  hasNextUnresolvedGuest: boolean;
  isDemoMode: boolean;
  reminderCandidateCount: number;
  searchQuery: string;
  selectedGuestCount: number;
  showOpsMenu: boolean;
  onAddGuest: () => void;
  onClearAllCheckIns: () => void;
  onClearSelection: () => void;
  onCopyAddressCollectionLink: () => void;
  onCopyChecklist: () => void;
  onCopyFilteredEmails: () => void;
  onCopyMissingContactList: () => void;
  onCopyTextRsvpLinks: () => void;
  onCreateChecklist: () => void;
  onDeleteAllGuests: () => void;
  onDryRun: () => void;
  onExportAddressCollection: () => void;
  onExportAllGuests: () => void;
  onExportAttendingGuests: () => void;
  onExportCheckedInGuests: () => void;
  onExportDeclinedGuests: () => void;
  onExportEventAttendance: () => void;
  onExportFilteredGuests: () => void;
  onExportHouseholdLabels: () => void;
  onExportMissingMealChoices: () => void;
  onExportPendingRsvp: () => void;
  onExportRsvpResponders: () => void;
  onExportThankYouDue: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onMarkAllDueThankYous: () => void;
  onNextUnresolved: () => void;
  onSearchQueryChange: (value: string) => void;
  onSelectFiltered: () => void;
  onSelectUnresolved: () => void;
  onSendDueReminders: () => void;
  onSendFilteredInvitations: () => void;
  onSendSelectedInvitations: () => void;
  onSetShowOpsMenu: (show: boolean | ((previous: boolean) => boolean)) => void;
  onToggleAutoReminders: () => void;
  csvFileInputRef: React.RefObject<HTMLInputElement>;
}

export function GuestOpsToolbar({
  autoRemindersEnabled,
  bulkSending,
  canEditGuests,
  csvFileInputRef,
  csvImporting,
  csvMaxFileMb,
  csvMaxRows,
  csvSelectedFilename,
  dueReminderCount,
  guestCount,
  hasNextUnresolvedGuest,
  isDemoMode,
  reminderCandidateCount,
  searchQuery,
  selectedGuestCount,
  showOpsMenu,
  onAddGuest,
  onClearAllCheckIns,
  onClearSelection,
  onCopyAddressCollectionLink,
  onCopyChecklist,
  onCopyFilteredEmails,
  onCopyMissingContactList,
  onCopyTextRsvpLinks,
  onCreateChecklist,
  onDeleteAllGuests,
  onDryRun,
  onExportAddressCollection,
  onExportAllGuests,
  onExportAttendingGuests,
  onExportCheckedInGuests,
  onExportDeclinedGuests,
  onExportEventAttendance,
  onExportFilteredGuests,
  onExportHouseholdLabels,
  onExportMissingMealChoices,
  onExportPendingRsvp,
  onExportRsvpResponders,
  onExportThankYouDue,
  onFileChange,
  onMarkAllDueThankYous,
  onNextUnresolved,
  onSearchQueryChange,
  onSelectFiltered,
  onSelectUnresolved,
  onSendDueReminders,
  onSendFilteredInvitations,
  onSendSelectedInvitations,
  onSetShowOpsMenu,
  onToggleAutoReminders,
}: GuestOpsToolbarProps) {
  const closeMenu = () => onSetShowOpsMenu(false);
  const runAction = (action: () => void) => {
    action();
    closeMenu();
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search guests..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap items-start [&>*]:whitespace-nowrap">
          <input
            ref={csvFileInputRef}
            type="file"
            accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={onFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            size="md"
            onClick={() => csvFileInputRef.current?.click()}
            disabled={csvImporting || !canEditGuests}
          >
            <Upload className="w-4 h-4 mr-2" />
            {csvImporting ? 'Parsing…' : 'Import Guests'}
          </Button>
          <p className="basis-full text-[11px] text-text-tertiary">
            CSV or .xlsx, first sheet only, up to {csvMaxRows.toLocaleString()} rows and {csvMaxFileMb}MB.
          </p>

          <Button variant="primary" size="md" onClick={onAddGuest} disabled={!canEditGuests}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Guest
          </Button>

          <div className="relative">
            <Button variant="outline" size="md" onClick={() => onSetShowOpsMenu((value) => !value)} disabled={!canEditGuests}>
              Actions
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
            {showOpsMenu && (
              <div className="absolute right-0 z-20 mt-1 w-64 bg-white border border-border rounded-lg p-1 max-h-96 overflow-auto">
                <fieldset disabled={!canEditGuests} className="disabled:opacity-50">
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onExportAllGuests)}>Export all guests</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onExportFilteredGuests)}>Export filtered guests</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onExportRsvpResponders)}>Export RSVP responders</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onExportAttendingGuests)}>Export attending guests</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onExportDeclinedGuests)}>Export declined guests</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onExportPendingRsvp)}>Export pending RSVP</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onExportMissingMealChoices)}>Export missing meal choices</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onExportAddressCollection)}>Export addresses (mailing)</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onExportHouseholdLabels)}>Export household labels</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onExportEventAttendance)}>Export event attendance</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onExportCheckedInGuests)}>Export checked-in guests</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onExportThankYouDue)}>Export thank-you due</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onCopyAddressCollectionLink)}>Copy address collection link</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onCopyMissingContactList)}>Copy missing-contact list</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded disabled:opacity-50" disabled={reminderCandidateCount === 0} onClick={() => runAction(onCopyTextRsvpLinks)}>Copy text RSVP links</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded disabled:opacity-50" disabled={reminderCandidateCount === 0} onClick={() => runAction(onCopyFilteredEmails)}>Copy filtered emails</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded disabled:opacity-50" disabled={bulkSending || reminderCandidateCount === 0} onClick={() => runAction(onSendFilteredInvitations)} title={reminderCandidateCount === 0 ? 'No eligible recipients in this segment' : undefined}>{bulkSending ? 'Sending…' : `Remind filtered (${reminderCandidateCount})`}</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded disabled:opacity-50" disabled={bulkSending || dueReminderCount === 0} onClick={() => runAction(onSendDueReminders)} title={dueReminderCount === 0 ? 'No guests due for reminders' : undefined}>{bulkSending ? 'Sending…' : `Send due reminders (${dueReminderCount})`}</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onToggleAutoReminders)}>{autoRemindersEnabled ? '✓ ' : ''}{autoRemindersEnabled ? 'Auto reminders: On' : 'Auto reminders: Off'}</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onMarkAllDueThankYous)}>Mark all thank-you due as sent</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onClearAllCheckIns)}>Clear all check-ins</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onCreateChecklist)}>Create checklist</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onCopyChecklist)}>Copy checklist</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onSelectUnresolved)}>Select unresolved</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded" onClick={() => runAction(onSelectFiltered)}>Select filtered</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded disabled:opacity-50" disabled={bulkSending || selectedGuestCount === 0} onClick={() => runAction(onSendSelectedInvitations)}>{bulkSending ? 'Sending…' : `Remind selected (${selectedGuestCount})`}</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded disabled:opacity-50" disabled={selectedGuestCount === 0} onClick={() => runAction(onClearSelection)}>Clear selection</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded disabled:opacity-50" disabled={!hasNextUnresolvedGuest} onClick={() => runAction(onNextUnresolved)}>Next unresolved</button>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-surface-subtle rounded disabled:opacity-50" disabled={reminderCandidateCount === 0} onClick={() => runAction(onDryRun)}>Dry run</button>
                  <div className="my-1 border-t border-border-subtle" />
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-surface-subtle hover:text-text-primary rounded disabled:opacity-50"
                    disabled={guestCount === 0 || isDemoMode}
                    onClick={() => runAction(onDeleteAllGuests)}
                  >
                    Delete all guests
                  </button>
                </fieldset>
              </div>
            )}
          </div>
        </div>
      </div>

      {csvSelectedFilename && (
        <p className="text-xs text-text-tertiary mt-2">Selected file: <span className="font-medium text-text-secondary">{csvSelectedFilename}</span></p>
      )}
    </>
  );
}
