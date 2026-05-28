import { act, render } from '@testing-library/react';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { REGISTRY_REFRESH_POLICY_SAVE_RETRY_ERROR } from './registryDashboardErrorCopy';
import { saveRegistryRefreshPolicy } from './registryService';
import { useRegistryRefreshPolicyActions } from './useRegistryRefreshPolicyActions';

vi.mock('./registryService', () => ({
  saveRegistryRefreshPolicy: vi.fn(),
}));

type HookActions = ReturnType<typeof useRegistryRefreshPolicyActions>;

function renderActions() {
  const toast = vi.fn();
  const logRegistryAction = vi.fn();
  const safeRegistryDashboardError = vi.fn((error: unknown, fallback: string) => fallback);
  let latestActions: HookActions | null = null;

  function Harness() {
    const [monthlyRefreshCap, setMonthlyRefreshCap] = React.useState(100);
    const [monthlyRefreshCount, setMonthlyRefreshCount] = React.useState(0);
    const [monthlyRefreshMonth, setMonthlyRefreshMonth] = React.useState<string | null>(null);
    const [policyUpdatedAt, setPolicyUpdatedAt] = React.useState<string | null>(null);
    const [policyUpdatedBy, setPolicyUpdatedBy] = React.useState<string | null>(null);
    const [refreshCapDraft, setRefreshCapDraft] = React.useState(120);
    const [refreshEnabledUntil, setRefreshEnabledUntil] = React.useState<string | null>(null);
    const [refreshPreset, setRefreshPreset] = React.useState<'lean' | 'balanced' | 'aggressive'>('balanced');
    const [refreshWindowDraft, setRefreshWindowDraft] = React.useState('2026-06-30');
    const [savingRefreshPolicy, setSavingRefreshPolicy] = React.useState(false);
    void monthlyRefreshCap;
    void monthlyRefreshCount;
    void monthlyRefreshMonth;
    void policyUpdatedAt;
    void policyUpdatedBy;
    void refreshEnabledUntil;
    void refreshPreset;
    void savingRefreshPolicy;

    latestActions = useRegistryRefreshPolicyActions({
      autoRefreshEnabled: true,
      isDemoMode: false,
      refreshCapDraft,
      refreshIncludePurchased: false,
      refreshWindowDraft,
      setMonthlyRefreshCap,
      setMonthlyRefreshCount,
      setMonthlyRefreshMonth,
      setPolicyUpdatedAt,
      setPolicyUpdatedBy,
      setRefreshCapDraft,
      setRefreshEnabledUntil,
      setRefreshPreset,
      setRefreshWindowDraft,
      setSavingRefreshPolicy,
      toast,
      safeRegistryDashboardError,
      logRegistryAction,
      userId: 'user-1',
      weddingDate: '2026-05-01',
      weddingSiteId: 'site-1',
    });

    return null;
  }

  render(<Harness />);
  if (!latestActions) throw new Error('Hook did not render');

  return {
    get actions() {
      if (!latestActions) throw new Error('Hook did not render');
      return latestActions;
    },
    toast,
    safeRegistryDashboardError,
  };
}

describe('useRegistryRefreshPolicyActions', () => {
  beforeEach(() => {
    vi.mocked(saveRegistryRefreshPolicy).mockReset();
  });

  it('uses shared safe copy when saving refresh policy fails', async () => {
    vi.mocked(saveRegistryRefreshPolicy).mockRejectedValueOnce(new Error('provider timeout token=abc'));
    const harness = renderActions();

    await act(async () => {
      await harness.actions.handleSaveRefreshPolicy();
    });

    expect(saveRegistryRefreshPolicy).toHaveBeenCalled();
    expect(harness.safeRegistryDashboardError).toHaveBeenCalledWith(expect.any(Error), REGISTRY_REFRESH_POLICY_SAVE_RETRY_ERROR);
    expect(harness.toast).toHaveBeenCalledWith(REGISTRY_REFRESH_POLICY_SAVE_RETRY_ERROR, 'error');
  });
});
