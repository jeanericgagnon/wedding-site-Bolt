import { supabase } from '../../../lib/supabase';
import { resolveActiveSiteForUser, type ActiveSiteSummary } from '../../../lib/activeSite';
import { formatMessageEventOptionLabel } from '../messageEventDate';
import { MESSAGES_DASHBOARD_SELECT } from './messageSelect';
import type {
  AudienceOption,
  ChannelType,
  DeliveryRow,
  Guest,
  Message,
  SmsCreditTransaction,
  WeddingSite,
} from './messageDashboardTypes';

export const MESSAGES_SITE_SELECT = 'id, site_slug, couple_first_name, couple_second_name, couple_email, sms_credits_balance';
export const MESSAGE_GUEST_SELECT = 'id, email, phone, sms_consent, rsvp_status, invitation_sent_at, reminder_last_sent_at, mailing_address_line1, mailing_city, mailing_state, mailing_postal_code, first_name, last_name, name';
export const MESSAGE_DELIVERY_SELECT = 'id, message_id, status, provider_message_id, error_message, attempted_at, delivered_at, recipient_email, recipient_name';
export const MESSAGE_EVENT_SELECT = 'id, event_name, event_date';
export const MESSAGE_EVENT_INVITATION_SELECT = 'event_id, guest_id';
export const SMS_EXPIRING_CREDIT_SELECT = 'remaining_credits, expires_at';
export const SMS_TRANSACTION_SELECT = 'id, credits_delta, reason, created_at, expires_at, remaining_credits';

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

export async function createDashboardMessage(payload: MessageInsertPayload): Promise<void> {
  const { error } = await supabase.from('messages').insert(payload);
  if (error) throw error;
}

export async function loadMessagesActiveSite(userId: string): Promise<{
  activeSite: ActiveSiteSummary | null;
  weddingSite: WeddingSite | null;
}> {
  const activeSite = await resolveActiveSiteForUser(userId);
  if (!activeSite?.id) {
    return { activeSite, weddingSite: null };
  }

  const { data, error } = await supabase
    .from('wedding_sites')
    .select(MESSAGES_SITE_SELECT)
    .eq('id', activeSite.id)
    .maybeSingle();
  if (error) throw error;

  return {
    activeSite,
    weddingSite: (data as WeddingSite | null) ?? null,
  };
}

export async function loadDashboardMessages(weddingSiteId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGES_DASHBOARD_SELECT)
    .eq('wedding_site_id', weddingSiteId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Message[];
}

export async function loadMessageGuests(weddingSiteId: string): Promise<Guest[]> {
  const { data, error } = await supabase
    .from('guests')
    .select(MESSAGE_GUEST_SELECT)
    .eq('wedding_site_id', weddingSiteId);
  if (error) throw error;
  return (data ?? []) as Guest[];
}

export function isMissingMessageDeliveriesTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error ?? '');
  const normalized = message.toLowerCase();
  return normalized.includes('message_deliveries') || normalized.includes('does not exist') || normalized.includes('404');
}

export async function loadMessageDeliveries(messageIds: string[]): Promise<DeliveryRow[]> {
  if (messageIds.length === 0) return [];

  const { data, error } = await supabase
    .from('message_deliveries')
    .select(MESSAGE_DELIVERY_SELECT)
    .in('message_id', messageIds)
    .order('attempted_at', { ascending: false })
    .limit(500);
  if (error) throw error;

  return (data ?? []) as DeliveryRow[];
}

export async function loadMessageItineraryAudience(weddingSiteId: string): Promise<{
  options: AudienceOption[];
  guestIdsByEvent: Record<string, Set<string>>;
}> {
  const { data: events, error: eventsError } = await supabase
    .from('itinerary_events')
    .select(MESSAGE_EVENT_SELECT)
    .eq('wedding_site_id', weddingSiteId)
    .order('event_date', { ascending: true });
  if (eventsError) throw eventsError;

  if (!events || events.length === 0) {
    return { options: [], guestIdsByEvent: {} };
  }

  const eventIds = events.map((event) => event.id);
  const { data: invites, error: invitesError } = await supabase
    .from('event_invitations')
    .select(MESSAGE_EVENT_INVITATION_SELECT)
    .in('event_id', eventIds);
  if (invitesError) throw invitesError;

  const guestIdsByEvent: Record<string, Set<string>> = {};
  for (const event of events) {
    guestIdsByEvent[event.id] = new Set<string>();
  }
  for (const row of invites ?? []) {
    if (!guestIdsByEvent[row.event_id]) guestIdsByEvent[row.event_id] = new Set<string>();
    guestIdsByEvent[row.event_id].add(row.guest_id);
  }

  return {
    guestIdsByEvent,
    options: events.map((event) => ({
      value: `event:${event.id}`,
      label: formatMessageEventOptionLabel(event.event_name, event.event_date),
      count: guestIdsByEvent[event.id]?.size ?? 0,
    })),
  };
}

export async function loadSmsCreditPreview(weddingSiteId: string, cutoffIso: string): Promise<{
  expiringSoon: number;
  transactions: SmsCreditTransaction[];
}> {
  const [expiringResult, txResult] = await Promise.all([
    supabase
      .from('sms_credit_transactions')
      .select(SMS_EXPIRING_CREDIT_SELECT)
      .eq('wedding_site_id', weddingSiteId)
      .in('reason', ['purchase', 'included'])
      .lte('expires_at', cutoffIso),
    supabase
      .from('sms_credit_transactions')
      .select(SMS_TRANSACTION_SELECT)
      .eq('wedding_site_id', weddingSiteId)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  if (expiringResult.error) throw expiringResult.error;
  if (txResult.error) throw txResult.error;

  return {
    expiringSoon: (expiringResult.data ?? []).reduce((sum, row) => sum + Number(row.remaining_credits ?? 0), 0),
    transactions: (txResult.data ?? []) as SmsCreditTransaction[],
  };
}

export async function updateDashboardMessage(messageId: string, updates: Record<string, unknown>): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update(updates)
    .eq('id', messageId);
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
  const { data, error } = await supabase
    .from('messages')
    .insert([payload])
    .select('id')
    .single();
  if (error) throw error;
  return data as { id: string };
}
