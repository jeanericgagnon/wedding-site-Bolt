import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const BUILDER_V2_LABEL = 'Builder V2 route mock';
const BUILDER_GUIDE_LABEL = 'Builder guide route mock';

async function renderAppAt(pathname: string, builderV2Enabled: boolean) {
  vi.resetModules();
  window.history.pushState({}, '', pathname);

  vi.doMock('./config/env', () => ({
    BUILDER_V2_ENABLED: builderV2Enabled,
  }));

  vi.doMock('./contexts/AuthContext', () => ({
    AuthProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
  }));

  vi.doMock('./components/ui/Toast', () => ({
    ToastProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
  }));

  vi.doMock('./components/auth/ProtectedRoute', () => ({
    ProtectedRoute: ({ children }: React.PropsWithChildren) => <>{children}</>,
  }));

  vi.doMock('./pages/BuilderV2Lab', () => ({
    BuilderV2Lab: () => <div>{BUILDER_V2_LABEL}</div>,
  }));

  vi.doMock('./pages/BuilderCutover', () => ({
    BuilderCutover: () => <div>{BUILDER_GUIDE_LABEL}</div>,
  }));

  vi.doMock('./pages/Home', () => ({
    Home: () => <div>Home route mock</div>,
  }));

  const { default: App } = await import('./App');
  render(<App />);
}

describe('App builder entry flag', () => {
  afterEach(() => {
    cleanup();
    vi.resetModules();
    vi.clearAllMocks();
    window.history.pushState({}, '', '/');
  });

  it('opens Builder V2 on the protected default builder route when the flag is enabled', async () => {
    await renderAppAt('/dashboard/builder', true);

    expect(await screen.findByText(BUILDER_V2_LABEL)).toBeInTheDocument();
    expect(screen.queryByText(BUILDER_GUIDE_LABEL)).not.toBeInTheDocument();
  });

  it('falls back to the builder guide on the protected default builder route when the flag is disabled', async () => {
    await renderAppAt('/dashboard/builder', false);

    expect(await screen.findByText(BUILDER_GUIDE_LABEL)).toBeInTheDocument();
    expect(screen.queryByText(BUILDER_V2_LABEL)).not.toBeInTheDocument();
  });

  it('falls back to the builder guide on the public builder alias when the flag is disabled', async () => {
    await renderAppAt('/builder', false);

    expect(await screen.findByText(BUILDER_GUIDE_LABEL)).toBeInTheDocument();
    expect(screen.queryByText(BUILDER_V2_LABEL)).not.toBeInTheDocument();
  });
});
