import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { supabase } from '../../lib/supabase';

export const RSVP_BOARD_GUEST_SELECT = 'id, rsvp_status, invited_to_ceremony, invited_to_reception, checked_in_at, email, phone, notes, invitation_sent_at, reminder_last_sent_at';
export const RSVP_BOARD_EVENT_SELECT = 'id';
export const RSVP_BOARD_EVENT_INVITATION_SELECT = 'event_id, guest_id';
export const MAX_RSVP_BOARD_GUESTS = 2000;
export const MAX_RSVP_BOARD_EVENTS = 200;
export const MAX_RSVP_BOARD_EVENT_INVITATIONS = 10000;

export type RsvpBoardGuestRow = {
  id: string;
  rsvp_status: 'pending' | 'confirmed' | 'declined' | string;
  invited_to_ceremony?: boolean;
  invited_to_reception?: boolean;
  invited_event_ids?: string[] | null;
  checked_in_at?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  invitation_sent_at?: string | null;
  reminder_last_sent_at?: string | null;
};

export async function resolveRsvpBoardSiteId(userId: string): Promise<string | null> {
  const activeSite = await resolveActiveSiteForUser(userId);
  return activeSite?.id ?? null;
}

export async function loadRsvpBoardRows(weddingSiteId: string): Promise<RsvpBoardGuestRow[]> {
  const { data, error } = await supabase
    .from('guests')
    .select(RSVP_BOARD_GUEST_SELECT)
    .eq('wedding_site_id', weddingSiteId)
    .limit(MAX_RSVP_BOARD_GUESTS);
  if (error) throw error;

  const invitedEventIdsByGuest = await loadRsvpBoardEventInvites(weddingSiteId);
  return ((data as RsvpBoardGuestRow[]) || []).map((row) => ({
    ...row,
    invited_event_ids: invitedEventIdsByGuest.get(row.id) ?? [],
  }));
}

async function loadRsvpBoardEventInvites(weddingSiteId: string): Promise<Map<string, string[]>> {
  const { data: events, error: eventsError } = await supabase
    .from('itinerary_events')
    .select(RSVP_BOARD_EVENT_SELECT)
    .eq('wedding_site_id', weddingSiteId)
    .limit(MAX_RSVP_BOARD_EVENTS);

  if (eventsError) return new Map<string, string[]>();

  const eventIds = ((events ?? []) as Array<{ id: string }>).map((event) => event.id);
  if (eventIds.length === 0) return new Map<string, string[]>();

  const { data: invites, error: invitesError } = await supabase
    .from('event_invitations')
    .select(RSVP_BOARD_EVENT_INVITATION_SELECT)
    .in('event_id', eventIds)
    .limit(MAX_RSVP_BOARD_EVENT_INVITATIONS);

  if (invitesError) return new Map<string, string[]>();

  return ((invites ?? []) as Array<{ event_id: string; guest_id: string }>).reduce(
    (acc, invite) => {
      const current = acc.get(invite.guest_id) ?? [];
      current.push(invite.event_id);
      acc.set(invite.guest_id, current);
      return acc;
    },
    new Map<string, string[]>(),
  );
}
