import { customerSafeErrorMessage } from '../../../lib/customerSafeError';

export const REGISTRY_DASHBOARD_ITEMS_LOAD_RETRY_ERROR = 'Could not load registry items right now. Please try again.';
export const REGISTRY_DASHBOARD_SETUP_RETRY_ERROR = 'Could not finish setup right now. Please try again.';
export const REGISTRY_DASHBOARD_LOAD_ERROR = 'Could not load registry right now. Try again in a moment.';
export const REGISTRY_THANK_YOU_SAVE_RETRY_ERROR = 'Could not save thank-you follow-up right now. Please try again.';
export const REGISTRY_THANK_YOU_UPDATE_RETRY_ERROR = 'Could not update thank-you follow-up right now. Please try again.';
export const REGISTRY_ITEM_DELETE_RETRY_ERROR = 'Could not remove that gift right now. Please try again.';
export const REGISTRY_ITEM_PURCHASE_RETRY_ERROR = 'Could not update that gift right now. Please try again.';
export const REGISTRY_ITEM_PURCHASE_RESET_RETRY_ERROR = 'Could not clear purchase state right now. Please try again.';

export function safeRegistryDashboardError(error: unknown, fallback: string): string {
  return customerSafeErrorMessage(error, fallback);
}
