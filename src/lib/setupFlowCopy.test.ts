import { describe, expect, it } from 'vitest';

import {
  BILLING_SETUP_REQUIRED_ERROR,
  BILLING_UPGRADE_RETRY_ERROR,
  PAYMENT_SITE_SETUP_RETRY_ERROR,
  PAYMENT_STATUS_RETRY_ERROR,
  SETUP_SHELL_SAVE_RETRY_ERROR,
  WEDDING_STATUS_SAVE_RETRY_ERROR,
  mapBillingUpgradeError,
  mapPaymentCheckoutError,
  mapPaymentSiteSetupError,
  mapPaymentStatusError,
  mapSetupShellSaveError,
  mapWeddingStatusSaveError,
} from './setupFlowCopy';

describe('setupFlowCopy', () => {
  it('maps missing wedding site checkout errors to setup guidance', () => {
    expect(mapBillingUpgradeError(new Error('No wedding site found. Complete setup first.'))).toBe(
      BILLING_SETUP_REQUIRED_ERROR
    );
  });

  it('shields internal checkout failures', () => {
    expect(mapBillingUpgradeError(new Error('Stripe checkout provider timeout with token=abc'))).toBe(
      BILLING_UPGRADE_RETRY_ERROR
    );
    expect(mapPaymentCheckoutError(new Error('functions/v1/create-checkout-session failed'))).toBe(
      BILLING_UPGRADE_RETRY_ERROR
    );
  });

  it('keeps safe account setup guidance while hiding backend failures', () => {
    expect(
      mapPaymentSiteSetupError(
        new Error('Could not create your website record right now. Please refresh and try again.')
      )
    ).toBe('Could not create your website record right now. Please refresh and try again.');

    expect(mapPaymentSiteSetupError(new Error('duplicate key value violates row-level security policy'))).toBe(
      PAYMENT_SITE_SETUP_RETRY_ERROR
    );
  });

  it('shields payment status failures', () => {
    expect(mapPaymentStatusError(new Error('Supabase network request failed with status code 500'))).toBe(
      PAYMENT_STATUS_RETRY_ERROR
    );
  });

  it('shields wedding status save failures', () => {
    expect(mapWeddingStatusSaveError(new Error('Not authenticated'))).toBe(WEDDING_STATUS_SAVE_RETRY_ERROR);
    expect(mapWeddingStatusSaveError(new Error('database update failed'))).toBe(WEDDING_STATUS_SAVE_RETRY_ERROR);
  });

  it('shields setup bootstrap failures', () => {
    expect(mapSetupShellSaveError(new Error('functions/v1/setup-bootstrap provider timeout'))).toBe(
      SETUP_SHELL_SAVE_RETRY_ERROR
    );
  });
});
