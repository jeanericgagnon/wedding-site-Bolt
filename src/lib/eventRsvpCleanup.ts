import { supabase } from './supabase';

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
