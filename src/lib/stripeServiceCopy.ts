import { customerSafeErrorMessage } from './customerSafeError';

export const STRIPE_CHECKOUT_RETRY_ERROR =
  'Could not start checkout right now. Please try again.';

export const STRIPE_SUBSCRIPTION_CHECKOUT_RETRY_ERROR =
  'Could not start subscription checkout right now. Please try again.';

export const STRIPE_SMS_CREDITS_CHECKOUT_RETRY_ERROR =
  'Could not start SMS credits checkout right now. Please try again.';

export const STRIPE_VERIFY_CHECKOUT_RETRY_ERROR =
  'Could not verify your payment right now. Please try again.';

export const STRIPE_BILLING_LOAD_RETRY_ERROR =
  'Could not load your billing details right now. Please try again.';

export const STRIPE_PAYMENT_STATUS_RETRY_ERROR =
  'Could not check payment status right now. Please try again.';

export const STRIPE_SITE_LOOKUP_RETRY_ERROR =
  'Could not load your website record right now. Please try again.';

export function mapStripeCheckoutStartError(error: unknown): string {
  return customerSafeErrorMessage(error, STRIPE_CHECKOUT_RETRY_ERROR);
}

export function mapStripeSubscriptionCheckoutError(error: unknown): string {
  return customerSafeErrorMessage(error, STRIPE_SUBSCRIPTION_CHECKOUT_RETRY_ERROR);
}

export function mapStripeSmsCreditsCheckoutError(error: unknown): string {
  return customerSafeErrorMessage(error, STRIPE_SMS_CREDITS_CHECKOUT_RETRY_ERROR);
}

export function mapStripeVerifyCheckoutError(error: unknown): string {
  return customerSafeErrorMessage(error, STRIPE_VERIFY_CHECKOUT_RETRY_ERROR);
}

export function mapStripeBillingLoadError(error: unknown): string {
  return customerSafeErrorMessage(error, STRIPE_BILLING_LOAD_RETRY_ERROR);
}

export function mapStripePaymentStatusError(error: unknown): string {
  return customerSafeErrorMessage(error, STRIPE_PAYMENT_STATUS_RETRY_ERROR);
}

export function mapStripeSiteLookupError(error: unknown): string {
  return customerSafeErrorMessage(error, STRIPE_SITE_LOOKUP_RETRY_ERROR);
}
