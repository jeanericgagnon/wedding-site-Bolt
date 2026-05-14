import { buildDayOfUpdateDraft } from '../../../lib/dayOfUpdateHelper';
import { buildEventReminderDraft } from '../../../lib/eventReminderHelper';
import { buildRsvpReminderDraft } from '../../../lib/reminderDraftHelper';
import { customerSafeErrorMessage } from '../../../lib/customerSafeError';
import { getMessageHistoryTimestamp } from '../messageHistoryTime';
import {
  DELIVERY_ACTIVE_STATUSES,
  DELIVERY_COMPLETED_STATUSES,
  EMAIL_CAP_CONSUMING_STATUSES,
  SAVED_COMPOSER_TEMPLATES_STORAGE_KEY,
  type ComposerTemplate,
  type DeliveryRow,
  type Guest,
  type Message,
  type AudienceOption,
  type MessageTemplateKey,
  type SavedComposerTemplate,
} from './messageDashboardTypes';

export function safeMessagesError(err: unknown, fallback: string): string {
  return customerSafeErrorMessage(err, fallback);
}

export function isDeliveryActiveStatus(status: string | null | undefined): boolean {
  return DELIVERY_ACTIVE_STATUSES.includes((status ?? '') as (typeof DELIVERY_ACTIVE_STATUSES)[number]);
}

export function isDeliveryCompletedStatus(status: string | null | undefined): boolean {
  return DELIVERY_COMPLETED_STATUSES.includes((status ?? '') as (typeof DELIVERY_COMPLETED_STATUSES)[number]);
}

export function isEmailCapConsumingStatus(status: string | null | undefined): boolean {
  return EMAIL_CAP_CONSUMING_STATUSES.includes((status ?? '') as (typeof EMAIL_CAP_CONSUMING_STATUSES)[number]);
}

export function canRetryMessageStatus(status: string | null | undefined): boolean {
  return status === 'failed';
}

export function getDeliveryScopedRows(messages: Message[], deliveries: DeliveryRow[], predicate: (message: Message) => boolean): DeliveryRow[] {
  const allowedMessageIds = new Set(messages.filter(predicate).map((message) => message.id));
  return deliveries.filter((delivery) => allowedMessageIds.has(delivery.message_id));
}

export type CampaignStatusSummary = {
  draft: number;
  scheduled: number;
  sent: number;
  partial: number;
  failed: number;
};

export function buildCampaignStatusSummary(messages: Message[]): CampaignStatusSummary {
  const buckets: CampaignStatusSummary = {
    draft: 0,
    scheduled: 0,
    sent: 0,
    partial: 0,
    failed: 0,
  };
  messages.forEach((message) => {
    if (message.status in buckets) {
      buckets[message.status as keyof CampaignStatusSummary] += 1;
    }
  });
  return buckets;
}

export function buildDeliveryStats(messages: Message[]) {
  const sentish = messages.filter((message) => isDeliveryCompletedStatus(message.status));
  const delivered = sentish.reduce((sum, message) => sum + (message.delivered_count ?? 0), 0);
  const failed = sentish.reduce((sum, message) => sum + (message.failed_count ?? 0), 0);
  const targeted = sentish.reduce((sum, message) => sum + getRecipientCount(message), 0);
  const rate = targeted > 0 ? Math.round((delivered / targeted) * 100) : 0;
  return {
    delivered,
    failed,
    targeted,
    rate,
    scheduled: messages.filter((message) => message.status === 'scheduled').length,
    active: messages.filter((message) => message.status === 'queued' || message.status === 'sending').length,
  };
}

export function buildMessageEngagementSummary(messages: Message[]) {
  return messages
    .filter((message) => isDeliveryCompletedStatus(message.status))
    .reduce((summary, message) => {
      const engagement = getMessageEngagementStats(message);
      summary.trackedMessages += 1;
      summary.opened += engagement.opened ?? 0;
      summary.viewed += engagement.viewed ?? 0;
      summary.clicked += engagement.clicked ?? 0;
      summary.replied += engagement.replied ?? 0;
      summary.bounced += engagement.bounced ?? 0;
      return summary;
    }, {
      trackedMessages: 0,
      opened: 0,
      viewed: 0,
      clicked: 0,
      replied: 0,
      bounced: 0,
    });
}

export function buildChannelBreakdown(messages: Message[]) {
  const init = {
    email: { sent: 0, active: 0, scheduled: 0, failed: 0, partial: 0, targeted: 0 },
    sms: { sent: 0, active: 0, scheduled: 0, failed: 0, partial: 0, targeted: 0 },
  };
  messages.forEach((message) => {
    const channel = message.channel === 'sms' ? 'sms' : 'email';
    if (message.status === 'sent') init[channel].sent += 1;
    if (message.status === 'queued' || message.status === 'sending') init[channel].active += 1;
    if (message.status === 'scheduled') init[channel].scheduled += 1;
    if (message.status === 'failed') init[channel].failed += 1;
    if (message.status === 'partial') init[channel].partial += 1;
    if (isDeliveryActiveStatus(message.status)) {
      init[channel].targeted += getRecipientCount(message);
    }
  });
  return init;
}

export function buildChannelEngagementBreakdown(messages: Message[]) {
  const init = {
    email: { trackedMessages: 0, opened: 0, viewed: 0, clicked: 0, replied: 0, bounced: 0 },
    sms: { trackedMessages: 0, opened: 0, viewed: 0, clicked: 0, replied: 0, bounced: 0 },
  };
  messages.forEach((message) => {
    if (!isDeliveryCompletedStatus(message.status)) return;
    const channel = message.channel === 'sms' ? 'sms' : 'email';
    const engagement = getMessageEngagementStats(message);
    init[channel].trackedMessages += 1;
    init[channel].opened += engagement.opened ?? 0;
    init[channel].viewed += engagement.viewed ?? 0;
    init[channel].clicked += engagement.clicked ?? 0;
    init[channel].replied += engagement.replied ?? 0;
    init[channel].bounced += engagement.bounced ?? 0;
  });
  return init;
}

export function buildHistoryStatusCounts(messages: Message[]) {
  return {
    sent: messages.filter((message) => message.status === 'sent').length,
    active: messages.filter((message) => message.status === 'queued' || message.status === 'sending').length,
    scheduled: messages.filter((message) => message.status === 'scheduled').length,
    partial: messages.filter((message) => message.status === 'partial').length,
    failed: messages.filter((message) => message.status === 'failed').length,
    draft: messages.filter((message) => message.status === 'draft').length,
  };
}

export function buildDeliveryHealth(messages: Message[], deliveries: DeliveryRow[]) {
  const deliveryActiveMessages = messages.filter((message) => isDeliveryActiveStatus(message.status));
  const deliveryActiveRows = getDeliveryScopedRows(messages, deliveries, (message) => isDeliveryActiveStatus(message.status));
  const delivered = deliveryActiveMessages.reduce((sum, message) => sum + (message.delivered_count ?? 0), 0);
  const failed = deliveryActiveMessages.reduce((sum, message) => sum + (message.failed_count ?? 0), 0);
  const targeted = deliveryActiveMessages.reduce((sum, message) => sum + getRecipientCount(message), 0);
  const skipped = deliveryActiveRows.filter((delivery) => delivery.status === 'skipped').length;
  const successRate = targeted > 0 ? Math.round((delivered / targeted) * 100) : 0;
  const failRate = targeted > 0 ? Math.round((failed / targeted) * 100) : 0;
  const skippedRate = targeted > 0 ? Math.round((skipped / targeted) * 100) : 0;
  const overdueScheduled = messages.filter((message) => message.status === 'scheduled' && isPastScheduledTime(message.scheduled_for)).length;
  const retryBacklog = messages.filter((message) => message.status === 'failed').length;
  const reviewBacklog = messages.filter((message) => message.status === 'partial').length;
  return { successRate, failRate, skipped, skippedRate, overdueScheduled, retryBacklog, reviewBacklog };
}

export type CampaignThreadSummary = {
  key: string;
  name: string;
  count: number;
  delivered: number;
  failed: number;
  skipped: number;
  unreached: number;
  opened: number;
  viewed: number;
  clicked: number;
  replied: number;
  bounced: number;
  latestStatus: string;
  latestAt: number;
};

export type MessageEngagementStats = {
  opened: number | null;
  viewed: number | null;
  clicked: number | null;
  replied: number | null;
  bounced: number | null;
};

function readRecipientMetricCount(filter: Message['recipient_filter'], keys: string[]): number | null {
  for (const key of keys) {
    const raw = filter?.[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return Math.max(0, Math.floor(raw));
    }
  }
  return null;
}

export function getMessageEngagementStats(message: Message): MessageEngagementStats {
  const filter = message.recipient_filter;
  return {
    opened: readRecipientMetricCount(filter, ['opened_count', 'open_count', 'unique_open_count']),
    viewed: readRecipientMetricCount(filter, ['viewed_count', 'view_count', 'page_view_count']),
    clicked: readRecipientMetricCount(filter, ['clicked_count', 'click_count']),
    replied: readRecipientMetricCount(filter, ['replied_count', 'reply_count']),
    bounced: readRecipientMetricCount(filter, ['bounced_count', 'bounce_count']),
  };
}

function getMessageActivityTimestamp(message: Message): number {
  return Math.max(
    getMessageHistoryTimestamp(message.sent_at),
    getMessageHistoryTimestamp(message.scheduled_for),
  );
}

export function buildCampaignThreads(messages: Message[], deliveries: DeliveryRow[]): CampaignThreadSummary[] {
  const map = new Map<string, CampaignThreadSummary>();

  messages.forEach((message) => {
    const key = getCampaignThreadKey(message);
    const latestAt = getMessageActivityTimestamp(message);
    const prev = map.get(key) ?? {
      key,
      name: key,
      count: 0,
      delivered: 0,
      failed: 0,
      skipped: 0,
      unreached: 0,
      opened: 0,
      viewed: 0,
      clicked: 0,
      replied: 0,
      bounced: 0,
      latestStatus: message.status,
      latestAt,
    };
    const engagement = getMessageEngagementStats(message);

    prev.count += 1;
    prev.delivered += Number(message.delivered_count ?? 0);
    prev.failed += Number(message.failed_count ?? 0);
    prev.skipped += getSkippedCount(message, deliveries);
    prev.unreached += getUnreachedCount(message, deliveries);
    prev.opened += engagement.opened ?? 0;
    prev.viewed += engagement.viewed ?? 0;
    prev.clicked += engagement.clicked ?? 0;
    prev.replied += engagement.replied ?? 0;
    prev.bounced += engagement.bounced ?? 0;
    if (latestAt >= prev.latestAt) {
      prev.latestAt = latestAt;
      prev.latestStatus = message.status;
    }
    map.set(key, prev);
  });

  return Array.from(map.values())
    .sort((a, b) => b.latestAt - a.latestAt)
    .slice(0, 5);
}

export function getActiveCampaignThread(input: {
  campaignThreads: CampaignThreadSummary[];
  historyCampaignFilter: string;
  historySearch: string;
}): CampaignThreadSummary | null {
  if (input.historyCampaignFilter) {
    return input.campaignThreads.find((thread) => thread.name === input.historyCampaignFilter) ?? null;
  }
  const query = input.historySearch.trim().toLowerCase();
  if (!query) return null;
  return input.campaignThreads.find((thread) => thread.name.toLowerCase() === query) ?? null;
}

export function getActiveCampaignMessages(messages: Message[], activeCampaignThread: CampaignThreadSummary | null): Message[] {
  if (!activeCampaignThread) return [];
  return messages
    .filter((message) => getCampaignThreadKey(message) === activeCampaignThread.name)
    .sort((a, b) => getMessageActivityTimestamp(b) - getMessageActivityTimestamp(a));
}

export function buildProviderTelemetry(messages: Message[], deliveries: DeliveryRow[]) {
  const completedDeliveryRows = getDeliveryScopedRows(messages, deliveries, (message) => isDeliveryCompletedStatus(message.status));
  const attempted = completedDeliveryRows.filter((delivery) => delivery.status === 'sent' || delivery.status === 'failed');
  const sent = completedDeliveryRows.filter((delivery) => delivery.status === 'sent').length;
  const failed = completedDeliveryRows.filter((delivery) => delivery.status === 'failed').length;
  const skipped = completedDeliveryRows.filter((delivery) => delivery.status === 'skipped').length;
  const errorTop = Array.from(
    completedDeliveryRows
      .filter((delivery) => delivery.status === 'failed' && delivery.error_message)
      .reduce((map, delivery) => {
        const key = getCustomerDeliveryReason(delivery.error_message, 'Unknown delivery issue').slice(0, 60);
        map.set(key, (map.get(key) ?? 0) + 1);
        return map;
      }, new Map<string, number>())
      .entries(),
  ).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const sentRate = attempted.length > 0 ? Math.round((sent / attempted.length) * 100) : 0;
  return { attempted: attempted.length, sent, failed, skipped, sentRate, errorTop };
}

export function buildDeliveryBucketSummary(
  deliveries: DeliveryRow[],
  status: DeliveryRow['status'],
  limit = 3,
): Array<[string, number]> {
  return Array.from(
    deliveries
      .filter((delivery) => delivery.status === status)
      .reduce((map, delivery) => {
        const key = getCustomerDeliveryBucket(delivery.error_message, delivery.status);
        map.set(key, (map.get(key) ?? 0) + 1);
        return map;
      }, new Map<string, number>())
      .entries(),
  ).sort((a, b) => b[1] - a[1]).slice(0, Math.max(1, limit));
}

export type MessageHistoryStatusFilter = 'all' | 'active' | 'sent' | 'scheduled' | 'draft' | 'failed' | 'partial';
export type MessageHistoryChannelFilter = 'all' | 'email' | 'sms';
export type MessageHistoryDeliveryFilter = 'all' | 'delivered' | 'failed' | 'skipped' | 'unreached';

export function filterMessageHistory({
  messages,
  deliveries,
  statusFilter,
  channelFilter,
  audienceFilter,
  deliveryFilter,
  campaignFilter,
  search,
}: {
  messages: Message[];
  deliveries: DeliveryRow[];
  statusFilter: MessageHistoryStatusFilter;
  channelFilter: MessageHistoryChannelFilter;
  audienceFilter: string;
  deliveryFilter: MessageHistoryDeliveryFilter;
  campaignFilter: string;
  search: string;
}): Message[] {
  const query = search.trim().toLowerCase();
  return messages.filter((message) => {
    if (statusFilter === 'active') {
      if (!(message.status === 'queued' || message.status === 'sending')) return false;
    } else if (statusFilter !== 'all' && message.status !== statusFilter) {
      return false;
    }
    if (channelFilter !== 'all' && message.channel !== channelFilter) return false;
    const audience = message.audience_filter ?? (message.recipient_filter?.audience as string) ?? 'all';
    if (audienceFilter !== 'all' && audience !== audienceFilter) return false;
    if (campaignFilter && getCampaignThreadKey(message) !== campaignFilter) return false;

    const skippedCount = getSkippedCount(message, deliveries);
    const failedCount = Number(message.failed_count ?? 0);
    const deliveredCount = Number(message.delivered_count ?? 0);
    const unreachedCount = getUnreachedCount(message, deliveries);
    if (deliveryFilter === 'delivered' && deliveredCount <= 0) return false;
    if (deliveryFilter === 'failed' && failedCount <= 0) return false;
    if (deliveryFilter === 'skipped' && skippedCount <= 0) return false;
    if (deliveryFilter === 'unreached' && unreachedCount <= 0) return false;

    if (query) {
      const haystack = [
        message.subject,
        message.body,
        audience,
        message.channel,
        message.status,
        getCampaignName(message),
        getCampaignTypeLabel(message),
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function buildAudienceBreakdown(messages: Message[]): Array<[string, number]> {
  const map = new Map<string, number>();
  messages.forEach((message) => {
    const key = getAudienceLabel(message);
    map.set(key, (map.get(key) ?? 0) + getRecipientCount(message));
  });
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
}

export function buildSegmentPerformance(
  messages: Message[],
  itineraryAudienceOptions: Pick<AudienceOption, 'value' | 'label'>[],
): Array<[string, { sent: number; failed: number; targeted: number }]> {
  const eventLabelById = new Map<string, string>();
  itineraryAudienceOptions.forEach((option) => {
    const id = option.value.replace('event:', '');
    eventLabelById.set(id, option.label);
  });

  const map = new Map<string, { sent: number; failed: number; targeted: number }>();
  messages.forEach((message) => {
    const audience = message.audience_filter ?? '';
    if (!audience.startsWith('event:')) return;
    const eventId = audience.replace('event:', '');
    const key = eventLabelById.get(eventId) ?? eventId;
    const prev = map.get(key) ?? { sent: 0, failed: 0, targeted: 0 };
    if (message.status === 'sent' || message.status === 'partial') prev.sent += 1;
    if (message.status === 'failed') prev.failed += 1;
    prev.targeted += getRecipientCount(message);
    map.set(key, prev);
  });

  return Array.from(map.entries()).sort((a, b) => b[1].targeted - a[1].targeted).slice(0, 4);
}

export function buildAudienceReachability(recipients: Guest[]) {
  const withEmail = recipients.filter((guest) => hasReachableEmail(guest.email)).length;
  const withPhone = recipients.filter((guest) => hasReachableSms(guest)).length;
  return {
    total: recipients.length,
    missingEmail: Math.max(recipients.length - withEmail, 0),
    missingPhone: Math.max(recipients.length - withPhone, 0),
  };
}

export function isSavedTemplateScheduleUsable(template: SavedComposerTemplate): boolean {
  return template.scheduleType === 'later'
    && !!template.scheduleDate
    && !!template.scheduleTime
    && !isPastScheduledTime(`${template.scheduleDate}T${template.scheduleTime}:00`);
}

export const SAVED_COMPOSER_TEMPLATE_RETENTION_MS = 1000 * 60 * 60 * 24 * 30;
export const MAX_SAVED_COMPOSER_TEMPLATE_BODY_LENGTH = 4000;
const MAX_SAVED_COMPOSER_TEMPLATE_SUBJECT_LENGTH = 240;
const MAX_SAVED_COMPOSER_TEMPLATE_NAME_LENGTH = 80;
const MAX_SAVED_COMPOSER_TEMPLATES = 12;

type SavedComposerTemplatesEnvelope = {
  savedAtISO: string;
  value: SavedComposerTemplate[];
};

const isFreshSavedComposerTemplatesTimestamp = (value: unknown, now = Date.now()) => {
  if (typeof value !== 'string') return false;
  const savedAtMs = Date.parse(value);
  return Number.isFinite(savedAtMs) && savedAtMs <= now && now - savedAtMs <= SAVED_COMPOSER_TEMPLATE_RETENTION_MS;
};

const isSavedComposerTemplatesEnvelope = (value: unknown): value is SavedComposerTemplatesEnvelope => (
  Boolean(value)
  && typeof value === 'object'
  && !Array.isArray(value)
  && typeof (value as SavedComposerTemplatesEnvelope).savedAtISO === 'string'
  && Array.isArray((value as SavedComposerTemplatesEnvelope).value)
);

export function normalizeSavedComposerTemplateText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function normalizeSavedComposerTemplate(item: SavedComposerTemplate): SavedComposerTemplate {
  const createdAt = typeof item?.createdAt === 'string' ? item.createdAt : new Date().toISOString();
  const updatedAt = typeof item?.updatedAt === 'string' ? item.updatedAt : createdAt;
  const scheduleType = item?.scheduleType === 'later' ? 'later' : 'now';
  const scheduleDate = typeof item?.scheduleDate === 'string' ? item.scheduleDate : '';
  const scheduleTime = typeof item?.scheduleTime === 'string' ? item.scheduleTime : '';
  return {
    ...item,
    name: normalizeSavedComposerTemplateText(item.name, MAX_SAVED_COMPOSER_TEMPLATE_NAME_LENGTH),
    subject: normalizeSavedComposerTemplateText(item.subject, MAX_SAVED_COMPOSER_TEMPLATE_SUBJECT_LENGTH),
    body: normalizeSavedComposerTemplateText(item.body, MAX_SAVED_COMPOSER_TEMPLATE_BODY_LENGTH),
    audience: normalizeSavedComposerTemplateText(item.audience, MAX_SAVED_COMPOSER_TEMPLATE_NAME_LENGTH),
    campaignName: normalizeSavedComposerTemplateText(item.campaignName, MAX_SAVED_COMPOSER_TEMPLATE_NAME_LENGTH),
    scheduleType,
    scheduleDate,
    scheduleTime,
    createdAt,
    updatedAt,
  };
}

function buildSavedComposerTemplatesEnvelope(items: SavedComposerTemplate[]): SavedComposerTemplatesEnvelope {
  return {
    savedAtISO: new Date().toISOString(),
    value: normalizeSavedComposerTemplates(items),
  };
}

export function readSavedComposerTemplates(): SavedComposerTemplate[] {
  try {
    const raw = localStorage.getItem(SAVED_COMPOSER_TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (isSavedComposerTemplatesEnvelope(parsed)) {
      if (!isFreshSavedComposerTemplatesTimestamp(parsed.savedAtISO)) {
        localStorage.removeItem(SAVED_COMPOSER_TEMPLATES_STORAGE_KEY);
        return [];
      }
      return normalizeSavedComposerTemplates(parsed.value.filter(isValidSavedComposerTemplate));
    }
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(SAVED_COMPOSER_TEMPLATES_STORAGE_KEY);
      return [];
    }

    const normalized = normalizeSavedComposerTemplates(parsed.filter(isValidSavedComposerTemplate));
    localStorage.setItem(SAVED_COMPOSER_TEMPLATES_STORAGE_KEY, JSON.stringify(buildSavedComposerTemplatesEnvelope(normalized)));
    return normalized;
  } catch {
    try {
      localStorage.removeItem(SAVED_COMPOSER_TEMPLATES_STORAGE_KEY);
    } catch {
      // ignore cleanup failures so the dashboard remains usable in private modes.
    }
    return [];
  }
}

export function migrateSavedComposerTemplatesStorage(): boolean {
  try {
    const raw = localStorage.getItem(SAVED_COMPOSER_TEMPLATES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return false;

    const normalized = normalizeSavedComposerTemplates(parsed.filter(isValidSavedComposerTemplate));
    if (JSON.stringify(parsed) === JSON.stringify(normalized)) return writeSavedComposerTemplates(normalized);

    return writeSavedComposerTemplates(normalized);
  } catch {
    return false;
  }
}

export function normalizeSavedComposerTemplates(items: SavedComposerTemplate[]): SavedComposerTemplate[] {
  return items
    .map((item) => normalizeSavedComposerTemplate(item))
    .filter((item) => item.name && item.subject && item.body)
    .slice(0, MAX_SAVED_COMPOSER_TEMPLATES);
}

export function isValidSavedComposerTemplate(item: unknown): item is SavedComposerTemplate {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Record<string, unknown>;
  return typeof candidate.id === 'string'
    && typeof candidate.name === 'string'
    && typeof candidate.subject === 'string'
    && typeof candidate.body === 'string'
    && (candidate.channel === 'email' || candidate.channel === 'sms')
    && typeof candidate.audience === 'string'
    && typeof candidate.campaignName === 'string';
}

export function writeSavedComposerTemplates(items: SavedComposerTemplate[]) {
  try {
    const normalized = normalizeSavedComposerTemplates(items);
    if (normalized.length === 0) {
      localStorage.removeItem(SAVED_COMPOSER_TEMPLATES_STORAGE_KEY);
      return true;
    }
    localStorage.setItem(SAVED_COMPOSER_TEMPLATES_STORAGE_KEY, JSON.stringify(buildSavedComposerTemplatesEnvelope(normalized)));
    return true;
  } catch {
    return false;
  }
}

export function normalizeSavedTemplateName(name: string): string {
  return name.trim().toLowerCase();
}

const PHOTO_ALBUM_LINKS_STORAGE_KEY = 'dayof.photoAlbumLinks';
const STORED_PHOTO_ALBUM_LINKS_RETENTION_MS = 1000 * 60 * 60 * 24 * 30;
const MAX_STORED_PHOTO_ALBUM_LINKS = 12;
const MAX_STORED_PHOTO_ALBUM_LINK_LENGTH = 400;

type StoredPhotoAlbumLinksEnvelope = {
  savedAtISO: string;
  value: string[];
};

const isFreshStoredPhotoAlbumLinksTimestamp = (value: unknown, now = Date.now()) => {
  if (typeof value !== 'string') return false;
  const savedAtMs = Date.parse(value);
  return Number.isFinite(savedAtMs) && savedAtMs <= now && now - savedAtMs <= STORED_PHOTO_ALBUM_LINKS_RETENTION_MS;
};

const isStoredPhotoAlbumLinksEnvelope = (value: unknown): value is StoredPhotoAlbumLinksEnvelope => (
  Boolean(value)
  && typeof value === 'object'
  && !Array.isArray(value)
  && typeof (value as StoredPhotoAlbumLinksEnvelope).savedAtISO === 'string'
  && Array.isArray((value as StoredPhotoAlbumLinksEnvelope).value)
);

function normalizeStoredPhotoAlbumLinks(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().slice(0, MAX_STORED_PHOTO_ALBUM_LINK_LENGTH))
      .filter((item) => /^https?:\/\//i.test(item))
      .slice(0, MAX_STORED_PHOTO_ALBUM_LINKS);
  }
  if (!value || typeof value !== 'object') return [];
  return Object.values(value as Record<string, unknown>)
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, MAX_STORED_PHOTO_ALBUM_LINK_LENGTH))
    .filter((item) => /^https?:\/\//i.test(item))
    .slice(0, MAX_STORED_PHOTO_ALBUM_LINKS);
}

export function readStoredPhotoAlbumLinks(): string[] {
  try {
    const raw = localStorage.getItem(PHOTO_ALBUM_LINKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (isStoredPhotoAlbumLinksEnvelope(parsed)) {
      if (!isFreshStoredPhotoAlbumLinksTimestamp(parsed.savedAtISO)) {
        localStorage.removeItem(PHOTO_ALBUM_LINKS_STORAGE_KEY);
        return [];
      }
      return normalizeStoredPhotoAlbumLinks(parsed.value);
    }
    const normalized = normalizeStoredPhotoAlbumLinks(parsed);
    localStorage.setItem(PHOTO_ALBUM_LINKS_STORAGE_KEY, JSON.stringify({
      savedAtISO: new Date().toISOString(),
      value: normalized,
    }));
    return normalized;
  } catch {
    try {
      localStorage.removeItem(PHOTO_ALBUM_LINKS_STORAGE_KEY);
    } catch {
      // ignore cleanup failures so the dashboard remains usable in private modes.
    }
    return [];
  }
}

export function countStoredPhotoAlbumLinks(): number {
  return readStoredPhotoAlbumLinks().length;
}

export function getPreferredStoredPhotoAlbumLink(): string | null {
  return readStoredPhotoAlbumLinks()[0] ?? null;
}

export const COMPOSER_TEMPLATES: ComposerTemplate[] = [
  {
    key: 'blank',
    label: 'Blank message',
    detail: 'Start from scratch.',
    defaultChannel: 'email',
    build: () => ({ subject: '', body: '' }),
  },
  {
    key: 'save-the-date',
    label: 'Save the date',
    detail: 'Early heads-up with a clean scheduled campaign shape.',
    campaignType: 'save-the-date',
    defaultChannel: 'email',
    build: ({ applyTemplateVariables }) => ({
      subject: applyTemplateVariables('Save the Date!'),
      body: applyTemplateVariables('We are thrilled to invite you to our wedding! Please mark your calendars for [DATE] at [VENUE]. Formal invitation to follow.'),
    }),
  },
  {
    key: 'rsvp-reminder',
    label: 'RSVP reminder',
    detail: 'Nudge anyone who still has not replied.',
    campaignType: 'rsvp-reminder',
    defaultChannel: 'email',
    build: ({ audienceLabel, applyTemplateVariables }) => {
      const draft = buildRsvpReminderDraft({ audienceLabel });
      return {
        subject: applyTemplateVariables(draft.subject),
        body: applyTemplateVariables(draft.body),
      };
    },
  },
  {
    key: 'event-reminder',
    label: 'Event reminder',
    detail: 'Useful reminder for a specific event or group.',
    campaignType: 'event-reminder',
    defaultChannel: 'email',
    build: ({ audienceLabel, venue, applyTemplateVariables }) => {
      const draft = buildEventReminderDraft({
        audienceLabel,
        eventLabel: audienceLabel && audienceLabel !== 'All Guests' ? audienceLabel : 'the celebration',
        venue,
      });
      return {
        subject: applyTemplateVariables(draft.subject),
        body: applyTemplateVariables(draft.body),
      };
    },
  },
  {
    key: 'day-of-update',
    label: 'Day-of update',
    detail: 'Quick note for guests when plans shift.',
    campaignType: 'day-of-update',
    defaultChannel: 'sms',
    build: ({ audienceLabel, venue, weddingDate, applyTemplateVariables }) => {
      const draft = buildDayOfUpdateDraft({ venue, weddingDate, audienceLabel });
      return {
        subject: applyTemplateVariables(draft.subject),
        body: applyTemplateVariables(draft.body),
      };
    },
  },
  {
    key: 'photo-request',
    label: 'Photo request',
    detail: 'Ask guests to upload photos after the event.',
    campaignType: 'photo-request',
    defaultChannel: 'email',
    build: ({ applyTemplateVariables }) => ({
      subject: applyTemplateVariables('Share your photos with us 📸'),
      body: applyTemplateVariables('We made a photo upload link so everyone can share their favorite moments from the event. Upload here: [PHOTO LINK]'),
    }),
  },
  {
    key: 'thank-you',
    label: 'Thank you',
    detail: 'Close the loop after the celebration.',
    campaignType: 'thank-you',
    defaultChannel: 'email',
    build: ({ applyTemplateVariables }) => ({
      subject: applyTemplateVariables('Thank You!'),
      body: applyTemplateVariables('Thank you so much for celebrating our special day with us! Your presence meant the world to us. We are grateful for your love and support.'),
    }),
  },
];

export function isPastScheduledTime(scheduledFor: string | null): boolean {
  if (!scheduledFor) return false;
  return new Date(scheduledFor) < new Date();
}

export function hasReachableEmail(email: string | null | undefined): boolean {
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function hasReachableSms(guest: Pick<Guest, 'phone' | 'sms_consent'>): boolean {
  return !!guest.phone?.trim() && guest.sms_consent === true;
}

export function formatScheduledDate(scheduledFor: string): string {
  const d = new Date(scheduledFor);
  const local = d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const utcOffset = -d.getTimezoneOffset() / 60;
  const sign = utcOffset >= 0 ? '+' : '-';
  const absOffset = Math.abs(utcOffset);
  return `${local} (UTC${sign}${absOffset})`;
}

export function getAudienceLabel(message: Message): string {
  const audience = message.audience_filter ?? (message.recipient_filter?.audience as string) ?? 'all';
  if (typeof audience === 'string' && audience.startsWith('event:')) {
    return (message.recipient_filter?.audience_label as string) ?? 'Itinerary segment';
  }
  switch (audience) {
    case 'attending': return 'Attending guests';
    case 'not_responded': return 'Not yet responded';
    case 'declined': return 'Declined guests';
    case 'missing_address': return 'Missing address';
    case 'missing_meal': return 'Missing meal';
    default: return 'All guests';
  }
}

export function getRecipientCount(message: Message): number {
  return message.recipient_count ?? (message.recipient_filter?.recipient_count as number) ?? 0;
}

export function getSkippedCount(message: Message, deliveries: DeliveryRow[]): number {
  const fromDeliveries = deliveries.filter((delivery) => delivery.message_id === message.id && delivery.status === 'skipped').length;
  if (fromDeliveries > 0) return fromDeliveries;
  const fallback = message.recipient_filter?.skipped_count;
  return typeof fallback === 'number' ? fallback : 0;
}

export function getUnreachedCount(message: Message, deliveries?: DeliveryRow[]): number {
  const total = getRecipientCount(message);
  const delivered = Number(message.delivered_count ?? 0);
  const failed = Number(message.failed_count ?? 0);
  const skipped = deliveries ? getSkippedCount(message, deliveries) : 0;
  const reachable = message.recipient_filter?.reachable_count;

  if (typeof reachable === 'number' && (!deliveries || deliveries.length === 0)) {
    return Math.max(reachable - delivered - failed, 0);
  }

  return Math.max(total - delivered - failed - skipped, 0);
}

export function getCampaignThreadKey(message: Message): string {
  return getCampaignName(message) ?? message.subject ?? message.id;
}

export function getCampaignTypeLabel(message: Message): string | null {
  const raw = message.recipient_filter?.campaignType as string | undefined;
  if (!raw) return null;
  if (raw === 'save-the-date') return 'Save-the-date';
  return raw;
}

export function getCampaignName(message: Message): string | null {
  const raw = message.recipient_filter?.campaignName;
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
}

export function getTemplateKey(message: Message): MessageTemplateKey {
  const raw = message.recipient_filter?.templateKey;
  if (typeof raw !== 'string') return 'blank';
  return (COMPOSER_TEMPLATES.some((tpl) => tpl.key === raw) ? raw : 'blank') as MessageTemplateKey;
}

export function getCustomerDeliveryReason(message: string | null | undefined, fallback: string) {
  const cleaned = (message || fallback)
    .replace(/\b(provider|twilio|telnyx|sendgrid|resend)\b/gi, 'delivery service')
    .replace(/\bapi\b/gi, 'delivery service')
    .replace(/\s+/g, ' ')
    .trim();
  return customerSafeErrorMessage(cleaned, fallback, {
    allow: [
      /\b(delivery|message|email|phone|contact|recipient|address|number|missing|invalid|blocked|bounced|unsubscribed|review|retry|attention|details)\b/i,
    ],
  });
}

export function getCustomerDeliveryBucket(message: string | null | undefined, status: DeliveryRow['status'] | string): string {
  const normalized = (message ?? '').toLowerCase();

  if (status === 'skipped') {
    if (/\b(phone|sms consent|number)\b/.test(normalized)) return 'Missing phone number or text consent';
    return 'Missing contact details';
  }

  if (/\b(unsubscribed|opt.?out|blocked|spam complaint)\b/.test(normalized)) return 'Blocked or unsubscribed';
  if (/\b(bounced|invalid email|mailbox|recipient address rejected)\b/.test(normalized)) return 'Email address needs review';
  if (/\b(invalid phone|invalid number|line type|undeliverable handset)\b/.test(normalized)) return 'Phone number needs review';
  if (/\b(rate limit|timeout|temporar|try again later|service unavailable|network)\b/.test(normalized)) return 'Temporary delivery issue';
  return status === 'skipped' ? 'Missing contact details' : 'Delivery needs review';
}

function readRecipientFilterGuestIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean),
  ));
}

export function getRecipientRetryGuestIds(message: Message): string[] {
  return readRecipientFilterGuestIds(message.recipient_filter?.retry_guest_ids);
}

export function getRecipientExcludedGuestIds(message: Message): string[] {
  return readRecipientFilterGuestIds(message.recipient_filter?.excluded_guest_ids);
}

export function getRecipientReviewPlanSummary(message: Message): string | null {
  const retryCount = getRecipientRetryGuestIds(message).length;
  const excludedCount = getRecipientExcludedGuestIds(message).length;
  if (retryCount <= 0 && excludedCount <= 0) return null;

  const parts: string[] = [];
  if (retryCount > 0) parts.push(`next send targets ${retryCount} ${retryCount === 1 ? 'reviewed guest' : 'reviewed guests'}`);
  if (excludedCount > 0) parts.push(`excludes ${excludedCount} ${excludedCount === 1 ? 'guest still missing contact details' : 'guests still missing contact details'}`);
  return parts.join(' and ');
}

export function describeRecipientReview(count: number): string {
  return `${count} ${count === 1 ? 'recipient needs' : 'recipients need'} contact details`;
}
