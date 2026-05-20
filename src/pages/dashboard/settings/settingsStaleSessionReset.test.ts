import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('settings stale-session reset wiring', () => {
  it('resets sticky owner settings state when the active user context disappears', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/useSettingsDashboardUiState.ts'),
      'utf8',
    );

    expect(source).toContain('const resetSettingsDashboardState = useCallback(() => {');
    expect(source).toContain('visibilityDraftGuard.markSaved();');
    expect(source).toContain('rsvpDraftGuard.markSaved();');
    expect(source).toContain('notifDraftGuard.markSaved();');
    expect(source).toContain("setActiveTab('account');");
    expect(source).toContain("setGuestAccessToken(null);");
    expect(source).toContain("setCollaboratorInvites([]);");
    expect(source).toContain("setWeddingSiteId(null);");
    expect(source).toContain("setSettingsRole('owner');");
    expect(source).toContain("setBillingInfo(null);");
    expect(source).toContain("if (!userId) {\n      resetSettingsDashboardState();\n      return;\n    }");
  });

  it('resets sticky owner settings state when the signed-in user changes without a full remount', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/useSettingsDashboardUiState.ts'),
      'utf8',
    );

    expect(source).toContain('const previousUserIdRef = useRef<string | null>(null);');
    expect(source).toContain(
      "if (previousUserIdRef.current && userId && previousUserIdRef.current !== userId) {\n      resetSettingsDashboardState();\n    }",
    );
    expect(source).toContain('previousUserIdRef.current = userId ?? null;');
  });

  it('clears stale planner invite state when no saved invite can be read anymore', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/useSettingsDashboardUiState.ts'),
      'utf8',
    );

    expect(source).toContain('const resetPlannerInviteState = useCallback(() => {');
    expect(source).toContain('const invite = readPlannerInvite(siteSlug || userId || null);');
    expect(source).toContain("if (!invite) {\n      resetPlannerInviteState();\n      return;\n    }");
    expect(source).toContain('setPlannerInvitePermissions(getPlannerPermissionPreset(invite.role));');
  });

  it('ignores stale billing responses after the settings billing request is superseded', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/useSettingsDashboardUiState.ts'),
      'utf8',
    );

    expect(source).toContain('let cancelled = false;');
    expect(source).toContain('setBillingError(null);\n    fetchBillingInfo(userId)');
    expect(source).toContain('if (!cancelled) setBillingInfo(info);');
    expect(source).toContain("if (!cancelled) setBillingError(safeSettingsError(err, 'Couldn’t load billing right now.'));");
    expect(source).toContain('if (!cancelled) setBillingLoading(false);');
    expect(source).toContain('return () => {\n      cancelled = true;\n    };');
  });

  it('ignores stale settings snapshot hydration after the settings context is superseded', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/settings/useSettingsDashboardSnapshotHydration.ts'),
      'utf8',
    );

    expect(source).toContain('const loadSiteData = useCallback(async (shouldCancel?: () => boolean) => {');
    expect(source).toContain('if (shouldCancel?.()) return;\n\n      setSettingsRole(snapshot.settingsRole);');
    expect(source).toContain('if (shouldCancel?.()) return;\n      setAccountError(safeSettingsError(err, \'Couldn’t load settings right now.\'));');
    expect(source).toContain('let cancelled = false;\n    void loadSiteData(() => cancelled);');
    expect(source).toContain('return () => {\n      cancelled = true;\n    };');
  });
});
