import { describe, expect, it } from 'vitest';
import { safePaymentFunctionError } from './stripeService';

describe('safePaymentFunctionError', () => {
  it('hides provider and backend-shaped payment errors', () => {
    expect(safePaymentFunctionError('Stripe checkout provider token failed', 'Could not start checkout. Please try again.')).toBe(
      'Could not start checkout. Please try again.',
    );
    expect(safePaymentFunctionError('database policy denied token abc123', 'Could not start checkout. Please try again.')).toBe(
      'Could not start checkout. Please try again.',
    );
  });

  it('keeps known customer-safe payment function copy', () => {
    expect(safePaymentFunctionError('Checkout return URL is not allowed.', 'Could not start checkout. Please try again.')).toBe(
      'Checkout return URL is not allowed.',
    );
    expect(safePaymentFunctionError('SMS credit purchases will open after texting setup is complete.', 'Could not start SMS credit checkout. Please try again.')).toBe(
      'SMS credit purchases will open after texting setup is complete.',
    );
  });
});
