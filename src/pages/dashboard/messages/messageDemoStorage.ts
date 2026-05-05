import type { Message } from './messageDashboardTypes';

export const DEMO_MESSAGES_STORAGE_KEY = 'dayof.demo.messages.history';
export const RSVP_CONTINUITY_EVENT = 'dayof:rsvp-updated';
export const RSVP_CONTINUITY_STORAGE_KEY = 'dayof.rsvp.updatedAt';

export function buildDemoMessageSeed(now = Date.now()): Message[] {
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

export function readDemoMessages(): Message[] {
  try {
    const raw = localStorage.getItem(DEMO_MESSAGES_STORAGE_KEY);
    if (!raw) return buildDemoMessageSeed();
    const parsed = JSON.parse(raw) as Message[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : buildDemoMessageSeed();
  } catch {
    return buildDemoMessageSeed();
  }
}

export function writeDemoMessages(items: Message[]): void {
  try {
    localStorage.setItem(DEMO_MESSAGES_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}
