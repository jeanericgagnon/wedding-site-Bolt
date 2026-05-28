import { customerSafeErrorMessage } from './customerSafeError';

export const BILLING_SETUP_REQUIRED_ERROR =
  'Finish setup before upgrading to full access.';

export const BILLING_UPGRADE_RETRY_ERROR =
  'Could not start checkout right now. Please try again.';

export const PAYMENT_SITE_SETUP_RETRY_ERROR =
  'Could not finish setting up your account right now. Please try again.';

export const PAYMENT_STATUS_RETRY_ERROR =
  'Could not check payment status right now. Please try again.';

export const WEDDING_STATUS_SAVE_RETRY_ERROR =
  'Could not save your wedding details right now. Please try again.';

export const SETUP_SHELL_SAVE_RETRY_ERROR =
  'Could not save your setup right now. Please try again.';

export function mapBillingUpgradeError(error: unknown): string {
  const raw = error instanceof Error ? error.message.trim() : typeof error === 'string' ? error.trim() : '';

  if (/no wedding site found/i.test(raw)) {
    return BILLING_SETUP_REQUIRED_ERROR;
  }

  return customerSafeErrorMessage(error, BILLING_UPGRADE_RETRY_ERROR);
}

export function mapPaymentSiteSetupError(error: unknown): string {
  return customerSafeErrorMessage(error, PAYMENT_SITE_SETUP_RETRY_ERROR, {
    allow: [/^Could not create your website record right now\. Please refresh and try again\.$/i],
  });
}

export function mapPaymentCheckoutError(error: unknown): string {
  return customerSafeErrorMessage(error, BILLING_UPGRADE_RETRY_ERROR);
}

export function mapPaymentStatusError(error: unknown): string {
  return customerSafeErrorMessage(error, PAYMENT_STATUS_RETRY_ERROR);
}

export function mapWeddingStatusSaveError(error: unknown): string {
  return customerSafeErrorMessage(error, WEDDING_STATUS_SAVE_RETRY_ERROR);
}

export function mapSetupShellSaveError(error: unknown): string {
  return customerSafeErrorMessage(error, SETUP_SHELL_SAVE_RETRY_ERROR);
}
