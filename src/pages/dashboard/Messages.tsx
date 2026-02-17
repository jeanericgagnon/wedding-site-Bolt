import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, Button, Input, Textarea } from '../../components/ui';
import { Send, Mail, Users, Clock, CheckCircle, Calendar, Save, AtSign } from 'lucide-react';
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

export const DashboardMessages: React.FC = () => {
  const { user } = useAuth();
  const [weddingSite, setWeddingSite] = useState<WeddingSite | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    body: '',
    audience: 'all',
    scheduleType: 'now',
    scheduleDate: '',
    scheduleTime: '',
  });

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
    } catch (err) {
      console.error('Error fetching messages:', err);
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
        alert('No recipients have email addresses. Please add email addresses to your guests.');
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

      const statusMessage = saveAsDraft
        ? 'Message saved as draft'
        : status === 'scheduled'
        ? `Message scheduled for ${new Date(scheduledFor!).toLocaleString()}`
        : `Message sent to ${recipientCount} guests`;

      alert(statusMessage);

      setFormData({
        subject: '',
        body: '',
        audience: 'all',
        scheduleType: 'now',
        scheduleDate: '',
        scheduleTime: '',
      });

      await fetchMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to process message');
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
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Draft</span>;
      case 'scheduled':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">Scheduled</span>;
      case 'sent':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Sent</span>;
      case 'failed':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Failed</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <DashboardLayout currentPage="messages">
        <div className="flex items-center justify-center h-64">
          <p>Loading messages...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="messages">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Messages</h1>
          <p className="text-gray-600">Send updates and reminders to your guests</p>
        </div>

        {weddingSite?.couple_email && (
          <Card variant="bordered" padding="lg">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-100 rounded-lg">
                <AtSign className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Your Wedding Email</p>
                <p className="text-lg font-semibold text-gray-900">{weddingSite.couple_email}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Messages will appear to come from this address
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card variant="bordered" padding="lg">
              <h2 className="text-xl font-semibold mb-6">Compose Message</h2>
              <form onSubmit={(e) => handleSendMessage(e, false)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Audience
                  </label>
                  <select
                    value={formData.audience}
                    onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {audienceOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.count} guests)
                      </option>
                    ))}
                  </select>
                  {recipientsWithEmail < (selectedAudience?.count || 0) && (
                    <p className="text-sm text-amber-600 mt-1">
                      {recipientsWithEmail} of {selectedAudience?.count} guests have email addresses
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Subject *
                  </label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g., Wedding Day Reminder"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Message *
                  </label>
                  <Textarea
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder="Write your message here..."
                    rows={8}
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Tip: Include important details like date, time, location, or dress code
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    When to Send
                  </label>
                  <div className="flex gap-4 mb-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, scheduleType: 'now' })}
                      className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                        formData.scheduleType === 'now'
                          ? 'bg-primary text-white hover:bg-primary-hover'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Send Now
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, scheduleType: 'later' })}
                      className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                        formData.scheduleType === 'later'
                          ? 'bg-primary text-white hover:bg-primary-hover'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Schedule
                    </button>
                  </div>

                  {formData.scheduleType === 'later' && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium mb-2">Date</label>
                        <Input
                          type="date"
                          value={formData.scheduleDate}
                          onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                          min={new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Time</label>
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

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900">Email Preview</p>
                      <p className="text-blue-700 mt-1">
                        {formData.scheduleType === 'later' && formData.scheduleDate && formData.scheduleTime
                          ? `This message will be sent on ${new Date(`${formData.scheduleDate}T${formData.scheduleTime}`).toLocaleString()}`
                          : `This message will be sent immediately to ${recipientsWithEmail} guest${recipientsWithEmail !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                </div>

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
              <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{guests.length}</p>
                    <p className="text-sm text-gray-600">Total Guests</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {guests.filter(g => g.email).length}
                    </p>
                    <p className="text-sm text-gray-600">With Email</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Mail className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{messages.filter(m => m.status === 'sent').length}</p>
                    <p className="text-sm text-gray-600">Messages Sent</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card variant="bordered" padding="lg" className="mt-6">
              <h2 className="text-lg font-semibold mb-4">Message Templates</h2>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    subject: 'Save the Date!',
                    body: 'We are thrilled to invite you to our wedding! Please mark your calendars for [DATE] at [VENUE]. Formal invitation to follow.',
                  })}
                  className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
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
                  className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
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
                  className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
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
                  className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Thank You
                </button>
              </div>
            </Card>
          </div>
        </div>

        <Card variant="bordered" padding="lg">
          <h2 className="text-xl font-semibold mb-6">Message History</h2>
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No messages yet</p>
              <p className="text-sm text-gray-400 mt-1">Compose your first message above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{message.subject}</h3>
                      {getStatusBadge(message)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
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
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{message.body}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {(message.recipient_filter?.recipient_count as number) || 0} recipients
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {message.channel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};
