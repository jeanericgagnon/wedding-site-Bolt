import { resolveActiveSiteForUser, type ActiveSiteSummary } from '../../../lib/activeSite';
import { mergeGuestsWithCanonicalMealChoices } from '../../../lib/messageGuestMealChoices';
import { supabase } from '../../../lib/supabase';
import { safeMessagesError } from './messageDashboardUtils';
import type {
  AudienceOption,
  DeliveryRow,
  Guest,
  Message,
  SmsCreditTransaction,
  WeddingSite,
  ChannelType,
} from './messageDashboardTypes';

export interface MessageInsertPayload {
  wedding_site_id: string;
  channel: ChannelType;
  subject: string;
  body: string;
  audience_filter: string;
  recipient_count: number;
  recipient_filter: Record<string, unknown>;
  scheduled_for: string | null;
  status: 'draft' | 'queued' | 'scheduled' | 'sending' | 'sent' | 'partial' | 'failed';
}

type MessageUpdatePayload = Omit<Partial<MessageInsertPayload>, 'status'> & {
  status?: string;
  sent_at?: string | null;
  delivered_count?: number | null;
  failed_count?: number | null;
  sending_started_at?: string | null;
  sending_finished_at?: string | null;
};

const MESSAGE_SELECT = [
  'id',
  'subject',
  'body',
  'sent_at',
  'scheduled_for',
  'status',
  'channel',
  'recipient_filter',
  'audience_filter',
  'recipient_count',
  'delivered_count',
  'failed_count',
].join(', ');

const DELIVERY_SELECT = [
  'id',
  'message_id',
  'status',
  'provider_message_id',
  'error_message',
  'attempted_at',
  'delivered_at',
  'recipient_email',
  'recipient_name',
].join(', ');

const GUEST_SELECT = [
  'id',
  'email',
  'phone',
  'sms_consent',
  'preferred_language',
  'rsvp_status',
  'invitation_sent_at',
  'reminder_last_sent_at',
  'mailing_address_line1',
  'mailing_city',
  'mailing_state',
  'mailing_postal_code',
  'meal_choice',
  'first_name',
  'last_name',
  'name',
].join(', ');

const WEDDING_SITE_SELECT = [
  'id',
  'site_slug',
  'default_language',
  'couple_first_name',
  'couple_second_name',
  'couple_email',
  'venue_name',
  'wedding_date',
  'sms_credits_balance',
].join(', ');

export const MAX_MESSAGE_DELIVERY_MESSAGE_IDS = 50;
export const MAX_MESSAGE_DELIVERY_ROWS = 1000;
export const MAX_MESSAGE_ITINERARY_EVENTS = 200;
export const MAX_MESSAGE_ITINERARY_EVENT_INVITATIONS = 10000;
export const MAX_DASHBOARD_MESSAGES = 1000;
export const MAX_MESSAGE_GUESTS = 5000;
export const MAX_SMS_CREDIT_TRANSACTIONS = 20;
const BULK_SEND_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-bulk-message`;

export async function getMessageAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
}

export async function triggerDashboardBulkSend(messageId: string): Promise<{
  delivered: number;
  failed: number;
  skipped?: number;
  total: number;
  status: string;
}> {
  const token = await getMessageAccessToken();
  const res = await fetch(BULK_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messageId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(safeMessagesError((body as { error?: unknown })?.error, 'Delivery needs review. Check message history.'));
  }
  return res.json();
}

export async function triggerScheduledMessageDispatch(limit = 10): Promise<{
  processed: number;
  sent: number;
  failed: number;
  partial: number;
  skippedMessages: number;
  skippedRecipients: number;
}> {
  const token = await getMessageAccessToken();
  const res = await fetch(BULK_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ processScheduled: true, limit }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(safeMessagesError((body as { error?: unknown })?.error, 'Couldn’t process scheduled messages right now.'));
  }
  return res.json();
}

export async function createDashboardMessage(payload: MessageInsertPayload): Promise<void> {
  const { error } = await supabase.rpc('dashboard_message_write', {
    p_wedding_site_id: payload.wedding_site_id,
    p_message_id: null,
    p_payload: payload,
  });
  if (error) throw error;
}

export async function insertDashboardMessageMinimal(payload: {
  wedding_site_id: string;
  subject: string;
  body: string;
  channel: ChannelType;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
}): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc('dashboard_message_write', {
    p_wedding_site_id: payload.wedding_site_id,
    p_message_id: null,
    p_payload: payload,
  });

  if (error) throw error;
  return { id: (data as { id: string }).id };
}

export async function updateDashboardMessage(messageId: string, patch: MessageUpdatePayload): Promise<void> {
  const { error } = await supabase.rpc('dashboard_message_write', {
    p_wedding_site_id: null,
    p_message_id: messageId,
    p_payload: patch,
  });

  if (error) throw error;
}

export async function loadDashboardMessages(weddingSiteId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('wedding_site_id', weddingSiteId)
    .order('created_at', { ascending: false })
    .limit(MAX_DASHBOARD_MESSAGES);

  if (error) throw error;
  return (data ?? []) as unknown as Message[];
}

export async function loadMessageGuests(weddingSiteId: string): Promise<Guest[]> {
  const { data, error } = await supabase
    .from('guests')
    .select(GUEST_SELECT)
    .eq('wedding_site_id', weddingSiteId)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })
    .limit(MAX_MESSAGE_GUESTS);

  if (error) throw error;
  const guests = (data ?? []) as unknown as Guest[];
  if (guests.length === 0) return guests;

  const guestIds = guests.map((guest) => guest.id).filter(Boolean).slice(0, MAX_MESSAGE_GUESTS);
  const { data: rsvps, error: rsvpError } = await supabase
    .from('rsvps')
    .select('guest_id, meal_choice')
    .in('guest_id', guestIds)
    .limit(MAX_MESSAGE_GUESTS);

  if (rsvpError) throw rsvpError;
  return mergeGuestsWithCanonicalMealChoices(guests, (rsvps ?? []) as Array<{ guest_id?: unknown; meal_choice?: unknown }>);
}

export async function loadMessageDeliveries(messageIds: string[]): Promise<DeliveryRow[]> {
  if (messageIds.length === 0) return [];
  const scopedMessageIds = Array.from(new Set(messageIds)).slice(0, MAX_MESSAGE_DELIVERY_MESSAGE_IDS);
  const { data, error } = await supabase
    .from('message_deliveries')
    .select(DELIVERY_SELECT)
    .in('message_id', scopedMessageIds)
    .order('created_at', { ascending: false })
    .limit(MAX_MESSAGE_DELIVERY_ROWS);

  if (error) throw error;
  return (data ?? []) as unknown as DeliveryRow[];
}

export function isMissingMessageDeliveriesTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const message = String((error as { message?: unknown }).message ?? '').toLowerCase();
  return message.includes('message_deliveries')
    && (message.includes('does not exist') || message.includes('relation') || message.includes('404'));
}

export async function loadMessageItineraryAudience(weddingSiteId: string): Promise<{
  options: AudienceOption[];
  guestIdsByEvent: Record<string, Set<string>>;
}> {
  const { data: events, error: eventsError } = await supabase
    .from('itinerary_events')
    .select('id, event_name, event_date')
    .eq('wedding_site_id', weddingSiteId)
    .eq('is_visible', true)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(MAX_MESSAGE_ITINERARY_EVENTS);

  if (eventsError) throw eventsError;

  const eventIds = (events ?? []).map((event) => String((event as { id: string }).id));
  const guestIdsByEvent: Record<string, Set<string>> = {};
  if (eventIds.length > 0) {
    const { data: invitations, error: invitesError } = await supabase
      .from('event_invitations')
      .select('event_id, guest_id')
      .in('event_id', eventIds)
      .limit(MAX_MESSAGE_ITINERARY_EVENT_INVITATIONS);

    if (invitesError) throw invitesError;
    for (const invitation of invitations ?? []) {
      const eventId = String((invitation as { event_id: string }).event_id);
      const guestId = String((invitation as { guest_id: string }).guest_id);
      guestIdsByEvent[eventId] ??= new Set<string>();
      guestIdsByEvent[eventId].add(guestId);
    }
  }

  const options = (events ?? []).map((event) => {
    const row = event as { id: string; event_name: string | null; event_date: string | null };
    const dateLabel = row.event_date ? new Date(`${row.event_date}T12:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }) : null;
    return {
      value: `event:${row.id}`,
      label: dateLabel ? `${row.event_name ?? 'Event'} - ${dateLabel}` : (row.event_name ?? 'Event'),
      count: guestIdsByEvent[row.id]?.size ?? 0,
    };
  });

  return { options, guestIdsByEvent };
}

export async function loadSmsCreditPreview(weddingSiteId: string, cutoffIso: string): Promise<{
  expiringSoon: number;
  transactions: SmsCreditTransaction[];
}> {
  const { data, error } = await supabase
    .from('sms_credit_transactions')
    .select('id, credits_delta, reason, created_at, expires_at, remaining_credits')
    .eq('wedding_site_id', weddingSiteId)
    .order('created_at', { ascending: false })
    .limit(MAX_SMS_CREDIT_TRANSACTIONS);

  if (error) throw error;

  const transactions = (data ?? []) as SmsCreditTransaction[];
  const expiringSoon = transactions
    .filter((transaction) => transaction.credits_delta > 0 && !!transaction.expires_at && transaction.expires_at <= cutoffIso)
    .reduce((sum, transaction) => sum + Math.max(transaction.remaining_credits ?? 0, 0), 0);

  return { expiringSoon, transactions };
}

export async function loadMessagesActiveSite(userId: string): Promise<{
  activeSite: ActiveSiteSummary | null;
  weddingSite: WeddingSite | null;
}> {
  const activeSite = await resolveActiveSiteForUser(userId);
  if (!activeSite?.id) return { activeSite, weddingSite: null };

  const { data, error } = await supabase
    .from('wedding_sites')
    .select(WEDDING_SITE_SELECT)
    .eq('id', activeSite.id)
    .maybeSingle();

  if (error) throw error;
  return { activeSite, weddingSite: (data ?? null) as WeddingSite | null };
}
