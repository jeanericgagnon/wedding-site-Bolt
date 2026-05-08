import type { Message } from './messageDashboardTypes';

export const DEMO_MESSAGES_STORAGE_KEY = 'dayof.demo.messages.history';
export const RSVP_CONTINUITY_EVENT = 'dayof:rsvp-updated';
export const RSVP_CONTINUITY_STORAGE_KEY = 'dayof.rsvp.updatedAt';

export const DEMO_MESSAGES_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_DEMO_MESSAGES = 24;
const MAX_DEMO_MESSAGE_TEXT_LENGTH = 2000;
const MAX_DEMO_MESSAGE_SHORT_TEXT_LENGTH = 160;
const ALLOWED_DEMO_MESSAGE_STATUSES = new Set(['draft', 'queued', 'scheduled', 'sending', 'sent', 'partial', 'failed']);
const ALLOWED_DEMO_MESSAGE_CHANNELS = new Set(['email', 'sms']);

type DemoMessagesEnvelope = {
  savedAtISO: string;
  value: Message[];
};

function normalizeDemoMessageText(value: unknown, maxLength = MAX_DEMO_MESSAGE_TEXT_LENGTH): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeNullableISOText(value: unknown): string | null {
  const text = normalizeDemoMessageText(value, 40);
  return text || null;
}

function normalizeDemoCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : null;
}

function isDemoMessagesEnvelope(value: unknown): value is DemoMessagesEnvelope {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Partial<DemoMessagesEnvelope>;
  return typeof envelope.savedAtISO === 'string' && 'value' in envelope;
}

function isFreshDemoMessagesStorage(savedAtISO: string): boolean {
  const savedAt = Date.parse(savedAtISO);
  return Number.isFinite(savedAt) && Date.now() - savedAt <= DEMO_MESSAGES_RETENTION_MS;
}

function readDemoMessagesValue(): { value: unknown; shouldMigrate: boolean; hadStoredValue: boolean } {
  const raw = localStorage.getItem(DEMO_MESSAGES_STORAGE_KEY);
  if (!raw) return { value: [], shouldMigrate: false, hadStoredValue: false };

  const parsed = JSON.parse(raw) as unknown;
  if (isDemoMessagesEnvelope(parsed)) {
    if (!isFreshDemoMessagesStorage(parsed.savedAtISO)) {
      localStorage.removeItem(DEMO_MESSAGES_STORAGE_KEY);
      return { value: [], shouldMigrate: false, hadStoredValue: false };
    }
    return { value: parsed.value, shouldMigrate: false, hadStoredValue: true };
  }

  return { value: parsed, shouldMigrate: true, hadStoredValue: true };
}

function writeDemoMessagesEnvelope(items: Message[]): void {
  localStorage.setItem(DEMO_MESSAGES_STORAGE_KEY, JSON.stringify({
    savedAtISO: new Date().toISOString(),
    value: items,
  } satisfies DemoMessagesEnvelope));
}

function normalizeDemoRecipientFilter(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const filter = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  const audience = normalizeDemoMessageText(filter.audience, MAX_DEMO_MESSAGE_SHORT_TEXT_LENGTH);
  const recipientCount = normalizeDemoCount(filter.recipient_count);
  if (audience) normalized.audience = audience;
  if (recipientCount !== null) normalized.recipient_count = recipientCount;
  return Object.keys(normalized).length > 0 ? normalized : null;
}

function normalizeDemoMessage(value: unknown): Message | null {
  if (!value || typeof value !== 'object') return null;
  const message = value as Partial<Message>;
  const id = normalizeDemoMessageText(message.id, MAX_DEMO_MESSAGE_SHORT_TEXT_LENGTH);
  const subject = normalizeDemoMessageText(message.subject, MAX_DEMO_MESSAGE_SHORT_TEXT_LENGTH);
  const body = normalizeDemoMessageText(message.body);
  if (!id || !subject || !body) return null;

  const status = normalizeDemoMessageText(message.status, 40);
  const channel = normalizeDemoMessageText(message.channel, 20);
  const recipientCount = normalizeDemoCount(message.recipient_count);
  const deliveredCount = normalizeDemoCount(message.delivered_count);
  const failedCount = normalizeDemoCount(message.failed_count);

  return {
    id,
    subject,
    body,
    sent_at: normalizeNullableISOText(message.sent_at),
    scheduled_for: normalizeNullableISOText(message.scheduled_for),
    status: ALLOWED_DEMO_MESSAGE_STATUSES.has(status) ? status : 'draft',
    channel: ALLOWED_DEMO_MESSAGE_CHANNELS.has(channel) ? channel : 'email',
    recipient_filter: normalizeDemoRecipientFilter(message.recipient_filter),
    audience_filter: normalizeDemoMessageText(message.audience_filter, MAX_DEMO_MESSAGE_SHORT_TEXT_LENGTH) || null,
    recipient_count: recipientCount,
    delivered_count: deliveredCount,
    failed_count: failedCount,
  };
}

function normalizeDemoMessages(value: unknown): Message[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeDemoMessage)
    .filter((message): message is Message => message !== null)
    .slice(0, MAX_DEMO_MESSAGES);
}

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
    const stored = readDemoMessagesValue();
    const normalized = normalizeDemoMessages(stored.value);
    if (stored.shouldMigrate && normalized.length > 0) writeDemoMessagesEnvelope(normalized);
    if (stored.hadStoredValue && normalized.length === 0) localStorage.removeItem(DEMO_MESSAGES_STORAGE_KEY);
    return normalized.length > 0 ? normalized : buildDemoMessageSeed();
  } catch {
    try {
      localStorage.removeItem(DEMO_MESSAGES_STORAGE_KEY);
    } catch {}
    return buildDemoMessageSeed();
  }
}

export function writeDemoMessages(items: Message[]): void {
  try {
    writeDemoMessagesEnvelope(normalizeDemoMessages(items));
  } catch {}
}
