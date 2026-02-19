import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, Button, Input, Textarea } from '../../components/ui';
import { Send, Mail, Users, Clock, CheckCircle, Calendar, Save, AtSign, AlertCircle, Eye, ChevronDown, ChevronUp, RefreshCw, X, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

const BULK_SEND_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-bulk-message`;

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
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
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

interface MessageDetailModalProps {
  message: Message;
  onClose: () => void;
  onRetry: (message: Message) => Promise<void>;
}

const MessageDetailModal: React.FC<MessageDetailModalProps> = ({ message, onClose, onRetry }) => {
  const [retrying, setRetrying] = React.useState(false);
  const recipientCount = getRecipientCount(message);
  const audienceLabel = getAudienceLabel(message);

  const sentDate = message.sent_at
    ? new Date(message.sent_at).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
    : null;
  const scheduledDate = message.scheduled_for
    ? new Date(message.scheduled_for).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
    : null;

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

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="prose prose-sm max-w-none">
            <div className="bg-surface-subtle rounded-xl border border-border p-5">
              <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-3">Message body</p>
              <div className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {message.body}
              </div>
            </div>
          </div>
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
          {(message.status === 'failed' || message.status === 'partial') ? (
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
          ) : (
            <span />
          )}
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export const DashboardMessages: React.FC = () => {
  const { user } = useAuth();
  const [weddingSite, setWeddingSite] = useState<WeddingSite | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showRecipientPreview, setShowRecipientPreview] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [viewingMessage, setViewingMessage] = useState<Message | null>(null);

  const [formData, setFormData] = useState({
    subject: '',
    body: '',
    audience: 'all',
    scheduleType: 'now',
    scheduleDate: '',
    scheduleTime: '',
  });

  function toast(message: string, type: Toast['type'] = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }

  const fetchWeddingSite = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('wedding_sites')
      .select('id, couple_first_name, couple_second_name, couple_email')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) setWeddingSite(data);
  }, [user]);

  const fetchMessages = useCallback(async () => {
    if (!weddingSite) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('wedding_site_id', weddingSite.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMessages(data || []);
    } catch {
      toast('Failed to load message history', 'error');
    } finally {
      setLoading(false);
    }
  }, [weddingSite]);

  const fetchGuests = useCallback(async () => {
    if (!weddingSite) return;
    const { data } = await supabase
      .from('guests')
      .select('id, email, rsvp_status, first_name, last_name, name')
      .eq('wedding_site_id', weddingSite.id);
    setGuests(data || []);
  }, [weddingSite]);

  useEffect(() => { fetchWeddingSite(); }, [fetchWeddingSite]);
  useEffect(() => {
    if (weddingSite) { fetchMessages(); fetchGuests(); }
  }, [weddingSite, fetchMessages, fetchGuests]);

  const getRecipients = (audience: string): Guest[] => {
    switch (audience) {
      case 'attending': return guests.filter(g => g.rsvp_status === 'confirmed');
      case 'not_responded': return guests.filter(g => g.rsvp_status === 'pending');
      case 'declined': return guests.filter(g => g.rsvp_status === 'declined');
      default: return guests;
    }
  };

  const handleSendMessage = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault();
    if (!weddingSite) return;
    setSending(true);
    try {
      const recipients = getRecipients(formData.audience);
      const recipientCount = recipients.filter(g => g.email).length;

      if (recipientCount === 0 && !saveAsDraft) {
        toast('No recipients have email addresses. Add email addresses to your guests first.', 'error');
        setSending(false);
        return;
      }

      const isScheduled = !saveAsDraft && formData.scheduleType === 'later' && formData.scheduleDate && formData.scheduleTime;
      const isSendNow = !saveAsDraft && !isScheduled;

      const status = saveAsDraft ? 'draft' : isScheduled ? 'scheduled' : 'queued';
      const scheduledFor = isScheduled ? `${formData.scheduleDate}T${formData.scheduleTime}:00` : null;

      const { data: inserted, error } = await supabase
        .from('messages')
        .insert([{
          wedding_site_id: weddingSite.id,
          subject: formData.subject,
          body: formData.body,
          channel: 'email',
          status,
          scheduled_for: scheduledFor,
          sent_at: null,
          audience_filter: formData.audience,
          recipient_count: recipientCount,
          recipient_filter: { audience: formData.audience, recipient_count: recipientCount },
        }])
        .select('id')
        .single();

      if (error) throw error;

      setShowRecipientPreview(false);
      setFormData({ subject: '', body: '', audience: 'all', scheduleType: 'now', scheduleDate: '', scheduleTime: '' });

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
    } catch {
      toast('Failed to process message. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  async function handleRetry(message: Message) {
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
      toast('Failed to retry message', 'error');
    }
  }

  const audienceOptions = [
    { value: 'all', label: 'All Guests', count: guests.length },
    { value: 'attending', label: 'Attending Only', count: guests.filter(g => g.rsvp_status === 'confirmed').length },
    { value: 'not_responded', label: 'Not Responded', count: guests.filter(g => g.rsvp_status === 'pending').length },
    { value: 'declined', label: 'Declined', count: guests.filter(g => g.rsvp_status === 'declined').length },
  ];

  const selectedAudience = audienceOptions.find(opt => opt.value === formData.audience);
  const recipientsWithEmail = getRecipients(formData.audience).filter(g => g.email).length;

  if (loading) {
    return (
      <DashboardLayout currentPage="messages">
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="messages">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-text-primary">Messages</h1>
          </div>
          <p className="text-text-secondary">Compose and send messages directly to your guests via email</p>
        </div>

        {weddingSite?.couple_email && (
          <Card variant="bordered" padding="lg">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-light rounded-lg">
                <AtSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Your Wedding Email</p>
                <p className="text-lg font-semibold text-text-primary">{weddingSite.couple_email}</p>
                <p className="text-xs text-text-tertiary mt-1">Messages will appear to come from this address</p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card variant="bordered" padding="lg">
              <h2 className="text-xl font-semibold text-text-primary mb-6">Compose Message</h2>
              <form onSubmit={(e) => handleSendMessage(e, false)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Select Audience</label>
                  <select
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
                  {recipientsWithEmail < (selectedAudience?.count || 0) && (
                    <p className="text-sm text-warning mt-1">
                      {recipientsWithEmail} of {selectedAudience?.count} guests have email addresses
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Subject <span className="text-error">*</span>
                  </label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g., Wedding Day Reminder"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Message <span className="text-error">*</span>
                  </label>
                  <Textarea
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder="Write your message here..."
                    rows={8}
                    required
                  />
                  <p className="text-sm text-text-tertiary mt-1">
                    Tip: Include important details like date, time, location, or dress code
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">When to Send</label>
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
                      Send Now
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
                            <span className="font-medium">Scheduled time is in the past.</span>
                            {' '}This message will be sent immediately when you click Schedule Message.
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

                <div className="border border-border rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowRecipientPreview(!showRecipientPreview)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-surface-subtle hover:bg-surface transition-colors text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-text-secondary" />
                      <span className="font-medium text-text-primary">
                        Preview recipients ({recipientsWithEmail} with email)
                      </span>
                    </div>
                    {showRecipientPreview ? <ChevronUp className="w-4 h-4 text-text-tertiary" /> : <ChevronDown className="w-4 h-4 text-text-tertiary" />}
                  </button>
                  {showRecipientPreview && (
                    <div className="border-t border-border max-h-48 overflow-y-auto">
                      {getRecipients(formData.audience).filter(g => g.email).length === 0 ? (
                        <div className="p-4 text-sm text-text-secondary text-center">No guests with email addresses in this audience.</div>
                      ) : (
                        <ul className="divide-y divide-border">
                          {getRecipients(formData.audience).filter(g => g.email).map(g => (
                            <li key={g.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                              <span className="text-text-primary font-medium">{g.first_name ?? ''} {g.last_name ?? ''}</span>
                              <span className="text-text-tertiary text-xs">{g.email}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-primary-light border border-primary/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-primary mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-text-primary">What happens next</p>
                      <p className="text-text-secondary mt-1">
                        {formData.scheduleType === 'later' && formData.scheduleDate && formData.scheduleTime
                          ? isPastScheduledTime(`${formData.scheduleDate}T${formData.scheduleTime}:00`)
                            ? `Will send immediately (scheduled time has passed) — ${recipientsWithEmail} recipient${recipientsWithEmail !== 1 ? 's' : ''}`
                            : `Scheduled for ${formatScheduledDate(`${formData.scheduleDate}T${formData.scheduleTime}:00`)} — ${recipientsWithEmail} recipient${recipientsWithEmail !== 1 ? 's' : ''}`
                          : `Email will be sent immediately to ${recipientsWithEmail} guest${recipientsWithEmail !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                </div>

                {recipientsWithEmail === 0 && !sending && formData.audience !== '' && (
                  <div className="flex items-center gap-2 p-3 bg-warning-light border border-warning/20 rounded-lg text-sm text-warning">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    No guests in this audience have email addresses. Add emails to guests before sending.
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    disabled={sending || recipientsWithEmail === 0}
                  >
                    {sending ? 'Processing...' : (
                      formData.scheduleType === 'later' ? (
                        <><Calendar className="w-4 h-4 mr-2" />Schedule Message</>
                      ) : (
                        <><Send className="w-4 h-4 mr-2" />Send Now</>
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
              </form>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card variant="bordered" padding="lg">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Quick Stats</h2>
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
              </div>
            </Card>

            <Card variant="bordered" padding="lg" className="mt-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Message Templates</h2>
              <div className="space-y-2">
                {[
                  { label: 'Save the Date', subject: 'Save the Date!', body: 'We are thrilled to invite you to our wedding! Please mark your calendars for [DATE] at [VENUE]. Formal invitation to follow.' },
                  { label: 'RSVP Reminder', subject: 'RSVP Reminder', body: 'We hope you can join us for our special day! Please RSVP by [DATE] so we can finalize our guest count. Visit [RSVP LINK] to respond.' },
                  { label: 'Week-Of Details', subject: 'Wedding Week Details', body: 'The big day is almost here! Here are some important details for the wedding week: [ADD DETAILS]' },
                  { label: 'Thank You', subject: 'Thank You!', body: 'Thank you so much for celebrating our special day with us! Your presence meant the world to us. We are grateful for your love and support.' },
                ].map(tpl => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => setFormData({ ...formData, subject: tpl.subject, body: tpl.body })}
                    className="w-full text-left px-3 py-2 text-sm bg-surface-subtle hover:bg-surface-raised rounded-lg transition-colors text-text-primary border border-transparent hover:border-border"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <Card variant="bordered" padding="lg">
          <h2 className="text-xl font-semibold text-text-primary mb-6">Message History</h2>
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
              <p className="text-text-secondary">No messages yet</p>
              <p className="text-sm text-text-tertiary mt-1">Compose your first message above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const recipientCount = getRecipientCount(message);
                return (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() => setViewingMessage(message)}
                    className="w-full text-left border border-border rounded-xl p-4 hover:bg-surface-subtle hover:border-primary/30 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors truncate">
                          {message.subject}
                        </h3>
                        {getStatusBadge(message)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-text-tertiary flex-shrink-0 ml-3">
                        <Clock className="w-3.5 h-3.5" />
                        {message.status === 'scheduled' && message.scheduled_for
                          ? new Date(message.scheduled_for).toLocaleDateString()
                          : message.sent_at
                          ? new Date(message.sent_at).toLocaleDateString()
                          : 'Draft'}
                      </div>
                    </div>
                    <p className="text-sm text-text-secondary mb-3 line-clamp-2">{message.body}</p>
                    <div className="flex items-center justify-between gap-4 text-xs text-text-tertiary">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {recipientCount} {recipientCount === 1 ? 'recipient' : 'recipients'}
                        </span>
                        <span className="px-2 py-0.5 bg-primary-light text-primary rounded border border-primary/20 capitalize">
                          {message.channel}
                        </span>
                        <span className="text-text-tertiary">{getAudienceLabel(message)}</span>
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
          onClose={() => setViewingMessage(null)}
          onRetry={handleRetry}
        />
      )}

      <ToastList toasts={toasts} />
    </DashboardLayout>
  );
};
