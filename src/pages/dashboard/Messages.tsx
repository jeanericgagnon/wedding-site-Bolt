import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { DashboardStateBlock } from '../../components/dashboard/DashboardStateBlock';
import { Card, Button, Input, Textarea } from '../../components/ui';
import { Send, Mail, Users, Clock, CheckCircle, Calendar, Save, AtSign, AlertCircle, Eye, ChevronDown, ChevronUp, RefreshCw, X, ArrowLeft, Loader2, Link2 } from 'lucide-react';
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

const BULK_SEND_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-bulk-message`;
const DEMO_MESSAGES_STORAGE_KEY = 'dayof.demo.messages.history';

// Optional table: can be missing in lean deployments.
// Default false to avoid noisy 404 probing on each page load.
let hasMessageDeliveriesTable: boolean | null = false;


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

async function triggerBulkSend(messageId: string): Promise<{ delivered: number; failed: number; total: number; status: string }> {
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
}


function isPastScheduledTime(scheduledFor: string | null): boolean {
  if (!scheduledFor) return false;
  return new Date(scheduledFor) < new Date();
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

interface MessageDetailModalProps {
  message: Message;
  deliveries: DeliveryRow[];
  onClose: () => void;
  onRetry: (message: Message) => Promise<void>;
  onLoadIntoComposer: (message: Message, mode: 'edit' | 'duplicate') => void;
}

const MessageDetailModal: React.FC<MessageDetailModalProps> = ({ message, deliveries, onClose, onRetry, onLoadIntoComposer }) => {
  const [retrying, setRetrying] = React.useState(false);
  const recipientCount = getRecipientCount(message);
  const audienceLabel = getAudienceLabel(message);

  const sentDate = message.sent_at
    ? new Date(message.sent_at).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
    : null;
  const scheduledDate = message.scheduled_for
    ? new Date(message.scheduled_for).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
    : null;
  const messageDeliveries = deliveries.filter((delivery) => delivery.message_id === message.id);
  const failedDeliveries = messageDeliveries.filter((delivery) => delivery.status === 'failed');
  const topFailureReasons = Array.from(
    failedDeliveries.reduce((map, delivery) => {
      const key = (delivery.error_message || 'Unknown provider error').trim();
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
            </div>
            <div>
              <p className="text-text-tertiary text-xs mb-1">Recipients</p>
              <p className="font-medium text-text-primary">{recipientCount} {recipientCount === 1 ? 'person' : 'people'}</p>
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
                          <p className="font-medium text-rose-900">{delivery.recipient_email || 'Unknown recipient'}</p>
                          <p className="mt-0.5 text-rose-700">{delivery.error_message || 'Delivery failed before the provider returned a clear reason.'}</p>
                        </div>
                        <span className="shrink-0 text-[11px] text-rose-600">{delivery.attempted_at ? new Date(delivery.attempted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Attempted'}</span>
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
            </div>
          </div>
        )}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border flex-shrink-0">
          <div className="flex flex-wrap gap-2">
            {(message.status === 'draft' || message.status === 'scheduled') && (
              <Button
                variant="outline"
                size="sm"
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
              onClick={() => {
                onLoadIntoComposer(message, 'duplicate');
                onClose();
              }}
            >
              Duplicate to composer
            </Button>
            {(message.status === 'failed' || message.status === 'partial') && (
              <Button
                variant="primary"
                size="sm"
                disabled={retrying}
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
                  : <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />{message.status === 'partial' ? 'Retry failed recipients' : 'Retry send'}</>
                }
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
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);
  const [showRecipientPreview, setShowRecipientPreview] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [viewingMessage, setViewingMessage] = useState<Message | null>(null);
  const [buyingPack, setBuyingPack] = useState<'sms_100' | 'sms_500' | 'sms_1000' | null>(null);
  const [smsExpiringSoon, setSmsExpiringSoon] = useState<number>(0);
  const [smsTransactions, setSmsTransactions] = useState<SmsCreditTransaction[]>([]);
  const [itineraryAudienceOptions, setItineraryAudienceOptions] = useState<AudienceOption[]>([]);
  const [eventGuestIds, setEventGuestIds] = useState<Record<string, Set<string>>>({});
  const [messagesRole, setMessagesRole] = useState<PlannerAccessRole>('owner');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'sent' | 'scheduled' | 'draft' | 'failed' | 'partial'>('all');
  const [historyChannelFilter, setHistoryChannelFilter] = useState<'all' | 'email' | 'sms'>('all');
  const [historyAudienceFilter, setHistoryAudienceFilter] = useState<string>('all');
  const [historySearch, setHistorySearch] = useState('');

  const [formData, setFormData] = useState({
    subject: '',
    body: '',
    audience: 'all',
    channel: 'email' as 'email' | 'sms',
    scheduleType: 'now',
    scheduleDate: '',
    scheduleTime: '',
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefillSubject = params.get('prefillSubject');
    const prefillBody = params.get('prefillBody');
    if (!prefillSubject && !prefillBody) return;

    setFormData((prev) => ({
      ...prev,
      subject: prefillSubject ?? prev.subject,
      body: prefillBody ?? prev.body,
    }));
  }, [location.search]);

  useEffect(() => {
    if (!weddingSite?.id) return;
    try {
      const raw = readPlannerAccessRole('messages', weddingSite.id);
      if (raw) setMessagesRole(raw);
    } catch {}
  }, [weddingSite?.id]);

  useEffect(() => {
    if (!weddingSite?.id) return;
    writePlannerAccessRole('messages', weddingSite?.id ?? null, messagesRole);
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

    const { data, error } = await supabase
      .from('wedding_sites')
      .select('id, couple_first_name, couple_second_name, couple_email, sms_credits_balance')
      .eq('id', (await resolveActiveSiteForUser(user.id))?.id ?? '')
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
  }, [weddingSite, isDemoMode]);

  const fetchDeliveries = useCallback(async () => {
    if (!weddingSite) return;
    if (isDemoMode) {
      setDeliveries([]);
      return;
    }

    const messageIds = messages.slice(0, 50).map((m) => m.id);
    if (messageIds.length === 0 || hasMessageDeliveriesTable === false) {
      setDeliveries([]);
      return;
    }

    const { data, error } = await supabase
      .from('message_deliveries')
      .select('id, message_id, status, provider_message_id, error_message, attempted_at, delivered_at, recipient_email')
      .in('message_id', messageIds);

    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('message_deliveries') || msg.includes('does not exist') || msg.includes('404')) {
        hasMessageDeliveriesTable = false;
      }
      setDeliveries([]);
      return;
    }

    hasMessageDeliveriesTable = true;
    setDeliveries((data as DeliveryRow[]) || []);
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
        label: `${e.event_name}${e.event_date ? ` — ${new Date(e.event_date).toLocaleDateString()}` : ''}`,
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

    const { data: events } = await supabase
      .from('itinerary_events')
      .select('id, event_name, event_date')
      .eq('wedding_site_id', weddingSite.id)
      .order('event_date', { ascending: true });

    if (!events || events.length === 0) {
      setItineraryAudienceOptions([]);
      setEventGuestIds({});
      return;
    }

    const eventIds = events.map((e: any) => e.id);
    const { data: invites } = await supabase
      .from('event_invitations')
      .select('event_id, guest_id')
      .in('event_id', eventIds);

    const map: Record<string, Set<string>> = {};
    for (const e of events as any[]) map[e.id] = new Set<string>();
    for (const row of (invites ?? []) as any[]) {
      if (!map[row.event_id]) map[row.event_id] = new Set<string>();
      map[row.event_id].add(row.guest_id);
    }
    setEventGuestIds(map);

    const options: AudienceOption[] = (events as any[]).map((e) => ({
      value: `event:${e.id}`,
      label: `${e.event_name}${e.event_date ? ` — ${new Date(e.event_date).toLocaleDateString()}` : ''}`,
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
  }, [weddingSite, isDemoMode]);

  useEffect(() => { fetchWeddingSite(); }, [fetchWeddingSite]);
  useEffect(() => {
    if (weddingSite) { fetchMessages(); fetchGuests(); fetchSmsExpiryPreview(); fetchItinerarySegments(); }
  }, [weddingSite, fetchMessages, fetchGuests, fetchSmsExpiryPreview, fetchItinerarySegments]);

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
    const couple = [weddingSite?.couple_first_name, weddingSite?.couple_second_name].filter(Boolean).join(' & ') || 'our wedding';
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

  const handleSendMessage = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault();
    if (!weddingSite) return;
    setSending(true);
    try {
      const recipients = getRecipients(formData.audience);
      const recipientCount = formData.channel === 'sms'
        ? recipients.filter(g => g.phone).length
        : recipients.filter(g => g.email).length;

      if (recipientCount === 0 && !saveAsDraft) {
        toast(formData.channel === 'sms'
          ? 'No recipients have phone numbers. Add phone numbers to your guests first.'
          : 'No recipients have email addresses. Add email addresses to your guests first.', 'error');
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

      const isScheduled = !saveAsDraft && formData.scheduleType === 'later' && formData.scheduleDate && formData.scheduleTime;
      const isSendNow = !saveAsDraft && !isScheduled;

      const status = saveAsDraft ? 'draft' : isScheduled ? 'scheduled' : 'queued';
      const scheduledFor = isScheduled ? `${formData.scheduleDate}T${formData.scheduleTime}:00` : null;
      const normalizedSubject = formData.channel === 'sms'
        ? (formData.subject.trim() || `SMS • ${selectedAudience?.label ?? 'All guests'}`)
        : formData.subject;

      let inserted: { id: string } | null = null;

      if (isDemoMode) {
        inserted = { id: `demo-msg-${Date.now()}` };
        const demoMessage: Message = {
          id: inserted.id,
          subject: normalizedSubject,
          body: formData.body,
          sent_at: status === 'queued' ? new Date().toISOString() : null,
          scheduled_for: scheduledFor,
          status: status === 'queued' ? 'sent' : status,
          channel: formData.channel,
          audience_filter: formData.audience,
          recipient_filter: { audience: formData.audience, recipient_count: recipientCount },
          recipient_count: recipientCount,
          delivered_count: status === 'queued' ? recipientCount : 0,
          failed_count: 0,
        };
        setMessages(prev => [demoMessage, ...prev]);
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
            recipient_count: recipientCount,
            recipient_filter: { audience: formData.audience, audience_label: selectedAudience?.label ?? null, recipient_count: recipientCount },
          })
          .eq('id', inserted.id);
      }

      setShowRecipientPreview(false);
      setFormData({ subject: '', body: '', audience: 'all', channel: formData.channel, scheduleType: 'now', scheduleDate: '', scheduleTime: '' });

      if (saveAsDraft) {
        toast('Saved as draft', 'info');
        await fetchMessages();
        return;
      }

      if (isScheduled) {
        toast(`Scheduled for ${new Date(scheduledFor!).toLocaleString()} — ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}`, 'info');
        await fetchMessages();
        return;
      }

      if (isSendNow && inserted?.id) {
        if (isDemoMode) {
          toast(`Delivered to ${recipientCount} guest${recipientCount !== 1 ? 's' : ''} (demo)`, 'success');
          return;
        }


        toast(`Sending to ${recipientCount} guest${recipientCount !== 1 ? 's' : ''}…`, 'info');
        await fetchMessages();
        try {
          const result = await triggerBulkSend(inserted.id);
          if (result.failed === 0) {
            toast(`Delivered to ${result.delivered} guest${result.delivered !== 1 ? 's' : ''}`, 'success');
          } else if (result.delivered === 0) {
            toast(`Delivery failed for all ${result.failed} recipient${result.failed !== 1 ? 's' : ''}. Check message history.`, 'error');
          } else {
            toast(`Sent to ${result.delivered}, failed for ${result.failed}. Check message history.`, 'info');
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
    const scheduledAt = message.scheduled_for ? new Date(message.scheduled_for) : null;
    const scheduleDate = scheduledAt ? `${scheduledAt.getFullYear()}-${String(scheduledAt.getMonth() + 1).padStart(2, '0')}-${String(scheduledAt.getDate()).padStart(2, '0')}` : '';
    const scheduleTime = scheduledAt ? `${String(scheduledAt.getHours()).padStart(2, '0')}:${String(scheduledAt.getMinutes()).padStart(2, '0')}` : '';

    setFormData({
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

  async function handleRetry(message: Message) {
    setRetryingMessageId(message.id);
    try {
      const { error } = await supabase
        .from('messages')
        .update({ status: 'queued', sent_at: null, failed_count: 0, delivered_count: 0 })
        .eq('id', message.id);
      if (error) throw error;
      toast('Retrying delivery…', 'info');
      await fetchMessages();
      try {
        const result = await triggerBulkSend(message.id);
        if (result.failed === 0) {
          toast(`Delivered to ${result.delivered} guest${result.delivered !== 1 ? 's' : ''}`, 'success');
        } else {
          toast(`Sent: ${result.delivered}, failed: ${result.failed}`, result.delivered === 0 ? 'error' : 'info');
        }
      } catch (sendErr) {
        toast(sendErr instanceof Error ? sendErr.message : 'Delivery failed. Try again later.', 'error');
      }
      await fetchMessages();
    } catch {
      toast('Couldn’t retry that message right now. Please try again.', 'error');
    } finally {
      setRetryingMessageId(null);
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

  const applySaveTheDatePreset = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');

    setFormData((prev) => ({
      ...prev,
      channel: 'email',
      audience: 'all',
      scheduleType: 'later',
      scheduleDate: `${yyyy}-${mm}-${dd}`,
      scheduleTime: '10:00',
      subject: applyTemplateVariables('Save the Date!'),
      body: applyTemplateVariables('We are thrilled to invite you to our wedding! Please mark your calendars for [DATE] at [VENUE]. Formal invitation to follow.'),
    }));
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
      recipient_filter: { audience: 'all', campaignType: 'save-the-date' },
      scheduled_for: tomorrow.toISOString(),
      status: 'scheduled',
    };

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
          recipient_filter: payload.recipient_filter,
          scheduled_for: payload.scheduled_for,
          status: 'scheduled',
          delivered_count: 0,
          failed_count: 0,
          created_at: new Date().toISOString(),
        } as Message;
        setMessages((prev) => [demoMessage, ...prev]);
      } else {
        const { error } = await supabase.from('messages').insert(payload);
        if (error) throw error;
        await fetchMessages();
      }

      toast('Save-the-date campaign scheduled for tomorrow at 10:00.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not create save-the-date campaign.', 'error');
    }
  };

  const applyEventReminderDraft = () => {
    const draft = buildEventReminderDraft({
      audienceLabel: selectedAudience?.label ?? null,
      eventLabel: selectedAudience?.value === 'ceremony_only' ? 'ceremony' : selectedAudience?.value === 'reception_only' ? 'reception' : selectedAudience?.value === 'all' ? 'the celebration' : 'this event',
      venue: weddingSite?.venue_name ?? null,
    });
    setFormData((prev) => ({
      ...prev,
      subject: applyTemplateVariables(draft.subject),
      body: applyTemplateVariables(draft.body),
      channel: 'email',
      scheduleType: 'now',
      scheduleDate: '',
      scheduleTime: '',
    }));
    toast('Event reminder draft loaded.', 'info');
  };

  const applyDayOfDraft = () => {
    const draft = buildDayOfUpdateDraft({
      venue: weddingSite?.venue_name ?? null,
      weddingDate: weddingSite?.wedding_date ?? null,
      audienceLabel: selectedAudience?.label ?? null,
    });
    setFormData((prev) => ({
      ...prev,
      channel: 'sms',
      scheduleType: 'now',
      scheduleDate: '',
      scheduleTime: '',
      subject: applyTemplateVariables(draft.subject),
      body: applyTemplateVariables(draft.body),
    }));
    toast('Day-of update draft loaded.', 'info');
  };

  const applyDayOfAlertPreset = () => {
    applyDayOfDraft();
  };
  const recipientsWithEmail = getRecipients(formData.audience).filter(g => g.email).length;
  const recipientsWithPhone = getRecipients(formData.audience).filter(g => g.phone).length;
  const activeRecipients = formData.channel === 'sms' ? recipientsWithPhone : recipientsWithEmail;
  const previewRecipients = getRecipients(formData.audience).filter((guest) => formData.channel === 'sms' ? !!guest.phone : !!guest.email);
  const unreachableRecipients = (selectedAudience?.count ?? 0) - activeRecipients;
  const smsCredits = weddingSite?.sms_credits_balance ?? 0;
  const smsCreditsNeeded = recipientsWithPhone;
  const smsCreditsSufficient = smsCredits >= smsCreditsNeeded;

  const deliveryStats = useMemo(() => {
    const sentish = messages.filter((m) => ['sent', 'partial', 'failed'].includes(m.status));
    const delivered = sentish.reduce((sum, m) => sum + (m.delivered_count ?? 0), 0);
    const failed = sentish.reduce((sum, m) => sum + (m.failed_count ?? 0), 0);
    const targeted = sentish.reduce((sum, m) => sum + getRecipientCount(m), 0);
    const rate = targeted > 0 ? Math.round((delivered / targeted) * 100) : 0;
    return { delivered, failed, targeted, rate, scheduled: messages.filter((m) => m.status === 'scheduled').length };
  }, [messages]);

  const canCompose = canComposeDashboardMessages(messagesRole);

  const filteredHistory = useMemo(() => messages.filter((m) => {
    if (historyStatusFilter !== 'all' && m.status !== historyStatusFilter) return false;
    if (historyChannelFilter !== 'all' && m.channel !== historyChannelFilter) return false;
    const aud = m.audience_filter ?? (m.recipient_filter?.audience as string) ?? 'all';
    if (historyAudienceFilter !== 'all' && aud !== historyAudienceFilter) return false;
    const query = historySearch.trim().toLowerCase();
    if (query) {
      const haystack = [m.subject, m.body, aud, m.channel, m.status].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  }), [messages, historyStatusFilter, historyChannelFilter, historyAudienceFilter, historySearch]);

  const audienceBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    messages.forEach((m) => {
      const key = getAudienceLabel(m);
      map.set(key, (map.get(key) ?? 0) + getRecipientCount(m));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [messages]);

  const retryCandidates = useMemo(
    () => messages.filter((m) => m.status === 'failed' || m.status === 'partial').slice(0, 5),
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
      init[ch].targeted += getRecipientCount(m);
    });
    return init;
  }, [messages]);

  const deliveryHealth = useMemo(() => {
    const delivered = messages.reduce((sum, m) => sum + (m.delivered_count ?? 0), 0);
    const failed = messages.reduce((sum, m) => sum + (m.failed_count ?? 0), 0);
    const targeted = messages.reduce((sum, m) => sum + getRecipientCount(m), 0);
    const successRate = targeted > 0 ? Math.round((delivered / targeted) * 100) : 0;
    const failRate = targeted > 0 ? Math.round((failed / targeted) * 100) : 0;
    const overdueScheduled = messages.filter((m) => m.status === 'scheduled' && isPastScheduledTime(m.scheduled_for)).length;
    const retryBacklog = messages.filter((m) => m.status === 'failed' || m.status === 'partial').length;
    return { successRate, failRate, overdueScheduled, retryBacklog };
  }, [messages]);

  const providerTelemetry = useMemo(() => {
    const attempted = deliveries.filter((d) => d.status === 'sent' || d.status === 'failed');
    const sent = deliveries.filter((d) => d.status === 'sent').length;
    const failed = deliveries.filter((d) => d.status === 'failed').length;
    const withProviderId = deliveries.filter((d) => !!d.provider_message_id).length;
    const errorTop = Array.from(
      deliveries
        .filter((d) => d.status === 'failed' && d.error_message)
        .reduce((map, d) => {
          const key = (d.error_message || 'Unknown').slice(0, 60);
          map.set(key, (map.get(key) ?? 0) + 1);
          return map;
        }, new Map<string, number>())
        .entries(),
    ).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const sentRate = attempted.length > 0 ? Math.round((sent / attempted.length) * 100) : 0;
    return { attempted: attempted.length, sent, failed, withProviderId, sentRate, errorTop };
  }, [deliveries]);

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
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Recipients</p>
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
            <div>
              <label className="block text-xs text-text-tertiary mb-1">Access view</label>
              <select
                value={messagesRole}
                onChange={(e) => setMessagesRole(e.target.value as PlannerAccessRole)}
                className="px-3 py-2 text-sm bg-surface border border-border rounded-lg text-text-primary"
              >
                <option value="owner">Couple owner</option>
                <option value="planner">Planner</option>
                <option value="coordinator">Coordinator</option>
                <option value="viewer">Read only</option>
              </select>
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
                        <p className="text-text-tertiary">{new Date(tx.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className={`${tx.credits_delta >= 0 ? 'text-success' : 'text-error'} font-medium`}>{tx.credits_delta >= 0 ? '+' : ''}{tx.credits_delta} credits</p>
                        {tx.expires_at && tx.reason === 'purchase' && <p className="text-text-tertiary">Expires {new Date(tx.expires_at).toLocaleDateString()}</p>}
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

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    disabled={sending || activeRecipients === 0}
                  >
                    {sending ? 'Processing...' : (
                      formData.scheduleType === 'later' ? (
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
                    <p className="text-2xl font-bold text-text-primary">{guests.filter(g => g.email).length}</p>
                    <p className="text-sm text-text-secondary">With Email</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent-light rounded-lg">
                    <Mail className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">
                      {messages.filter(m => m.status === 'sent' || m.status === 'queued').length}
                    </p>
                    <p className="text-sm text-text-secondary">Sent / Queued</p>
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
                      action: () => {
                        setFormData((prev) => ({
                          ...prev,
                          subject: applyTemplateVariables('Share your photos with us 📸'),
                          body: applyTemplateVariables('We made a photo upload link so everyone can share their favorite moments from the event. Upload here: [PHOTO LINK]'),
                        }));
                      },
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
                  { label: 'Save the Date', detail: 'Early excitement and initial heads-up', subject: 'Save the Date!', body: 'We are thrilled to invite you to our wedding! Please mark your calendars for [DATE] at [VENUE]. Formal invitation to follow.' },
                  { label: 'RSVP Reminder', detail: 'Nudge people who still have not replied', subject: 'RSVP Reminder', body: 'We hope you can join us for our special day! Please RSVP by [DATE] so we can finalize our guest count. Visit [RSVP LINK] to respond.' },
                  { label: 'Week-Of Details', detail: 'Useful logistics right before the event', subject: 'Wedding Week Details', body: 'The big day is almost here! Here are some important details for the wedding week: [ADD DETAILS]' },
                  { label: 'Photo Upload Request', detail: 'Drive guests into your upload flow', subject: 'Share your photos with us 📸', body: 'We made a photo upload link so everyone can share their favorite moments from the event. Upload here: [PHOTO LINK]' },
                  { label: 'Photo Upload Reminder', detail: 'One more ask for missing photos', subject: 'Last call for wedding photos', body: 'If you snapped any photos, we would love to see them. Add yours here: [PHOTO LINK]' },
                  { label: 'Photo + RSVP Combo', detail: 'Handle both asks in one touchpoint', subject: 'Quick wedding update', body: 'Hi! RSVP here: [RSVP LINK]\n\nAnd if you have photos from our events, upload here: [PHOTO LINK]' },
                  { label: 'Thank You', detail: 'Close the loop after the celebration', subject: 'Thank You!', body: 'Thank you so much for celebrating our special day with us! Your presence meant the world to us. We are grateful for your love and support.' },
                ].map(tpl => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => setFormData({ ...formData, subject: applyTemplateVariables(tpl.subject), body: applyTemplateVariables(tpl.body) })}
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
            </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <button type="button" onClick={() => { setHistoryStatusFilter('failed'); setHistoryChannelFilter('all'); }} className="text-[11px] px-3 py-1.5 rounded-full border border-border-subtle bg-surface-subtle/30 text-text-secondary hover:border-primary/40 hover:text-primary">Show failed</button>
            <button type="button" onClick={() => { setHistoryStatusFilter('scheduled'); setHistoryChannelFilter('all'); }} className="text-[11px] px-3 py-1.5 rounded-full border border-border-subtle bg-surface-subtle/30 text-text-secondary hover:border-primary/40 hover:text-primary">Show scheduled</button>
            <button type="button" onClick={() => { setHistoryStatusFilter('all'); setHistoryChannelFilter('sms'); }} className="text-[11px] px-3 py-1.5 rounded-full border border-border-subtle bg-surface-subtle/30 text-text-secondary hover:border-primary/40 hover:text-primary">SMS only</button>
            <button type="button" onClick={() => { setHistoryStatusFilter('all'); setHistoryChannelFilter('email'); }} className="text-[11px] px-3 py-1.5 rounded-full border border-border-subtle bg-surface-subtle/30 text-text-secondary hover:border-primary/40 hover:text-primary">Email only</button>
            <button type="button" onClick={() => { setHistoryStatusFilter('all'); setHistoryChannelFilter('all'); setHistoryAudienceFilter('all'); setHistorySearch(''); }} className="text-[11px] px-3 py-1.5 rounded-full border border-border-subtle bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Reset filters</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            {[
              ['Sent', historyStatusCounts.sent],
              ['Scheduled', historyStatusCounts.scheduled],
              ['Partial', historyStatusCounts.partial],
              ['Failed', historyStatusCounts.failed],
              ['Drafts', historyStatusCounts.draft],
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
                label: 'Failure rate',
                value: `${deliveryHealth.failRate}%`,
                tone: deliveryHealth.failRate > 0 ? 'text-error' : 'text-text-primary',
                detail: 'Messages that still failed',
              },
              {
                label: 'Past-due scheduled',
                value: deliveryHealth.overdueScheduled,
                tone: deliveryHealth.overdueScheduled > 0 ? 'text-warning' : 'text-text-primary',
                detail: 'Scheduled items needing attention',
              },
              {
                label: 'Still needs retry',
                value: deliveryHealth.retryBacklog,
                tone: deliveryHealth.retryBacklog > 0 ? 'text-warning' : 'text-text-primary',
                detail: 'Failed sends you may want to rerun',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-border-subtle bg-white px-3 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                <p className="text-[11px] uppercase tracking-[0.2em] text-text-tertiary">{item.label}</p>
                <p className={`mt-2 text-lg font-semibold ${item.tone}`}>{item.value}</p>
                <p className="mt-1 text-[11px] text-text-tertiary">{item.detail}</p>
              </div>
            ))}
          </div>


          {retryCandidates.length > 0 && (
            <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4 mb-4">
              <div className="flex items-center justify-between mb-3 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary">Retry queue</p>
                  <p className="mt-1 text-sm font-medium text-text-primary">Needs another try</p>
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
                    <button
                      onClick={() => void handleRetry(m)}
                      disabled={retryingMessageId !== null}
                      className="text-xs px-2 py-1 rounded border border-border bg-white text-text-secondary disabled:opacity-50"
                    >
                      {retryingMessageId === m.id ? 'Retrying…' : 'Retry'}
                    </button>
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
                return (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() => setViewingMessage(message)}
                    className="w-full text-left rounded-[24px] border border-border-subtle bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.05)] hover:border-primary/30 hover:shadow-[0_10px_32px_rgba(15,23,42,0.08)] transition-all group"
                  >
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
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
                        {getCampaignTypeLabel(message) && (
                          <span className="px-2 py-0.5 bg-accent-light text-accent rounded border border-accent/20">
                            {getCampaignTypeLabel(message)}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-text-tertiary">
                          <Clock className="w-3 h-3" />
                          {message.status === 'scheduled' && message.scheduled_for
                            ? new Date(message.scheduled_for).toLocaleDateString()
                            : message.sent_at
                            ? new Date(message.sent_at).toLocaleDateString()
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
          onClose={() => setViewingMessage(null)}
          onRetry={handleRetry}
          onLoadIntoComposer={loadMessageIntoComposer}
        />
      )}

      <ToastList toasts={toasts} />
    </DashboardLayout>
  );
};
