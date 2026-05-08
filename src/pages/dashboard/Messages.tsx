import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { DashboardPageHero } from '../../components/dashboard/DashboardPageHero';
import { DashboardStateBlock } from '../../components/dashboard/DashboardStateBlock';
import { Card, Button, Input, Textarea } from '../../components/ui';
import { Send, Clock, Calendar, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { demoEvents, demoGuests, demoWeddingSite } from '../../lib/demoData';
import { createSmsCreditsSession } from '../../lib/stripeService';
import { canComposeDashboardMessages, canEditPlannerSurface, derivePlannerRoleFromPermissions, readPlannerAccessRole, writePlannerAccessRole, type PlannerAccessRole, type PlannerPermissionKey } from '../../lib/plannerAccess';
import { formatMessageEventOptionLabel } from './messageEventDate';
import { formatMessageHistoryDateTime } from './messageHistoryTime';
import { formatScheduledMessageDateTime, parseScheduleInputToIso, toScheduleInputValue } from './messageScheduleTime';
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
  getCampaignName,
  getCampaignThreadKey,
  getCampaignTypeLabel,
  getCustomerDeliveryReason,
  getActiveCampaignMessages,
  getActiveCampaignThread,
  getPreferredStoredPhotoAlbumLink,
  getRecipientCount,
  getTemplateKey,
  hasReachableEmail,
  hasReachableSms,
  isEmailCapConsumingStatus,
  isPastScheduledTime,
  isSavedTemplateScheduleUsable,
  migrateSavedComposerTemplatesStorage,
  normalizeSavedTemplateName,
  readSavedComposerTemplates,
  safeMessagesError,
  writeSavedComposerTemplates,
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
  createDashboardMessage,
  insertDashboardMessageMinimal,
  isMissingMessageDeliveriesTable,
  loadDashboardMessages,
  loadMessageDeliveries,
  loadMessageGuests,
  loadMessageItineraryAudience,
  loadMessagesActiveSite,
  loadSmsCreditPreview,
  triggerDashboardBulkSend,
  triggerScheduledMessageDispatch,
  updateDashboardMessage,
  type MessageInsertPayload,
} from './messages/messageService';
// Optional table: can be missing in lean deployments.
// Start unknown, then permanently disable after one confirmed missing-table miss.
let hasMessageDeliveriesTable: boolean | null = null;

import {
  MessageComposerLanguagePreviewPanel,
  MessageComposerPreflightPanel,
  MessageComposerRecipientPreviewPanel,
  MessageComposerSchedulePanel,
  MessageGuestFlowCard,
  MessageHistoryCard,
  MessageReachSnapshotCard,
  MessageSavedTemplatesCard,
  MessageSendingDetailsPanel,
  MessageStartingPointsCard,
  ToastList,
} from './messages/MessageDashboardComponents';
import { MessageDetailModal } from './messages/MessageDetailModal';

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
  const [processingScheduled, setProcessingScheduled] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<SavedComposerTemplate[]>([]);
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefillSubject = params.get('prefillSubject');
    const prefillBody = params.get('prefillBody');
    const prefillAudience = params.get('prefillAudience');
    const prefillCampaignName = params.get('prefillCampaignName');
    const prefillChannel = params.get('prefillChannel');
    const templateKey = params.get('template') as MessageTemplateKey | null;
    const templateAudience = params.get('audience');
    const smsCreditsStatus = params.get('smsCredits');
    const requestedTemplate = templateKey && COMPOSER_TEMPLATES.some((template) => template.key === templateKey) ? templateKey : null;
    if (!prefillSubject && !prefillBody && !prefillAudience && !prefillCampaignName && !prefillChannel && !smsCreditsStatus && !requestedTemplate) return;

    if (requestedTemplate) {
      applyComposerTemplate(requestedTemplate, {
        audience: templateAudience === 'pending' ? 'not_responded' : templateAudience ?? undefined,
      });
      setShowRecipientPreview(true);
    }

    if (prefillSubject || prefillBody || prefillAudience || prefillCampaignName || prefillChannel) {
      setEditingMessageId(null);
      setFormData((prev) => ({
        ...prev,
        campaignName: prefillCampaignName ?? prev.campaignName,
        subject: prefillSubject ?? prev.subject,
        body: prefillBody ?? prev.body,
        audience: prefillAudience ?? prev.audience,
        channel: prefillChannel === 'sms' ? 'sms' : prefillChannel === 'email' ? 'email' : prev.channel,
      }));
      setShowRecipientPreview(true);
    }

    if (smsCreditsStatus === 'success') {
      toast('Text credit purchase complete. Refreshing your balance now.', 'success');
      void fetchWeddingSite();
      void fetchSmsExpiryPreview();
    } else if (smsCreditsStatus === 'cancel') {
      toast('Text credit checkout was canceled.', 'info');
    }

    const cleanedParams = new URLSearchParams(location.search);
    cleanedParams.delete('prefillSubject');
    cleanedParams.delete('prefillBody');
    cleanedParams.delete('prefillAudience');
    cleanedParams.delete('prefillCampaignName');
    cleanedParams.delete('prefillChannel');
    cleanedParams.delete('template');
    cleanedParams.delete('audience');
    cleanedParams.delete('smsCredits');
    const nextSearch = cleanedParams.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate, fetchWeddingSite, fetchSmsExpiryPreview]);

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

  const getAudienceSnapshot = (audience: string, channel: 'email' | 'sms') => {
    const recipients = getRecipients(audience);
    const reachableCount = channel === 'sms'
      ? recipients.filter((guest) => hasReachableSms(guest)).length
      : recipients.filter((guest) => hasReachableEmail(guest.email)).length;

    return {
      totalAudienceCount: recipients.length,
      reachableCount,
      skippedCount: Math.max(recipients.length - reachableCount, 0),
    };
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

  const handleSendMessage = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault();
    if (!weddingSite) return;
    setSending(true);
    try {
      const recipients = getRecipients(formData.audience);
      const totalAudienceCount = recipients.length;
      const recipientCount = formData.channel === 'sms'
        ? recipients.filter(g => hasReachableSms(g)).length
        : recipients.filter(g => hasReachableEmail(g.email)).length;
      const skippedRecipientCount = Math.max(totalAudienceCount - recipientCount, 0);

      if (recipientCount === 0 && !saveAsDraft) {
        toast(formData.channel === 'sms'
          ? 'No recipients have reachable phone numbers with text consent. Add phone numbers and consent first.'
          : 'No recipients have valid email addresses. Add valid emails to your guests first.', 'error');
        setSending(false);
        return;
      }

      if (formData.channel === 'sms' && !saveAsDraft) {
        if (!isSmsProviderEnabled()) {
          toast(SMS_PROVIDER_PENDING_COPY, 'info');
          setSending(false);
          return;
        }
        if (!smsCreditsSufficient) {
          toast(`Not enough text credits. Need ${smsCreditsNeeded}, have ${smsCredits}.`, 'error');
          setSending(false);
          return;
        }
      }

      const requestedScheduledFor = !saveAsDraft && formData.scheduleType === 'later' && formData.scheduleDate && formData.scheduleTime
        ? `${formData.scheduleDate}T${formData.scheduleTime}:00`
        : null;
      const isScheduled = !!requestedScheduledFor && !isPastScheduledTime(requestedScheduledFor);
      const isSendNow = !saveAsDraft && !isScheduled;

      const status = saveAsDraft ? 'draft' : isScheduled ? 'scheduled' : 'queued';
      const scheduledFor = isScheduled ? requestedScheduledFor : null;
      const campaignName = formData.campaignName.trim();
      const normalizedSubject = formData.channel === 'sms'
        ? (formData.subject.trim() || `Text • ${selectedAudience?.label ?? 'All guests'}`)
        : formData.subject;
      const recipientMeta = {
        audience: formData.audience,
        audience_label: selectedAudience?.label ?? null,
        recipient_count: totalAudienceCount,
        reachable_count: recipientCount,
        skipped_count: skippedRecipientCount,
        sms_segment_count: formData.channel === 'sms' ? countSmsSegments(formData.body) : null,
        sms_credit_cost: formData.channel === 'sms' ? estimateSmsCredits(formData.body, recipientCount) : null,
        campaignName: campaignName || null,
        campaignType: selectedTemplate.campaignType ?? null,
        templateKey: formData.templateKey,
      };

      let inserted: { id: string } | null = null;
      const isEditingExistingMessage = !!editingMessageId;

      if (isDemoMode) {
        inserted = { id: editingMessageId ?? `demo-msg-${Date.now()}` };
        const demoMessage: Message = {
          id: inserted.id,
          subject: normalizedSubject,
          body: formData.body,
          sent_at: status === 'queued' ? new Date().toISOString() : null,
          scheduled_for: scheduledFor,
          status: status === 'queued' ? (skippedRecipientCount > 0 ? 'partial' : 'sent') : status,
          channel: formData.channel,
          audience_filter: formData.audience,
          recipient_filter: recipientMeta,
          recipient_count: totalAudienceCount,
          delivered_count: status === 'queued' ? recipientCount : 0,
          failed_count: 0,
        };
        setMessages(prev => {
          if (!isEditingExistingMessage) return [demoMessage, ...prev];
          return prev.map((item) => (item.id === inserted!.id ? demoMessage : item));
        });
      } else {
        if (isEditingExistingMessage) {
          inserted = { id: editingMessageId };

          await updateDashboardMessage(editingMessageId, {
            subject: normalizedSubject,
            body: formData.body,
            channel: formData.channel,
            status,
            scheduled_for: scheduledFor,
            sent_at: null,
            delivered_count: status === 'queued' ? 0 : null,
            failed_count: status === 'queued' ? 0 : null,
            sending_started_at: null,
            sending_finished_at: null,
          });

          void updateDashboardMessage(editingMessageId, {
            audience_filter: formData.audience,
            recipient_count: totalAudienceCount,
            recipient_filter: recipientMeta,
          });
        } else {
          // Write with a minimal stable payload first (resilient to schema drift),
          // then best-effort patch extended analytics columns.
          inserted = await insertDashboardMessageMinimal({
            wedding_site_id: weddingSite.id,
            subject: normalizedSubject,
            body: formData.body,
            channel: formData.channel,
            status,
            scheduled_for: scheduledFor,
            sent_at: null,
          });

          // Non-blocking enrichment for optional columns.
          if (inserted) {
            void updateDashboardMessage(inserted.id, {
              audience_filter: formData.audience,
              recipient_count: totalAudienceCount,
              recipient_filter: recipientMeta,
            });
          }
        }
      }

      setShowRecipientPreview(false);
      setEditingMessageId(null);
      setFormData({ campaignName: '', templateKey: 'blank', subject: '', body: '', audience: 'all', channel: formData.channel, scheduleType: 'now', scheduleDate: '', scheduleTime: '' });

      if (saveAsDraft) {
        toast(isEditingExistingMessage ? 'Draft updated' : 'Saved as draft', 'info');
        await fetchMessages();
        return;
      }

      if (isScheduled) {
        toast(`${isEditingExistingMessage ? 'Updated' : 'Scheduled'} for ${formatScheduledMessageDateTime(scheduledFor)} — ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}`, 'info');
        await fetchMessages();
        return;
      }

      if (isSendNow && inserted?.id) {
        if (isDemoMode) {
          if (skippedRecipientCount > 0) {
            toast(`${isEditingExistingMessage ? 'Updated and delivered' : 'Delivered'} ${recipientCount} • ${describeRecipientReview(skippedRecipientCount)} (demo)`, 'info');
          } else {
            toast(`${isEditingExistingMessage ? 'Updated and delivered' : 'Delivered'} to ${recipientCount} guest${recipientCount !== 1 ? 's' : ''} (demo)`, 'success');
          }
          return;
        }


        toast(`Sending to ${recipientCount} guest${recipientCount !== 1 ? 's' : ''}…`, 'info');
        await fetchMessages();
        try {
          const result = await triggerDashboardBulkSend(inserted.id);
          const skipped = result.skipped ?? 0;
          if (result.failed === 0 && skipped === 0) {
            toast(`Delivered to ${result.delivered} guest${result.delivered !== 1 ? 's' : ''}`, 'success');
          } else if (result.delivered === 0 && result.failed === 0 && skipped > 0) {
            toast(`No messages sent: ${describeRecipientReview(skipped)}.`, 'info');
          } else if (result.delivered === 0) {
            toast(`Delivery needs review for ${result.failed} recipient${result.failed !== 1 ? 's' : ''}${skipped > 0 ? ` • ${describeRecipientReview(skipped)}` : ''}. Check message history.`, 'error');
          } else {
            toast(`Sent ${result.delivered}${result.failed > 0 ? ` • ${result.failed} need review` : ''}${skipped > 0 ? ` • ${describeRecipientReview(skipped)}` : ''}. Check message history.`, 'info');
          }
        } catch (sendErr) {
          toast(safeMessagesError(sendErr, 'Delivery needs review. Check message history.'), 'error');
        }
        await fetchMessages();
      }
    } catch (err) {
      toast(safeMessagesError(err, 'Couldn’t process message. Please try again.'), 'error');
    } finally {
      setSending(false);
    }
  };

  function loadMessageIntoComposer(message: Message, mode: 'edit' | 'duplicate') {
    if (!canComposeDashboardMessages(messagesRole, messagesPermissions)) {
      toast('Your collaborator role cannot edit campaigns from Messaging.', 'info');
      return;
    }

    const scheduledInputValue = toScheduleInputValue(message.scheduled_for);
    const [scheduleDate = '', scheduleTime = ''] = scheduledInputValue ? scheduledInputValue.split('T') : [];

    setEditingMessageId(mode === 'edit' ? message.id : null);
    setFormData({
      campaignName: mode === 'duplicate'
        ? `Copy of ${getCampaignName(message) ?? getCampaignTypeLabel(message) ?? message.subject}`
        : getCampaignName(message) ?? '',
      templateKey: getTemplateKey(message),
      subject: mode === 'duplicate' && message.status !== 'draft' ? `Copy of ${message.subject}` : message.subject,
      body: message.body,
      audience: message.audience_filter ?? (message.recipient_filter?.audience as string) ?? 'all',
      channel: message.channel === 'sms' ? 'sms' : 'email',
      scheduleType: message.status === 'scheduled' && scheduleDate && scheduleTime ? 'later' : 'now',
      scheduleDate,
      scheduleTime,
    });
    setShowRecipientPreview(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(mode === 'edit' ? 'Loaded into composer for editing.' : 'Copied into composer as a new message.', 'info');
  }

  function startFollowUpFromCampaignThread(mode: 'reminder' | 'day-of' | 'thank-you') {
    if (!canComposeDashboardMessages(messagesRole, messagesPermissions)) {
      toast('Your collaborator role cannot create follow-up campaigns from Messaging.', 'info');
      return;
    }

    if (!activeCampaignLatestMessage) return;

    const audience = activeCampaignLatestMessage.audience_filter ?? (activeCampaignLatestMessage.recipient_filter?.audience as string) ?? 'all';
    const campaignBase = getCampaignName(activeCampaignLatestMessage) ?? activeCampaignThread?.name ?? activeCampaignLatestMessage.subject;

    if (mode === 'reminder') {
      applyComposerTemplate('rsvp-reminder', {
        audience,
        channel: 'email',
        scheduleType: 'now',
        scheduleDate: '',
        scheduleTime: '',
        campaignName: `${campaignBase} follow-up`,
      });
      setShowRecipientPreview(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast('Loaded thread follow-up reminder into composer.', 'info');
      return;
    }

    if (mode === 'day-of') {
      applyComposerTemplate('day-of-update', {
        audience,
        channel: 'sms',
        scheduleType: 'now',
        scheduleDate: '',
        scheduleTime: '',
        campaignName: `${campaignBase} day-of update`,
      });
      setShowRecipientPreview(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast('Loaded thread day-of update into composer.', 'info');
      return;
    }

    applyComposerTemplate('thank-you', {
      audience,
      channel: 'email',
      scheduleType: 'now',
      scheduleDate: '',
      scheduleTime: '',
      campaignName: `${campaignBase} thank you`,
    });
    setShowRecipientPreview(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Loaded thread thank-you into composer.', 'info');
  }

  function startScheduledFollowUpFromCampaignThread(mode: 'reminder' | 'day-of' | 'thank-you') {
    if (!canComposeDashboardMessages(messagesRole, messagesPermissions)) {
      toast('Your collaborator role cannot schedule follow-up campaigns from Messaging.', 'info');
      return;
    }

    if (!activeCampaignLatestMessage) return;

    const now = new Date();
    const scheduledAt = new Date(now);

    if (mode === 'day-of') {
      scheduledAt.setHours(now.getHours() + 2);
    } else {
      scheduledAt.setDate(now.getDate() + 1);
      scheduledAt.setHours(10, 0, 0, 0);
    }

    const yyyy = scheduledAt.getFullYear();
    const mm = String(scheduledAt.getMonth() + 1).padStart(2, '0');
    const dd = String(scheduledAt.getDate()).padStart(2, '0');
    const hh = String(scheduledAt.getHours()).padStart(2, '0');
    const min = String(scheduledAt.getMinutes()).padStart(2, '0');

    const audience = activeCampaignLatestMessage.audience_filter ?? (activeCampaignLatestMessage.recipient_filter?.audience as string) ?? 'all';
    const campaignBase = getCampaignName(activeCampaignLatestMessage) ?? activeCampaignThread?.name ?? activeCampaignLatestMessage.subject;

    if (mode === 'reminder') {
      applyComposerTemplate('rsvp-reminder', {
        audience,
        channel: 'email',
        scheduleType: 'later',
        scheduleDate: `${yyyy}-${mm}-${dd}`,
        scheduleTime: `${hh}:${min}`,
        campaignName: `${campaignBase} scheduled follow-up`,
      });
      setShowRecipientPreview(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast(`Loaded scheduled reminder for ${formatScheduledMessageDateTime(`${yyyy}-${mm}-${dd}T${hh}:${min}:00`)}.`, 'info');
      return;
    }

    if (mode === 'day-of') {
      applyComposerTemplate('day-of-update', {
        audience,
        channel: 'sms',
        scheduleType: 'later',
        scheduleDate: `${yyyy}-${mm}-${dd}`,
        scheduleTime: `${hh}:${min}`,
        campaignName: `${campaignBase} scheduled day-of update`,
      });
      setShowRecipientPreview(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast(`Loaded scheduled day-of update for ${formatScheduledMessageDateTime(`${yyyy}-${mm}-${dd}T${hh}:${min}:00`)}.`, 'info');
      return;
    }

    applyComposerTemplate('thank-you', {
      audience,
      channel: 'email',
      scheduleType: 'later',
      scheduleDate: `${yyyy}-${mm}-${dd}`,
      scheduleTime: `${hh}:${min}`,
      campaignName: `${campaignBase} scheduled thank you`,
    });
    setShowRecipientPreview(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(`Loaded scheduled thank-you for ${formatScheduledMessageDateTime(`${yyyy}-${mm}-${dd}T${hh}:${min}:00`)}.`, 'info');
  }

  async function handleRetry(message: Message) {
    if (!canComposeDashboardMessages(messagesRole, messagesPermissions)) {
      toast('Your collaborator role cannot retry campaign sends.', 'info');
      return;
    }

    if (message.channel === 'sms' && !isSmsProviderEnabled()) {
      toast(SMS_PROVIDER_PENDING_COPY, 'info');
      return;
    }

    if (!canRetryMessageStatus(message.status)) {
      toast(message.status === 'partial'
        ? 'Campaigns that need follow-up are not retried in place here because that can duplicate sends. Duplicate the campaign and target the missed guests instead.'
        : 'Only campaigns needing review can be retried from this control.', 'info');
      return;
    }

    setRetryingMessageId(message.id);
    try {
      if (isDemoMode) {
        const audience = message.audience_filter ?? (message.recipient_filter?.audience as string) ?? 'all';
        const recipients = getRecipients(audience);
        const deliveredCount = message.channel === 'sms'
          ? recipients.filter((guest) => hasReachableSms(guest)).length
          : recipients.filter((guest) => hasReachableEmail(guest.email)).length;
        const skippedCount = Math.max(recipients.length - deliveredCount, 0);

        setMessages((prev) => prev.map((item) => (
          item.id === message.id
            ? {
                ...item,
                status: skippedCount > 0 ? 'partial' : 'sent',
                sent_at: new Date().toISOString(),
                delivered_count: deliveredCount,
                failed_count: 0,
                recipient_count: recipients.length,
                recipient_filter: {
                  ...(item.recipient_filter ?? {}),
                  recipient_count: recipients.length,
                  reachable_count: deliveredCount,
                  skipped_count: skippedCount,
                },
              }
            : item
        )));

        toast(skippedCount > 0
          ? `Second send finished in demo: delivered ${deliveredCount} • ${describeRecipientReview(skippedCount)}.`
          : `Second send finished in demo: delivered ${deliveredCount}.`, skippedCount > 0 ? 'info' : 'success');
        return;
      }

      await updateDashboardMessage(message.id, { status: 'queued', sent_at: null, failed_count: 0, delivered_count: 0 });
      toast('Sending again…', 'info');
      await fetchMessages();
      try {
        const result = await triggerDashboardBulkSend(message.id);
        const skipped = result.skipped ?? 0;
        if (result.failed === 0 && skipped === 0) {
          toast(`Delivered to ${result.delivered} guest${result.delivered !== 1 ? 's' : ''}`, 'success');
        } else if (result.delivered === 0 && result.failed === 0 && skipped > 0) {
          toast(`Second send finished with ${describeRecipientReview(skipped)}.`, 'info');
        } else {
          toast(`Sent ${result.delivered}${result.failed > 0 ? ` • ${result.failed} need review` : ''}${skipped > 0 ? ` • ${describeRecipientReview(skipped)}` : ''}`, result.delivered === 0 && result.failed > 0 ? 'error' : 'info');
        }
      } catch (sendErr) {
        await updateDashboardMessage(message.id, {
          status: message.status,
          sent_at: message.sent_at,
          failed_count: message.failed_count,
          delivered_count: message.delivered_count,
        });
        toast(safeMessagesError(sendErr, 'Delivery needs review. Try again later.'), 'error');
      }
      await fetchMessages();
    } catch {
      toast('Couldn’t retry that message right now. Please try again.', 'error');
    } finally {
      setRetryingMessageId(null);
    }
  }

  async function handleSendScheduledNow(message: Message) {
    if (!canComposeDashboardMessages(messagesRole, messagesPermissions)) {
      toast('Your collaborator role cannot send campaigns from Messaging.', 'info');
      return;
    }

    if (message.channel === 'sms' && !isSmsProviderEnabled()) {
      toast(SMS_PROVIDER_PENDING_COPY, 'info');
      return;
    }

    if (isDemoMode) {
      const audience = message.audience_filter ?? (message.recipient_filter?.audience as string) ?? 'all';
      const recipients = getRecipients(audience);
        const deliveredCount = message.channel === 'sms'
        ? recipients.filter((guest) => hasReachableSms(guest)).length
        : recipients.filter((guest) => hasReachableEmail(guest.email)).length;
      const skippedCount = Math.max(recipients.length - deliveredCount, 0);

      setMessages((prev) => prev.map((item) => (
        item.id === message.id
          ? {
              ...item,
              status: skippedCount > 0 ? 'partial' : 'sent',
              sent_at: new Date().toISOString(),
              delivered_count: deliveredCount,
              failed_count: 0,
              recipient_count: recipients.length,
              recipient_filter: {
                ...(item.recipient_filter ?? {}),
                recipient_count: recipients.length,
                reachable_count: deliveredCount,
                skipped_count: skippedCount,
              },
            }
          : item
      )));
      toast(skippedCount > 0
        ? `Scheduled message sent in demo: delivered ${deliveredCount} • ${describeRecipientReview(skippedCount)}.`
        : `Scheduled message sent in demo: delivered ${deliveredCount}.`, skippedCount > 0 ? 'info' : 'success');
      return;
    }

    let deliveryTriggered = false;
    try {
      await updateDashboardMessage(message.id, { scheduled_for: new Date().toISOString() });

      toast('Sending scheduled message now…', 'info');
      const result = await triggerDashboardBulkSend(message.id);
      const skipped = result.skipped ?? 0;
      if (result.failed === 0 && skipped === 0) {
        toast(`Delivered to ${result.delivered} guest${result.delivered !== 1 ? 's' : ''}`, 'success');
      } else if (result.delivered === 0 && result.failed === 0 && skipped > 0) {
        toast(`No messages sent: ${describeRecipientReview(skipped)}.`, 'info');
      } else if (result.delivered === 0) {
        toast(`Delivery needs review for ${result.failed} recipient${result.failed !== 1 ? 's' : ''}${skipped > 0 ? ` • ${describeRecipientReview(skipped)}` : ''}.`, 'error');
      } else {
        toast(`Sent ${result.delivered}${result.failed > 0 ? ` • ${result.failed} need review` : ''}${skipped > 0 ? ` • ${describeRecipientReview(skipped)}` : ''}.`, 'info');
      }
      deliveryTriggered = true;
      await fetchMessages();
    } catch (err) {
      if (!isDemoMode && !deliveryTriggered) {
        await updateDashboardMessage(message.id, { scheduled_for: message.scheduled_for });
      }
      toast(safeMessagesError(err, 'Couldn’t send that scheduled message right now.'), 'error');
    }
  }

  async function handleRescheduleMessage(message: Message, scheduledFor: string) {
    if (!canComposeDashboardMessages(messagesRole, messagesPermissions)) {
      toast('Your collaborator role cannot reschedule campaigns.', 'info');
      return;
    }

    if (isPastScheduledTime(scheduledFor)) {
      toast('Pick a future time to reschedule. Use send now if you want it to go immediately.', 'error');
      return;
    }

    if (isDemoMode) {
      const audience = message.audience_filter ?? (message.recipient_filter?.audience as string) ?? 'all';
      const snapshot = getAudienceSnapshot(audience, message.channel === 'sms' ? 'sms' : 'email');
      setMessages((prev) => prev.map((item) => (
        item.id === message.id
          ? {
              ...item,
              status: 'scheduled',
              scheduled_for: scheduledFor,
              recipient_count: snapshot.totalAudienceCount,
              recipient_filter: {
                ...(item.recipient_filter ?? {}),
                recipient_count: snapshot.totalAudienceCount,
                reachable_count: snapshot.reachableCount,
                skipped_count: snapshot.skippedCount,
              },
            }
          : item
      )));
      toast(`Rescheduled for ${formatScheduledMessageDateTime(scheduledFor)}.`, 'success');
      return;
    }

    try {
      const audience = message.audience_filter ?? (message.recipient_filter?.audience as string) ?? 'all';
      const snapshot = getAudienceSnapshot(audience, message.channel === 'sms' ? 'sms' : 'email');
      await updateDashboardMessage(message.id, {
        status: 'scheduled',
        scheduled_for: scheduledFor,
        sent_at: null,
      });

      void updateDashboardMessage(message.id, {
        recipient_count: snapshot.totalAudienceCount,
        recipient_filter: {
          ...(message.recipient_filter ?? {}),
          recipient_count: snapshot.totalAudienceCount,
          reachable_count: snapshot.reachableCount,
          skipped_count: snapshot.skippedCount,
        },
      });

      toast(`Rescheduled for ${formatScheduledMessageDateTime(scheduledFor)}.`, 'success');
      await fetchMessages();
    } catch (err) {
      toast(safeMessagesError(err, 'Couldn’t reschedule that campaign right now.'), 'error');
    }
  }

  async function handleCancelSchedule(message: Message) {
    if (!canComposeDashboardMessages(messagesRole, messagesPermissions)) {
      toast('Your collaborator role cannot change scheduled campaigns.', 'info');
      return;
    }

    if (isDemoMode) {
      const audience = message.audience_filter ?? (message.recipient_filter?.audience as string) ?? 'all';
      const snapshot = getAudienceSnapshot(audience, message.channel === 'sms' ? 'sms' : 'email');
      setMessages((prev) => prev.map((item) => (
        item.id === message.id
          ? {
              ...item,
              status: 'draft',
              scheduled_for: null,
              recipient_count: snapshot.totalAudienceCount,
              recipient_filter: {
                ...(item.recipient_filter ?? {}),
                recipient_count: snapshot.totalAudienceCount,
                reachable_count: snapshot.reachableCount,
                skipped_count: snapshot.skippedCount,
              },
            }
          : item
      )));
      toast('Scheduled campaign moved back to draft.', 'info');
      return;
    }

    try {
      const audience = message.audience_filter ?? (message.recipient_filter?.audience as string) ?? 'all';
      const snapshot = getAudienceSnapshot(audience, message.channel === 'sms' ? 'sms' : 'email');
      await updateDashboardMessage(message.id, {
        status: 'draft',
        scheduled_for: null,
      });

      void updateDashboardMessage(message.id, {
        recipient_count: snapshot.totalAudienceCount,
        recipient_filter: {
          ...(message.recipient_filter ?? {}),
          recipient_count: snapshot.totalAudienceCount,
          reachable_count: snapshot.reachableCount,
          skipped_count: snapshot.skippedCount,
        },
      });

      toast('Scheduled campaign moved back to draft.', 'info');
      await fetchMessages();
    } catch (err) {
      toast(safeMessagesError(err, 'Couldn’t move that campaign back to draft right now.'), 'error');
    }
  }

  const campaignStatusSummary = useMemo(() => buildCampaignStatusSummary(messages), [messages]);

  async function handleRunDueScheduledMessages() {
    if (!canComposeDashboardMessages(messagesRole, messagesPermissions)) {
      toast('Your collaborator role cannot run scheduled sends.', 'info');
      return;
    }

    if (isDemoMode) {
      const dueIds = messages
        .filter((m) => m.status === 'scheduled' && isPastScheduledTime(m.scheduled_for))
        .map((m) => m.id);

      if (dueIds.length === 0) {
        toast('No scheduled messages are due right now.', 'info');
        return;
      }

      setProcessingScheduled(true);
      try {
        let skippedRecipients = 0;
        setMessages((prev) => prev.map((message) => {
          if (!dueIds.includes(message.id)) return message;

          const audience = message.audience_filter ?? (message.recipient_filter?.audience as string) ?? 'all';
          const recipients = getRecipients(audience);
          const deliveredCount = message.channel === 'sms'
            ? recipients.filter((guest) => hasReachableSms(guest)).length
            : recipients.filter((guest) => hasReachableEmail(guest.email)).length;
          const skippedCount = Math.max(recipients.length - deliveredCount, 0);
          skippedRecipients += skippedCount;

          return {
            ...message,
            status: skippedCount > 0 ? 'partial' : 'sent',
            sent_at: new Date().toISOString(),
            delivered_count: deliveredCount,
            failed_count: 0,
            recipient_count: recipients.length,
            recipient_filter: {
              ...(message.recipient_filter ?? {}),
              recipient_count: recipients.length,
              reachable_count: deliveredCount,
              skipped_count: skippedCount,
            },
          };
        }));
        toast(`Processed ${dueIds.length} scheduled message${dueIds.length !== 1 ? 's' : ''} in demo${skippedRecipients > 0 ? ` • ${describeRecipientReview(skippedRecipients)}` : ''}.`, skippedRecipients > 0 ? 'info' : 'success');
      } finally {
        setProcessingScheduled(false);
      }
      return;
    }

    setProcessingScheduled(true);
    try {
      const result = await triggerScheduledMessageDispatch(10);
      if (result.processed === 0) {
        toast('No scheduled messages are due right now.', 'info');
      } else if (result.failed === 0 && result.partial === 0) {
        toast(`Processed ${result.processed} scheduled message${result.processed !== 1 ? 's' : ''}${result.skippedRecipients > 0 ? ` • ${describeRecipientReview(result.skippedRecipients)}` : ''}.`, 'success');
      } else {
        toast(`Processed ${result.processed}: sent ${result.sent}, partial ${result.partial}, needs review ${result.failed}${result.skippedRecipients > 0 ? `, ${describeRecipientReview(result.skippedRecipients)}` : ''}${result.skippedMessages > 0 ? `, messages needing review ${result.skippedMessages}` : ''}.`, result.failed > 0 ? 'error' : 'info');
      }
      await fetchMessages();
    } catch (err) {
      toast(safeMessagesError(err, 'Couldn’t process scheduled messages right now.'), 'error');
    } finally {
      setProcessingScheduled(false);
    }
  }

  const audienceOptions = [
    ...buildMessageAudienceOptions(guests),
    ...itineraryAudienceOptions,
  ];

  const selectedAudience = audienceOptions.find(opt => opt.value === formData.audience);
  const selectedAudienceDetail = getMessageAudienceDetail(formData.audience, audienceOptions);

  function applyComposerTemplate(templateKey: MessageTemplateKey, overrides?: Partial<typeof formData>) {
    setEditingMessageId(null);
    const template = COMPOSER_TEMPLATES.find((tpl) => tpl.key === templateKey) ?? COMPOSER_TEMPLATES[0];
    const nextAudienceValue = overrides?.audience ?? formData.audience;
    const nextAudience = audienceOptions.find((opt) => opt.value === nextAudienceValue) ?? null;
    const draft = template.build({
      audienceLabel: nextAudience?.label ?? null,
      venue: weddingSite?.venue_name ?? null,
      weddingDate: weddingSite?.wedding_date ?? null,
      applyTemplateVariables,
    });

    setFormData((prev) => ({
      ...prev,
      ...overrides,
      templateKey: template.key,
      channel: overrides?.channel ?? template.defaultChannel,
      subject: draft.subject,
      body: draft.body,
      campaignName: overrides?.campaignName ?? (template.key === 'blank' ? prev.campaignName : template.label),
    }));
  }

  function applySavedTemplate(template: SavedComposerTemplate) {
    setEditingMessageId(null);
    const savedScheduleIsUsable = isSavedTemplateScheduleUsable(template);

    setFormData((prev) => ({
      ...prev,
      campaignName: template.campaignName || template.name,
      templateKey: 'blank',
      subject: template.subject,
      body: template.body,
      audience: template.audience,
      channel: template.channel,
      scheduleType: savedScheduleIsUsable ? 'later' : 'now',
      scheduleDate: savedScheduleIsUsable ? (template.scheduleDate ?? '') : '',
      scheduleTime: savedScheduleIsUsable ? (template.scheduleTime ?? '') : '',
    }));
    toast(savedScheduleIsUsable
      ? `Loaded template “${template.name}”.`
      : `Loaded template “${template.name}” without its old send time.`, 'info');
  }

  function saveCurrentComposerAsTemplate() {
    const subject = formData.subject.trim();
    const body = formData.body.trim();
    const name = formData.campaignName.trim() || subject || selectedTemplate.label;
    const normalizedName = normalizeSavedTemplateName(name);

    if (!subject && !body) {
      toast('Add a subject or message body before saving a reusable template.', 'error');
      return;
    }

    const existingTemplate = savedTemplates.find((item) => normalizeSavedTemplateName(item.name) === normalizedName);

    const next: SavedComposerTemplate = {
      id: existingTemplate?.id ?? `saved-template-${Date.now()}`,
      name,
      subject: formData.subject,
      body: formData.body,
      channel: formData.channel,
      audience: formData.audience,
      campaignName: formData.campaignName,
      scheduleType: formData.scheduleType as 'now' | 'later',
      scheduleDate: formData.scheduleDate,
      scheduleTime: formData.scheduleTime,
      createdAt: existingTemplate?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [next, ...savedTemplates.filter((item) => normalizeSavedTemplateName(item.name) !== normalizedName)].slice(0, 12);
    const persisted = writeSavedComposerTemplates(updated);
    if (!persisted) {
      toast('Couldn’t save that reusable template on this device right now.', 'error');
      return;
    }
    setSavedTemplates(updated);
    toast(`${existingTemplate ? 'Updated' : 'Saved'} reusable template “${name}”.`, 'success');
  }

  function deleteSavedTemplate(templateId: string) {
    const updated = savedTemplates.filter((item) => item.id !== templateId);
    const persisted = writeSavedComposerTemplates(updated);
    if (!persisted) {
      toast('Couldn’t remove that saved template from this device right now.', 'error');
      return;
    }
    setSavedTemplates(updated);
    toast('Removed saved template.', 'info');
  }

  const applySaveTheDatePreset = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');

    applyComposerTemplate('save-the-date', {
      audience: 'all',
      channel: 'email',
      scheduleType: 'later',
      scheduleDate: `${yyyy}-${mm}-${dd}`,
      scheduleTime: '10:00',
      campaignName: 'Save the date',
    });
    toast('Save-the-date preset loaded (scheduled for tomorrow at 10:00).', 'success');
  };

  const quickCreateSaveTheDateCampaign = async () => {
    applySaveTheDatePreset();

    if (!weddingSite?.id) {
      toast('Save-the-date draft loaded. Wedding site context missing for instant campaign creation.', 'error');
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const payload: MessageInsertPayload = {
      wedding_site_id: weddingSite.id,
      channel: 'email',
      subject: applyTemplateVariables('Save the Date!'),
      body: applyTemplateVariables('We are thrilled to invite you to our wedding! Please mark your calendars for [DATE] at [VENUE]. Formal invitation to follow.'),
      audience_filter: 'all',
      recipient_count: guests.length,
      recipient_filter: {
        audience: 'all',
        audience_label: 'All Guests',
        campaignName: 'Save the date',
        campaignType: 'save-the-date',
        templateKey: 'save-the-date',
        recipient_count: guests.length,
        reachable_count: guests.filter((guest) => hasReachableEmail(guest.email)).length,
        skipped_count: guests.filter((guest) => !hasReachableEmail(guest.email)).length,
      },
      scheduled_for: tomorrow.toISOString(),
      status: 'scheduled',
    };

    let created = false;
    try {
      if (isDemoMode) {
        const demoMessage: Message = {
          id: `demo-save-the-date-${Date.now()}`,
          wedding_site_id: weddingSite.id,
          channel: 'email',
          subject: payload.subject,
          body: payload.body,
          sent_at: null,
          audience_filter: 'all',
          recipient_count: guests.length,
          recipient_filter: payload.recipient_filter,
          scheduled_for: payload.scheduled_for,
          status: 'scheduled',
          delivered_count: 0,
          failed_count: 0,
          created_at: new Date().toISOString(),
        } as Message;
        setMessages((prev) => [demoMessage, ...prev]);
        created = true;
      } else {
        await createDashboardMessage(payload);
        created = true;
        await fetchMessages();
      }

      toast('Save-the-date campaign scheduled for tomorrow at 10:00.', 'success');
    } catch (err) {
      const message = safeMessagesError(err, 'Couldn’t create the save-the-date campaign right now.');
      toast(
        created
          ? `Campaign was created, but the message list needs a refresh. ${message}`
          : message,
        created ? 'info' : 'error',
      );
    }
  };

  const applyEventReminderDraft = () => {
    applyComposerTemplate('event-reminder', {
      channel: 'email',
      scheduleType: 'now',
      scheduleDate: '',
      scheduleTime: '',
      campaignName: selectedAudience?.value?.startsWith('event:') ? `${selectedAudience.label} reminder` : 'Event reminder',
    });
    toast('Event reminder draft loaded.', 'info');
  };

  const applyDayOfDraft = () => {
    applyComposerTemplate('day-of-update', {
      channel: 'sms',
      scheduleType: 'now',
      scheduleDate: '',
      scheduleTime: '',
      campaignName: 'Day-of update',
    });
    toast('Day-of update draft loaded.', 'info');
  };

  const applyDayOfAlertPreset = () => {
    applyDayOfDraft();
  };
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

  const providerTelemetry = useMemo(() => buildProviderTelemetry(messages, deliveries), [messages, deliveries]);

  if (loading) {
    return (
      <DashboardLayout currentPage="messages">
        <div className="max-w-[1100px] mx-auto">
          <DashboardStateBlock title="Loading messages…" description="Preparing your campaigns and activity." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="messages">
      <div className="max-w-[1100px] mx-auto space-y-5">
        <DashboardPageHero
          eyebrow="Messages"
          title="Send guest updates without making them feel automated."
          description="Pick the moment, confirm the audience, edit the words, and choose when it should go out. Text sending stays locked until setup is ready."
          stats={[
            { label: 'Scheduled', value: deliveryStats.scheduled, detail: 'waiting to send' },
            { label: 'Guests reached', value: deliveryStats.targeted, detail: 'across sent updates' },
            { label: 'Delivery', value: `${deliveryStats.rate}%`, detail: 'latest delivery health' },
          ]}
          actions={
            <div className="flex flex-col gap-3 md:items-end">
              <Button
                variant={deliveryHealth.overdueScheduled > 0 ? 'primary' : 'outline'}
                size="sm"
                onClick={handleRunDueScheduledMessages}
                disabled={processingScheduled || !canCompose}
              >
                {processingScheduled
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running due sends…</>
                  : <><Clock className="w-4 h-4 mr-2" />{deliveryHealth.overdueScheduled > 0 ? `Run ${deliveryHealth.overdueScheduled} due scheduled send${deliveryHealth.overdueScheduled !== 1 ? 's' : ''}` : 'Run due scheduled sends'}</>}
              </Button>
              <div>
                <label className="block text-xs text-text-tertiary mb-1">View as</label>
                <select
                  value={messagesRole}
                  onChange={(e) => setMessagesRole(e.target.value as PlannerAccessRole)}
                  disabled={activeSiteRole !== 'owner'}
                  className="px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary"
                >
                  <option value="owner">Couple owner</option>
                  <option value="planner">Planner</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="viewer">Read only</option>
                </select>
                {activeSiteRole !== 'owner' && (
                  <p className="mt-1 text-[11px] text-text-tertiary">Access view follows your actual collaborator role on this site.</p>
                )}
              </div>
            </div>
          }
        >
          <div className="inline-flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
            <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">Email drafts</span>
            <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">Text drafts locked until setup</span>
            <span className="rounded-lg border border-border-subtle bg-white px-3 py-1">Editable before send</span>
          </div>
        </DashboardPageHero>

        {messagesRole === 'planner' && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            Planner view is on. This view stays focused on guest communications, reminders, and day-of updates.
          </div>
        )}

        <MessageGuestFlowCard />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowSendingDetails((value) => !value)}
            className="inline-flex items-center rounded-lg border border-border-subtle bg-white px-4 py-2 text-sm font-medium text-text-secondary transition hover:border-primary/30 hover:text-primary"
          >
            {showSendingDetails ? 'Hide sending details' : 'Show sending details'}
          </button>
        </div>

        {showSendingDetails && (
          <MessageSendingDetailsPanel
            buyingPack={buyingPack}
            coupleEmail={weddingSite?.couple_email}
            hardEmailCap={HARD_EMAIL_CAP}
            onBuySmsPack={(pack) => { void handleBuySmsPack(pack); }}
            remainingEmailRecipients={remainingEmailRecipients}
            smsCredits={smsCredits}
            smsExpiringSoon={smsExpiringSoon}
            smsProviderEnabled={smsProviderEnabled}
            smsTransactions={smsTransactions}
            usedEmailRecipients={usedEmailRecipients}
          />
        )}


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card variant="bordered" padding="lg" className="overflow-hidden border-border-subtle">
              <div className="-mx-6 -mt-6 mb-6 border-b border-border-subtle bg-surface-subtle/40 px-6 py-5">
                <p className="text-xs font-semibold text-text-tertiary">Composer</p>
                <h2 className="mt-2 text-2xl font-semibold text-text-primary">Send a guest update</h2>
                <p className="mt-1 text-sm text-text-secondary">Pick who needs it, adjust the wording, then send now or schedule it.</p>
              </div>
              {!canCompose && <p className="text-xs text-text-tertiary mb-3">Viewer mode is on, so writing and sending are turned off.</p>}
              <form onSubmit={(e) => handleSendMessage(e, false)} className="space-y-6">
                <fieldset disabled={!canCompose} className="space-y-6">
                <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">Campaign name</label>
                      <Input
                        value={formData.campaignName}
                        onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                        placeholder="Spring RSVP reminder"
                      />
                      <p className="text-xs text-text-tertiary mt-1">Used to organize drafts, scheduled sends, and history. Subject stays separate.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">Template</label>
                      <select
                        aria-label="Template"
                        value={formData.templateKey}
                        onChange={(e) => applyComposerTemplate(e.target.value as MessageTemplateKey)}
                        className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        {COMPOSER_TEMPLATES.map((template) => (
                          <option key={template.key} value={template.key}>{template.label}</option>
                        ))}
                      </select>
                      <p className="text-xs text-text-tertiary mt-1">{selectedTemplate.detail}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={saveCurrentComposerAsTemplate} disabled={!canCompose}>
                      <Save className="w-3.5 h-3.5 mr-1.5" />Save as reusable template
                    </Button>
                    <span className="text-xs text-text-tertiary self-center">Keeps a lightweight reusable version in this browser for fast repeat campaigns.</span>
                  </div>
                </div>

                <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 p-4">
                  <label className="block text-sm font-medium text-text-primary mb-2">Channel</label>
                  <div className="inline-flex rounded-lg border border-border overflow-hidden bg-white">
                    <button type="button" className={`px-3 py-1.5 text-sm ${formData.channel === 'email' ? 'bg-primary/10 text-primary' : 'text-text-secondary'}`} onClick={() => setFormData({ ...formData, channel: 'email' })}>Email</button>
                    <button type="button" className={`px-3 py-1.5 text-sm border-l border-border ${formData.channel === 'sms' ? 'bg-primary/10 text-primary' : 'text-text-secondary'}`} onClick={() => setFormData({ ...formData, channel: 'sms' })}>Text</button>
                  </div>
                  {formData.channel === 'sms' && (
                    <p className="text-xs text-text-tertiary mt-1">
                      Texts use credits by 160-character segment and only send to guests with phone numbers and text consent.
                      {!smsProviderEnabled ? ' Sending is locked until texting setup is complete.' : ''}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 p-4">
                  <label className="block text-sm font-medium text-text-primary mb-2">Who should get this?</label>
                  {audienceOptions.some((a) => a.value.startsWith('event:')) && (
                    <p className="text-xs text-text-tertiary mb-1">You can also send to itinerary groups from the dropdown.</p>
                  )}
                  <select
                    key={`aud-${audienceOptions.length}`}
                    value={formData.audience}
                    onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-surface-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {audienceOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.count} guests)
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-text-tertiary">{selectedAudienceDetail}</p>
                  {formData.channel === 'email' && activeRecipients < (selectedAudience?.count || 0) && (
                    <p className="text-sm text-warning mt-1">
                      {activeRecipients} of {selectedAudience?.count} guests have email addresses
                    </p>
                  )}
                  {formData.channel === 'sms' && recipientsWithSmsConsent < (selectedAudience?.count || 0) && (
                    <p className="text-sm text-warning mt-1">
                      {recipientsWithSmsConsent} of {selectedAudience?.count} guests have phone numbers and text consent
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2 py-1 text-xs rounded-lg border border-border bg-white text-text-secondary">
                      Reaches {activeRecipients} guest{activeRecipients !== 1 ? 's' : ''}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 text-xs rounded-lg border ${unreachableRecipients > 0 ? 'border-warning/30 bg-warning-light text-warning' : 'border-success/30 bg-success-light text-success'}`}>
                      {unreachableRecipients > 0 ? `${unreachableRecipients} missing ${formData.channel === 'sms' ? 'phone/consent' : 'email addresses'}` : `Everyone in this group is reachable by ${formData.channel === 'sms' ? 'text' : 'email'}`}
                    </span>
                    {formData.channel === 'sms' && (
                      <span className={`inline-flex items-center px-2 py-1 text-xs rounded-lg border ${smsCreditsSufficient ? 'border-success/30 bg-success-light text-success' : 'border-error/30 bg-error-light text-error'}`}>
                        {smsCreditsSufficient ? `${smsCreditsNeeded} credits ready` : `Need ${smsCreditsNeeded - smsCredits} more credits`}
                      </span>
                    )}
                    {formData.channel === 'sms' && (
                      <span className="inline-flex items-center px-2 py-1 text-xs rounded-lg border border-border bg-white text-text-secondary">
                        {smsSegmentCount || 0} segment{smsSegmentCount === 1 ? '' : 's'} x {recipientsWithSmsConsent} recipient{recipientsWithSmsConsent === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </div>

                {formData.channel === 'email' && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Subject <span className="text-error">*</span>
                    </label>
                    <Input
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="For example: Wedding day reminder"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Message <span className="text-error">*</span>
                  </label>
                  <Textarea
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder="Write your message here"
                    rows={8}
                    required
                  />
                  <p className="text-sm text-text-tertiary mt-1">
                    Include the details guests need most, like time, place, or dress code.
                  </p>
                </div>

                <MessageComposerLanguagePreviewPanel languagePreviews={languagePreviews} />

                <MessageComposerSchedulePanel
                  formData={formData}
                  onSetFormData={setFormData}
                />

                <MessageComposerRecipientPreviewPanel
                  activeRecipients={activeRecipients}
                  formData={formData}
                  onTogglePreview={() => setShowRecipientPreview(!showRecipientPreview)}
                  previewRecipients={previewRecipients}
                  showRecipientPreview={showRecipientPreview}
                />

                <MessageComposerPreflightPanel
                  activeRecipients={activeRecipients}
                  audienceReachability={audienceReachability}
                  buyingPack={buyingPack}
                  emailCapacityAfterSend={emailCapacityAfterSend}
                  emailCapacityEnough={emailCapacityEnough}
                  formData={formData}
                  onBuySmsPack={(pack) => { void handleBuySmsPack(pack); }}
                  recipientsWithEmail={recipientsWithEmail}
                  remainingEmailRecipients={remainingEmailRecipients}
                  sending={sending}
                  smsCredits={smsCredits}
                  smsCreditsNeeded={smsCreditsNeeded}
                  smsCreditsSufficient={smsCreditsSufficient}
                  smsProviderEnabled={smsProviderEnabled}
                  smsSegmentCount={smsSegmentCount}
                />

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    disabled={sending || activeRecipients === 0 || (formData.channel === 'email' && !emailCapacityEnough) || (formData.channel === 'sms' && !smsProviderEnabled)}
                  >
                    {sending ? 'Processing...' : (
                      formData.scheduleType === 'later' && !selectedScheduleIsPast ? (
                        <><Calendar className="w-4 h-4 mr-2" />Schedule message</>
                      ) : (
                        <><Send className="w-4 h-4 mr-2" />Send now</>
                      )
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleSendMessage(e, true)}
                    disabled={sending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                  </Button>
                </div>
                </fieldset>
              </form>
            </Card>

            <MessageSavedTemplatesCard
              audienceOptions={audienceOptions}
              savedTemplates={savedTemplates}
              onApplySavedTemplate={applySavedTemplate}
              onDeleteSavedTemplate={deleteSavedTemplate}
            />
          </div>

          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 self-start">
            {showSendingDetails && (
              <MessageReachSnapshotCard
                canCompose={canCompose}
                guests={guests}
                knownPhotoLinksCount={knownPhotoLinksCount}
                messages={messages}
                onApplyComposerTemplate={applyComposerTemplate}
                onApplyDayOfAlertPreset={applyDayOfAlertPreset}
                onApplySaveTheDatePreset={applySaveTheDatePreset}
                onNavigatePhotos={() => navigate('/dashboard/photos')}
                onQuickCreateSaveTheDateCampaign={() => { void quickCreateSaveTheDateCampaign(); }}
              />
            )}

            <MessageStartingPointsCard
              canCompose={canCompose}
              onApplyComposerTemplate={applyComposerTemplate}
            />
          </div>
        </div>

        <MessageHistoryCard
          activeCampaignLatestMessage={activeCampaignLatestMessage}
          activeCampaignThread={activeCampaignThread}
          audienceBreakdown={audienceBreakdown}
          campaignStatusSummary={campaignStatusSummary}
          campaignThreads={campaignThreads}
          canCompose={canCompose}
          channelBreakdown={channelBreakdown}
          deliveries={deliveries}
          deliveryHealth={deliveryHealth}
          filteredHistory={filteredHistory}
          historyAudienceFilter={historyAudienceFilter}
          historyCampaignFilter={historyCampaignFilter}
          historyChannelFilter={historyChannelFilter}
          historyDeliveryFilter={historyDeliveryFilter}
          historySearch={historySearch}
          historyStatusCounts={historyStatusCounts}
          historyStatusFilter={historyStatusFilter}
          messages={messages}
          providerTelemetry={providerTelemetry}
          retryCandidates={retryCandidates}
          retryingMessageId={retryingMessageId}
          reviewCandidates={reviewCandidates}
          onCancelSchedule={(message) => { void handleCancelSchedule(message); }}
          onClearThreadFilter={() => { setHistoryCampaignFilter(''); setHistorySearch(''); }}
          onDuplicateLatest={(message) => loadMessageIntoComposer(message, 'duplicate')}
          onEditLatest={(message) => loadMessageIntoComposer(message, 'edit')}
          onRescheduleMessage={(message) => {
            loadMessageIntoComposer(message, 'edit');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onRetry={(message) => { void handleRetry(message); }}
          onScheduleFollowUp={startScheduledFollowUpFromCampaignThread}
          onSelectThread={(threadName) => {
            setHistoryCampaignFilter(threadName);
            setHistorySearch('');
          }}
          onSendScheduledNow={(message) => { void handleSendScheduledNow(message); }}
          onSetHistoryAudienceFilter={setHistoryAudienceFilter}
          onSetHistoryCampaignFilter={setHistoryCampaignFilter}
          onSetHistoryChannelFilter={setHistoryChannelFilter}
          onSetHistoryDeliveryFilter={setHistoryDeliveryFilter}
          onSetHistorySearch={setHistorySearch}
          onSetHistoryStatusFilter={setHistoryStatusFilter}
          onStartFollowUp={startFollowUpFromCampaignThread}
          onViewMessage={setViewingMessage}
        />
      </div>

      {viewingMessage && (
        <MessageDetailModal
          message={viewingMessage}
          deliveries={deliveries}
          canManageCampaigns={canCompose}
          onClose={() => setViewingMessage(null)}
          onRetry={handleRetry}
          onSendScheduledNow={handleSendScheduledNow}
          onReschedule={handleRescheduleMessage}
          onCancelSchedule={handleCancelSchedule}
          onLoadIntoComposer={loadMessageIntoComposer}
        />
      )}

      <ToastList toasts={toasts} />
    </DashboardLayout>
  );
};
