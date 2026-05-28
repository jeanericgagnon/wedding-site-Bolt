import { customerSafeErrorMessage } from '../lib/customerSafeError';

const VENDOR_PROFILE_ALLOW_LIST = [
  /vendor page not found\./i,
  /missing vendor page\./i,
];

export const VENDOR_PROFILE_DRAFT_RETRY_ERROR = 'Could not generate vendor draft.';
export const VENDOR_PROFILE_CREATE_RETRY_ERROR = 'Could not create vendor page.';
export const VENDOR_PROFILE_LOAD_RETRY_ERROR = 'Could not load vendor page.';
export const VENDOR_PROFILE_INQUIRY_RETRY_ERROR = 'Could not send inquiry.';

export function mapVendorProfileError(error: unknown, fallback: string): string {
  return customerSafeErrorMessage(error, fallback, { allow: VENDOR_PROFILE_ALLOW_LIST });
}
