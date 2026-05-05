import { describe, expect, it } from 'vitest';
import { resolvePaymentBypassAllowed } from './paymentGate';

describe('paymentGate', () => {
  it('does not allow query-string payment bypasses in production builds', () => {
    expect(resolvePaymentBypassAllowed('true', true)).toBe(false);
    expect(resolvePaymentBypassAllowed('1', true)).toBe(false);
  });

  it('keeps local and preview bypass opt-in explicit', () => {
    expect(resolvePaymentBypassAllowed('true', false)).toBe(true);
    expect(resolvePaymentBypassAllowed('1', false)).toBe(true);
    expect(resolvePaymentBypassAllowed(undefined, false)).toBe(false);
    expect(resolvePaymentBypassAllowed('false', false)).toBe(false);
  });
});
