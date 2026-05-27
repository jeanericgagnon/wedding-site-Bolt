import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { DashboardStateBlock } from '../../components/dashboard/DashboardStateBlock';
import { Card, Button, Input, Textarea } from '../../components/ui';
import { Send, Mail, Users, Clock, CheckCircle, Calendar, Save, AtSign, AlertCircle, Eye, ChevronDown, ChevronUp, RefreshCw, X, ArrowLeft, Loader2, Link2, Copy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { demoEvents, demoGuests, demoWeddingSite } from '../../lib/demoData';
import { createSmsCreditsSession } from '../../lib/stripeService';
import { canComposeDashboardMessages, canEditPlannerSurface, derivePlannerRoleFromPermissions, readPlannerAccessRole, writePlannerAccessRole, type PlannerAccessRole } from '../../lib/plannerAccess';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { GUEST_COMMUNICATION_FLOW } from '../../lib/guestCommunicationFlow';
import { buildRsvpReminderDraft } from '../../lib/reminderDraftHelper';
import { buildDayOfUpdateDraft } from '../../lib/dayOfUpdateHelper';
import { buildEventReminderDraft } from '../../lib/eventReminderHelper';
import { buildGuestOpsCoach, buildGuestOutreachSequence, buildMessageOpsCoach } from '../../lib/guestOpsCoach';
import { buildDayOfDispatchModel } from './dayOfDispatch';
import { getFlowStatusLabel } from '../../lib/flowLabels';
import { formatMessageEventOptionLabel } from './messageEventDate';
import { formatMessageHistoryDate, formatMessageHistoryDateTime, getMessageHistoryTimestamp } from './messageHistoryTime';
import { formatScheduledMessageDateTime, parseScheduleInputToIso, toScheduleInputValue } from './messageScheduleTime';
import { getMessageTemplateCoupleLabel } from './messageTemplateVariables';

const BULK_SEND_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-bulk-message`;
const DEMO_MESSAGES_STORAGE_KEY = 'dayof.demo.messages.history';
const RSVP_CONTINUITY_EVENT = 'dayof:rsvp-updated';
const RSVP_CONTINUITY_STORAGE_KEY = 'dayof.rsvp.updatedAt';

// Optional table: can be missing in lean deployments.
// Start unknown, then permanently disable after one confirmed missing-table miss.
let hasMessageDeliveriesTable: boolean | null = null;


function buildDemoMessageSeed(): Message[] {
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  return [
    {
      id: 'demo-msg-1',
      subject: 'Welcome to our wedding week ✨',
      body: 'Hi everyone! We are so excited to celebrate with you. Please check the itinerary for final timing updates.',
      sent_at: iso(now - 1000 * 60 * 60 * 24 * 3),
      scheduled_for: null,
      status: 'sent',
      channel: 'email',
      audience_filter: 'all',
      recipient_filter: { audience: 'all', recipient_count: 120 },
      recipient_count: 120,
      delivered_count: 117,
      failed_count: 3,
    },
    {
      id: 'demo-msg-2',
      subject: 'RSVP reminder',
      body: 'Quick reminder to submit your RSVP by Friday so we can finalize seating and catering. Thank you!',
      sent_at: iso(now - 1000 * 60 * 60 * 24),
      scheduled_for: null,
      status: 'partial',
      channel: 'email',
      audience_filter: 'not_responded',
      recipient_filter: { audience: 'not_responded', recipient_count: 34 },
      recipient_count: 34,
      delivered_count: 31,
      failed_count: 3,
    },
    {
      id: 'demo-msg-3',
      subject: 'Ceremony starts at 4:30 PM',
      body: 'Please arrive 15 minutes early. Parking and shuttle details are in the Travel page.',
      sent_at: null,
      scheduled_for: iso(now + 1000 * 60 * 60 * 10),
      status: 'scheduled',
      channel: 'email',
      audience_filter: 'all',
      recipient_filter: { audience: 'all', recipient_count: 120 },
      recipient_count: 120,
      delivered_count: 0,
      failed_count: 0,
    },
    {
      id: 'demo-msg-4',
      subject: 'Vendor update draft',
      body: 'Draft for internal coordination: timeline lock by Wednesday noon.',
      sent_at: null,
      scheduled_for: null,
      status: 'draft',
      channel: 'email',
      audience_filter: 'all',
      recipient_filter: { audience: 'all', recipient_count: 0 },
      recipient_count: 0,
      delivered_count: 0,
      failed_count: 0,
    },
  ];
}

function readDemoMessages(): Message[] {
  try {
    const raw = localStorage.getItem(DEMO_MESSAGES_STORAGE_KEY);
    if (!raw) return buildDemoMessageSeed();
    const parsed = JSON.parse(raw) as Message[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : buildDemoMessageSeed();
  } catch {
    return buildDemoMessageSeed();
  }
}

function writeDemoMessages(items: Message[]) {
  try {
    localStorage.setItem(DEMO_MESSAGES_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

async function triggerBulkSend(messageId: string): Promise<{ delivered: number; failed: number; skipped?: number; total: number; status: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(BULK_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messageId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(body?.error ?? `Send failed (${res.status})`);
  }
  return res.json();
}

async function triggerScheduledDispatch(limit = 10): Promise<{ processed: number; sent: number; failed: number; partial: number; skippedMessages: number; skippedRecipients: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(BULK_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ processScheduled: true, limit }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(body?.error ?? `Scheduled send run failed (${res.status})`);
  }
  return res.json();
}

interface Message {
  id: string;
  subject: string;
  body: string;
  sent_at: string | null;
  scheduled_for: string | null;
  status: string;
  channel: string;
  recipient_filter: Record<string, unknown> | null;
  audience_filter?: string | null;
  recipient_count?: number | null;
  delivered_count?: number | null;
  failed_count?: number | null;
}

interface Guest {
  id: string;
  email: string | null;
  phone?: string | null;
  rsvp_status: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
}

interface WeddingSite {
  id: string;
  couple_first_name: string | null;
  couple_second_name: string | null;
  couple_email: string | null;
  venue_name?: string | null;
  wedding_date?: string | null;
  sms_credits_balance?: number;
}

interface SmsCreditTransaction {
  id: string;
  credits_delta: number;
  reason: string;
  created_at: string;
  expires_at?: string | null;
  remaining_credits?: number | null;
}

interface AudienceOption {
  value: string;
  label: string;
  count: number;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface DeliveryRow {
  id: string;
  message_id: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  provider_message_id: string | null;
  error_message: string | null;
  attempted_at: string | null;
  delivered_at: string | null;
  recipient_email: string;
  recipient_name?: string | null;
}

type ChannelType = 'email' | 'sms';

const DELIVERY_ACTIVE_STATUSES = ['queued', 'sending', 'sent', 'partial', 'failed'] as const;
const DELIVERY_COMPLETED_STATUSES = ['sent', 'partial', 'failed'] as const;
const EMAIL_CAP_CONSUMING_STATUSES = ['queued', 'sent', 'partial'] as const;

function isDeliveryActiveStatus(status: string | null | undefined): boolean {
  return DELIVERY_ACTIVE_STATUSES.includes((status ?? '') as (typeof DELIVERY_ACTIVE_STATUSES)[number]);
}

function isDeliveryCompletedStatus(status: string | null | undefined): boolean {
  return DELIVERY_COMPLETED_STATUSES.includes((status ?? '') as (typeof DELIVERY_COMPLETED_STATUSES)[number]);
}

function isEmailCapConsumingStatus(status: string | null | undefined): boolean {
  return EMAIL_CAP_CONSUMING_STATUSES.includes((status ?? '') as (typeof EMAIL_CAP_CONSUMING_STATUSES)[number]);
}

function canRetryMessageStatus(status: string | null | undefined): boolean {
  return status === 'failed';
}

function getDeliveryScopedRows(messages: Message[], deliveries: DeliveryRow[], predicate: (message: Message) => boolean): DeliveryRow[] {
  const allowedMessageIds = new Set(messages.filter(predicate).map((message) => message.id));
  return deliveries.filter((delivery) => allowedMessageIds.has(delivery.message_id));
}

type MessageTemplateKey =
  | 'blank'
  | 'save-the-date'
  | 'rsvp-reminder'
  | 'event-reminder'
  | 'day-of-update'
  | 'photo-request'
  | 'thank-you';

interface ComposerTemplate {
  key: MessageTemplateKey;
  label: string;
  detail: string;
  campaignType?: string;
  defaultChannel: ChannelType;
  build: (input: {
    audienceLabel: string | null;
    venue: string | null;
    weddingDate: string | null;
    applyTemplateVariables: (text: string) => string;
  }) => { subject: string; body: string };
}

interface SavedComposerTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  channel: ChannelType;
  audience: string;
  campaignName: string;
  scheduleType?: 'now' | 'later';
  scheduleDate?: string;
  scheduleTime?: string;
  createdAt: string;
  updatedAt?: string;
}

function isSavedTemplateScheduleUsable(template: SavedComposerTemplate): boolean {
  return template.scheduleType === 'later'
    && !!template.scheduleDate
    && !!template.scheduleTime
    && !isPastScheduledTime(`${template.scheduleDate}T${template.scheduleTime}:00`);
}

const SAVED_COMPOSER_TEMPLATES_STORAGE_KEY = 'dayof.savedComposerTemplates.v1';

function readSavedComposerTemplates(): SavedComposerTemplate[] {
  try {
    const raw = localStorage.getItem(SAVED_COMPOSER_TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return normalizeSavedComposerTemplates(parsed.filter(isValidSavedComposerTemplate));
  } catch {
    return [];
  }
}

function normalizeSavedComposerTemplates(items: SavedComposerTemplate[]): SavedComposerTemplate[] {
  return items.map((item) => {
    const createdAt = typeof item?.createdAt === 'string' ? item.createdAt : new Date().toISOString();
    const updatedAt = typeof item?.updatedAt === 'string' ? item.updatedAt : createdAt;
    const scheduleType = item?.scheduleType === 'later' ? 'later' : 'now';
    const scheduleDate = typeof item?.scheduleDate === 'string' ? item.scheduleDate : '';
    const scheduleTime = typeof item?.scheduleTime === 'string' ? item.scheduleTime : '';
    return {
      ...item,
      scheduleType,
      scheduleDate,
      scheduleTime,
      createdAt,
      updatedAt,
    } as SavedComposerTemplate;
  });
}

function isValidSavedComposerTemplate(item: unknown): item is SavedComposerTemplate {
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

function writeSavedComposerTemplates(items: SavedComposerTemplate[]) {
  try {
    localStorage.setItem(SAVED_COMPOSER_TEMPLATES_STORAGE_KEY, JSON.stringify(items.slice(0, 12)));
    return true;
  } catch {
    return false;
  }
}

function normalizeSavedTemplateName(name: string): string {
  return name.trim().toLowerCase();
}

const COMPOSER_TEMPLATES: ComposerTemplate[] = [
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
    detail: 'Fast operational update for guests.',
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


function isPastScheduledTime(scheduledFor: string | null): boolean {
  if (!scheduledFor) return false;
  return new Date(scheduledFor) < new Date();
}

function hasReachableEmail(email: string | null | undefined): boolean {
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hasReachablePhone(phone: string | null | undefined): boolean {
  return !!phone?.trim();
}

function formatScheduledDate(scheduledFor: string): string {
  const d = new Date(scheduledFor);
  const local = d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const utcOffset = -d.getTimezoneOffset() / 60;
  const sign = utcOffset >= 0 ? '+' : '-';
  const absOffset = Math.abs(utcOffset);
  return `${local} (UTC${sign}${absOffset})`;
}

const ToastList: React.FC<{ toasts: Toast[] }> = ({ toasts }) => (
  <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none">
    {toasts.map(t => (
      <div
        key={t.id}
        className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${
          t.type === 'error'
            ? 'bg-error-light text-error border-error/20'
            : t.type === 'info'
            ? 'bg-primary-light text-primary border-primary/20'
            : 'bg-success-light text-success border-success/20'
        }`}
      >
        {t.message}
      </div>
    ))}
  </div>
);

function getStatusBadge(message: Message) {
  switch (message.status) {
    case 'draft':
      return <span className="px-2 py-1 bg-surface-subtle text-text-secondary rounded text-xs border border-border">Draft</span>;
    case 'scheduled':
      return <span className="px-2 py-1 bg-warning-light text-warning rounded text-xs border border-warning/20">Scheduled</span>;
    case 'queued':
      return <span className="px-2 py-1 bg-primary-light text-primary rounded text-xs border border-primary/20">Queued</span>;
    case 'sending':
      return <span className="px-2 py-1 bg-primary-light text-primary rounded text-xs border border-primary/20 flex items-center gap-1"><Loader2 size={10} className="animate-spin" />Sending…</span>;
    case 'sent':
      return <span className="px-2 py-1 bg-success-light text-success rounded text-xs border border-success/20">Sent</span>;
    case 'partial':
      return <span className="px-2 py-1 bg-warning-light text-warning rounded text-xs border border-warning/20">Partial</span>;
    case 'failed':
      return <span className="px-2 py-1 bg-error-light text-error rounded text-xs border border-error/20">Failed</span>;
    default:
      return null;
  }
}

function getAudienceLabel(message: Message): string {
  const audience = message.audience_filter ?? (message.recipient_filter?.audience as string) ?? 'all';
  if (typeof audience === 'string' && audience.startsWith('event:')) {
    return (message.recipient_filter?.audience_label as string) ?? 'Itinerary segment';
  }
  switch (audience) {
    case 'attending': return 'Attending guests';
    case 'not_responded': return 'Not yet responded';
    case 'declined': return 'Declined guests';
    default: return 'All guests';
  }
}

function getRecipientCount(message: Message): number {
  return message.recipient_count ?? (message.recipient_filter?.recipient_count as number) ?? 0;
}

function getSkippedCount(message: Message, deliveries: DeliveryRow[]): number {
  const fromDeliveries = deliveries.filter((delivery) => delivery.message_id === message.id && delivery.status === 'skipped').length;
  if (fromDeliveries > 0) return fromDeliveries;
  const fallback = message.recipient_filter?.skipped_count;
  return typeof fallback === 'number' ? fallback : 0;
}

function getUnreachedCount(message: Message, deliveries?: DeliveryRow[]): number {
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

function getCampaignThreadKey(message: Message): string {
  return getCampaignName(message) ?? message.subject ?? message.id;
}

function isAttendingStatus(status: string | null | undefined): boolean {
  return status === 'confirmed' || status === 'attending' || status === 'accepted';
}

function isDeclinedStatus(status: string | null | undefined): boolean {
  return status === 'declined' || status === 'not_attending';
}

function isPendingStatus(status: string | null | undefined): boolean {
  return !status || status === 'pending';
}

function getCampaignTypeLabel(message: Message): string | null {
  const raw = message.recipient_filter?.campaignType as string | undefined;
  if (!raw) return null;
  if (raw === 'save-the-date') return 'Save-the-date';
  return raw;
}

function getCampaignName(message: Message): string | null {
  const raw = message.recipient_filter?.campaignName;
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
}

function getTemplateKey(message: Message): MessageTemplateKey {
  const raw = message.recipient_filter?.templateKey;
  if (typeof raw !== 'string') return 'blank';
  return (COMPOSER_TEMPLATES.some((tpl) => tpl.key === raw) ? raw : 'blank') as MessageTemplateKey;
}

interface MessageDetailModalProps {
  message: Message;
  deliveries: DeliveryRow[];
  canManageCampaigns: boolean;
  onClose: () => void;
  onRetry: (message: Message) => Promise<void>;
  onSendScheduledNow: (message: Message) => Promise<void>;
  onReschedule: (message: Message, scheduledFor: string) => Promise<void>;
  onCancelSchedule: (message: Message) => Promise<void>;
  onLoadIntoComposer: (message: Message, mode: 'edit' | 'duplicate') => void;
}

const MessageDetailModal: React.FC<MessageDetailModalProps> = ({ message, deliveries, canManageCampaigns, onClose, onRetry, onSendScheduledNow, onReschedule, onCancelSchedule, onLoadIntoComposer }) => {
  const [retrying, setRetrying] = React.useState(false);
  const [sendingScheduledNow, setSendingScheduledNow] = React.useState(false);
  const [rescheduling, setRescheduling] = React.useState(false);
  const [cancellingSchedule, setCancellingSchedule] = React.useState(false);
  const recipientCount = getRecipientCount(message);
  const skippedCount = getSkippedCount(message, deliveries);
  const unreachedCount = getUnreachedCount(message, deliveries);
  const audienceLabel = getAudienceLabel(message);
  const campaignName = getCampaignName(message);
  const campaignType = getCampaignTypeLabel(message);

  const sentDate = message.sent_at
    ? formatMessageHistoryDateTime(message.sent_at, { dateStyle: 'long', timeStyle: 'short' }, 'Sent time unavailable')
    : null;
  const scheduledDate = message.scheduled_for
    ? formatMessageHistoryDateTime(message.scheduled_for, { dateStyle: 'long', timeStyle: 'short' }, 'Scheduled time unavailable')
    : null;
  const initialScheduleInput = React.useMemo(() => {
    return toScheduleInputValue(message.scheduled_for);
  }, [message.scheduled_for]);
  const [scheduleInput, setScheduleInput] = React.useState(initialScheduleInput);
  React.useEffect(() => {
    setScheduleInput(initialScheduleInput);
  }, [initialScheduleInput, message.id]);
  const scheduledInputIso = parseScheduleInputToIso(scheduleInput);
  const scheduleInputIsPast = !!scheduledInputIso && isPastScheduledTime(scheduledInputIso);
  const messageDeliveries = deliveries.filter((delivery) => delivery.message_id === message.id);
  const failedDeliveries = messageDeliveries.filter((delivery) => delivery.status === 'failed');
  const skippedDeliveries = messageDeliveries.filter((delivery) => delivery.status === 'skipped');
  const topFailureReasons = Array.from(
    failedDeliveries.reduce((map, delivery) => {
      const key = (delivery.error_message || 'Unknown provider error').trim();
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>()).entries(),
  ).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topSkipReasons = Array.from(
    skippedDeliveries.reduce((map, delivery) => {
      const key = (delivery.error_message || 'Skipped before send').trim();
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>()).entries(),
  ).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-subtle text-text-tertiary hover:text-text-primary transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              {campaignName && <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary mb-1">{campaignName}</p>}
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-text-primary">{message.subject}</h2>
                {getStatusBadge(message)}
              </div>
              <p className="text-xs text-text-tertiary mt-0.5">
                {message.status === 'scheduled' && scheduledDate
                  ? `Scheduled for ${scheduledDate}`
                  : sentDate
                  ? `Sent ${sentDate}`
                  : 'Draft — not yet sent'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-subtle text-text-tertiary hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-border flex-shrink-0 bg-surface-subtle">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-text-tertiary text-xs mb-1">Audience</p>
              <p className="font-medium text-text-primary">{audienceLabel}</p>
              {campaignType && <p className="text-[11px] text-text-tertiary mt-1">{campaignType}</p>}
            </div>
            <div>
              <p className="text-text-tertiary text-xs mb-1">Recipients</p>
              <p className="font-medium text-text-primary">{recipientCount} {recipientCount === 1 ? 'person' : 'people'}</p>
              {skippedCount > 0 && <p className="text-[11px] text-warning mt-1">{skippedCount} skipped before send</p>}
              {unreachedCount > 0 && <p className="text-[11px] text-warning mt-1">{unreachedCount} unreached after send</p>}
            </div>
            <div>
              <p className="text-text-tertiary text-xs mb-1">Channel</p>
              <p className="font-medium text-text-primary capitalize">{message.channel}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="prose prose-sm max-w-none">
            <div className="bg-surface-subtle rounded-xl border border-border p-5">
              <p className="text-xs font-medium text-text-tertiary uppercase updates-wide mb-3">Message body</p>
              <div className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {message.body}
              </div>
            </div>
          </div>

          {message.status === 'scheduled' && (
            <div className="rounded-xl border border-border bg-surface-subtle p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Scheduled send control</p>
                  <p className="mt-1 text-xs text-text-tertiary">Adjust the send time here or drop it back to draft without leaving the comms center.</p>
                </div>
                {message.scheduled_for && isPastScheduledTime(message.scheduled_for) && (
                  <span className="rounded-full border border-warning/20 bg-warning-light px-2 py-0.5 text-[11px] font-medium text-warning">Due now</span>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-text-tertiary mb-1">Send at</label>
                  <input
                    type="datetime-local"
                    value={scheduleInput}
                    onChange={(e) => setScheduleInput(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-white text-sm text-text-primary"
                  />
                  {scheduleInputIsPast && (
                    <p className="mt-2 text-[11px] text-warning">Pick a future time here. If you want it to go now, use “Send scheduled now” instead.</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canManageCampaigns || rescheduling || !scheduleInput || scheduleInputIsPast}
                    onClick={async () => {
                      if (!scheduledInputIso) return;
                      setRescheduling(true);
                      try {
                        await onReschedule(message, scheduledInputIso);
                      } finally {
                        setRescheduling(false);
                        onClose();
                      }
                    }}
                  >
                    {rescheduling ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : 'Reschedule'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canManageCampaigns || cancellingSchedule}
                    onClick={async () => {
                      setCancellingSchedule(true);
                      try {
                        await onCancelSchedule(message);
                      } finally {
                        setCancellingSchedule(false);
                        onClose();
                      }
                    }}
                  >
                    {cancellingSchedule ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Updating…</> : 'Unschedule to draft'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {failedDeliveries.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-rose-900">Delivery needs attention</p>
                  <p className="mt-1 text-xs text-rose-700">These are real failed recipients from the current delivery log, not a generic warning.</p>
                </div>
                <span className="rounded-full border border-rose-200 bg-white px-2 py-0.5 text-[11px] font-medium text-rose-700">{failedDeliveries.length} failed</span>
              </div>

              {topFailureReasons.length > 0 && (
                <div className="mt-3 space-y-1">
                  {topFailureReasons.map(([reason, count]) => (
                    <div key={reason} className="flex items-start justify-between gap-3 rounded-lg border border-rose-100 bg-white/80 px-3 py-2 text-xs">
                      <span className="text-rose-800">{reason}</span>
                      <span className="shrink-0 text-rose-600">{count}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 rounded-lg border border-rose-100 bg-white/80">
                <div className="flex items-center justify-between px-3 py-2 border-b border-rose-100">
                  <p className="text-xs font-medium text-rose-900">Failed recipients</p>
                  <p className="text-[11px] text-rose-600">Most recent first</p>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-rose-100">
                  {failedDeliveries.slice(0, 8).map((delivery) => (
                    <div key={delivery.id} className="px-3 py-2.5 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-rose-900">{delivery.recipient_name || delivery.recipient_email || 'Unknown recipient'}</p>
                          {delivery.recipient_name && <p className="text-rose-700">{delivery.recipient_email || 'No contact recorded'}</p>}
                          <p className="mt-0.5 text-rose-700">{delivery.error_message || 'Delivery failed before the provider returned a clear reason.'}</p>
                        </div>
                        <span className="shrink-0 text-[11px] text-rose-600">{delivery.attempted_at ? formatMessageHistoryDateTime(delivery.attempted_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }, 'Attempted') : 'Attempted'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {skippedDeliveries.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-amber-900">Skipped before send</p>
                  <p className="mt-1 text-xs text-amber-700">These recipients were part of the audience but were skipped because contact info was missing or invalid.</p>
                </div>
                <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[11px] font-medium text-amber-700">{skippedDeliveries.length} skipped</span>
              </div>

              {topSkipReasons.length > 0 && (
                <div className="mt-3 space-y-1">
                  {topSkipReasons.map(([reason, count]) => (
                    <div key={reason} className="flex items-start justify-between gap-3 rounded-lg border border-amber-100 bg-white/80 px-3 py-2 text-xs">
                      <span className="text-amber-800">{reason}</span>
                      <span className="shrink-0 text-amber-600">{count}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 rounded-lg border border-amber-100 bg-white/80">
                <div className="flex items-center justify-between px-3 py-2 border-b border-amber-100">
                  <p className="text-xs font-medium text-amber-900">Skipped recipients</p>
                  <p className="text-[11px] text-amber-600">Most recent first</p>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-amber-100">
                  {skippedDeliveries.slice(0, 8).map((delivery) => (
                    <div key={delivery.id} className="px-3 py-2.5 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-amber-900">{delivery.recipient_name || delivery.recipient_email || 'Unknown recipient'}</p>
                          {delivery.recipient_name && <p className="text-amber-700">{delivery.recipient_email || 'No contact recorded'}</p>}
                          <p className="mt-0.5 text-amber-700">{delivery.error_message || 'Skipped before the provider was called.'}</p>
                        </div>
                        <span className="shrink-0 text-[11px] text-amber-600">{delivery.attempted_at ? formatMessageHistoryDateTime(delivery.attempted_at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }, 'Skipped') : 'Skipped'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {(message.delivered_count != null || message.failed_count != null) && (
          <div className="px-6 py-3 border-t border-border flex-shrink-0 bg-surface-subtle">
            <div className="flex gap-6 text-sm">
              {message.delivered_count != null && message.delivered_count > 0 && (
                <span className="flex items-center gap-1.5 text-success">
                  <CheckCircle size={13} />
                  {message.delivered_count} delivered
                </span>
              )}
              {message.failed_count != null && message.failed_count > 0 && (
                <span className="flex items-center gap-1.5 text-error">
                  <AlertCircle size={13} />
                  {message.failed_count} failed
                </span>
              )}
              {unreachedCount > 0 && (
                <span className="flex items-center gap-1.5 text-warning">
                  <AlertCircle size={13} />
                  {unreachedCount} unreached
                </span>
              )}
              {skippedDeliveries.length > 0 && (
                <span className="flex items-center gap-1.5 text-warning">
                  <AlertCircle size={13} />
                  {skippedDeliveries.length} skipped
                </span>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border flex-shrink-0">
          <div className="flex flex-wrap gap-2">
            {(message.status === 'draft' || message.status === 'scheduled') && (
              <Button
                variant="outline"
                size="sm"
                disabled={!canManageCampaigns}
                onClick={() => {
                  onLoadIntoComposer(message, 'edit');
                  onClose();
                }}
              >
                Edit in composer
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={!canManageCampaigns}
              onClick={() => {
                onLoadIntoComposer(message, 'duplicate');
                onClose();
              }}
            >
              Duplicate to composer
            </Button>
            {canRetryMessageStatus(message.status) && (
              <Button
                variant="primary"
                size="sm"
                disabled={!canManageCampaigns || retrying}
                onClick={async () => {
                  setRetrying(true);
                  try {
                    await onRetry(message);
                  } finally {
                    setRetrying(false);
                    onClose();
                  }
                }}
              >
                {retrying
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Retrying…</>
                  : <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Retry send</>
                }
              </Button>
            )}
            {message.status === 'partial' && (
              <p className="text-xs text-text-tertiary max-w-xs">Partial campaigns are review-only here so this control does not re-send guests who already got the message.</p>
            )}
            {message.status === 'scheduled' && (
              <Button
                variant="primary"
                size="sm"
                disabled={!canManageCampaigns || sendingScheduledNow}
                onClick={async () => {
                  setSendingScheduledNow(true);
                  try {
                    await onSendScheduledNow(message);
                  } finally {
                    setSendingScheduledNow(false);
                    onClose();
                  }
                }}
              >
                {sendingScheduledNow
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending…</>
                  : <><Send className="w-3.5 h-3.5 mr-1.5" />Send scheduled now</>}
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

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
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'active' | 'sent' | 'scheduled' | 'draft' | 'failed' | 'partial'>('all');
  const [historyChannelFilter, setHistoryChannelFilter] = useState<'all' | 'email' | 'sms'>('all');
  const [historyAudienceFilter, setHistoryAudienceFilter] = useState<string>('all');
  const [historyDeliveryFilter, setHistoryDeliveryFilter] = useState<'all' | 'delivered' | 'failed' | 'skipped' | 'unreached'>('all');
  const [historyCampaignFilter, setHistoryCampaignFilter] = useState<string>('');
  const [historySearch, setHistorySearch] = useState('');

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

    try {
      const raw = localStorage.getItem(SAVED_COMPOSER_TEMPLATES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) {
        const validTemplates = parsed.filter(isValidSavedComposerTemplate);
        const normalized = normalizeSavedComposerTemplates(validTemplates);
        if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
          writeSavedComposerTemplates(normalized);
        }
      }
    } catch {
      // ignore normalization persistence issues
    }
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
    setBuyingPack(pack);
    try {
      const base = window.location.origin;
      const success = `${base}/dashboard/messages?smsCredits=success`;
      const cancel = `${base}/dashboard/messages?smsCredits=cancel`;
      const url = await createSmsCreditsSession(weddingSite.id, success, cancel, pack);
      window.location.href = url;
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Couldn’t open checkout right now. Please try again.', 'error');
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

    const activeSite = await resolveActiveSiteForUser(user.id);
    setActiveSiteRole(activeSite?.role ?? 'owner');
    setMessagesRole(activeSite?.role ?? 'owner');

    const { data, error } = await supabase
      .from('wedding_sites')
      .select('id, couple_first_name, couple_second_name, couple_email, sms_credits_balance')
      .eq('id', activeSite?.id ?? '')
      .maybeSingle();
    if (error) {
      toast('Couldn’t load your messaging workspace right now. Please try again.', 'error');
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
    if (data) setWeddingSite(data);
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
  }, [user, isDemoMode]);

  const fetchMessages = useCallback(async () => {
    if (!weddingSite) return;
    if (isDemoMode) {
      setMessages(readDemoMessages());
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('wedding_site_id', weddingSite.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMessages(data || []);
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
        rsvp_status: g.rsvp_status ?? 'pending',
        first_name: g.first_name ?? null,
        last_name: g.last_name ?? null,
        name: g.name,
      })));
      return;
    }
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('id, email, phone, rsvp_status, first_name, last_name, name')
        .eq('wedding_site_id', weddingSite.id);
      if (error) {
        toast('Couldn’t load guest recipients right now. Please try again.', 'error');
        setGuests([]);
        return;
      }
      setGuests(data || []);
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
      const { data, error } = await supabase
        .from('message_deliveries')
        .select('id, message_id, status, provider_message_id, error_message, attempted_at, delivered_at, recipient_email, recipient_name')
        .in('message_id', messageIds)
        .order('attempted_at', { ascending: false })
        .limit(500);

      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('message_deliveries') || msg.includes('does not exist') || msg.includes('404')) {
          hasMessageDeliveriesTable = false;
        } else {
          toast('Couldn’t load delivery history right now. Please try again.', 'error');
        }
        setDeliveries([]);
        return;
      }

      hasMessageDeliveriesTable = true;
      setDeliveries((data as DeliveryRow[]) || []);
    } catch {
      toast('Couldn’t load delivery history right now. Please try again.', 'error');
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

    const { data: events, error: eventsError } = await supabase
      .from('itinerary_events')
      .select('id, event_name, event_date')
      .eq('wedding_site_id', weddingSite.id)
      .order('event_date', { ascending: true });
    if (eventsError) throw eventsError;

    if (!events || events.length === 0) {
      setItineraryAudienceOptions([]);
      setEventGuestIds({});
      return;
    }

    const eventIds = events.map((e: any) => e.id);
    const { data: invites, error: invitesError } = await supabase
      .from('event_invitations')
      .select('event_id, guest_id')
      .in('event_id', eventIds);
    if (invitesError) throw invitesError;

    const map: Record<string, Set<string>> = {};
    for (const e of events as any[]) map[e.id] = new Set<string>();
    for (const row of (invites ?? []) as any[]) {
      if (!map[row.event_id]) map[row.event_id] = new Set<string>();
      map[row.event_id].add(row.guest_id);
    }
    setEventGuestIds(map);

    const options: AudienceOption[] = (events as any[]).map((e) => ({
      value: `event:${e.id}`,
      label: formatMessageEventOptionLabel(e.event_name, e.event_date),
      count: map[e.id]?.size ?? 0,
    }));
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
      const [expiringResult, txResult] = await Promise.all([
        supabase
          .from('sms_credit_transactions')
          .select('remaining_credits, expires_at')
          .eq('wedding_site_id', weddingSite.id)
          .eq('reason', 'purchase')
          .lte('expires_at', cutoff),
        supabase
          .from('sms_credit_transactions')
          .select('id, credits_delta, reason, created_at, expires_at, remaining_credits')
          .eq('wedding_site_id', weddingSite.id)
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      if (expiringResult.error || txResult.error) {
        toast('Couldn’t load SMS credit activity right now. Please try again.', 'error');
        setSmsExpiringSoon(0);
        setSmsTransactions([]);
        return;
      }

      const soon = (expiringResult.data ?? []).reduce((sum, row: any) => sum + Number(row.remaining_credits ?? 0), 0);
      setSmsExpiringSoon(soon);
      setSmsTransactions((txResult.data ?? []) as SmsCreditTransaction[]);
    } catch {
      toast('Couldn’t load SMS credit activity right now. Please try again.', 'error');
      setSmsExpiringSoon(0);
      setSmsTransactions([]);
    }
  }, [weddingSite, isDemoMode]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefillSubject = params.get('prefillSubject');
    const prefillBody = params.get('prefillBody');
    const smsCreditsStatus = params.get('smsCredits');
    if (!prefillSubject && !prefillBody && !smsCreditsStatus) return;

    if (prefillSubject || prefillBody) {
      setEditingMessageId(null);
      setFormData((prev) => ({
        ...prev,
        campaignName: prev.campaignName,
        subject: prefillSubject ?? prev.subject,
        body: prefillBody ?? prev.body,
      }));
      setShowRecipientPreview(true);
    }

    if (smsCreditsStatus === 'success') {
      toast('SMS credit purchase complete. Refreshing your balance now.', 'success');
      void fetchWeddingSite();
      void fetchSmsExpiryPreview();
    } else if (smsCreditsStatus === 'cancel') {
      toast('SMS credit checkout was canceled.', 'info');
    }

    const cleanedParams = new URLSearchParams(location.search);
    cleanedParams.delete('prefillSubject');
    cleanedParams.delete('prefillBody');
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
      if (event.key !== RSVP_CONTINUITY_STORAGE_KEY || !event.newValue) return;
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
    if (audience.startsWith('event:')) {
      const eventId = audience.replace('event:', '');
      const ids = eventGuestIds[eventId];
      if (!ids) return [];
      return guests.filter((g) => ids.has(g.id));
    }
    switch (audience) {
      case 'attending': return guests.filter(g => isAttendingStatus(g.rsvp_status));
      case 'not_responded': return guests.filter(g => isPendingStatus(g.rsvp_status));
      case 'declined': return guests.filter(g => isDeclinedStatus(g.rsvp_status));
      default: return guests;
    }
  };

  const getAudienceSnapshot = (audience: string, channel: 'email' | 'sms') => {
    const recipients = getRecipients(audience);
    const reachableCount = channel === 'sms'
      ? recipients.filter((guest) => hasReachablePhone(guest.phone)).length
      : recipients.filter((guest) => hasReachableEmail(guest.email)).length;

    return {
      totalAudienceCount: recipients.length,
      reachableCount,
      skippedCount: Math.max(recipients.length - reachableCount, 0),
    };
  };

  const knownPhotoLinksCount = useMemo(() => {
    try {
      const raw = localStorage.getItem('dayof.photoAlbumLinks');
      if (!raw) return 0;
      return Object.values(JSON.parse(raw) as Record<string, string>).filter(Boolean).length;
    } catch {
      return 0;
    }
  }, []);

  const applyTemplateVariables = (text: string) => {
    const couple = getMessageTemplateCoupleLabel(weddingSite?.couple_first_name, weddingSite?.couple_second_name);
    const rsvpLink = `${window.location.origin}/rsvp`;

    let photoLink = `${window.location.origin}/photos/upload`;
    try {
      const raw = localStorage.getItem('dayof.photoAlbumLinks');
      if (raw) {
        const links = Object.values(JSON.parse(raw) as Record<string, string>).filter(Boolean);
        if (links.length > 0) photoLink = links[0] as string;
      }
    } catch {
      // ignore and fallback
    }

    return text
      .replace(/\[COUPLE\]/g, couple)
      .replace(/\[RSVP LINK\]/g, rsvpLink)
      .replace(/\[PHOTO LINK\]/g, photoLink)
      .replace(/\[DATE\]/g, 'our wedding date')
      .replace(/\[VENUE\]/g, 'our venue')
      .replace(/\[ADD DETAILS\]/g, 'timeline, parking, dress code, and arrival instructions');
  };

  const selectedTemplate = COMPOSER_TEMPLATES.find((tpl) => tpl.key === formData.templateKey) ?? COMPOSER_TEMPLATES[0];

  const handleSendMessage = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault();
    if (!weddingSite) return;
    setSending(true);
    try {
      const recipients = getRecipients(formData.audience);
      const totalAudienceCount = recipients.length;
      const recipientCount = formData.channel === 'sms'
        ? recipients.filter(g => hasReachablePhone(g.phone)).length
        : recipients.filter(g => hasReachableEmail(g.email)).length;
      const skippedRecipientCount = Math.max(totalAudienceCount - recipientCount, 0);

      if (recipientCount === 0 && !saveAsDraft) {
        toast(formData.channel === 'sms'
          ? 'No recipients have reachable phone numbers. Add phone numbers to your guests first.'
          : 'No recipients have valid email addresses. Add valid emails to your guests first.', 'error');
        setSending(false);
        return;
      }

      if (formData.channel === 'sms' && !saveAsDraft) {
        if (!smsCreditsSufficient) {
          toast(`Not enough SMS credits. Need ${smsCreditsNeeded}, have ${smsCredits}.`, 'error');
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
        ? (formData.subject.trim() || `SMS • ${selectedAudience?.label ?? 'All guests'}`)
        : formData.subject;
      const recipientMeta = {
        audience: formData.audience,
        audience_label: selectedAudience?.label ?? null,
        recipient_count: totalAudienceCount,
        reachable_count: recipientCount,
        skipped_count: skippedRecipientCount,
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

          const { error } = await supabase
            .from('messages')
            .update({
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
            })
            .eq('id', editingMessageId);

          if (error) throw error;

          void supabase
            .from('messages')
            .update({
              audience_filter: formData.audience,
              recipient_count: totalAudienceCount,
              recipient_filter: recipientMeta,
            })
            .eq('id', editingMessageId);
        } else {
          // Write with a minimal stable payload first (resilient to schema drift),
          // then best-effort patch extended analytics columns.
          const { data, error } = await supabase
            .from('messages')
            .insert([{
              wedding_site_id: weddingSite.id,
              subject: normalizedSubject,
              body: formData.body,
              channel: formData.channel,
              status,
              scheduled_for: scheduledFor,
              sent_at: null,
            }])
            .select('id')
            .single();

          if (error) throw error;
          inserted = data;

          // Non-blocking enrichment for optional columns.
          void supabase
            .from('messages')
            .update({
              audience_filter: formData.audience,
              recipient_count: totalAudienceCount,
              recipient_filter: recipientMeta,
            })
            .eq('id', inserted.id);
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
            toast(`${isEditingExistingMessage ? 'Updated and delivered' : 'Delivered'} ${recipientCount} • skipped ${skippedRecipientCount} (demo)`, 'info');
          } else {
            toast(`${isEditingExistingMessage ? 'Updated and delivered' : 'Delivered'} to ${recipientCount} guest${recipientCount !== 1 ? 's' : ''} (demo)`, 'success');
          }
          return;
        }


        toast(`Sending to ${recipientCount} guest${recipientCount !== 1 ? 's' : ''}…`, 'info');
        await fetchMessages();
        try {
          const result = await triggerBulkSend(inserted.id);
          const skipped = result.skipped ?? 0;
          if (result.failed === 0 && skipped === 0) {
            toast(`Delivered to ${result.delivered} guest${result.delivered !== 1 ? 's' : ''}`, 'success');
          } else if (result.delivered === 0 && result.failed === 0 && skipped > 0) {
            toast(`No messages sent: ${skipped} recipient${skipped !== 1 ? 's were' : ' was'} skipped.`, 'info');
          } else if (result.delivered === 0) {
            toast(`Delivery failed for all ${result.failed} recipient${result.failed !== 1 ? 's' : ''}${skipped > 0 ? ` • ${skipped} skipped` : ''}. Check message history.`, 'error');
          } else {
            toast(`Sent ${result.delivered}${result.failed > 0 ? ` • failed ${result.failed}` : ''}${skipped > 0 ? ` • skipped ${skipped}` : ''}. Check message history.`, 'info');
          }
        } catch (sendErr) {
          toast(sendErr instanceof Error ? sendErr.message : 'Delivery failed. Check message history.', 'error');
        }
        await fetchMessages();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to process message. Please try again.';
      toast(msg, 'error');
    } finally {
      setSending(false);
    }
  };

  function loadMessageIntoComposer(message: Message, mode: 'edit' | 'duplicate') {
    if (!canComposeDashboardMessages(messagesRole)) {
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
    if (!canComposeDashboardMessages(messagesRole)) {
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
    if (!canComposeDashboardMessages(messagesRole)) {
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
    if (!canComposeDashboardMessages(messagesRole)) {
      toast('Your collaborator role cannot retry campaign sends.', 'info');
      return;
    }

    if (!canRetryMessageStatus(message.status)) {
      toast(message.status === 'partial'
        ? 'Partial campaigns are not retried in-place here because that can duplicate sends. Duplicate the campaign and target the missed guests instead.'
        : 'Only failed campaigns can be retried from this control.', 'info');
      return;
    }

    setRetryingMessageId(message.id);
    try {
      if (isDemoMode) {
        const audience = message.audience_filter ?? (message.recipient_filter?.audience as string) ?? 'all';
        const recipients = getRecipients(audience);
        const deliveredCount = message.channel === 'sms'
          ? recipients.filter((guest) => hasReachablePhone(guest.phone)).length
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
          ? `Retry finished in demo: delivered ${deliveredCount} • skipped ${skippedCount}.`
          : `Retry finished in demo: delivered ${deliveredCount}.`, skippedCount > 0 ? 'info' : 'success');
        return;
      }

      const { error } = await supabase
        .from('messages')
        .update({ status: 'queued', sent_at: null, failed_count: 0, delivered_count: 0 })
        .eq('id', message.id);
      if (error) throw error;
      toast('Retrying delivery…', 'info');
      await fetchMessages();
      try {
        const result = await triggerBulkSend(message.id);
        const skipped = result.skipped ?? 0;
        if (result.failed === 0 && skipped === 0) {
          toast(`Delivered to ${result.delivered} guest${result.delivered !== 1 ? 's' : ''}`, 'success');
        } else if (result.delivered === 0 && result.failed === 0 && skipped > 0) {
          toast(`Retry finished with ${skipped} skipped recipient${skipped !== 1 ? 's' : ''}.`, 'info');
        } else {
          toast(`Sent ${result.delivered}${result.failed > 0 ? ` • failed ${result.failed}` : ''}${skipped > 0 ? ` • skipped ${skipped}` : ''}`, result.delivered === 0 && result.failed > 0 ? 'error' : 'info');
        }
      } catch (sendErr) {
        await supabase
          .from('messages')
          .update({
            status: message.status,
            sent_at: message.sent_at,
            failed_count: message.failed_count,
            delivered_count: message.delivered_count,
          })
          .eq('id', message.id);
        toast(sendErr instanceof Error ? sendErr.message : 'Delivery failed. Try again later.', 'error');
      }
      await fetchMessages();
    } catch {
      toast('Couldn’t retry that message right now. Please try again.', 'error');
    } finally {
      setRetryingMessageId(null);
    }
  }

  async function handleSendScheduledNow(message: Message) {
    if (!canComposeDashboardMessages(messagesRole)) {
      toast('Your collaborator role cannot send campaigns from Messaging.', 'info');
      return;
    }

    if (isDemoMode) {
      const audience = message.audience_filter ?? (message.recipient_filter?.audience as string) ?? 'all';
      const recipients = getRecipients(audience);
      const deliveredCount = message.channel === 'sms'
        ? recipients.filter((guest) => hasReachablePhone(guest.phone)).length
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
        ? `Scheduled message sent in demo: delivered ${deliveredCount} • skipped ${skippedCount}.`
        : `Scheduled message sent in demo: delivered ${deliveredCount}.`, skippedCount > 0 ? 'info' : 'success');
      return;
    }

    let deliveryTriggered = false;
    try {
      const { error } = await supabase
        .from('messages')
        .update({ scheduled_for: new Date().toISOString() })
        .eq('id', message.id);
      if (error) throw error;

      toast('Sending scheduled message now…', 'info');
      const result = await triggerBulkSend(message.id);
      const skipped = result.skipped ?? 0;
      if (result.failed === 0 && skipped === 0) {
        toast(`Delivered to ${result.delivered} guest${result.delivered !== 1 ? 's' : ''}`, 'success');
      } else if (result.delivered === 0 && result.failed === 0 && skipped > 0) {
        toast(`No messages sent: ${skipped} recipient${skipped !== 1 ? 's were' : ' was'} skipped.`, 'info');
      } else if (result.delivered === 0) {
        toast(`Delivery failed for all ${result.failed} recipient${result.failed !== 1 ? 's' : ''}${skipped > 0 ? ` • ${skipped} skipped` : ''}.`, 'error');
      } else {
        toast(`Sent ${result.delivered}${result.failed > 0 ? ` • failed ${result.failed}` : ''}${skipped > 0 ? ` • skipped ${skipped}` : ''}.`, 'info');
      }
      deliveryTriggered = true;
      await fetchMessages();
    } catch (err) {
      if (!isDemoMode && !deliveryTriggered) {
        await supabase
          .from('messages')
          .update({ scheduled_for: message.scheduled_for })
          .eq('id', message.id);
      }
      toast(err instanceof Error ? err.message : 'Couldn’t send that scheduled message right now.', 'error');
    }
  }

  async function handleRescheduleMessage(message: Message, scheduledFor: string) {
    if (!canComposeDashboardMessages(messagesRole)) {
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
      const { error } = await supabase
        .from('messages')
        .update({
          status: 'scheduled',
          scheduled_for: scheduledFor,
          sent_at: null,
        })
        .eq('id', message.id);
      if (error) throw error;

      void supabase
        .from('messages')
        .update({
          recipient_count: snapshot.totalAudienceCount,
          recipient_filter: {
            ...(message.recipient_filter ?? {}),
            recipient_count: snapshot.totalAudienceCount,
            reachable_count: snapshot.reachableCount,
            skipped_count: snapshot.skippedCount,
          },
        })
        .eq('id', message.id);

      toast(`Rescheduled for ${formatScheduledMessageDateTime(scheduledFor)}.`, 'success');
      await fetchMessages();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Couldn’t reschedule that campaign right now.', 'error');
    }
  }

  async function handleCancelSchedule(message: Message) {
    if (!canComposeDashboardMessages(messagesRole)) {
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
      const { error } = await supabase
        .from('messages')
        .update({
          status: 'draft',
          scheduled_for: null,
        })
        .eq('id', message.id);
      if (error) throw error;

      void supabase
        .from('messages')
        .update({
          recipient_count: snapshot.totalAudienceCount,
          recipient_filter: {
            ...(message.recipient_filter ?? {}),
            recipient_count: snapshot.totalAudienceCount,
            reachable_count: snapshot.reachableCount,
            skipped_count: snapshot.skippedCount,
          },
        })
        .eq('id', message.id);

      toast('Scheduled campaign moved back to draft.', 'info');
      await fetchMessages();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Couldn’t unschedule that campaign right now.', 'error');
    }
  }

  const campaignStatusSummary = useMemo(() => {
    const buckets = {
      draft: 0,
      scheduled: 0,
      sent: 0,
      partial: 0,
      failed: 0,
    };
    messages.forEach((message) => {
      if (message.status in buckets) {
        buckets[message.status as keyof typeof buckets] += 1;
      }
    });
    return buckets;
  }, [messages, viewingMessage]);

  async function handleRunDueScheduledMessages() {
    if (!canComposeDashboardMessages(messagesRole)) {
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
            ? recipients.filter((guest) => hasReachablePhone(guest.phone)).length
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
        toast(`Processed ${dueIds.length} scheduled message${dueIds.length !== 1 ? 's' : ''} in demo${skippedRecipients > 0 ? ` • skipped ${skippedRecipients} recipient${skippedRecipients !== 1 ? 's' : ''}` : ''}.`, skippedRecipients > 0 ? 'info' : 'success');
      } finally {
        setProcessingScheduled(false);
      }
      return;
    }

    setProcessingScheduled(true);
    try {
      const result = await triggerScheduledDispatch(10);
      if (result.processed === 0) {
        toast('No scheduled messages are due right now.', 'info');
      } else if (result.failed === 0 && result.partial === 0) {
        toast(`Processed ${result.processed} scheduled message${result.processed !== 1 ? 's' : ''}${result.skippedRecipients > 0 ? ` • ${result.skippedRecipients} recipient${result.skippedRecipients !== 1 ? 's' : ''} skipped` : ''}.`, 'success');
      } else {
        toast(`Processed ${result.processed}: sent ${result.sent}, partial ${result.partial}, failed ${result.failed}${result.skippedRecipients > 0 ? `, skipped recipients ${result.skippedRecipients}` : ''}${result.skippedMessages > 0 ? `, skipped messages ${result.skippedMessages}` : ''}.`, result.failed > 0 ? 'error' : 'info');
      }
      await fetchMessages();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Couldn’t process scheduled messages right now.', 'error');
    } finally {
      setProcessingScheduled(false);
    }
  }

  const audienceOptions = [
    { value: 'all', label: 'All Guests', count: guests.length },
    { value: 'attending', label: 'Attending Only', count: guests.filter(g => isAttendingStatus(g.rsvp_status)).length },
    { value: 'not_responded', label: 'Not Responded', count: guests.filter(g => isPendingStatus(g.rsvp_status)).length },
    { value: 'declined', label: 'Declined', count: guests.filter(g => isDeclinedStatus(g.rsvp_status)).length },
    ...itineraryAudienceOptions,
  ];

  const selectedAudience = audienceOptions.find(opt => opt.value === formData.audience);

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

  function runMessageOpsCoachPlay(play: ReturnType<typeof buildMessageOpsCoach>['plays'][number]) {
    if (play.action === 'open-partial') {
      if (reviewCandidates[0]) {
        setViewingMessage(reviewCandidates[0]);
      } else {
        setHistoryStatusFilter('partial');
        setHistoryChannelFilter('all');
      }
      return;
    }

    if (play.action === 'open-failed') {
      if (retryCandidates[0]) {
        setViewingMessage(retryCandidates[0]);
      } else {
        setHistoryStatusFilter('failed');
        setHistoryChannelFilter('all');
      }
      return;
    }

    if (play.action === 'run-due-scheduled') {
      void handleRunDueScheduledMessages();
      return;
    }

    if (play.action === 'open-guests') {
      navigate('/dashboard/guests');
      return;
    }

    if (!canCompose) {
      toast('Composer actions stay with the couple or planner in this access view.', 'info');
      return;
    }

    if (play.action === 'compose-rsvp-reminder') {
      applyComposerTemplate('rsvp-reminder', {
        audience: 'not_responded',
        channel: 'email',
        scheduleType: 'now',
        scheduleDate: '',
        scheduleTime: '',
        campaignName: 'RSVP follow-up',
      });
      setShowRecipientPreview(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast('Loaded an RSVP reminder into the composer.', 'info');
      return;
    }

    if (play.action === 'compose-day-of-update') {
      applyComposerTemplate('day-of-update', {
        audience: 'attending',
        channel: 'sms',
        scheduleType: 'now',
        scheduleDate: '',
        scheduleTime: '',
        campaignName: 'Day-of update',
      });
      setShowRecipientPreview(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast('Loaded a day-of update into the composer.', 'info');
    }
  }

  function runGuestOutreachStep(step: ReturnType<typeof buildGuestOutreachSequence>['steps'][number]) {
    if (step.area === 'guests') {
      navigate('/dashboard/guests');
      return;
    }

    if (!step.playAction || step.playAction === 'none') return;

    const matchingPlay = messageOpsCoach.plays.find((play) => play.action === step.playAction);
    if (matchingPlay) {
      runMessageOpsCoachPlay(matchingPlay);
      return;
    }

    if (step.playAction === 'compose-rsvp-reminder') {
      runMessageOpsCoachPlay({
        id: 'send-rsvp-reminder',
        status: 'ready',
        title: step.title,
        detail: step.detail,
        actionLabel: step.ctaLabel,
        action: 'compose-rsvp-reminder',
      });
      return;
    }

    if (step.playAction === 'compose-day-of-update') {
      runMessageOpsCoachPlay({
        id: 'stage-day-of-update',
        status: 'ready',
        title: step.title,
        detail: step.detail,
        actionLabel: step.ctaLabel,
        action: 'compose-day-of-update',
      });
      return;
    }

    if (step.playAction === 'run-due-scheduled') {
      void handleRunDueScheduledMessages();
      return;
    }

    if (step.playAction === 'open-partial') {
      setHistoryStatusFilter('partial');
      setHistoryChannelFilter('all');
      return;
    }

    if (step.playAction === 'open-failed') {
      setHistoryStatusFilter('failed');
      setHistoryChannelFilter('all');
    }
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

    const payload = {
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
        const { error } = await supabase.from('messages').insert(payload);
        if (error) throw error;
        created = true;
        await fetchMessages();
      }

      toast('Save-the-date campaign scheduled for tomorrow at 10:00.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create save-the-date campaign.';
      toast(
        created
          ? `Campaign was created, but the message list could not refresh: ${message}`
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
  const recipientsWithPhone = getRecipients(formData.audience).filter(g => hasReachablePhone(g.phone)).length;
  const activeRecipients = formData.channel === 'sms' ? recipientsWithPhone : recipientsWithEmail;
  const previewRecipients = getRecipients(formData.audience).filter((guest) => formData.channel === 'sms' ? hasReachablePhone(guest.phone) : hasReachableEmail(guest.email));
  const unreachableRecipients = (selectedAudience?.count ?? 0) - activeRecipients;
  const selectedScheduleIsPast = !!(formData.scheduleDate && formData.scheduleTime)
    && isPastScheduledTime(`${formData.scheduleDate}T${formData.scheduleTime}:00`);
  const smsCredits = weddingSite?.sms_credits_balance ?? 0;
  const smsCreditsNeeded = recipientsWithPhone;
  const smsCreditsSufficient = smsCredits >= smsCreditsNeeded;
  const HARD_EMAIL_CAP = 1000;
  const usedEmailRecipients = messages
    .filter((m) => m.channel === 'email' && isEmailCapConsumingStatus(m.status))
    .reduce((sum, m) => sum + getRecipientCount(m), 0);
  const remainingEmailRecipients = Math.max(HARD_EMAIL_CAP - usedEmailRecipients, 0);
  const emailCapacityAfterSend = Math.max(remainingEmailRecipients - recipientsWithEmail, 0);
  const emailCapacityEnough = recipientsWithEmail <= remainingEmailRecipients;

  const audienceReachability = useMemo(() => {
    const allRecipients = getRecipients(formData.audience);
    const withEmail = allRecipients.filter((guest) => hasReachableEmail(guest.email)).length;
    const withPhone = allRecipients.filter((guest) => hasReachablePhone(guest.phone)).length;
    return {
      total: allRecipients.length,
      missingEmail: Math.max(allRecipients.length - withEmail, 0),
      missingPhone: Math.max(allRecipients.length - withPhone, 0),
    };
  }, [formData.audience, guests, eventGuestIds]);

  const deliveryStats = useMemo(() => {
    const sentish = messages.filter((m) => isDeliveryCompletedStatus(m.status));
    const delivered = sentish.reduce((sum, m) => sum + (m.delivered_count ?? 0), 0);
    const failed = sentish.reduce((sum, m) => sum + (m.failed_count ?? 0), 0);
    const targeted = sentish.reduce((sum, m) => sum + getRecipientCount(m), 0);
    const rate = targeted > 0 ? Math.round((delivered / targeted) * 100) : 0;
    return {
      delivered,
      failed,
      targeted,
      rate,
      scheduled: messages.filter((m) => m.status === 'scheduled').length,
      active: messages.filter((m) => m.status === 'queued' || m.status === 'sending').length,
    };
  }, [messages]);

  const canCompose = canComposeDashboardMessages(messagesRole);

  const filteredHistory = useMemo(() => messages.filter((m) => {
    if (historyStatusFilter === 'active') {
      if (!(m.status === 'queued' || m.status === 'sending')) return false;
    } else if (historyStatusFilter !== 'all' && m.status !== historyStatusFilter) return false;
    if (historyChannelFilter !== 'all' && m.channel !== historyChannelFilter) return false;
    const aud = m.audience_filter ?? (m.recipient_filter?.audience as string) ?? 'all';
    if (historyAudienceFilter !== 'all' && aud !== historyAudienceFilter) return false;
    if (historyCampaignFilter && getCampaignThreadKey(m) !== historyCampaignFilter) return false;
    const skippedCount = getSkippedCount(m, deliveries);
    const failedCount = Number(m.failed_count ?? 0);
    const deliveredCount = Number(m.delivered_count ?? 0);
    const unreachedCount = getUnreachedCount(m, deliveries);
    if (historyDeliveryFilter === 'delivered' && deliveredCount <= 0) return false;
    if (historyDeliveryFilter === 'failed' && failedCount <= 0) return false;
    if (historyDeliveryFilter === 'skipped' && skippedCount <= 0) return false;
    if (historyDeliveryFilter === 'unreached' && unreachedCount <= 0) return false;
    const query = historySearch.trim().toLowerCase();
    if (query) {
      const haystack = [m.subject, m.body, aud, m.channel, m.status, getCampaignName(m), getCampaignTypeLabel(m)].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  }), [messages, deliveries, historyStatusFilter, historyChannelFilter, historyAudienceFilter, historyCampaignFilter, historyDeliveryFilter, historySearch]);

  const audienceBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    messages.forEach((m) => {
      const key = getAudienceLabel(m);
      map.set(key, (map.get(key) ?? 0) + getRecipientCount(m));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [messages]);

  const retryCandidates = useMemo(
    () => messages.filter((m) => m.status === 'failed').slice(0, 5),
    [messages],
  );

  const reviewCandidates = useMemo(
    () => messages.filter((m) => m.status === 'partial').slice(0, 5),
    [messages],
  );

  const segmentPerformance = useMemo(() => {
    const eventLabelById = new Map<string, string>();
    itineraryAudienceOptions.forEach((opt) => {
      const id = opt.value.replace('event:', '');
      eventLabelById.set(id, opt.label);
    });

    const map = new Map<string, { sent: number; failed: number; targeted: number }>();
    messages.forEach((m) => {
      const audience = m.audience_filter ?? '';
      if (!audience.startsWith('event:')) return;
      const eventId = audience.replace('event:', '');
      const key = eventLabelById.get(eventId) ?? eventId;
      const prev = map.get(key) ?? { sent: 0, failed: 0, targeted: 0 };
      if (m.status === 'sent' || m.status === 'partial') prev.sent += 1;
      if (m.status === 'failed') prev.failed += 1;
      prev.targeted += getRecipientCount(m);
      map.set(key, prev);
    });

    return Array.from(map.entries()).sort((a, b) => b[1].targeted - a[1].targeted).slice(0, 4);
  }, [messages, itineraryAudienceOptions]);

  const historyStatusCounts = useMemo(() => ({
    sent: messages.filter((m) => m.status === 'sent').length,
    active: messages.filter((m) => m.status === 'queued' || m.status === 'sending').length,
    scheduled: messages.filter((m) => m.status === 'scheduled').length,
    partial: messages.filter((m) => m.status === 'partial').length,
    failed: messages.filter((m) => m.status === 'failed').length,
    draft: messages.filter((m) => m.status === 'draft').length,
  }), [messages]);

  const channelBreakdown = useMemo(() => {
    const init = {
      email: { sent: 0, scheduled: 0, failed: 0, partial: 0, targeted: 0 },
      sms: { sent: 0, scheduled: 0, failed: 0, partial: 0, targeted: 0 },
    };
    messages.forEach((m) => {
      const ch = m.channel === 'sms' ? 'sms' : 'email';
      if (m.status === 'sent') init[ch].sent += 1;
      if (m.status === 'scheduled') init[ch].scheduled += 1;
      if (m.status === 'failed') init[ch].failed += 1;
      if (m.status === 'partial') init[ch].partial += 1;
      if (isDeliveryActiveStatus(m.status)) {
        init[ch].targeted += getRecipientCount(m);
      }
    });
    return init;
  }, [messages]);

  const deliveryHealth = useMemo(() => {
    const deliveryActiveMessages = messages.filter((m) => isDeliveryActiveStatus(m.status));
    const deliveryActiveRows = getDeliveryScopedRows(messages, deliveries, (message) => isDeliveryActiveStatus(message.status));
    const delivered = deliveryActiveMessages.reduce((sum, m) => sum + (m.delivered_count ?? 0), 0);
    const failed = deliveryActiveMessages.reduce((sum, m) => sum + (m.failed_count ?? 0), 0);
    const targeted = deliveryActiveMessages.reduce((sum, m) => sum + getRecipientCount(m), 0);
    const skipped = deliveryActiveRows.filter((d) => d.status === 'skipped').length;
    const successRate = targeted > 0 ? Math.round((delivered / targeted) * 100) : 0;
    const failRate = targeted > 0 ? Math.round((failed / targeted) * 100) : 0;
    const skippedRate = targeted > 0 ? Math.round((skipped / targeted) * 100) : 0;
    const overdueScheduled = messages.filter((m) => m.status === 'scheduled' && isPastScheduledTime(m.scheduled_for)).length;
    const retryBacklog = messages.filter((m) => m.status === 'failed').length;
    const reviewBacklog = messages.filter((m) => m.status === 'partial').length;
    return { successRate, failRate, skipped, skippedRate, overdueScheduled, retryBacklog, reviewBacklog };
  }, [messages, deliveries]);

  const guestOpsCoach = useMemo(() => buildGuestOpsCoach({
    totalGuests: guests.length,
    attendingGuests: guests.filter((guest) => isAttendingStatus(guest.rsvp_status)).length,
    pendingResponses: guests.filter((guest) => isPendingStatus(guest.rsvp_status)).length,
    pendingWithoutEmail: guests.filter((guest) => isPendingStatus(guest.rsvp_status) && !hasReachableEmail(guest.email)).length,
    noContact: guests.filter((guest) => !hasReachableEmail(guest.email) && !hasReachablePhone(guest.phone)).length,
    missingMealChoices: 0,
    missingPlusOneNames: 0,
  }), [guests]);

  const messageOpsCoach = useMemo(() => buildMessageOpsCoach({
    totalGuests: guests.length,
    attendingGuests: guests.filter((guest) => isAttendingStatus(guest.rsvp_status)).length,
    pendingResponses: guests.filter((guest) => isPendingStatus(guest.rsvp_status)).length,
    pendingWithoutEmail: guests.filter((guest) => isPendingStatus(guest.rsvp_status) && !hasReachableEmail(guest.email)).length,
    noContact: guests.filter((guest) => !hasReachableEmail(guest.email) && !hasReachablePhone(guest.phone)).length,
    missingMealChoices: 0,
    missingPlusOneNames: 0,
  }, {
    scheduledCount: historyStatusCounts.scheduled,
    overdueScheduledCount: deliveryHealth.overdueScheduled,
    partialCount: historyStatusCounts.partial,
    failedCount: historyStatusCounts.failed,
    unreachedRecipientCount: messages.reduce((sum, message) => sum + getUnreachedCount(message, deliveries), 0),
  }), [deliveryHealth.overdueScheduled, deliveries, guests, historyStatusCounts.failed, historyStatusCounts.partial, historyStatusCounts.scheduled, messages]);
  const guestOutreachSequence = useMemo(() => buildGuestOutreachSequence({
    totalGuests: guests.length,
    attendingGuests: guests.filter((guest) => isAttendingStatus(guest.rsvp_status)).length,
    pendingResponses: guests.filter((guest) => isPendingStatus(guest.rsvp_status)).length,
    pendingWithoutEmail: guests.filter((guest) => isPendingStatus(guest.rsvp_status) && !hasReachableEmail(guest.email)).length,
    noContact: guests.filter((guest) => !hasReachableEmail(guest.email) && !hasReachablePhone(guest.phone)).length,
    missingMealChoices: 0,
    missingPlusOneNames: 0,
  }, {
    scheduledCount: historyStatusCounts.scheduled,
    overdueScheduledCount: deliveryHealth.overdueScheduled,
    partialCount: historyStatusCounts.partial,
    failedCount: historyStatusCounts.failed,
    unreachedRecipientCount: messages.reduce((sum, message) => sum + getUnreachedCount(message, deliveries), 0),
  }), [deliveryHealth.overdueScheduled, deliveries, guests, historyStatusCounts.failed, historyStatusCounts.partial, historyStatusCounts.scheduled, messages]);
  const dayOfDispatch = useMemo(() => buildDayOfDispatchModel({
    daysUntilWedding: weddingSite?.wedding_date
      ? Math.ceil((new Date(`${weddingSite.wedding_date}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
      : null,
    venueName: weddingSite?.venue_name ?? null,
    pendingGuests: guests.filter((guest) => isPendingStatus(guest.rsvp_status)).length,
    itineraryAudienceCount: itineraryAudienceOptions.length,
    scheduledDayOfCount: messages.filter((message) => message.status === 'scheduled' && getCampaignTypeLabel(message) === 'day-of-update').length,
    sentDayOfCount: messages.filter((message) => (message.status === 'sent' || message.status === 'partial') && getCampaignTypeLabel(message) === 'day-of-update').length,
    overdueDayOfCount: messages.filter((message) => message.status === 'scheduled' && getCampaignTypeLabel(message) === 'day-of-update' && isPastScheduledTime(message.scheduled_for)).length,
  }), [guests, itineraryAudienceOptions.length, messages, weddingSite?.venue_name, weddingSite?.wedding_date]);

  const campaignThreads = useMemo(() => {
    const map = new Map<string, {
      key: string;
      name: string;
      count: number;
      delivered: number;
      failed: number;
      skipped: number;
      unreached: number;
      latestStatus: string;
      latestAt: number;
    }>();

    messages.forEach((message) => {
      const key = getCampaignThreadKey(message);
      const latestAt = Math.max(
        getMessageHistoryTimestamp(message.sent_at),
        getMessageHistoryTimestamp(message.scheduled_for),
      );
      const prev = map.get(key) ?? {
        key,
        name: key,
        count: 0,
        delivered: 0,
        failed: 0,
        skipped: 0,
        unreached: 0,
        latestStatus: message.status,
        latestAt,
      };

      prev.count += 1;
      prev.delivered += Number(message.delivered_count ?? 0);
      prev.failed += Number(message.failed_count ?? 0);
      prev.skipped += getSkippedCount(message, deliveries);
      prev.unreached += getUnreachedCount(message, deliveries);
      if (latestAt >= prev.latestAt) {
        prev.latestAt = latestAt;
        prev.latestStatus = message.status;
      }
      map.set(key, prev);
    });

    return Array.from(map.values())
      .sort((a, b) => b.latestAt - a.latestAt)
      .slice(0, 5);
  }, [messages, deliveries]);

  const activeCampaignThread = useMemo(() => {
    if (historyCampaignFilter) {
      return campaignThreads.find((thread) => thread.name === historyCampaignFilter) ?? null;
    }
    const query = historySearch.trim().toLowerCase();
    if (!query) return null;
    return campaignThreads.find((thread) => thread.name.toLowerCase() === query) ?? null;
  }, [campaignThreads, historyCampaignFilter, historySearch]);

  const activeCampaignMessages = useMemo(() => {
    if (!activeCampaignThread) return [] as Message[];
    return messages
      .filter((message) => getCampaignThreadKey(message) === activeCampaignThread.name)
      .sort((a, b) => {
        const aTime = Math.max(
          getMessageHistoryTimestamp(a.sent_at),
          getMessageHistoryTimestamp(a.scheduled_for),
        );
        const bTime = Math.max(
          getMessageHistoryTimestamp(b.sent_at),
          getMessageHistoryTimestamp(b.scheduled_for),
        );
        return bTime - aTime;
      });
  }, [messages, activeCampaignThread]);

  const activeCampaignLatestMessage = activeCampaignMessages[0] ?? null;

  const providerTelemetry = useMemo(() => {
    const completedDeliveryRows = getDeliveryScopedRows(messages, deliveries, (message) => isDeliveryCompletedStatus(message.status));
    const attempted = completedDeliveryRows.filter((d) => d.status === 'sent' || d.status === 'failed');
    const sent = completedDeliveryRows.filter((d) => d.status === 'sent').length;
    const failed = completedDeliveryRows.filter((d) => d.status === 'failed').length;
    const skipped = completedDeliveryRows.filter((d) => d.status === 'skipped').length;
    const withProviderId = completedDeliveryRows.filter((d) => !!d.provider_message_id).length;
    const errorTop = Array.from(
      completedDeliveryRows
        .filter((d) => d.status === 'failed' && d.error_message)
        .reduce((map, d) => {
          const key = (d.error_message || 'Unknown').slice(0, 60);
          map.set(key, (map.get(key) ?? 0) + 1);
          return map;
        }, new Map<string, number>())
        .entries(),
    ).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const sentRate = attempted.length > 0 ? Math.round((sent / attempted.length) * 100) : 0;
    return { attempted: attempted.length, sent, failed, skipped, withProviderId, sentRate, errorTop };
  }, [messages, deliveries]);

  if (loading) {
    return (
      <DashboardLayout currentPage="messages">
        <div className="max-w-7xl mx-auto">
          <DashboardStateBlock title="Loading messages…" description="Preparing your campaigns and activity." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="messages">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="rounded-[32px] border border-border-subtle bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Communications</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-text-primary">Message guests with more control and a lot less dashboard sludge.</h1>
              <p className="mt-3 text-sm leading-6 text-text-secondary">Draft reminders, day-of updates, and follow-ups from one place. Keep the audience clear, the send timing obvious, and the results easy to scan after the fact.</p>
              {messagesRole === 'coordinator' && <p className="mt-2 text-xs text-text-tertiary">Coordinator access can review delivery health and day-of comms, but campaign drafting stays with the couple or planner.</p>}
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:w-[420px]">
              <div className="rounded-2xl border border-border-subtle bg-surface-subtle/40 p-4">
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Scheduled</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">{deliveryStats.scheduled}</p>
              </div>
              <div className="rounded-2xl border border-border-subtle bg-surface-subtle/40 p-4">
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Recipients reached / attempted</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">{deliveryStats.targeted}</p>
              </div>
              <div className="rounded-2xl border border-border-subtle bg-surface-subtle/40 p-4">
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Delivery rate</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">{deliveryStats.rate}%</p>
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
              <span className="rounded-full border border-border-subtle bg-surface-subtle px-3 py-1">Email + SMS</span>
              <span className="rounded-full border border-border-subtle bg-surface-subtle px-3 py-1">Audience-aware drafts</span>
              <span className="rounded-full border border-border-subtle bg-surface-subtle px-3 py-1">Live delivery history</span>
            </div>
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
                <label className="block text-xs text-text-tertiary mb-1">Access view</label>
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
          </div>
        </div>

        {messagesRole === 'planner' && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            Planner view is on — this workspace stays focused on guest communications, reminders, and day-of updates.
          </div>
        )}

        <div className="rounded-[28px] border border-border-subtle bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Communication flow</p>
              <h2 className="mt-2 text-2xl font-semibold text-text-primary">Keep the lifecycle obvious from first nudge to final follow-up.</h2>
              <p className="mt-2 text-sm text-text-secondary">Presets pull from your real wedding details and audience context first, then hand the message back to you before anything sends.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            {GUEST_COMMUNICATION_FLOW.map((stage, index) => (
              <div key={stage.id} className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-text-tertiary">0{index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">{stage.label}</p>
                <p className="mt-2 text-xs leading-5 text-text-secondary">{stage.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-border-subtle bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Suggested next moves</p>
              <h2 className="mt-2 text-2xl font-semibold text-text-primary">{messageOpsCoach.pulse}</h2>
              <p className="mt-2 text-sm text-text-secondary">{messageOpsCoach.summary}</p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-4 py-3 md:min-w-[220px]">
              <p className="text-[11px] uppercase tracking-[0.22em] text-text-tertiary">Guest ops readiness</p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{guestOpsCoach.readinessScore}%</p>
              <p className="mt-1 text-xs text-text-secondary">Shared guest and messaging confidence, so the next send is based on the real state of the list.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {messageOpsCoach.plays.map((play) => (
              <div key={play.id} className="rounded-2xl border border-border-subtle bg-surface-subtle/20 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">{play.title}</p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    play.status === 'review'
                      ? 'border border-warning/20 bg-warning-light text-warning'
                      : play.status === 'blocked'
                        ? 'border border-error/20 bg-error-light text-error'
                        : play.status === 'ready'
                          ? 'border border-primary/20 bg-primary-light text-primary'
                          : 'border border-success/20 bg-success-light text-success'
                  }`}>
                    {play.status === 'review' ? 'Review' : play.status === 'blocked' ? 'Blocked' : play.status === 'ready' ? 'Ready' : 'Calm'}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-text-secondary">{play.detail}</p>
                {play.action !== 'none' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    disabled={!canCompose && (play.action === 'compose-rsvp-reminder' || play.action === 'compose-day-of-update' || play.action === 'run-due-scheduled')}
                    onClick={() => runMessageOpsCoachPlay(play)}
                  >
                    {play.actionLabel}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-border-subtle bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Day-of dispatch</p>
              <h2 className="mt-2 text-2xl font-semibold text-text-primary">{dayOfDispatch.title}</h2>
              <p className="mt-2 text-sm text-text-secondary">{dayOfDispatch.detail}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {dayOfDispatch.badges.map((badge) => (
              <span key={badge} className="rounded-full border border-border-subtle bg-surface-subtle/20 px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                {badge}
              </span>
            ))}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-border-subtle bg-surface-subtle/20 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Main focus</p>
              <p className="mt-1 text-sm font-semibold text-text-primary">{dayOfDispatch.focusTitle}</p>
              <p className="mt-2 text-xs leading-5 text-text-secondary">{dayOfDispatch.focusDetail}</p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-surface-subtle/20 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Decision rule</p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">{dayOfDispatch.decisionRule}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {dayOfDispatch.sequence.map((step) => (
              <div key={step.id} className="rounded-2xl border border-border-subtle bg-surface-subtle/20 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">{step.title}</p>
                  <span className="rounded-full border border-border-subtle bg-white px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                    {getFlowStatusLabel(step.status)}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-text-secondary">{step.detail}</p>
              </div>
            ))}
          </div>
          {dayOfDispatch.primaryAction.action !== 'none' && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => runMessageOpsCoachPlay({
                  id: dayOfDispatch.primaryAction.action === 'run-due-scheduled' ? 'run-due-scheduled' : 'stage-day-of-update',
                  status: dayOfDispatch.primaryAction.action === 'run-due-scheduled' ? 'ready' : 'ready',
                  title: dayOfDispatch.primaryAction.label,
                  detail: dayOfDispatch.detail,
                  actionLabel: dayOfDispatch.primaryAction.label,
                  action: dayOfDispatch.primaryAction.action,
                })}
                disabled={!canCompose && dayOfDispatch.primaryAction.action === 'compose-day-of-update'}
              >
                {dayOfDispatch.primaryAction.label}
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-border-subtle bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Shared outreach order</p>
              <h2 className="mt-2 text-2xl font-semibold text-text-primary">{guestOutreachSequence.headline}</h2>
              <p className="mt-2 text-sm text-text-secondary">{guestOutreachSequence.summary}</p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-4 py-3 md:min-w-[220px]">
              <p className="text-[11px] uppercase tracking-[0.22em] text-text-tertiary">What changes</p>
              <p className="mt-1 text-xs text-text-secondary">Messages now follows the real list state, so we do cleanup, nudges, and live updates in the right order.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {guestOutreachSequence.steps.map((step) => (
              <div key={step.id} className="rounded-2xl border border-border-subtle bg-surface-subtle/20 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">{step.title}</p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    step.status === 'current'
                      ? 'border border-primary/20 bg-primary-light text-primary'
                      : step.status === 'next'
                        ? 'border border-warning/20 bg-warning-light text-warning'
                        : step.status === 'then'
                          ? 'border border-border-subtle bg-surface-subtle text-text-secondary'
                          : 'border border-success/20 bg-success-light text-success'
                  }`}>
                    {step.status === 'current' ? 'Current' : step.status === 'next' ? 'Next' : step.status === 'then' ? 'Then' : 'Steady'}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-text-secondary">{step.detail}</p>
                {step.id !== 'steady' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    disabled={step.area === 'messages' && !canCompose && step.playAction !== 'open-partial' && step.playAction !== 'open-failed' && step.playAction !== 'run-due-scheduled'}
                    onClick={() => runGuestOutreachStep(step)}
                  >
                    {step.ctaLabel}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card variant="bordered" padding="lg" className="border-border-subtle shadow-sm overflow-hidden">
              <div className="-mx-6 -mt-6 mb-4 border-b border-border-subtle bg-surface-subtle/40 px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Channel setup</p>
                <h3 className="mt-2 text-xl font-semibold text-text-primary">Email and SMS readiness</h3>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-primary-light p-3">
                      <AtSign className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary">Wedding email</p>
                      <p className="mt-2 text-base font-semibold text-text-primary">{weddingSite?.couple_email ?? 'Not set yet'}</p>
                      <p className="mt-1 text-xs text-text-secondary">Guest emails appear from this address when email is used.</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary">Email usage cap</p>
                      <p className="mt-2 text-2xl font-semibold text-text-primary">{remainingEmailRecipients}</p>
                      <p className="mt-1 text-xs text-text-secondary">Recipient slots left before the current email send cap of {HARD_EMAIL_CAP}.</p>
                      <p className="text-xs text-text-tertiary">Used {usedEmailRecipients} total email recipients so far.</p>
                    </div>
                    <div className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${emailCapacityEnough ? 'border-success/20 bg-success-light text-success' : 'border-error/20 bg-error-light text-error'}`}>
                      {emailCapacityEnough ? 'Within cap' : 'Cap risk'}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary">SMS credits</p>
                      <p className="mt-2 text-2xl font-semibold text-text-primary">{smsCredits}</p>
                      <p className="mt-1 text-xs text-text-secondary">About 1 credit per guest for each text.</p>
                      <p className="text-xs text-text-tertiary">Credits expire 12 months after purchase{smsExpiringSoon > 0 ? ` • ${smsExpiringSoon} expiring in 30 days` : ''}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleBuySmsPack('sms_100')} disabled={buyingPack !== null}>{buyingPack === 'sms_100' ? 'Opening…' : 'Buy 100'}</Button>
                      <Button size="sm" variant="outline" onClick={() => handleBuySmsPack('sms_500')} disabled={buyingPack !== null}>{buyingPack === 'sms_500' ? 'Opening…' : 'Buy 500'}</Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card variant="bordered" padding="lg" className="border-border-subtle shadow-sm overflow-hidden">
              <div className="-mx-6 -mt-6 mb-4 border-b border-border-subtle bg-surface-subtle/40 px-6 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Credits</p>
                    <h3 className="mt-2 text-xl font-semibold text-text-primary">Recent credit activity</h3>
                  </div>
                  <span className="text-xs text-text-tertiary">Recent {smsTransactions.length}</span>
                </div>
              </div>
              {smsTransactions.length === 0 ? (
                <p className="text-xs text-text-tertiary">No credit activity yet. Buy credits when you’re ready to send texts.</p>
              ) : (
                <>
                  <div className="mb-3 rounded-2xl border border-border-subtle bg-surface-subtle/30 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-text-tertiary">Balance snapshot</p>
                    <p className="mt-1 text-sm font-medium text-text-primary">{smsCredits} credits available{smsExpiringSoon > 0 ? ` • ${smsExpiringSoon} expiring soon` : ''}</p>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-auto pr-1">
                  {smsTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between gap-3 text-xs border border-border rounded-lg px-3 py-2 bg-surface-subtle">
                      <div>
                        <p className="text-text-primary capitalize">{tx.reason}</p>
                        <p className="text-text-tertiary">{formatMessageHistoryDateTime(tx.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className={`${tx.credits_delta >= 0 ? 'text-success' : 'text-error'} font-medium`}>{tx.credits_delta >= 0 ? '+' : ''}{tx.credits_delta} credits</p>
                        {tx.expires_at && tx.reason === 'purchase' && <p className="text-text-tertiary">Expires {formatMessageHistoryDate(tx.expires_at)}</p>}
                      </div>
                    </div>
                  ))}
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card variant="bordered" padding="lg" className="overflow-hidden border-border-subtle shadow-sm">
              <div className="-mx-6 -mt-6 mb-6 border-b border-border-subtle bg-surface-subtle/40 px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Composer</p>
                <h2 className="mt-2 text-2xl font-semibold text-text-primary">Write a message</h2>
                <p className="mt-1 text-sm text-text-secondary">Choose the audience, draft the message, then decide whether it goes out now or on a schedule.</p>
              </div>
              {!canCompose && <p className="text-xs text-text-tertiary mb-3">Viewer mode is on, so writing and sending are turned off.</p>}
              <form onSubmit={(e) => handleSendMessage(e, false)} className="space-y-6">
                <fieldset disabled={!canCompose} className="space-y-6">
                <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 p-4">
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

                <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 p-4">
                  <label className="block text-sm font-medium text-text-primary mb-2">Channel</label>
                  <div className="inline-flex rounded-lg border border-border overflow-hidden bg-white">
                    <button type="button" className={`px-3 py-1.5 text-sm ${formData.channel === 'email' ? 'bg-primary/10 text-primary' : 'text-text-secondary'}`} onClick={() => setFormData({ ...formData, channel: 'email' })}>Email</button>
                    <button type="button" className={`px-3 py-1.5 text-sm border-l border-border ${formData.channel === 'sms' ? 'bg-primary/10 text-primary' : 'text-text-secondary'}`} onClick={() => setFormData({ ...formData, channel: 'sms' })}>SMS</button>
                  </div>
                  {formData.channel === 'sms' && (
                    <p className="text-xs text-text-tertiary mt-1">Texts use your credit balance and send when text setup is ready.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 p-4">
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
                  {formData.channel === 'email' && activeRecipients < (selectedAudience?.count || 0) && (
                    <p className="text-sm text-warning mt-1">
                      {activeRecipients} of {selectedAudience?.count} guests have email addresses
                    </p>
                  )}
                  {formData.channel === 'sms' && recipientsWithPhone < (selectedAudience?.count || 0) && (
                    <p className="text-sm text-warning mt-1">
                      {recipientsWithPhone} of {selectedAudience?.count} guests have phone numbers
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2 py-1 text-xs rounded-full border border-border bg-white text-text-secondary">
                      Reaches {activeRecipients} guest{activeRecipients !== 1 ? 's' : ''}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full border ${unreachableRecipients > 0 ? 'border-warning/30 bg-warning-light text-warning' : 'border-success/30 bg-success-light text-success'}`}>
                      {unreachableRecipients > 0 ? `${unreachableRecipients} missing ${formData.channel === 'sms' ? 'phone numbers' : 'email addresses'}` : `Everyone in this group is reachable by ${formData.channel === 'sms' ? 'text' : 'email'}`}
                    </span>
                    {formData.channel === 'sms' && (
                      <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full border ${smsCreditsSufficient ? 'border-success/30 bg-success-light text-success' : 'border-error/30 bg-error-light text-error'}`}>
                        {smsCreditsSufficient ? 'Enough credits' : `Need ${smsCreditsNeeded - smsCredits} more credits`}
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

                <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 p-4">
                  <label className="block text-sm font-medium text-text-primary mb-2">When should it send?</label>
                  <div className="flex gap-4 mb-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, scheduleType: 'now' })}
                      className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                        formData.scheduleType === 'now'
                          ? 'bg-primary text-text-inverse hover:bg-primary-hover'
                          : 'bg-surface-subtle text-text-secondary hover:bg-surface border border-border'
                      }`}
                    >
                      Send now
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, scheduleType: 'later' })}
                      className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                        formData.scheduleType === 'later'
                          ? 'bg-primary text-text-inverse hover:bg-primary-hover'
                          : 'bg-surface-subtle text-text-secondary hover:bg-surface border border-border'
                      }`}
                    >
                      Schedule
                    </button>
                  </div>

                  {formData.scheduleType === 'later' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 p-4 bg-surface-subtle rounded-lg border border-border">
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-2">Date</label>
                          <Input
                            type="date"
                            value={formData.scheduleDate}
                            onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-2">
                            Time
                            <span className="ml-1 text-xs font-normal text-text-tertiary">
                              ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                            </span>
                          </label>
                          <Input
                            type="time"
                            value={formData.scheduleTime}
                            onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      {formData.scheduleDate && formData.scheduleTime &&
                        isPastScheduledTime(`${formData.scheduleDate}T${formData.scheduleTime}:00`) && (
                        <div className="flex items-start gap-2 p-3 bg-warning-light border border-warning/20 rounded-lg text-sm text-warning">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium">That time has already passed.</span>
                            {' '}This message will send right away when you click Schedule message.
                          </div>
                        </div>
                      )}
                      {formData.scheduleDate && formData.scheduleTime &&
                        !isPastScheduledTime(`${formData.scheduleDate}T${formData.scheduleTime}:00`) && (
                        <p className="text-xs text-text-tertiary px-1">
                          Scheduled for: {formatScheduledDate(`${formData.scheduleDate}T${formData.scheduleTime}:00`)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-border-subtle bg-white">
                  <button
                    type="button"
                    onClick={() => setShowRecipientPreview(!showRecipientPreview)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-surface-subtle/30 hover:bg-surface transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-text-secondary" />
                      <span className="font-medium text-text-primary">
                        Preview recipients ({activeRecipients} with {formData.channel === 'sms' ? 'phone numbers' : 'email addresses'})
                      </span>
                    </div>
                    {showRecipientPreview ? <ChevronUp className="w-4 h-4 text-text-tertiary" /> : <ChevronDown className="w-4 h-4 text-text-tertiary" />}
                  </button>
                  {showRecipientPreview && (
                    <div className="border-t border-border max-h-48 overflow-y-auto">
                      {previewRecipients.length === 0 ? (
                        <div className="p-4 text-sm text-text-secondary text-center">No guests in this group have {formData.channel === 'sms' ? 'phone numbers' : 'email addresses'} yet.</div>
                      ) : (
                        <ul className="divide-y divide-border">
                          {previewRecipients.map(g => (
                            <li key={g.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                              <span className="text-text-primary font-medium">{g.first_name ?? ''} {g.last_name ?? ''}</span>
                              <span className="text-text-tertiary text-xs">{formData.channel === 'sms' ? g.phone : g.email}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-primary/20 bg-primary-light/40 p-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-primary mt-0.5" />
                    <div className="text-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary">Delivery summary</p>
                      <p className="mt-2 font-medium text-text-primary">What happens next</p>
                      <p className="text-text-secondary mt-1">
                        {formData.scheduleType === 'later' && formData.scheduleDate && formData.scheduleTime
                          ? isPastScheduledTime(`${formData.scheduleDate}T${formData.scheduleTime}:00`)
                            ? `Will send right away because that time has already passed — ${activeRecipients} recipient${activeRecipients !== 1 ? 's' : ''}`
                            : `Scheduled for ${formatScheduledDate(`${formData.scheduleDate}T${formData.scheduleTime}:00`)} — ${activeRecipients} recipient${activeRecipients !== 1 ? 's' : ''}`
                          : `${formData.channel === 'sms' ? 'Text' : 'Email'} will send right away to ${activeRecipients} guest${activeRecipients !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-4 py-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary">Email reachability</p>
                    <p className="mt-2 text-text-primary">{audienceReachability.total - audienceReachability.missingEmail} reachable · {audienceReachability.missingEmail} missing email</p>
                  </div>
                  <div className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-4 py-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary">SMS reachability</p>
                    <p className="mt-2 text-text-primary">{audienceReachability.total - audienceReachability.missingPhone} reachable · {audienceReachability.missingPhone} missing phone</p>
                  </div>
                </div>

                {activeRecipients > 0 && (
                  <div className="text-xs text-text-tertiary bg-surface-subtle border border-border rounded-lg px-3 py-2">
                    {formData.scheduleType === 'now'
                      ? `When you click Send, this ${formData.channel === 'sms' ? 'text' : 'email'} will go out right away to ${activeRecipients} recipient${activeRecipients !== 1 ? 's' : ''}.`
                      : `Scheduled messages will send at your chosen time to everyone who still matches this group.`}
                  </div>
                )}

                {activeRecipients === 0 && !sending && formData.audience !== '' && (
                  <div className="flex items-center gap-2 p-3 bg-warning-light border border-warning/20 rounded-lg text-sm text-warning">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {formData.channel === 'sms'
                      ? 'No guests in this group have phone numbers yet. Add phone numbers before sending a text.'
                      : 'No guests in this group have email addresses yet. Add email addresses before sending.'}
                  </div>
                )}

                {formData.channel === 'sms' && activeRecipients > 0 && !smsCreditsSufficient && (
                  <div className="flex items-center justify-between gap-3 p-3 bg-error-light border border-error/20 rounded-lg text-sm text-error">
                    <span>Not enough text credits yet: need {smsCreditsNeeded}, have {smsCredits}.</span>
                    <Button size="sm" variant="outline" onClick={() => handleBuySmsPack('sms_100')} disabled={buyingPack !== null}>Buy credits</Button>
                  </div>
                )}

                {formData.channel === 'email' && activeRecipients > 0 && (
                  <div className={`flex items-center justify-between gap-3 p-3 rounded-lg text-sm border ${emailCapacityEnough ? 'bg-success-light border-success/20 text-success' : 'bg-error-light border-error/20 text-error'}`}>
                    <span>
                      {emailCapacityEnough
                        ? `Email cap check: ${remainingEmailRecipients} recipient slots left before send • ${emailCapacityAfterSend} left after this campaign.`
                        : `Email cap check: this campaign needs ${recipientsWithEmail}, but only ${remainingEmailRecipients} recipient slots remain.`}
                    </span>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    disabled={sending || activeRecipients === 0 || (formData.channel === 'email' && !emailCapacityEnough)}
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

            <Card variant="bordered" padding="lg" className="overflow-hidden border-border-subtle shadow-sm mt-6">
              <div className="-mx-6 -mt-6 mb-6 border-b border-border-subtle bg-surface-subtle/40 px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Reusable templates</p>
                <h2 className="mt-2 text-2xl font-semibold text-text-primary">Saved from your real campaigns</h2>
                <p className="mt-1 text-sm text-text-secondary">Keep a lightweight library of messages you actually reuse without bloating the backend model.</p>
              </div>
              {savedTemplates.length === 0 ? (
                <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-4 py-6 text-sm text-text-secondary">
                  No saved reusable templates yet. Save one from the composer when you have a message worth reusing.
                </div>
              ) : (
                <div className="space-y-3">
                  {savedTemplates.map((template) => (
                    <div key={template.id} className="rounded-2xl border border-border-subtle bg-surface-subtle/20 px-4 py-4">
                      {(() => {
                        const savedScheduleIsUsable = isSavedTemplateScheduleUsable(template);
                        return (
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">{template.channel.toUpperCase()} · {audienceOptions.find((option) => option.value === template.audience)?.label ?? 'Saved audience'}</p>
                          <h3 className="mt-1 text-sm font-semibold text-text-primary">{template.name}</h3>
                          <p className="mt-1 text-xs text-text-secondary line-clamp-2">{template.subject || '(No subject)'}{template.body ? ` — ${template.body}` : ''}</p>
                          {template.scheduleType === 'later' && template.scheduleDate && template.scheduleTime && (
                            <p className={`mt-1 text-[11px] ${savedScheduleIsUsable ? 'text-text-tertiary' : 'text-warning'}`}>
                              {savedScheduleIsUsable
                                ? `Saved with schedule: ${formatScheduledDate(`${template.scheduleDate}T${template.scheduleTime}:00`)}`
                                : 'Saved schedule has expired and will not be reused'}
                            </p>
                          )}
                          <p className="mt-2 text-[11px] text-text-tertiary">
                            Created {formatMessageHistoryDateTime(template.createdAt)}
                            {template.updatedAt ? ` • Updated ${formatMessageHistoryDateTime(template.updatedAt)}` : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => applySavedTemplate(template)}>
                            Use template
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => deleteSavedTemplate(template.id)}>
                            Remove
                          </Button>
                        </div>
                      </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 self-start">
            <Card variant="bordered" padding="lg" className="border-border-subtle shadow-sm overflow-hidden">
              <div className="-mx-6 -mt-6 mb-5 border-b border-border-subtle bg-surface-subtle/40 px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Snapshot</p>
                <h2 className="mt-2 text-2xl font-semibold text-text-primary">Communication health at a glance</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-light rounded-lg">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{guests.length}</p>
                    <p className="text-sm text-text-secondary">Total Guests</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success-light rounded-lg">
                    <CheckCircle className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{guests.filter(g => hasReachableEmail(g.email)).length}</p>
                    <p className="text-sm text-text-secondary">With Email</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent-light rounded-lg">
                    <Mail className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">
                      {messages.filter(m => m.status === 'sent' || m.status === 'queued' || m.status === 'sending').length}
                    </p>
                    <p className="text-sm text-text-secondary">Sent / Active</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-100 rounded-lg">
                    <Link2 className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{knownPhotoLinksCount}</p>
                    <p className="text-sm text-text-secondary">Known Photo Links</p>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary mb-2">Launchpad</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    {
                      label: 'Open Photos',
                      detail: 'Jump into the upload flow you are messaging about',
                      action: () => navigate('/dashboard/photos'),
                      disabled: false,
                    },
                    {
                      label: 'Save-the-date draft',
                      detail: 'Preload a clean announcement draft',
                      action: applySaveTheDatePreset,
                      disabled: !canCompose,
                    },
                    {
                      label: 'Schedule save-the-date',
                      detail: 'Create the campaign without manually building it first',
                      action: () => { void quickCreateSaveTheDateCampaign(); },
                      disabled: !canCompose,
                    },
                    {
                      label: 'Day-of update draft',
                      detail: 'Start with a time-sensitive guest update',
                      action: applyDayOfAlertPreset,
                      disabled: !canCompose,
                    },
                    {
                      label: 'Insert photo template',
                      detail: 'Drop in an upload request tied to your memories flow',
                      action: () => applyComposerTemplate('photo-request', { campaignName: 'Photo request' }),
                      disabled: !canCompose,
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      disabled={item.disabled}
                      className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-4 py-4 text-left transition hover:border-primary/30 hover:bg-white disabled:opacity-50"
                    >
                      <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-text-secondary">{item.detail}</p>
                    </button>
                  ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card variant="bordered" padding="lg" className="border-border-subtle shadow-sm overflow-hidden">
              <div className="-mx-6 -mt-6 mb-5 border-b border-border-subtle bg-surface-subtle/40 px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Starting points</p>
                <h2 className="mt-2 text-2xl font-semibold text-text-primary">Draft from something useful, not from a blank page.</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Save the Date', detail: 'Early excitement and initial heads-up', templateKey: 'save-the-date' as MessageTemplateKey, campaignName: 'Save the date' },
                  { label: 'RSVP Reminder', detail: 'Nudge people who still have not replied', templateKey: 'rsvp-reminder' as MessageTemplateKey, campaignName: 'RSVP reminder' },
                  { label: 'Week-Of Details', detail: 'Useful logistics right before the event', templateKey: 'event-reminder' as MessageTemplateKey, campaignName: 'Week-of details' },
                  { label: 'Photo Upload Request', detail: 'Drive guests into your upload flow', templateKey: 'photo-request' as MessageTemplateKey, campaignName: 'Photo request' },
                  { label: 'Day-Of Update', detail: 'Fast text-first guest update', templateKey: 'day-of-update' as MessageTemplateKey, campaignName: 'Day-of update' },
                  { label: 'Thank You', detail: 'Close the loop after the celebration', templateKey: 'thank-you' as MessageTemplateKey, campaignName: 'Thank you' },
                ].map(tpl => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => applyComposerTemplate(tpl.templateKey, { campaignName: tpl.campaignName })}
                    disabled={!canCompose}
                    className="w-full rounded-2xl border border-border-subtle bg-surface-subtle/30 px-4 py-4 text-left transition hover:border-primary/30 hover:bg-white disabled:opacity-50"
                  >
                    <p className="text-sm font-semibold text-text-primary">{tpl.label}</p>
                    <p className="mt-1 text-xs leading-5 text-text-secondary">{tpl.detail}</p>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <Card variant="bordered" padding="lg" className="border-border-subtle shadow-sm overflow-hidden">
          <div className="-mx-6 -mt-6 mb-5 border-b border-border-subtle bg-surface-subtle/40 px-6 py-5">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">History</p>
              <h2 className="mt-2 text-2xl font-semibold text-text-primary">Message history</h2>
              <p className="text-xs text-text-tertiary mt-1">Filter by status, channel, or group to quickly find what you need.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search messages"
                className="w-[180px]"
              />
              <select value={historyStatusFilter} onChange={(e) => setHistoryStatusFilter(e.target.value as typeof historyStatusFilter)} className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-secondary">
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="sent">Sent</option>
                <option value="scheduled">Scheduled</option>
                <option value="partial">Partial</option>
                <option value="failed">Failed</option>
                <option value="draft">Draft</option>
              </select>
              <select value={historyChannelFilter} onChange={(e) => setHistoryChannelFilter(e.target.value as typeof historyChannelFilter)} className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-secondary">
                <option value="all">All channels</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
              <select value={historyAudienceFilter} onChange={(e) => setHistoryAudienceFilter(e.target.value)} className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-secondary">
                <option value="all">All audiences</option>
                {Array.from(new Set(messages.map((m) => m.audience_filter ?? (m.recipient_filter?.audience as string) ?? 'all'))).slice(0, 12).map((aud) => (
                  <option key={aud} value={aud}>{aud}</option>
                ))}
              </select>
              <select value={historyDeliveryFilter} onChange={(e) => setHistoryDeliveryFilter(e.target.value as typeof historyDeliveryFilter)} className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg text-text-secondary">
                <option value="all">All delivery states</option>
                <option value="delivered">Has delivered</option>
                <option value="failed">Has failed</option>
                <option value="skipped">Has skipped</option>
                <option value="unreached">Has unreached</option>
              </select>
            </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <button type="button" onClick={() => { setHistoryStatusFilter('failed'); setHistoryChannelFilter('all'); setHistoryDeliveryFilter('failed'); }} className="text-[11px] px-3 py-1.5 rounded-full border border-border-subtle bg-surface-subtle/30 text-text-secondary hover:border-primary/40 hover:text-primary">Show failed</button>
            <button type="button" onClick={() => { setHistoryDeliveryFilter('skipped'); setHistoryStatusFilter('all'); setHistoryChannelFilter('all'); }} className="text-[11px] px-3 py-1.5 rounded-full border border-border-subtle bg-surface-subtle/30 text-text-secondary hover:border-primary/40 hover:text-primary">Show skipped</button>
            <button type="button" onClick={() => { setHistoryDeliveryFilter('unreached'); setHistoryStatusFilter('all'); setHistoryChannelFilter('all'); }} className="text-[11px] px-3 py-1.5 rounded-full border border-border-subtle bg-surface-subtle/30 text-text-secondary hover:border-primary/40 hover:text-primary">Show unreached</button>
            <button type="button" onClick={() => { setHistoryStatusFilter('scheduled'); setHistoryChannelFilter('all'); }} className="text-[11px] px-3 py-1.5 rounded-full border border-border-subtle bg-surface-subtle/30 text-text-secondary hover:border-primary/40 hover:text-primary">Show scheduled</button>
            <button type="button" onClick={() => { setHistoryStatusFilter('all'); setHistoryChannelFilter('sms'); }} className="text-[11px] px-3 py-1.5 rounded-full border border-border-subtle bg-surface-subtle/30 text-text-secondary hover:border-primary/40 hover:text-primary">SMS only</button>
            <button type="button" onClick={() => { setHistoryStatusFilter('all'); setHistoryChannelFilter('email'); }} className="text-[11px] px-3 py-1.5 rounded-full border border-border-subtle bg-surface-subtle/30 text-text-secondary hover:border-primary/40 hover:text-primary">Email only</button>
            <button type="button" onClick={() => { setHistoryStatusFilter('all'); setHistoryChannelFilter('all'); setHistoryAudienceFilter('all'); setHistoryDeliveryFilter('all'); setHistoryCampaignFilter(''); setHistorySearch(''); }} className="text-[11px] px-3 py-1.5 rounded-full border border-border-subtle bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Reset filters</button>
          </div>

          {historyCampaignFilter && (
            <div className="mb-4 flex items-center gap-2 text-xs text-text-tertiary">
              <span className="rounded-full border border-primary/20 bg-primary-light/40 px-3 py-1 text-primary">Campaign thread: {historyCampaignFilter}</span>
              <button type="button" onClick={() => setHistoryCampaignFilter('')} className="text-primary hover:underline">Clear</button>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            {[
              ['Sent', historyStatusCounts.sent],
              ['Active', historyStatusCounts.active],
              ['Scheduled', historyStatusCounts.scheduled],
              ['Partial', historyStatusCounts.partial],
              ['Failed', historyStatusCounts.failed],
            ].map(([label, count]) => (
              <div key={String(label)} className="rounded-lg border border-border/35 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.04)] px-2.5 py-2">
                <p className="text-[11px] uppercase tracking-wide text-text-tertiary">{label}</p>
                <p className="text-sm font-semibold text-text-primary">{count}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface-subtle/30 px-4 py-3 text-[11px] text-text-secondary mb-4">
            Delivery health is based on message and delivery logs available in this workspace. Use it to spot what needs attention quickly, not as a full provider-grade reporting screen.
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {[
              {
                label: 'Provider attempts',
                value: providerTelemetry.attempted,
                detail: `${providerTelemetry.sentRate}% sent rate across attempted deliveries`,
              },
              {
                label: 'Skipped before send',
                value: providerTelemetry.skipped,
                detail: 'Missing or invalid contact info',
              },
              {
                label: 'Provider IDs',
                value: providerTelemetry.withProviderId,
                detail: 'Rows tied to provider message ids',
              },
              {
                label: 'Top provider errors',
                value: providerTelemetry.errorTop.length,
                detail: providerTelemetry.errorTop[0]?.[0] ?? 'No provider failures logged',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border/35 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.04)] px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-text-tertiary">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-text-primary">{item.value}</p>
                <p className="mt-1 text-[11px] text-text-tertiary line-clamp-2">{item.detail}</p>
              </div>
            ))}
          </div>

          {audienceBreakdown.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {audienceBreakdown.map(([label, count]) => (
                <div key={label} className="rounded-lg border border-border/35 bg-surface-subtle/40 px-2.5 py-2">
                  <p className="text-[11px] text-text-tertiary truncate">{label}</p>
                  <p className="text-sm font-semibold text-text-primary">{count} recipients</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            {(['email', 'sms'] as const).map((channel) => (
              <div key={channel} className="rounded-lg border border-border/35 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.04)] px-3 py-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs uppercase tracking-wide text-text-tertiary">{channel.toUpperCase()}</p>
                  <p className="text-xs text-text-secondary">{channelBreakdown[channel].targeted} recipients</p>
                </div>
                <p className="text-xs text-text-secondary">
                  Sent {channelBreakdown[channel].sent} · Scheduled {channelBreakdown[channel].scheduled} · Partial {channelBreakdown[channel].partial} · Failed {channelBreakdown[channel].failed}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {[
              {
                label: 'Delivery success',
                value: `${deliveryHealth.successRate}%`,
                tone: 'text-success',
                detail: 'Reached guests cleanly',
              },
              {
                label: 'Provider failure rate',
                value: `${deliveryHealth.failRate}%`,
                tone: deliveryHealth.failRate > 0 ? 'text-error' : 'text-text-primary',
                detail: 'Provider-attempted sends that failed',
              },
              {
                label: 'Skipped rate',
                value: `${deliveryHealth.skippedRate}%`,
                tone: deliveryHealth.skipped > 0 ? 'text-warning' : 'text-text-primary',
                detail: `${deliveryHealth.skipped} recipients skipped before send`,
              },
              {
                label: 'Past-due scheduled',
                value: deliveryHealth.overdueScheduled,
                tone: deliveryHealth.overdueScheduled > 0 ? 'text-warning' : 'text-text-primary',
                detail: 'Scheduled items needing attention',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-border-subtle bg-white px-3 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                <p className="text-[11px] uppercase tracking-[0.2em] text-text-tertiary">{item.label}</p>
                <p className={`mt-2 text-lg font-semibold ${item.tone}`}>{item.value}</p>
                <p className="mt-1 text-[11px] text-text-tertiary">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap gap-2 text-xs text-text-tertiary">
            <span className="rounded-full border border-border-subtle bg-surface-subtle px-3 py-1">Drafts {campaignStatusSummary.draft}</span>
            <span className="rounded-full border border-border-subtle bg-surface-subtle px-3 py-1">Scheduled {campaignStatusSummary.scheduled}</span>
            <span className="rounded-full border border-border-subtle bg-surface-subtle px-3 py-1">Sent {campaignStatusSummary.sent}</span>
            <span className="rounded-full border border-border-subtle bg-surface-subtle px-3 py-1">Partial {campaignStatusSummary.partial}</span>
            <span className="rounded-full border border-border-subtle bg-surface-subtle px-3 py-1">Failed {campaignStatusSummary.failed}</span>
          </div>

          {campaignThreads.length > 0 && (
            <div className="mb-4 rounded-2xl border border-border-subtle bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary">Campaign rollups</p>
                  <p className="mt-1 text-sm font-medium text-text-primary">Recent campaign threads</p>
                </div>
                <span className="text-[11px] text-text-tertiary">Grouped by campaign name or subject</span>
              </div>
              <div className="space-y-2">
                {campaignThreads.map((thread) => (
                  <button
                    key={thread.key}
                    type="button"
                    onClick={() => {
                      setHistoryCampaignFilter(thread.name);
                      setHistorySearch('');
                    }}
                    className="w-full flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-subtle/20 px-3 py-3 text-sm text-left hover:border-primary/30 hover:bg-white transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary truncate">{thread.name}</p>
                      <p className="text-[11px] text-text-tertiary">{thread.count} send{thread.count !== 1 ? 's' : ''} · latest {thread.latestStatus} · click to filter history</p>
                    </div>
                    <div className="text-right text-[11px] text-text-tertiary">
                      <p>{thread.delivered} delivered · {thread.failed} failed</p>
                      {thread.skipped > 0 && <p className="text-warning">{thread.skipped} skipped</p>}
                      {thread.unreached > 0 && <p className="text-warning">{thread.unreached} unreached</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeCampaignThread && (
            <div className="mb-4 rounded-2xl border border-primary/20 bg-primary-light/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary">Active campaign thread</p>
                  <h3 className="mt-1 text-sm font-semibold text-text-primary">{activeCampaignThread.name}</h3>
                  <p className="mt-1 text-xs text-text-secondary">{activeCampaignThread.count} sends · latest {activeCampaignThread.latestStatus}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeCampaignLatestMessage && (
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={!canCompose}
                      onClick={() => loadMessageIntoComposer(activeCampaignLatestMessage, 'duplicate')}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />Duplicate thread to composer
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => { setHistoryCampaignFilter(''); setHistorySearch(''); }}>Clear thread filter</Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-tertiary">
                <span className="rounded-full border border-border-subtle bg-white px-3 py-1">Delivered {activeCampaignThread.delivered}</span>
                <span className="rounded-full border border-border-subtle bg-white px-3 py-1">Failed {activeCampaignThread.failed}</span>
                <span className="rounded-full border border-border-subtle bg-white px-3 py-1">Skipped {activeCampaignThread.skipped}</span>
                <span className="rounded-full border border-border-subtle bg-white px-3 py-1">Unreached {activeCampaignThread.unreached}</span>
              </div>
              {activeCampaignLatestMessage && (
                <div className="mt-4 rounded-xl border border-border-subtle bg-white px-4 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">Latest campaign message</p>
                      <h4 className="mt-1 text-sm font-semibold text-text-primary">{activeCampaignLatestMessage.subject}</h4>
                      <p className="mt-1 text-xs text-text-secondary">
                        {activeCampaignLatestMessage.channel.toUpperCase()} · {getAudienceLabel(activeCampaignLatestMessage)} · {activeCampaignLatestMessage.status}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingMessage(activeCampaignLatestMessage)}
                      >
                        View latest
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canCompose}
                        onClick={() => loadMessageIntoComposer(activeCampaignLatestMessage, 'edit')}
                      >
                        Edit in composer
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canCompose}
                      onClick={() => startFollowUpFromCampaignThread('reminder')}
                    >
                      Next: reminder
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canCompose}
                      onClick={() => startScheduledFollowUpFromCampaignThread('reminder')}
                    >
                      Schedule reminder
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canCompose}
                      onClick={() => startFollowUpFromCampaignThread('day-of')}
                    >
                      Next: day-of update
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canCompose}
                      onClick={() => startScheduledFollowUpFromCampaignThread('day-of')}
                    >
                      Schedule day-of
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canCompose}
                      onClick={() => startFollowUpFromCampaignThread('thank-you')}
                    >
                      Next: thank you
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canCompose}
                      onClick={() => startScheduledFollowUpFromCampaignThread('thank-you')}
                    >
                      Schedule thank you
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-tertiary">
                    <span className="rounded-full border border-border-subtle bg-surface-subtle px-3 py-1">Recipients {getRecipientCount(activeCampaignLatestMessage)}</span>
                    <span className="rounded-full border border-border-subtle bg-surface-subtle px-3 py-1">Delivered {activeCampaignLatestMessage.delivered_count ?? 0}</span>
                    <span className="rounded-full border border-border-subtle bg-surface-subtle px-3 py-1">Failed {activeCampaignLatestMessage.failed_count ?? 0}</span>
                    <span className="rounded-full border border-border-subtle bg-surface-subtle px-3 py-1">Skipped {getSkippedCount(activeCampaignLatestMessage, deliveries)}</span>
                  </div>
                </div>
              )}
            </div>
          )}


          {retryCandidates.length > 0 && (
            <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4 mb-4">
              <div className="flex items-center justify-between mb-3 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary">Retry queue</p>
                  <p className="mt-1 text-sm font-medium text-text-primary">Failed campaigns ready to retry</p>
                </div>
                <button onClick={() => { setHistoryStatusFilter('failed'); setHistoryChannelFilter('all'); }} className="text-xs text-primary">View failed</button>
              </div>
              <div className="space-y-2">
              {retryCandidates.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl border border-warning/20 px-3 py-3 bg-white">
                  <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{m.subject}</p>
                      <p className="text-[11px] text-text-tertiary">{m.status} · {m.channel} · {getRecipientCount(m)} recipients</p>
                    </div>
                    {canRetryMessageStatus(m.status) ? (
                      <button
                        onClick={() => void handleRetry(m)}
                        disabled={retryingMessageId !== null || !canCompose}
                        className="text-xs px-2 py-1 rounded border border-border bg-white text-text-secondary disabled:opacity-50"
                      >
                        {retryingMessageId === m.id ? 'Retrying…' : 'Retry'}
                      </button>
                    ) : (
                      <span className="text-[11px] text-text-tertiary max-w-[220px] text-right">Review partial delivery before sending a follow-up so you do not duplicate messages.</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {reviewCandidates.length > 0 && (
            <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 mb-4">
              <div className="flex items-center justify-between mb-3 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary">Review queue</p>
                  <p className="mt-1 text-sm font-medium text-text-primary">Partial campaigns that need follow-up judgment</p>
                </div>
                <button onClick={() => { setHistoryStatusFilter('partial'); setHistoryChannelFilter('all'); }} className="text-xs text-primary">View partial</button>
              </div>
              <div className="space-y-2">
                {reviewCandidates.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl border border-accent/20 px-3 py-3 bg-white">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{m.subject}</p>
                      <p className="text-[11px] text-text-tertiary">{m.channel} · delivered {m.delivered_count ?? 0} · failed {m.failed_count ?? 0} · skipped {getSkippedCount(m, deliveries)}</p>
                    </div>
                    <div className="text-right">
                      <button
                        onClick={() => setViewingMessage(m)}
                        className="text-xs px-2 py-1 rounded border border-border bg-white text-text-secondary"
                      >
                        Review
                      </button>
                      <p className="mt-1 text-[11px] text-text-tertiary max-w-[220px]">Do not retry in place. Review misses, then duplicate if you need a follow-up.</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


          {filteredHistory.length === 0 ? (
            <div className="rounded-[24px] border border-border-subtle bg-surface-subtle/30 py-14 text-center">
              <Mail className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
              <p className="text-text-secondary">No messages match these filters</p>
              <p className="text-sm text-text-tertiary mt-1">Try a different status, channel, audience, or search term.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((message) => {
                const recipientCount = getRecipientCount(message);
                const skippedCount = getSkippedCount(message, deliveries);
                const unreachedCount = getUnreachedCount(message, deliveries);
                const campaignName = getCampaignName(message);
                return (
                  <div
                    key={message.id}
                    className="w-full rounded-[24px] border border-border-subtle bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.05)] hover:border-primary/30 hover:shadow-[0_10px_32px_rgba(15,23,42,0.08)] transition-all group"
                  >
                    <button
                      type="button"
                      onClick={() => setViewingMessage(message)}
                      className="w-full text-left"
                    >
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        {campaignName && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">{campaignName}</p>}
                        <h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors break-words leading-snug">
                          {message.subject}
                        </h3>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-text-tertiary">{message.channel} · {getAudienceLabel(message)}</p>
                      </div>
                      <span>{getStatusBadge(message)}</span>
                    </div>
                    <p className="text-sm text-text-secondary mb-4 line-clamp-2">{message.body}</p>
                    <div className="flex items-center justify-between gap-4 text-xs text-text-tertiary">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {recipientCount} {recipientCount === 1 ? 'recipient' : 'recipients'}
                        </span>
                        {typeof message.delivered_count === 'number' && typeof message.failed_count === 'number' && (
                          <span>{message.delivered_count} delivered · {message.failed_count} failed</span>
                        )}
                        {skippedCount > 0 && (
                          <span>{skippedCount} skipped</span>
                        )}
                        {unreachedCount > 0 && (
                          <span>{unreachedCount} unreached</span>
                        )}
                        {getCampaignTypeLabel(message) && (
                          <span className="px-2 py-0.5 bg-accent-light text-accent rounded border border-accent/20">
                            {getCampaignTypeLabel(message)}
                          </span>
                        )}
                        {message.status === 'scheduled' && isPastScheduledTime(message.scheduled_for) && (
                          <span className="px-2 py-0.5 bg-warning-light text-warning rounded border border-warning/20">
                            Due now
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-text-tertiary">
                          <Clock className="w-3 h-3" />
                          {message.status === 'scheduled' && message.scheduled_for
                            ? formatMessageHistoryDate(message.scheduled_for)
                            : message.sent_at
                            ? formatMessageHistoryDate(message.sent_at)
                            : 'Draft'}
                        </span>
                        {(message.delivered_count != null && message.delivered_count > 0) && (
                          <span className="flex items-center gap-1 text-success font-medium">
                            <CheckCircle size={10} />
                            {message.delivered_count} delivered
                          </span>
                        )}
                        {(message.failed_count != null && message.failed_count > 0) && (
                          <span className="flex items-center gap-1 text-error font-medium">
                            <AlertCircle size={10} />
                            {message.failed_count} failed
                          </span>
                        )}
                      </div>
                      <span className="text-primary text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        View →
                      </span>
                    </div>
                    </button>

                    {(message.status === 'scheduled' || message.status === 'failed' || message.status === 'partial') && (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-border-subtle pt-3">
                        {message.status === 'scheduled' && (
                          <>
                            <Button size="sm" variant="primary" onClick={() => void handleSendScheduledNow(message)} disabled={!canCompose}>
                              <Send className="w-3.5 h-3.5 mr-1.5" />Send now
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => {
                              loadMessageIntoComposer(message, 'edit');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }} disabled={!canCompose}>
                              <Calendar className="w-3.5 h-3.5 mr-1.5" />Reschedule
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => void handleCancelSchedule(message)} disabled={!canCompose}>
                              Move to draft
                            </Button>
                          </>
                        )}
                        {canRetryMessageStatus(message.status) && (
                          <Button size="sm" variant="outline" onClick={() => void handleRetry(message)} disabled={retryingMessageId === message.id || !canCompose}>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />{retryingMessageId === message.id ? 'Retrying…' : 'Retry'}
                          </Button>
                        )}
                        {message.status === 'partial' && (
                          <p className="text-xs text-text-tertiary max-w-xs">Partial campaigns stay review-only here so this control does not re-send guests who already got the message.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
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
