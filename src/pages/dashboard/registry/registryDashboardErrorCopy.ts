import { customerSafeErrorMessage } from '../../../lib/customerSafeError';

export const REGISTRY_DASHBOARD_ITEMS_LOAD_RETRY_ERROR = 'Could not load registry items right now. Please try again.';
export const REGISTRY_DASHBOARD_SETUP_RETRY_ERROR = 'Could not finish setup right now. Please try again.';
export const REGISTRY_DASHBOARD_LOAD_ERROR = 'Could not load registry right now. Try again in a moment.';
export const REGISTRY_REFRESH_POLICY_SAVE_RETRY_ERROR = 'Could not save refresh settings right now. Please try again.';
export const REGISTRY_BARCODE_LOOKUP_RETRY_ERROR = 'We could not look up that barcode right now. You can still enter the gift details by hand.';
export const REGISTRY_LINK_AUTOFILL_RETRY_ERROR = 'We could not fill this automatically. You can still add the details by hand.';
export const REGISTRY_METADATA_REFRESH_RETRY_ERROR = 'Could not refresh gift details right now. Please try again.';
export const REGISTRY_METADATA_REIMPORT_RETRY_ERROR = 'Could not refresh this gift right now. Try Edit if the store page is light on details.';
export const REGISTRY_DUPLICATE_REVIEW_COPY_RETRY_ERROR = 'Could not copy the duplicate review list right now.';
export const REGISTRY_DUPLICATE_MERGE_RETRY_ERROR = 'Could not merge those duplicate gifts right now. Please try again.';
export const REGISTRY_THANK_YOU_SAVE_RETRY_ERROR = 'Could not save thank-you follow-up right now. Please try again.';
export const REGISTRY_THANK_YOU_UPDATE_RETRY_ERROR = 'Could not update thank-you follow-up right now. Please try again.';
export const REGISTRY_ITEM_SAVE_RETRY_ERROR = 'Could not save this gift right now. Please try again.';
export const REGISTRY_ITEM_DELETE_RETRY_ERROR = 'Could not remove that gift right now. Please try again.';
export const REGISTRY_ITEM_PURCHASE_RETRY_ERROR = 'Could not update that gift right now. Please try again.';
export const REGISTRY_ITEM_PURCHASE_RESET_RETRY_ERROR = 'Could not clear purchase state right now. Please try again.';

export function safeRegistryDashboardError(error: unknown, fallback: string): string {
  return customerSafeErrorMessage(error, fallback);
}
