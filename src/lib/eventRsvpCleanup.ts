import { supabase } from './supabase';

export const MAX_EVENT_RSVP_INVITATION_IDS = 10000;

export interface EventRsvpSnapshot {
  event_invitation_id: string;
  attending: boolean;
  dietary_restrictions?: string | null;
  notes?: string | null;
  responded_at?: string | null;
}

function isMissingEventRsvpsRelation(message: string | undefined): boolean {
  const msg = (message || '').toLowerCase();
  return msg.includes('event_rsvps') || msg.includes('does not exist') || msg.includes('404') || msg.includes('relation');
}

export function normalizeEventRsvpSnapshots(rows: unknown[]): EventRsvpSnapshot[] {
  return rows.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const value = row as Record<string, unknown>;
    if (typeof value.event_invitation_id !== 'string' || typeof value.attending !== 'boolean') {
      return [];
    }

    return [{
      event_invitation_id: value.event_invitation_id,
      attending: value.attending,
      dietary_restrictions: typeof value.dietary_restrictions === 'string' ? value.dietary_restrictions : null,
      notes: typeof value.notes === 'string' ? value.notes : null,
      responded_at: typeof value.responded_at === 'string' ? value.responded_at : null,
    }];
  });
}

export async function deleteEventRsvpsByInvitationIds(invitationIds: string[]): Promise<void> {
  if (invitationIds.length === 0) return;
  const scopedInvitationIds = invitationIds.slice(0, MAX_EVENT_RSVP_INVITATION_IDS);

  const { error } = await supabase.rpc('event_rsvp_delete_many', {
    p_event_invitation_ids: scopedInvitationIds,
  });

  if (error && !isMissingEventRsvpsRelation(error.message)) {
    throw error;
  }
}

export async function deleteEventRsvpByInvitationId(invitationId: string | null | undefined): Promise<void> {
  if (!invitationId) return;
  await deleteEventRsvpsByInvitationIds([invitationId]);
}

export async function getEventRsvpSnapshotsByInvitationIds(invitationIds: string[]): Promise<EventRsvpSnapshot[]> {
  if (invitationIds.length === 0) return [];
  const scopedInvitationIds = invitationIds.slice(0, MAX_EVENT_RSVP_INVITATION_IDS);

  const { data, error } = await supabase
    .from('event_rsvps')
    .select('event_invitation_id, attending, dietary_restrictions, notes, responded_at')
    .in('event_invitation_id', scopedInvitationIds);

  if (error) {
    if (isMissingEventRsvpsRelation(error.message)) return [];
    throw error;
  }

  return normalizeEventRsvpSnapshots(data ?? []);
}

export async function restoreEventRsvpSnapshots(rows: EventRsvpSnapshot[]): Promise<void> {
  if (rows.length === 0) return;

  const { error } = await supabase.rpc('event_rsvp_upsert_many', {
    p_rows: rows,
  });

  if (error && !isMissingEventRsvpsRelation(error.message)) {
    throw error;
  }
}
