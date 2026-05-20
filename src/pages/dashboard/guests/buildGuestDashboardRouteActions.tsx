import { Badge } from '../../../components/ui';
import { getGuestIssueCount } from './guestDashboardUtils';

export function buildGuestDashboardRouteActions(args: any) {
  const ensureCanEditGuests = () => {
    if (!args.isGuestsReadOnly) return true;
    args.toast('Viewer mode is read-only.', 'info');
    return false;
  };

  const selectUnresolvedGuests = () => {
    if (!ensureCanEditGuests()) return;

    const ids = args.displayedGuests.filter((guest: any) => getGuestIssueCount(guest) > 0).map((guest: any) => guest.id);
    args.setSelectedGuestIds(new Set(ids));
    args.toast(
      ids.length > 0
        ? `Selected ${ids.length} unresolved guest${ids.length === 1 ? '' : 's'}`
        : 'No unresolved guests in current view',
      ids.length > 0 ? 'success' : 'error',
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'error' | 'warning'> = {
      confirmed: 'success',
      declined: 'error',
      pending: 'warning',
    };
    const labels: Record<string, string> = {
      confirmed: 'Confirmed',
      declined: 'Declined',
      pending: 'Pending',
    };
    return <Badge variant={variants[status] || 'warning'}>{labels[status] || status}</Badge>;
  };

  return {
    getStatusBadge,
    onAddGuest: () => {
      if (!ensureCanEditGuests()) return;
      args.resetForm();
      args.setShowAddModal(true);
    },
    onClearAllCheckIns: () => {
      if (!ensureCanEditGuests()) return;
      void args.handleClearAllCheckIns();
    },
    onCopyAddressCollectionLink: () => args.copyContactRequestLink(),
    onCopyChecklist: () => args.handleCopyChecklist(),
    onCopyContactRequestLink: () => args.copyContactRequestLink(),
    onCopyExceptionChecklist: () => args.handleCopyExceptionChecklist(),
    onCopyFilteredEmails: () => args.handleCopyFilteredEmails(),
    onCopyMissingContactList: () => args.handleCopyNoContactChecklist(),
    onCopyMissingMealChecklist: () => args.handleCopyMissingMealChecklist(),
    onCopyTextRsvpLinks: () => args.copySmsRsvpLinksForFiltered(),
    onDeleteAllGuests: () => {
      if (!ensureCanEditGuests()) return;
      args.setDeleteAllConfirmInput('');
      args.setShowDeleteAllModal(true);
    },
    onDeleteGuest: (guestId: string) => {
      if (!ensureCanEditGuests()) return;
      void args.handleDeleteGuest(guestId, args.confirmDeleteId);
    },
    onDryRun: () => { void args.handleCopyCampaignDryRun(); },
    onFocusCeremonyNo: () => {
      args.setSearchQuery('');
      args.setFilterStatus('ceremony-no');
    },
    onFocusHandledPersonally: () => {
      args.setFilterStatus('manual-handled');
      args.setViewMode('list');
      args.setShowCampaignModal(false);
    },
    onFocusHighRiskFirst: () => {
      args.focusHighRiskFirst();
      args.setShowCampaignModal(false);
    },
    onFocusMissingContact: () => {
      args.setSearchQuery('');
      args.setFilterStatus('no-contact');
      args.setViewMode('list');
      args.setShowCampaignModal(false);
    },
    onFocusMissingMeal: () => {
      args.setSearchQuery('');
      args.setFilterStatus('missing-meal');
      args.setViewMode('list');
      args.setShowCampaignModal(false);
    },
    onFocusNoResponse: () => {
      args.setSearchQuery('');
      args.setFilterStatus('pending');
    },
    onFocusPending: () => {
      args.setFilterStatus('pending');
      args.setViewMode('list');
      args.setShowCampaignModal(false);
    },
    onFocusPendingNoEmail: () => {
      args.setSearchQuery('');
      args.setFilterStatus('pending-no-email');
      args.setViewMode('list');
      args.setShowCampaignModal(false);
    },
    onFocusPlusOneMissing: () => {
      args.setSearchQuery('');
      args.setFilterStatus('plusone-missing');
      args.setViewMode('list');
    },
    onFocusPlusOneNames: () => {
      args.setFilterStatus('plusone-missing');
      args.setViewMode('list');
      args.setShowCampaignModal(false);
    },
    onFocusQueueItem: (filter: string, guestName: string) => {
      args.setFilterStatus(filter);
      args.setViewMode('list');
      args.setSearchQuery(guestName);
    },
    onFocusRecommendedAction: (filter: string) => {
      args.setFilterStatus(filter);
      args.setViewMode('list');
      args.setSearchQuery('');
    },
    onFocusReceptionNo: () => {
      args.setSearchQuery('');
      args.setFilterStatus('reception-no');
    },
    onHeaderAddGuest: () => {
      if (!ensureCanEditGuests()) return;
      args.resetForm();
      args.setShowAddModal(true);
    },
    onMarkAllDueThankYous: () => {
      if (!ensureCanEditGuests()) return;
      void args.handleMarkAllDueThankYous();
    },
    onMergeIntoHousehold: () => {
      if (!ensureCanEditGuests()) return;
      args.handleMergeIntoHousehold(args.selectedGuestIds, () => args.setSelectedGuestIds(new Set()));
    },
    onNextUnresolved: () => {
      if (!args.nextUnresolvedGuest) return;
      args.setSearchQuery(
        (args.nextUnresolvedGuest.first_name || args.nextUnresolvedGuest.last_name)
          ? `${args.nextUnresolvedGuest.first_name ?? ''} ${args.nextUnresolvedGuest.last_name ?? ''}`.trim()
          : args.nextUnresolvedGuest.name,
      );
      args.setViewMode('list');
    },
    onOpenCampaignModal: () => {
      if (!ensureCanEditGuests()) return;
      args.setShowCampaignModal(true);
    },
    onReviewPending: () => {
      args.setFilterStatus('pending');
      args.setViewMode('list');
    },
    onSelectCheckedInFilter: () => args.setFilterStatus('checked-in'),
    onSelectPrimaryFilter: (value: string) => {
      args.setFilterStatus(value);
      args.setExtraFilters([]);
    },
    onSelectUnresolved: selectUnresolvedGuests,
    onSendDueReminders: () => {
      if (!ensureCanEditGuests()) return;
      void args.handleSendDueRemindersNow();
    },
    onSendDueRemindersToggle: () => {
      if (!ensureCanEditGuests()) return;
      void (async () => {
        const previous = args.autoRemindersEnabled;
        const next = !previous;
        try {
          args.setAutoRemindersEnabled(next);
          await args.persistReminderSettingsForSite({ auto_reminders_enabled: next });
          args.toast(next ? 'Auto reminders enabled' : 'Auto reminders paused', 'success');
        } catch {
          args.setAutoRemindersEnabled(previous);
          args.toast('Couldn’t save auto reminder setting.', 'error');
        }
      })();
    },
    onSendFilteredInvitations: () => {
      if (!ensureCanEditGuests()) return;
      void args.handleSendBulkInvitations();
    },
    onSendSelectedInvitations: () => {
      if (!ensureCanEditGuests()) return;
      void args.handleSendSelectedInvitations();
    },
    onToggleCheckInMode: () => {
      if (!ensureCanEditGuests()) return;
      args.setCheckInMode((value: boolean) => !value);
      args.setViewMode('list');
    },
    onToggleConflictDetails: () => args.setShowConflictDetails((value: boolean) => !value),
    onToggleHouseholdsView: () => {
      args.setCheckInMode(false);
      args.setViewMode((value: string) => (value === 'households' ? 'list' : 'households'));
    },
    onToggleInsights: () => args.setShowInsights((value: boolean) => !value),
    onUndoLastCheckIn: () => {
      if (!ensureCanEditGuests()) return;
      void args.handleUndoLastCheckIn();
    },
  };
}
