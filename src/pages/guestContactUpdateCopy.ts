import { customerSafeErrorMessage } from '../lib/customerSafeError';

export function mapGuestContactLookupError(error: unknown): string {
  return customerSafeErrorMessage(error, 'Couldn’t complete that search. Please try again.');
}

export function mapGuestContactSubmitError(error: unknown): string {
  return customerSafeErrorMessage(error, 'Could not send your update right now.');
}
