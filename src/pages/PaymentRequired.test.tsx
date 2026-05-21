import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { PaymentRequired } from './PaymentRequired';
import { useAuth } from '../hooks/useAuth';
import { createCheckoutSession, fetchPaymentStatus } from '../lib/stripeService';
import { isPaymentBypassAllowed } from '../lib/paymentGate';
import { ensureMinimalPaymentWeddingSite } from './paymentRequiredService';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../lib/stripeService', () => ({
  createCheckoutSession: vi.fn(async () => 'https://checkout.example/session'),
  fetchPaymentStatus: vi.fn(async () => 'inactive'),
  SessionExpiredError: class SessionExpiredError extends Error {},
}));

vi.mock('../lib/paymentGate', () => ({
  isPaymentBypassAllowed: vi.fn(() => false),
}));

vi.mock('../lib/onboardingContinuationCleanup', () => ({
  clearAllOnboardingContinuationState: vi.fn(),
}));

vi.mock('./paymentRequiredService', () => ({
  ensureMinimalPaymentWeddingSite: vi.fn(async () => 'site-1'),
}));

function renderPaymentRequired() {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'user-1', email: 'couple@example.com', name: 'Alex and Jordan' },
    loading: false,
    isDemoMode: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  });
  vi.mocked(isPaymentBypassAllowed).mockReturnValue(false);
  vi.mocked(createCheckoutSession).mockClear();
  vi.mocked(fetchPaymentStatus).mockClear();

  return render(
    <MemoryRouter initialEntries={['/payment-required']}>
      <PaymentRequired />
    </MemoryRouter>,
  );
}

describe('PaymentRequired', () => {
  it('shows a recovery path when checkout cannot start because the wedding site is missing', async () => {
    vi.mocked(ensureMinimalPaymentWeddingSite)
      .mockRejectedValueOnce(new Error('Couldn’t create your website record right now. Please refresh and try again.'))
      .mockResolvedValueOnce('site-1');

    renderPaymentRequired();

    await waitFor(() => {
      expect(screen.getByText('Couldn’t create your website record right now. Please refresh and try again.')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /continue for \$49/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /retry site setup/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue for \$49/i })).toBeEnabled();
    });
    expect(ensureMinimalPaymentWeddingSite).toHaveBeenCalledTimes(2);
  });
});
