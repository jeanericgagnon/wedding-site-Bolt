import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VaultDashboardRouteView } from './VaultDashboardRouteView';

describe('VaultDashboardRouteView', () => {
  it('shows a loading state while vault data is still unresolved', () => {
    render(
      <VaultDashboardRouteView error={null} loading>
        <div>Vault ready</div>
      </VaultDashboardRouteView>,
    );

    expect(screen.getByText('Loading vaults…')).toBeInTheDocument();
    expect(screen.queryByText('Vault ready')).not.toBeInTheDocument();
  });

  it('shows an explicit owner-facing error once loading fails', () => {
    render(
      <VaultDashboardRouteView error="Couldn’t load vaults right now. Try again in a moment." loading={false}>
        <div>Vault ready</div>
      </VaultDashboardRouteView>,
    );

    expect(screen.getByText('Couldn’t open vaults right now')).toBeInTheDocument();
    expect(screen.getByText('Couldn’t load vaults right now. Try again in a moment.')).toBeInTheDocument();
    expect(screen.queryByText('Vault ready')).not.toBeInTheDocument();
  });

  it('renders children once the route is ready', () => {
    render(
      <VaultDashboardRouteView error={null} loading={false}>
        <div>Vault ready</div>
      </VaultDashboardRouteView>,
    );

    expect(screen.getByText('Vault ready')).toBeInTheDocument();
  });

  it('keeps vault loading and error states inside the vault dashboard shell', () => {
    const { rerender } = render(
      <VaultDashboardRouteView error={null} loading>
        <div>Vault ready</div>
      </VaultDashboardRouteView>,
    );

    expect(screen.getByText('Loading vaults…')).toBeInTheDocument();
    expect(screen.queryByText('Vault ready')).not.toBeInTheDocument();

    rerender(
      <VaultDashboardRouteView error="Couldn’t load vaults right now. Try again in a moment." loading={false}>
        <div>Vault ready</div>
      </VaultDashboardRouteView>,
    );

    expect(screen.getByText('Couldn’t open vaults right now')).toBeInTheDocument();
    expect(screen.queryByText('Vault ready')).not.toBeInTheDocument();
  });

  it('clears vault route loading and error shells once the route is ready again', () => {
    const { rerender } = render(
      <VaultDashboardRouteView error={null} loading>
        <div>Vault ready</div>
      </VaultDashboardRouteView>,
    );

    expect(screen.getByText('Loading vaults…')).toBeInTheDocument();

    rerender(
      <VaultDashboardRouteView error="Couldn’t load vaults right now. Try again in a moment." loading={false}>
        <div>Vault ready</div>
      </VaultDashboardRouteView>,
    );

    expect(screen.getByText('Couldn’t open vaults right now')).toBeInTheDocument();
    expect(screen.queryByText('Vault ready')).not.toBeInTheDocument();

    rerender(
      <VaultDashboardRouteView error={null} loading={false}>
        <div>Vault ready</div>
      </VaultDashboardRouteView>,
    );

    expect(screen.queryByText('Loading vaults…')).not.toBeInTheDocument();
    expect(screen.queryByText('Couldn’t open vaults right now')).not.toBeInTheDocument();
    expect(screen.getByText('Vault ready')).toBeInTheDocument();
  });
});
