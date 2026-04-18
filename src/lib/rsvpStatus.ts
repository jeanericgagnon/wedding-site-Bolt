export function isAttendingRsvpStatus(status: string | null | undefined): boolean {
  return status === 'confirmed' || status === 'attending' || status === 'accepted';
}

export function isDeclinedRsvpStatus(status: string | null | undefined): boolean {
  return status === 'declined' || status === 'not_attending';
}

export function isPendingRsvpStatus(status: string | null | undefined): boolean {
  return !status || status === 'pending';
}

export function hasRespondedRsvpStatus(status: string | null | undefined): boolean {
  return !isPendingRsvpStatus(status);
}
