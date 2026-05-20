import type { FormEvent } from 'react';

export function buildGuestDashboardOverlayActions(args: any) {
  return {
    onCloseAddModal: () => {
      args.setShowAddModal(false);
      args.resetForm();
    },
    onCloseAssistedRsvp: () => args.setAssistedRsvpGuest(null),
    onCloseDeleteAllModal: () => {
      if (args.deleteAllBusy) return;
      args.setShowDeleteAllModal(false);
      args.setDeleteAllConfirmInput('');
    },
    onCloseEditModal: () => {
      args.setEditingGuest(null);
      args.resetForm();
    },
    onCloseItineraryDrawer: () => {
      args.setItineraryDrawerGuest(null);
      args.setGuestAuditEntries([]);
    },
    onCloseCsvMapper: () => {
      if (!args.csvImporting) args.resetCsvParserState();
    },
    onResetCsvReview: () => {
      if (!args.csvImporting) args.resetCsvReviewState();
    },
    onSubmitAddGuest: (event: FormEvent<Element>) => { void args.handleAddGuest(event); },
    onSubmitEditGuest: (event: FormEvent<Element>) => { void args.handleEditGuest(event, args.editingGuest); },
  };
}
