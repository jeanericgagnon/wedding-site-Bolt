import { describe, expect, it } from 'vitest';

import {
  mapStripeBillingLoadError,
  mapStripeCheckoutStartError,
  mapStripePaymentStatusError,
  mapStripeSiteLookupError,
  mapStripeSmsCreditsCheckoutError,
  mapStripeSubscriptionCheckoutError,
  mapStripeVerifyCheckoutError,
  STRIPE_BILLING_LOAD_RETRY_ERROR,
  STRIPE_CHECKOUT_RETRY_ERROR,
  STRIPE_PAYMENT_STATUS_RETRY_ERROR,
  STRIPE_SITE_LOOKUP_RETRY_ERROR,
  STRIPE_SMS_CREDITS_CHECKOUT_RETRY_ERROR,
  STRIPE_SUBSCRIPTION_CHECKOUT_RETRY_ERROR,
  STRIPE_VERIFY_CHECKOUT_RETRY_ERROR,
} from './stripeServiceCopy';

describe('stripe service customer-safe copy', () => {
  it('keeps checkout-start failures free of provider or token details', () => {
    expect(mapStripeCheckoutStartError('provider timeout token=abc')).toBe(
      STRIPE_CHECKOUT_RETRY_ERROR,
    );
  });

  it('keeps subscription checkout failures free of function or relation details', () => {
    expect(
      mapStripeSubscriptionCheckoutError(
        new Error('relation "billing_customers" does not exist in stripe function response'),
      ),
    ).toBe(STRIPE_SUBSCRIPTION_CHECKOUT_RETRY_ERROR);
  });

  it('keeps SMS credits checkout failures free of backend details', () => {
    expect(
      mapStripeSmsCreditsCheckoutError(
        new Error('functions/v1/stripe-create-sms-credits failed with status code 500'),
      ),
    ).toBe(STRIPE_SMS_CREDITS_CHECKOUT_RETRY_ERROR);
  });

  it('keeps payment verification failures free of raw provider or HTTP details', () => {
    expect(mapStripeVerifyCheckoutError('stripe verification HTTP 500 provider timeout')).toBe(
      STRIPE_VERIFY_CHECKOUT_RETRY_ERROR,
    );
  });

  it('keeps billing and site status lookups behind calm fallback copy', () => {
    expect(
      mapStripeBillingLoadError(new Error('column stripe_subscription_id does not exist')),
    ).toBe(STRIPE_BILLING_LOAD_RETRY_ERROR);
    expect(
      mapStripePaymentStatusError(new Error('permission denied for table wedding_sites')),
    ).toBe(STRIPE_PAYMENT_STATUS_RETRY_ERROR);
    expect(
      mapStripeSiteLookupError(new Error('duplicate key value violates row-level security')),
    ).toBe(STRIPE_SITE_LOOKUP_RETRY_ERROR);
  });
});
