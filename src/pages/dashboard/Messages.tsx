import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { canComposeDashboardMessages } from '../../lib/plannerAccess';
import { getMessageTemplateCoupleLabel } from './messageTemplateVariables';
import { buildMessageAudienceOptions, filterMessageAudienceGuests, getMessageAudienceDetail } from '../../lib/messageAudienceSegments';
import { buildGuestMessageLanguagePreviews, deriveGuestMessagePreviewLanguages } from '../../lib/guestMessageLanguagePreview';
import {
  type Guest,
  type Message,
} from './messages/messageDashboardTypes';
import {
  COMPOSER_TEMPLATES,
  buildCampaignStatusSummary,
  countStoredPhotoAlbumLinks,
  getPreferredStoredPhotoAlbumLink,
  safeMessagesError,
} from './messages/messageDashboardUtils';
import {
  writeDemoMessages,
} from './messages/messageDemoStorage';
import { triggerScheduledMessageDispatch } from './messages/messageService';
import { useMessageDeliveryActions } from './messages/useMessageDeliveryActions';
import { useMessageComposeActions } from './messages/useMessageComposeActions';
import { useMessageDashboardContinuitySync } from './messages/useMessageDashboardContinuitySync';
import { useMessageDashboardData } from './messages/useMessageDashboardData';
import { useMessageComposerDraftActions } from './messages/useMessageComposerDraftActions';
import { useMessageComposerHistoryActions } from './messages/useMessageComposerHistoryActions';
import { useMessageDashboardPrefillSync } from './messages/useMessageDashboardPrefillSync';
import { buildMessageDashboardViewProps } from './messages/buildMessageDashboardViewProps';
import { buildMessageDashboardDerivedState } from './messages/buildMessageDashboardDerivedState';
import { useMessageDashboardUiState } from './messages/useMessageDashboardUiState';
import { useMessageBillingActions } from './messages/useMessageBillingActions';
import { MessageDashboardRouteView } from './messages/MessageDashboardRouteView';

export const DashboardMessages: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    activeSiteRole,
    buyingPack,
    deliveries,
    editingMessageId,
    eventGuestIds,
    formData,
    guests,
    historyAudienceFilter,
    historyCampaignFilter,
    historyChannelFilter,
    historyDeliveryFilter,
    historySearch,
    historyStatusFilter,
    itineraryAudienceOptions,
    loading,
    messages,
    messagesPermissions,
    messagesRole,
    savedTemplates,
    sending,
    setActiveSiteRole,
    setBuyingPack,
    setDeliveries,
    setEditingMessageId,
    setEventGuestIds,
    setFormData,
    setGuests,
    setHistoryAudienceFilter,
    setHistoryCampaignFilter,
    setHistoryChannelFilter,
    setHistoryDeliveryFilter,
    setHistorySearch,
    setHistoryStatusFilter,
    setItineraryAudienceOptions,
    setLoading,
    setMessages,
    setMessagesPermissions,
    setMessagesRole,
    setSavedTemplates,
    setSending,
    setShowRecipientPreview,
    setShowSendingDetails,
    setSmsExpiringSoon,
    setSmsTransactions,
    setViewingMessage,
    setWeddingSite,
    showRecipientPreview,
    showSendingDetails,
    smsExpiringSoon,
    smsTransactions,
    toast,
    toasts,
    viewingMessage,
    weddingSite,
  } = useMessageDashboardUiState();
  const { handleBuySmsPack } = useMessageBillingActions({
    setBuyingPack,
    toast,
    weddingSite,
  });

  const {
    fetchWeddingSite,
    fetchMessages,
    fetchGuests,
    fetchSmsExpiryPreview,
  } = useMessageDashboardData({
    userId: user?.id ?? null,
    isDemoMode,
    viewingMessage,
    messages,
    weddingSite,
    toast,
    setWeddingSite,
    setMessages,
    setDeliveries,
    setGuests,
    setLoading,
    setSmsTransactions,
    setSmsExpiringSoon,
    setItineraryAudienceOptions,
    setEventGuestIds,
    setMessagesRole,
    setActiveSiteRole,
    setMessagesPermissions,
  });

  useEffect(() => {
    if (!isDemoMode) return;
    writeDemoMessages(messages);
  }, [isDemoMode, messages]);

  const getRecipients = (audience: string): Guest[] => {
    return filterMessageAudienceGuests(guests, audience, eventGuestIds);
  };

  const knownPhotoLinksCount = useMemo(() => countStoredPhotoAlbumLinks(), []);

  const applyTemplateVariables = (text: string) => {
    const couple = getMessageTemplateCoupleLabel(weddingSite?.couple_first_name, weddingSite?.couple_second_name);
    const rsvpLink = `${window.location.origin}/rsvp`;

    const siteParam = weddingSite?.site_slug ? `?site=${encodeURIComponent(weddingSite.site_slug)}` : '';
    let photoLink = `${window.location.origin}/photos/upload${siteParam}`;
    photoLink = getPreferredStoredPhotoAlbumLink() ?? photoLink;

    return text
      .replace(/\[COUPLE\]/g, couple)
      .replace(/\[RSVP LINK\]/g, rsvpLink)
      .replace(/\[PHOTO LINK\]/g, photoLink)
      .replace(/\[DATE\]/g, 'our wedding date')
      .replace(/\[VENUE\]/g, 'our venue')
      .replace(/\[ADD DETAILS\]/g, 'timeline, parking, dress code, and arrival instructions');
  };

  const selectedTemplate = COMPOSER_TEMPLATES.find((tpl) => tpl.key === formData.templateKey) ?? COMPOSER_TEMPLATES[0];
  const previewLanguages = useMemo(() => deriveGuestMessagePreviewLanguages(
    filterMessageAudienceGuests(guests, formData.audience, eventGuestIds),
    weddingSite?.default_language ?? null,
  ), [eventGuestIds, formData.audience, guests, weddingSite?.default_language]);
  const languagePreviews = useMemo(() => buildGuestMessageLanguagePreviews({
    templateKey: formData.templateKey,
    subject: formData.subject,
    body: formData.body,
    languages: previewLanguages,
  }), [formData.body, formData.subject, formData.templateKey, previewLanguages]);

  const campaignStatusSummary = useMemo(() => buildCampaignStatusSummary(messages), [messages]);

  const audienceOptions = [
    ...buildMessageAudienceOptions(guests),
    ...itineraryAudienceOptions,
  ];
  const HARD_EMAIL_CAP = 1000;
  const derivedState = useMemo(() => buildMessageDashboardDerivedState({
    audienceOptions,
    deliveries,
    eventGuestIds,
    formData,
    guests,
    hardEmailCap: HARD_EMAIL_CAP,
    historyAudienceFilter,
    historyCampaignFilter,
    historyChannelFilter,
    historyDeliveryFilter,
    historySearch,
    historyStatusFilter,
    itineraryAudienceOptions,
    messages,
    weddingSiteSmsCredits: weddingSite?.sms_credits_balance,
  }), [
    audienceOptions,
    deliveries,
    eventGuestIds,
    formData,
    guests,
    historyAudienceFilter,
    historyCampaignFilter,
    historyChannelFilter,
    historyDeliveryFilter,
    historySearch,
    historyStatusFilter,
    itineraryAudienceOptions,
    messages,
    weddingSite?.sms_credits_balance,
  ]);
  const {
    activeCampaignLatestMessage,
    activeCampaignThread,
    activeRecipients,
    audienceBreakdown,
    audienceReachability,
    campaignThreads,
    channelBreakdown,
    channelDeliveryBreakdown,
    channelEngagementBreakdown,
    deliveryHealth,
    deliveryStats,
    emailCapacityAfterSend,
    emailCapacityEnough,
    filteredHistory,
    historyStatusCounts,
    previewRecipients,
    providerTelemetry,
    recipientsWithEmail,
    recipientsWithSmsConsent,
    remainingEmailRecipients,
    retryCandidates,
    reviewCandidates,
    selectedScheduleIsPast,
    smsCredits,
    smsCreditsNeeded,
    smsCreditsSufficient,
    smsProviderEnabled,
    smsSegmentCount,
    unreachableRecipients,
    usedEmailRecipients,
  } = derivedState;
  const selectedAudience = derivedState.selectedAudience;
  const selectedAudienceDetail = getMessageAudienceDetail(formData.audience, audienceOptions);
  const {
    applyComposerTemplate,
    applySavedTemplate,
    applySaveTheDatePreset,
    applyEventReminderDraft,
    applyDayOfAlertPreset,
    deleteSavedTemplate,
    quickCreateSaveTheDateCampaign,
    saveCurrentComposerAsTemplate,
  } = useMessageComposerDraftActions({
    weddingSite,
    guests,
    isDemoMode,
    formData,
    savedTemplates,
    audienceOptions,
    selectedAudience,
    selectedTemplateLabel: selectedTemplate.label,
    applyTemplateVariables,
    fetchMessages,
    toast,
    setMessages,
    setEditingMessageId,
    setFormData,
    setSavedTemplates,
  });
  useMessageDashboardPrefillSync({
    location,
    navigate,
    fetchWeddingSite,
    fetchSmsExpiryPreview,
    applyComposerTemplate,
    toast,
    setEditingMessageId,
    setFormData,
    setShowRecipientPreview,
  });
  useMessageDashboardContinuitySync({
    hasWeddingSite: !!weddingSite,
    isDemoMode,
    fetchGuests,
    fetchMessages,
  });
  const { handleSendMessage } = useMessageComposeActions({
    weddingSite,
    isDemoMode,
    formData,
    selectedAudience,
    selectedTemplate,
    editingMessageId,
    smsCredits,
    smsCreditsNeeded,
    smsCreditsSufficient,
    messagesChannel: formData.channel,
    getRecipients,
    fetchMessages,
    toast,
    setSending,
    setMessages,
    setShowRecipientPreview,
    setEditingMessageId,
    setFormData,
  });

  const canCompose = canComposeDashboardMessages(messagesRole, messagesPermissions);
  const {
    handleCancelSchedule,
    handleExcludeSkippedRecipients,
    handleRescheduleMessage,
    handleRetry,
    handleRetryFailedRecipients,
    handleRunDueScheduledMessages,
    handleSendScheduledNow,
    processingScheduled,
    retryingMessageId,
  } = useMessageDeliveryActions({
    canCompose,
    deliveries,
    fetchMessages,
    getRecipients,
    isDemoMode,
    isSmsProviderEnabled: smsProviderEnabled,
    messages,
    setMessages,
    toast,
  });
  const {
    loadMessageIntoComposer,
    startFollowUpFromCampaignThread,
    startScheduledFollowUpFromCampaignThread,
  } = useMessageComposerHistoryActions({
    activeCampaignLatestMessage,
    activeCampaignThreadName: activeCampaignThread?.name ?? null,
    messagesRole,
    messagesPermissions,
    applyComposerTemplate,
    toast,
    setEditingMessageId,
    setFormData,
    setShowRecipientPreview,
  });

  const messageDashboardViewProps = buildMessageDashboardViewProps({
    activeRecipients,
    activeSiteRole,
    activeCampaignLatestMessage,
    activeCampaignThread,
    audienceBreakdown,
    audienceOptions,
    audienceReachability,
    buyingPack,
    campaignStatusSummary,
    campaignThreads,
    canCompose,
    channelBreakdown,
    channelDeliveryBreakdown,
    channelEngagementBreakdown,
    composerFormData: formData,
    coupleEmail: weddingSite?.couple_email,
    deliveredRate: deliveryStats.rate,
    deliveries,
    deliveryHealth,
    deliveryTargeted: deliveryStats.targeted,
    emailCapacityAfterSend,
    emailCapacityEnough,
    filteredHistory,
    guests,
    hardEmailCap: HARD_EMAIL_CAP,
    historyAudienceFilter,
    historyCampaignFilter,
    historyChannelFilter,
    historyDeliveryFilter,
    historySearch,
    historyStatusCounts,
    historyStatusFilter,
    knownPhotoLinksCount,
    languagePreviews,
    messages,
    messagesRole,
    overdueScheduled: deliveryHealth.overdueScheduled,
    previewRecipients,
    processingScheduled,
    providerTelemetry,
    reachSnapshotCanCompose: canCompose,
    recipientsWithEmail,
    recipientsWithSmsConsent,
    remainingEmailRecipients,
    retryCandidates,
    retryingMessageId,
    reviewCandidates,
    savedTemplates,
    scheduledCount: deliveryStats.scheduled,
    selectedAudienceCount: selectedAudience?.count || 0,
    selectedAudienceDetail,
    selectedScheduleIsPast,
    selectedTemplateDetail: selectedTemplate.detail,
    sending,
    showRecipientPreview,
    showSendingDetails,
    smsCredits,
    smsCreditsNeeded,
    smsCreditsSufficient,
    smsExpiringSoon,
    smsProviderEnabled,
    smsSegmentCount,
    smsTransactions,
    startingPointsCanCompose: canCompose,
    toasts,
    unreachableRecipients,
    usedEmailRecipients,
    viewingMessage,
    onApplyComposerTemplate: applyComposerTemplate,
    onApplyDayOfAlertPreset: applyDayOfAlertPreset,
    onApplySaveTheDatePreset: applySaveTheDatePreset,
    onApplySavedTemplate: applySavedTemplate,
    onBuySmsPack: (pack: 'sms_100' | 'sms_500' | 'sms_1000') => { void handleBuySmsPack(pack); },
    onCancelSchedule: (message: Message) => { void handleCancelSchedule(message); },
    onCancelScheduleDetailMessage: handleCancelSchedule,
    onClearThreadFilter: () => { setHistoryCampaignFilter(''); setHistorySearch(''); },
    onCloseDetailModal: () => setViewingMessage(null),
    onDeleteSavedTemplate: deleteSavedTemplate,
    onDuplicateLatest: (message: Message) => loadMessageIntoComposer(message, 'duplicate'),
    onEditLatest: (message: Message) => loadMessageIntoComposer(message, 'edit'),
    onLoadIntoComposer: loadMessageIntoComposer,
    onNavigatePhotos: () => navigate('/dashboard/photos'),
    onQuickCreateSaveTheDateCampaign: () => { void quickCreateSaveTheDateCampaign(); },
    onRescheduleDetailMessage: handleRescheduleMessage,
    onRescheduleHistoryMessage: (message: Message) => {
      loadMessageIntoComposer(message, 'edit');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onRetry: (message: Message) => { void handleRetry(message); },
    onRetryDetailMessage: handleRetry,
    onRetryFailedRecipientsDetailMessage: handleRetryFailedRecipients,
    onExcludeSkippedRecipientsDetailMessage: handleExcludeSkippedRecipients,
    onRunDueScheduledMessages: handleRunDueScheduledMessages,
    onSaveCurrentComposerAsTemplate: saveCurrentComposerAsTemplate,
    onScheduleFollowUp: startScheduledFollowUpFromCampaignThread,
    onSelectThread: (threadName: string) => {
      setHistoryCampaignFilter(threadName);
      setHistorySearch('');
    },
    onSendScheduledNow: (message: Message) => { void handleSendScheduledNow(message); },
    onSendScheduledNowDetailMessage: handleSendScheduledNow,
    onSetFormData: setFormData,
    onSetHistoryAudienceFilter: setHistoryAudienceFilter,
    onSetHistoryCampaignFilter: setHistoryCampaignFilter,
    onSetHistoryChannelFilter: setHistoryChannelFilter,
    onSetHistoryDeliveryFilter: setHistoryDeliveryFilter,
    onSetHistorySearch: setHistorySearch,
    onSetHistoryStatusFilter: setHistoryStatusFilter,
    onSetMessagesRole: setMessagesRole,
    onStartFollowUp: startFollowUpFromCampaignThread,
    onSubmitComposer: (e: React.FormEvent) => { void handleSendMessage(e, false); },
    onSubmitDraftComposer: (e: React.FormEvent) => { void handleSendMessage(e, true); },
    onToggleRecipientPreview: () => setShowRecipientPreview(!showRecipientPreview),
    onToggleSendingDetails: () => setShowSendingDetails((value) => !value),
    onViewMessage: setViewingMessage,
  });

  return <MessageDashboardRouteView dashboardProps={messageDashboardViewProps} loading={loading} />;
};
