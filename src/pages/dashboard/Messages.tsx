import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { demoEvents, demoGuests, demoWeddingSite } from '../../lib/demoData';
import { createSmsCreditsSession } from '../../lib/stripeService';
import { canComposeDashboardMessages, canEditPlannerSurface, derivePlannerRoleFromPermissions, readPlannerAccessRole, writePlannerAccessRole, type PlannerAccessRole, type PlannerPermissionKey } from '../../lib/plannerAccess';
import { formatMessageEventOptionLabel } from './messageEventDate';
import { formatMessageHistoryDateTime } from './messageHistoryTime';
import { parseScheduleInputToIso } from './messageScheduleTime';
import { getMessageTemplateCoupleLabel } from './messageTemplateVariables';
import { countSmsSegments, estimateSmsCredits } from '../../lib/smsSegments';
import { SMS_PROVIDER_PENDING_COPY, isSmsProviderEnabled } from '../../lib/smsProvider';
import { logAppAction } from '../../lib/actionAudit';
import { buildMessageAudienceOptions, filterMessageAudienceGuests, getMessageAudienceDetail } from '../../lib/messageAudienceSegments';
import { buildGuestMessageLanguagePreviews } from '../../lib/guestMessageLanguagePreview';
import { isFreshRsvpContinuityStorageValue } from '../rsvpContinuityStorage';
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
  buildAudienceBreakdown,
  buildAudienceReachability,
  buildCampaignStatusSummary,
  buildCampaignThreads,
  buildChannelBreakdown,
  buildDeliveryHealth,
  buildDeliveryStats,
  buildHistoryStatusCounts,
  buildProviderTelemetry,
  buildSegmentPerformance,
  canRetryMessageStatus,
  countStoredPhotoAlbumLinks,
  describeRecipientReview,
  filterMessageHistory,
  getCampaignThreadKey,
  getCustomerDeliveryReason,
  getActiveCampaignMessages,
  getActiveCampaignThread,
  getPreferredStoredPhotoAlbumLink,
  getRecipientCount,
  hasReachableEmail,
  hasReachableSms,
  isEmailCapConsumingStatus,
  isPastScheduledTime,
  migrateSavedComposerTemplatesStorage,
  readSavedComposerTemplates,
  safeMessagesError,
  type MessageHistoryChannelFilter,
  type MessageHistoryDeliveryFilter,
  type MessageHistoryStatusFilter,
} from './messages/messageDashboardUtils';
import {
  RSVP_CONTINUITY_EVENT,
  RSVP_CONTINUITY_STORAGE_KEY,
  readDemoMessages,
  writeDemoMessages,
} from './messages/messageDemoStorage';
import {
  isMissingMessageDeliveriesTable,
  loadDashboardMessages,
  loadMessageDeliveries,
  loadMessageGuests,
  loadMessageItineraryAudience,
  loadMessagesActiveSite,
  loadSmsCreditPreview,
  triggerScheduledMessageDispatch,
} from './messages/messageService';
import { useMessageDeliveryActions } from './messages/useMessageDeliveryActions';
import { useMessageComposeActions } from './messages/useMessageComposeActions';
import { useMessageComposerDraftActions } from './messages/useMessageComposerDraftActions';
import { useMessageComposerHistoryActions } from './messages/useMessageComposerHistoryActions';
import { useMessageDashboardPrefillSync } from './messages/useMessageDashboardPrefillSync';
// Optional table: can be missing in lean deployments.
// Start unknown, then permanently disable after one confirmed missing-table miss.
let hasMessageDeliveriesTable: boolean | null = null;
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

  const fetchWeddingSite = useCallback(async () => {
    if (isDemoMode) {
      setWeddingSite({
        id: demoWeddingSite.id,
        couple_first_name: (demoWeddingSite as any).couple_first_name ?? (demoWeddingSite as any).couple_name_1 ?? null,
        couple_second_name: (demoWeddingSite as any).couple_second_name ?? (demoWeddingSite as any).couple_name_2 ?? null,
        couple_email: (demoWeddingSite as any).couple_email ?? null,
        sms_credits_balance: 250,
      });
      return;
    }

    if (!user) {
      setWeddingSite(null);
      setMessages([]);
      setDeliveries([]);
      setGuests([]);
      setSmsTransactions([]);
      setSmsExpiringSoon(0);
      setItineraryAudienceOptions([]);
      setEventGuestIds({});
      setLoading(false);
      return;
    }

    try {
      const { activeSite, weddingSite: loadedWeddingSite } = await loadMessagesActiveSite(user.id);
      setActiveSiteRole(activeSite?.role ?? 'owner');
      setMessagesRole(activeSite?.role ?? 'owner');
      setMessagesPermissions(activeSite?.permissions ?? null);
      if (loadedWeddingSite) setWeddingSite(loadedWeddingSite);
      else {
        setWeddingSite(null);
        setMessages([]);
        setDeliveries([]);
        setGuests([]);
        setSmsTransactions([]);
        setSmsExpiringSoon(0);
        setItineraryAudienceOptions([]);
        setEventGuestIds({});
      }
    } catch {
      toast('Couldn’t load your messages right now. Please try again.', 'error');
      setWeddingSite(null);
      setMessages([]);
      setDeliveries([]);
      setGuests([]);
      setSmsTransactions([]);
      setSmsExpiringSoon(0);
      setItineraryAudienceOptions([]);
      setEventGuestIds({});
      setLoading(false);
    }
  }, [user, isDemoMode]);

  const fetchMessages = useCallback(async () => {
    if (!weddingSite) return;
    if (isDemoMode) {
      setMessages(readDemoMessages());
      setLoading(false);
      return;
    }
    try {
      setMessages(await loadDashboardMessages(weddingSite.id));
    } catch {
      setMessages([]);
      setDeliveries([]);
      toast('Couldn’t load message history right now. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [weddingSite, isDemoMode]);

  const fetchGuests = useCallback(async () => {
    if (!weddingSite) return;
    if (isDemoMode) {
      setGuests(demoGuests.map((g) => ({
        id: g.id,
        email: g.email ?? null,
        phone: (g as any).phone ?? null,
        sms_consent: true,
        rsvp_status: g.rsvp_status ?? 'pending',
        invitation_sent_at: (g as any).invitation_sent_at ?? null,
        reminder_last_sent_at: (g as any).reminder_last_sent_at ?? null,
        mailing_address_line1: (g as any).mailing_address_line1 ?? null,
        mailing_city: (g as any).mailing_city ?? null,
        mailing_state: (g as any).mailing_state ?? null,
        mailing_postal_code: (g as any).mailing_postal_code ?? null,
        meal_choice: (g as any).meal_choice ?? null,
        first_name: g.first_name ?? null,
        last_name: g.last_name ?? null,
        name: g.name,
      })));
      return;
    }
    try {
      setGuests(await loadMessageGuests(weddingSite.id));
    } catch {
      toast('Couldn’t load guest recipients right now. Please try again.', 'error');
      setGuests([]);
    }
  }, [weddingSite, isDemoMode]);

  const fetchDeliveries = useCallback(async () => {
    if (!weddingSite) return;
    if (isDemoMode) {
      setDeliveries([]);
      return;
    }

    const prioritizedMessageIds = viewingMessage
      ? [viewingMessage.id, ...messages.filter((m) => m.id !== viewingMessage.id).slice(0, 49).map((m) => m.id)]
      : messages.slice(0, 50).map((m) => m.id);

    const messageIds = Array.from(new Set(prioritizedMessageIds));
    if (messageIds.length === 0) {
      setDeliveries([]);
      return;
    }

    if (hasMessageDeliveriesTable === false) {
      setDeliveries([]);
      return;
    }

    try {
      const data = await loadMessageDeliveries(messageIds);
      hasMessageDeliveriesTable = true;
      setDeliveries(data || []);
    } catch (error) {
      if (isMissingMessageDeliveriesTable(error)) {
        hasMessageDeliveriesTable = false;
      } else {
        toast('Couldn’t load delivery history right now. Please try again.', 'error');
      }
      setDeliveries([]);
    }
  }, [weddingSite, isDemoMode, messages]);

  const fetchItinerarySegments = useCallback(async () => {
    if (!weddingSite) return;
    try {

    if (isDemoMode) {
      const total = demoGuests.length;
      const demoEventList = (demoEvents && demoEvents.length > 0)
        ? demoEvents.slice(0, 4)
        : [
            { id: 'demo-event-rehearsal', event_name: 'Rehearsal Dinner', event_date: new Date().toISOString().slice(0, 10) },
            { id: 'demo-event-ceremony', event_name: 'Ceremony', event_date: new Date().toISOString().slice(0, 10) },
            { id: 'demo-event-reception', event_name: 'Reception', event_date: new Date().toISOString().slice(0, 10) },
          ];

      const options = demoEventList.map((e, idx) => ({
        value: `event:${e.id}`,
        label: formatMessageEventOptionLabel(e.event_name, e.event_date),
        count: Math.max(0, total - idx * 8),
      }));
      setItineraryAudienceOptions(options);

      const map: Record<string, Set<string>> = {};
      for (const e of demoEventList) {
        map[e.id] = new Set(demoGuests.map((g) => g.id));
      }
      setEventGuestIds(map);
      return;
    }

    const { options, guestIdsByEvent } = await loadMessageItineraryAudience(weddingSite.id);
    setEventGuestIds(guestIdsByEvent);
    setItineraryAudienceOptions(options);
    } catch {
      toast('Couldn’t load itinerary audience segments right now. Please try again.', 'error');
      setItineraryAudienceOptions([]);
      setEventGuestIds({});
    }
  }, [weddingSite, isDemoMode]);

  const fetchSmsExpiryPreview = useCallback(async () => {
    if (!weddingSite) return;
    if (isDemoMode) {
      setSmsExpiringSoon(40);
      setSmsTransactions([
        { id: 'demo-tx-1', credits_delta: 100, reason: 'purchase', created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), expires_at: new Date(Date.now() + 359 * 24 * 60 * 60 * 1000).toISOString(), remaining_credits: 72 },
        { id: 'demo-tx-2', credits_delta: -28, reason: 'usage', created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      ]);
      return;
    }

    try {
      const cutoff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { expiringSoon, transactions } = await loadSmsCreditPreview(weddingSite.id, cutoff);
      setSmsExpiringSoon(expiringSoon);
      setSmsTransactions(transactions);
    } catch {
      toast('Couldn’t load text credit activity right now. Please try again.', 'error');
      setSmsExpiringSoon(0);
      setSmsTransactions([]);
    }
  }, [weddingSite, isDemoMode]);

  useEffect(() => { fetchWeddingSite(); }, [fetchWeddingSite]);
  useEffect(() => {
    if (weddingSite) { fetchMessages(); fetchGuests(); fetchSmsExpiryPreview(); fetchItinerarySegments(); }
  }, [weddingSite, fetchMessages, fetchGuests, fetchSmsExpiryPreview, fetchItinerarySegments]);

  useEffect(() => {
    if (!weddingSite || isDemoMode) return;

    const refreshGuestMessageContinuity = () => {
      void fetchGuests();
      void fetchMessages();
    };

    const handleRsvpContinuityUpdate = () => {
      refreshGuestMessageContinuity();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== RSVP_CONTINUITY_STORAGE_KEY || !isFreshRsvpContinuityStorageValue(event.newValue)) return;
      refreshGuestMessageContinuity();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      refreshGuestMessageContinuity();
    };

    window.addEventListener('focus', refreshGuestMessageContinuity);
    window.addEventListener(RSVP_CONTINUITY_EVENT, handleRsvpContinuityUpdate);
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshGuestMessageContinuity);
      window.removeEventListener(RSVP_CONTINUITY_EVENT, handleRsvpContinuityUpdate);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [weddingSite, isDemoMode, fetchGuests, fetchMessages]);

  useEffect(() => {
    if (weddingSite && messages.length > 0) {
      fetchDeliveries();
    }
  }, [weddingSite, messages, fetchDeliveries]);

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

  const selectedAudience = audienceOptions.find(opt => opt.value === formData.audience);
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
  const recipientsWithEmail = getRecipients(formData.audience).filter(g => hasReachableEmail(g.email)).length;
  const recipientsWithSmsConsent = getRecipients(formData.audience).filter(g => hasReachableSms(g)).length;
  const activeRecipients = formData.channel === 'sms' ? recipientsWithSmsConsent : recipientsWithEmail;
  const previewRecipients = getRecipients(formData.audience).filter((guest) => formData.channel === 'sms' ? hasReachableSms(guest) : hasReachableEmail(guest.email));
  const unreachableRecipients = (selectedAudience?.count ?? 0) - activeRecipients;
  const selectedScheduleIsPast = !!(formData.scheduleDate && formData.scheduleTime)
    && isPastScheduledTime(`${formData.scheduleDate}T${formData.scheduleTime}:00`);
  const smsCredits = weddingSite?.sms_credits_balance ?? 0;
  const smsProviderEnabled = isSmsProviderEnabled();
  const smsSegmentCount = countSmsSegments(formData.body);
  const smsCreditsNeeded = estimateSmsCredits(formData.body, recipientsWithSmsConsent);
  const smsCreditsSufficient = smsCredits >= smsCreditsNeeded;
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
  const HARD_EMAIL_CAP = 1000;
  const usedEmailRecipients = messages
    .filter((m) => m.channel === 'email' && isEmailCapConsumingStatus(m.status))
    .reduce((sum, m) => sum + getRecipientCount(m), 0);
  const remainingEmailRecipients = Math.max(HARD_EMAIL_CAP - usedEmailRecipients, 0);
  const emailCapacityAfterSend = Math.max(remainingEmailRecipients - recipientsWithEmail, 0);
  const emailCapacityEnough = recipientsWithEmail <= remainingEmailRecipients;

  const audienceReachability = useMemo(() => {
    return buildAudienceReachability(getRecipients(formData.audience));
  }, [formData.audience, guests, eventGuestIds]);

  const deliveryStats = useMemo(() => buildDeliveryStats(messages), [messages]);

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

  const filteredHistory = useMemo(() => filterMessageHistory({
    messages,
    deliveries,
    statusFilter: historyStatusFilter,
    channelFilter: historyChannelFilter,
    audienceFilter: historyAudienceFilter,
    deliveryFilter: historyDeliveryFilter,
    campaignFilter: historyCampaignFilter,
    search: historySearch,
  }), [messages, deliveries, historyStatusFilter, historyChannelFilter, historyAudienceFilter, historyCampaignFilter, historyDeliveryFilter, historySearch]);

  const audienceBreakdown = useMemo(() => buildAudienceBreakdown(messages), [messages]);

  const retryCandidates = useMemo(
    () => messages.filter((m) => m.status === 'failed').slice(0, 5),
    [messages],
  );

  const reviewCandidates = useMemo(
    () => messages.filter((m) => m.status === 'partial').slice(0, 5),
    [messages],
  );

  const segmentPerformance = useMemo(() => buildSegmentPerformance(messages, itineraryAudienceOptions), [messages, itineraryAudienceOptions]);

  const historyStatusCounts = useMemo(() => buildHistoryStatusCounts(messages), [messages]);

  const channelBreakdown = useMemo(() => buildChannelBreakdown(messages), [messages]);

  const deliveryHealth = useMemo(() => buildDeliveryHealth(messages, deliveries), [messages, deliveries]);

  const campaignThreads = useMemo(() => buildCampaignThreads(messages, deliveries), [messages, deliveries]);

  const activeCampaignThread = useMemo(() => getActiveCampaignThread({ campaignThreads, historyCampaignFilter, historySearch }), [campaignThreads, historyCampaignFilter, historySearch]);

  const activeCampaignMessages = useMemo(() => getActiveCampaignMessages(messages, activeCampaignThread), [messages, activeCampaignThread]);

  const activeCampaignLatestMessage = activeCampaignMessages[0] ?? null;
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

  const providerTelemetry = useMemo(() => buildProviderTelemetry(messages, deliveries), [messages, deliveries]);

  const messageComposerProps = {
    activeRecipients,
    applyComposerTemplate,
    audienceOptions,
    audienceReachability,
    buyingPack,
    canCompose,
    emailCapacityAfterSend,
    emailCapacityEnough,
    formData,
    languagePreviews,
    onBuySmsPack: (pack: 'sms_100' | 'sms_500' | 'sms_1000') => { void handleBuySmsPack(pack); },
    onSaveCurrentComposerAsTemplate: saveCurrentComposerAsTemplate,
    onSetFormData: setFormData,
    onSubmit: (e: React.FormEvent) => { void handleSendMessage(e, false); },
    onSubmitDraft: (e: React.FormEvent) => { void handleSendMessage(e, true); },
    onToggleRecipientPreview: () => setShowRecipientPreview(!showRecipientPreview),
    previewRecipients,
    recipientsWithEmail,
    recipientsWithSmsConsent,
    remainingEmailRecipients,
    selectedAudienceCount: selectedAudience?.count || 0,
    selectedAudienceDetail,
    selectedScheduleIsPast,
    selectedTemplateDetail: selectedTemplate.detail,
    sending,
    showRecipientPreview,
    smsCredits,
    smsCreditsNeeded,
    smsCreditsSufficient,
    smsProviderEnabled,
    smsSegmentCount,
    unreachableRecipients,
  };
  const messageSendingDetailsProps = {
    buyingPack,
    coupleEmail: weddingSite?.couple_email,
    hardEmailCap: HARD_EMAIL_CAP,
    onBuySmsPack: (pack: 'sms_100' | 'sms_500' | 'sms_1000') => { void handleBuySmsPack(pack); },
    remainingEmailRecipients,
    smsCredits,
    smsExpiringSoon,
    smsProviderEnabled,
    smsTransactions,
    usedEmailRecipients,
  };
  const messageSavedTemplatesProps = {
    audienceOptions,
    savedTemplates,
    onApplySavedTemplate: applySavedTemplate,
    onDeleteSavedTemplate: deleteSavedTemplate,
  };
  const messageReachSnapshotProps = {
    canCompose,
    guests,
    knownPhotoLinksCount,
    messages,
    onApplyComposerTemplate: applyComposerTemplate,
    onApplyDayOfAlertPreset: applyDayOfAlertPreset,
    onApplySaveTheDatePreset: applySaveTheDatePreset,
    onNavigatePhotos: () => navigate('/dashboard/photos'),
    onQuickCreateSaveTheDateCampaign: () => { void quickCreateSaveTheDateCampaign(); },
  };
  const messageStartingPointsProps = {
    canCompose,
    onApplyComposerTemplate: applyComposerTemplate,
  };
  const messageHistoryProps = {
    activeCampaignLatestMessage,
    activeCampaignThread,
    audienceBreakdown,
    campaignStatusSummary,
    campaignThreads,
    canCompose,
    channelBreakdown,
    deliveries,
    deliveryHealth,
    filteredHistory,
    historyAudienceFilter,
    historyCampaignFilter,
    historyChannelFilter,
    historyDeliveryFilter,
    historySearch,
    historyStatusCounts,
    historyStatusFilter,
    messages,
    providerTelemetry,
    retryCandidates,
    retryingMessageId,
    reviewCandidates,
    onCancelSchedule: (message: Message) => { void handleCancelSchedule(message); },
    onClearThreadFilter: () => { setHistoryCampaignFilter(''); setHistorySearch(''); },
    onDuplicateLatest: (message: Message) => loadMessageIntoComposer(message, 'duplicate'),
    onEditLatest: (message: Message) => loadMessageIntoComposer(message, 'edit'),
    onRescheduleMessage: (message: Message) => {
      loadMessageIntoComposer(message, 'edit');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onRetry: (message: Message) => { void handleRetry(message); },
    onScheduleFollowUp: startScheduledFollowUpFromCampaignThread,
    onSelectThread: (threadName: string) => {
      setHistoryCampaignFilter(threadName);
      setHistorySearch('');
    },
    onSendScheduledNow: (message: Message) => { void handleSendScheduledNow(message); },
    onSetHistoryAudienceFilter: setHistoryAudienceFilter,
    onSetHistoryCampaignFilter: setHistoryCampaignFilter,
    onSetHistoryChannelFilter: setHistoryChannelFilter,
    onSetHistoryDeliveryFilter: setHistoryDeliveryFilter,
    onSetHistorySearch: setHistorySearch,
    onSetHistoryStatusFilter: setHistoryStatusFilter,
    onStartFollowUp: startFollowUpFromCampaignThread,
    onViewMessage: setViewingMessage,
  };
  const messageDetailModalProps = viewingMessage
    ? {
        message: viewingMessage,
        deliveries,
        canManageCampaigns: canCompose,
        onClose: () => setViewingMessage(null),
        onRetry: handleRetry,
        onSendScheduledNow: handleSendScheduledNow,
        onReschedule: handleRescheduleMessage,
        onCancelSchedule: handleCancelSchedule,
        onLoadIntoComposer: loadMessageIntoComposer,
      }
    : null;

  const messageDashboardViewProps = {
    activeSiteRole,
    composerProps: messageComposerProps,
    deliveryRate: deliveryStats.rate,
    detailModalProps: messageDetailModalProps,
    guestsReached: deliveryStats.targeted,
    historyProps: messageHistoryProps,
    messagesRole,
    onRunDueScheduledMessages: handleRunDueScheduledMessages,
    onSetMessagesRole: setMessagesRole,
    overdueScheduled: deliveryHealth.overdueScheduled,
    processingScheduled,
    reachSnapshotProps: messageReachSnapshotProps,
    savedTemplatesProps: messageSavedTemplatesProps,
    scheduledCount: deliveryStats.scheduled,
    sendingDetailsProps: messageSendingDetailsProps,
    showSendingDetails,
    startingPointsProps: messageStartingPointsProps,
    toasts,
    toggleSendingDetails: () => setShowSendingDetails((value) => !value),
  };

  return <MessageDashboardRouteView dashboardProps={messageDashboardViewProps} loading={loading} />;
};
