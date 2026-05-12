import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';

const authState = {
  user: { id: 'user-1' },
  loading: false,
  isDemoMode: false,
};

const fetchBillingInfoMock = vi.fn();
const resolveActiveSiteRoleForUserMock = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('../../lib/stripeService', () => ({
  fetchBillingInfo: (...args: unknown[]) => fetchBillingInfoMock(...args),
  isSiteExpired: () => false,
}));

vi.mock('../../lib/activeSite', () => ({
  resolveActiveSiteRoleForUser: (...args: unknown[]) => resolveActiveSiteRoleForUserMock(...args),
}));

vi.mock('../../lib/paymentGate', () => ({
  isPaymentGateEnabled: () => true,
  isPaymentBypassAllowed: () => false,
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    fetchBillingInfoMock.mockReset();
    resolveActiveSiteRoleForUserMock.mockReset();
    authState.user = { id: 'user-1' };
    authState.loading = false;
    authState.isDemoMode = false;
    resolveActiveSiteRoleForUserMock.mockResolvedValue('owner');
  });

  it('fails closed when billing lookup is unavailable', async () => {
    fetchBillingInfoMock.mockRejectedValue(new Error('billing down'));

    render(
      <MemoryRouter initialEntries={['/dashboard/overview']}>
        <Routes>
          <Route
            path="/dashboard/overview"
            element={(
              <ProtectedRoute>
                <div>secret dashboard</div>
              </ProtectedRoute>
            )}
          />
          <Route path="/payment-required" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/payment-required?reason=billing_unavailable');
    });
    expect(screen.queryByText('secret dashboard')).not.toBeInTheDocument();
  });

  it('still allows access for active billing', async () => {
    fetchBillingInfoMock.mockResolvedValue({
      payment_status: 'active',
      billing_type: 'one_time',
      site_expires_at: null,
      paid_at: null,
      stripe_subscription_id: null,
      wedding_site_id: 'site-1',
    });

    render(
      <MemoryRouter initialEntries={['/dashboard/overview']}>
        <Routes>
          <Route
            path="/dashboard/overview"
            element={(
              <ProtectedRoute>
                <div>secret dashboard</div>
              </ProtectedRoute>
            )}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('secret dashboard')).toBeInTheDocument();
  });

  it('waits for collaborator role resolution before applying the payment gate', async () => {
    const roleResolver: { current: ((value: 'viewer') => void) | null } = { current: null };
    resolveActiveSiteRoleForUserMock.mockImplementationOnce(
      () => new Promise((resolve) => {
        roleResolver.current = resolve as (value: 'viewer') => void;
      }),
    );
    fetchBillingInfoMock.mockResolvedValue({
      payment_status: 'payment_required',
      billing_type: 'one_time',
      site_expires_at: null,
      paid_at: null,
      stripe_subscription_id: null,
      wedding_site_id: 'site-1',
    });

    render(
      <MemoryRouter initialEntries={['/dashboard/overview']}>
        <Routes>
          <Route
            path="/dashboard/overview"
            element={(
              <ProtectedRoute>
                <div>secret dashboard</div>
              </ProtectedRoute>
            )}
          />
          <Route path="/payment-required" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();

    if (roleResolver.current) {
      roleResolver.current('viewer');
    }

    expect(await screen.findByText('secret dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
  });
});
