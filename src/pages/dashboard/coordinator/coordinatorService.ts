import { resolveActiveSiteForUser } from '../../../lib/activeSite';
import type { PlannerAccessRole, PlannerPermissionKey } from '../../../lib/plannerAccess';
import { supabase } from '../../../lib/supabase';
import type { GuestLiteForCoordinator } from '../../../lib/coordinatorTypes';
import type { EventLite, QnaItem } from './coordinatorDashboardTypes';

const COORDINATOR_GUEST_SELECT = 'id, first_name, last_name, name, rsvp_status, checked_in_at' as const;
const COORDINATOR_EVENT_SELECT = 'id, event_name, start_time' as const;
const COORDINATOR_EVENT_INVITATION_SELECT = 'event_id, guest_id' as const;
const COORDINATOR_QNA_SELECT = 'id, question, answer, status, created_at' as const;
const COORDINATOR_QNA_INSERT_SELECT = 'id, question, answer, status' as const;

export interface CoordinatorBootstrapData {
  siteId: string | null;
  role: PlannerAccessRole;
  permissions: PlannerPermissionKey[] | null;
  guests: GuestLiteForCoordinator[];
  events: EventLite[];
  eventGuestIds: Record<string, Set<string>>;
  qnaItems: QnaItem[];
}

export interface CoordinatorAlertMessageInput {
  siteId: string;
  subject: string;
  body: string;
  channel: 'email' | 'sms';
  audience: string;
  recipientCount: number;
  status: 'queued' | 'scheduled';
  scheduledFor: string | null;
}

export function buildCoordinatorEventGuestMap(
  events: EventLite[],
  inviteRows: Array<{ event_id: string; guest_id: string }> | null | undefined,
): Record<string, Set<string>> {
  const inviteMap: Record<string, Set<string>> = {};
  events.forEach((event) => { inviteMap[event.id] = new Set<string>(); });
  (inviteRows ?? []).forEach((row) => {
    if (!inviteMap[row.event_id]) inviteMap[row.event_id] = new Set<string>();
    inviteMap[row.event_id].add(row.guest_id);
  });
  return inviteMap;
}

export async function loadCoordinatorBootstrapData(userId: string): Promise<CoordinatorBootstrapData> {
  const activeSite = await resolveActiveSiteForUser(userId);
  const siteId = activeSite?.id ?? null;
  if (!siteId) {
    return {
      siteId: null,
      role: 'owner',
      permissions: null,
      guests: [],
      events: [],
      eventGuestIds: {},
      qnaItems: [],
    };
  }

  const [{ data: guestsData, error: guestsError }, { data: eventsData, error: eventsError }] = await Promise.all([
    supabase
      .from('guests')
      .select(COORDINATOR_GUEST_SELECT)
      .eq('wedding_site_id', siteId),
    supabase
      .from('itinerary_events')
      .select(COORDINATOR_EVENT_SELECT)
      .eq('wedding_site_id', siteId)
      .order('start_time', { ascending: true }),
  ]);
  if (guestsError) throw guestsError;
  if (eventsError) throw eventsError;

  const events = (eventsData ?? []) as EventLite[];
  const eventIds = events.map((event) => event.id);
  let inviteRows: Array<{ event_id: string; guest_id: string }> = [];
  if (eventIds.length > 0) {
    const { data, error } = await supabase
      .from('event_invitations')
      .select(COORDINATOR_EVENT_INVITATION_SELECT)
      .in('event_id', eventIds);
    if (error) throw error;
    inviteRows = (data ?? []) as Array<{ event_id: string; guest_id: string }>;
  }

  const { data: qnaData, error: qnaError } = await supabase
    .from('guest_qna_items')
    .select(COORDINATOR_QNA_SELECT)
    .eq('wedding_site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (qnaError) throw qnaError;

  return {
    siteId,
    role: activeSite?.role ?? 'owner',
    permissions: activeSite?.permissions ?? null,
    guests: (guestsData ?? []) as GuestLiteForCoordinator[],
    events,
    eventGuestIds: buildCoordinatorEventGuestMap(events, inviteRows),
    qnaItems: (qnaData ?? []) as QnaItem[],
  };
}

export async function createCoordinatorAlertMessage(input: CoordinatorAlertMessageInput): Promise<void> {
  const { error } = await supabase.from('messages').insert({
    wedding_site_id: input.siteId,
    subject: input.subject.trim(),
    body: input.body.trim(),
    channel: input.channel,
    audience_filter: input.audience,
    recipient_filter: { audience: input.audience, recipient_count: input.recipientCount },
    status: input.status,
    sent_at: input.scheduledFor ? null : new Date().toISOString(),
    scheduled_for: input.scheduledFor,
  });
  if (error) throw error;
}

export async function updateCoordinatorGuestCheckIn(args: {
  siteId: string;
  guestId: string;
  checkedInAt: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('guests')
    .update({ checked_in_at: args.checkedInAt })
    .eq('id', args.guestId)
    .eq('wedding_site_id', args.siteId);
  if (error) throw error;
}

export async function createCoordinatorQnaQuestion(siteId: string, question: string): Promise<QnaItem> {
  const { data, error } = await supabase
    .from('guest_qna_items')
    .insert({ wedding_site_id: siteId, question, status: 'new', source: 'manual' })
    .select(COORDINATOR_QNA_INSERT_SELECT)
    .single();
  if (error) throw error;
  return data as QnaItem;
}

export async function updateCoordinatorQnaAnswer(id: string, item: Pick<QnaItem, 'answer' | 'status'>): Promise<void> {
  const { error } = await supabase.from('guest_qna_items').update({
    answer: item.answer ?? null,
    status: item.status,
  }).eq('id', id);
  if (error) throw error;
}
