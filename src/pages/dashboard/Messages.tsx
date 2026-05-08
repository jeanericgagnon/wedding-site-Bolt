import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { createSmsCreditsSession } from '../../lib/stripeService';
import { canComposeDashboardMessages, readPlannerAccessRole, writePlannerAccessRole, type PlannerAccessRole, type PlannerPermissionKey } from '../../lib/plannerAccess';
import { getMessageTemplateCoupleLabel } from './messageTemplateVariables';
import { isSmsProviderEnabled } from '../../lib/smsProvider';
import { logAppAction } from '../../lib/actionAudit';
import { buildMessageAudienceOptions, filterMessageAudienceGuests, getMessageAudienceDetail } from '../../lib/messageAudienceSegments';
import { buildGuestMessageLanguagePreviews } from '../../lib/guestMessageLanguagePreview';
import {
  type AudienceOption,
  type ChannelType,
  type DeliveryRow,
  type Guest,
  type Message,
  type MessageTemplateKey,
  type SavedComposerTemplate,
  type SmsCreditTransaction,
  type Toast,
  type WeddingSite,
} from './messages/messageDashboardTypes';
import {
  COMPOSER_TEMPLATES,
  buildCampaignStatusSummary,
  countStoredPhotoAlbumLinks,
  getPreferredStoredPhotoAlbumLink,
  migrateSavedComposerTemplatesStorage,
  readSavedComposerTemplates,
  safeMessagesError,
  type MessageHistoryChannelFilter,
  type MessageHistoryDeliveryFilter,
  type MessageHistoryStatusFilter,
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
import { MessageDashboardRouteView } from './messages/MessageDashboardRouteView';

export const DashboardMessages: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [weddingSite, setWeddingSite] = useState<WeddingSite | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<SavedComposerTemplate[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showRecipientPreview, setShowRecipientPreview] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [viewingMessage, setViewingMessage] = useState<Message | null>(null);
  const [buyingPack, setBuyingPack] = useState<'sms_100' | 'sms_500' | 'sms_1000' | null>(null);
  const [smsExpiringSoon, setSmsExpiringSoon] = useState<number>(0);
  const [smsTransactions, setSmsTransactions] = useState<SmsCreditTransaction[]>([]);
  const [itineraryAudienceOptions, setItineraryAudienceOptions] = useState<AudienceOption[]>([]);
  const [eventGuestIds, setEventGuestIds] = useState<Record<string, Set<string>>>({});
  const [messagesRole, setMessagesRole] = useState<PlannerAccessRole>('owner');
  const [activeSiteRole, setActiveSiteRole] = useState<PlannerAccessRole>('owner');
  const [messagesPermissions, setMessagesPermissions] = useState<PlannerPermissionKey[] | null>(null);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<MessageHistoryStatusFilter>('all');
  const [historyChannelFilter, setHistoryChannelFilter] = useState<MessageHistoryChannelFilter>('all');
  const [historyAudienceFilter, setHistoryAudienceFilter] = useState<string>('all');
  const [historyDeliveryFilter, setHistoryDeliveryFilter] = useState<MessageHistoryDeliveryFilter>('all');
  const [historyCampaignFilter, setHistoryCampaignFilter] = useState<string>('');
  const [historySearch, setHistorySearch] = useState('');
  const [showSendingDetails, setShowSendingDetails] = useState(() => new URLSearchParams(window.location.search).get('details') === '1');

  const [formData, setFormData] = useState({
    campaignName: '',
    templateKey: 'blank' as MessageTemplateKey,
    subject: '',
    body: '',
    audience: 'all',
    channel: 'email' as 'email' | 'sms',
    scheduleType: 'now',
    scheduleDate: '',
    scheduleTime: '',
  });

  useEffect(() => {
    const loaded = readSavedComposerTemplates();
    setSavedTemplates(loaded);
    migrateSavedComposerTemplatesStorage();
  }, []);

  useEffect(() => {
    if (!weddingSite?.id) return;
    try {
      const raw = readPlannerAccessRole('messages', weddingSite.id);
      if (raw) setMessagesRole(raw);
    } catch {}
  }, [weddingSite?.id]);

  useEffect(() => {
    if (!weddingSite?.id) return;
    try {
      writePlannerAccessRole('messages', weddingSite?.id ?? null, messagesRole);
    } catch {
      // noop
    }
  }, [weddingSite?.id, messagesRole]);

  function toast(message: string, type: Toast['type'] = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  async function handleBuySmsPack(pack: 'sms_100' | 'sms_500' | 'sms_1000') {
    if (!weddingSite) return;
    if (!isSmsProviderEnabled()) {
      toast('Text credit purchases will open after the final texting setup is complete.', 'info');
      return;
    }
    setBuyingPack(pack);
    try {
      const base = window.location.origin;
      const success = `${base}/dashboard/messages?smsCredits=success`;
      const cancel = `${base}/dashboard/messages?smsCredits=cancel`;
      const url = await createSmsCreditsSession(weddingSite.id, success, cancel, pack);
      void logAppAction({
        weddingSiteId: weddingSite.id,
        area: 'billing',
        type: 'sms_credits_checkout_started',
        summary: 'Text credits checkout was started.',
        targetId: weddingSite.id,
        targetLabel: 'Text credits',
        metadata: {
          pack,
          currentCredits: weddingSite.sms_credits_balance ?? 0,
        },
      });
      window.location.href = url;
    } catch (err) {
      toast(safeMessagesError(err, 'Couldn’t open checkout right now. Please try again.'), 'error');
    } finally {
      setBuyingPack(null);
    }
  }

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
  const languagePreviews = useMemo(() => buildGuestMessageLanguagePreviews({
    templateKey: formData.templateKey,
    subject: formData.subject,
    body: formData.body,
    languages: ['en', 'es', 'fr'],
  }), [formData.body, formData.subject, formData.templateKey]);

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
    handleRescheduleMessage,
    handleRetry,
    handleRunDueScheduledMessages,
    handleSendScheduledNow,
    processingScheduled,
    retryingMessageId,
  } = useMessageDeliveryActions({
    canCompose,
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
