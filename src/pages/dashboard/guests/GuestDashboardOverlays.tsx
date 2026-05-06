import React from 'react';
import type { CsvFieldMap } from '../../../lib/guestImportParser';
import { ConfirmDialog, type ConfirmDialogProps } from '../../../components/ui/ConfirmDialog';
import type {
  GuestAuditEntry,
  GuestWithRSVP,
  ItineraryEvent,
  WeddingSiteInfo,
} from './guestDashboardTypes';
import type {
  AssistedRsvpSource,
  AssistedRsvpStatus,
  GuestFormData,
} from './GuestModals';
import {
  AssistedRsvpModal,
  DeleteAllGuestsModal,
  GuestFormModal,
} from './GuestModals';
import { GuestItineraryDrawer } from './GuestItineraryDrawer';
import {
  GuestCsvMapperModal,
  GuestCsvReviewModal,
  type CsvMappingSummary,
} from './GuestCsvImportModals';

type ToastFn = (message: string, type?: 'success' | 'error' | 'info') => void;

export interface GuestDashboardOverlaysProps {
  assistedRsvpGuest: GuestWithRSVP | null;
  assistedRsvpNotes: string;
  assistedRsvpSaving: boolean;
  assistedRsvpSource: AssistedRsvpSource;
  assistedRsvpStatus: AssistedRsvpStatus;
  confirmDialog: Omit<ConfirmDialogProps, 'open'> | null;
  csvColumnSamples: string[];
  csvDataRows: string[][];
  csvDuplicateNames: string[];
  csvFieldMap: CsvFieldMap | null;
  csvHeaders: string[];
  csvHouseholdWarnings: string[];
  csvImporting: boolean;
  csvMappingSummary: CsvMappingSummary;
  csvNameMappingValid: boolean;
  csvPreview: Record<string, unknown>[] | null;
  csvSelectedFilename: string | null;
  csvShowMapper: boolean;
  csvSkipped: string[];
  csvUnknownEvents: string[];
  deleteAllBusy: boolean;
  deleteAllConfirmInput: string;
  editingGuest: GuestWithRSVP | null;
  effectiveItineraryEvents: ItineraryEvent[];
  formData: GuestFormData;
  formEventInviteIds: Set<string>;
  guestAuditEntries: GuestAuditEntry[];
  guestEventIds: Set<string>;
  guests: GuestWithRSVP[];
  itineraryDrawerGuest: GuestWithRSVP | null;
  itineraryEvents: ItineraryEvent[];
  itineraryFilterEventCount: number;
  loadingDrawer: boolean;
  showAddModal: boolean;
  showDeleteAllModal: boolean;
  togglingEventId: string | null;
  weddingSiteInfo: WeddingSiteInfo | null;
  onAddFollowUpTask: (task: string) => void;
  onBuildCsvPreview: (headers: string[], dataRows: string[][], fieldMap: CsvFieldMap) => void;
  onCloseAddModal: () => void;
  onCloseAssistedRsvp: () => void;
  onCloseDeleteAllModal: () => void;
  onCloseEditModal: () => void;
  onCloseItineraryDrawer: () => void;
  onConfirmCsvImport: () => void;
  onConfirmDeleteAllGuests: () => void;
  onCopyContactRequestLink: () => void;
  onFocusGuestSearch: (query: string) => void;
  onResetCsvReview: () => void;
  onSaveAssistedRsvp: () => void;
  onSetAssistedRsvpNotes: React.Dispatch<React.SetStateAction<string>>;
  onSetAssistedRsvpSource: React.Dispatch<React.SetStateAction<AssistedRsvpSource>>;
  onSetAssistedRsvpStatus: React.Dispatch<React.SetStateAction<AssistedRsvpStatus>>;
  onSetCsvFieldMap: React.Dispatch<React.SetStateAction<CsvFieldMap | null>>;
  onSetCsvShowMapper: React.Dispatch<React.SetStateAction<boolean>>;
  onSetDeleteAllConfirmInput: React.Dispatch<React.SetStateAction<string>>;
  onSetFormData: React.Dispatch<React.SetStateAction<GuestFormData>>;
  onSetFormEventInviteIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onSubmitAddGuest: (event: React.FormEvent) => void;
  onSubmitEditGuest: (event: React.FormEvent) => void;
  onToast: ToastFn;
  onToggleEventInvite: (eventId: string, currentlyInvited: boolean) => void;
}

export function GuestDashboardOverlays({
  assistedRsvpGuest,
  assistedRsvpNotes,
  assistedRsvpSaving,
  assistedRsvpSource,
  assistedRsvpStatus,
  confirmDialog,
  csvColumnSamples,
  csvDataRows,
  csvDuplicateNames,
  csvFieldMap,
  csvHeaders,
  csvHouseholdWarnings,
  csvImporting,
  csvMappingSummary,
  csvNameMappingValid,
  csvPreview,
  csvSelectedFilename,
  csvShowMapper,
  csvSkipped,
  csvUnknownEvents,
  deleteAllBusy,
  deleteAllConfirmInput,
  editingGuest,
  effectiveItineraryEvents,
  formData,
  formEventInviteIds,
  guestAuditEntries,
  guestEventIds,
  guests,
  itineraryDrawerGuest,
  itineraryEvents,
  itineraryFilterEventCount,
  loadingDrawer,
  showAddModal,
  showDeleteAllModal,
  togglingEventId,
  weddingSiteInfo,
  onAddFollowUpTask,
  onBuildCsvPreview,
  onCloseAddModal,
  onCloseAssistedRsvp,
  onCloseDeleteAllModal,
  onCloseEditModal,
  onCloseItineraryDrawer,
  onConfirmCsvImport,
  onConfirmDeleteAllGuests,
  onCopyContactRequestLink,
  onFocusGuestSearch,
  onResetCsvReview,
  onSaveAssistedRsvp,
  onSetAssistedRsvpNotes,
  onSetAssistedRsvpSource,
  onSetAssistedRsvpStatus,
  onSetCsvFieldMap,
  onSetCsvShowMapper,
  onSetDeleteAllConfirmInput,
  onSetFormData,
  onSetFormEventInviteIds,
  onSubmitAddGuest,
  onSubmitEditGuest,
  onToast,
  onToggleEventInvite,
}: GuestDashboardOverlaysProps) {
  return (
    <>
      {assistedRsvpGuest && (
        <AssistedRsvpModal
          guest={assistedRsvpGuest}
          notes={assistedRsvpNotes}
          saving={assistedRsvpSaving}
          source={assistedRsvpSource}
          status={assistedRsvpStatus}
          onClose={onCloseAssistedRsvp}
          onSave={onSaveAssistedRsvp}
          onSetNotes={onSetAssistedRsvpNotes}
          onSetSource={onSetAssistedRsvpSource}
          onSetStatus={onSetAssistedRsvpStatus}
        />
      )}

      {showAddModal && (
        <GuestFormModal
          effectiveItineraryEvents={effectiveItineraryEvents}
          formData={formData}
          formEventInviteIds={formEventInviteIds}
          itineraryFilterEventCount={itineraryFilterEventCount}
          submitLabel="Add guest"
          title="Add guest"
          onClose={onCloseAddModal}
          onSetFormData={onSetFormData}
          onSetFormEventInviteIds={onSetFormEventInviteIds}
          onSubmit={onSubmitAddGuest}
        />
      )}

      {editingGuest && (
        <GuestFormModal
          effectiveItineraryEvents={effectiveItineraryEvents}
          formData={formData}
          formEventInviteIds={formEventInviteIds}
          itineraryFilterEventCount={itineraryFilterEventCount}
          submitLabel="Save guest"
          title="Edit guest"
          onClose={onCloseEditModal}
          onSetFormData={onSetFormData}
          onSetFormEventInviteIds={onSetFormEventInviteIds}
          onSubmit={onSubmitEditGuest}
        />
      )}

      {itineraryDrawerGuest && (
        <GuestItineraryDrawer
          guest={itineraryDrawerGuest}
          guestAuditEntries={guestAuditEntries}
          guestEventIds={guestEventIds}
          guests={guests}
          itineraryEvents={itineraryEvents}
          loadingDrawer={loadingDrawer}
          togglingEventId={togglingEventId}
          weddingSiteInfo={weddingSiteInfo}
          onAddFollowUpTask={onAddFollowUpTask}
          onClose={onCloseItineraryDrawer}
          onCopyContactRequestLink={onCopyContactRequestLink}
          onFocusGuestSearch={onFocusGuestSearch}
          onToast={onToast}
          onToggleEventInvite={onToggleEventInvite}
        />
      )}

      {showDeleteAllModal && (
        <DeleteAllGuestsModal
          busy={deleteAllBusy}
          confirmInput={deleteAllConfirmInput}
          guestCount={guests.length}
          onCancel={onCloseDeleteAllModal}
          onConfirm={onConfirmDeleteAllGuests}
          onSetConfirmInput={onSetDeleteAllConfirmInput}
        />
      )}

      {csvShowMapper && csvFieldMap && (
        <GuestCsvMapperModal
          columnSamples={csvColumnSamples}
          dataRows={csvDataRows}
          fieldMap={csvFieldMap}
          headers={csvHeaders}
          importing={csvImporting}
          nameMappingValid={csvNameMappingValid}
          selectedFilename={csvSelectedFilename}
          onBuildPreview={onBuildCsvPreview}
          onClose={() => onSetCsvShowMapper(false)}
          onSetFieldMap={onSetCsvFieldMap}
        />
      )}

      {csvPreview && (
        <GuestCsvReviewModal
          duplicateNames={csvDuplicateNames}
          householdWarnings={csvHouseholdWarnings}
          importing={csvImporting}
          mappingSummary={csvMappingSummary}
          preview={csvPreview}
          skipped={csvSkipped}
          unknownEvents={csvUnknownEvents}
          onCancel={onResetCsvReview}
          onConfirm={onConfirmCsvImport}
        />
      )}

      {confirmDialog && (
        <ConfirmDialog
          open
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          tone={confirmDialog.tone}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </>
  );
}
