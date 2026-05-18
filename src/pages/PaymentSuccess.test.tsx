import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentSuccess } from './PaymentSuccess';

const navigateMock = vi.fn();
const fetchPaymentStatusMock = vi.fn();
const verifyCheckoutSessionMock = vi.fn();
const clearOnboardingStateMock = vi.fn();
const useAuthMock = vi.fn();

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

    await waitFor(() => {
      expect(fetchPaymentStatusMock).toHaveBeenCalledWith('user-1');
    });

    await vi.advanceTimersByTimeAsync(901);

    expect(navigateMock).toHaveBeenCalledWith('/dashboard/overview?from=payment-success', { replace: true });
  });
});
