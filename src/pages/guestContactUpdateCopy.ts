import { customerSafeErrorMessage } from '../lib/customerSafeError';

export const GUEST_CONTACT_INVITE_REQUIRED_ERROR =
  'Please use the contact update link from your invitation email.';
export const GUEST_CONTACT_LOOKUP_RETRY_ERROR =
  'Couldn’t complete that search. Please try again.';
export const GUEST_CONTACT_SUBMIT_RETRY_ERROR =
  'Could not send your update right now.';

export function mapGuestContactLookupError(error: unknown): string {
  return customerSafeErrorMessage(error, GUEST_CONTACT_LOOKUP_RETRY_ERROR);
}

export function mapGuestContactSubmitError(error: unknown): string {
  return customerSafeErrorMessage(error, GUEST_CONTACT_SUBMIT_RETRY_ERROR);
}
