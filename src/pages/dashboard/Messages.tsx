import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, Button, Input, Textarea } from '../../components/ui';
import { Send, Mail, Users, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  id: string;
  subject: string;
  body: string;
  sent_at: string;
  channel: string;
  recipient_filter: any;
}

interface Guest {
  id: string;
  email: string | null;
  rsvp_status: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
}

export const DashboardMessages: React.FC = () => {
  const { user } = useAuth();
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    body: '',
    audience: 'all',
  });

  useEffect(() => {
    fetchWeddingSite();
  }, [user]);

  useEffect(() => {
    if (weddingSiteId) {
      fetchMessages();
      fetchGuests();
    }
  }, [weddingSiteId]);

  const fetchWeddingSite = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('wedding_sites')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setWeddingSiteId(data.id);
    }
  };

  const fetchMessages = async () => {
    if (!weddingSiteId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('wedding_site_id', weddingSiteId)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuests = async () => {
    if (!weddingSiteId) return;

    const { data } = await supabase
      .from('guests')
      .select('id, email, rsvp_status, first_name, last_name, name')
      .eq('wedding_site_id', weddingSiteId);

    setGuests(data || []);
  };

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weddingSiteId) return;

    setSending(true);

    try {
      const recipients = getRecipients(formData.audience);
      const recipientCount = recipients.filter(g => g.email).length;

      if (recipientCount === 0) {
        alert('No recipients have email addresses. Please add email addresses to your guests.');
        setSending(false);
        return;
      }

      const { error } = await supabase
        .from('messages')
        .insert([{
          wedding_site_id: weddingSiteId,
          subject: formData.subject,
          body: formData.body,
          channel: 'email',
          recipient_filter: {
            audience: formData.audience,
            recipient_count: recipientCount,
          },
        }]);

      if (error) throw error;

      alert(`Message logged successfully! Would be sent to ${recipientCount} guests.`);

      setFormData({
        subject: '',
        body: '',
        audience: 'all',
      });

      await fetchMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message');
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card variant="bordered" padding="lg">
              <h2 className="text-xl font-semibold mb-6">Compose Message</h2>
              <form onSubmit={handleSendMessage} className="space-y-6">
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

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900">Email Preview</p>
                      <p className="text-blue-700 mt-1">
                        This message will be sent to {recipientsWithEmail} guest{recipientsWithEmail !== 1 ? 's' : ''} via email
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={sending || recipientsWithEmail === 0}
                >
                  {sending ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message to {recipientsWithEmail} Guest{recipientsWithEmail !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
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
                    <p className="text-2xl font-bold">{messages.length}</p>
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
              <p className="text-gray-500">No messages sent yet</p>
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
                    <h3 className="font-semibold">{message.subject}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {new Date(message.sent_at).toLocaleDateString()}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{message.body}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {message.recipient_filter?.recipient_count || 0} recipients
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
