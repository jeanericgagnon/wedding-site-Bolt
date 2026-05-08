import { useCallback, useEffect, useState } from 'react';
import { readPlannerAccessRole, writePlannerAccessRole, type PlannerAccessRole, type PlannerPermissionKey } from '../../../lib/plannerAccess';
import {
  migrateSavedComposerTemplatesStorage,
  readSavedComposerTemplates,
  type MessageHistoryChannelFilter,
  type MessageHistoryDeliveryFilter,
  type MessageHistoryStatusFilter,
} from './messageDashboardUtils';
import type {
  AudienceOption,
  DeliveryRow,
  Guest,
  Message,
  MessageTemplateKey,
  SavedComposerTemplate,
  SmsCreditTransaction,
  Toast,
  WeddingSite,
} from './messageDashboardTypes';

export function useMessageDashboardUiState() {
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
      writePlannerAccessRole('messages', weddingSite.id, messagesRole);
    } catch {
      // noop
    }
  }, [weddingSite?.id, messagesRole]);

  const toast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts((previous) => [...previous, { id, message, type }]);
    setTimeout(() => setToasts((previous) => previous.filter((toastEntry) => toastEntry.id !== id)), 4000);
  }, []);

  return {
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
    setToasts,
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
  };
}
