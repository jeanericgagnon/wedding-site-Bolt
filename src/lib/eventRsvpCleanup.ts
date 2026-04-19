import { supabase } from './supabase';

export interface EventRsvpSnapshot {
  event_invitation_id: string;
  attending: boolean;
  responded_at?: string | null;
}

function isMissingEventRsvpsRelation(message: string | undefined): boolean {
  const msg = (message || '').toLowerCase();
  return msg.includes('event_rsvps') || msg.includes('does not exist') || msg.includes('404') || msg.includes('relation');
}

export async function deleteEventRsvpsByInvitationIds(invitationIds: string[]): Promise<void> {
  if (invitationIds.length === 0) return;

  const { error } = await supabase
    .from('event_rsvps')
    .delete()
    .in('event_invitation_id', invitationIds);

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

  const { data, error } = await supabase
    .from('event_rsvps')
    .select('event_invitation_id, attending, responded_at')
    .in('event_invitation_id', invitationIds);

  if (error) {
    if (isMissingEventRsvpsRelation(error.message)) return [];
    throw error;
  }

  return (data ?? []) as EventRsvpSnapshot[];
}

export async function restoreEventRsvpSnapshots(rows: EventRsvpSnapshot[]): Promise<void> {
  if (rows.length === 0) return;

  const { error } = await supabase
    .from('event_rsvps')
    .upsert(rows, { onConflict: 'event_invitation_id' });

  if (error && !isMissingEventRsvpsRelation(error.message)) {
    throw error;
  }
}
