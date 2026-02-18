import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, Button, Input, Textarea } from '../../components/ui';
import { Send, Mail, Users, Clock, CheckCircle, Calendar, Save, AtSign, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface Message {
  id: string;
  subject: string;
  body: string;
  sent_at: string | null;
  scheduled_for: string | null;
  status: string;
  channel: string;
  recipient_filter: Record<string, unknown> | null;
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

export const DashboardMessages: React.FC = () => {
  const { user } = useAuth();
  const [weddingSite, setWeddingSite] = useState<WeddingSite | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

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

    if (data) {
      setWeddingSite(data);
    }
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

  useEffect(() => {
    fetchWeddingSite();
  }, [fetchWeddingSite]);

  useEffect(() => {
    if (weddingSite) {
      fetchMessages();
      fetchGuests();
    }
  }, [weddingSite, fetchMessages, fetchGuests]);

  const getRecipients = (audience: string): Guest[] => {
    switch (audience) {
      case 'attending':
        return guests.filter(g => g.rsvp_status === 'confirmed');
      case 'not_responded':
        return guests.filter(g => g.rsvp_status === 'pending');
      case 'declined':
        return guests.filter(g => g.rsvp_status === 'declined');
      case 'all':
      default:
        return guests;
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

      let status = 'sent';
      let scheduledFor = null;
      let sentAt = null;

      if (saveAsDraft) {
        status = 'draft';
      } else if (formData.scheduleType === 'later' && formData.scheduleDate && formData.scheduleTime) {
        status = 'scheduled';
        scheduledFor = `${formData.scheduleDate}T${formData.scheduleTime}:00`;
      } else {
        sentAt = new Date().toISOString();
      }

      const { error } = await supabase
        .from('messages')
        .insert([{
          wedding_site_id: weddingSite.id,
          subject: formData.subject,
          body: formData.body,
          channel: 'email',
          status,
          scheduled_for: scheduledFor,
          sent_at: sentAt,
          recipient_filter: {
            audience: formData.audience,
            recipient_count: recipientCount,
          },
        }]);

      if (error) throw error;

      if (saveAsDraft) {
        toast('Saved as draft', 'info');
      } else if (status === 'scheduled') {
        toast(`Scheduled for ${new Date(scheduledFor!).toLocaleString()}`, 'info');
      } else {
        toast(`Queued for ${recipientCount} guest${recipientCount !== 1 ? 's' : ''} — delivery within a few minutes`, 'success');
      }

      setFormData({
        subject: '',
        body: '',
        audience: 'all',
        scheduleType: 'now',
        scheduleDate: '',
        scheduleTime: '',
      });

      await fetchMessages();
    } catch {
      toast('Failed to process message. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  const audienceOptions = [
    { value: 'all', label: 'All Guests', count: guests.length },
    { value: 'attending', label: 'Attending Only', count: guests.filter(g => g.rsvp_status === 'confirmed').length },
    { value: 'not_responded', label: 'Not Responded', count: guests.filter(g => g.rsvp_status === 'pending').length },
    { value: 'declined', label: 'Declined', count: guests.filter(g => g.rsvp_status === 'declined').length },
  ];

  const selectedAudience = audienceOptions.find(opt => opt.value === formData.audience);
  const recipientsWithEmail = getRecipients(formData.audience).filter(g => g.email).length;

  const getStatusBadge = (message: Message) => {
    switch (message.status) {
      case 'draft':
        return <span className="px-2 py-1 bg-surface-subtle text-text-secondary rounded text-xs border border-border">Draft</span>;
      case 'scheduled':
        return <span className="px-2 py-1 bg-warning-light text-warning rounded text-xs border border-warning/20">Scheduled</span>;
      case 'sent':
        return <span className="px-2 py-1 bg-success-light text-success rounded text-xs border border-success/20">Sent</span>;
      case 'failed':
        return <span className="px-2 py-1 bg-error-light text-error rounded text-xs border border-error/20">Failed</span>;
      default:
        return null;
    }
  };

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
          <h1 className="text-3xl font-bold text-text-primary mb-2">Messages</h1>
          <p className="text-text-secondary">Send updates and reminders to your guests</p>
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
                <p className="text-xs text-text-tertiary mt-1">
                  Messages will appear to come from this address
                </p>
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
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Select Audience
                  </label>
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
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    When to Send
                  </label>
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
                    <div className="grid grid-cols-2 gap-4 p-4 bg-surface-subtle rounded-lg border border-border">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Date</label>
                        <Input
                          type="date"
                          value={formData.scheduleDate}
                          onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                          min={new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Time</label>
                        <Input
                          type="time"
                          value={formData.scheduleTime}
                          onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-primary-light border border-primary/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-primary mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-text-primary">Delivery summary</p>
                      <p className="text-text-secondary mt-1">
                        {formData.scheduleType === 'later' && formData.scheduleDate && formData.scheduleTime
                          ? `Queued for ${new Date(`${formData.scheduleDate}T${formData.scheduleTime}`).toLocaleString()}`
                          : `Will be queued immediately for ${recipientsWithEmail} guest${recipientsWithEmail !== 1 ? 's' : ''} with email addresses`}
                      </p>
                      <p className="text-text-tertiary mt-2 text-xs">
                        Emails are processed in the background and typically deliver within a few minutes.
                        Only guests with email addresses will receive this message.
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
                    {sending ? (
                      'Processing...'
                    ) : (
                      <>
                        {formData.scheduleType === 'later' ? (
                          <>
                            <Calendar className="w-4 h-4 mr-2" />
                            Schedule Message
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Send Now
                          </>
                        )}
                      </>
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
                    <p className="text-2xl font-bold text-text-primary">
                      {guests.filter(g => g.email).length}
                    </p>
                    <p className="text-sm text-text-secondary">With Email</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent-light rounded-lg">
                    <Mail className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{messages.filter(m => m.status === 'sent').length}</p>
                    <p className="text-sm text-text-secondary">Messages Sent</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card variant="bordered" padding="lg" className="mt-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Message Templates</h2>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    subject: 'Save the Date!',
                    body: 'We are thrilled to invite you to our wedding! Please mark your calendars for [DATE] at [VENUE]. Formal invitation to follow.',
                  })}
                  className="w-full text-left px-3 py-2 text-sm bg-surface-subtle hover:bg-surface-raised rounded-lg transition-colors text-text-primary border border-transparent hover:border-border"
                >
                  Save the Date
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    subject: 'RSVP Reminder',
                    body: 'We hope you can join us for our special day! Please RSVP by [DATE] so we can finalize our guest count. Visit [RSVP LINK] to respond.',
                  })}
                  className="w-full text-left px-3 py-2 text-sm bg-surface-subtle hover:bg-surface-raised rounded-lg transition-colors text-text-primary border border-transparent hover:border-border"
                >
                  RSVP Reminder
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    subject: 'Wedding Week Details',
                    body: 'The big day is almost here! Here are some important details for the wedding week: [ADD DETAILS]',
                  })}
                  className="w-full text-left px-3 py-2 text-sm bg-surface-subtle hover:bg-surface-raised rounded-lg transition-colors text-text-primary border border-transparent hover:border-border"
                >
                  Week-Of Details
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    subject: 'Thank You!',
                    body: 'Thank you so much for celebrating our special day with us! Your presence meant the world to us. We are grateful for your love and support.',
                  })}
                  className="w-full text-left px-3 py-2 text-sm bg-surface-subtle hover:bg-surface-raised rounded-lg transition-colors text-text-primary border border-transparent hover:border-border"
                >
                  Thank You
                </button>
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
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="border border-border rounded-lg p-4 hover:bg-surface-subtle transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-text-primary">{message.subject}</h3>
                      {getStatusBadge(message)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-tertiary">
                      <Clock className="w-4 h-4" />
                      {message.status === 'scheduled' && message.scheduled_for ? (
                        <span>Scheduled: {new Date(message.scheduled_for).toLocaleString()}</span>
                      ) : message.sent_at ? (
                        new Date(message.sent_at).toLocaleDateString()
                      ) : (
                        'Draft'
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary mb-3 line-clamp-2">{message.body}</p>
                  <div className="flex items-center gap-4 text-xs text-text-tertiary">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {(message.recipient_filter?.recipient_count as number) || 0} recipients
                    </span>
                    <span className="px-2 py-1 bg-primary-light text-primary rounded border border-primary/20">
                      {message.channel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <ToastList toasts={toasts} />
    </DashboardLayout>
  );
};
