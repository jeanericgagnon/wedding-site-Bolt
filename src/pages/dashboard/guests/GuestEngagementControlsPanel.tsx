import React from 'react';
import { GuestCampaignReminderPanel } from './GuestCampaignReminderPanel';
import { GuestOpsToolbar } from './GuestOpsToolbar';
import { GuestSegmentControlsPanel, type GuestSegmentOption } from './GuestSegmentControlsPanel';
import type { RsvpCampaignPreset } from './guestDashboardStorage';

type GuestReminderPreview = {
  email?: string | null;
  id: string;
  name: string;
};

type GuestRsvpOps = {
  ceremonyNo: number;
  missingMeal: number;
  noResponse: number;
  pendingNoEmail: number;
  plusOneMissingName: number;
  receptionNo: number;
};

type CopyActionResult = 'copied' | 'downloaded';

interface GuestEngagementControlsPanelProps {
  activeSegmentLabel: string;
  autoRemindersEnabled: boolean;
  bulkSending: boolean;
  canEditGuests: boolean;
  campaignPreset: RsvpCampaignPreset;
  campaignReadiness: number;
  checkInMode: boolean;
  checkedInCount: number;
  cleanGuestsView: boolean;
  contactNoContactCount: number;
  csvFileInputRef: React.RefObject<HTMLInputElement>;
  csvImporting: boolean;
  csvMaxFileMb: number;
  csvMaxRows: number;
  csvSelectedFilename: string | null;
  daysToWedding: number | null;
  dueReminderCount: number;
  extraFilterCount: number;
  filterStatus: string;
  guestCount: number;
  hasNextUnresolvedGuest: boolean;
  isDemoMode: boolean;
  lastCheckInGuestName: string | null;
  manualFollowUpCount: number;
  manualHandledCount: number;
  reminderCandidateCount: number;
  reminderCandidates: GuestReminderPreview[];
  rsvpOps: GuestRsvpOps;
  searchQuery: string;
  segmentOptions: GuestSegmentOption[];
  selectedGuestCount: number;
  showCampaignModal: boolean;
  showExceptionBanner: boolean;
  showMissingMealBanner: boolean;
  showNoContactBanner: boolean;
  showOpsMenu: boolean;
  showRecipientPreview: boolean;
  skipRecentlyInvited: boolean;
  viewMode: 'list' | 'households';
  visibleSelectedCount: number;
  onAddGuest: () => void;
  onApplyCampaignPreset: (preset: RsvpCampaignPreset) => void;
  onClearAllCheckIns: () => void;
  onClearFilters: () => void;
  onClearSelection: () => void;
  onCopyAddressCollectionLink: () => Promise<CopyActionResult | null>;
  onCopyChecklist: () => void;
  onCopyContactRequestLink: () => Promise<CopyActionResult | null>;
  onCopyExceptionChecklist: () => Promise<CopyActionResult | null>;
  onCopyFilteredEmails: () => void;
  onCopyMissingContactList: () => Promise<CopyActionResult | null>;
  onCopyMissingMealChecklist: () => Promise<CopyActionResult | null>;
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
  onFocusHandledPersonally: () => void;
  onFocusHighRiskFirst: () => void;
  onFocusMissingContact: () => void;
  onFocusMissingMeal: () => void;
  onFocusPending: () => void;
  onFocusPendingNoEmail: () => void;
  onFocusPlusOneNames: () => void;
  onMarkAllDueThankYous: () => void;
  onNextUnresolved: () => void;
  onOpenCampaignModal: () => void;
  onSearchQueryChange: (value: string) => void;
  onSelectCheckedInFilter: () => void;
  onSelectFiltered: () => void;
  onSelectPrimaryFilter: (value: string) => void;
  onSelectUnresolved: () => void;
  onSendDueReminders: () => void;
  onSendDueRemindersToggle: () => void;
  onSendFilteredInvitations: () => void;
  onSendSelectedInvitations: () => void;
  onSetShowCampaignModal: (show: boolean) => void;
  onSetShowOpsMenu: (show: boolean | ((previous: boolean) => boolean)) => void;
  onSetShowRecipientPreview: (show: boolean | ((previous: boolean) => boolean)) => void;
  onSetSkipRecentlyInvited: (skip: boolean) => void;
  onToggleCheckInMode: () => void;
  onToggleHouseholdsView: () => void;
  onUndoLastCheckIn: () => void;
  onKeepOnlyVisibleSelection: () => void;
}

export function GuestEngagementControlsPanel({
  activeSegmentLabel,
  autoRemindersEnabled,
  bulkSending,
  canEditGuests,
  campaignPreset,
  campaignReadiness,
  checkInMode,
  checkedInCount,
  cleanGuestsView,
  contactNoContactCount,
  csvFileInputRef,
  csvImporting,
  csvMaxFileMb,
  csvMaxRows,
  csvSelectedFilename,
  daysToWedding,
  dueReminderCount,
  extraFilterCount,
  filterStatus,
  guestCount,
  hasNextUnresolvedGuest,
  isDemoMode,
  lastCheckInGuestName,
  manualFollowUpCount,
  manualHandledCount,
  reminderCandidateCount,
  reminderCandidates,
  rsvpOps,
  searchQuery,
  segmentOptions,
  selectedGuestCount,
  showCampaignModal,
  showExceptionBanner,
  showMissingMealBanner,
  showNoContactBanner,
  showOpsMenu,
  showRecipientPreview,
  skipRecentlyInvited,
  viewMode,
  visibleSelectedCount,
  onAddGuest,
  onApplyCampaignPreset,
  onClearAllCheckIns,
  onClearFilters,
  onClearSelection,
  onCopyAddressCollectionLink,
  onCopyChecklist,
  onCopyContactRequestLink,
  onCopyExceptionChecklist,
  onCopyFilteredEmails,
  onCopyMissingContactList,
  onCopyMissingMealChecklist,
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
  onFocusHandledPersonally,
  onFocusHighRiskFirst,
  onFocusMissingContact,
  onFocusMissingMeal,
  onFocusPending,
  onFocusPendingNoEmail,
  onFocusPlusOneNames,
  onMarkAllDueThankYous,
  onNextUnresolved,
  onOpenCampaignModal,
  onSearchQueryChange,
  onSelectCheckedInFilter,
  onSelectFiltered,
  onSelectPrimaryFilter,
  onSelectUnresolved,
  onSendDueReminders,
  onSendDueRemindersToggle,
  onSendFilteredInvitations,
  onSendSelectedInvitations,
  onSetShowCampaignModal,
  onSetShowOpsMenu,
  onSetShowRecipientPreview,
  onSetSkipRecentlyInvited,
  onToggleCheckInMode,
  onToggleHouseholdsView,
  onUndoLastCheckIn,
  onKeepOnlyVisibleSelection,
}: GuestEngagementControlsPanelProps) {
  return (
    <>
      <GuestOpsToolbar
        autoRemindersEnabled={autoRemindersEnabled}
        bulkSending={bulkSending}
        canEditGuests={canEditGuests}
        csvFileInputRef={csvFileInputRef}
        csvImporting={csvImporting}
        csvMaxFileMb={csvMaxFileMb}
        csvMaxRows={csvMaxRows}
        csvSelectedFilename={csvSelectedFilename}
        dueReminderCount={dueReminderCount}
        guestCount={guestCount}
        hasNextUnresolvedGuest={hasNextUnresolvedGuest}
        isDemoMode={isDemoMode}
        reminderCandidateCount={reminderCandidateCount}
        searchQuery={searchQuery}
        selectedGuestCount={selectedGuestCount}
        showOpsMenu={showOpsMenu}
        onAddGuest={onAddGuest}
        onClearAllCheckIns={onClearAllCheckIns}
        onClearSelection={onClearSelection}
        onCopyAddressCollectionLink={onCopyAddressCollectionLink}
        onCopyChecklist={onCopyChecklist}
        onCopyFilteredEmails={onCopyFilteredEmails}
        onCopyMissingContactList={onCopyMissingContactList}
        onCopyTextRsvpLinks={onCopyTextRsvpLinks}
        onCreateChecklist={onCreateChecklist}
        onDeleteAllGuests={onDeleteAllGuests}
        onDryRun={onDryRun}
        onExportAddressCollection={onExportAddressCollection}
        onExportAllGuests={onExportAllGuests}
        onExportAttendingGuests={onExportAttendingGuests}
        onExportCheckedInGuests={onExportCheckedInGuests}
        onExportDeclinedGuests={onExportDeclinedGuests}
        onExportEventAttendance={onExportEventAttendance}
        onExportFilteredGuests={onExportFilteredGuests}
        onExportHouseholdLabels={onExportHouseholdLabels}
        onExportMissingMealChoices={onExportMissingMealChoices}
        onExportPendingRsvp={onExportPendingRsvp}
        onExportRsvpResponders={onExportRsvpResponders}
        onExportThankYouDue={onExportThankYouDue}
        onFileChange={onFileChange}
        onMarkAllDueThankYous={onMarkAllDueThankYous}
        onNextUnresolved={onNextUnresolved}
        onSearchQueryChange={onSearchQueryChange}
        onSelectFiltered={onSelectFiltered}
        onSelectUnresolved={onSelectUnresolved}
        onSendDueReminders={onSendDueReminders}
        onSendFilteredInvitations={onSendFilteredInvitations}
        onSendSelectedInvitations={onSendSelectedInvitations}
        onSetShowOpsMenu={onSetShowOpsMenu}
        onToggleAutoReminders={onSendDueRemindersToggle}
      />

      {!cleanGuestsView && (
        <GuestCampaignReminderPanel
          campaignPreset={campaignPreset}
          campaignReadiness={campaignReadiness}
          canEditGuests={canEditGuests}
          contactNoContactCount={contactNoContactCount}
          daysToWedding={daysToWedding}
          manualFollowUpCount={manualFollowUpCount}
          manualHandledCount={manualHandledCount}
          reminderCandidates={reminderCandidates}
          rsvpOps={rsvpOps}
          segmentLabel={activeSegmentLabel}
          showCampaignModal={showCampaignModal}
          showRecipientPreview={showRecipientPreview}
          skipRecentlyInvited={skipRecentlyInvited}
          onApplyCampaignPreset={onApplyCampaignPreset}
          onCloseCampaignModal={() => onSetShowCampaignModal(false)}
          onFocusHandledPersonally={onFocusHandledPersonally}
          onFocusHighRiskFirst={onFocusHighRiskFirst}
          onFocusMissingContact={onFocusMissingContact}
          onFocusMissingMeal={onFocusMissingMeal}
          onFocusPending={onFocusPending}
          onFocusPendingNoEmail={onFocusPendingNoEmail}
          onFocusPlusOneNames={onFocusPlusOneNames}
          onOpenCampaignModal={onOpenCampaignModal}
          onSetShowRecipientPreview={onSetShowRecipientPreview}
          onSetSkipRecentlyInvited={onSetSkipRecentlyInvited}
        />
      )}

      <GuestSegmentControlsPanel
        activeSegmentLabel={activeSegmentLabel}
        canEditGuests={canEditGuests}
        checkInMode={checkInMode}
        checkedInCount={checkedInCount}
        extraFilterCount={extraFilterCount}
        filterStatus={filterStatus}
        lastCheckInGuestName={lastCheckInGuestName}
        searchQuery={searchQuery}
        segmentOptions={segmentOptions}
        selectedGuestCount={selectedGuestCount}
        showExceptionBanner={showExceptionBanner}
        showMissingMealBanner={showMissingMealBanner}
        showNoContactBanner={showNoContactBanner}
        viewMode={viewMode}
        visibleSelectedCount={visibleSelectedCount}
        onClearFilters={onClearFilters}
        onClearSelection={onClearSelection}
        onCopyContactRequestLink={onCopyContactRequestLink}
        onCopyExceptionChecklist={onCopyExceptionChecklist}
        onCopyMissingMealChecklist={onCopyMissingMealChecklist}
        onCopyNoContactChecklist={onCopyMissingContactList}
        onKeepOnlyVisibleSelection={onKeepOnlyVisibleSelection}
        onOpenCampaignModal={onOpenCampaignModal}
        onSelectCheckedInFilter={onSelectCheckedInFilter}
        onSelectPrimaryFilter={onSelectPrimaryFilter}
        onToggleCheckInMode={onToggleCheckInMode}
        onToggleHouseholdsView={onToggleHouseholdsView}
        onUndoLastCheckIn={onUndoLastCheckIn}
      />
    </>
  );
}
