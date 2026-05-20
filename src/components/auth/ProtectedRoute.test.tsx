import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

  it('does not wait on billing or role lookups when the payment gate is skipped', async () => {
    fetchBillingInfoMock.mockRejectedValue(new Error('billing down'));
    resolveActiveSiteRoleForUserMock.mockRejectedValue(new Error('role down'));

    render(
      <MemoryRouter initialEntries={['/account']}>
        <Routes>
          <Route
            path="/account"
            element={(
              <ProtectedRoute skipPaymentGate>
                <div>account settings</div>
              </ProtectedRoute>
            )}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('account settings')).toBeInTheDocument();
    expect(fetchBillingInfoMock).not.toHaveBeenCalled();
    expect(resolveActiveSiteRoleForUserMock).not.toHaveBeenCalled();
  });

  it('guards async billing and role lookup completions after route cleanup', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/auth/ProtectedRoute.tsx'), 'utf8');

    expect(source).toContain('let cancelled = false;');
    expect(source).toContain("setBillingInfo('loading');");
    expect(source).toContain('if (!cancelled) setActiveSiteRole(role);');
    expect(source).toContain("if (!cancelled) setBillingInfo('unavailable');");
    expect(source).toContain('cancelled = true;');
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
