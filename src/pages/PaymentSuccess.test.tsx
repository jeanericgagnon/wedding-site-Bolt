import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const authState = {
  user: { id: 'user-1' },
};
const stripeServiceMocks = {
  fetchPaymentStatus: vi.fn(),
  verifyCheckoutSession: vi.fn(),
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('../components/ui', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('../lib/stripeService', () => ({
  fetchPaymentStatus: (...args: unknown[]) => stripeServiceMocks.fetchPaymentStatus(...args),
  verifyCheckoutSession: (...args: unknown[]) => stripeServiceMocks.verifyCheckoutSession(...args),
}));

import { PaymentSuccess } from './PaymentSuccess';

describe('PaymentSuccess', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    stripeServiceMocks.fetchPaymentStatus.mockReset();
    stripeServiceMocks.verifyCheckoutSession.mockReset();
    stripeServiceMocks.fetchPaymentStatus.mockResolvedValue('payment_required');
    window.history.replaceState({}, '', '/payment/success');
  });

  it('confirms directly from the checkout session when present', async () => {
    stripeServiceMocks.verifyCheckoutSession.mockResolvedValue({ paid: true });
    window.history.replaceState({}, '', '/payment/success?session_id=cs_test_123');

    render(<PaymentSuccess />);

    await waitFor(() => {
      expect(stripeServiceMocks.verifyCheckoutSession).toHaveBeenCalledWith('cs_test_123');
    });
    expect(await screen.findByText('Payment confirmed!')).toBeInTheDocument();
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/onboarding/celebration?from=checkout', { replace: true });
    }, { timeout: 3000 });
  }, 10000);

  it('falls back to polling status when direct verification does not confirm payment', async () => {
    stripeServiceMocks.verifyCheckoutSession.mockResolvedValue({ paid: false });
    stripeServiceMocks.fetchPaymentStatus.mockResolvedValue('active');
    window.history.replaceState({}, '', '/payment/success?session_id=cs_test_456');

    render(<PaymentSuccess />);

    await waitFor(() => {
      expect(stripeServiceMocks.fetchPaymentStatus).toHaveBeenCalledWith('user-1');
    }, { timeout: 3000 });
    expect(await screen.findByText('Payment confirmed!')).toBeInTheDocument();
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/onboarding/celebration?from=checkout', { replace: true });
    }, { timeout: 4000 });
  }, 10000);
});
