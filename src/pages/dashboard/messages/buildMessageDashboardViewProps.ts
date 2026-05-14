import type React from 'react';
import type { ComponentProps } from 'react';
import type { PlannerAccessRole } from '../../../lib/plannerAccess';
import { MessageDashboardView } from './MessageDashboardView';
import { MessageDetailModal } from './MessageDetailModal';
import type { Message, Guest } from './messageDashboardTypes';

type DashboardProps = ComponentProps<typeof MessageDashboardView>;

export type BuildMessageDashboardViewPropsArgs = {
  activeRecipients: number;
  activeSiteRole: PlannerAccessRole;
  activeCampaignLatestMessage: Message | null;
  activeCampaignThread: DashboardProps['historyProps']['activeCampaignThread'];
  audienceBreakdown: DashboardProps['historyProps']['audienceBreakdown'];
  audienceOptions: DashboardProps['composerProps']['audienceOptions'];
  audienceReachability: DashboardProps['composerProps']['audienceReachability'];
  buyingPack: DashboardProps['composerProps']['buyingPack'];
  campaignStatusSummary: DashboardProps['historyProps']['campaignStatusSummary'];
  campaignThreads: DashboardProps['historyProps']['campaignThreads'];
  canCompose: boolean;
  channelBreakdown: DashboardProps['historyProps']['channelBreakdown'];
  channelEngagementBreakdown: DashboardProps['historyProps']['channelEngagementBreakdown'];
  composerFormData: DashboardProps['composerProps']['formData'];
  coupleEmail: string | null | undefined;
  deliveredRate: number;
  deliveries: DashboardProps['historyProps']['deliveries'];
  deliveryHealth: DashboardProps['historyProps']['deliveryHealth'];
  deliveryTargeted: number;
  emailCapacityAfterSend: number;
  emailCapacityEnough: boolean;
  filteredHistory: DashboardProps['historyProps']['filteredHistory'];
  guests: Guest[];
  hardEmailCap: number;
  historyAudienceFilter: DashboardProps['historyProps']['historyAudienceFilter'];
  historyCampaignFilter: DashboardProps['historyProps']['historyCampaignFilter'];
  historyChannelFilter: DashboardProps['historyProps']['historyChannelFilter'];
  historyDeliveryFilter: DashboardProps['historyProps']['historyDeliveryFilter'];
  historySearch: DashboardProps['historyProps']['historySearch'];
  historyStatusCounts: DashboardProps['historyProps']['historyStatusCounts'];
  historyStatusFilter: DashboardProps['historyProps']['historyStatusFilter'];
  knownPhotoLinksCount: number;
  languagePreviews: DashboardProps['composerProps']['languagePreviews'];
  messages: Message[];
  messagesRole: PlannerAccessRole;
  overdueScheduled: number;
  previewRecipients: DashboardProps['composerProps']['previewRecipients'];
  processingScheduled: boolean;
  providerTelemetry: DashboardProps['historyProps']['providerTelemetry'];
  reachSnapshotCanCompose: boolean;
  recipientsWithEmail: number;
  recipientsWithSmsConsent: number;
  remainingEmailRecipients: number;
  retryCandidates: DashboardProps['historyProps']['retryCandidates'];
  retryingMessageId: string | null;
  reviewCandidates: DashboardProps['historyProps']['reviewCandidates'];
  savedTemplates: DashboardProps['savedTemplatesProps']['savedTemplates'];
  scheduledCount: number;
  selectedAudienceCount: number;
  selectedAudienceDetail: DashboardProps['composerProps']['selectedAudienceDetail'];
  selectedScheduleIsPast: boolean;
  selectedTemplateDetail: string;
  sending: boolean;
  showRecipientPreview: boolean;
  showSendingDetails: boolean;
  smsCredits: number;
  smsCreditsNeeded: number;
  smsCreditsSufficient: boolean;
  smsExpiringSoon: number;
  smsProviderEnabled: boolean;
  smsSegmentCount: number;
  smsTransactions: DashboardProps['sendingDetailsProps']['smsTransactions'];
  startingPointsCanCompose: boolean;
  toasts: DashboardProps['toasts'];
  unreachableRecipients: number;
  usedEmailRecipients: number;
  viewingMessage: Message | null;
  onApplyComposerTemplate: DashboardProps['composerProps']['applyComposerTemplate'];
  onApplyDayOfAlertPreset: DashboardProps['reachSnapshotProps']['onApplyDayOfAlertPreset'];
  onApplySaveTheDatePreset: DashboardProps['reachSnapshotProps']['onApplySaveTheDatePreset'];
  onApplySavedTemplate: DashboardProps['savedTemplatesProps']['onApplySavedTemplate'];
  onBuySmsPack: DashboardProps['composerProps']['onBuySmsPack'];
  onCancelSchedule: DashboardProps['historyProps']['onCancelSchedule'];
  onCancelScheduleDetailMessage: ComponentProps<typeof MessageDetailModal>['onCancelSchedule'];
  onClearThreadFilter: DashboardProps['historyProps']['onClearThreadFilter'];
  onCloseDetailModal: ComponentProps<typeof MessageDetailModal>['onClose'];
  onDeleteSavedTemplate: DashboardProps['savedTemplatesProps']['onDeleteSavedTemplate'];
  onDuplicateLatest: DashboardProps['historyProps']['onDuplicateLatest'];
  onEditLatest: DashboardProps['historyProps']['onEditLatest'];
  onLoadIntoComposer: ComponentProps<typeof MessageDetailModal>['onLoadIntoComposer'];
  onNavigatePhotos: DashboardProps['reachSnapshotProps']['onNavigatePhotos'];
  onQuickCreateSaveTheDateCampaign: DashboardProps['reachSnapshotProps']['onQuickCreateSaveTheDateCampaign'];
  onRescheduleDetailMessage: ComponentProps<typeof MessageDetailModal>['onReschedule'];
  onRescheduleHistoryMessage: DashboardProps['historyProps']['onRescheduleMessage'];
  onRetry: DashboardProps['historyProps']['onRetry'];
  onRetryDetailMessage: ComponentProps<typeof MessageDetailModal>['onRetry'];
  onRetryFailedRecipientsDetailMessage: ComponentProps<typeof MessageDetailModal>['onRetryFailedRecipients'];
  onExcludeSkippedRecipientsDetailMessage: ComponentProps<typeof MessageDetailModal>['onExcludeSkippedRecipients'];
  onRunDueScheduledMessages: DashboardProps['onRunDueScheduledMessages'];
  onSaveCurrentComposerAsTemplate: DashboardProps['composerProps']['onSaveCurrentComposerAsTemplate'];
  onScheduleFollowUp: DashboardProps['historyProps']['onScheduleFollowUp'];
  onSelectThread: DashboardProps['historyProps']['onSelectThread'];
  onSendScheduledNow: DashboardProps['historyProps']['onSendScheduledNow'];
  onSendScheduledNowDetailMessage: ComponentProps<typeof MessageDetailModal>['onSendScheduledNow'];
  onSetFormData: DashboardProps['composerProps']['onSetFormData'];
  onSetHistoryAudienceFilter: DashboardProps['historyProps']['onSetHistoryAudienceFilter'];
  onSetHistoryCampaignFilter: DashboardProps['historyProps']['onSetHistoryCampaignFilter'];
  onSetHistoryChannelFilter: DashboardProps['historyProps']['onSetHistoryChannelFilter'];
  onSetHistoryDeliveryFilter: DashboardProps['historyProps']['onSetHistoryDeliveryFilter'];
  onSetHistorySearch: DashboardProps['historyProps']['onSetHistorySearch'];
  onSetHistoryStatusFilter: DashboardProps['historyProps']['onSetHistoryStatusFilter'];
  onSetMessagesRole: DashboardProps['onSetMessagesRole'];
  onStartFollowUp: DashboardProps['historyProps']['onStartFollowUp'];
  onSubmitComposer: DashboardProps['composerProps']['onSubmit'];
  onSubmitDraftComposer: DashboardProps['composerProps']['onSubmitDraft'];
  onToggleRecipientPreview: DashboardProps['composerProps']['onToggleRecipientPreview'];
  onToggleSendingDetails: DashboardProps['toggleSendingDetails'];
  onViewMessage: DashboardProps['historyProps']['onViewMessage'];
};

export function buildMessageDashboardViewProps(args: BuildMessageDashboardViewPropsArgs): DashboardProps {
  const detailModalProps = args.viewingMessage
    ? {
        message: args.viewingMessage,
        deliveries: args.deliveries,
        canManageCampaigns: args.canCompose,
        onClose: args.onCloseDetailModal,
        onRetry: args.onRetryDetailMessage,
        onRetryFailedRecipients: args.onRetryFailedRecipientsDetailMessage,
        onExcludeSkippedRecipients: args.onExcludeSkippedRecipientsDetailMessage,
        onSendScheduledNow: args.onSendScheduledNowDetailMessage,
        onReschedule: args.onRescheduleDetailMessage,
        onCancelSchedule: args.onCancelScheduleDetailMessage,
        onLoadIntoComposer: args.onLoadIntoComposer,
      }
    : null;

  return {
    activeSiteRole: args.activeSiteRole,
    composerProps: {
      activeRecipients: args.activeRecipients,
      applyComposerTemplate: args.onApplyComposerTemplate,
      audienceOptions: args.audienceOptions,
      audienceReachability: args.audienceReachability,
      buyingPack: args.buyingPack,
      canCompose: args.canCompose,
      emailCapacityAfterSend: args.emailCapacityAfterSend,
      emailCapacityEnough: args.emailCapacityEnough,
      formData: args.composerFormData,
      languagePreviews: args.languagePreviews,
      onBuySmsPack: args.onBuySmsPack,
      onSaveCurrentComposerAsTemplate: args.onSaveCurrentComposerAsTemplate,
      onSetFormData: args.onSetFormData,
      onSubmit: args.onSubmitComposer,
      onSubmitDraft: args.onSubmitDraftComposer,
      onToggleRecipientPreview: args.onToggleRecipientPreview,
      previewRecipients: args.previewRecipients,
      recipientsWithEmail: args.recipientsWithEmail,
      recipientsWithSmsConsent: args.recipientsWithSmsConsent,
      remainingEmailRecipients: args.remainingEmailRecipients,
      selectedAudienceCount: args.selectedAudienceCount,
      selectedAudienceDetail: args.selectedAudienceDetail,
      selectedScheduleIsPast: args.selectedScheduleIsPast,
      selectedTemplateDetail: args.selectedTemplateDetail,
      sending: args.sending,
      showRecipientPreview: args.showRecipientPreview,
      smsCredits: args.smsCredits,
      smsCreditsNeeded: args.smsCreditsNeeded,
      smsCreditsSufficient: args.smsCreditsSufficient,
      smsProviderEnabled: args.smsProviderEnabled,
      smsSegmentCount: args.smsSegmentCount,
      unreachableRecipients: args.unreachableRecipients,
    },
    deliveryRate: args.deliveredRate,
    detailModalProps,
    guestsReached: args.deliveryTargeted,
    historyProps: {
      activeCampaignLatestMessage: args.activeCampaignLatestMessage,
      activeCampaignThread: args.activeCampaignThread,
      audienceBreakdown: args.audienceBreakdown,
      campaignStatusSummary: args.campaignStatusSummary,
      campaignThreads: args.campaignThreads,
      canCompose: args.canCompose,
      channelBreakdown: args.channelBreakdown,
      channelEngagementBreakdown: args.channelEngagementBreakdown,
      deliveries: args.deliveries,
      deliveryHealth: args.deliveryHealth,
      filteredHistory: args.filteredHistory,
      historyAudienceFilter: args.historyAudienceFilter,
      historyCampaignFilter: args.historyCampaignFilter,
      historyChannelFilter: args.historyChannelFilter,
      historyDeliveryFilter: args.historyDeliveryFilter,
      historySearch: args.historySearch,
      historyStatusCounts: args.historyStatusCounts,
      historyStatusFilter: args.historyStatusFilter,
      messages: args.messages,
      providerTelemetry: args.providerTelemetry,
      retryCandidates: args.retryCandidates,
      retryingMessageId: args.retryingMessageId,
      reviewCandidates: args.reviewCandidates,
      onCancelSchedule: args.onCancelSchedule,
      onClearThreadFilter: args.onClearThreadFilter,
      onDuplicateLatest: args.onDuplicateLatest,
      onEditLatest: args.onEditLatest,
      onRescheduleMessage: args.onRescheduleHistoryMessage,
      onRetry: args.onRetry,
      onScheduleFollowUp: args.onScheduleFollowUp,
      onSelectThread: args.onSelectThread,
      onSendScheduledNow: args.onSendScheduledNow,
      onSetHistoryAudienceFilter: args.onSetHistoryAudienceFilter,
      onSetHistoryCampaignFilter: args.onSetHistoryCampaignFilter,
      onSetHistoryChannelFilter: args.onSetHistoryChannelFilter,
      onSetHistoryDeliveryFilter: args.onSetHistoryDeliveryFilter,
      onSetHistorySearch: args.onSetHistorySearch,
      onSetHistoryStatusFilter: args.onSetHistoryStatusFilter,
      onStartFollowUp: args.onStartFollowUp,
      onViewMessage: args.onViewMessage,
    },
    messagesRole: args.messagesRole,
    onRunDueScheduledMessages: args.onRunDueScheduledMessages,
    onSetMessagesRole: args.onSetMessagesRole,
    overdueScheduled: args.overdueScheduled,
    processingScheduled: args.processingScheduled,
    reachSnapshotProps: {
      canCompose: args.reachSnapshotCanCompose,
      guests: args.guests,
      knownPhotoLinksCount: args.knownPhotoLinksCount,
      messages: args.messages,
      onApplyComposerTemplate: args.onApplyComposerTemplate,
      onApplyDayOfAlertPreset: args.onApplyDayOfAlertPreset,
      onApplySaveTheDatePreset: args.onApplySaveTheDatePreset,
      onNavigatePhotos: args.onNavigatePhotos,
      onQuickCreateSaveTheDateCampaign: args.onQuickCreateSaveTheDateCampaign,
    },
    savedTemplatesProps: {
      audienceOptions: args.audienceOptions,
      savedTemplates: args.savedTemplates,
      onApplySavedTemplate: args.onApplySavedTemplate,
      onDeleteSavedTemplate: args.onDeleteSavedTemplate,
    },
    scheduledCount: args.scheduledCount,
    sendingDetailsProps: {
      buyingPack: args.buyingPack,
      coupleEmail: args.coupleEmail,
      hardEmailCap: args.hardEmailCap,
      onBuySmsPack: args.onBuySmsPack,
      remainingEmailRecipients: args.remainingEmailRecipients,
      smsCredits: args.smsCredits,
      smsExpiringSoon: args.smsExpiringSoon,
      smsProviderEnabled: args.smsProviderEnabled,
      smsTransactions: args.smsTransactions,
      usedEmailRecipients: args.usedEmailRecipients,
    },
    showSendingDetails: args.showSendingDetails,
    startingPointsProps: {
      canCompose: args.startingPointsCanCompose,
      onApplyComposerTemplate: args.onApplyComposerTemplate,
    },
    toasts: args.toasts,
    toggleSendingDetails: args.onToggleSendingDetails,
  };
}
