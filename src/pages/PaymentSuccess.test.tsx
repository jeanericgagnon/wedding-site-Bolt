import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentSuccess } from './PaymentSuccess';

const navigateMock = vi.fn();
const fetchPaymentStatusMock = vi.fn();
const verifyCheckoutSessionMock = vi.fn();
const clearOnboardingStateMock = vi.fn();
const useAuthMock = vi.fn();

const { MockSessionExpiredError } = vi.hoisted(() => ({
  MockSessionExpiredError: class MockSessionExpiredError extends Error {
    constructor() {
      super('Session expired');
      this.name = 'SessionExpiredError';
    }
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../lib/stripeService', () => ({
  fetchPaymentStatus: (...args: unknown[]) => fetchPaymentStatusMock(...args),
  SessionExpiredError: MockSessionExpiredError,
  verifyCheckoutSession: (...args: unknown[]) => verifyCheckoutSessionMock(...args),
}));

vi.mock('../lib/onboardingContinuationCleanup', () => ({
  clearAllOnboardingContinuationState: () => clearOnboardingStateMock(),
}));

describe('PaymentSuccess', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    navigateMock.mockReset();
    fetchPaymentStatusMock.mockReset();
    verifyCheckoutSessionMock.mockReset();
    clearOnboardingStateMock.mockReset();
    window.history.replaceState({}, '', '/payment/success');
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('routes authenticated owners without a checkout session back into the app', async () => {
    useAuthMock.mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
    });
    fetchPaymentStatusMock.mockResolvedValue('inactive');

    render(
      <MemoryRouter initialEntries={['/payment/success']}>
        <PaymentSuccess />
      </MemoryRouter>,
    );

    await vi.waitFor(() => {
      expect(fetchPaymentStatusMock).toHaveBeenCalledWith('user-1');
    });

    await vi.advanceTimersByTimeAsync(901);

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/overview?from=payment-success', { replace: true });
  });

  it('ignores late payment status confirmations after unmount', async () => {
    useAuthMock.mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
    });

    let resolvePaymentStatus: (status: string) => void = () => {};
    fetchPaymentStatusMock.mockReturnValue(new Promise((resolve) => {
      resolvePaymentStatus = resolve;
    }));

    const { unmount } = render(
      <MemoryRouter initialEntries={['/payment/success']}>
        <PaymentSuccess />
      </MemoryRouter>,
    );

    await vi.waitFor(() => {
      expect(fetchPaymentStatusMock).toHaveBeenCalledWith('user-1');
    });

    unmount();
    resolvePaymentStatus('active');
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(2000);

    expect(clearOnboardingStateMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalledWith('/onboarding/celebration?from=checkout', { replace: true });
  });

  it('sends expired checkout verification sessions back to login', async () => {
    useAuthMock.mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
    });
    verifyCheckoutSessionMock.mockRejectedValue(new MockSessionExpiredError());

    render(
      <MemoryRouter initialEntries={['/payment/success?session_id=checkout_123']}>
        <PaymentSuccess />
      </MemoryRouter>,
    );

    await vi.waitFor(() => {
      expect(verifyCheckoutSessionMock).toHaveBeenCalledWith('checkout_123');
    });

    expect(navigateMock).toHaveBeenCalledWith('/login?reason=session_expired', { replace: true });
    expect(fetchPaymentStatusMock).not.toHaveBeenCalled();
  });
});
