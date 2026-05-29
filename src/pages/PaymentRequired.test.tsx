import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const authState = {
  user: { id: 'user-1', email: 'alex@example.com' },
};
const stripeServiceMocks = {
  createCheckoutSession: vi.fn(),
  fetchPaymentStatus: vi.fn(),
  fetchWeddingSiteId: vi.fn(),
};
const bypassState = {
  allowed: false,
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
  Button: ({
    children,
    fullWidth,
    ...props
  }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement> & { fullWidth?: boolean }>) => (
    <button data-full-width={fullWidth ? 'true' : undefined} {...props}>{children}</button>
  ),
}));

vi.mock('../components/auth/AuthSupportLinks', () => ({
  AuthSupportLinks: () => <div>Support links</div>,
}));

vi.mock('../lib/paymentGate', () => ({
  isPaymentBypassAllowed: () => bypassState.allowed,
}));

vi.mock('../lib/stripeService', () => ({
  SessionExpiredError: class SessionExpiredError extends Error {},
  createCheckoutSession: (...args: unknown[]) => stripeServiceMocks.createCheckoutSession(...args),
  fetchPaymentStatus: (...args: unknown[]) => stripeServiceMocks.fetchPaymentStatus(...args),
  fetchWeddingSiteId: (...args: unknown[]) => stripeServiceMocks.fetchWeddingSiteId(...args),
}));

vi.mock('../lib/setupFlowCopy', () => ({
  mapPaymentCheckoutError: () => 'Could not start checkout right now. Please try again.',
  mapPaymentSiteSetupError: () => 'Could not prepare your site right now. Please try again.',
  mapPaymentStatusError: () => 'Could not confirm your payment right now. Please try again.',
}));

import { PaymentRequired } from './PaymentRequired';

describe('PaymentRequired', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    stripeServiceMocks.createCheckoutSession.mockReset();
    stripeServiceMocks.fetchPaymentStatus.mockReset();
    stripeServiceMocks.fetchWeddingSiteId.mockReset();
    stripeServiceMocks.fetchWeddingSiteId.mockResolvedValue('site-123');
    stripeServiceMocks.fetchPaymentStatus.mockResolvedValue('payment_required');
    bypassState.allowed = false;
    window.history.replaceState({}, '', '/payment-required');
  });

  it('hides the bypass CTA when bypass is disabled and keeps billing copy provider-free', async () => {
    render(<PaymentRequired />);

    await waitFor(() => {
      expect(stripeServiceMocks.fetchWeddingSiteId).toHaveBeenCalledWith('user-1');
    });

    expect(screen.queryByRole('button', { name: /continue without payment for now/i })).not.toBeInTheDocument();
    expect(screen.getByText('Secure payment. We never store your card details.')).toBeInTheDocument();
    expect(screen.queryByText(/stripe/i)).not.toBeInTheDocument();
  });

  it('shows the bypass CTA only when bypass is enabled', async () => {
    bypassState.allowed = true;

    render(<PaymentRequired />);

    expect(await screen.findByRole('button', { name: /continue without payment for now/i })).toBeInTheDocument();
  });

  it('sends paid users back into celebration after a status recheck', async () => {
    stripeServiceMocks.fetchPaymentStatus.mockResolvedValue('active');

    render(<PaymentRequired />);

    fireEvent.click(await screen.findByRole('button', { name: /already paid\? check status/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/onboarding/celebration?from=payment', { replace: true });
    });
  });
});
