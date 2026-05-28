import { customerSafeErrorMessage } from '../lib/customerSafeError';

export const COLLAB_INVITE_INCOMPLETE_ERROR =
  'This invite link is incomplete. Ask the owner to send the full invite URL again.';

export const COLLAB_INVITE_INVALID_ERROR =
  'This invite could not be found. Double-check the link or ask for a fresh invite.';

export const COLLAB_INVITE_EXPIRED_ERROR =
  'This invite has expired. Ask the owner for a fresh invite link.';

export const COLLAB_INVITE_REVOKED_ERROR =
  'This invite is no longer active.';

export const COLLAB_INVITE_LOOKUP_RETRY_ERROR =
  'We couldn’t verify this invite right now. Please try again.';

export const COLLAB_INVITE_CLAIM_RETRY_ERROR =
  'Could not join this wedding team right now. Please try again.';

export const COLLAB_SIGNIN_RETRY_ERROR =
  'Could not sign you in right now. Please try again.';

export const COLLAB_SIGNUP_RETRY_ERROR =
  'Could not create your account right now. Please try again.';

export function mapCollaboratorInviteLookupError(error: unknown): string {
  return customerSafeErrorMessage(error, COLLAB_INVITE_LOOKUP_RETRY_ERROR);
}

export function mapCollaboratorInviteClaimError(error: unknown): string {
  const raw = error instanceof Error ? error.message.trim() : typeof error === 'string' ? error.trim() : '';

  if (/invite metadata is incomplete/i.test(raw)) {
    return COLLAB_INVITE_INCOMPLETE_ERROR;
  }

  if (/this invite was sent to /i.test(raw)) {
    return raw;
  }

  return customerSafeErrorMessage(error, COLLAB_INVITE_CLAIM_RETRY_ERROR);
}

export function mapCollaboratorInviteAuthError(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message.trim() : typeof error === 'string' ? error.trim() : '';

  if (
    /invalid login credentials/i.test(raw)
    || /email not confirmed/i.test(raw)
    || /passwords do not match/i.test(raw)
    || /at least 8 characters/i.test(raw)
    || /account created/i.test(raw)
    || /did not complete cleanly/i.test(raw)
  ) {
    return raw;
  }

  if (/invite metadata is incomplete/i.test(raw)) {
    return COLLAB_INVITE_INCOMPLETE_ERROR;
  }

  return customerSafeErrorMessage(error, fallback);
}
