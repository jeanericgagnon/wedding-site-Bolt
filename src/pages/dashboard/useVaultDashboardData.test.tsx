import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  checkVaultGoogleDriveHealthMock,
  ensureHostedVaultProviderMock,
  finishVaultGoogleDriveAuthMock,
  loadDemoVaultDashboardDataMock,
  loadVaultDashboardDataMock,
  startVaultGoogleDriveAuthMock,
} = vi.hoisted(() => ({
  checkVaultGoogleDriveHealthMock: vi.fn(async () => ({ healthy: true, needsReconnect: false, message: null })),
  ensureHostedVaultProviderMock: vi.fn(async () => undefined),
  finishVaultGoogleDriveAuthMock: vi.fn(async () => ({ success: true })),
  loadDemoVaultDashboardDataMock: vi.fn(async () => ({ site: null, configs: [], entries: [] })),
  loadVaultDashboardDataMock: vi.fn(),
  startVaultGoogleDriveAuthMock: vi.fn(async () => 'https://example.com/connect'),
}));

vi.mock('./vaultService', () => ({
  checkVaultGoogleDriveHealth: checkVaultGoogleDriveHealthMock,
  ensureHostedVaultProvider: ensureHostedVaultProviderMock,
  finishVaultGoogleDriveAuth: finishVaultGoogleDriveAuthMock,
  loadDemoVaultDashboardData: loadDemoVaultDashboardDataMock,
  loadVaultDashboardData: loadVaultDashboardDataMock,
  startVaultGoogleDriveAuth: startVaultGoogleDriveAuthMock,
}));

import { useVaultDashboardData } from './useVaultDashboardData';

describe('useVaultDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', 'https://dayof.love/dashboard/vault');
    localStorage.clear();
    sessionStorage.clear();
  });

  it('clears a stale site slug when vault data reloads without one', async () => {
    loadVaultDashboardDataMock
      .mockResolvedValueOnce({
        site: {
          id: 'site-1',
          site_slug: 'maya-leo',
          wedding_date: '2026-02-23',
          couple_name_1: 'Maya',
          couple_name_2: 'Leo',
          vault_google_drive_connected: false,
        },
        configs: [],
        entries: [],
      })
      .mockResolvedValueOnce({
        site: {
          id: 'site-2',
          site_slug: null,
          wedding_date: '2026-02-23',
          couple_name_1: 'Taylor',
          couple_name_2: 'Rivera',
          vault_google_drive_connected: false,
        },
        configs: [],
        entries: [],
      });

    const toast = vi.fn();
    const { result } = renderHook(() =>
      useVaultDashboardData({
        isDemoMode: false,
        toast,
        user: { id: 'user-1', email: 'test@example.com' },
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.siteSlug).toBe('maya-leo');

    await act(async () => {
      await result.current.loadData();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.siteSlug).toBeNull();
  });

  it('clears the site slug when vault data resolves without an active site', async () => {
    loadVaultDashboardDataMock
      .mockResolvedValueOnce({
        site: {
          id: 'site-1',
          site_slug: 'maya-leo',
          wedding_date: '2026-02-23',
          couple_name_1: 'Maya',
          couple_name_2: 'Leo',
          vault_google_drive_connected: false,
        },
        configs: [],
        entries: [],
      })
      .mockResolvedValueOnce({
        site: null,
        configs: [],
        entries: [],
      });

    const toast = vi.fn();
    const { result } = renderHook(() =>
      useVaultDashboardData({
        isDemoMode: false,
        toast,
        user: { id: 'user-1', email: 'test@example.com' },
      }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.siteSlug).toBe('maya-leo');

    await act(async () => {
      await result.current.loadData();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.siteSlug).toBeNull();
    expect(result.current.weddingSiteId).toBeNull();
  });
});
