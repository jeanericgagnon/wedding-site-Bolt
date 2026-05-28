import { customerSafeErrorMessage } from '../lib/customerSafeError';

export const GUEST_CONTACT_INVITE_REQUIRED_ERROR =
  'Please use the contact update link from your invitation email.';

export function mapGuestContactLookupError(error: unknown): string {
  return customerSafeErrorMessage(error, 'Couldn’t complete that search. Please try again.');
}

export function mapGuestContactSubmitError(error: unknown): string {
  return customerSafeErrorMessage(error, 'Could not send your update right now.');
}
