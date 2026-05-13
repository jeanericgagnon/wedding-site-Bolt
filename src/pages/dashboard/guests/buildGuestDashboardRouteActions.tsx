import { Badge } from '../../../components/ui';
import { getGuestIssueCount } from './guestDashboardUtils';

export function buildGuestDashboardRouteActions(args: any) {
  const selectUnresolvedGuests = () => {
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
      args.resetForm();
      args.setShowAddModal(true);
    },
    onClearAllCheckIns: () => { void args.handleClearAllCheckIns(); },
    onCopyAddressCollectionLink: () => { void args.copyContactRequestLink(); },
    onCopyChecklist: () => { void args.handleCopyChecklist(); },
    onCopyContactRequestLink: () => { void args.copyContactRequestLink(); },
    onCopyExceptionChecklist: () => { void args.handleCopyExceptionChecklist(); },
    onCopyFilteredEmails: () => { void args.handleCopyFilteredEmails(); },
    onCopyMissingContactList: () => { void args.handleCopyNoContactChecklist(); },
    onCopyMissingMealChecklist: () => { void args.handleCopyMissingMealChecklist(); },
    onCopyTextRsvpLinks: () => { void args.copySmsRsvpLinksForFiltered(); },
    onDeleteAllGuests: () => {
      args.setDeleteAllConfirmInput('');
      args.setShowDeleteAllModal(true);
    },
    onDeleteGuest: (guestId: string) => { void args.handleDeleteGuest(guestId, args.confirmDeleteId); },
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
    onHeaderAddGuest: () => args.setShowAddModal(true),
    onMarkAllDueThankYous: () => { void args.handleMarkAllDueThankYous(); },
    onMergeIntoHousehold: () => args.handleMergeIntoHousehold(args.selectedGuestIds, () => args.setSelectedGuestIds(new Set())),
    onNextUnresolved: () => {
      if (!args.nextUnresolvedGuest) return;
      args.setSearchQuery(
        (args.nextUnresolvedGuest.first_name || args.nextUnresolvedGuest.last_name)
          ? `${args.nextUnresolvedGuest.first_name ?? ''} ${args.nextUnresolvedGuest.last_name ?? ''}`.trim()
          : args.nextUnresolvedGuest.name,
      );
      args.setViewMode('list');
    },
    onOpenCampaignModal: () => args.setShowCampaignModal(true),
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
    onSendDueReminders: () => { void args.handleSendDueRemindersNow(); },
    onSendDueRemindersToggle: () => {
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
    onSendFilteredInvitations: () => { void args.handleSendBulkInvitations(); },
    onSendSelectedInvitations: () => { void args.handleSendSelectedInvitations(); },
    onToggleCheckInMode: () => {
      args.setCheckInMode((value: boolean) => !value);
      args.setViewMode('list');
    },
    onToggleConflictDetails: () => args.setShowConflictDetails((value: boolean) => !value),
    onToggleHouseholdsView: () => {
      args.setCheckInMode(false);
      args.setViewMode((value: string) => (value === 'households' ? 'list' : 'households'));
    },
    onToggleInsights: () => args.setShowInsights((value: boolean) => !value),
    onUndoLastCheckIn: () => { void args.handleUndoLastCheckIn(); },
  };
}
